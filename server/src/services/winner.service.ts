import { pool } from '../config/database';
import { supabase } from '../config/supabase';
import {
  WinnerValidationError,
  validateProofUpload,
  validateRejectionReason,
  validatePaymentInput,
} from '../utils/winner.validation';

export type WinnerVerificationStatus = 'PENDING_PROOF' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type WinnerPaymentStatus = 'PENDING' | 'PAID';

export interface EnrichedWinnerRecord {
  id: string;
  drawId: string;
  userId: string;
  drawEntryId: string;
  rank: number;
  matchCount: 3 | 4 | 5;
  prizeAmount: number;
  currency: string;
  verificationStatus: WinnerVerificationStatus;
  proofStoragePath: string | null;
  proofSignedUrl?: string | null;
  proofUploadedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  paymentStatus: WinnerPaymentStatus;
  paidAt: string | null;
  paymentReference: string | null;
  adminNote: string | null;
  createdAt: string;
  // Joined fields
  userName?: string;
  userEmail?: string;
  drawTitle?: string;
  drawScheduledMonth?: string;
  drawDate?: string;
  ticketNumbers?: number[];
  drawnNumbers?: number[];
}

function mapWinnerRow(row: any): EnrichedWinnerRecord {
  return {
    id: row.id,
    drawId: row.draw_id,
    userId: row.user_id,
    drawEntryId: row.draw_entry_id,
    rank: Number(row.rank),
    matchCount: Number(row.match_count) as 3 | 4 | 5,
    prizeAmount: parseFloat(String(row.prize_amount)),
    currency: row.currency || 'INR',
    verificationStatus: row.verification_status || 'PENDING_PROOF',
    proofStoragePath: row.proof_storage_path || null,
    proofUploadedAt: row.proof_uploaded_at ? new Date(row.proof_uploaded_at).toISOString() : null,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
    reviewedBy: row.reviewed_by || null,
    rejectionReason: row.rejection_reason || null,
    paymentStatus: row.payment_status || 'PENDING',
    paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
    paymentReference: row.payment_reference || null,
    adminNote: row.admin_note || null,
    createdAt: new Date(row.created_at).toISOString(),
    userName: row.user_name || undefined,
    userEmail: row.user_email || undefined,
    drawTitle: row.draw_title || undefined,
    drawScheduledMonth: row.scheduled_month || undefined,
    drawDate: row.draw_date ? new Date(row.draw_date).toISOString() : undefined,
    ticketNumbers: row.ticket_numbers || undefined,
    drawnNumbers: row.drawn_numbers || undefined,
  };
}

/**
 * Generates a signed URL for a private storage path
 */
async function getSignedProofUrl(storagePath: string | null): Promise<string | null> {
  if (!storagePath) return null;
  try {
    const { data, error } = await supabase.storage
      .from('winner-proofs')
      .createSignedUrl(storagePath, 3600); // 1 hour validity

    if (error || !data) {
      console.warn('Failed to generate signed proof URL:', error?.message);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.error('Error generating signed proof URL:', err);
    return null;
  }
}

/**
 * Returns all winnings for an authenticated subscriber
 */
export async function getUserWinners(userId: string): Promise<EnrichedWinnerRecord[]> {
  const res = await pool.query(
    `SELECT w.*,
            u.name AS user_name, u.email AS user_email,
            d.name AS draw_title, d.scheduled_month, d.draw_date, d.drawn_numbers,
            e.numbers AS ticket_numbers
       FROM public.winners w
       JOIN public.draws d ON w.draw_id = d.id
       JOIN public.users u ON w.user_id = u.id
  LEFT JOIN public.draw_entries e ON w.draw_entry_id = e.id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC`,
    [userId]
  );

  const winners = res.rows.map(mapWinnerRow);

  // Attach signed URLs concurrently
  for (const winner of winners) {
    if (winner.proofStoragePath) {
      winner.proofSignedUrl = await getSignedProofUrl(winner.proofStoragePath);
    }
  }

  return winners;
}

/**
 * Returns a specific winner by ID, verifying ownership or admin status
 */
export async function getWinnerById(
  winnerId: string,
  userId?: string,
  isAdmin: boolean = false
): Promise<EnrichedWinnerRecord> {
  const res = await pool.query(
    `SELECT w.*,
            u.name AS user_name, u.email AS user_email,
            d.name AS draw_title, d.scheduled_month, d.draw_date, d.drawn_numbers,
            e.numbers AS ticket_numbers
       FROM public.winners w
       JOIN public.draws d ON w.draw_id = d.id
       JOIN public.users u ON w.user_id = u.id
  LEFT JOIN public.draw_entries e ON w.draw_entry_id = e.id
      WHERE w.id = $1`,
    [winnerId]
  );

  if (res.rows.length === 0) {
    throw new WinnerValidationError('WINNER_NOT_FOUND', 'Winner record not found.', 404);
  }

  const winner = mapWinnerRow(res.rows[0]);

  if (!isAdmin && winner.userId !== userId) {
    throw new WinnerValidationError('FORBIDDEN', 'You do not have permission to view this winner.', 403);
  }

  if (winner.proofStoragePath) {
    winner.proofSignedUrl = await getSignedProofUrl(winner.proofStoragePath);
  }

  return winner;
}

/**
 * Uploads winner proof image and transitions verification_status to PENDING_REVIEW
 */
export async function uploadWinnerProof(
  winnerId: string,
  userId: string,
  buffer: Buffer,
  mimetype: string,
  filename: string
): Promise<EnrichedWinnerRecord> {
  // 1. Fetch winner and verify ownership
  const winner = await getWinnerById(winnerId, userId, false);

  // 2. Validate state machine transition
  if (winner.verificationStatus === 'APPROVED' || winner.paymentStatus === 'PAID') {
    throw new WinnerValidationError(
      'ALREADY_VERIFIED',
      'This win has already been approved and cannot accept new proof uploads.',
      400
    );
  }

  // 3. Validate image payload
  const { ext } = validateProofUpload(mimetype, buffer.length, filename);

  // 4. Upload to private Supabase Storage bucket 'winner-proofs'
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
  const storagePath = `${userId}/${winnerId}/${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from('winner-proofs')
    .upload(storagePath, buffer, {
      contentType: mimetype,
      upsert: true,
    });

  if (uploadError) {
    throw new WinnerValidationError(
      'STORAGE_UPLOAD_FAILED',
      `Failed to upload proof to secure storage: ${uploadError.message}`,
      500
    );
  }

  // 5. Update winner record in PostgreSQL
  const updateRes = await pool.query(
    `UPDATE public.winners
        SET verification_status = 'PENDING_REVIEW',
            proof_storage_path = $1,
            proof_uploaded_at = NOW(),
            rejection_reason = NULL
      WHERE id = $2 AND user_id = $3
      RETURNING *`,
    [storagePath, winnerId, userId]
  );

  const updatedWinner = mapWinnerRow(updateRes.rows[0]);
  updatedWinner.proofSignedUrl = await getSignedProofUrl(storagePath);
  return updatedWinner;
}

/**
 * Admin: Get all winners with optional filters
 */
export async function getAllWinnersAdmin(filters?: {
  verificationStatus?: string;
  paymentStatus?: string;
  drawId?: string;
}): Promise<EnrichedWinnerRecord[]> {
  const whereClauses: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (filters?.verificationStatus) {
    whereClauses.push(`w.verification_status = $${paramIdx++}`);
    params.push(filters.verificationStatus);
  }

  if (filters?.paymentStatus) {
    whereClauses.push(`w.payment_status = $${paramIdx++}`);
    params.push(filters.paymentStatus);
  }

  if (filters?.drawId) {
    whereClauses.push(`w.draw_id = $${paramIdx++}`);
    params.push(filters.drawId);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const res = await pool.query(
    `SELECT w.*,
            u.name AS user_name, u.email AS user_email,
            d.name AS draw_title, d.scheduled_month, d.draw_date, d.drawn_numbers,
            e.numbers AS ticket_numbers
       FROM public.winners w
       JOIN public.draws d ON w.draw_id = d.id
       JOIN public.users u ON w.user_id = u.id
  LEFT JOIN public.draw_entries e ON w.draw_entry_id = e.id
      ${whereSql}
      ORDER BY w.created_at DESC`,
    params
  );

  const winners = res.rows.map(mapWinnerRow);

  for (const w of winners) {
    if (w.proofStoragePath) {
      w.proofSignedUrl = await getSignedProofUrl(w.proofStoragePath);
    }
  }

  return winners;
}

/**
 * Admin: Get all winners pending review
 */
export async function getPendingWinnersAdmin(): Promise<EnrichedWinnerRecord[]> {
  return getAllWinnersAdmin({ verificationStatus: 'PENDING_REVIEW' });
}

/**
 * Admin: Approve winner proof
 */
export async function approveWinner(
  winnerId: string,
  adminId: string
): Promise<EnrichedWinnerRecord> {
  const winner = await getWinnerById(winnerId, undefined, true);

  if (winner.verificationStatus !== 'PENDING_REVIEW') {
    throw new WinnerValidationError(
      'INVALID_STATUS_TRANSITION',
      `Cannot approve winner with status '${winner.verificationStatus}'. Must be 'PENDING_REVIEW'.`,
      400
    );
  }

  const updateRes = await pool.query(
    `UPDATE public.winners
        SET verification_status = 'APPROVED',
            reviewed_by = $1,
            reviewed_at = NOW(),
            payment_status = 'PENDING',
            rejection_reason = NULL
      WHERE id = $2
      RETURNING *`,
    [adminId, winnerId]
  );

  const updatedWinner = mapWinnerRow(updateRes.rows[0]);
  if (updatedWinner.proofStoragePath) {
    updatedWinner.proofSignedUrl = await getSignedProofUrl(updatedWinner.proofStoragePath);
  }
  return updatedWinner;
}

/**
 * Admin: Reject winner proof with reason
 */
export async function rejectWinner(
  winnerId: string,
  adminId: string,
  rawReason: unknown
): Promise<EnrichedWinnerRecord> {
  const reason = validateRejectionReason(rawReason);
  const winner = await getWinnerById(winnerId, undefined, true);

  if (winner.verificationStatus !== 'PENDING_REVIEW') {
    throw new WinnerValidationError(
      'INVALID_STATUS_TRANSITION',
      `Cannot reject winner with status '${winner.verificationStatus}'. Must be 'PENDING_REVIEW'.`,
      400
    );
  }

  const updateRes = await pool.query(
    `UPDATE public.winners
        SET verification_status = 'REJECTED',
            rejection_reason = $1,
            reviewed_by = $2,
            reviewed_at = NOW()
      WHERE id = $3
      RETURNING *`,
    [reason, adminId, winnerId]
  );

  const updatedWinner = mapWinnerRow(updateRes.rows[0]);
  if (updatedWinner.proofStoragePath) {
    updatedWinner.proofSignedUrl = await getSignedProofUrl(updatedWinner.proofStoragePath);
  }
  return updatedWinner;
}

/**
 * Admin: Mark winner as PAID and record settlement in public.payouts
 */
export async function markWinnerPaid(
  winnerId: string,
  adminId: string,
  input: { paymentReference?: unknown; paidAt?: unknown; adminNote?: unknown }
): Promise<{ winner: EnrichedWinnerRecord; payoutId: string }> {
  const winner = await getWinnerById(winnerId, undefined, true);

  if (winner.verificationStatus !== 'APPROVED') {
    throw new WinnerValidationError(
      'WINNER_NOT_APPROVED',
      `Cannot mark winner as paid with verification status '${winner.verificationStatus}'. Winner must be APPROVED first.`,
      400
    );
  }

  if (winner.paymentStatus === 'PAID') {
    throw new WinnerValidationError(
      'ALREADY_PAID',
      `This winner has already been marked as PAID on ${winner.paidAt} (Ref: ${winner.paymentReference}).`,
      409
    );
  }

  const { paymentReference, paidAt, adminNote } = validatePaymentInput(input);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update public.winners
    const winUpdate = await client.query(
      `UPDATE public.winners
          SET payment_status = 'PAID',
              paid_at = $1,
              payment_reference = $2,
              admin_note = $3
        WHERE id = $4
        RETURNING *`,
      [paidAt, paymentReference, adminNote, winnerId]
    );

    // 2. Insert or update public.payouts
    const existingPayout = await client.query(
      `SELECT id FROM public.payouts WHERE winner_id = $1`,
      [winnerId]
    );

    let payoutId: string;
    if (existingPayout.rows.length > 0) {
      payoutId = existingPayout.rows[0].id;
      await client.query(
        `UPDATE public.payouts
            SET status = 'completed',
                transaction_reference = $1,
                paid_at = $2,
                updated_at = NOW()
          WHERE id = $3`,
        [paymentReference, paidAt, payoutId]
      );
    } else {
      const payoutRes = await client.query(
        `INSERT INTO public.payouts (
            winner_id, amount, currency, status, transaction_reference, paid_at, created_at, updated_at
         )
         VALUES ($1, $2, $3, 'completed', $4, $5, NOW(), NOW())
         RETURNING id`,
        [winnerId, winner.prizeAmount, winner.currency, paymentReference, paidAt]
      );
      payoutId = payoutRes.rows[0].id;
    }

    await client.query('COMMIT');

    const updatedWinner = mapWinnerRow(winUpdate.rows[0]);
    if (updatedWinner.proofStoragePath) {
      updatedWinner.proofSignedUrl = await getSignedProofUrl(updatedWinner.proofStoragePath);
    }

    return {
      winner: updatedWinner,
      payoutId,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

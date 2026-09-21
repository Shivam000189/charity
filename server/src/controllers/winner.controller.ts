import { Request, Response } from 'express';
import {
  getUserWinners,
  getWinnerById,
  uploadWinnerProof,
  getAllWinnersAdmin,
  getPendingWinnersAdmin,
  approveWinner,
  rejectWinner,
  markWinnerPaid,
} from '../services/winner.service';
import { WinnerValidationError } from '../utils/winner.validation';

export async function getMyWinners(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const winners = await getUserWinners(userId);
    res.json({ success: true, winners });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to fetch winnings.' });
  }
}

export async function getWinnerDetail(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const role = (req as any).user?.role;
    const winnerId = req.params.winnerId as string;
    const isAdmin = role === 'admin';

    const winner = await getWinnerById(winnerId, userId, isAdmin);
    res.json({ success: true, winner });
  } catch (err: any) {
    const status = err instanceof WinnerValidationError ? err.status : 500;
    res.status(status).json({ success: false, message: err?.message || 'Failed to fetch winner.' });
  }
}

export async function uploadProof(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const winnerId = req.params.winnerId as string;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { base64Data, filename, mimetype } = req.body;
    if (!base64Data || typeof base64Data !== 'string') {
      res.status(400).json({ success: false, message: 'base64Data string is required.' });
      return;
    }

    const pureBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(pureBase64, 'base64');

    const winner = await uploadWinnerProof(
      winnerId,
      userId,
      buffer,
      mimetype || 'image/jpeg',
      filename || 'proof.jpg'
    );

    res.json({ success: true, message: 'Proof uploaded successfully. Your win is now under review.', winner });
  } catch (err: any) {
    const status = err instanceof WinnerValidationError ? err.status : 500;
    res.status(status).json({ success: false, message: err?.message || 'Proof upload failed.' });
  }
}

export async function getAllWinners(req: Request, res: Response): Promise<void> {
  try {
    const { verificationStatus, paymentStatus, drawId } = req.query;
    const winners = await getAllWinnersAdmin({
      verificationStatus: verificationStatus as string | undefined,
      paymentStatus: paymentStatus as string | undefined,
      drawId: drawId as string | undefined,
    });
    res.json({ success: true, winners });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to list winners.' });
  }
}

export async function getPendingWinners(req: Request, res: Response): Promise<void> {
  try {
    const winners = await getPendingWinnersAdmin();
    res.json({ success: true, winners });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to list pending winners.' });
  }
}

export async function approveWinnerController(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).user?.id;
    const winnerId = req.params.winnerId as string;

    const winner = await approveWinner(winnerId, adminId);
    res.json({ success: true, message: 'Winner successfully approved.', winner });
  } catch (err: any) {
    const status = err instanceof WinnerValidationError ? err.status : 500;
    res.status(status).json({ success: false, message: err?.message || 'Failed to approve winner.' });
  }
}

export async function rejectWinnerController(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).user?.id;
    const winnerId = req.params.winnerId as string;
    const { reason } = req.body;

    const winner = await rejectWinner(winnerId, adminId, reason);
    res.json({ success: true, message: 'Winner proof rejected.', winner });
  } catch (err: any) {
    const status = err instanceof WinnerValidationError ? err.status : 500;
    res.status(status).json({ success: false, message: err?.message || 'Failed to reject winner.' });
  }
}

export async function markWinnerPaidController(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).user?.id;
    const winnerId = req.params.winnerId as string;
    const { paymentReference, paidAt, adminNote } = req.body;

    const result = await markWinnerPaid(winnerId, adminId, { paymentReference, paidAt, adminNote });
    res.json({
      success: true,
      message: 'Winner prize marked as PAID successfully.',
      winner: result.winner,
      payoutId: result.payoutId,
    });
  } catch (err: any) {
    const status = err instanceof WinnerValidationError ? err.status : 500;
    res.status(status).json({ success: false, message: err?.message || 'Failed to mark winner paid.' });
  }
}

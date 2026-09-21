import { pool } from '../config/database';
import { supabase } from '../config/supabase';
import { ValidatedCharityInput, CharityEvent, validateContributionPercentage } from '../utils/charity.validation';

export interface CharityRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  images: string[];
  upcomingEvents: CharityEvent[];
  featured: boolean;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DonationRecord {
  id: string;
  userId: string | null;
  charityId: string;
  charityName?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  donorName: string | null;
  message: string | null;
  transactionReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionCharityPreference {
  subscriptionId: string;
  charityId: string | null;
  charity: CharityRecord | null;
  contributionPercentage: number;
}

export class CharityServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CharityServiceError';
  }
}

function mapCharityRow(row: Record<string, unknown>): CharityRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || '',
    category: (row.category as string) || 'Other',
    logoUrl: (row.logo_url as string) || null,
    websiteUrl: (row.website_url as string) || null,
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
    upcomingEvents: Array.isArray(row.upcoming_events) ? (row.upcoming_events as CharityEvent[]) : [],
    featured: Boolean(row.featured),
    isActive: Boolean(row.is_active),
    deletedAt: row.deleted_at ? ((row.deleted_at as Date)?.toISOString?.() ?? String(row.deleted_at)) : null,
    createdAt: (row.created_at as Date)?.toISOString?.() ?? String(row.created_at),
    updatedAt: (row.updated_at as Date)?.toISOString?.() ?? String(row.updated_at),
  };
}

function mapDonationRow(row: Record<string, unknown>): DonationRecord {
  return {
    id: row.id as string,
    userId: (row.user_id as string) || null,
    charityId: row.charity_id as string,
    charityName: (row.charity_name as string) || undefined,
    amount: Number(row.amount),
    currency: (row.currency as string) || 'INR',
    status: row.status as DonationRecord['status'],
    donorName: (row.donor_name as string) || null,
    message: (row.message as string) || null,
    transactionReference: (row.transaction_reference as string) || null,
    createdAt: (row.created_at as Date)?.toISOString?.() ?? String(row.created_at),
    updatedAt: (row.updated_at as Date)?.toISOString?.() ?? String(row.updated_at),
  };
}

// ─── Public Charity Queries ───────────────────────────────────────────────────

/**
 * Returns active, non-deleted charities with optional search and category filters.
 */
export async function getPublicCharities(filters: { search?: string; category?: string } = {}): Promise<CharityRecord[]> {
  const conditions: string[] = ['is_active = true', 'deleted_at IS NULL'];
  const params: unknown[] = [];

  if (filters.search && filters.search.trim()) {
    params.push(`%${filters.search.trim()}%`);
    conditions.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
  }

  if (filters.category && filters.category.trim() && filters.category.toLowerCase() !== 'all') {
    params.push(filters.category.trim());
    conditions.push(`category ILIKE $${params.length}`);
  }

  const query = `
    SELECT id, name, description, category, logo_url, website_url, images, upcoming_events,
           featured, is_active, deleted_at, created_at, updated_at
      FROM public.charities
     WHERE ${conditions.join(' AND ')}
     ORDER BY featured DESC, name ASC
  `;

  const result = await pool.query(query, params);
  return result.rows.map(mapCharityRow);
}

/**
 * Returns a single active public charity by ID.
 */
export async function getPublicCharityById(id: string): Promise<CharityRecord> {
  const result = await pool.query(
    `SELECT id, name, description, category, logo_url, website_url, images, upcoming_events,
            featured, is_active, deleted_at, created_at, updated_at
       FROM public.charities
      WHERE id = $1 AND is_active = true AND deleted_at IS NULL`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new CharityServiceError('CHARITY_NOT_FOUND', 'Charity not found or is currently inactive.', 404);
  }

  return mapCharityRow(result.rows[0]);
}

export const getCharityById = getPublicCharityById;

/**
 * Returns active featured charities for the homepage spotlight.
 */
export async function getFeaturedCharities(): Promise<CharityRecord[]> {
  const result = await pool.query(
    `SELECT id, name, description, category, logo_url, website_url, images, upcoming_events,
            featured, is_active, deleted_at, created_at, updated_at
       FROM public.charities
      WHERE is_active = true AND deleted_at IS NULL AND featured = true
      ORDER BY updated_at DESC`
  );

  return result.rows.map(mapCharityRow);
}

// ─── Admin Charity CRUD ───────────────────────────────────────────────────────

/**
 * Returns all charities for the admin portal (including inactive / soft-deleted).
 */
export async function getAllCharitiesAdmin(): Promise<CharityRecord[]> {
  const result = await pool.query(
    `SELECT id, name, description, category, logo_url, website_url, images, upcoming_events,
            featured, is_active, deleted_at, created_at, updated_at
       FROM public.charities
      ORDER BY created_at DESC`
  );

  return result.rows.map(mapCharityRow);
}

/**
 * Returns single charity for admin by ID.
 */
export async function getCharityByIdAdmin(id: string): Promise<CharityRecord> {
  const result = await pool.query(
    `SELECT id, name, description, category, logo_url, website_url, images, upcoming_events,
            featured, is_active, deleted_at, created_at, updated_at
       FROM public.charities
      WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new CharityServiceError('CHARITY_NOT_FOUND', 'Charity not found.', 404);
  }

  return mapCharityRow(result.rows[0]);
}

/**
 * Creates a new charity.
 */
export async function createCharity(data: ValidatedCharityInput): Promise<CharityRecord> {
  // Check unique name
  const existing = await pool.query(
    `SELECT id FROM public.charities WHERE LOWER(name) = LOWER($1)`,
    [data.name]
  );

  if (existing.rows.length > 0) {
    throw new CharityServiceError('CHARITY_NAME_EXISTS', 'A charity with this name already exists.', 409);
  }

  const result = await pool.query(
    `INSERT INTO public.charities (
        name, description, category, logo_url, website_url, images,
        upcoming_events, featured, is_active, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, true, NOW(), NOW())
     RETURNING id, name, description, category, logo_url, website_url, images, upcoming_events,
               featured, is_active, deleted_at, created_at, updated_at`,
    [
      data.name,
      data.description || '',
      data.category || 'Other',
      data.logoUrl || (data as any).logo_url || null,
      data.websiteUrl || (data as any).website_url || null,
      JSON.stringify(data.images || []),
      JSON.stringify(data.upcomingEvents || (data as any).upcoming_events || []),
      Boolean(data.featured),
    ]
  );

  return mapCharityRow(result.rows[0]);
}

/**
 * Updates an existing charity.
 */
export async function updateCharity(
  id: string,
  data: Partial<ValidatedCharityInput> & { isActive?: boolean }
): Promise<CharityRecord> {
  const currentRes = await pool.query(
    `SELECT id, name FROM public.charities WHERE id = $1`,
    [id]
  );

  if (currentRes.rows.length === 0) {
    throw new CharityServiceError('CHARITY_NOT_FOUND', 'Charity not found.', 404);
  }

  // If name changed, check uniqueness
  if (data.name && data.name.toLowerCase() !== currentRes.rows[0].name.toLowerCase()) {
    const existing = await pool.query(
      `SELECT id FROM public.charities WHERE LOWER(name) = LOWER($1) AND id != $2`,
      [data.name, id]
    );
    if (existing.rows.length > 0) {
      throw new CharityServiceError('CHARITY_NAME_EXISTS', 'A charity with this name already exists.', 409);
    }
  }

  const updates: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [id];

  if (data.name !== undefined) {
    params.push(data.name);
    updates.push(`name = $${params.length}`);
  }
  if (data.description !== undefined) {
    params.push(data.description);
    updates.push(`description = $${params.length}`);
  }
  if (data.category !== undefined) {
    params.push(data.category);
    updates.push(`category = $${params.length}`);
  }
  if (data.logoUrl !== undefined) {
    params.push(data.logoUrl || null);
    updates.push(`logo_url = $${params.length}`);
  }
  if (data.websiteUrl !== undefined) {
    params.push(data.websiteUrl || null);
    updates.push(`website_url = $${params.length}`);
  }
  if (data.images !== undefined) {
    params.push(JSON.stringify(data.images));
    updates.push(`images = $${params.length}::jsonb`);
  }
  if (data.upcomingEvents !== undefined) {
    params.push(JSON.stringify(data.upcomingEvents));
    updates.push(`upcoming_events = $${params.length}::jsonb`);
  }
  if (data.featured !== undefined) {
    params.push(data.featured);
    updates.push(`featured = $${params.length}`);
  }
  if (data.isActive !== undefined) {
    params.push(data.isActive);
    updates.push(`is_active = $${params.length}`);
    if (data.isActive) {
      updates.push(`deleted_at = NULL`);
    } else {
      updates.push(`deleted_at = NOW()`);
    }
  }

  const updateQuery = `
    UPDATE public.charities
       SET ${updates.join(', ')}
     WHERE id = $1
    RETURNING id, name, description, category, logo_url, website_url, images, upcoming_events,
              featured, is_active, deleted_at, created_at, updated_at
  `;

  const result = await pool.query(updateQuery, params);
  return mapCharityRow(result.rows[0]);
}

/**
 * Soft-deactivates a charity.
 */
export async function softDeleteCharity(id: string): Promise<CharityRecord> {
  const result = await pool.query(
    `UPDATE public.charities
        SET is_active  = false,
            deleted_at = NOW(),
            updated_at = NOW()
      WHERE id = $1
     RETURNING id, name, description, category, logo_url, website_url, images, upcoming_events,
               featured, is_active, deleted_at, created_at, updated_at`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new CharityServiceError('CHARITY_NOT_FOUND', 'Charity not found.', 404);
  }

  return mapCharityRow(result.rows[0]);
}

/**
 * Uploads a charity image to Supabase Storage bucket 'charities'.
 */
export async function uploadCharityImage(
  buffer: Buffer,
  mimetype: string,
  filename: string
): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const path = `uploads/${cleanName}`;

  const { error } = await supabase.storage
    .from('charities')
    .upload(path, buffer, {
      contentType: mimetype,
      upsert: false,
    });

  if (error) {
    throw new CharityServiceError('UPLOAD_FAILED', `Image upload failed: ${error.message}`, 500);
  }

  const { data } = supabase.storage.from('charities').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Subscription Charity Preference ──────────────────────────────────────────

/**
 * Retrieves the subscriber's current charity allocation.
 */
export async function getUserCharityPreference(userId: string): Promise<SubscriptionCharityPreference> {
  const subRes = await pool.query(
    `SELECT s.id, s.charity_id, s.contribution_percentage,
            c.id AS c_id, c.name AS c_name, c.description AS c_desc, c.category AS c_cat,
            c.logo_url AS c_logo, c.website_url AS c_web, c.images AS c_img,
            c.upcoming_events AS c_events, c.featured AS c_feat, c.is_active AS c_act,
            c.deleted_at AS c_del, c.created_at AS c_created, c.updated_at AS c_updated
       FROM public.subscriptions s
  LEFT JOIN public.charities c ON s.charity_id = c.id
      WHERE s.user_id = $1 AND s.status IN ('active', 'pending_renewal', 'cancelled')
      ORDER BY s.created_at DESC
      LIMIT 1`,
    [userId]
  );

  if (subRes.rows.length === 0) {
    throw new CharityServiceError('SUBSCRIPTION_REQUIRED', 'No active subscription found.', 404);
  }

  const row = subRes.rows[0];
  let charity: CharityRecord | null = null;
  if (row.c_id) {
    charity = mapCharityRow({
      id: row.c_id,
      name: row.c_name,
      description: row.c_desc,
      category: row.c_cat,
      logo_url: row.c_logo,
      website_url: row.c_web,
      images: row.c_img,
      upcoming_events: row.c_events,
      featured: row.c_feat,
      is_active: row.c_act,
      deleted_at: row.c_del,
      created_at: row.c_created,
      updated_at: row.c_updated,
    });
  }

  return {
    subscriptionId: row.id,
    charityId: row.charity_id || null,
    charity,
    contributionPercentage: Number(row.contribution_percentage) || 10,
  };
}

/**
 * Updates the subscriber's charity preference & contribution percentage.
 */
export async function updateUserCharityPreference(
  userId: string,
  charityId: string,
  contributionPercentage: number
): Promise<SubscriptionCharityPreference> {
  const percentVal = validateContributionPercentage(contributionPercentage);
  if (!percentVal.valid) {
    throw new CharityServiceError('INVALID_PERCENTAGE', percentVal.error.message, 400);
  }

  // 1. Verify charity exists and is active
  const charityRes = await pool.query(
    `SELECT id, name, description, category, logo_url, website_url, images, upcoming_events,
            featured, is_active, deleted_at, created_at, updated_at
       FROM public.charities
      WHERE id = $1`,
    [charityId]
  );

  if (charityRes.rows.length === 0) {
    throw new CharityServiceError('CHARITY_NOT_FOUND', 'Selected charity does not exist.', 404);
  }

  const charityData = mapCharityRow(charityRes.rows[0]);
  if (!charityData.isActive || charityData.deletedAt) {
    throw new CharityServiceError('CHARITY_INACTIVE', 'Cannot select an inactive charity.', 400);
  }

  // 2. Lookup active subscription owned by this user
  const subRes = await pool.query(
    `SELECT id FROM public.subscriptions
      WHERE user_id = $1 AND status IN ('active', 'pending_renewal', 'cancelled')
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId]
  );

  if (subRes.rows.length === 0) {
    throw new CharityServiceError('SUBSCRIPTION_REQUIRED', 'Active subscription required to allocate charity contributions.', 403);
  }

  const subId = subRes.rows[0].id;

  // 3. Update subscription
  await pool.query(
    `UPDATE public.subscriptions
        SET charity_id               = $1,
            contribution_percentage  = $2,
            updated_at               = NOW()
      WHERE id = $3 AND user_id = $4`,
    [charityId, contributionPercentage, subId, userId]
  );

  return {
    subscriptionId: subId,
    charityId,
    charity: charityData,
    contributionPercentage,
  };
}

export const updateSubscriptionCharityPreference = updateUserCharityPreference;
export const getSubscriptionCharityPreference = getUserCharityPreference;

// ─── Independent Donations ────────────────────────────────────────────────────

/**
 * Initiates an independent donation.
 */
export async function createDonation(params: {
  userId?: string | null;
  user_id?: string | null;
  charityId?: string;
  charity_id?: string;
  amount: number;
  donorName?: string;
  donor_name?: string;
  message?: string;
}): Promise<DonationRecord> {
  const userId = params.userId !== undefined ? params.userId : params.user_id;
  const charityId = params.charityId || params.charity_id || '';
  const amount = params.amount;
  const donorName = params.donorName || params.donor_name;
  const message = params.message;

  // 1. Verify charity exists and is active
  const charityRes = await pool.query(
    `SELECT id, name, is_active, deleted_at FROM public.charities WHERE id = $1`,
    [charityId]
  );

  if (charityRes.rows.length === 0) {
    throw new CharityServiceError('CHARITY_NOT_FOUND', 'Selected charity does not exist.', 404);
  }

  const charity = charityRes.rows[0];
  if (!charity.is_active || charity.deleted_at) {
    throw new CharityServiceError('CHARITY_INACTIVE', 'Donations cannot be made to an inactive charity.', 400);
  }

  // 2. Insert pending donation
  const result = await pool.query(
    `INSERT INTO public.donations (
        user_id, charity_id, amount, currency, status, donor_name, message, created_at, updated_at
     )
     VALUES ($1, $2, $3, 'INR', 'pending', $4, $5, NOW(), NOW())
     RETURNING id, user_id, charity_id, amount, currency, status, donor_name, message,
               transaction_reference, created_at, updated_at`,
    [userId || null, charityId, amount, donorName || null, message || null]
  );

  const row = result.rows[0];
  row.charity_name = charity.name;
  return mapDonationRow(row);
}

/**
 * Confirms a mock donation payment.
 */
export async function confirmDonation(
  paramsOrDonationId: { donationId: string; cardNumber?: string } | string,
  maybeCardNumber?: string
): Promise<DonationRecord> {
  const donationId = typeof paramsOrDonationId === 'string' ? paramsOrDonationId : paramsOrDonationId.donationId;
  const cardNumber = typeof paramsOrDonationId === 'string' ? maybeCardNumber : paramsOrDonationId.cardNumber;

  const result = await pool.query(
    `SELECT d.*, c.name AS charity_name
       FROM public.donations d
       JOIN public.charities c ON d.charity_id = c.id
      WHERE d.id = $1`,
    [donationId]
  );

  if (result.rows.length === 0) {
    throw new CharityServiceError('DONATION_NOT_FOUND', 'Donation record not found.', 404);
  }

  const donation = result.rows[0];
  if (donation.status === 'completed') {
    return mapDonationRow(donation);
  }

  // Check card decline simulation (ends in 0002)
  const isDeclined = cardNumber && cardNumber.replace(/\s+/g, '').endsWith('0002');
  if (isDeclined) {
    await pool.query(
      `UPDATE public.donations SET status = 'failed', updated_at = NOW() WHERE id = $1`,
      [donationId]
    );
    throw new CharityServiceError('PAYMENT_DECLINED', 'Your payment was declined. Please try another card.', 400);
  }

  // Generate unique mock transaction reference
  const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
  const txnRef = `MOCK-DON-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

  const updateRes = await pool.query(
    `UPDATE public.donations
        SET status                = 'completed',
            transaction_reference = $1,
            updated_at            = NOW()
      WHERE id = $2
     RETURNING id, user_id, charity_id, amount, currency, status, donor_name, message,
               transaction_reference, created_at, updated_at`,
    [txnRef, donationId]
  );

  const updatedRow = updateRes.rows[0];
  updatedRow.charity_name = donation.charity_name;
  return mapDonationRow(updatedRow);
}

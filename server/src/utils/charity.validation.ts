/**
 * Charity & Donation validation utilities.
 */

export interface CharityEvent {
  id?: string;
  title: string;
  date: string;
  location?: string;
  description?: string;
}

export interface ValidatedCharityInput {
  name: string;
  description?: string;
  category: string;
  logoUrl?: string;
  websiteUrl?: string;
  images: string[];
  upcomingEvents: CharityEvent[];
  featured?: boolean;
}

export type CharityValidationErrorCode =
  | 'MISSING_FIELD'
  | 'CHARITY_NAME_REQUIRED'
  | 'INVALID_CATEGORY'
  | 'INVALID_URL'
  | 'INVALID_EVENTS'
  | 'INVALID_IMAGES'
  | 'INVALID_CONTRIBUTION_PERCENTAGE'
  | 'DONATION_INVALID_AMOUNT';

export interface CharityValidationError {
  code: CharityValidationErrorCode;
  message: string;
}

export const VALID_CHARITY_CATEGORIES = [
  'Education',
  'Healthcare',
  'Environment',
  'Community',
  'Sports',
  'Animal Welfare',
  'Arts & Culture',
  'Other',
] as const;

/**
 * Validates charity name.
 */
export function validateCharityName(name: unknown): { valid: true; name: string } | { valid: false; error: CharityValidationError } {
  if (typeof name !== 'string' || name.trim() === '') {
    return {
      valid: false,
      error: { code: 'CHARITY_NAME_REQUIRED', message: 'Charity name is required and cannot be empty.' },
    };
  }

  const trimmed = name.trim();
  if (trimmed.length > 255) {
    return {
      valid: false,
      error: { code: 'CHARITY_NAME_REQUIRED', message: 'Charity name cannot exceed 255 characters.' },
    };
  }

  return { valid: true, name: trimmed };
}

/**
 * Validates charity category.
 */
export function validateCharityCategory(category: unknown): { valid: true; category: string } | { valid: false; error: CharityValidationError } {
  if (typeof category !== 'string' || category.trim() === '') {
    return { valid: true, category: 'Other' };
  }

  const trimmed = category.trim();
  if (!VALID_CHARITY_CATEGORIES.includes(trimmed as any)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_CATEGORY',
        message: `Invalid charity category. Allowed categories: ${VALID_CHARITY_CATEGORIES.join(', ')}`,
      },
    };
  }

  return { valid: true, category: trimmed };
}

/**
 * Validates images array.
 */
export function validateCharityImages(images: unknown): { valid: true; images: string[] } | { valid: false; error: CharityValidationError } {
  if (images === undefined || images === null) {
    return { valid: true, images: [] };
  }

  if (!Array.isArray(images)) {
    return {
      valid: false,
      error: { code: 'INVALID_IMAGES', message: 'Images must be an array of image URL strings.' },
    };
  }

  const validated: string[] = [];
  for (const img of images) {
    if (typeof img === 'string' && img.trim()) {
      validated.push(img.trim());
    }
  }

  return { valid: true, images: validated };
}

/**
 * Validates upcoming events array.
 */
export function validateCharityEvents(events: unknown): { valid: true; events: CharityEvent[] } | { valid: false; error: CharityValidationError } {
  if (events === undefined || events === null) {
    return { valid: true, events: [] };
  }

  if (!Array.isArray(events)) {
    return {
      valid: false,
      error: { code: 'INVALID_EVENTS', message: 'Upcoming events must be an array of event objects.' },
    };
  }

  const validated: CharityEvent[] = [];
  for (const ev of events) {
    if (typeof ev !== 'object' || ev === null) {
      return {
        valid: false,
        error: { code: 'INVALID_EVENTS', message: 'Each event must be an object with title and date.' },
      };
    }

    const item = ev as Record<string, unknown>;
    if (!item.title || typeof item.title !== 'string' || !item.title.trim()) {
      return {
        valid: false,
        error: { code: 'INVALID_EVENTS', message: 'Each event must have a valid title.' },
      };
    }

    if (!item.date || typeof item.date !== 'string' || !item.date.trim()) {
      return {
        valid: false,
        error: { code: 'INVALID_EVENTS', message: 'Each event must have a valid date.' },
      };
    }

    validated.push({
      id: typeof item.id === 'string' ? item.id : undefined,
      title: (item.title as string).trim(),
      date: (item.date as string).trim(),
      location: typeof item.location === 'string' ? item.location.trim() : undefined,
      description: typeof item.description === 'string' ? item.description.trim() : undefined,
    });
  }

  return { valid: true, events: validated };
}

/**
 * Validates entire charity creation/update body.
 */
export function validateCharityInput(body: Record<string, unknown>, isUpdate = false): {
  valid: true;
  data: Partial<ValidatedCharityInput>;
} | {
  valid: false;
  error: CharityValidationError;
} {
  const result: Partial<ValidatedCharityInput> = {};

  if (!isUpdate || body.name !== undefined) {
    const nameVal = validateCharityName(body.name);
    if (!nameVal.valid) return nameVal;
    result.name = nameVal.name;
  }

  if (body.description !== undefined) {
    result.description = typeof body.description === 'string' ? body.description.trim() : '';
  }

  if (!isUpdate || body.category !== undefined) {
    const catVal = validateCharityCategory(body.category);
    if (!catVal.valid) return catVal;
    result.category = catVal.category;
  }

  if (body.logoUrl !== undefined || body.logo_url !== undefined) {
    const val = body.logoUrl !== undefined ? body.logoUrl : body.logo_url;
    result.logoUrl = typeof val === 'string' ? val.trim() : undefined;
  }

  if (body.websiteUrl !== undefined || body.website_url !== undefined) {
    const val = body.websiteUrl !== undefined ? body.websiteUrl : body.website_url;
    result.websiteUrl = typeof val === 'string' ? val.trim() : undefined;
  }

  if (body.images !== undefined) {
    const imgVal = validateCharityImages(body.images);
    if (!imgVal.valid) return imgVal;
    result.images = imgVal.images;
  }

  if (body.upcomingEvents !== undefined || body.upcoming_events !== undefined) {
    const eventsRaw = body.upcomingEvents !== undefined ? body.upcomingEvents : body.upcoming_events;
    const eventsVal = validateCharityEvents(eventsRaw);
    if (!eventsVal.valid) return eventsVal;
    result.upcomingEvents = eventsVal.events;
  }

  if (body.featured !== undefined) {
    result.featured = Boolean(body.featured);
  }

  return { valid: true, data: result };
}

/**
 * Validates subscriber contribution percentage (10% <= percentage <= 100%).
 */
export function validateContributionPercentage(percentage: unknown): {
  valid: true;
  percentage: number;
} | {
  valid: false;
  error: CharityValidationError;
} {
  if (percentage === undefined || percentage === null || percentage === '') {
    return {
      valid: false,
      error: { code: 'INVALID_CONTRIBUTION_PERCENTAGE', message: 'Contribution percentage is required.' },
    };
  }

  const num = typeof percentage === 'number' ? percentage : Number(percentage);
  if (!Number.isInteger(num)) {
    return {
      valid: false,
      error: { code: 'INVALID_CONTRIBUTION_PERCENTAGE', message: 'Contribution percentage must be an integer.' },
    };
  }

  if (num < 10 || num > 100) {
    return {
      valid: false,
      error: {
        code: 'INVALID_CONTRIBUTION_PERCENTAGE',
        message: 'Contribution percentage must be between 10% and 100%.',
      },
    };
  }

  return { valid: true, percentage: num };
}

/**
 * Validates donation amount (> 0).
 */
export function validateDonationAmount(amount: unknown): {
  valid: true;
  amount: number;
} | {
  valid: false;
  error: CharityValidationError;
} {
  if (amount === undefined || amount === null || amount === '') {
    return {
      valid: false,
      error: { code: 'DONATION_INVALID_AMOUNT', message: 'Donation amount is required.' },
    };
  }

  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num) || num <= 0) {
    return {
      valid: false,
      error: { code: 'DONATION_INVALID_AMOUNT', message: 'Donation amount must be greater than zero.' },
    };
  }

  // Round to 2 decimal places
  const rounded = Math.round(num * 100) / 100;
  return { valid: true, amount: rounded };
}

/**
 * Validates donation creation input.
 */
export function validateDonationInput(body: Record<string, unknown>): {
  valid: true;
  data: { charity_id: string; amount: number; donor_name?: string; message?: string };
} | {
  valid: false;
  error: CharityValidationError;
} {
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: { code: 'MISSING_FIELD', message: 'Request body must be an object' },
    };
  }

  if (!body.charity_id || typeof body.charity_id !== 'string') {
    return {
      valid: false,
      error: { code: 'MISSING_FIELD', message: 'charity_id is required' },
    };
  }

  const amtRes = validateDonationAmount(body.amount);
  if (!amtRes.valid) {
    return amtRes;
  }

  return {
    valid: true,
    data: {
      charity_id: body.charity_id,
      amount: amtRes.amount,
      donor_name: typeof body.donor_name === 'string' ? body.donor_name.trim() : undefined,
      message: typeof body.message === 'string' ? body.message.trim() : undefined,
    },
  };
}

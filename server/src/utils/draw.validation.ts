export type DrawType = 'RANDOM' | 'SCORE_WEIGHTED';

export type DrawStatus =
  | 'draft'
  | 'scheduled'
  | 'open'
  | 'closed'
  | 'simulated'
  | 'completed'
  | 'cancelled';

export interface ValidatedDrawInput {
  name: string;
  description?: string;
  charityId?: string | null;
  drawType: DrawType;
  scheduledMonth: string; // YYYY-MM
  drawDate: string; // ISO date string
  entryDeadline: string; // ISO date string
  threeMatchPercentage: number;
  fourMatchPercentage: number;
  fiveMatchPercentage: number;
}

export interface DrawValidationError {
  code:
    | 'MISSING_FIELD'
    | 'INVALID_MONTH'
    | 'INVALID_DRAW_TYPE'
    | 'INVALID_PERCENTAGES'
    | 'INVALID_DATE'
    | 'INVALID_STATUS_TRANSITION';
  message: string;
}

/**
 * Validates scheduled month string (YYYY-MM).
 */
export function validateScheduledMonth(month: unknown): { valid: true; month: string } | { valid: false; error: DrawValidationError } {
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month.trim())) {
    return {
      valid: false,
      error: {
        code: 'INVALID_MONTH',
        message: 'Scheduled month must be in YYYY-MM format (e.g. 2026-09).',
      },
    };
  }
  return { valid: true, month: month.trim() };
}

/**
 * Validates pool share percentages totaling 100.
 */
export function validatePoolPercentages(
  three: unknown,
  four: unknown,
  five: unknown
): { valid: true; percentages: { threeMatch: number; fourMatch: number; fiveMatch: number } } | { valid: false; error: DrawValidationError } {
  const p3 = Number(three);
  const p4 = Number(four);
  const p5 = Number(five);

  if (isNaN(p3) || isNaN(p4) || isNaN(p5)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PERCENTAGES',
        message: 'Pool percentages must be numbers.',
      },
    };
  }

  if (p3 < 0 || p4 < 0 || p5 < 0) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PERCENTAGES',
        message: 'Pool percentages cannot be negative.',
      },
    };
  }

  const sum = Math.round((p3 + p4 + p5) * 100) / 100;
  if (sum !== 100) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PERCENTAGES',
        message: `Pool share percentages must sum to exactly 100% (currently ${sum}%).`,
      },
    };
  }

  return {
    valid: true,
    percentages: { threeMatch: p3, fourMatch: p4, fiveMatch: p5 },
  };
}

/**
 * Validates input for creating a new monthly draw.
 */
export function validateCreateDrawInput(body: Record<string, unknown>): {
  valid: true;
  data: ValidatedDrawInput;
} | {
  valid: false;
  error: DrawValidationError;
} {
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: { code: 'MISSING_FIELD', message: 'Request body must be an object' },
    };
  }

  const monthVal = validateScheduledMonth(body.scheduledMonth || body.scheduled_month);
  if (!monthVal.valid) return monthVal;

  const rawType = (body.drawType || body.draw_type || 'RANDOM') as string;
  const drawType: DrawType = rawType.toUpperCase() === 'SCORE_WEIGHTED' ? 'SCORE_WEIGHTED' : 'RANDOM';

  // Pool percentages (default: 25, 35, 40)
  const three = body.threeMatchPercentage ?? body.three_match_percentage ?? 25;
  const four = body.fourMatchPercentage ?? body.four_match_percentage ?? 35;
  const five = body.fiveMatchPercentage ?? body.five_match_percentage ?? 40;

  const pctVal = validatePoolPercentages(three, four, five);
  if (!pctVal.valid) return pctVal;

  const name =
    typeof body.name === 'string' && body.name.trim()
      ? body.name.trim()
      : `Monthly Draw - ${monthVal.month}`;

  // Default drawDate to end of scheduled month if not provided
  const [yearStr, monthStr] = monthVal.month.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Last day of month at 23:59:59 UTC
  const lastDay = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  const deadline = new Date(lastDay.getTime() - 2 * 3600 * 1000); // 2 hours before draw

  const drawDate = typeof body.drawDate === 'string' ? body.drawDate : lastDay.toISOString();
  const entryDeadline = typeof body.entryDeadline === 'string' ? body.entryDeadline : deadline.toISOString();

  return {
    valid: true,
    data: {
      name,
      description: typeof body.description === 'string' ? body.description.trim() : undefined,
      charityId: typeof body.charityId === 'string' ? body.charityId : (body.charity_id as string | null) || null,
      drawType,
      scheduledMonth: monthVal.month,
      drawDate,
      entryDeadline,
      threeMatchPercentage: pctVal.percentages.threeMatch,
      fourMatchPercentage: pctVal.percentages.fourMatch,
      fiveMatchPercentage: pctVal.percentages.fiveMatch,
    },
  };
}

/**
 * Validates allowed draw lifecycle transitions.
 */
export function isValidDrawTransition(from: DrawStatus, to: DrawStatus): boolean {
  if (from === to) return true;

  const allowedTransitions: Record<DrawStatus, DrawStatus[]> = {
    draft: ['open', 'cancelled'],
    scheduled: ['open', 'cancelled'],
    open: ['closed', 'cancelled'],
    closed: ['simulated', 'cancelled'],
    simulated: ['simulated', 'completed', 'cancelled'], // can re-simulate
    completed: [], // immutable
    cancelled: [], // terminal
  };

  return (allowedTransitions[from] || []).includes(to);
}

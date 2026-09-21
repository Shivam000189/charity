/**
 * Score input validation utilities.
 *
 * Rules:
 *  - score: integer, 1 to 45 inclusive (Stableford points)
 *  - date: YYYY-MM-DD format, valid calendar date, cannot be in the future
 */

export interface ValidatedScoreInput {
  score: number;
  date: string; // YYYY-MM-DD
}

export type ScoreValidationErrorCode =
  | 'MISSING_FIELD'
  | 'INVALID_SCORE'
  | 'INVALID_DATE'
  | 'FUTURE_DATE';

export interface ScoreValidationError {
  code: ScoreValidationErrorCode;
  message: string;
}

/**
 * Validates a Stableford score integer (1–45).
 */
export function validateScoreValue(score: unknown): { valid: true; score: number } | { valid: false; error: ScoreValidationError } {
  if (score === undefined || score === null || score === '') {
    return {
      valid: false,
      error: { code: 'MISSING_FIELD', message: 'Score is required.' },
    };
  }

  const num = typeof score === 'number' ? score : Number(score);

  if (!Number.isInteger(num)) {
    return {
      valid: false,
      error: { code: 'INVALID_SCORE', message: 'Score must be a whole number.' },
    };
  }

  if (num < 1 || num > 45) {
    return {
      valid: false,
      error: { code: 'INVALID_SCORE', message: 'Stableford score must be between 1 and 45 inclusive.' },
    };
  }

  return { valid: true, score: num };
}

/**
 * Validates a score date string (YYYY-MM-DD, not in the future).
 */
export function validateScoreDate(dateStr: unknown): { valid: true; date: string } | { valid: false; error: ScoreValidationError } {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
    return {
      valid: false,
      error: { code: 'MISSING_FIELD', message: 'Date is required.' },
    };
  }

  const trimmed = dateStr.trim();
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(trimmed)) {
    return {
      valid: false,
      error: { code: 'INVALID_DATE', message: 'Date must be formatted as YYYY-MM-DD.' },
    };
  }

  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (isNaN(parsed.getTime())) {
    return {
      valid: false,
      error: { code: 'INVALID_DATE', message: 'Invalid calendar date.' },
    };
  }

  // Ensure year, month, day match the input (guards against invalid days like Feb 31)
  const [yearStr, monthStr, dayStr] = trimmed.split('-');
  if (
    parsed.getUTCFullYear() !== parseInt(yearStr, 10) ||
    parsed.getUTCMonth() + 1 !== parseInt(monthStr, 10) ||
    parsed.getUTCDate() !== parseInt(dayStr, 10)
  ) {
    return {
      valid: false,
      error: { code: 'INVALID_DATE', message: 'Invalid calendar date.' },
    };
  }

  // Check future date against current UTC calendar date
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  if (trimmed > todayStr) {
    return {
      valid: false,
      error: { code: 'FUTURE_DATE', message: 'Scores cannot be recorded for future dates.' },
    };
  }

  return { valid: true, date: trimmed };
}

/**
 * Validates both score and date.
 */
export function validateScoreInput(input: { score?: unknown; date?: unknown }): {
  valid: true;
  data: ValidatedScoreInput;
} | {
  valid: false;
  error: ScoreValidationError;
} {
  const scoreVal = validateScoreValue(input.score);
  if (!scoreVal.valid) {
    return scoreVal;
  }

  const dateVal = validateScoreDate(input.date);
  if (!dateVal.valid) {
    return dateVal;
  }

  return {
    valid: true,
    data: {
      score: scoreVal.score,
      date: dateVal.date,
    },
  };
}

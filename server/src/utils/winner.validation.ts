export class WinnerValidationError extends Error {
  public code: string;
  public status: number;

  constructor(code: string, message: string, status: number = 400) {
    super(message);
    this.name = 'WinnerValidationError';
    this.code = code;
    this.status = status;
  }
}

export const ALLOWED_PROOF_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PROOF_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Validates winner proof upload payload
 */
export function validateProofUpload(
  mimetype: string,
  bufferLength: number,
  filename: string
): { ext: string } {
  if (!mimetype || typeof mimetype !== 'string') {
    throw new WinnerValidationError('INVALID_MIME_TYPE', 'File MIME type is required.');
  }

  const normalizedMime = mimetype.toLowerCase().trim();
  if (!ALLOWED_PROOF_MIME_TYPES.includes(normalizedMime)) {
    throw new WinnerValidationError(
      'UNSUPPORTED_FILE_TYPE',
      `Unsupported file type '${mimetype}'. Only JPEG, PNG, and WebP images are permitted.`
    );
  }

  if (bufferLength <= 0) {
    throw new WinnerValidationError('EMPTY_FILE', 'Uploaded file cannot be empty.');
  }

  if (bufferLength > MAX_PROOF_FILE_SIZE_BYTES) {
    throw new WinnerValidationError(
      'FILE_TOO_LARGE',
      `File size exceeds maximum permitted limit of 5MB (size: ${(bufferLength / (1024 * 1024)).toFixed(2)}MB).`
    );
  }

  const rawExt = filename.split('.').pop()?.toLowerCase() || '';
  const forbiddenExts = ['svg', 'html', 'htm', 'js', 'exe', 'bat', 'sh', 'php'];
  if (forbiddenExts.includes(rawExt)) {
    throw new WinnerValidationError(
      'FORBIDDEN_FILE_EXTENSION',
      `File extension '.${rawExt}' is strictly forbidden.`
    );
  }

  let ext = 'jpg';
  if (normalizedMime === 'image/png') ext = 'png';
  if (normalizedMime === 'image/webp') ext = 'webp';

  return { ext };
}

/**
 * Validates admin rejection reason
 */
export function validateRejectionReason(reason: unknown): string {
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    throw new WinnerValidationError(
      'REJECTION_REASON_REQUIRED',
      'A valid, non-empty rejection reason is required to reject a winner proof.'
    );
  }

  const trimmed = reason.trim();
  if (trimmed.length > 500) {
    throw new WinnerValidationError(
      'REJECTION_REASON_TOO_LONG',
      'Rejection reason cannot exceed 500 characters.'
    );
  }

  return trimmed;
}

/**
 * Validates payment metadata
 */
export function validatePaymentInput(data: {
  paymentReference?: unknown;
  paidAt?: unknown;
  adminNote?: unknown;
}): {
  paymentReference: string;
  paidAt: string;
  adminNote: string | null;
} {
  if (!data.paymentReference || typeof data.paymentReference !== 'string' || data.paymentReference.trim().length === 0) {
    throw new WinnerValidationError(
      'PAYMENT_REFERENCE_REQUIRED',
      'Payment reference or transaction ID is required.'
    );
  }

  const paymentReference = data.paymentReference.trim();

  let paidAt = new Date().toISOString();
  if (data.paidAt) {
    if (typeof data.paidAt !== 'string' || isNaN(Date.parse(data.paidAt))) {
      throw new WinnerValidationError('INVALID_PAID_AT', 'Invalid paidAt timestamp.');
    }
    paidAt = new Date(data.paidAt).toISOString();
  }

  const adminNote = typeof data.adminNote === 'string' && data.adminNote.trim().length > 0 ? data.adminNote.trim() : null;

  return {
    paymentReference,
    paidAt,
    adminNote,
  };
}

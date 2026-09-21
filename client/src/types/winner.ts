export type WinnerVerificationStatus = 'PENDING_PROOF' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type WinnerPaymentStatus = 'PENDING' | 'PAID';

export interface Winner {
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

export interface WinnersApiResponse {
  success: boolean;
  winners?: Winner[];
  winner?: Winner;
  message?: string;
  payoutId?: string;
}

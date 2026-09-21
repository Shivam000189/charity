import { Request, Response } from 'express';
import { verifyWebhookSignature, processWebhookEvent } from '../services/webhook.service';

/**
 * Stripe Webhook Controller
 * Receives raw body, verifies Stripe-Signature header against STRIPE_WEBHOOK_SECRET,
 * and executes transactional event processing.
 */
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    res.status(400).json({
      success: false,
      code: 'MISSING_SIGNATURE',
      error: 'Missing Stripe-Signature header',
    });
    return;
  }

  if (!req.body) {
    res.status(400).json({
      success: false,
      code: 'MISSING_BODY',
      error: 'Missing raw request body',
    });
    return;
  }

  let event;
  try {
    event = verifyWebhookSignature(req.body, signature);
  } catch (err: unknown) {
    console.error('Stripe webhook signature verification failed:', (err as Error).message);
    res.status(400).json({
      success: false,
      code: 'INVALID_SIGNATURE',
      error: `Webhook signature verification failed: ${(err as Error).message}`,
    });
    return;
  }

  try {
    console.log(`[Stripe Webhook] Received verified event: ${event.id} (${event.type})`);
    const result = await processWebhookEvent(event);

    res.status(200).json({
      received: true,
      eventId: event.id,
      eventType: event.type,
      message: result.message,
    });
  } catch (err: unknown) {
    console.error(`[Stripe Webhook Error] Processing failed for event ${event.id}:`, (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'WEBHOOK_PROCESSING_FAILED',
      error: 'Internal server error while processing webhook event',
    });
  }
};

import { Router } from 'express';
import { handleStripeWebhook } from '../controllers/webhook.controller';

const router = Router();

/**
 * POST /api/webhooks/stripe
 * Public Stripe webhook endpoint. Validates Stripe-Signature using raw Buffer body.
 */
router.post('/stripe', handleStripeWebhook);

export default router;

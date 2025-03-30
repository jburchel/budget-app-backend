import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller';
// Import middleware if needed (e.g., authMiddleware for protected routes)
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();
const billingController = new BillingController();

// Stripe Webhook - Publicly accessible, but verified via signature
// IMPORTANT: This route needs the raw request body, not parsed JSON.
// Ensure express.raw({ type: 'application/json' }) middleware is applied *before* this router
// specifically for the /stripe/webhook path in your main app setup (e.g., app.ts).
router.post('/stripe/webhook', billingController.handleWebhook);

// --- Protected Billing Routes ---

// POST /billing/create-checkout-session - Create a Stripe Checkout session
router.post(
    '/create-checkout-session', 
    authMiddleware, // User must be logged in
    // TODO: Add Zod validation for priceId in body
    billingController.createCheckoutSession
);

// POST /billing/create-portal-session - Create a Stripe Billing Portal session
router.post(
    '/create-portal-session', 
    authMiddleware, // User must be logged in
    billingController.createPortalSession
);

// Example: Route to create a portal session (requires user to be logged in)
// router.post('/create-portal-session', authMiddleware, billingController.createPortalSession);

export default router; 
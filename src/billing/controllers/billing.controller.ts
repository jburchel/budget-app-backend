import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billing.service';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface'; // Import user type

export class BillingController {
    private billingService = new BillingService();

    /**
     * POST /stripe/webhook
     * Handles incoming Stripe webhook events.
     */
    handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Stripe requires the raw body for signature verification
        const signature = req.headers['stripe-signature'] as string;

        if (!signature) {
            console.warn('Webhook received without stripe-signature header');
            res.status(400).send('Webhook Error: Missing stripe-signature header');
            return;
        }

        // req.body should be the raw Buffer if configured correctly before this route
        if (!Buffer.isBuffer(req.body)) {
            console.error('Webhook Error: Request body is not a Buffer. Ensure express.raw() is used before this route for /stripe/webhook.');
            res.status(400).send('Webhook Error: Invalid request body format.');
            return;
        }

        try {
            await this.billingService.handleWebhook(req.body, signature);
            // Send a 200 OK response to acknowledge receipt of the event
            res.status(200).json({ received: true });
        } catch (error) {
            // Errors (like signature verification failure) might be thrown by the service
            // Pass them to the global error handler
            next(error);
        }
    };

    /**
     * POST /billing/create-checkout-session
     * Creates a Stripe Checkout session for starting a subscription.
     */
    createCheckoutSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user as AuthenticatedUser;
            if (!user) {
                 // Should be caught by authMiddleware, but defensive check
                res.status(401).json({ message: 'User not authenticated' });
                return;
            }

            // Expect priceId (e.g., monthly/yearly plan) in the request body
            const { priceId } = req.body;
            if (!priceId || typeof priceId !== 'string') {
                // TODO: Use Zod validation
                res.status(400).json({ message: 'Missing or invalid priceId in request body' });
                return;
            }

            // Define success/cancel URLs (these should ideally come from config/env)
            const successUrl = `${process.env.FRONTEND_URL}/subscription-success`; // Example URL
            const cancelUrl = `${process.env.FRONTEND_URL}/subscription-canceled`; // Example URL

             if (!successUrl || !cancelUrl) {
                 console.error("FRONTEND_URL environment variable not set for checkout redirects.");
                 res.status(500).json({ message: "Server configuration error."}) 
                 return;
             }

            const session = await this.billingService.createCheckoutSession(
                user.id,
                priceId,
                successUrl,
                cancelUrl
            );

            // Send the session URL back to the client for redirection
            res.status(200).json(session);

        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /billing/create-portal-session
     * Creates a Stripe Billing Portal session for managing subscription.
     */
    createPortalSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user as AuthenticatedUser;
            if (!user) {
                 res.status(401).json({ message: 'User not authenticated' });
                return;
            }

            // Define the return URL (where user comes back after managing billing)
            // This should likely be a settings/billing page in your frontend.
            const returnUrl = `${process.env.FRONTEND_URL}/settings/billing`; // Example URL
            
            if (!returnUrl) {
                console.error("FRONTEND_URL environment variable not set for portal redirect.");
                res.status(500).json({ message: "Server configuration error."}) 
                return;
            }

            const session = await this.billingService.createPortalSession(user.id, returnUrl);

            // Send the session URL back to the client for redirection
            res.status(200).json(session);

        } catch (error) {
            next(error);
        }
    };
} 
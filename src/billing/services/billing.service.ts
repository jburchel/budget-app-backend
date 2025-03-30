import Stripe from 'stripe';
import stripeClient from '../../config/stripe'; // Use the initialized client
import prisma from '../../config/prisma';
import { HttpException } from '../../middleware/errorHandler';
import { User } from '@prisma/client'; // Import User type

export class BillingService {

    /**
     * Handles incoming Stripe webhook events.
     * Verifies the signature and processes relevant events to update the database.
     *
     * @param payload - The raw request body (buffer) from Stripe.
     * @param signature - The value of the 'stripe-signature' header.
     * @returns A promise that resolves when processing is complete.
     */
    async handleWebhook(payload: Buffer, signature: string): Promise<void> {
        if (!stripeClient) {
            throw new HttpException(500, 'Stripe client not initialized');
        }
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            throw new HttpException(500, 'Stripe webhook secret not configured');
        }

        let event: Stripe.Event;

        // 1. Verify the webhook signature
        try {
            event = stripeClient.webhooks.constructEvent(
                payload,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            throw new HttpException(400, `Webhook Error: ${err.message}`);
        }

        // 2. Handle the event type
        console.log(`Received Stripe event: ${event.type}`);
        const dataObject = event.data.object as any; // Use 'any' for simplicity, or type guards

        try {
            switch (event.type) {
                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                case 'customer.subscription.deleted': // Handles cancellations, etc.
                    const subscription = dataObject as Stripe.Subscription;
                    await this.updateSubscriptionStatus(subscription);
                    break;
                
                // case 'invoice.payment_succeeded':
                //     // Handle successful payment, maybe grant access or update billing cycle info
                //     const invoice = dataObject as Stripe.Invoice;
                //     console.log(`Invoice payment succeeded for ${invoice.customer}`);
                //     // Find user by invoice.customer (Stripe Customer ID) and update DB
                //     break;

                // case 'invoice.payment_failed':
                //     // Handle failed payment, potentially restrict access or notify user
                //     const failedInvoice = dataObject as Stripe.Invoice;
                //     console.log(`Invoice payment failed for ${failedInvoice.customer}`);
                //     // Find user by invoice.customer and update DB (e.g., set status to past_due)
                //     break;
                
                // --- Add other event types as needed --- 
                // checkout.session.completed? (Maybe handle subscription creation here too)
                // customer.created? (If you don't create customer before checkout)

                default:
                    console.log(`Unhandled Stripe event type: ${event.type}`);
            }
        } catch (error) {
            console.error(`Error handling webhook event ${event.type}:`, error);
            // Don't throw here to avoid Stripe retrying potentially malformed events indefinitely
            // Log the error thoroughly for investigation.
            // Consider specific error handling based on the error type.
        }

        // Return void or a success indicator if needed, but typically just process.
    }

    /**
     * Helper function to update user subscription status based on a Stripe Subscription object.
     */
    private async updateSubscriptionStatus(subscription: Stripe.Subscription): Promise<void> {
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        
        if (!customerId) {
            console.error('Subscription object missing customer ID', subscription.id);
            return; 
        }

        const user = await prisma.user.findUnique({
            where: { stripeCustomerId: customerId },
        });

        if (!user) {
            console.error(`Webhook Error: User not found for Stripe customer ID ${customerId}`);
            return; 
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                subscriptionId: subscription.id,
                subscriptionStatus: subscription.status,
                planId: subscription.items.data[0]?.price?.id,
                // Capture trial end date directly from Stripe when status is 'trialing'
                trialEndDate: subscription.status === 'trialing' && subscription.trial_end
                              ? new Date(subscription.trial_end * 1000)
                              : null, // Set to null if not trialing or trial_end is null
            },
        });

        console.log(`Updated subscription status for user ${user.id} to ${subscription.status}`);
    }

    /**
     * Creates a Stripe Checkout Session for a user to subscribe.
     *
     * @param userId - The ID of the user subscribing.
     * @param priceId - The ID of the Stripe Price object for the subscription plan.
     * @param successUrl - The URL to redirect to on successful payment.
     * @param cancelUrl - The URL to redirect to if the user cancels.
     * @returns The URL of the created Stripe Checkout Session.
     */
    async createCheckoutSession(
        userId: string,
        priceId: string,
        successUrl: string,
        cancelUrl: string
    ): Promise<{ url: string | null }> {
        if (!stripeClient) {
            throw new HttpException(500, 'Stripe client not initialized');
        }

        // 1. Get user data (needed for email and potentially existing Stripe Customer ID)
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new HttpException(404, 'User not found');
        }

        let stripeCustomerId = user.stripeCustomerId;

        // 2. Create Stripe Customer if one doesn't exist
        if (!stripeCustomerId) {
            try {
                const customer = await stripeClient.customers.create({
                    email: user.email,
                    name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                    metadata: {
                        appUserId: userId, // Link Stripe customer back to your user ID
                    },
                });
                stripeCustomerId = customer.id;

                // Update user record with the new Stripe Customer ID
                await prisma.user.update({
                    where: { id: userId },
                    data: { stripeCustomerId: stripeCustomerId },
                });
            } catch (error: any) {
                console.error('Failed to create Stripe customer:', error);
                throw new HttpException(500, `Failed to create billing customer: ${error.message}`);
            }
        }

        // 3. Create Stripe Checkout Session
        try {
            const session = await stripeClient.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'subscription',
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                customer: stripeCustomerId, // Link to existing or newly created customer
                success_url: successUrl, // Redirect URL on success
                cancel_url: cancelUrl,   // Redirect URL on cancellation
                // Optionally add trial period for new subscriptions
                subscription_data: {
                    trial_period_days: 30, // Example: 30-day free trial
                    // Ensure metadata carries over if needed
                    // metadata: { ... }
                },
                 // You might want to collect billing address if required for taxes/compliance
                 // billing_address_collection: 'required',
                 // automatic_tax: { enabled: true }, // If using Stripe Tax
            });

            return { url: session.url }; // Return the redirect URL
        } catch (error: any) {
            console.error('Failed to create Stripe Checkout session:', error);
            throw new HttpException(500, `Failed to create checkout session: ${error.message}`);
        }
    }

    /**
     * Creates a Stripe Billing Portal Session for a user to manage their subscription.
     *
     * @param userId - The ID of the user accessing the portal.
     * @param returnUrl - The URL to redirect the user back to after they leave the portal.
     * @returns The URL of the created Stripe Billing Portal Session.
     */
    async createPortalSession(
        userId: string,
        returnUrl: string
    ): Promise<{ url: string }> {
        if (!stripeClient) {
            throw new HttpException(500, 'Stripe client not initialized');
        }

        // 1. Get user and their Stripe Customer ID
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { stripeCustomerId: true },
        });

        if (!user || !user.stripeCustomerId) {
            // User should have a Stripe Customer ID if they have an active subscription
            // or have attempted checkout before.
            throw new HttpException(400, 'Billing customer not found for this user.');
        }

        const stripeCustomerId = user.stripeCustomerId;

        // 2. Create Stripe Billing Portal Session
        try {
            const portalSession = await stripeClient.billingPortal.sessions.create({
                customer: stripeCustomerId,
                return_url: returnUrl, // Where to send the user back to your site
            });

            return { url: portalSession.url };
        } catch (error: any) {
            console.error('Failed to create Stripe Billing Portal session:', error);
            throw new HttpException(500, `Failed to create customer portal session: ${error.message}`);
        }
    }
} 
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables (ensure STRIPE_SECRET_KEY is set)
dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
    console.warn(
        'WARNING: STRIPE_SECRET_KEY environment variable not set. Stripe functionality will not work.'
    );
    // Don't exit in dev if people aren't testing billing, but log clearly.
    // In production, the main startup check should catch missing critical keys.
}

// Initialize Stripe with the API key and potentially API version
// Ensure stripeSecretKey is not undefined before passing it
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
    apiVersion: '2025-02-24.acacia', // Use the API version expected by the installed library types
    typescript: true, // Enable TypeScript support
}) : null;

// Export the initialized Stripe instance
export default stripe; 
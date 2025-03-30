import app from './config/app';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// --- Environment Variable Validation ---
const 필수_환경변수 = [
    'DATABASE_URL',
    'JWT_SECRET',
    'CORS_ORIGIN',
    // Plaid variables
    'PLAID_CLIENT_ID',
    'PLAID_SECRET_PRODUCTION',
    // Stripe variables
    'STRIPE_SECRET_KEY',        // Add Stripe Secret Key
    'STRIPE_WEBHOOK_SECRET',  // Add Stripe Webhook Secret
    'STRIPE_PRICE_ID_MONTHLY', // Add Stripe Price ID (at least monthly)
    'FRONTEND_URL' // Add Frontend URL check
];

if (process.env.NODE_ENV === 'production') {
    console.log("Running in production mode. Checking environment variables...");
    const 누락된_변수들 = 필수_환경변수.filter(변수 => !process.env[변수]);

    if (누락된_변수들.length > 0) {
        console.error('FATAL ERROR: Missing required environment variables:');
        누락된_변수들.forEach(변수 => console.error(`- ${변수}`));
        process.exit(1); // Exit the process with an error code
    }
    console.log("Required environment variables are set.");
}
// --- End Environment Variable Validation ---

const PORT = process.env.PORT || 3000; // Use environment port or default

// Start server
app.listen(PORT, () => {
  console.log(`\nServer listening on port ${PORT}`);
  console.log(`API docs available at http://localhost:${PORT}/api-docs`); // Adjust URL if needed
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Basic error handling for server startup
app.on('error', (error) => {
    console.error('Server startup error:', error);
    process.exit(1);
}); 
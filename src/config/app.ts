import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger'; // Import the generated spec
import healthCheckRoutes from '../routes/health';
// Import the error handler
import { errorHandler } from '../middleware/errorHandler';
// Import auth routes
import authRoutes from '../auth/routes';
// Import user routes
import userRoutes from '../user/routes';
// Import budget routes
import budgetRoutes from '../budget/routes';
// Import account routes
import accountRoutes from '../account/routes';
// Import transaction routes
import transactionRoutes from '../transaction/routes';
// Import Plaid routes
import plaidRoutes from '../plaid/routes';
// Import Reporting routes
import reportingRoutes from '../reporting/routes';
import goalRoutes from '../goal/routes';
import billingRoutes from '../billing/routes'; // Import billing routes
import rateLimit from 'express-rate-limit'; // Import rate-limiter

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Apply middlewares
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));
app.use(morgan('dev')); // Logging

// IMPORTANT: Apply express.raw() for Stripe webhook *before* express.json()
// for the specific webhook path ONLY.
app.use('/api/v1/stripe/webhook', express.raw({ type: 'application/json' }));

// Body Parsers for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ** Apply Rate Limiting **
// Apply to all requests starting with /api
app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again after 15 minutes' // Optional custom message
}));

// API Version Prefix
const API_PREFIX = '/api/v1';

// Setup Swagger Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Apply routes
app.use('/health', healthCheckRoutes); // Health check doesn't need prefix
app.use(`${API_PREFIX}/auth`, authRoutes); // Add auth routes
app.use(`${API_PREFIX}/user`, userRoutes); // Add user routes
app.use(`${API_PREFIX}/budgets`, budgetRoutes); // Add budget routes
app.use(`${API_PREFIX}/accounts`, accountRoutes); // Add account routes
app.use(`${API_PREFIX}/transactions`, transactionRoutes); // Add transaction routes
app.use(`${API_PREFIX}/payees`, transactionRoutes); // Add payee routes (using same router)
app.use(`${API_PREFIX}/plaid`, plaidRoutes); // Add Plaid routes
app.use(`${API_PREFIX}/reporting`, reportingRoutes); // Add Reporting routes
app.use(`${API_PREFIX}/goal`, goalRoutes); // Assuming goals are mounted like this

// Mount Billing routes (includes the webhook path defined above)
app.use(`${API_PREFIX}/billing`, billingRoutes);

// Apply error handling middleware (must be after routes)
app.use(errorHandler);

export default app; 
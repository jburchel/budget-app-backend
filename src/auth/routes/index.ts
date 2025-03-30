import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's chosen password (min length 8)
 *               firstName:
 *                 type: string
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 description: User's last name
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/AuthenticatedUser' # Define this schema later if needed
 *                 token:
 *                   type: string
 *                   description: JWT token for the session
 *       400:
 *         description: Invalid input (e.g., missing fields)
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Internal server error
 *     security: [] # No security required for registration
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in an existing user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/AuthenticatedUser'
 *                 token:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid email or password
 *       500:
 *         description: Internal server error
 *     security: [] # No security required for login
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out the current user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: [] # Requires authentication (JWT)
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       500:
 *         description: Internal server error
 */
router.post('/logout', authMiddleware, authController.logout);

// Define component schemas (can be moved to a separate file or included in swagger config)
/**
 * @swagger
 * components:
 *   schemas:
 *     AuthenticatedUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the user
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         firstName:
 *           type: string
 *           nullable: true
 *           description: User's first name
 *         lastName:
 *           type: string
 *           nullable: true
 *           description: User's last name
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the user was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the user was last updated
 *         isEmailVerified:
 *             type: boolean
 *             description: Whether the user has verified their email address
 */

// --- Public Routes ---
// POST /auth/register ...
// POST /auth/login ...
// POST /auth/mfa/login-verify ...

// POST /auth/request-password-reset
router.post(
    '/request-password-reset',
    // TODO: Add Zod validation for email
    authController.requestPasswordReset
);

// POST /auth/reset-password
router.post(
    '/reset-password',
    // TODO: Add Zod validation for token and newPassword
    authController.resetPassword
);

// --- MFA Routes (Require Authentication) ---

// POST /auth/mfa/setup - Generate secret and QR code for setup
router.post(
    '/mfa/setup', 
    authMiddleware, // Protect this route
    authController.setupMfa
);

// POST /auth/mfa/verify - Verify the first token and enable MFA
router.post(
    '/mfa/verify', 
    authMiddleware, // Protect this route
    // TODO: Add Zod validation for the token in the body
    authController.verifyMfa
);

// POST /auth/mfa/disable - Disable MFA for the account
router.post(
    '/mfa/disable', 
    authMiddleware, // Protect this route
    authController.disableMfa
);

// TODO: Add recovery code routes?

// --- Other Auth Routes (Password Reset, etc.) ---
// TODO: Add these routes

export default router;

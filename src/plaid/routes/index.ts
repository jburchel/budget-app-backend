import { Router } from 'express';
import { PlaidController } from '../controllers/plaid.controller';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();
const plaidController = new PlaidController();

// All Plaid routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Plaid
 *   description: Plaid integration for linking bank accounts
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LinkTokenResponse:
 *       type: object
 *       properties:
 *         link_token:
 *           type: string
 *           description: The Plaid Link token
 *     PublicTokenExchangeRequest:
 *       type: object
 *       required: [public_token]
 *       properties:
 *         public_token:
 *           type: string
 *           description: The public token received from the Plaid Link client-side flow
 *     PublicTokenExchangeResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         itemId:
 *            type: string
 *            description: The Plaid Item ID for the newly linked item
 *         institutionName:
 *            type: string
 *            nullable: true
 *            description: The name of the linked financial institution
 *     SyncTransactionsRequest:
 *       type: object
 *       required: [itemId]
 *       properties:
 *         itemId:
 *           type: string
 *           description: The Plaid Item ID to sync transactions for
 *     SyncTransactionsResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *         added: { type: integer, description: 'Number of transactions added' }
 *         modified: { type: integer, description: 'Number of transactions modified' }
 *         removed: { type: integer, description: 'Number of transactions removed' }
 *         nextCursor: { type: string, description: 'The next cursor to use for subsequent syncs' }
 */

/**
 * @swagger
 * /plaid/create_link_token:
 *   post:
 *     summary: Create a Plaid Link token
 *     tags: [Plaid]
 *     description: Creates a short-lived Link token required to initialize the Plaid Link flow on the client-side.
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Link token created successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/LinkTokenResponse' } } }
 *       401: { description: Unauthorized }
 *       500: { description: Internal Server Error (Plaid API issue) }
 */
router.post('/create_link_token', plaidController.createLinkToken);

/**
 * @swagger
 * /plaid/exchange_public_token:
 *   post:
 *     summary: Exchange Plaid public token for an access token
 *     tags: [Plaid]
 *     description: Exchanges the public token (obtained from client-side Link success) for a persistent Plaid access token and item ID, storing them securely.
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PublicTokenExchangeRequest' }
 *     responses:
 *       200:
 *         description: Public token exchanged and item stored successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/PublicTokenExchangeResponse' } } }
 *       400: { description: Bad Request (missing public_token) }
 *       401: { description: Unauthorized }
 *       500: { description: Internal Server Error (Plaid API issue or storage error) }
 */
router.post('/exchange_public_token', plaidController.exchangePublicToken);

/**
 * @swagger
 * /plaid/sync_transactions:
 *   post:
 *     summary: Fetch and process transaction updates from Plaid
 *     tags: [Plaid]
 *     description: Retrieves transaction changes since the last sync for a given Plaid Item ID, processes them (adds, updates, removes), and updates the sync cursor.
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SyncTransactionsRequest' }
 *     responses:
 *       200:
 *         description: Transactions synced successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/SyncTransactionsResponse' } } }
 *       400: { description: Bad Request (missing itemId) }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden (User does not own Plaid Item) }
 *       404: { description: Plaid Item not found }
 *       500: { description: Internal Server Error (Plaid API issue or processing error) }
 */
router.post('/sync_transactions', plaidController.syncTransactions);

// TODO: Add routes for webhooks, etc.

export default router;

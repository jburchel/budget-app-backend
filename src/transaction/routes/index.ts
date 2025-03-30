import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { PayeeController } from '../controllers/payee.controller';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();
const transactionController = new TransactionController();
const payeeController = new PayeeController();

// All routes require authentication
router.use(authMiddleware);

// --- Swagger Definitions --- //
/**
 * @swagger
 * tags:
 *   - name: Transactions
 *     description: Financial transactions management
 *   - name: Payees
 *     description: Payee management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ClearedStatus:
 *       type: string
 *       enum: [CLEARED, UNCLEARED, RECONCILED]
 *     SplitTransactionInput:
 *       type: object
 *       required: [categoryId, amount]
 *       properties:
 *         categoryId: { type: string, format: uuid }
 *         amount: { type: number, format: double, description: 'Amount for this split (positive or negative)' }
 *         memo: { type: string, nullable: true }
 *     TransactionCreate:
 *       type: object
 *       required: [accountId, date, amount]
 *       properties:
 *         accountId: { type: string, format: uuid }
 *         date: { type: string, format: date-time }
 *         amount: { type: number, format: double, description: 'Total amount (+ inflow, - outflow)' }
 *         payeeName: { type: string, description: 'Find or create payee by this name if payeeId not provided' }
 *         payeeId: { type: string, format: uuid, description: 'ID of existing payee' }
 *         categoryId: { type: string, format: uuid, description: 'Required for non-split, non-transfer' }
 *         cleared: { $ref: '#/components/schemas/ClearedStatus' }
 *         approved: { type: boolean, default: false }
 *         memo: { type: string, nullable: true }
 *         isTransfer: { type: boolean, default: false }
 *         transferAccountId: { type: string, format: uuid, description: 'Required if isTransfer is true' }
 *         isSplit: { type: boolean, default: false }
 *         splits: { type: array, items: { $ref: '#/components/schemas/SplitTransactionInput' }, description: 'Required if isSplit is true' }
 *       example:
 *         accountId: "acc_123..."
 *         date: "2024-03-30T10:00:00Z"
 *         amount: -55.75
 *         payeeName: "Grocery Store"
 *         categoryId: "cat_food..."
 *         cleared: UNCLEARED
 *         memo: "Weekly groceries"
 *     TransactionUpdate:
 *       type: object
 *       properties:
 *         accountId: { type: string, format: uuid }
 *         date: { type: string, format: date-time }
 *         amount: { type: number, format: double, description: 'Cannot update amount for split transactions via this endpoint' }
 *         payeeName: { type: string }
 *         payeeId: { type: string, format: uuid }
 *         categoryId: { type: string, format: uuid, description: 'Cannot update for split transactions' }
 *         cleared: { $ref: '#/components/schemas/ClearedStatus' }
 *         approved: { type: boolean }
 *         memo: { type: string, nullable: true }
 *       example:
 *         cleared: CLEARED
 *         memo: "Updated memo"
 *     Transaction:
 *       // Define the full Transaction response schema based on Prisma model
 *       // including Payee, Category, SplitTransaction objects if populated
 *       type: object
 *       properties:
 *         # Add all fields from Prisma Transaction model here
 *         id: { type: string, format: uuid }
 *         # ... other fields
 *         payee: { $ref: '#/components/schemas/Payee' } # Example relation
 *         # ... etc
 *     Payee:
 *       // Define Payee response schema based on Prisma model
 *       type: object
 *       required: [id, name, budgetId]
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string }
 *         budgetId: { type: string, format: uuid }
 *       example:
 *         id: "pay_xyz..."
 *         name: "Utility Company"
 *         budgetId: "bud_abc..."
 *     PayeeUpdate:
 *       type: object
 *       required: [name]
 *       properties:
 *         name: { type: string }
 *       example:
 *         name: "Electric Company"
 */

// --- Transaction Routes --- //
/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Create a new transaction (simple, split, or transfer)
 *     tags: [Transactions]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TransactionCreate' }
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Transaction' } } } # Adjust response schema as needed
 *       400: { description: Bad Request (validation errors) }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Account, Budget, Payee, or Category not found }
 */
router.post('/', transactionController.createTransaction);

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Get transactions, optionally filtered by budget or account
 *     tags: [Transactions]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: budgetId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID of the budget to retrieve transactions for
 *       - in: query
 *         name: accountId
 *         required: false
 *         schema: { type: string, format: uuid }
 *         description: Optional ID of the account to filter transactions by
 *       # Add parameters for sorting, filtering (date range, cleared status), pagination later
 *     responses:
 *       200:
 *         description: List of transactions
 *         content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Transaction' } } } }
 *       400: { description: Bad Request (missing budgetId) }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Budget or Account not found }
 */
router.get('/', transactionController.getTransactions);

/**
 * @swagger
 * /transactions/{transactionId}:
 *   put:
 *     summary: Update a transaction
 *     tags: [Transactions]
 *     description: Updates simple fields. Cannot update split details or transfer status via this endpoint.
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TransactionUpdate' }
 *     responses:
 *       200:
 *         description: Transaction updated successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Transaction' } } }
 *       400: { description: Bad Request (validation error, attempting complex update) }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Transaction, Payee, Category, or Account not found }
 */
router.put('/:transactionId', transactionController.updateTransaction);

/**
 * @swagger
 * /transactions/{transactionId}:
 *   delete:
 *     summary: Delete a transaction
 *     tags: [Transactions]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Transaction deleted successfully }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Transaction not found }
 */
router.delete('/:transactionId', transactionController.deleteTransaction);

// --- Payee Routes --- //
/**
 * @swagger
 * /payees:
 *   get:
 *     summary: Get all payees for a specific budget
 *     tags: [Payees]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: budgetId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID of the budget to retrieve payees for
 *     responses:
 *       200:
 *         description: List of payees
 *         content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Payee' } } } }
 *       400: { description: Bad Request (missing budgetId) }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Budget not found }
 */
router.get('/payees', payeeController.getAllPayees);

/**
 * @swagger
 * /payees/{payeeId}:
 *   get:
 *     summary: Get a specific payee by ID
 *     tags: [Payees]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: payeeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payee data
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Payee' } } }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Payee not found }
 */
router.get('/payees/:payeeId', payeeController.getPayeeById);

/**
 * @swagger
 * /payees/{payeeId}:
 *   put:
 *     summary: Update a payee (e.g., rename)
 *     tags: [Payees]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: payeeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PayeeUpdate' }
 *     responses:
 *       200:
 *         description: Payee updated successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Payee' } } }
 *       400: { description: Bad Request (e.g., empty name) }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Payee not found }
 *       409: { description: Conflict (name already exists) }
 */
router.put('/payees/:payeeId', payeeController.updatePayee);

export default router;

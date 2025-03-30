import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();
const accountController = new AccountController();

// All account routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Financial account management & reconciliation
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AccountType:
 *       type: string
 *       enum:
 *         - CHECKING
 *         - SAVINGS
 *         - CREDIT_CARD
 *         - CASH
 *         - LINE_OF_CREDIT
 *         - INVESTMENT
 *         - MORTGAGE
 *         - OTHER_ASSET
 *         - OTHER_LIABILITY
 *       description: Type of financial account
 *     Account:
 *       type: object
 *       required: [id, name, type, onBudget, budgetId, isClosed, createdAt, updatedAt, balance, clearedBalance, unclearedBalance]
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string }
 *         type: { $ref: '#/components/schemas/AccountType' }
 *         onBudget: { type: boolean, description: 'If true, transactions affect the budget' }
 *         balance: { type: number, format: double, description: 'Calculated current balance (cleared + uncleared)' }
 *         clearedBalance: { type: number, format: double, description: 'Calculated balance of cleared/reconciled transactions' }
 *         unclearedBalance: { type: number, format: double, description: 'Calculated balance of uncleared transactions' }
 *         officialName: { type: string, nullable: true }
 *         note: { type: string, nullable: true }
 *         isClosed: { type: boolean }
 *         budgetId: { type: string, format: uuid }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *       example:
 *         id: "acc_123..."
 *         name: "Main Checking"
 *         type: CHECKING
 *         onBudget: true
 *         balance: 1234.56
 *         clearedBalance: 1200.00
 *         unclearedBalance: 34.56
 *         officialName: "Primary Checking Account (...1234)"
 *         note: "Main account for bills"
 *         isClosed: false
 *         budgetId: "bud_abc..."
 *         createdAt: "2023-10-01T..."
 *         updatedAt: "2023-12-15T..."
 *     AccountCreate:
 *       type: object
 *       required: [name, type, budgetId]
 *       properties:
 *         name: { type: string }
 *         type: { $ref: '#/components/schemas/AccountType' }
 *         balance: { type: number, format: double, description: 'Optional initial balance' }
 *         budgetId: { type: string, format: uuid }
 *         onBudget: { type: boolean, description: 'Defaults based on type if omitted' }
 *         note: { type: string }
 *         officialName: { type: string }
 *       example:
 *         name: "Savings Account"
 *         type: SAVINGS
 *         balance: 5000
 *         budgetId: "bud_abc..."
 *         onBudget: true
 *     AccountUpdate:
 *       type: object
 *       properties:
 *         name: { type: string }
 *         type: { $ref: '#/components/schemas/AccountType' }
 *         onBudget: { type: boolean }
 *         note: { type: string }
 *         officialName: { type: string }
 *       example:
 *         name: "Main Checking Account"
 *         note: "Updated note"
 *     ReconciliationStartRequest:
 *       type: object
 *       required: [statementBalance]
 *       properties:
 *         statementBalance: { type: number, format: double, description: 'The balance from the official account statement' }
 *     ReconciliationStartResponse:
 *       type: object
 *       properties:
 *         transactions:
 *           type: array
 *           items: { $ref: '#/components/schemas/Transaction' }
 *           description: 'List of CLEARED and UNCLEARED transactions for the account'
 *         currentClearedBalance:
 *           type: number
 *           format: double
 *           description: 'The sum of transactions currently marked as CLEARED (but not yet RECONCILED)'
 *         statementBalance:
 *            type: number
 *            format: double
 *            description: 'The statement balance provided by the user'
 *     ReconciliationFinishResponse:
 *        type: object
 *        properties:
 *          reconciledCount:
 *            type: integer
 *            description: 'Number of transactions marked as RECONCILED'
 */

/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: Get all accounts for a specific budget
 *     tags: [Accounts]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: budgetId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: The ID of the budget whose accounts are to be retrieved
 *     responses:
 *       200:
 *         description: List of accounts (excluding closed by default)
 *         content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Account' } } } }
 *       400: { description: Bad Request (missing budgetId) }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden (User does not own budget) }
 *       404: { description: Budget not found }
 */
router.get('/', accountController.getAllAccounts);

/**
 * @swagger
 * /accounts:
 *   post:
 *     summary: Create a new account
 *     tags: [Accounts]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AccountCreate' }
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Account' } } }
 *       400: { description: Bad Request (missing fields, invalid type) }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden (User does not own budget) }
 *       404: { description: Budget not found }
 */
router.post('/', accountController.createAccount);

/**
 * @swagger
 * /accounts/{accountId}:
 *   get:
 *     summary: Get a specific account by ID
 *     tags: [Accounts]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID of the account to retrieve
 *     responses:
 *       200:
 *         description: Account data
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Account' } } }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Account not found }
 */
router.get('/:accountId', accountController.getAccountById);

/**
 * @swagger
 * /accounts/{accountId}:
 *   put:
 *     summary: Update a specific account
 *     tags: [Accounts]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AccountUpdate' }
 *     responses:
 *       200:
 *         description: Account updated successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Account' } } }
 *       400: { description: Bad Request (empty body, invalid type) }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Account not found }
 */
router.put('/:accountId', accountController.updateAccount);

/**
 * @swagger
 * /accounts/{accountId}/close:
 *   post:
 *     summary: Close a specific account
 *     tags: [Accounts]
 *     description: Marks an account as closed. Does not delete data.
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Account closed successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Account' } } }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Account not found }
 */
router.post('/:accountId/close', accountController.closeAccount);

/**
 * @swagger
 * /accounts/{accountId}/reopen:
 *   post:
 *     summary: Reopen a closed account
 *     tags: [Accounts]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Account reopened successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Account' } } }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Account not found }
 */
router.post('/:accountId/reopen', accountController.reopenAccount);

/**
 * @swagger
 * /accounts/{accountId}/reconcile/start:
 *   post:
 *     summary: Start account reconciliation
 *     tags: [Accounts]
 *     description: Initiates the reconciliation process for an account by providing the statement balance and returning relevant transactions.
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ReconciliationStartRequest' }
 *     responses:
 *       200:
 *         description: Reconciliation started, returns transactions to review
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ReconciliationStartResponse' } } }
 *       400: { description: Bad Request (missing statement balance, account closed) }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Account not found }
 */
router.post('/:accountId/reconcile/start', accountController.startReconciliation);

/**
 * @swagger
 * /accounts/{accountId}/reconcile/finish:
 *   post:
 *     summary: Finish account reconciliation
 *     tags: [Accounts]
 *     description: Marks all currently CLEARED transactions for the account as RECONCILED. Assumes the user has already verified the cleared balance matches the statement balance (potentially using an adjustment transaction).
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Reconciliation finished, transactions locked
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ReconciliationFinishResponse' } } }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Account not found }
 */
router.post('/:accountId/reconcile/finish', accountController.finishReconciliation);

export default router;

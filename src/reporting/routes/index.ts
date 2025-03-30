import { Router } from 'express';
import { ReportingController } from '../controllers/reporting.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import {
    ReportQueryDto,
    SpendingByCategoryItem,
    SpendingByPayeeItem,
    SpendingReportResponse,
    IncomeExpenseReportResponse,
    NetWorthDataPoint,
    NetWorthReportResponse,
    AgeOfMoneyResponse
} from '../interfaces/reporting.interface';

const router = Router();
const reportingController = new ReportingController();

// All reporting routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Reporting
 *   description: Financial reports and insights
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ReportQuery:
 *       type: object
 *       properties:
 *         budgetId: { type: string, format: uuid, description: "ID of the budget to report on" }
 *         startDate: { type: string, format: date, description: "Start date for the report (YYYY-MM-DD)" }
 *         endDate: { type: string, format: date, description: "End date for the report (YYYY-MM-DD)" }
 *         accountIds: { type: array, items: { type: string, format: uuid }, description: "Optional list of account IDs to filter by" }
 *         categoryIds: { type: array, items: { type: string, format: uuid }, description: "Optional list of category IDs to filter by" }
 * 
 *     SpendingByCategoryItem:
 *       type: object
 *       properties:
 *         categoryId: { type: string, format: uuid }
 *         categoryName: { type: string }
 *         totalSpending: { type: number, format: double }
 *         transactionCount: { type: integer }
 *         averageSpending: { type: number, format: double }
 *
 *     SpendingByPayeeItem:
 *       type: object
 *       properties:
 *         payeeId: { type: string, format: uuid, nullable: true }
 *         payeeName: { type: string, nullable: true }
 *         totalSpending: { type: number, format: double }
 *         transactionCount: { type: integer }
 *         averageSpending: { type: number, format: double }
 * 
 *     SpendingReportResponse:
 *       type: object
 *       properties:
 *         startDate: { type: string, format: date }
 *         endDate: { type: string, format: date }
 *         totalSpending: { type: number, format: double }
 *         reportItems: 
 *           oneOf:
 *             - type: array
 *               items: { $ref: '#/components/schemas/SpendingByCategoryItem' }
 *             - type: array
 *               items: { $ref: '#/components/schemas/SpendingByPayeeItem' }
 *
 *     IncomeExpenseReportResponse:
 *       type: object
 *       properties:
 *         startDate:
 *           type: string
 *           format: date
 *           description: The start date of the report period.
 *         endDate:
 *           type: string
 *           format: date
 *           description: The end date of the report period.
 *         totalIncome:
 *           type: number
 *           description: Total income during the period.
 *         totalExpenses:
 *           type: number
 *           description: Total expenses during the period (positive value).
 *         netIncome:
 *            type: number
 *            description: Net income (totalIncome - totalExpenses).
 *       required:
 *         - startDate
 *         - endDate
 *         - totalIncome
 *         - totalExpenses
 *         - netIncome
 *     NetWorthDataPoint:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           description: The month of the data point (YYYY-MM).
 *         assets:
 *           type: number
 *           description: Total value of asset accounts at month end.
 *         liabilities:
 *           type: number
 *           description: Total value of liability accounts at month end (positive number).
 *         netWorth:
 *           type: number
 *           description: Calculated net worth (assets - liabilities) at month end.
 *       required:
 *         - date
 *         - assets
 *         - liabilities
 *         - netWorth
 *     NetWorthReportResponse:
 *       type: object
 *       properties:
 *         startDate:
 *           type: string
 *           format: date
 *           description: The start date of the report period.
 *         endDate:
 *           type: string
 *           format: date
 *           description: The end date of the report period.
 *         dataPoints:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/NetWorthDataPoint'
 *       required:
 *         - startDate
 *         - endDate
 *         - dataPoints
 *     AgeOfMoneyResponse:
 *       type: object
 *       properties:
 *         ageOfMoney:
 *           type: number
 *           nullable: true
 *           description: The calculated Age of Money in days. Null if calculation is not possible (e.g., no outflows in lookback period).
 *       required:
 *         - ageOfMoney
 */

/**
 * @swagger
 * /reporting/spending:
 *   get:
 *     summary: Get a spending report grouped by category or payee
 *     tags: [Reporting]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { name: budgetId, in: query, required: true, schema: { type: string, format: uuid }, description: "ID of the budget" }
 *       - { name: startDate, in: query, required: true, schema: { type: string, format: date }, description: "Start date (YYYY-MM-DD)" }
 *       - { name: endDate, in: query, required: true, schema: { type: string, format: date }, description: "End date (YYYY-MM-DD)" }
 *       - { name: groupBy, in: query, required: true, schema: { type: string, enum: [category, payee] }, description: "Group results by 'category' or 'payee'" }
 *       - { name: accountIds, in: query, required: false, style: form, explode: true, schema: { type: array, items: { type: string, format: uuid } }, description: "Optional account IDs to filter" }
 *       - { name: categoryIds, in: query, required: false, style: form, explode: true, schema: { type: array, items: { type: string, format: uuid } }, description: "Optional category IDs to filter" }
 *     responses:
 *       200:
 *         description: Spending report data
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SpendingReportResponse' }
 *       400: { description: "Bad Request (e.g., invalid parameters)" }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: "Budget not found" }
 */
router.get('/spending', reportingController.getSpendingReport);

/**
 * @swagger
 * /reporting/income-expense:
 *   get:
 *     summary: Generate an income vs. expense report
 *     tags: [Reporting]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { name: budgetId, in: query, required: true, schema: { type: string, format: uuid }, description: "ID of the budget" }
 *       - { name: startDate, in: query, required: true, schema: { type: string, format: date }, description: "Start date (YYYY-MM-DD)" }
 *       - { name: endDate, in: query, required: true, schema: { type: string, format: date }, description: "End date (YYYY-MM-DD)" }
 *       - { name: accountIds, in: query, required: false, style: form, explode: true, schema: { type: array, items: { type: string, format: uuid } }, description: "Optional account IDs to filter" }
 *       - { name: categoryIds, in: query, required: false, style: form, explode: true, schema: { type: array, items: { type: string, format: uuid } }, description: "Optional category IDs to filter" }
 *     responses:
 *       200:
 *         description: Income vs. expense report data
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/IncomeExpenseReportResponse' }
 *       400: { description: "Bad Request (e.g., invalid parameters)" }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: "Budget not found" }
 */
router.get('/income-expense', reportingController.getIncomeExpenseReport);

/**
 * @openapi
 * /api/v1/reporting/net-worth:
 *   get:
 *     tags:
 *       - Reporting
 *     summary: Generate a net worth report
 *     description: Generates a report showing the net worth (Assets - Liabilities) calculated at the end of each month within the specified date range for a given budget.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: budgetId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the budget to report on.
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report period (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report period (YYYY-MM-DD).
 *     responses:
 *       '200':
 *         description: Successfully generated net worth report.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NetWorthReportResponse'
 *       '400':
 *         description: Bad request due to missing or invalid parameters.
 *       '404':
 *         description: Budget not found.
 *       '401':
 *         description: Unauthorized.
 */
router.get('/net-worth', reportingController.getNetWorthReport);

/**
 * @openapi
 * /api/v1/reporting/age-of-money:
 *   get:
 *     tags:
 *       - Reporting
 *     summary: Calculate the Age of Money (AoM)
 *     description: Calculates the approximate age (in days) of the money being spent, based on current cash balances and recent average daily spending (excluding transfers and credit card payments).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: budgetId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the budget to calculate AoM for.
 *     responses:
 *       '200':
 *         description: Successfully calculated Age of Money.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AgeOfMoneyResponse'
 *       '400':
 *         description: Bad request due to missing or invalid budgetId.
 *       '404':
 *         description: Budget not found.
 *       '401':
 *         description: Unauthorized.
 */
router.get('/age-of-money', reportingController.getAgeOfMoney);

// --- Add routes for other reports later --- 

export default router;

import { Router } from 'express';
import { GoalController } from '../controllers/goal.controller';
import { authMiddleware } from '../../middleware/authMiddleware';

// This router will be mounted under /budgets/:budgetId/groups/:groupId/categories/:categoryId
const router = Router({ mergeParams: true }); // Ensure params from parent router are merged
const goalController = new GoalController();

// Auth middleware is likely applied by the parent router (budget/category)
// router.use(authMiddleware); // Usually not needed here if parent applies it

/**
 * @swagger
 * tags:
 *   name: Goals
 *   description: Category goal management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     GoalType:
 *       type: string
 *       enum: [TARGET_BALANCE, TARGET_BALANCE_BY_DATE, MONTHLY_FUNDING]
 *     Goal:
 *       type: object
 *       required: [id, type, categoryId, createdAt, updatedAt]
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string, nullable: true }
 *         type: { $ref: '#/components/schemas/GoalType' }
 *         targetAmount: { type: number, format: double, nullable: true }
 *         targetDate: { type: string, format: date-time, nullable: true }
 *         monthlyFundingAmount: { type: number, format: double, nullable: true }
 *         categoryId: { type: string, format: uuid }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *       example:
 *         id: "goal_123..."
 *         name: "Vacation Fund"
 *         type: TARGET_BALANCE_BY_DATE
 *         targetAmount: 5000
 *         targetDate: "2025-06-01T00:00:00Z"
 *         monthlyFundingAmount: null
 *         categoryId: "cat_abc..."
 *         createdAt: "2024-01-10T..."
 *         updatedAt: "2024-02-15T..."
 *     GoalUpsert:
 *       type: object
 *       required: [type]
 *       properties:
 *         name: { type: string, nullable: true }
 *         type: { $ref: '#/components/schemas/GoalType' }
 *         targetAmount: { type: number, format: double, nullable: true, description: 'Required for TARGET_BALANCE types' }
 *         targetDate: { type: string, format: date, nullable: true, description: 'Required for TARGET_BALANCE_BY_DATE' }
 *         monthlyFundingAmount: { type: number, format: double, nullable: true, description: 'Required for MONTHLY_FUNDING' }
 *       example:
 *         name: "New Car Downpayment"
 *         type: TARGET_BALANCE_BY_DATE
 *         targetAmount: 10000
 *         targetDate: "2025-12-31"
 */

/**
 * @swagger
 * /budgets/{budgetId}/groups/{groupId}/categories/{categoryId}/goal:
 *   get:
 *     summary: Get the goal for a specific category
 *     tags: [Goals]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { name: budgetId, in: path, required: true, schema: { type: string, format: uuid } }
 *       - { name: groupId, in: path, required: true, schema: { type: string, format: uuid } }
 *       - { name: categoryId, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Goal data
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Goal' } } }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Budget, Group, Category, or Goal not found }
 */
router.get('/', goalController.getGoal);

/**
 * @swagger
 * /budgets/{budgetId}/groups/{groupId}/categories/{categoryId}/goal:
 *   put:
 *     summary: Create or update the goal for a specific category
 *     tags: [Goals]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { name: budgetId, in: path, required: true, schema: { type: string, format: uuid } }
 *       - { name: groupId, in: path, required: true, schema: { type: string, format: uuid } }
 *       - { name: categoryId, in: path, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/GoalUpsert' }
 *     responses:
 *       200:
 *         description: Goal created or updated successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Goal' } } }
 *       400: { description: Bad Request (validation error) }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Budget, Group, or Category not found }
 */
router.put('/', goalController.upsertGoal);

/**
 * @swagger
 * /budgets/{budgetId}/groups/{groupId}/categories/{categoryId}/goal:
 *   delete:
 *     summary: Delete the goal for a specific category
 *     tags: [Goals]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { name: budgetId, in: path, required: true, schema: { type: string, format: uuid } }
 *       - { name: groupId, in: path, required: true, schema: { type: string, format: uuid } }
 *       - { name: categoryId, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       204: { description: Goal deleted successfully }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Budget, Group, Category, or Goal not found }
 */
router.delete('/', goalController.deleteGoal);

export default router;

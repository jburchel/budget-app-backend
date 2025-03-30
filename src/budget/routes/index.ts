import { Router } from 'express';
import { BudgetController } from '../controllers/budget.controller';
import { CategoryGroupController } from '../controllers/categoryGroup.controller';
import { CategoryController } from '../controllers/category.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import goalRouter from '../../goal/routes';
import { validateRequest } from '../../middleware/validationMiddleware';
import { 
    createBudgetSchema, 
    updateBudgetSchema, 
    assignMoneySchema, 
    moveMoneySchema, 
    getBudgetViewSchema 
} from '../validation/budget.schema';

const router = Router();
const budgetController = new BudgetController();
const groupController = new CategoryGroupController();
const categoryController = new CategoryController();

// Protect all budget routes
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Budgets
 *   description: Budget management
 *   - name: Category Groups
 *     description: Management of category groups within a budget
 *   - name: Categories
 *     description: Management of categories within a category group
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Budget:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - userId
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the budget
 *         name:
 *           type: string
 *           description: Name of the budget
 *         description:
 *           type: string
 *           nullable: true
 *           description: Optional description for the budget
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID of the user who owns the budget
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the budget was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the budget was last updated
 *       example:
 *         id: "clqj3k3k40000v7z3g9h3d3k3"
 *         name: "Main Budget"
 *         description: "Primary household budget"
 *         userId: "clqj3k3k40000v7z3g9h3d3k4"
 *         createdAt: "2023-12-01T10:00:00Z"
 *         updatedAt: "2023-12-01T11:00:00Z"
 *     CategoryGroup:
 *       type: object
 *       required: [id, name, budgetId, createdAt, updatedAt]
 *       properties:
 *         id:
 *           type: string; format: uuid
 *         name:
 *           type: string
 *         sortOrder:
 *           type: integer; nullable: true
 *         budgetId:
 *           type: string; format: uuid
 *         createdAt:
 *           type: string; format: date-time
 *         updatedAt:
 *           type: string; format: date-time
 *       example:
 *         id: "clqj4k..."
 *         name: "Monthly Bills"
 *         sortOrder: 1
 *         budgetId: "clqj3k..."
 *         createdAt: "2023-12-01T10:00:00Z"
 *         updatedAt: "2023-12-01T11:00:00Z"
 *     Category:
 *       type: object
 *       required: [id, name, categoryGroupId, createdAt, updatedAt]
 *       properties:
 *         id:
 *           type: string; format: uuid
 *         name:
 *           type: string
 *         sortOrder:
 *           type: integer; nullable: true
 *         categoryGroupId:
 *           type: string; format: uuid
 *         createdAt:
 *           type: string; format: date-time
 *         updatedAt:
 *           type: string; format: date-time
 *         updatedAt: { type: string, format: date-time }
 *         goalId: { type: string, format: uuid, nullable: true, description: "ID of the associated goal, if any" }
 *         goalType: { $ref: '#/components/schemas/GoalType', nullable: true, description: "Type of the associated goal" }
 *         goalTargetAmount: { type: number, format: double, nullable: true, description: "Target amount for the goal" }
 *         goalTargetDate: { type: string, format: date, nullable: true, description: "Target date for the goal" }
 *         goalMonthlyFundingAmount: { type: number, format: double, nullable: true, description: "Monthly funding amount for the goal" }
 *         goalOverallProgress: { type: number, format: double, nullable: true, description: "Overall progress towards the goal (percentage, 0-100)" }
 *         goalTargetMonthProgress: { type: number, format: double, nullable: true, description: "Progress towards the monthly funding goal (percentage, 0-100)" }
 *         goalStatusMessage: { type: string, nullable: true, description: "A brief status message about the goal progress" }
 *       example:
 *         id: "clqj5k..."
 *         name: "Rent"
 *         sortOrder: 1
 *         categoryGroupId: "clqj4k..."
 *         createdAt: "2023-12-01T10:05:00Z"
 *         updatedAt: "2023-12-01T11:05:00Z"
 *         goalId: "goal_abc123"
 *         goalType: "TARGET_BALANCE_BY_DATE"
 *         goalTargetAmount: 5000
 *         goalTargetDate: "2025-06-30"
 *         goalMonthlyFundingAmount: null
 *         goalOverallProgress: 65.5
 *         goalTargetMonthProgress: null
 *         goalStatusMessage: "On track"
 *     BudgetViewCategoryData:
 *       type: object
 *       properties:
 *         categoryId: { type: string, format: uuid }
 *         categoryName: { type: string }
 *         categoryGroupId: { type: string, format: uuid }
 *         assigned: { type: number, format: double, description: "Amount assigned this month" }
 *         activity: { type: number, format: double, description: "Total activity (spending/inflow) this month" }
 *         available: { type: number, format: double, description: "Amount available in the category" }
 *         isOverspent: { type: boolean, description: "True if the available amount is negative" }
 *         goalId: { type: string, format: uuid, nullable: true }
 *         goalType: { $ref: '#/components/schemas/GoalType', nullable: true }
 *         goalTargetAmount: { type: number, format: double, nullable: true }
 *         goalTargetDate: { type: string, format: date, nullable: true }
 *         goalMonthlyFundingAmount: { type: number, format: double, nullable: true }
 *         goalOverallProgress: { type: number, format: double, nullable: true }
 *         goalTargetMonthProgress: { type: number, format: double, nullable: true }
 *         goalStatusMessage: { type: string, nullable: true }
 *       example:
 *         categoryId: "cat_123"
 *         categoryName: "Vacation Fund"
 *         categoryGroupId: "group_abc"
 *         assigned: 200
 *         activity: -50
 *         available: 1500
 *         isOverspent: false
 *         goalId: "goal_xyz"
 *         goalType: "TARGET_BALANCE"
 *         goalTargetAmount: 3000
 *         goalOverallProgress: 50
 *         goalStatusMessage: "Halfway there!"
 *     BudgetViewCategoryGroupData:
 *       type: object
 *       properties:
 *         groupId: { type: string, format: uuid }
 *         groupName: { type: string }
 *         categories: { type: array, items: { $ref: '#/components/schemas/BudgetViewCategoryData' } }
 *     BudgetViewResponse:
 *       type: object
 *       properties:
 *         month: { type: integer }
 *         year: { type: integer }
 *         toBeBudgeted: { type: number, format: double }
 *         totalIncome: { type: number, format: double }
 *         totalAssigned: { type: number, format: double }
 *         totalActivity: { type: number, format: double }
 *         totalAvailable: { type: number, format: double }
 *         categoryGroups: { type: array, items: { $ref: '#/components/schemas/BudgetViewCategoryGroupData' } }
 */

/**
 * @swagger
 * /api/v1/budgets:
 *   get:
 *     summary: Get all budgets for the logged-in user
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of budgets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Budget'
 *       401:
 *         description: Unauthorized
 */
router.get('/', budgetController.getAllBudgets);

/**
 * @swagger
 * /api/v1/budgets:
 *   post:
 *     summary: Create a new budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name for the new budget
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 description: Optional description
 *                 maxLength: 255
 *             example:
 *               name: "Vacation Fund"
 *               description: "Saving for trip to Hawaii"
 *     responses:
 *       201:
 *         description: Budget created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Budget'
 *       400:
 *         description: Validation failed or Bad Request
 *       401:
 *         description: Unauthorized
 */
router.post(
    '/', 
    validateRequest(createBudgetSchema),
    budgetController.createBudget
);

/**
 * @swagger
 * /api/v1/budgets/{budgetId}:
 *   get:
 *     summary: Get a specific budget by ID
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the budget to retrieve
 *     responses:
 *       200:
 *         description: Budget data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Budget'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (User does not own this budget)
 *       404:
 *         description: Budget not found
 */
router.get('/:budgetId', budgetController.getBudgetById);

/**
 * @swagger
 * /api/v1/budgets/{budgetId}:
 *   put:
 *     summary: Update a specific budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the budget to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 255
 *             example:
 *               name: "Main Household Budget"
 *               description: "Updated description"
 *     responses:
 *       200:
 *         description: Budget updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Budget'
 *       400:
 *         description: Validation failed or Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Budget not found
 */
router.put('/:budgetId', 
    validateRequest(updateBudgetSchema.shape.params, 'params'),
    validateRequest(updateBudgetSchema.shape.body, 'body'),
    budgetController.updateBudget
);

/**
 * @swagger
 * /api/v1/budgets/{budgetId}:
 *   delete:
 *     summary: Delete a specific budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the budget to delete
 *     responses:
 *       204:
 *         description: Budget deleted successfully (No Content)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Budget not found
 */
router.delete('/:budgetId', 
    validateRequest(updateBudgetSchema.shape.params, 'params'),
    budgetController.deleteBudget
);

// --- Category Group Routes (Nested under Budgets) --- //
/**
 * @swagger
 * /budgets/{budgetId}/groups:
 *   get:
 *     summary: Get all category groups for a budget
 *     tags: [Category Groups]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of category groups
 *         content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/CategoryGroup' } } } }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Budget not found }
 */
router.get('/:budgetId/groups', groupController.getAllGroups);

/**
 * @swagger
 * /budgets/{budgetId}/groups:
 *   post:
 *     summary: Create a new category group in a budget
 *     tags: [Category Groups]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               sortOrder: { type: integer }
 *             example:
 *               name: "Irregular Expenses"
 *               sortOrder: 5
 *     responses:
 *       201:
 *         description: Category group created
 *         content: { application/json: { schema: { $ref: '#/components/schemas/CategoryGroup' } } }
 *       400: { description: Bad Request }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Budget not found }
 */
router.post('/:budgetId/groups', groupController.createGroup);

/**
 * @swagger
 * /budgets/{budgetId}/groups/{groupId}:
 *   get:
 *     summary: Get a specific category group
 *     tags: [Category Groups]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Category group data
 *         content: { application/json: { schema: { $ref: '#/components/schemas/CategoryGroup' } } }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Budget or Group not found }
 */
router.get('/:budgetId/groups/:groupId', groupController.getGroupById);

/**
 * @swagger
 * /budgets/{budgetId}/groups/{groupId}:
 *   put:
 *     summary: Update a specific category group
 *     tags: [Category Groups]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               sortOrder: { type: integer }
 *             example:
 *               name: "Updated Group Name"
 *     responses:
 *       200:
 */
router.put('/:budgetId/groups/:groupId', groupController.updateGroup);

/**
 * @swagger
 * /budgets/{budgetId}/groups/{groupId}/categories:
 *   get:
 *     summary: Get all categories for a specific category group
 *     tags: [Categories]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of categories
 *         content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Category' } } } }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Budget, Group, or Category not found }
 */
router.get('/:budgetId/groups/:groupId/categories', categoryController.getAllCategories);

/**
 * @swagger
 * /budgets/{budgetId}/groups/{groupId}/categories:
 *   post:
 *     summary: Create a new category in a specific category group
 *     tags: [Categories]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               sortOrder: { type: integer }
 *             example:
 *               name: "New Category"
 *               sortOrder: 1
 *     responses:
 *       201:
 *         description: Category created
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Category' } } }
 *       400: { description: Bad Request }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Budget, Group, or Category not found }
 */
router.post('/:budgetId/groups/:groupId/categories', categoryController.createCategory);

/**
 * @swagger
 * /budgets/{budgetId}/groups/{groupId}/categories/{categoryId}:
 *   get:
 *     summary: Get a specific category
 *     tags: [Categories]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Category data
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Category' } } }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Budget, Group, or Category not found }
 */
router.get('/:budgetId/groups/:groupId/categories/:categoryId', categoryController.getCategoryById);

/**
 * @swagger
 * /budgets/{budgetId}/groups/{groupId}/categories/{categoryId}:
 *   put:
 *     summary: Update a specific category
 *     tags: [Categories]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               sortOrder: { type: integer }
 *             example:
 *               name: "Updated Category Name"
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Category' } } }
 *       400: { description: Bad Request }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Budget, Group, or Category not found }
 */
router.put('/:budgetId/groups/:groupId/categories/:categoryId', categoryController.updateCategory);

/**
 * @swagger
 * /budgets/{budgetId}/groups/{groupId}/categories/{categoryId}:
 *   delete:
 *     summary: Delete a specific category
 *     tags: [Categories]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Category deleted successfully (No Content)
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Budget, Group, or Category not found }
 */
router.delete('/:budgetId/groups/:groupId/categories/:categoryId', categoryController.deleteCategory);

// Mount the goal router under the category path
router.use('/:budgetId/groups/:groupId/categories/:categoryId/goal', goalRouter);

// --- Budget Action Routes --- //
/**
 * @swagger
 * /budgets/{budgetId}/assign:
 *   post:
 *     summary: Assign money to a specific category for a given month/year
 *     tags: [Budget Actions]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, year, month, assignAmount]
 *             properties:
 *               categoryId: { type: string, format: uuid }
 *               year: { type: integer }
 *               month: { type: integer, minimum: 1, maximum: 12 }
 *               assignAmount: { type: number, format: double, minimum: 0 }
 *             example:
 *               categoryId: "clqj5k..."
 *               year: 2024
 *               month: 4
 *               assignAmount: 500.50
 *     responses:
 *       200:
 *         description: Money assigned successfully
 *         content: { application/json: { schema: { type: object, properties: { message: { type: string } } } } }
 *       400: { description: Bad Request (e.g., invalid input, negative amount) }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Budget or Category not found }
 */
router.post('/:budgetId/assign', 
    validateRequest(assignMoneySchema.shape.params, 'params'),
    validateRequest(assignMoneySchema.shape.body, 'body'),
    budgetController.assignMoney
);

/**
 * @swagger
 * /budgets/{budgetId}/move:
 *   post:
 *     summary: Move money between two categories within the same month/year
 *     tags: [Budget Actions]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromCategoryId, toCategoryId, year, month, moveAmount]
 *             properties:
 *               fromCategoryId: { type: string, format: uuid }
 *               toCategoryId: { type: string, format: uuid }
 *               year: { type: integer }
 *               month: { type: integer, minimum: 1, maximum: 12 }
 *               moveAmount: { type: number, format: double, exclusiveMinimum: 0 }
 *             example:
 *               fromCategoryId: "clqj5k..."
 *               toCategoryId: "clqj6k..."
 *               year: 2024
 *               month: 4
 *               moveAmount: 50.00
 *     responses:
 *       200:
 *         description: Money moved successfully
 *         content: { application/json: { schema: { type: object, properties: { message: { type: string } } } } }
 *       400: { description: Bad Request (e.g., invalid input, insufficient funds in source) }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Budget, From Category, or To Category not found }
 */
router.post('/:budgetId/move', budgetController.moveMoney);

// --- Budget View Route --- //
/**
 * @swagger
 * /budgets/{budgetId}/view:
 *   get:
 *     summary: Get the detailed budget view for a specific month
 *     tags: [Budgets]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: string, pattern: '^\\d{4}-\\d{2}$' }
 *         description: The month to view in YYYY-MM format
 *         example: "2024-04"
 *     responses:
 *       200:
 *         description: Detailed budget view data for the month
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BudgetViewResponse'
 *       400: { description: "Bad Request (e.g., invalid month format)" }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: "Budget not found" }
 */
router.get('/:budgetId/view', 
    validateRequest(getBudgetViewSchema.shape.params, 'params'),
    validateRequest(getBudgetViewSchema.shape.query, 'query'),
    budgetController.getBudgetView
);

export default router;
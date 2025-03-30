import prisma from '../../config/prisma';
// Explicitly import all used model types and enums
import {
    Prisma, PrismaClient,
    Category, CategoryGroup, BudgetEntry, Transaction, SplitTransaction, Goal, GoalType
} from '@prisma/client';
import { CreateBudgetDto, UpdateBudgetDto, BudgetResponse, AssignMoneyDto, MoveMoneyDto } from '../interfaces/budget.interface';
import { HttpException } from '../../middleware/errorHandler';

// Remove the problematic type definition
// type TransactionWithSplitsPayload = Prisma.TransactionGetPayload<{ include: { splits: true } }>;

// Interface for the detailed budget view data for a single category
interface BudgetViewCategoryData {
    categoryId: string;
    categoryName: string;
    categoryGroupId: string;
    assigned: Prisma.Decimal;
    activity: Prisma.Decimal;
    available: Prisma.Decimal;
    isOverspent: boolean; // Flag for negative available balance
    // Goal-related fields (optional)
    goalId?: string | null;
    goalType?: GoalType | null; // Use the direct import
    goalTargetAmount?: Prisma.Decimal | null;
    goalTargetDate?: Date | null;
    goalMonthlyFundingAmount?: Prisma.Decimal | null;
    goalOverallProgress?: number | null; // e.g., percentage 0-100
    goalTargetMonthProgress?: number | null; // e.g., percentage for monthly funding
    goalStatusMessage?: string | null; // e.g., "On track", "Needs $X more", etc.
}

// Interface for the detailed budget view data for a category group
interface BudgetViewCategoryGroupData {
    groupId: string;
    groupName: string;
    categories: BudgetViewCategoryData[];
}

// Interface for the overall budget view response
export interface BudgetViewResponse {
    month: number;
    year: number;
    toBeBudgeted: Prisma.Decimal;
    totalIncome: Prisma.Decimal; // For reference
    totalAssigned: Prisma.Decimal; // For reference
    totalActivity: Prisma.Decimal; // For reference
    totalAvailable: Prisma.Decimal; // For reference
    categoryGroups: BudgetViewCategoryGroupData[];
}

export class BudgetService {
  /**
   * Get all budgets for a specific user.
   */
  async getAllBudgetsForUser(userId: string): Promise<BudgetResponse[]> {
    return prisma.budget.findMany({
      where: { userId },
      // Add ordering if desired, e.g., orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Get a single budget by ID, ensuring it belongs to the user.
   */
  async getBudgetById(userId: string, budgetId: string): Promise<BudgetResponse> {
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) {
      throw new HttpException(404, 'Budget not found');
    }

    if (budget.userId !== userId) {
      // Prevent users from accessing budgets they don't own
      throw new HttpException(403, 'Forbidden: You do not own this budget');
    }

    return budget;
  }

  /**
   * Create a new budget for a user.
   */
  async createBudget(userId: string, createBudgetDto: CreateBudgetDto): Promise<BudgetResponse> {
    const { name, description } = createBudgetDto;

    return prisma.budget.create({
      data: {
        name,
        description,
        userId, // Link the budget to the user
      },
    });
  }

  /**
   * Update an existing budget.
   */
  async updateBudget(
    userId: string,
    budgetId: string,
    updateBudgetDto: UpdateBudgetDto
  ): Promise<BudgetResponse> {
    const { name, description } = updateBudgetDto;

    // First, verify the budget exists and belongs to the user
    const existingBudget = await this.getBudgetById(userId, budgetId);

    // Ensure at least one field is being updated
    if (!name && !description) {
      throw new HttpException(400, 'No update data provided');
    }

    return prisma.budget.update({
      where: { id: budgetId }, // No need to check userId again due to getBudgetById check
      data: {
        name: name ?? existingBudget.name,
        description: description ?? existingBudget.description,
      },
    });
  }

  /**
   * Delete a budget.
   * Note: Deleting budgets might have cascading consequences later (transactions, etc.)
   * For now, a simple delete.
   */
  async deleteBudget(userId: string, budgetId: string): Promise<void> {
    // Verify ownership before deleting
    await this.getBudgetById(userId, budgetId);

    await prisma.budget.delete({
      where: { id: budgetId },
    });
  }

  /**
   * Get or create a BudgetEntry for a specific category and month/year.
   */
  private async getOrCreateBudgetEntry(
    tx: Prisma.TransactionClient,
    budgetId: string, // Added budgetId for verification
    categoryId: string,
    year: number,
    month: number
  ): Promise<{ id: string; assignedAmount: Prisma.Decimal }> {
    // Verify category belongs to the budget
    const category = await tx.category.findUnique({
      where: { id: categoryId },
      select: { categoryGroupId: true, categoryGroup: { select: { budgetId: true } } },
    });

    // Ensure category exists and belongs to the correct budget
    if (!category || category.categoryGroup.budgetId !== budgetId) {
      throw new HttpException(404, `Category ${categoryId} not found in budget ${budgetId}`);
    }

    const existingEntry = await tx.budgetEntry.findUnique({
      where: {
        categoryId_year_month: { categoryId, year, month },
      },
      select: { id: true, assignedAmount: true },
    });

    if (existingEntry) {
      return existingEntry;
    }

    // Create if not exists
    return tx.budgetEntry.create({
      data: {
        categoryId,
        year,
        month,
        assignedAmount: 0,
      },
      select: { id: true, assignedAmount: true },
    });
  }

  /**
   * Assigns a specific amount to a category for a given month/year.
   * Uses upsert logic: creates or updates the BudgetEntry.
   */
  async assignMoney(
    userId: string,
    budgetId: string,
    assignDto: AssignMoneyDto
  ): Promise<void> {
    const { categoryId, year, month, assignAmount } = assignDto;
    const decimalAssignAmount = new Prisma.Decimal(assignAmount);

    if (decimalAssignAmount.isNegative()) {
      throw new HttpException(400, 'Assign amount cannot be negative');
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { categoryGroup: true },
    });

    if (!category || category.categoryGroup.budgetId !== budgetId) {
      throw new HttpException(404, `Category ${categoryId} not found in budget ${budgetId}`);
    }
    await this.getBudgetById(userId, budgetId);

    await prisma.budgetEntry.upsert({
      where: {
        categoryId_year_month: { categoryId, year, month },
      },
      update: {
        assignedAmount: decimalAssignAmount,
      },
      create: {
        categoryId,
        year,
        month,
        assignedAmount: decimalAssignAmount,
      },
    });
  }

  /**
   * Moves a specific amount between two categories within the same month/year.
   */
  async moveMoney(
    userId: string,
    budgetId: string,
    moveDto: MoveMoneyDto
  ): Promise<void> {
    const { fromCategoryId, toCategoryId, year, month, moveAmount } = moveDto;
    const decimalMoveAmount = new Prisma.Decimal(moveAmount);

    if (fromCategoryId === toCategoryId) {
      throw new HttpException(400, 'Cannot move money to the same category');
    }
    if (decimalMoveAmount.isNegative() || decimalMoveAmount.isZero()) {
      throw new HttpException(400, 'Move amount must be positive');
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
       await this.getBudgetById(userId, budgetId);

      // Use updated getOrCreateBudgetEntry signature
      const fromEntry = await this.getOrCreateBudgetEntry(tx, budgetId, fromCategoryId, year, month);
      const toEntry = await this.getOrCreateBudgetEntry(tx, budgetId, toCategoryId, year, month);

      const fromAssigned = new Prisma.Decimal(fromEntry.assignedAmount);
      if (fromAssigned.lessThan(decimalMoveAmount)) {
        throw new HttpException(400, `Insufficient assigned amount in source category (${fromCategoryId})`);
      }

      await tx.budgetEntry.update({
        where: { id: fromEntry.id },
        data: { assignedAmount: { decrement: decimalMoveAmount } },
      });

      await tx.budgetEntry.update({
        where: { id: toEntry.id },
        data: { assignedAmount: { increment: decimalMoveAmount } },
      });
    });
  }

  /**
   * Calculates the detailed budget view for a specific month.
   */
  async getBudgetView(
    userId: string,
    budgetId: string,
    year: number,
    month: number
  ): Promise<BudgetViewResponse> {
    await this.getBudgetById(userId, budgetId); // Verify ownership

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // End of the month

    // 1. Fetch all relevant data in parallel
    const [fetchedCategoryGroups, fetchedBudgetEntries, fetchedTransactions] = await Promise.all([
      prisma.categoryGroup.findMany({
        where: { budgetId },
        include: {
           categories: {
                include: {
                    goal: true
                },
                orderBy: { sortOrder: 'asc' }
            }
        },
        orderBy: { sortOrder: 'asc' }
      }),
      prisma.budgetEntry.findMany({
        where: {
          category: { categoryGroup: { budgetId: budgetId } },
          year: year,
          month: month,
        },
        select: { categoryId: true, assignedAmount: true },
      }),
      prisma.transaction.findMany({
        where: {
          budgetId: budgetId,
          date: { gte: startDate, lte: endDate },
          isTransfer: false,
        },
        include: {
          splits: true,
        }
      } as any),
    ]);

    const categoryGroups = fetchedCategoryGroups;
    const budgetEntriesCurrentMonth = fetchedBudgetEntries;
    const transactionsCurrentMonth = fetchedTransactions as any[];

    // 2. Calculate Total Income for the month
    const incomeTransactions = transactionsCurrentMonth.filter(t => !t.isSplit && !t.categoryId && t.amount.greaterThan(0));
    const totalIncome = incomeTransactions.reduce((sum, t) => sum.add(t.amount), new Prisma.Decimal(0));

    // 3. Process data for each category
    const budgetEntryMap = new Map(budgetEntriesCurrentMonth.map(e => [e.categoryId, e.assignedAmount]));
    let totalAssigned = new Prisma.Decimal(0);
    let totalActivity = new Prisma.Decimal(0);
    let totalAvailable = new Prisma.Decimal(0);

    const categoryDataPromises = categoryGroups.flatMap(group =>
      group.categories.map(async (category): Promise<BudgetViewCategoryData> => {
        const assigned = budgetEntryMap.get(category.id) ?? new Prisma.Decimal(0);
        totalAssigned = totalAssigned.add(assigned);

        // Calculate activity for this category
        let activity = new Prisma.Decimal(0);
        transactionsCurrentMonth.forEach(t => {
          if (t.isSplit) {
            (t as any).splits.forEach((split: any) => {
              if (split.categoryId === category.id) {
                activity = activity.add(split.amount);
              }
            });
          } else if (t.categoryId === category.id) {
            activity = activity.add(t.amount);
          }
        });
        totalActivity = totalActivity.add(activity);

        // Calculate available amount (simplified)
        const available = assigned.add(activity);
        const isOverspent = available.isNegative(); // Check if available is negative

        // --- Goal Calculation (Placeholder) --- >
        let goalOverallProgress: number | null = null;
        let goalTargetMonthProgress: number | null = null;
        let goalStatusMessage: string | null = null;

        if (category.goal) {
          const goal = category.goal;
          if (goal.targetAmount && goal.targetAmount.greaterThan(0)) {
            goalOverallProgress = available.dividedBy(goal.targetAmount).times(100).toNumber();
            goalOverallProgress = Math.max(0, Math.min(100, goalOverallProgress));
          }
          if (goal.monthlyFundingAmount && goal.monthlyFundingAmount.greaterThan(0)) {
             goalTargetMonthProgress = assigned.dividedBy(goal.monthlyFundingAmount).times(100).toNumber();
             goalTargetMonthProgress = Math.max(0, Math.min(100, goalTargetMonthProgress));
          }
          goalStatusMessage = "Goal progress calculated (simple)";
        }
        // < --- End Goal Calculation ---

        return {
          categoryId: category.id,
          categoryName: category.name,
          categoryGroupId: group.id,
          assigned,
          activity,
          available,
          isOverspent,
          goalId: category.goal?.id,
          goalType: category.goal?.type,
          goalTargetAmount: category.goal?.targetAmount,
          goalTargetDate: category.goal?.targetDate,
          goalMonthlyFundingAmount: category.goal?.monthlyFundingAmount,
          goalOverallProgress,
          goalTargetMonthProgress,
          goalStatusMessage,
        };
      })
    );

    const categoriesData: BudgetViewCategoryData[] = await Promise.all(categoryDataPromises);
    const categoryDataMap = new Map(categoriesData.map(c => [c.categoryId, c]));

    // 4. Structure the response
    const responseCategoryGroups: BudgetViewCategoryGroupData[] = categoryGroups.map(group => ({
      groupId: group.id,
      groupName: group.name,
      categories: group.categories
        .map(cat => categoryDataMap.get(cat.id)!)
        .filter(Boolean)
        .sort((a, b) => a.categoryName.localeCompare(b.categoryName))
    }));

    // 5. Calculate final TBB
    const toBeBudgeted = totalIncome.minus(totalAssigned);

    // Recalculate Total Available based on category data (still simplified)
    totalAvailable = categoriesData.reduce((sum, cat) => sum.add(cat.available), new Prisma.Decimal(0));

    return {
      month,
      year,
      toBeBudgeted,
      totalIncome,
      totalAssigned,
      totalActivity,
      totalAvailable,
      categoryGroups: responseCategoryGroups,
    };
  }

  /**
   * Adjusts budget entry amounts to reflect budgeted credit card spending.
   * Moves the available budgeted amount FROM the spending category TO the payment category.
   * Decrements the spending category by the full amount (allows negative).
   * Assumes amount is positive.
   */
  async adjustBudgetsForCreditSpending(
    tx: Prisma.TransactionClient,
    budgetId: string,
    spendingCategoryId: string,
    paymentCategoryId: string,
    amount: Prisma.Decimal, // Should be the positive amount spent
    year: number,
    month: number
  ): Promise<void> {
    if (amount.isNegative() || amount.isZero()) {
      console.warn('adjustBudgetsForCreditSpending called with non-positive amount:', amount);
      return;
    }
    if (spendingCategoryId === paymentCategoryId) {
      console.warn('Spending and payment category are the same in adjustBudgetsForCreditSpending');
      return;
    }

    // Get or create entries for both categories
    const spendingEntry = await this.getOrCreateBudgetEntry(tx, budgetId, spendingCategoryId, year, month);
    const paymentEntry = await this.getOrCreateBudgetEntry(tx, budgetId, paymentCategoryId, year, month);

    // Determine how much is available to cover the spending (using assigned as proxy for now)
    // Ensure we don't move negative amounts if assigned is already negative
    const availableToMove = Prisma.Decimal.max(0, spendingEntry.assignedAmount);
    const amountToMove = Prisma.Decimal.min(amount, availableToMove);

    // Decrement spending category by the full spending amount
    await tx.budgetEntry.update({
      where: { id: spendingEntry.id },
      data: { assignedAmount: { decrement: amount } }, 
    });

    // Increment payment category only by the amount that was covered
    if (amountToMove.greaterThan(0)) {
        await tx.budgetEntry.update({
          where: { id: paymentEntry.id },
          data: { assignedAmount: { increment: amountToMove } },
        });
    }
  }

  /**
   * Reverts the budget adjustments made for budgeted credit card spending.
   * TODO: Needs refinement to handle cases where only partial amount was moved due to overspending.
   * Currently reverts the full original amount, assuming payment category can cover it.
   */
  async revertBudgetAdjustmentForCreditSpending(
    tx: Prisma.TransactionClient,
    budgetId: string,
    spendingCategoryId: string,
    paymentCategoryId: string,
    amount: Prisma.Decimal, // Should be the positive amount spent originally
    year: number,
    month: number
  ): Promise<void> {
     if (amount.isNegative() || amount.isZero()) {
       console.warn('revertBudgetAdjustmentForCreditSpending called with non-positive amount:', amount);
       return;
     }
     if (spendingCategoryId === paymentCategoryId) {
       console.warn('Spending and payment category are the same in revertBudgetAdjustmentForCreditSpending');
       return;
     }
    
    // Get or create entries for both categories
    const spendingEntry = await this.getOrCreateBudgetEntry(tx, budgetId, spendingCategoryId, year, month);
    const paymentEntry = await this.getOrCreateBudgetEntry(tx, budgetId, paymentCategoryId, year, month);
    
    // *** Simplification: Revert the original spending amount ***
    // This assumes the payment category has enough, which might not be true if only a partial amount was moved initially.
    // A more robust solution would need to know how much was actually moved.
    const amountToRevert = amount; // Use original spending amount for now

    // Move the money back: Increment spending category, Decrement payment category
    await tx.budgetEntry.update({
      where: { id: spendingEntry.id },
      data: { assignedAmount: { increment: amountToRevert } }, 
    });

    // Decrement payment category 
    await tx.budgetEntry.update({
      where: { id: paymentEntry.id },
      data: { assignedAmount: { decrement: amountToRevert } },
    });
  }

  /**
   * Adjusts budget entry amount for a credit card payment category.
   * Decreases the assigned amount to reflect money leaving the budget to pay the card.
   * Assumes amount is positive.
   */
  async handleCreditCardPayment(
    tx: Prisma.TransactionClient,
    budgetId: string,
    paymentCategoryId: string,
    amount: Prisma.Decimal, // Positive amount of the payment transfer
    year: number,
    month: number
  ): Promise<void> {
    if (amount.isNegative() || amount.isZero()) {
      console.warn('handleCreditCardPayment called with non-positive amount:', amount);
      return;
    }

    // Get or create entry for the payment category
    const paymentEntry = await this.getOrCreateBudgetEntry(tx, budgetId, paymentCategoryId, year, month);

    // Decrease the assigned amount in the payment category
    await tx.budgetEntry.update({
      where: { id: paymentEntry.id },
      data: { assignedAmount: { decrement: amount } },
    });
  }

  /**
   * Reverts the budget adjustment made for a credit card payment.
   * Increases the assigned amount in the payment category.
   * Assumes amount is positive.
   */
  async revertCreditCardPayment(
    tx: Prisma.TransactionClient,
    budgetId: string,
    paymentCategoryId: string,
    amount: Prisma.Decimal, // Positive amount of the original payment transfer
    year: number,
    month: number
  ): Promise<void> {
     if (amount.isNegative() || amount.isZero()) {
      console.warn('revertCreditCardPayment called with non-positive amount:', amount);
      return;
    }
    
    // Get or create entry for the payment category
    const paymentEntry = await this.getOrCreateBudgetEntry(tx, budgetId, paymentCategoryId, year, month);

    // Increase the assigned amount back
    await tx.budgetEntry.update({
      where: { id: paymentEntry.id },
      data: { assignedAmount: { increment: amount } },
    });
  }

  /**
   * Handles a credit card refund/return that is assigned back to a specific category.
   * Increases the spending category's assigned amount.
   * Decreases the payment category's assigned amount.
   * Assumes amount is positive refund amount.
   */
  async handleCreditCardRefundToCategory(
    tx: Prisma.TransactionClient,
    budgetId: string,
    spendingCategoryId: string,
    paymentCategoryId: string,
    amount: Prisma.Decimal, // Positive refund amount
    year: number,
    month: number
  ): Promise<void> {
    if (amount.isNegative() || amount.isZero()) {
      console.warn('handleCreditCardRefundToCategory called with non-positive amount:', amount);
      return;
    }
    if (spendingCategoryId === paymentCategoryId) {
        console.warn('Spending and payment category are the same in handleCreditCardRefundToCategory');
        return;
    }

    const spendingEntry = await this.getOrCreateBudgetEntry(tx, budgetId, spendingCategoryId, year, month);
    const paymentEntry = await this.getOrCreateBudgetEntry(tx, budgetId, paymentCategoryId, year, month);

    // Add amount back to spending category
    await tx.budgetEntry.update({
      where: { id: spendingEntry.id },
      data: { assignedAmount: { increment: amount } },
    });

    // Remove amount from payment category (as it's no longer needed for payment)
    await tx.budgetEntry.update({
      where: { id: paymentEntry.id },
      data: { assignedAmount: { decrement: amount } },
    });
  }

  /**
   * Reverts the effect of a categorized credit card refund.
   */
  async revertCreditCardRefundToCategory(
    tx: Prisma.TransactionClient,
    budgetId: string,
    spendingCategoryId: string,
    paymentCategoryId: string,
    amount: Prisma.Decimal, // Positive original refund amount
    year: number,
    month: number
  ): Promise<void> {
     if (amount.isNegative() || amount.isZero()) { return; }
     if (spendingCategoryId === paymentCategoryId) { return; }

    const spendingEntry = await this.getOrCreateBudgetEntry(tx, budgetId, spendingCategoryId, year, month);
    const paymentEntry = await this.getOrCreateBudgetEntry(tx, budgetId, paymentCategoryId, year, month);

    // Reverse the changes
    await tx.budgetEntry.update({ where: { id: spendingEntry.id }, data: { assignedAmount: { decrement: amount } } });
    await tx.budgetEntry.update({ where: { id: paymentEntry.id }, data: { assignedAmount: { increment: amount } } });
  }

    /**
   * Handles a credit card refund/return that goes to To Be Budgeted (TBB).
   * Only decreases the payment category's assigned amount.
   * TBB is implicitly affected by having less assigned out.
   * Assumes amount is positive refund amount.
   */
  async handleCreditCardRefundToTBB(
    tx: Prisma.TransactionClient,
    budgetId: string,
    paymentCategoryId: string,
    amount: Prisma.Decimal, // Positive refund amount
    year: number,
    month: number
  ): Promise<void> {
    if (amount.isNegative() || amount.isZero()) {
      console.warn('handleCreditCardRefundToTBB called with non-positive amount:', amount);
      return;
    }

    const paymentEntry = await this.getOrCreateBudgetEntry(tx, budgetId, paymentCategoryId, year, month);

    // Remove amount from payment category
    await tx.budgetEntry.update({
      where: { id: paymentEntry.id },
      data: { assignedAmount: { decrement: amount } },
    });
  }

  /**
   * Reverts the effect of a TBB credit card refund.
   */
  async revertCreditCardRefundToTBB(
    tx: Prisma.TransactionClient,
    budgetId: string,
    paymentCategoryId: string,
    amount: Prisma.Decimal, // Positive original refund amount
    year: number,
    month: number
  ): Promise<void> {
     if (amount.isNegative() || amount.isZero()) { return; }

    const paymentEntry = await this.getOrCreateBudgetEntry(tx, budgetId, paymentCategoryId, year, month);

    // Add amount back to payment category
    await tx.budgetEntry.update({ where: { id: paymentEntry.id }, data: { assignedAmount: { increment: amount } } });
  }
}

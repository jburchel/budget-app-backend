import prisma from '../../config/prisma';
import { Payee, Prisma } from '@prisma/client'; // Explicit imports
import { UpdatePayeeDto, PayeeResponse } from '../interfaces/payee.interface';
import { HttpException } from '../../middleware/errorHandler';
import { BudgetService } from '../../budget/services/budget.service';

export class PayeeService {
  private budgetService = new BudgetService();

  /**
   * Get all payees for a specific budget.
   */
  async getAllPayees(userId: string, budgetId: string): Promise<PayeeResponse[]> {
    await this.budgetService.getBudgetById(userId, budgetId); // Verify ownership

    return prisma.payee.findMany({
      where: { budgetId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a single payee by ID, ensuring it belongs to the user's budget.
   */
  async getPayeeById(userId: string, payeeId: string): Promise<PayeeResponse> {
    const payee = await prisma.payee.findUnique({
      where: { id: payeeId },
      include: { budget: true }, // Need budget to verify userId
    });

    if (!payee) {
      throw new HttpException(404, 'Payee not found');
    }
    if (payee.budget.userId !== userId) {
      throw new HttpException(403, 'Forbidden: Payee does not belong to user\'s budget');
    }

    // Omit budget object from response if needed
    const { budget, ...rest } = payee;
    return rest;
  }

  /**
   * Find or create a payee by name within a budget.
   * Used internally by TransactionService.
   */
  async findOrCreatePayeeByName(
    tx: Prisma.TransactionClient, // Use transaction client
    budgetId: string,
    payeeName: string
  ): Promise<Payee> {
    if (!payeeName?.trim()) {
        throw new HttpException(400, 'Payee name cannot be empty');
    }

    const normalizedName = payeeName.trim(); // Basic normalization

    const existingPayee = await tx.payee.findUnique({
      where: {
        budgetId_name: { budgetId, name: normalizedName },
      },
    });

    if (existingPayee) {
      return existingPayee;
    }

    return tx.payee.create({
      data: {
        name: normalizedName,
        budgetId,
      },
    });
  }

  /**
   * Update a payee's name.
   */
  async updatePayee(
    userId: string,
    payeeId: string,
    updateDto: UpdatePayeeDto
  ): Promise<PayeeResponse> {
    const { name } = updateDto;
    if (!name?.trim()) {
      throw new HttpException(400, 'Payee name cannot be empty');
    }
    const normalizedName = name.trim();

    // Verify ownership and get budgetId
    const existingPayee = await this.getPayeeById(userId, payeeId);

    // Check if the new name already exists in the same budget
    const conflictingPayee = await prisma.payee.findUnique({
        where: {
            budgetId_name: { budgetId: existingPayee.budgetId, name: normalizedName }
        }
    });
    if (conflictingPayee && conflictingPayee.id !== payeeId) {
        throw new HttpException(409, `Payee name \"${normalizedName}\" already exists in this budget.`);
    }

    const updatedPayee = await prisma.payee.update({
      where: { id: payeeId },
      data: { name: normalizedName },
    });

    return updatedPayee;
  }

  // Deleting payees might be complex (reassign transactions?)
  // Omitting delete for now unless explicitly required.
}

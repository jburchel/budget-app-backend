import prisma from '../../config/prisma';
// Explicitly import types, hoping TS picks them up
import { CategoryGroup, Category, Prisma } from '@prisma/client';
import { CreateCategoryGroupDto, UpdateCategoryGroupDto, CategoryGroupResponse } from '../interfaces/categoryGroup.interface';
import { HttpException } from '../../middleware/errorHandler';
import { BudgetService } from './budget.service'; // To verify budget ownership

export class CategoryGroupService {
  private budgetService = new BudgetService();

  /**
   * Verify that a budget belongs to the specified user.
   * Throws HttpException if not found or not owned.
   */
  private async verifyBudgetOwnership(userId: string, budgetId: string): Promise<void> {
    await this.budgetService.getBudgetById(userId, budgetId);
  }

  /**
   * Get all category groups for a specific budget.
   */
  async getAllCategoryGroups(userId: string, budgetId: string): Promise<CategoryGroupResponse[]> {
    await this.verifyBudgetOwnership(userId, budgetId);
    // Use the imported type if necessary, but prisma client should infer it
    return prisma.categoryGroup.findMany({
      where: { budgetId },
      orderBy: { sortOrder: 'asc' }, // Default sort order
      // include: { categories: true } // Optionally include categories
    });
  }

  /**
   * Get a single category group by ID.
   */
  async getCategoryGroupById(userId: string, budgetId: string, groupId: string): Promise<CategoryGroupResponse> {
    await this.verifyBudgetOwnership(userId, budgetId);
    const group = await prisma.categoryGroup.findUnique({
      where: { id: groupId },
    });

    if (!group || group.budgetId !== budgetId) {
      throw new HttpException(404, 'Category group not found in this budget');
    }
    return group as CategoryGroupResponse; // Cast if needed
  }

  /**
   * Create a new category group within a budget.
   */
  async createCategoryGroup(
    userId: string,
    budgetId: string,
    createDto: CreateCategoryGroupDto
  ): Promise<CategoryGroupResponse> {
    await this.verifyBudgetOwnership(userId, budgetId);
    const { name, sortOrder } = createDto;

    return prisma.categoryGroup.create({
      data: {
        name,
        sortOrder,
        budgetId,
      },
    });
  }

  /**
   * Update an existing category group.
   */
  async updateCategoryGroup(
    userId: string,
    budgetId: string,
    groupId: string,
    updateDto: UpdateCategoryGroupDto
  ): Promise<CategoryGroupResponse> {
    // Verify ownership and existence
    const existingGroup = await this.getCategoryGroupById(userId, budgetId, groupId);

    const { name, sortOrder } = updateDto;

    if (!name && sortOrder === undefined) {
      throw new HttpException(400, 'No update data provided');
    }

    return prisma.categoryGroup.update({
      where: { id: groupId },
      data: {
        name: name ?? existingGroup.name,
        sortOrder: sortOrder ?? existingGroup.sortOrder,
      },
    });
  }

  /**
   * Delete a category group.
   * Note: This should ideally also handle deleting/reassigning categories within it.
   * For now, a simple delete - requires related categories to be deleted first due to FK constraint.
   */
  async deleteCategoryGroup(userId: string, budgetId: string, groupId: string): Promise<void> {
    // Verify ownership and existence
    await this.getCategoryGroupById(userId, budgetId, groupId);

    // Add check here: ensure no categories exist in this group before deleting
    const categoriesCount = await prisma.category.count({ where: { categoryGroupId: groupId } });
    if (categoriesCount > 0) {
      throw new HttpException(400, 'Cannot delete group: contains categories. Delete categories first.');
    }

    await prisma.categoryGroup.delete({
      where: { id: groupId },
    });
  }
}

import prisma from '../../config/prisma';
import { Category, Prisma } from '@prisma/client'; // Explicit import
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponse } from '../interfaces/category.interface';
import { HttpException } from '../../middleware/errorHandler';
import { CategoryGroupService } from './categoryGroup.service'; // To verify group ownership

export class CategoryService {
  private categoryGroupService = new CategoryGroupService();

  /**
   * Get all categories within a specific category group.
   */
  async getAllCategoriesInGroup(userId: string, budgetId: string, groupId: string): Promise<CategoryResponse[]> {
    // Verify user owns budget and group exists in budget
    await this.categoryGroupService.getCategoryGroupById(userId, budgetId, groupId);

    return prisma.category.findMany({
      where: { categoryGroupId: groupId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get a single category by ID, ensuring it belongs to the correct group/budget.
   */
  async getCategoryById(
    userId: string,
    budgetId: string,
    groupId: string, // We need the group ID to verify hierarchy
    categoryId: string
  ): Promise<CategoryResponse> {
    // Verify group ownership first
    await this.categoryGroupService.getCategoryGroupById(userId, budgetId, groupId);

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || category.categoryGroupId !== groupId) {
      throw new HttpException(404, 'Category not found in this group');
    }
    return category as CategoryResponse;
  }

  /**
   * Create a new category within a specific category group.
   */
  async createCategory(
    userId: string,
    budgetId: string,
    groupId: string,
    createDto: CreateCategoryDto
  ): Promise<CategoryResponse> {
    // Verify group ownership
    await this.categoryGroupService.getCategoryGroupById(userId, budgetId, groupId);

    const { name, sortOrder } = createDto;

    return prisma.category.create({
      data: {
        name,
        sortOrder,
        categoryGroupId: groupId,
      },
    });
  }

  /**
   * Update an existing category.
   */
  async updateCategory(
    userId: string,
    budgetId: string,
    groupId: string,
    categoryId: string,
    updateDto: UpdateCategoryDto
  ): Promise<CategoryResponse> {
    // Verify ownership and existence
    const existingCategory = await this.getCategoryById(userId, budgetId, groupId, categoryId);

    const { name, sortOrder } = updateDto;

    if (!name && sortOrder === undefined) {
      throw new HttpException(400, 'No update data provided');
    }

    return prisma.category.update({
      where: { id: categoryId },
      data: {
        name: name ?? existingCategory.name,
        sortOrder: sortOrder ?? existingCategory.sortOrder,
      },
    });
  }

  /**
   * Delete a category.
   * Note: This should handle implications for BudgetEntries, Transactions, Goals later.
   * For now, a simple delete. Checks for associated BudgetEntries.
   */
  async deleteCategory(userId: string, budgetId: string, groupId: string, categoryId: string): Promise<void> {
    // Verify ownership and existence
    await this.getCategoryById(userId, budgetId, groupId, categoryId);

    // Prevent deletion if BudgetEntries exist (might relax this later)
    const entryCount = await prisma.budgetEntry.count({ where: { categoryId: categoryId } });
    if (entryCount > 0) {
      throw new HttpException(400, 'Cannot delete category with existing budget entries.');
    }
    // TODO: Add check for transactions later

    await prisma.category.delete({
      where: { id: categoryId },
    });
  }
}

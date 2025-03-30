import prisma from '../../config/prisma';
import { Goal, GoalType, Prisma } from '@prisma/client'; // Explicit imports
import { UpsertGoalDto, GoalResponse } from '../interfaces/goal.interface';
import { HttpException } from '../../middleware/errorHandler';
import { CategoryService } from '../../budget/services/category.service';

export class GoalService {
    private categoryService = new CategoryService(); // To verify category ownership

    /**
     * Get the goal for a specific category.
     */
    async getGoalForCategory(userId: string, budgetId: string, groupId: string, categoryId: string): Promise<GoalResponse | null> {
        // Verify category ownership first (implicitly checks budget/group)
        await this.categoryService.getCategoryById(userId, budgetId, groupId, categoryId);

        return prisma.goal.findUnique({
            where: { categoryId: categoryId },
        });
    }

    /**
     * Create or update the goal for a specific category (Upsert).
     */
    async upsertGoalForCategory(
        userId: string,
        budgetId: string,
        groupId: string,
        categoryId: string,
        upsertDto: UpsertGoalDto
    ): Promise<GoalResponse> {
        // Verify category ownership
        await this.categoryService.getCategoryById(userId, budgetId, groupId, categoryId);

        // Validate DTO based on type
        this.validateGoalDto(upsertDto);

        const data: Prisma.GoalUncheckedCreateInput | Prisma.GoalUncheckedUpdateInput = {
            categoryId: categoryId,
            name: upsertDto.name,
            type: upsertDto.type,
            targetAmount: upsertDto.targetAmount,
            targetDate: upsertDto.targetDate ? new Date(upsertDto.targetDate) : null,
            monthlyFundingAmount: upsertDto.monthlyFundingAmount,
        };

        return prisma.goal.upsert({
            where: { categoryId: categoryId }, // Unique constraint on categoryId
            create: data as Prisma.GoalUncheckedCreateInput,
            update: data, // Same data works for update
        });
    }

    /**
     * Delete the goal for a specific category.
     */
    async deleteGoalForCategory(userId: string, budgetId: string, groupId: string, categoryId: string): Promise<void> {
        // Verify category ownership
        await this.categoryService.getCategoryById(userId, budgetId, groupId, categoryId);

        // Need to check if goal actually exists first to avoid prisma error on delete
        const existingGoal = await prisma.goal.findUnique({ where: { categoryId: categoryId }});
        if (!existingGoal) {
            // Or just return success silently?
            throw new HttpException(404, 'Goal not found for this category');
        }

        await prisma.goal.delete({
            where: { categoryId: categoryId },
        });
    }

    /**
     * Validate Goal DTO based on GoalType requirements.
     */
    private validateGoalDto(dto: UpsertGoalDto): void {
        switch (dto.type) {
            case GoalType.TARGET_BALANCE:
                if (dto.targetAmount === undefined || dto.targetAmount === null || dto.targetAmount <= 0) {
                    throw new HttpException(400, `targetAmount is required and must be positive for goal type ${dto.type}`);
                }
                // Ensure other type-specific fields are null/undefined
                dto.targetDate = null;
                dto.monthlyFundingAmount = null;
                break;
            case GoalType.TARGET_BALANCE_BY_DATE:
                if (dto.targetAmount === undefined || dto.targetAmount === null || dto.targetAmount <= 0) {
                    throw new HttpException(400, `targetAmount is required and must be positive for goal type ${dto.type}`);
                }
                if (!dto.targetDate) {
                    throw new HttpException(400, `targetDate is required for goal type ${dto.type}`);
                }
                try { new Date(dto.targetDate); } catch { throw new HttpException(400, 'Invalid targetDate format'); }
                 // Ensure other type-specific fields are null/undefined
                dto.monthlyFundingAmount = null;
                break;
            case GoalType.MONTHLY_FUNDING:
                 if (dto.monthlyFundingAmount === undefined || dto.monthlyFundingAmount === null || dto.monthlyFundingAmount <= 0) {
                    throw new HttpException(400, `monthlyFundingAmount is required and must be positive for goal type ${dto.type}`);
                }
                 // Ensure other type-specific fields are null/undefined
                dto.targetAmount = null;
                dto.targetDate = null;
                break;
            default:
                // If GoalType enum expands, add validation here
                throw new HttpException(400, `Unsupported goal type: ${dto.type}`);
        }
    }
}


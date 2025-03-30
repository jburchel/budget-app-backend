import { Request, Response, NextFunction } from 'express';
import { GoalService } from '../services/goal.service';
import { UpsertGoalDto } from '../interfaces/goal.interface';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { GoalType } from '@prisma/client'; // Import GoalType for validation

export class GoalController {
    private goalService = new GoalService();

    // GET /budgets/:budgetId/groups/:groupId/categories/:categoryId/goal
    getGoal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as AuthenticatedUser).id;
            const { budgetId, groupId, categoryId } = req.params;
            const goal = await this.goalService.getGoalForCategory(userId, budgetId, groupId, categoryId);
            if (!goal) {
                // Return 404 if no goal exists for the category
                 res.status(404).json({ message: 'Goal not found for this category' });
            } else {
                res.status(200).json(goal);
            }
        } catch (error) {
            next(error);
        }
    };

    // PUT /budgets/:budgetId/groups/:groupId/categories/:categoryId/goal
    upsertGoal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as AuthenticatedUser).id;
            const { budgetId, groupId, categoryId } = req.params;
            const upsertDto: UpsertGoalDto = req.body;

            // Basic validation
            if (!upsertDto.type || !Object.values(GoalType).includes(upsertDto.type)) {
                 res.status(400).json({ message: 'Valid goal type is required' });
                 return;
            }

            const goal = await this.goalService.upsertGoalForCategory(userId, budgetId, groupId, categoryId, upsertDto);
            res.status(200).json(goal); // Use 200 for upsert (could be create or update)
        } catch (error) {
            next(error);
        }
    };

    // DELETE /budgets/:budgetId/groups/:groupId/categories/:categoryId/goal
    deleteGoal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as AuthenticatedUser).id;
            const { budgetId, groupId, categoryId } = req.params;
            await this.goalService.deleteGoalForCategory(userId, budgetId, groupId, categoryId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}

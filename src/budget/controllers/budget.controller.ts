import { Request, Response, NextFunction } from 'express';
import { BudgetService } from '../services/budget.service';
import { CreateBudgetDto, UpdateBudgetDto, AssignMoneyDto, MoveMoneyDto } from '../interfaces/budget.interface';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { HttpException } from '../../middleware/errorHandler';

export class BudgetController {
  private budgetService = new BudgetService();

  // GET /budgets
  getAllBudgets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const budgets = await this.budgetService.getAllBudgetsForUser(userId);
      res.status(200).json(budgets);
    } catch (error) {
      next(error);
    }
  };

  // GET /budgets/:budgetId
  getBudgetById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { budgetId } = req.params;
      const budget = await this.budgetService.getBudgetById(userId, budgetId);
      res.status(200).json(budget);
    } catch (error) {
      next(error);
    }
  };

  // POST /budgets
  createBudget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const createBudgetDto: CreateBudgetDto = req.body;

      const newBudget = await this.budgetService.createBudget(userId, createBudgetDto);
      res.status(201).json(newBudget);
    } catch (error) {
      next(error);
    }
  };

  // PUT /budgets/:budgetId
  updateBudget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { budgetId } = req.params;
      const updateBudgetDto: UpdateBudgetDto = req.body;

      if (Object.keys(updateBudgetDto).length === 0) {
        throw new HttpException(400, 'Request body cannot be empty');
      }

      const updatedBudget = await this.budgetService.updateBudget(userId, budgetId, updateBudgetDto);
      res.status(200).json(updatedBudget);
    } catch (error) {
      next(error);
    }
  };

  // DELETE /budgets/:budgetId
  deleteBudget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { budgetId } = req.params;
      await this.budgetService.deleteBudget(userId, budgetId);
      res.status(204).send(); // 204 No Content for successful deletion
    } catch (error) {
      next(error);
    }
  };

  // POST /budgets/:budgetId/assign
  assignMoney = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { budgetId } = req.params;
      const assignDto: AssignMoneyDto = req.body;

      await this.budgetService.assignMoney(userId, budgetId, assignDto);
      res.status(200).json({ message: 'Money assigned successfully' });
    } catch (error) {
      next(error);
    }
  };

  // POST /budgets/:budgetId/move
  moveMoney = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { budgetId } = req.params;
      const moveDto: MoveMoneyDto = req.body;

      await this.budgetService.moveMoney(userId, budgetId, moveDto);
      res.status(200).json({ message: 'Money moved successfully' });
    } catch (error) {
      next(error);
    }
  };

  // GET /budgets/:budgetId/view?month=YYYY-MM
  getBudgetView = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { budgetId } = req.params;
      const { month: monthQuery } = req.query as { month: string };

      const [yearStr, monthStr] = monthQuery.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      const budgetViewData = await this.budgetService.getBudgetView(userId, budgetId, year, month);
      res.status(200).json(budgetViewData);
    } catch (error) {
      next(error);
    }
  };
}

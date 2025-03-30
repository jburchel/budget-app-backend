import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../interfaces/category.interface';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

export class CategoryController {
  private categoryService = new CategoryService();

  getAllCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { budgetId, groupId } = req.params; // GroupId needed for context
      const categories = await this.categoryService.getAllCategoriesInGroup(userId, budgetId, groupId);
      res.status(200).json(categories);
    } catch (error) {
      next(error);
    }
  };

  getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { budgetId, groupId, categoryId } = req.params;
      const category = await this.categoryService.getCategoryById(userId, budgetId, groupId, categoryId);
      res.status(200).json(category);
    } catch (error) {
      next(error);
    }
  };

  createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { budgetId, groupId } = req.params;
      const createDto: CreateCategoryDto = req.body;

      if (!createDto.name) {
        res.status(400).json({ message: 'Category name is required' });
        return;
      }

      const newCategory = await this.categoryService.createCategory(userId, budgetId, groupId, createDto);
      res.status(201).json(newCategory);
    } catch (error) {
      next(error);
    }
  };

  updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { budgetId, groupId, categoryId } = req.params;
      const updateDto: UpdateCategoryDto = req.body;

      if (Object.keys(updateDto).length === 0) {
        res.status(400).json({ message: 'Request body cannot be empty' });
        return;
      }

      const updatedCategory = await this.categoryService.updateCategory(userId, budgetId, groupId, categoryId, updateDto);
      res.status(200).json(updatedCategory);
    } catch (error) {
      next(error);
    }
  };

  deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { budgetId, groupId, categoryId } = req.params;
      await this.categoryService.deleteCategory(userId, budgetId, groupId, categoryId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

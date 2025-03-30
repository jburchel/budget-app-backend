import { Request, Response, NextFunction } from 'express';
import { CategoryGroupService } from '../services/categoryGroup.service';
import { CreateCategoryGroupDto, UpdateCategoryGroupDto } from '../interfaces/categoryGroup.interface';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

export class CategoryGroupController {
  private groupService = new CategoryGroupService();

  getAllGroups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { budgetId } = req.params; // Assuming budgetId is part of the route path
      const groups = await this.groupService.getAllCategoryGroups(userId, budgetId);
      res.status(200).json(groups);
    } catch (error) {
      next(error);
    }
  };

  getGroupById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { budgetId, groupId } = req.params;
      const group = await this.groupService.getCategoryGroupById(userId, budgetId, groupId);
      res.status(200).json(group);
    } catch (error) {
      next(error);
    }
  };

  createGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { budgetId } = req.params;
      const createDto: CreateCategoryGroupDto = req.body;

      if (!createDto.name) {
        res.status(400).json({ message: 'Category group name is required' });
        return;
      }

      const newGroup = await this.groupService.createCategoryGroup(userId, budgetId, createDto);
      res.status(201).json(newGroup);
    } catch (error) {
      next(error);
    }
  };

  updateGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { budgetId, groupId } = req.params;
      const updateDto: UpdateCategoryGroupDto = req.body;

      if (Object.keys(updateDto).length === 0) {
        res.status(400).json({ message: 'Request body cannot be empty' });
        return;
      }

      const updatedGroup = await this.groupService.updateCategoryGroup(userId, budgetId, groupId, updateDto);
      res.status(200).json(updatedGroup);
    } catch (error) {
      next(error);
    }
  };

  deleteGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { budgetId, groupId } = req.params;
      await this.groupService.deleteCategoryGroup(userId, budgetId, groupId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

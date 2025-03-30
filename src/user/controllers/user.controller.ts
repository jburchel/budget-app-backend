import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { UpdateProfileDto, ChangePasswordDto } from '../interfaces/user.interface';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

export class UserController {
  private userService = new UserService();

  // GET /user/profile
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // req.user is attached by authMiddleware
      const user = req.user as AuthenticatedUser; // Type assertion after middleware
      const userProfile = await this.userService.getProfile(user);
      res.status(200).json(userProfile);
    } catch (error) {
      next(error);
    }
  };

  // PUT /user/profile
  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const updateProfileDto: UpdateProfileDto = req.body;

      // Basic validation
      if (Object.keys(updateProfileDto).length === 0) {
        res.status(400).json({ message: 'Request body cannot be empty' });
        return;
      }

      const updatedUser = await this.userService.updateProfile(userId, updateProfileDto);
      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  };

  // PUT /user/password
  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const changePasswordDto: ChangePasswordDto = req.body;

      // Basic validation
      if (!changePasswordDto.currentPassword || !changePasswordDto.newPassword) {
        res.status(400).json({ message: 'Current password and new password are required' });
        return;
      }
      // Add more validation for password complexity if needed

      await this.userService.changePassword(userId, changePasswordDto);
      res.status(200).json({ message: 'Password changed successfully' }); // Or 204 No Content
    } catch (error) {
      next(error);
    }
  };
}


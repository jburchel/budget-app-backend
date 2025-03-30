import prisma from '../../config/prisma';
import bcrypt from 'bcrypt';
import { UpdateProfileDto, ChangePasswordDto } from '../interfaces/user.interface';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { HttpException } from '../../middleware/errorHandler';

const SALT_ROUNDS = 10; // Should match the value used in AuthService

export class UserService {
  /**
   * Gets the profile for the currently authenticated user.
   * The user object is already attached to the request by authMiddleware.
   */
  async getProfile(user: AuthenticatedUser): Promise<AuthenticatedUser> {
    // The user object passed in is already the authenticated user
    // We might re-fetch or re-validate if needed, but often not necessary
    if (!user) {
      // This shouldn't happen if authMiddleware is used correctly
      throw new HttpException(401, 'Unauthorized');
    }
    return user;
  }

  /**
   * Updates the profile for the currently authenticated user.
   */
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto
  ): Promise<AuthenticatedUser> {
    const { firstName, lastName } = updateProfileDto;

    // Ensure at least one field is being updated
    if (!firstName && !lastName) {
      throw new HttpException(400, 'No update data provided');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName ?? undefined, // Use current value if not provided
        lastName: lastName ?? undefined,
      },
    });

    const { password: _p, resetToken: _rt, resetTokenExp: _rte, ...authenticatedUser } = updatedUser;
    return authenticatedUser;
  }

  /**
   * Changes the password for the currently authenticated user.
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // Should be caught by authMiddleware, but double-check
      throw new HttpException(401, 'Unauthorized');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new HttpException(400, 'Invalid current password');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password in DB
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
      },
    });

    // No data needs to be returned on successful password change
  }
}

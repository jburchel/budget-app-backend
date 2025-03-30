import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { RegisterDto, LoginDto } from '../interfaces/auth.interface';
import { AuthenticatedUser } from '../interfaces/auth.interface';

export class AuthController {
  private authService = new AuthService();

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const registerDto: RegisterDto = req.body;
      if (!registerDto.email || !registerDto.password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
      }
      const result = await this.authService.register(registerDto);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const loginDto: LoginDto = req.body;
      if (!loginDto.email || !loginDto.password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
      }

      const loginResult = await this.authService.login(loginDto);

      if (loginResult.mfaRequired) {
        res.status(200).json({ 
            mfaRequired: true, 
            userId: loginResult.userId, 
            message: 'MFA token required' 
        });
      } else {
        res.status(200).json(loginResult.authResponse); 
      }

    } catch (error) {
      next(error);
    }
  };

  // Simple logout handler
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // For stateless JWT, server-side logout is primarily informational.
      // Client is responsible for clearing the token.
      // If using refresh tokens or a token blacklist, logic would go here.
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  };

  // POST /mfa/setup
  setupMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // User must be logged in to set up MFA
      const user = req.user as AuthenticatedUser;
      if (!user) {
          // This shouldn't happen if authMiddleware is applied correctly, but belts and suspenders
          res.status(401).json({ message: 'User not authenticated' });
          return;
      }
      
      // Generate the secret and QR code URL
      const setupData = await this.authService.generateMfaSetup(user.id, user.email);
      
      // Send the QR code data URL back to the client
      res.status(200).json(setupData);

    } catch (error) {
      next(error);
    }
  };

  // POST /mfa/verify
  verifyMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user as AuthenticatedUser;
      if (!user) {
          res.status(401).json({ message: 'User not authenticated' });
          return;
      }
      
      const { token } = req.body; // Expecting { "token": "123456" } in body

      if (!token || typeof token !== 'string' || !/^[0-9]{6}$/.test(token)) {
          // Basic validation for a 6-digit token format
          res.status(400).json({ message: 'Invalid or missing MFA token format (expecting 6 digits)' });
          return;
      }

      await this.authService.verifyMfaSetup(user.id, token);
      
      // If verifyMfaSetup succeeds, it means MFA is now enabled.
      res.status(200).json({ message: 'MFA enabled successfully' });

    } catch (error) {
      next(error);
    }
  };

  // POST /mfa/login-verify
  verifyMfaLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // This route is public initially, user isn't fully authenticated yet
        const { userId, token } = req.body; // Expecting { "userId": "...", "token": "123456" }

        // Basic validation
        if (!userId || typeof userId !== 'string') {
             res.status(400).json({ message: 'User ID is required' });
            return;
        }
        if (!token || typeof token !== 'string' || !/^[0-9]{6}$/.test(token)) {
            res.status(400).json({ message: 'Invalid or missing MFA token format (expecting 6 digits)' });
            return;
        }

        // Call the service method to verify the token and get the final AuthResponse
        const authResponse = await this.authService.verifyMfaLogin(userId, token);

        // Send the final auth response (user + token)
        res.status(200).json(authResponse);

    } catch (error) {
        next(error);
    }
  };

  // POST /mfa/disable
  disableMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = req.user as AuthenticatedUser;
        if (!user) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }

        await this.authService.disableMfa(user.id);

        res.status(200).json({ message: 'MFA disabled successfully' });

    } catch (error) {
        next(error);
    }
  };

  // POST /auth/request-password-reset
  requestPasswordReset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;

      // Basic validation (Zod would be better)
      if (!email || typeof email !== 'string') {
         res.status(400).json({ message: 'Email is required' });
         return;
      }

      // Call the service method
      await this.authService.requestPasswordReset(email);

      // Always return a generic success message, regardless of whether the user was found
      res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

    } catch (error) {
      // Log unexpected errors, but don't expose details to the client here
      console.error('Unexpected error in requestPasswordReset:', error);
      // Still send a generic success message to avoid leaking info
      res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
      // Note: Or potentially send a 500 if the error is truly unexpected and needs investigation,
      // but for this flow, masking is often preferred.
      // next(new HttpException(500, 'An internal error occurred')); 
    }
  };

  // POST /auth/reset-password
  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, newPassword } = req.body;

      // Basic validation (Zod better)
      if (!token || typeof token !== 'string') {
        res.status(400).json({ message: 'Reset token is required' });
        return;
      }
      if (!newPassword || typeof newPassword !== 'string') {
        res.status(400).json({ message: 'New password is required' });
        return;
      }
      // Add password complexity rules here if desired before calling service
      if (newPassword.length < 8) { // Example complexity rule
         res.status(400).json({ message: 'Password must be at least 8 characters long' });
        return;
      }

      await this.authService.resetPassword(token, newPassword);

      res.status(200).json({ message: 'Password has been reset successfully.' });

    } catch (error) {
      next(error); // Pass errors (like invalid token) to global handler
    }
  };

  // --- Add actual password reset method later ---
}

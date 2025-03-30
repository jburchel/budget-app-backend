import prisma from '../../config/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { RegisterDto, LoginDto, AuthResponse, JwtPayload, AuthenticatedUser } from '../interfaces/auth.interface';
import { generateToken } from '../utils/jwt';
import { HttpException } from '../../middleware/errorHandler';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

// Define a new return type for the login method to handle MFA step
interface LoginResult {
    mfaRequired: boolean;
    userId?: string; // Sent only if mfaRequired is true
    authResponse?: AuthResponse; // Sent only if mfaRequired is false
}

const SALT_ROUNDS = 10;
const APP_NAME = 'BudgetApp';
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_EXPIRY_MINUTES = 60; // Token valid for 1 hour

export class AuthService {
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, firstName, lastName } = registerDto;

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new HttpException(409, 'Email already exists'); // 409 Conflict
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 3. Create the user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
      },
    });

    // 4. Generate JWT
    const payload: JwtPayload = { id: user.id, email: user.email };
    const token = generateToken(payload);

    // 5. Prepare response (exclude sensitive fields)
    const { password: _p, resetToken: _rt, resetTokenExp: _rte, ...authenticatedUser } = user;

    return { user: authenticatedUser, token };
  }

  async login(loginDto: LoginDto): Promise<LoginResult> { // Updated return type
    const { email, password } = loginDto;

    // 1. Find user by email, include MFA fields
    const user = await prisma.user.findUnique({
      where: { email },
      // Select MFA fields needed for the check
      // select: { id: true, email: true, password: true, isMfaEnabled: true } // Selecting specific fields might be better
    });

    if (!user) {
      throw new HttpException(401, 'Invalid email or password');
    }

    // 2. Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new HttpException(401, 'Invalid email or password');
    }

    // --- MFA Check --- 
    if (user.isMfaEnabled) {
      // Password is valid, but MFA is enabled. Don't issue JWT yet.
      // Signal that MFA verification is the next step.
      return {
        mfaRequired: true,
        userId: user.id // Send userId for the next step
      };
    }
    // --- End MFA Check ---

    // 3. MFA not enabled, proceed to generate JWT as before
    const payload: JwtPayload = { id: user.id, email: user.email };
    const token = generateToken(payload);

    // 4. Prepare response (exclude sensitive fields)
    const { password: _p, resetToken: _rt, resetTokenExp: _rte, ...authenticatedUser } = user;

    // Corrected return structure for non-MFA case
    return {
        mfaRequired: false,
        authResponse: { user: authenticatedUser, token }
    };
  }

  /**
   * Generates MFA setup data (secret, QR code) for a user.
   * Stores the temporary secret in the user's record.
   * @param userId - The ID of the user setting up MFA.
   * @returns An object containing the QR code data URL.
   */
  async generateMfaSetup(userId: string, userEmail: string): Promise<{ qrCodeDataUrl: string }> {
    // 1. Generate a new TOTP secret
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `${APP_NAME} (${userEmail})`
    });

    // 2. Store the base32 encoded secret
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: secret.base32,
        isMfaEnabled: false
      },
    });

    // 3. Generate the otpauth:// URL
    const otpauthUrl = secret.otpauth_url;
    if (!otpauthUrl) {
      throw new HttpException(500, 'Could not generate otpauth URL');
    }

    // 4. Generate QR code data URL
    try {
      const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
      return { qrCodeDataUrl };
    } catch (error) {
      console.error('QR Code generation failed:', error);
      throw new HttpException(500, 'Could not generate QR code for MFA setup');
    }
  }

  /**
   * Verifies the initial TOTP token during MFA setup and enables MFA for the user.
   * @param userId - The ID of the user verifying MFA.
   * @param token - The 6-digit TOTP token provided by the user.
   */
  async verifyMfaSetup(userId: string, token: string): Promise<void> {
    // 1. Retrieve the user and their stored temporary secret
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, isMfaEnabled: true }, // Select fields needed
    });

    if (!user) {
      // Should not happen if called after successful login/setup initiation
      throw new HttpException(404, 'User not found');
    }
    if (user.isMfaEnabled) {
      // If MFA is already enabled, this endpoint shouldn't be used
      throw new HttpException(400, 'MFA is already enabled for this account');
    }
    if (!user.mfaSecret) {
      // Secret should have been stored during generateMfaSetup
      throw new HttpException(400, 'MFA setup not initiated or secret missing');
    }

    // 2. Verify the token against the stored secret
    const isTokenValid = speakeasy.totp.verify({
      secret: user.mfaSecret, // Use the base32 secret stored in DB
      encoding: 'base32',
      token: token,
      window: 1 // Allow for a small time window (e.g., 1 step = 30 seconds) drift
    });

    if (!isTokenValid) {
      throw new HttpException(400, 'Invalid MFA token');
    }

    // 3. Token is valid, enable MFA for the user
    await prisma.user.update({
      where: { id: userId },
      data: { 
        isMfaEnabled: true 
        // Keep mfaSecret stored, it's needed for future logins
      },
    });

    // No return value needed on success, throws error on failure
  }

  async verifyMfaLogin(userId: string, token: string): Promise<AuthResponse> {
    // 1. Retrieve the user and their MFA secret
    // Rename this variable to avoid conflict later
    const userWithMfa = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaSecret: true, isMfaEnabled: true }, 
    });

    // Use the new variable name in checks
    if (!userWithMfa || !userWithMfa.isMfaEnabled || !userWithMfa.mfaSecret) {
      throw new HttpException(401, 'MFA not enabled or user not found'); 
    }

    // 2. Verify the token
    const isTokenValid = speakeasy.totp.verify({
      secret: userWithMfa.mfaSecret, // Use correct variable
      encoding: 'base32',
      token: token,
      window: 1 
    });

    if (!isTokenValid) {
      throw new HttpException(401, 'Invalid MFA token');
    }

    // 3. Token is valid, generate JWT and prepare response
    // Use the correct variable for payload
    const payload: JwtPayload = { id: userWithMfa.id, email: userWithMfa.email };
    const jwtToken = generateToken(payload);

    // Fetch full user details again...
    const fullUser = await prisma.user.findUnique({ where: { id: userId }});
    if (!fullUser) throw new HttpException(404, 'User not found after MFA verification');
    
    // Exclusion logic is now correct
    const { password: _p, resetToken: _rt, resetTokenExp: _rte, ...authenticatedUser } = fullUser;

    return { user: authenticatedUser, token: jwtToken };
  }

  /**
   * Disables MFA for a user.
   * @param userId - The ID of the user disabling MFA.
   */
  async disableMfa(userId: string): Promise<void> {
    // 1. Verify user exists and MFA is currently enabled
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isMfaEnabled: true },
    });

    if (!user) {
      throw new HttpException(404, 'User not found');
    }
    if (!user.isMfaEnabled) {
      throw new HttpException(400, 'MFA is not currently enabled for this account');
    }

    // 2. Disable MFA and clear the secret
    await prisma.user.update({
      where: { id: userId },
      data: {
        isMfaEnabled: false,
        mfaSecret: null, // Clear the secret when disabling
      },
    });

    // No return value needed on success
  }

  /**
   * Initiates the password reset process for a user.
   * Generates a reset token, stores its hash, and (conceptually) sends an email.
   * @param email - The email address of the user requesting the reset.
   */
  async requestPasswordReset(email: string): Promise<void> {
    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // 2. IMPORTANT: Always return success-like response even if user doesn't exist
    // This prevents email enumeration attacks.
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return; // Do nothing further, but don't throw error
    }

    // 3. Generate a secure random token
    const resetToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');

    // 4. Hash the token before storing
    const hashedToken = await bcrypt.hash(resetToken, SALT_ROUNDS);

    // 5. Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + RESET_TOKEN_EXPIRY_MINUTES);

    // 6. Store hashed token and expiry in the database
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: hashedToken,
          resetTokenExp: expiryDate,
        },
      });
    } catch (error) {
      console.error(`Failed to update user record for password reset (User ID: ${user.id}):`, error);
      return;
    }

    // 7. Send the email (Simulated)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log(`--- SIMULATING PASSWORD RESET EMAIL ---`);
    console.log(`To: ${email}`);
    console.log(`Subject: Reset Your Password`);
    console.log(`Click this link to reset your password: ${resetLink}`);
    console.log(`This link expires in ${RESET_TOKEN_EXPIRY_MINUTES} minutes.`);
    console.log(`User ID: ${user.id}`); 
    console.log(`Raw Token: ${resetToken}`); 
    console.log(`--------------------------------------`);
  }

  /**
   * Resets a user's password using a valid reset token.
   * @param token - The password reset token (from the email link).
   * @param newPassword - The new password provided by the user.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const now = new Date();
    const potentialUsers = await prisma.user.findMany({
      where: {
        resetToken: { not: null },
        resetTokenExp: { gt: now }, 
      },
      select: { id: true, resetToken: true, password: true }, 
    });

    let userToUpdate: { id: string, password: string } | null = null;

    for (const user of potentialUsers) {
      if (user.resetToken) {
        const isTokenValid = await bcrypt.compare(token, user.resetToken);
        if (isTokenValid) {
          userToUpdate = { id: user.id, password: user.password };
          break;
        }
      }
    }

    if (!userToUpdate) {
      throw new HttpException(400, 'Invalid or expired password reset token.');
    }

    const isSamePassword = await bcrypt.compare(newPassword, userToUpdate.password);
    if (isSamePassword) {
      throw new HttpException(400, 'New password cannot be the same as the old password.');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userToUpdate.id },
      data: {
        password: hashedNewPassword,
        resetToken: null, 
        resetTokenExp: null,
      },
    });
  }

  // --- TODO: Recovery Codes? ---
}
import { User } from '@prisma/client';

// Data Transfer Object for user registration
export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

// Data Transfer Object for user login
export interface LoginDto {
  email: string;
  password: string;
}

// Payload stored within the JWT
export interface JwtPayload {
  id: string;
  email: string;
}

// Type for the user object returned upon successful auth, omitting the password
export type AuthenticatedUser = Omit<User, 'password' | 'resetToken' | 'resetTokenExp'>;

// Interface for the object returned by successful authentication
export interface AuthResponse {
  user: AuthenticatedUser;
  token: string;
}

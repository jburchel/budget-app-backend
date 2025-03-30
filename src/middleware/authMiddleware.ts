import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/utils/jwt';
import prisma from '../config/prisma';
import { HttpException } from './errorHandler';
import { JwtPayload, AuthenticatedUser } from '../auth/interfaces/auth.interface';

// Extend the Express Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT.
 * Verifies the token from the Authorization header and attaches the user to the request.
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new HttpException(401, 'Unauthorized: No token provided'));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(new HttpException(401, 'Unauthorized: Token format invalid'));
  }

  try {
    const decodedPayload = verifyToken(token);

    if (!decodedPayload) {
      return next(new HttpException(401, 'Unauthorized: Invalid token'));
    }

    // Find user in DB based on token payload (ID)
    const user = await prisma.user.findUnique({
      where: { id: decodedPayload.id },
    });

    if (!user) {
      return next(new HttpException(401, 'Unauthorized: User not found'));
    }

    // Exclude password and other sensitive fields before attaching
    const { password: _p, resetToken: _rt, resetTokenExp: _rte, ...authenticatedUser } = user;

    // Attach user to the request object
    req.user = authenticatedUser;

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    // Handle potential errors during token verification or DB lookup
    if (error instanceof Error && error.name === 'TokenExpiredError') {
        return next(new HttpException(401, 'Unauthorized: Token expired'));
    }
    console.error('Authentication Error:', error);
    return next(new HttpException(401, 'Unauthorized: Invalid token'));
  }
}; 
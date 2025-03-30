import { Request, Response, NextFunction } from 'express';
import { HttpException } from './errorHandler';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

// Define the set of statuses that grant access
const ACTIVE_STATUSES: Set<string | null | undefined> = new Set([
    'active',
    'trialing',
]);

/**
 * Middleware to check if the authenticated user has an active subscription status.
 * Assumes authMiddleware has already run and attached req.user.
 */
export const subscriptionCheckMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const user = req.user as AuthenticatedUser;

    // Should not happen if authMiddleware is applied first, but check anyway
    if (!user) {
        return next(new HttpException(401, 'User not authenticated'));
    }

    const status = user.subscriptionStatus;

    if (ACTIVE_STATUSES.has(status)) {
        // User has an active or trialing subscription, allow access
        next();
    } else {
        // User does not have an active subscription
        // 402 Payment Required is often appropriate, but 403 Forbidden also works
        return next(new HttpException(403, 'Forbidden: Active subscription required'));
    }
}; 
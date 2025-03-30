import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { HttpException } from './errorHandler';

/**
 * Creates an Express middleware function that validates request data against a Zod schema.
 *
 * @param schema - The Zod schema to validate against.
 * @param target - Specifies which part of the request to validate ('body', 'query', or 'params').
 * @returns An Express middleware function.
 */
export const validateRequest = (
    schema: AnyZodObject,
    target: 'body' | 'query' | 'params' = 'body' // Default to validating request body
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Validate the specified part of the request
            await schema.parseAsync(req[target]);
            // Validation successful, proceed to the next middleware/handler
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                // Format Zod errors into a single message string
                const detailedMessage = error.errors
                    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                    .join('; ');
                // Pass the formatted message to HttpException
                next(new HttpException(400, `Validation failed: ${detailedMessage}`));
            } else {
                // Handle unexpected errors during validation
                console.error('Unexpected validation error:', error);
                next(new HttpException(500, 'Internal Server Error during validation'));
            }
        }
    };
}; 
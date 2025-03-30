import { z } from 'zod';

/**
 * Zod schema for validating the request body when creating a new budget.
 */
export const createBudgetSchema = z.object({
    body: z.object({
        name: z.string({
            required_error: 'Budget name is required',
            invalid_type_error: 'Budget name must be a string',
        }).min(1, { message: 'Budget name cannot be empty' })
          .max(100, { message: 'Budget name cannot exceed 100 characters' }), // Added max length
        
        description: z.string({
            invalid_type_error: 'Description must be a string'
        }).max(255, { message: 'Description cannot exceed 255 characters' }) // Added max length
          .optional(), // Description is optional
    }),
    // Can add schemas for query or params here if needed for other routes
});

/**
 * Zod schema for validating the request body when updating an existing budget.
 */
export const updateBudgetSchema = z.object({
     body: z.object({
        name: z.string()
               .min(1, { message: 'Budget name cannot be empty' })
               .max(100, { message: 'Budget name cannot exceed 100 characters' })
               .optional(), // Name is optional on update
        
        description: z.string()
                       .max(255, { message: 'Description cannot exceed 255 characters' })
                       .nullable() // Allow setting description to null or omitting it
                       .optional(), 
    }),
     params: z.object({ // Ensure budgetId in params is a valid UUID string
         budgetId: z.string().uuid({ message: "Invalid budget ID format" })
     })
});

/**
 * Zod schema for validating the request body when assigning money.
 */
export const assignMoneySchema = z.object({
    params: z.object({ // Ensure budgetId in params is a valid UUID string
         budgetId: z.string().uuid({ message: "Invalid budget ID format" })
    }),
    body: z.object({
        categoryId: z.string().uuid({ message: 'Category ID must be a valid UUID' }),
        year: z.number().int().min(1900).max(2100), // Basic year validation
        month: z.number().int().min(1).max(12, { message: 'Month must be between 1 and 12'}),
        assignAmount: z.number({ required_error: 'Assign amount is required'}).nonnegative({ message: 'Assign amount cannot be negative' }),
    }),
});

/**
 * Zod schema for validating the request body when moving money.
 */
export const moveMoneySchema = z.object({
    params: z.object({ // Ensure budgetId in params is a valid UUID string
         budgetId: z.string().uuid({ message: "Invalid budget ID format" })
    }),
    body: z.object({
        fromCategoryId: z.string().uuid({ message: 'From Category ID must be a valid UUID' }),
        toCategoryId: z.string().uuid({ message: 'To Category ID must be a valid UUID' }),
        year: z.number().int().min(1900).max(2100),
        month: z.number().int().min(1).max(12, { message: 'Month must be between 1 and 12'}),
        moveAmount: z.number({ required_error: 'Move amount is required'}).positive({ message: 'Move amount must be positive' }), // Must be > 0
    }),
});

/**
 * Zod schema for validating the query parameters for the budget view.
 */
export const getBudgetViewSchema = z.object({
    params: z.object({ // Ensure budgetId in params is a valid UUID string
         budgetId: z.string().uuid({ message: "Invalid budget ID format" })
    }),
    query: z.object({
        month: z.string({ required_error: 'Month query parameter is required'})
                 .regex(/^\d{4}-\d{2}$/, { message: 'Month must be in YYYY-MM format' }),
        // Optional: Add validation for accountId filters if implemented later
        // accountIds: z.string().uuid().array().optional(), 
    }),
}); 
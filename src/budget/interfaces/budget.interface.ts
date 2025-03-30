import { Budget } from '@prisma/client';

// DTO for creating a new budget
export interface CreateBudgetDto {
  name: string;
  description?: string;
}

// DTO for updating an existing budget
export interface UpdateBudgetDto {
  name?: string;
  description?: string;
}

// Type for the budget object returned by the API
// We might want to exclude/include specific fields later
export type BudgetResponse = Budget;

// DTO for assigning money to a category/month
export interface AssignMoneyDto {
  categoryId: string;
  year: number;
  month: number; // 1-12
  assignAmount: number; // The total amount assigned (not delta)
}

// DTO for moving money between categories in a month
export interface MoveMoneyDto {
  fromCategoryId: string;
  toCategoryId: string;
  year: number;
  month: number; // 1-12
  moveAmount: number; // The positive amount to move
}

import { Category } from '@prisma/client';

// DTO for creating a category (within a specific group)
export interface CreateCategoryDto {
  name: string;
  sortOrder?: number;
}

// DTO for updating a category
export interface UpdateCategoryDto {
  name?: string;
  sortOrder?: number;
  // Potentially allow moving to a different categoryGroupId later?
}

export type CategoryResponse = Category & {
  // Include related budget entries or goals later if needed
};

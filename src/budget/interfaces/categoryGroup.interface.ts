import { CategoryGroup } from '@prisma/client';

// DTO for creating a category group
export interface CreateCategoryGroupDto {
  name: string;
  sortOrder?: number;
}

// DTO for updating a category group
export interface UpdateCategoryGroupDto {
  name?: string;
  sortOrder?: number;
}

export type CategoryGroupResponse = CategoryGroup & {
  // Include related categories if needed later
  // categories?: CategoryResponse[];
};

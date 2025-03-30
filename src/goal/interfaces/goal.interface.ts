import { Goal, GoalType } from '@prisma/client';

// DTO for creating/updating a Goal
export interface UpsertGoalDto {
  name?: string | null;
  type: GoalType;
  targetAmount?: number | null;
  targetDate?: string | null; // ISO 8601 date string
  monthlyFundingAmount?: number | null;
}

// Response type
export type GoalResponse = Goal;

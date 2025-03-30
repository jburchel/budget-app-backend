import { Transaction, ClearedStatus } from '@prisma/client';

// Interface for a single split in a transaction DTO
interface SplitDto {
  categoryId: string;
  amount: number; // Positive or negative
  memo?: string;
}

// DTO for creating a new transaction (can be single or split)
export interface CreateTransactionDto {
  accountId: string;
  date: string; // ISO 8601 date string
  amount: number; // Total amount (negative for outflow, positive for inflow)
  payeeName?: string; // Used to find or create Payee
  payeeId?: string;   // Optionally provide direct ID (if known)
  categoryId?: string; // For single-category transactions
  cleared?: ClearedStatus;
  approved?: boolean;
  memo?: string;
  // For transfers
  isTransfer?: boolean;
  transferAccountId?: string;
  // For splits
  isSplit?: boolean;
  splits?: SplitDto[];
}

// DTO for updating an existing transaction
export interface UpdateTransactionDto {
  accountId?: string; // Allow changing account?
  date?: string;
  amount?: number;
  payeeName?: string;
  payeeId?: string;
  categoryId?: string;
  cleared?: ClearedStatus;
  approved?: boolean;
  memo?: string;
  // Cannot change transfer status/target via update easily, handle separately?
  // Cannot change split status/details via update easily, handle separately?
}

// Response type, potentially including related objects
export type TransactionResponse = Transaction & {
  // payee?: PayeeResponse;
  // category?: CategoryResponse;
  // splits?: SplitTransactionResponse[];
};

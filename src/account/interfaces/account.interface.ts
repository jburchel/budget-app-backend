import { Account, AccountType, Prisma } from '@prisma/client';

// DTO for creating a new account
export interface CreateAccountDto {
  name: string;
  type: AccountType;
  balance?: number | Prisma.Decimal; // Optional initial balance
  budgetId: string;
  onBudget?: boolean; // Optional, defaults based on type
  note?: string;
  officialName?: string;
  // plaidAccountId?: string; // Added during Plaid link, not usually manual creation
}

// DTO for updating an existing account
export interface UpdateAccountDto {
  name?: string;
  type?: AccountType; // Should changing type be allowed? Could have implications.
  onBudget?: boolean;
  note?: string;
  officialName?: string;
}

// DTO for closing an account (might just be a PUT/PATCH with isClosed=true)
// We can use UpdateAccountDto or create a specific one if needed.

// Interface for calculated balances - moved from service for shared use
interface CalculatedBalances {
    balance: Prisma.Decimal;
    clearedBalance: Prisma.Decimal;
    unclearedBalance: Prisma.Decimal;
}

// Updated Response type to include calculated balances and omit stored ones
export type AccountResponse = Omit<Account, 'balance' | 'clearedBalance' | 'unclearedBalance'> & CalculatedBalances;

// Interface representing an Account as returned by the API (with calculated balances)
export type AccountWithCalculatedBalance =
    Omit<Account, 'balance' | 'clearedBalance' | 'unclearedBalance'> &
    CalculatedBalances &
    { paymentCategoryId?: string | null }; // Add the optional payment category ID

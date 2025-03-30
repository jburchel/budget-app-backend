import { Prisma } from '@prisma/client';

// Common query parameters for most reports
export interface ReportQueryDto {
    budgetId: string;
    startDate: string; // ISO 8601 Date string (e.g., "2024-01-01")
    endDate: string;   // ISO 8601 Date string (e.g., "2024-12-31")
    accountIds?: string[]; // Optional filter by specific account IDs
    categoryIds?: string[]; // Optional filter by specific category IDs (for relevant reports)
}

// Response item for Spending Report grouped by Category
export interface SpendingByCategoryItem {
    categoryId: string;
    categoryName: string;
    totalSpending: Prisma.Decimal;
    transactionCount: number;
    averageSpending: Prisma.Decimal;
}

// Response item for Spending Report grouped by Payee
export interface SpendingByPayeeItem {
    payeeId: string | null; // Payee can be null
    payeeName: string | null;
    totalSpending: Prisma.Decimal;
    transactionCount: number;
    averageSpending: Prisma.Decimal;
}

// Overall response structure for Spending Reports
export interface SpendingReportResponse {
    startDate: string;
    endDate: string;
    totalSpending: Prisma.Decimal;
    reportItems: SpendingByCategoryItem[] | SpendingByPayeeItem[]; // Union type based on grouping
}

// Response structure for Income vs. Expense Report
export interface IncomeExpenseReportResponse {
    startDate: string;
    endDate: string;
    totalIncome: Prisma.Decimal;
    totalExpenses: Prisma.Decimal; // Should be positive number representing outflow sum
    netIncome: Prisma.Decimal; // totalIncome - totalExpenses
    // Optional: Could add breakdown by category/payee later if needed
}

/**
 * Represents a single data point for the net worth report.
 */
export interface NetWorthDataPoint {
    date: string; // e.g., 'YYYY-MM' or specific date if needed
    assets: number; // Sum of asset account balances
    liabilities: number; // Sum of liability account balances (positive value)
    netWorth: number; // assets - liabilities
}

/**
 * Defines the response structure for the net worth report.
 */
export interface NetWorthReportResponse {
    startDate: string;
    endDate: string;
    dataPoints: NetWorthDataPoint[];
}

/**
 * Defines the response structure for the Age of Money report.
 */
export interface AgeOfMoneyResponse {
    ageOfMoney: number | null; // Age of Money in days, null if calculation is not possible (e.g., no outflow)
}

// --- Add interfaces for other reports (Net Worth, Age of Money) later ---

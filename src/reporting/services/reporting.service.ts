import prisma from '../../config/prisma';
import { Prisma, AccountType } from '@prisma/client';
import { HttpException } from '../../middleware/errorHandler';
import { BudgetService } from '../../budget/services/budget.service';
import {
    ReportQueryDto,
    SpendingReportResponse,
    SpendingByCategoryItem,
    SpendingByPayeeItem,
    IncomeExpenseReportResponse,
    NetWorthReportResponse,
    NetWorthDataPoint,
    AgeOfMoneyResponse
} from '../interfaces/reporting.interface';
import dayjs from 'dayjs'; // For robust date handling
import utc from 'dayjs/plugin/utc';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(utc);
dayjs.extend(isBetween);

export class ReportingService {
    private budgetService = new BudgetService();

    /**
     * Generates a spending report grouped by category or payee.
     */
    async getSpendingReport(
        userId: string,
        query: ReportQueryDto,
        groupBy: 'category' | 'payee'
    ): Promise<SpendingReportResponse> {
        const { budgetId, startDate, endDate, accountIds, categoryIds } = query;

        // 1. Validate budget ownership
        await this.budgetService.getBudgetById(userId, budgetId);

        // 2. Validate and parse dates
        const start = dayjs.utc(startDate).startOf('day');
        const end = dayjs.utc(endDate).endOf('day');

        if (!start.isValid() || !end.isValid() || start.isAfter(end)) {
            throw new HttpException(400, 'Invalid date range');
        }

        // 3. Construct base where clause for transactions
        const whereClause: Prisma.TransactionWhereInput = {
            budgetId: budgetId,
            date: {
                gte: start.toDate(),
                lte: end.toDate(),
            },
            isTransfer: false,
            amount: { lt: 0 }, // Only include outflows (negative amounts)
            // Exclude splits for now, sum the parent transaction amount
            // OR handle splits explicitly if needed (more complex)
            isSplit: false,
        };

        // Add optional filters
        if (accountIds && accountIds.length > 0) {
            // TODO: Validate these accounts belong to the budget/user
            whereClause.accountId = { in: accountIds };
        }
        if (categoryIds && categoryIds.length > 0 && groupBy === 'category') {
             // TODO: Validate these categories belong to the budget/user
            whereClause.categoryId = { in: categoryIds };
        }
         if (categoryIds && categoryIds.length > 0 && groupBy === 'payee') {
             // Allow filtering by category even when grouping by payee
            whereClause.categoryId = { in: categoryIds };
        }

        // 4. Perform aggregation based on groupBy
        let aggregationResult;
        let totalSpending = new Prisma.Decimal(0);

        if (groupBy === 'category') {
            aggregationResult = await prisma.transaction.groupBy({
                by: ['categoryId'],
                where: {
                    ...whereClause,
                    categoryId: { not: null } // Must have a category to group by category
                },
                _sum: { amount: true },
                _count: { id: true },
                orderBy: { _sum: { amount: 'asc' } } // Spending lowest (most negative) first
            });

            // Calculate total spending separately (groupBy doesn't give overall sum easily)
            const totalResult = await prisma.transaction.aggregate({
                where: {
                     ...whereClause,
                    categoryId: { not: null }
                },
                 _sum: { amount: true }
            });
            totalSpending = totalResult._sum.amount?.abs() ?? new Prisma.Decimal(0);

            // Fetch category names
            const catIds = aggregationResult.map(item => item.categoryId).filter(Boolean) as string[];
            const categories = await prisma.category.findMany({
                where: { id: { in: catIds } },
                select: { id: true, name: true }
            });
            const categoryMap = new Map(categories.map(c => [c.id, c.name]));

            // Format response items
            const reportItems: SpendingByCategoryItem[] = aggregationResult.map(item => {
                const sum = item._sum.amount ?? new Prisma.Decimal(0);
                const count = item._count.id ?? 0;
                return {
                    categoryId: item.categoryId!,
                    categoryName: categoryMap.get(item.categoryId!) ?? 'Unknown Category',
                    totalSpending: sum.abs(), // Report positive spending
                    transactionCount: count,
                    averageSpending: count > 0 ? sum.abs().dividedBy(count) : new Prisma.Decimal(0),
                };
            });

            return {
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                totalSpending,
                reportItems,
            };

        } else { // groupBy === 'payee'
            aggregationResult = await prisma.transaction.groupBy({
                by: ['payeeId'],
                where: whereClause,
                _sum: { amount: true },
                _count: { id: true },
                orderBy: { _sum: { amount: 'asc' } } // Spending lowest first
            });
            
             // Calculate total spending separately
            const totalResult = await prisma.transaction.aggregate({
                 where: whereClause,
                 _sum: { amount: true }
            });
            totalSpending = totalResult._sum.amount?.abs() ?? new Prisma.Decimal(0);

            // Fetch payee names
            const payeeIds = aggregationResult.map(item => item.payeeId).filter(Boolean) as string[];
            const payees = await prisma.payee.findMany({
                where: { id: { in: payeeIds } },
                select: { id: true, name: true }
            });
            const payeeMap = new Map(payees.map(p => [p.id, p.name]));

            // Format response items
             const reportItems: SpendingByPayeeItem[] = aggregationResult.map(item => {
                const sum = item._sum.amount ?? new Prisma.Decimal(0);
                const count = item._count.id ?? 0;
                return {
                    payeeId: item.payeeId,
                    payeeName: item.payeeId ? (payeeMap.get(item.payeeId) ?? 'Unknown Payee') : 'No Payee',
                    totalSpending: sum.abs(), // Report positive spending
                    transactionCount: count,
                    averageSpending: count > 0 ? sum.abs().dividedBy(count) : new Prisma.Decimal(0),
                };
            });

             return {
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                totalSpending,
                reportItems,
            };
        }
    }
    
    /**
     * Generates an Income vs. Expense report for a given period.
     */
    async getIncomeExpenseReport(
        userId: string,
        query: ReportQueryDto
    ): Promise<IncomeExpenseReportResponse> {
        const { budgetId, startDate, endDate, accountIds, categoryIds } = query;

        // 1. Validate budget ownership
        await this.budgetService.getBudgetById(userId, budgetId);

        // 2. Validate and parse dates
        const start = dayjs.utc(startDate).startOf('day');
        const end = dayjs.utc(endDate).endOf('day');

        if (!start.isValid() || !end.isValid() || start.isAfter(end)) {
            throw new HttpException(400, 'Invalid date range');
        }

        // 3. Construct base where clause (excluding transfers/splits)
        const baseWhereClause: Prisma.TransactionWhereInput = {
            budgetId: budgetId,
            date: {
                gte: start.toDate(),
                lte: end.toDate(),
            },
            isTransfer: false,
            isSplit: false, 
        };

        // Add optional filters (Apply to both income and expense calculations)
        if (accountIds && accountIds.length > 0) {
            baseWhereClause.accountId = { in: accountIds };
        }
        if (categoryIds && categoryIds.length > 0) {
             // Allow filtering income/expense by category 
            baseWhereClause.categoryId = { in: categoryIds };
        }
        
        // 4. Calculate Total Income
        const incomeResult = await prisma.transaction.aggregate({
            where: {
                ...baseWhereClause,
                amount: { gt: 0 } // Positive amounts
            },
            _sum: { amount: true }
        });
        const totalIncome = incomeResult._sum.amount ?? new Prisma.Decimal(0);

        // 5. Calculate Total Expenses
        const expenseResult = await prisma.transaction.aggregate({
            where: {
                ...baseWhereClause,
                amount: { lt: 0 } // Negative amounts
            },
             _sum: { amount: true }
        });
        // Sum is negative, make it positive for reporting
        const totalExpenses = expenseResult._sum.amount?.abs() ?? new Prisma.Decimal(0);
        
        // 6. Calculate Net Income
        const netIncome = totalIncome.minus(totalExpenses);

        // 7. Format response
        return {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            totalIncome,
            totalExpenses,
            netIncome,
        };
    }
    
    /**
     * Generates a net worth report over a specified period.
     * Calculates assets, liabilities, and net worth for each month end.
     */
    async getNetWorthReport(userId: string, query: ReportQueryDto): Promise<NetWorthReportResponse> {
        const { budgetId, startDate, endDate } = query;

        // 1. Validate Budget and Dates
        await this.budgetService.getBudgetById(userId, budgetId); // Ensures user owns budget

        const start = dayjs.utc(startDate).startOf('month');
        const end = dayjs.utc(endDate).endOf('month');

        if (!start.isValid() || !end.isValid() || start.isAfter(end)) {
            throw new HttpException(400, 'Invalid startDate or endDate');
        }

        // 2. Fetch All Accounts for the Budget
        const accounts = await prisma.account.findMany({
            where: { budgetId: budgetId },
            // Select only needed fields - no initialBalance fields exist
            select: {
                id: true,
                type: true,
            },
        });

        if (accounts.length === 0) {
            // No accounts, return empty data points for the range
             const dataPoints: NetWorthDataPoint[] = [];
             let currentMonth = start;
             while (currentMonth.isBefore(end) || currentMonth.isSame(end, 'month')) {
                 dataPoints.push({
                     date: currentMonth.format('YYYY-MM'),
                     assets: 0,
                     liabilities: 0,
                     netWorth: 0,
                 });
                 currentMonth = currentMonth.add(1, 'month');
             }
             return {
                 startDate: start.format('YYYY-MM-DD'),
                 endDate: end.format('YYYY-MM-DD'),
                 dataPoints,
             };
        }

        const accountIds = accounts.map(acc => acc.id);

        // 3. Fetch All Relevant Transactions (up to report end date)
        const transactions = await prisma.transaction.findMany({
            where: {
                accountId: { in: accountIds },
                date: {
                    // Fetch transactions up to the end date of the report period
                    lte: end.toDate(),
                },
            },
            select: {
                accountId: true,
                amount: true,
                date: true,
            },
            orderBy: {
                date: 'asc',
            },
        });

        // Group transactions by account for easier lookup
        const transactionsByAccount = transactions.reduce((acc, tx) => {
            if (!acc[tx.accountId]) {
                acc[tx.accountId] = [];
            }
            acc[tx.accountId].push(tx);
            return acc;
        }, {} as { [accountId: string]: typeof transactions });


        // 4. Calculate Net Worth for Each Month End
        const dataPoints: NetWorthDataPoint[] = [];
        let currentMonthEnd = start.endOf('month');

        while (currentMonthEnd.isBefore(end) || currentMonthEnd.isSame(end, 'month')) {
            let monthAssets = 0;
            let monthLiabilities = 0;

            for (const account of accounts) {
                // Removed initialBalance as it doesn't exist
                // const initialBalance = account.initialBalance.toNumber();
                const accountTransactions = transactionsByAccount[account.id] || [];

                // Sum transactions up to the end of the current month.
                // Balance starts at 0 and is built from all transactions.
                const endOfMonthBalance = accountTransactions
                    // Filter transactions that occurred on or before the end of the current month
                    .filter(tx => dayjs.utc(tx.date).isBefore(currentMonthEnd) || dayjs.utc(tx.date).isSame(currentMonthEnd))
                    // Removed filter based on non-existent initialBalanceDate
                    // .filter(tx => account.initialBalanceDate ? dayjs.utc(tx.date).isAfter(dayjs.utc(account.initialBalanceDate)) : true)
                    .reduce((sum, tx) => sum + tx.amount.toNumber(), 0);

                // Removed addition of initialBalance
                // const endOfMonthBalance = initialBalance + relevantTxSum;

                // Categorize and sum based on the calculated balance
                 switch (account.type) {
                    case AccountType.CHECKING:
                    case AccountType.SAVINGS:
                    case AccountType.CASH:
                    case AccountType.INVESTMENT:
                    case AccountType.OTHER_ASSET:
                        monthAssets += endOfMonthBalance;
                        break;
                    case AccountType.CREDIT_CARD:
                    case AccountType.LINE_OF_CREDIT:
                    case AccountType.MORTGAGE:
                    case AccountType.OTHER_LIABILITY:
                        // Balances are typically negative. Liabilities in report are positive.
                        monthLiabilities -= endOfMonthBalance; // Subtracting negative balance adds to positive liability total
                        break;
                }
            }

            dataPoints.push({
                date: currentMonthEnd.format('YYYY-MM'),
                assets: monthAssets,
                liabilities: monthLiabilities,
                netWorth: monthAssets - monthLiabilities,
            });

            // Move to the next month
            currentMonthEnd = currentMonthEnd.add(1, 'month').endOf('month');
        }


        // 5. Return Response
        return {
            startDate: start.format('YYYY-MM-DD'),
            endDate: end.format('YYYY-MM-DD'),
            dataPoints,
        };
    }

    /**
     * Calculates the Age of Money (AoM).
     * AoM = Current Cash Balance / Average Daily Spending (from cash accounts, excluding transfers/CC payments)
     */
    async getAgeOfMoney(userId: string, budgetId: string): Promise<AgeOfMoneyResponse> {
        // 1. Validate Budget
        await this.budgetService.getBudgetById(userId, budgetId); // Ensures user owns budget

        // 2. Identify Cash Accounts and Sum Current Balance
        const cashAccountTypes: AccountType[] = [AccountType.CHECKING, AccountType.SAVINGS, AccountType.CASH];
        const cashAccounts = await prisma.account.findMany({
            where: {
                budgetId: budgetId,
                onBudget: true,
                type: { in: cashAccountTypes },
                isClosed: false // Exclude closed accounts
            },
            select: {
                id: true,
                balance: true, // Use the current balance field
            },
        });

        const currentCashBalance = cashAccounts.reduce((sum, acc) => sum + acc.balance.toNumber(), 0);

        // If no cash or negative cash, AoM is 0
        if (currentCashBalance <= 0) {
            return { ageOfMoney: 0 };
        }

        // 3. Define Lookback Period (e.g., last 30 days)
        const lookbackDays = 30;
        const endDate = dayjs.utc(); // Today
        const startDate = endDate.subtract(lookbackDays, 'day');

        // 4. Find Credit Card Payment Category IDs
        // We need to exclude transactions categorized directly to CC payment categories
        // - Reverting to querying Category model directly
        // --- Trying relation-based filter ---
        const ccPaymentCategories = await prisma.category.findMany({
            where: {
                 categoryGroup: { // Filter by budget via the categoryGroup relation
                     budgetId: budgetId,
                 },
                // Filter based on the relation field existing
                creditCardAccount: {
                    isNot: null
                }
            },
            select: { id: true }
        });
        const ccPaymentCategoryIds = ccPaymentCategories.map(cat => cat.id);

        // 5. Fetch Recent Outflows from Cash Accounts
        const cashAccountIds = cashAccounts.map(acc => acc.id);
        if (cashAccountIds.length === 0) {
             return { ageOfMoney: null };
        }

        const recentTransactions = await prisma.transaction.findMany({
            where: {
                accountId: { in: cashAccountIds },
                date: {
                    gte: startDate.toDate(),
                    lte: endDate.toDate(),
                },
                amount: { lt: 0 },
                isTransfer: false,
                // Exclude transactions categorized with the identified CC payment category IDs
                categoryId: ccPaymentCategoryIds.length > 0
                            ? { notIn: ccPaymentCategoryIds }
                            : undefined, // If no CC payment categories, don't apply the filter
                isSplit: false,
            },
            select: {
                amount: true,
            },
        });

        // 6. Calculate Average Daily Outflow
        const totalOutflow = recentTransactions.reduce((sum, tx) => sum - tx.amount.toNumber(), 0); // Summing the positive values of outflows

        if (totalOutflow <= 0) {
            // No spending in the lookback period, AoM is effectively infinite or undefined.
             // YNAB might show the age based on the last spending date, but null is simpler here.
            return { ageOfMoney: null };
        }

        const averageDailyOutflow = totalOutflow / lookbackDays;

         if (averageDailyOutflow <= 0) {
             // Should not happen if totalOutflow > 0, but defensive check.
             return { ageOfMoney: null };
         }

        // 7. Calculate and Return AoM
        const ageOfMoney = Math.floor(currentCashBalance / averageDailyOutflow);

        return { ageOfMoney };
    }

    // --- Add methods for other reports later --- 
}

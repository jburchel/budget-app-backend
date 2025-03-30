import prisma from '../../config/prisma';
import { Account, AccountType, ClearedStatus, Prisma, Transaction, CategoryGroup, Category } from '@prisma/client'; // Explicit imports + ClearedStatus + Transaction + CategoryGroup + Category
import { CreateAccountDto, UpdateAccountDto, AccountWithCalculatedBalance } from '../interfaces/account.interface';
import { HttpException } from '../../middleware/errorHandler';
import { BudgetService } from '../../budget/services/budget.service'; // To verify budget ownership

// Interface for calculated balances
interface CalculatedBalances {
    balance: Prisma.Decimal;
    clearedBalance: Prisma.Decimal;
    unclearedBalance: Prisma.Decimal;
}

// Define AccountResponse type to include calculated balances and payment category id
export type AccountWithCalculatedBalance = Omit<Account, 'balance' | 'clearedBalance' | 'unclearedBalance'> & CalculatedBalances & { paymentCategoryId?: string | null };

// Helper function to determine default onBudget status based on type
const getDefaultOnBudgetStatus = (type: AccountType): boolean => {
  switch (type) {
    case AccountType.CHECKING:
    case AccountType.SAVINGS:
    case AccountType.CASH:
    case AccountType.CREDIT_CARD:
    case AccountType.LINE_OF_CREDIT:
      return true; // These typically affect the budget
    case AccountType.INVESTMENT:
    case AccountType.MORTGAGE:
    case AccountType.OTHER_ASSET:
    case AccountType.OTHER_LIABILITY:
      return false; // These are typically tracking accounts
    default:
      return false; // Default to false for unknown types
  }
};

export class AccountService {
  private budgetService = new BudgetService();

  /**
   * Calculate balances for a given account by summing transactions.
   */
  async calculateAccountBalances(accountId: string): Promise<CalculatedBalances> {
    // Sum all transactions for the account
    const result = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: { accountId: accountId },
    });
    const totalBalance = result._sum.amount ?? new Prisma.Decimal(0);

    // Sum only cleared/reconciled transactions
    const clearedResult = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        accountId: accountId,
        cleared: { in: [ClearedStatus.CLEARED, ClearedStatus.RECONCILED] },
      },
    });
    const clearedBalance = clearedResult._sum.amount ?? new Prisma.Decimal(0);

    // Uncleared is the difference
    const unclearedBalance = totalBalance.minus(clearedBalance);

    return {
        balance: totalBalance,
        clearedBalance: clearedBalance,
        unclearedBalance: unclearedBalance,
    };
  }

  /**
   * Get all accounts for a specific budget owned by the user, with calculated balances.
   */
  async getAllAccountsForBudget(userId: string, budgetId: string): Promise<AccountWithCalculatedBalance[]> {
    await this.budgetService.getBudgetById(userId, budgetId); // Verify budget ownership

    const accounts = await prisma.account.findMany({
      where: { budgetId: budgetId, isClosed: false },
      orderBy: { name: 'asc' },
    });

    // Calculate balances for each account
    const accountsWithBalances: AccountWithCalculatedBalance[] = [];
    for (const account of accounts) {
        const balances = await this.calculateAccountBalances(account.id);
        const { balance: _, clearedBalance: __, unclearedBalance: ___, ...rest } = account; // Omit stored balances
        accountsWithBalances.push({ ...rest, ...balances, paymentCategoryId: account.paymentCategoryId });
    }

    return accountsWithBalances;
  }

  /**
   * Get a single account by ID, with calculated balances.
   */
  async getAccountById(userId: string, accountId: string): Promise<AccountWithCalculatedBalance> {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { budget: true },
    });

    if (!account) throw new HttpException(404, 'Account not found');
    if (account.budget.userId !== userId) throw new HttpException(403, 'Forbidden: Account does not belong to user');

    const balances = await this.calculateAccountBalances(accountId);
    const { balance: _, clearedBalance: __, unclearedBalance: ___, budget, ...rest } = account; // Omit stored balances

    return { ...rest, ...balances, paymentCategoryId: account.paymentCategoryId };
  }

  /**
   * Create a new account within a specific budget.
   * If it's a CREDIT_CARD account, automatically create a linked payment category.
   */
  async createAccount(
    userId: string,
    createDto: CreateAccountDto
  ): Promise<AccountWithCalculatedBalance> {
    const { budgetId, name, type, balance: initialBalance, onBudget, note, officialName } = createDto;

    await this.budgetService.getBudgetById(userId, budgetId);
    const isOnBudget = onBudget ?? getDefaultOnBudgetStatus(type);

    const newAccountResult = await prisma.$transaction(async (tx) => {
      let account = await tx.account.create({
        data: {
          name,
          type,
          onBudget: isOnBudget,
          note,
          officialName,
          budgetId,
          balance: 0, // Default value, calculated later
          clearedBalance: 0,
          unclearedBalance: 0,
        },
      });

      // --- Auto-create Payment Category for Credit Cards --- >
      if (account.type === AccountType.CREDIT_CARD) {
        const paymentGroupName = "Credit Card Payments";
        // 1. Find or Create the Category Group
        let paymentGroup = await tx.categoryGroup.findFirst({
          where: { budgetId: budgetId, name: paymentGroupName }
        });

        if (!paymentGroup) {
          paymentGroup = await tx.categoryGroup.create({
            data: {
              budgetId: budgetId,
              name: paymentGroupName,
              // Add sortOrder if desired
            }
          });
        }

        // 2. Create the specific Payment Category
        const paymentCategory = await tx.category.create({
          data: {
            name: `${account.name} Payments`, // e.g., "Visa Payments"
            categoryGroupId: paymentGroup.id,
            // Add sortOrder if desired
          }
        });

        // 3. Link Account to the new Payment Category
        account = await tx.account.update({
          where: { id: account.id },
          data: { paymentCategoryId: paymentCategory.id }
        });
      }
      // < --- End Auto-create Payment Category ---

      // Create initial balance transaction if provided
      if (initialBalance !== undefined && !new Prisma.Decimal(initialBalance).isZero()) {
        await tx.transaction.create({
          data: {
            accountId: account.id,
            budgetId: budgetId,
            date: new Date(),
            amount: initialBalance,
            cleared: ClearedStatus.CLEARED,
            approved: true,
            memo: "Initial Balance",
          },
        });
      }
      return account; // Return the potentially updated account
    });

    // Calculate balances for the response
    const balances = await this.calculateAccountBalances(newAccountResult.id);
    const { balance: _, clearedBalance: __, unclearedBalance: ___, ...rest } = newAccountResult;

    // Include paymentCategoryId in the final returned object
    return { ...rest, ...balances, paymentCategoryId: newAccountResult.paymentCategoryId };
  }

  /**
   * Update an existing account.
   * Balances are not updated here, they are calculated.
   */
  async updateAccount(
    userId: string,
    accountId: string,
    updateDto: UpdateAccountDto
  ): Promise<AccountWithCalculatedBalance> { // Return type updated
      // ... (ownership check and dataToUpdate prep remains similar) ...
      const existingAccountDetails = await prisma.account.findUnique({ where: { id: accountId }, include: { budget: true } });
      if (!existingAccountDetails || existingAccountDetails.budget.userId !== userId) {
           throw new HttpException(403, 'Forbidden: Account does not belong to user or not found');
      }

      const { name, type, onBudget, note, officialName } = updateDto;
      const dataToUpdate: Prisma.AccountUpdateInput = {};
      if (name !== undefined) dataToUpdate.name = name;
      if (note !== undefined) dataToUpdate.note = note;
      if (officialName !== undefined) dataToUpdate.officialName = officialName;
      if (type !== undefined) {
          dataToUpdate.type = type;
          if (onBudget === undefined) {
               dataToUpdate.onBudget = getDefaultOnBudgetStatus(type);
          }
      }
      if (onBudget !== undefined) {
          dataToUpdate.onBudget = onBudget;
      }

      if (Object.keys(dataToUpdate).length === 0) {
          throw new HttpException(400, 'No update data provided');
      }

      const updatedAccount = await prisma.account.update({
          where: { id: accountId },
          data: dataToUpdate,
      });

      // Calculate balances for the response
      const balances = await this.calculateAccountBalances(accountId);
      const { balance: _, clearedBalance: __, unclearedBalance: ___, ...rest } = updatedAccount;
      return { ...rest, ...balances };
  }

  /**
   * Close an account (mark as closed).
   */
  async closeAccount(userId: string, accountId: string): Promise<AccountWithCalculatedBalance> { // Return type updated
    // ... (ownership check remains similar) ...
    const accountDetails = await prisma.account.findUnique({ where: { id: accountId }, include: { budget: true } });
     if (!accountDetails || accountDetails.budget.userId !== userId) {
         throw new HttpException(403, 'Forbidden: Account does not belong to user or not found');
    }

    // Might check calculated balance is zero here before closing
    // const balances = await this.calculateAccountBalances(accountId);
    // if (!balances.balance.isZero()) { ... }

    const closedAccount = await prisma.account.update({
      where: { id: accountId },
      data: { isClosed: true },
    });

    // Calculate balances for the response
    const balances = await this.calculateAccountBalances(accountId);
    const { balance: _, clearedBalance: __, unclearedBalance: ___, ...rest } = closedAccount;
    return { ...rest, ...balances };
  }

   /**
   * Reopen a closed account.
   */
  async reopenAccount(userId: string, accountId: string): Promise<AccountWithCalculatedBalance> { // Return type updated
    // ... (ownership check remains similar) ...
     const accountDetails = await prisma.account.findUnique({ where: { id: accountId }, include: { budget: true } });
     if (!accountDetails || accountDetails.budget.userId !== userId) {
         throw new HttpException(403, 'Forbidden: Account does not belong to user or not found');
    }

    const reopenedAccount = await prisma.account.update({
      where: { id: accountId },
      data: { isClosed: false },
    });

    // Calculate balances for the response
    const balances = await this.calculateAccountBalances(accountId);
    const { balance: _, clearedBalance: __, unclearedBalance: ___, ...rest } = reopenedAccount;
    return { ...rest, ...balances };
  }
}

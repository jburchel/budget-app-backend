import prisma from '../../config/prisma';
import { Transaction, ClearedStatus, Account, Payee, Category, SplitTransaction, Prisma, AccountType, PrismaClient } from '@prisma/client'; // Explicit imports
import { CreateTransactionDto, UpdateTransactionDto, TransactionResponse } from '../interfaces/transaction.interface';
import { HttpException } from '../../middleware/errorHandler';
import { BudgetService } from '../../budget/services/budget.service';
import { AccountService } from '../../account/services/account.service';
import { PayeeService } from './payee.service';
import { CategoryService } from '../../budget/services/category.service';
import { v4 as uuidv4 } from 'uuid'; // Import uuid

// Helper Enum for CC Adjustment logic
enum CcBudgetType {
  NONE,
  SPENDING,
  REFUND_TO_CAT,
  REFUND_TO_TBB,
  PAYMENT // Transfer to CC from Budget Account
}

export class TransactionService {
  private budgetService = new BudgetService();
  private accountService = new AccountService();
  private payeeService = new PayeeService();
  private categoryService = new CategoryService(); // Assuming CategoryService is available

  // Helper function to determine the type of CC Budget Adjustment needed
  private getCcBudgetType(
    transaction: Omit<Transaction, 'budget' | 'account'> & { account?: Account | null }, 
    account: Account | null // Pass account separately as it might be different from transaction.account in updates
  ): CcBudgetType {
    if (!account || account.type !== AccountType.CREDIT_CARD) {
      return CcBudgetType.NONE;
    }

    // @ts-ignore
    const paymentCategoryId = account.paymentCategoryId;
    if (!paymentCategoryId) { // Ignore if payment category isn't linked
        return CcBudgetType.NONE;
    }

    // Spending (Outflow with category, not payment category)
    if (!transaction.isTransfer && transaction.amount.isNegative() && transaction.categoryId && transaction.categoryId !== paymentCategoryId) {
      return CcBudgetType.SPENDING;
    }
    // Refund to Category (Inflow with category, not payment category)
    if (!transaction.isTransfer && transaction.amount.isPositive() && transaction.categoryId && transaction.categoryId !== paymentCategoryId) {
      return CcBudgetType.REFUND_TO_CAT;
    }
     // Refund to TBB (Inflow without category, or inflow to payment category itself)
    if (!transaction.isTransfer && transaction.amount.isPositive() && (!transaction.categoryId || transaction.categoryId === paymentCategoryId)) {
      return CcBudgetType.REFUND_TO_TBB;
    }
    // Payment (Transfer to this CC account)
    // We need info about the *other* account for transfers, handled separately if needed
    // This helper mainly focuses on non-transfer spending/refunds on the CC account itself
    
    return CcBudgetType.NONE;
  }

  /**
   * Handles the creation of a single or split transaction within a database transaction.
   * Creates PAIRS of transactions for transfers.
   * Enforces category rules based on account types.
   * Calls BudgetService to adjust budget entries for budgeted CC spending.
   */
  async createTransaction(userId: string, createDto: CreateTransactionDto): Promise<TransactionResponse | TransactionResponse[]> { // Can return array for transfers
    const { accountId, date, amount, payeeName, payeeId: providedPayeeId, categoryId, cleared, approved, memo, isTransfer, transferAccountId, isSplit, splits } = createDto;
    const transactionDate = date ? new Date(date) : new Date();
    const transferGroupId = isTransfer ? uuidv4() : null; // Generate group ID for transfers

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Validate Source Account and get Budget ID
      const sourceAccount = await tx.account.findUnique({ where: { id: accountId }, include: { budget: true } });
      if (!sourceAccount) throw new HttpException(404, 'Source account not found');
      if (sourceAccount.budget.userId !== userId) throw new HttpException(403, 'Forbidden: Source account does not belong to user');
      const budgetId = sourceAccount.budgetId;

      // Define year and month here for use in all budget adjustments
      const year = transactionDate.getFullYear();
      const month = transactionDate.getMonth() + 1; // JS month is 0-indexed

      let destinationAccount: Account | null = null;
      if (isTransfer) {
        // 2. Validate Destination Account for Transfers
        if (!transferAccountId) throw new HttpException(400, 'transferAccountId is required for transfers');
        if (transferAccountId === accountId) throw new HttpException(400, 'Transfer account cannot be the same as source account');
        destinationAccount = await tx.account.findUnique({ where: { id: transferAccountId } });
        if (!destinationAccount || destinationAccount.budgetId !== budgetId) {
          throw new HttpException(404, 'Transfer destination account not found or not in the same budget');
        }

        // --- Enforce Transfer Category Rules --- 
        const sourceOnBudget = sourceAccount.onBudget;
        const destOnBudget = destinationAccount.onBudget;

        if (sourceOnBudget && destOnBudget) {
          // Budget <-> Budget: No category allowed
          if (categoryId) throw new HttpException(400, 'Category cannot be assigned to transfers between two budget accounts');
        } else if (sourceOnBudget && !destOnBudget) {
          // Budget -> Tracking: Category REQUIRED (outflow from budget)
          if (!categoryId) throw new HttpException(400, 'Category is required for transfers from a budget account to a tracking account');
          // Validate category exists in budget
          const category = await tx.category.findUnique({ where: { id: categoryId }, select: { categoryGroupId: true, categoryGroup: { select: { budgetId: true } } } });
          if (!category || category.categoryGroup.budgetId !== budgetId) throw new HttpException(404, `Category ${categoryId} not found in budget ${budgetId}`);

        } else if (!sourceOnBudget && destOnBudget) {
          // Tracking -> Budget: Category OPTIONAL (inflow to budget, can be TBB or categorized)
           if (categoryId) {
              // Validate category exists in budget if provided
              const category = await tx.category.findUnique({ where: { id: categoryId }, select: { categoryGroupId: true, categoryGroup: { select: { budgetId: true } } } });
              if (!category || category.categoryGroup.budgetId !== budgetId) throw new HttpException(404, `Category ${categoryId} not found in budget ${budgetId}`);
          }
        } // else Tracking <-> Tracking: No category needed, no budget impact

      } else { // --- Non-Transfer --- 
        // 3. Determine Payee ID (Find/Create or Use Provided)
        let payeeId: string | null = providedPayeeId || null;
        if (!payeeId && payeeName) {
          const payee = await this.payeeService.findOrCreatePayeeByName(tx as Prisma.TransactionClient, budgetId, payeeName);
          payeeId = payee.id;
        } else if (!payeeId && !payeeName) {
           payeeId = null; // Allow no payee?
        }

        // 4. Validate Category ID if applicable (non-split)
        if (categoryId && !isSplit) {
          const category = await tx.category.findUnique({ where: { id: categoryId }, select: { categoryGroupId: true, categoryGroup: { select: { budgetId: true } } } });
          if (!category || category.categoryGroup.budgetId !== budgetId) {
            throw new HttpException(404, `Category ${categoryId} not found in budget ${budgetId}`);
          }
        }
         // Ensure category is not provided for split transaction header
         if (isSplit && categoryId) {
             throw new HttpException(400, 'Cannot assign category directly to a split transaction header; assign categories within splits array.')
         }
      }

      // 5. Create the transaction(s)
      const commonData = {
        budgetId,
        date: transactionDate,
        cleared: cleared ?? ClearedStatus.UNCLEARED,
        approved: approved ?? false,
        memo,
        isTransfer: isTransfer ?? false,
        transferGroupId: transferGroupId,
        isSplit: isSplit ?? false,
      };

      const transactionsToCreate: Prisma.TransactionCreateManyInput[] = [];

      if (isTransfer && destinationAccount) {
        // Create Source Transaction (Outflow from source account)
        transactionsToCreate.push({
          ...commonData,
          accountId: sourceAccount.id,
          amount: new Prisma.Decimal(amount).abs().negated(), // Ensure negative for source
          payeeId: null, // No payee for transfers
           // Category only applied if Budget -> Tracking
          categoryId: sourceAccount.onBudget && !destinationAccount.onBudget ? categoryId : null,
          transferAccountId: destinationAccount.id, // Link to other account
        });
        // Create Destination Transaction (Inflow to destination account)
        transactionsToCreate.push({
          ...commonData,
          accountId: destinationAccount.id,
          amount: new Prisma.Decimal(amount).abs(), // Ensure positive for destination
          payeeId: null,
           // Category only applied if Tracking -> Budget AND provided
          categoryId: !sourceAccount.onBudget && destinationAccount.onBudget ? categoryId : null,
          transferAccountId: sourceAccount.id, // Link back to source account
        });
      } else {
         // Create Single/Split Transaction
        let payeeId: string | null = providedPayeeId || null;
         if (!payeeId && payeeName) {
            const payee = await this.payeeService.findOrCreatePayeeByName(tx as Prisma.TransactionClient, budgetId, payeeName);
            payeeId = payee.id;
         }

        transactionsToCreate.push({
          ...commonData,
          accountId: sourceAccount.id,
          amount,
          payeeId: payeeId,
          categoryId: isSplit ? null : categoryId,
          plaidTransactionId: null, // Assuming manual transactions don't have plaid ID
        });
      }

       // Use createMany for efficiency, though it doesn't return created records directly
       // await tx.transaction.createMany({ data: transactionsToCreate });
       // We need the IDs for splits, so create individually or fetch after createMany

      const createdTransactions: Transaction[] = [];
       for (const txData of transactionsToCreate) {
           const createdTx = await tx.transaction.create({ data: txData });
           createdTransactions.push(createdTx);
       }

       const primaryTransaction = createdTransactions[0]; // The first one is the main/source

      // 6. Create Split Transactions if applicable (only for non-transfers)
      if (isSplit && !isTransfer && splits && splits.length > 0) {
          let splitTotal = new Prisma.Decimal(0);
          for (const split of splits) {
              const splitCategory = await tx.category.findUnique({ where: { id: split.categoryId }, select: { categoryGroupId: true, categoryGroup: { select: { budgetId: true } } } });
              if (!splitCategory || splitCategory.categoryGroup.budgetId !== budgetId) {
                  throw new HttpException(404, `Split Category ${split.categoryId} not found in budget ${budgetId}`);
              }
              await tx.splitTransaction.create({
                  data: {
                      transactionId: primaryTransaction.id,
                      categoryId: split.categoryId,
                      amount: split.amount,
                      memo: split.memo,
                  },
              });
              splitTotal = splitTotal.add(split.amount);
          }
          if (!splitTotal.equals(primaryTransaction.amount)) {
              throw new HttpException(400, `Split amounts (${splitTotal}) do not sum up to the total transaction amount (${primaryTransaction.amount})`);
          }
      } else if (isSplit && !isTransfer) {
          throw new HttpException(400, 'Splits array is required for split transactions');
      }

       // --- Handle Budget Adjustments for ALL CC Transactions --- >
       const account = await tx.account.findUnique({
           where: { id: primaryTransaction.accountId },
           // @ts-ignore // TODO: TS select issue
           select: { type: true, paymentCategoryId: true }
       });

       if (account?.type === AccountType.CREDIT_CARD) {
           // @ts-ignore // TODO: TS access issue
           const paymentCategoryId = account.paymentCategoryId;

           if (paymentCategoryId) {
               // Case 1: Outflow (Spending)
               if (!primaryTransaction.isTransfer && primaryTransaction.amount.isNegative() && primaryTransaction.categoryId) {
                    // @ts-ignore // TODO: TS access issue
                    if (primaryTransaction.categoryId !== paymentCategoryId) {
                         const spendingAmount = primaryTransaction.amount.abs();
                         await this.budgetService.adjustBudgetsForCreditSpending(
                             tx as Prisma.TransactionClient, budgetId, primaryTransaction.categoryId, paymentCategoryId, spendingAmount, year, month
                         );
                    }
               }
               // Case 2: Inflow (Refund/Return)
               else if (!primaryTransaction.isTransfer && primaryTransaction.amount.isPositive()) {
                   const refundAmount = primaryTransaction.amount; // Already positive
                   if (primaryTransaction.categoryId) {
                       // Refund to Category
                        // @ts-ignore // TODO: TS access issue
                       if (primaryTransaction.categoryId !== paymentCategoryId) {
                            await this.budgetService.handleCreditCardRefundToCategory(
                               tx as Prisma.TransactionClient, budgetId, primaryTransaction.categoryId, paymentCategoryId, refundAmount, year, month
                            );
                       } else {
                           // Refund directly to the payment category? Or treat as TBB? YNAB treats as TBB.
                           await this.budgetService.handleCreditCardRefundToTBB(
                                tx as Prisma.TransactionClient, budgetId, paymentCategoryId, refundAmount, year, month
                            );
                       }
                   } else {
                       // Refund to TBB
                        await this.budgetService.handleCreditCardRefundToTBB(
                            tx as Prisma.TransactionClient, budgetId, paymentCategoryId, refundAmount, year, month
                        );
                   }
               }
               // Case 3: Transfer (Payment TO Card from Budget Account)
               else if (primaryTransaction.isTransfer && destinationAccount && sourceAccount.onBudget && destinationAccount.id === primaryTransaction.accountId) {
                    // This case handled by checking the *other* transaction in the pair later
                    // We just need to ensure we fetch the right account info
               }
           }
       }
       
       // Handle Transfers TO Credit Card (CC Payments)
       if (primaryTransaction.isTransfer && destinationAccount && createdTransactions.length === 2) {
           if (sourceAccount.onBudget && destinationAccount.type === AccountType.CREDIT_CARD) {
              const ccAccount = await tx.account.findUnique({ 
                  where: { id: destinationAccount.id },
                   // @ts-ignore // TODO: TS select issue
                  select: { paymentCategoryId: true }
               });
              // @ts-ignore // TODO: TS access issue
              if (ccAccount?.paymentCategoryId) {
                  const paymentAmount = new Prisma.Decimal(amount).abs();
                  await this.budgetService.handleCreditCardPayment(
                      tx as Prisma.TransactionClient, 
                      budgetId, 
                       // @ts-ignore // TODO: TS access issue - Place ignore here
                      ccAccount.paymentCategoryId, 
                      paymentAmount, 
                      year, 
                      month
                  );
              }
           } 
        }
       // < --- End Handle Budget Adjustments ---

       // Balances are calculated dynamically, no updates needed here.

       // Return single transaction or array of the pair for transfers
       return isTransfer ? (createdTransactions as TransactionResponse[]) : (primaryTransaction as TransactionResponse);
    });
  }

  /**
   * Get transactions with filtering, sorting, pagination.
   * TODO: Implement robust filtering, sorting, pagination
   */
  async getTransactions(
      userId: string,
      budgetId: string,
      accountId?: string,
      // Add filter/sort/pagination params here
  ): Promise<TransactionResponse[]> {
      await this.budgetService.getBudgetById(userId, budgetId); // Verify budget ownership

      const whereClause: Prisma.TransactionWhereInput = {
          budgetId: budgetId,
      };
      if (accountId) {
          // Verify account belongs to user/budget
          await this.accountService.getAccountById(userId, accountId);
          whereClause.accountId = accountId;
      }

      const transactions = await prisma.transaction.findMany({
          where: whereClause,
          orderBy: { date: 'desc' }, // Default sort
          include: { payee: true, category: true, splits: true } as any, // Include related data
          // Add skip/take for pagination
      });
      return transactions as TransactionResponse[];
  }

  /**
   * Update a transaction.
   * Handles reverting old CC budget adjustments and applying new ones.
   */
  async updateTransaction(
      userId: string,
      transactionId: string,
      updateDto: UpdateTransactionDto
  ): Promise<TransactionResponse> {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingTransaction = await tx.transaction.findUnique({
          where: { id: transactionId },
          include: { budget: true, account: true }
      });

      if (!existingTransaction || !existingTransaction.account) {
          throw new HttpException(404, 'Transaction or associated account not found');
      }
      if (existingTransaction.budget.userId !== userId) throw new HttpException(403, 'Forbidden');

      const budgetId = existingTransaction.budgetId;
      const existingAccount = existingTransaction.account;
      const existingDate = new Date(existingTransaction.date);
      const existingYear = existingDate.getFullYear();
      const existingMonth = existingDate.getMonth() + 1;

      // Determine CC budget type BEFORE update
      const oldCcBudgetType = this.getCcBudgetType(existingTransaction, existingAccount);

      // Prepare update data
      // 2. Prepare update data, handle payee/category/account lookups
      const dataToUpdate: Prisma.TransactionUpdateInput = {};
      if (updateDto.date !== undefined) dataToUpdate.date = new Date(updateDto.date); // Ensure Date object
      if (updateDto.amount !== undefined) dataToUpdate.amount = updateDto.amount;
      if (updateDto.memo !== undefined) dataToUpdate.memo = updateDto.memo;
      if (updateDto.cleared !== undefined) dataToUpdate.cleared = updateDto.cleared;
      if (updateDto.approved !== undefined) dataToUpdate.approved = updateDto.approved;

      // Handle Payee change
      if (updateDto.payeeId !== undefined || updateDto.payeeName !== undefined) {
          let newPayeeId: string | null = updateDto.payeeId || null;
          if (!newPayeeId && updateDto.payeeName) {
              const payee = await this.payeeService.findOrCreatePayeeByName(tx as Prisma.TransactionClient, budgetId, updateDto.payeeName);
              newPayeeId = payee.id;
          } else if (!newPayeeId && !updateDto.payeeName) {
               newPayeeId = null; // Allow clearing payee
          }
          dataToUpdate.payee = { connect: { id: newPayeeId! } }; // Assumes not null if provided
      }

      // Handle Category change (only if not split)
      if (!existingTransaction.isSplit && updateDto.categoryId !== undefined) {
          if (updateDto.categoryId) { // If setting a category
               const category = await tx.category.findUnique({ where: { id: updateDto.categoryId }, include: { categoryGroup: true }});
              if (!category || category.categoryGroup.budgetId !== budgetId) {
                  throw new HttpException(404, `Category ${updateDto.categoryId} not found in budget ${budgetId}`);
              }
              dataToUpdate.category = { connect: { id: updateDto.categoryId } };
          } else { // If clearing the category
              dataToUpdate.category = { disconnect: true };
          }
      }

       // Handle Account change
       let newAccountId = existingTransaction.accountId;
       let finalAccount: Account | null = existingAccount;
       if (updateDto.accountId !== undefined && updateDto.accountId !== existingTransaction.accountId) {
           const potentiallyNewAccount = await tx.account.findUnique({ 
               where: { id: updateDto.accountId },
            }); 
           // @ts-ignore // TODO: TS validation issue with potentiallyNewAccount type
           if (!potentiallyNewAccount || potentiallyNewAccount.budgetId !== budgetId) {
               throw new HttpException(403, 'Forbidden: New account invalid or does not belong to user budget');
           }
           newAccountId = potentiallyNewAccount.id;
           finalAccount = potentiallyNewAccount; 
           dataToUpdate.account = { connect: { id: newAccountId } };
       }

      // Disallow changing split/transfer status via this generic update for simplicity
      if (updateDto.amount !== undefined && existingTransaction.isSplit) {
          throw new HttpException(400, 'Cannot change total amount of a split transaction via this endpoint. Update splits directly.');
      }

      // 3. Apply the update
      const updatedTransaction = await tx.transaction.update({
          where: { id: transactionId },
          data: dataToUpdate
      });
      
      // 4. Determine CC budget type AFTER update
      // @ts-ignore // TODO: TS validation issue with finalAccount type
      const newCcBudgetType = this.getCcBudgetType(updatedTransaction, finalAccount);
      const finalDate = new Date(updatedTransaction.date);
      const finalYear = finalDate.getFullYear();
      const finalMonth = finalDate.getMonth() + 1;

      // 5. Revert OLD budget adjustment if necessary
      if (oldCcBudgetType !== CcBudgetType.NONE && existingAccount) {
          // @ts-ignore
          const oldPaymentCategoryId = existingAccount.paymentCategoryId;
          if (oldPaymentCategoryId) {
              const oldAmount = existingTransaction.amount.abs(); // Use absolute value
              
              if (oldCcBudgetType === CcBudgetType.SPENDING) {
                  await this.budgetService.revertBudgetAdjustmentForCreditSpending(
                      tx as Prisma.TransactionClient, budgetId, existingTransaction.categoryId!, oldPaymentCategoryId, oldAmount, existingYear, existingMonth
                  );
              } else if (oldCcBudgetType === CcBudgetType.REFUND_TO_CAT) {
                  await this.budgetService.revertCreditCardRefundToCategory(
                      tx as Prisma.TransactionClient, budgetId, existingTransaction.categoryId!, oldPaymentCategoryId, oldAmount, existingYear, existingMonth
                  );
              } else if (oldCcBudgetType === CcBudgetType.REFUND_TO_TBB) {
                   await this.budgetService.revertCreditCardRefundToTBB(
                      tx as Prisma.TransactionClient, budgetId, oldPaymentCategoryId, oldAmount, existingYear, existingMonth
                  );
              }
              // TODO: Handle reverting CC Payment (Transfer) if transfer logic is updated here later
          }
      }
      
       // 6. Apply NEW budget adjustment if necessary
       if (newCcBudgetType !== CcBudgetType.NONE && finalAccount) {
            // @ts-ignore // Ignore for paymentCategoryId access
            const newPaymentCategoryId = finalAccount.paymentCategoryId;
            if (newPaymentCategoryId) {
                const newAmount = updatedTransaction.amount.abs(); // Use absolute value
                
                if (newCcBudgetType === CcBudgetType.SPENDING) {
                    await this.budgetService.adjustBudgetsForCreditSpending(
                        tx as Prisma.TransactionClient, budgetId, updatedTransaction.categoryId!, newPaymentCategoryId, newAmount, finalYear, finalMonth
                    );
                } else if (newCcBudgetType === CcBudgetType.REFUND_TO_CAT) {
                     await this.budgetService.handleCreditCardRefundToCategory(
                        tx as Prisma.TransactionClient, budgetId, updatedTransaction.categoryId!, newPaymentCategoryId, newAmount, finalYear, finalMonth
                    );
                } else if (newCcBudgetType === CcBudgetType.REFUND_TO_TBB) {
                     await this.budgetService.handleCreditCardRefundToTBB(
                        tx as Prisma.TransactionClient, budgetId, newPaymentCategoryId, newAmount, finalYear, finalMonth
                    );
                }
                 // TODO: Handle applying CC Payment (Transfer) if transfer logic is updated here later
            }
        }

      return updatedTransaction as TransactionResponse;
    });
  }

  /**
   * Delete a transaction.
   * If it's a transfer, deletes the paired transaction as well.
   * If it was budgeted CC spending, reverts the budget adjustment.
   */
  async deleteTransaction(userId: string, transactionId: string): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingTransaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { budget: true, account: true } // Include full account object
      });

      if (!existingTransaction) throw new HttpException(404, 'Transaction not found');
      if (existingTransaction.budget.userId !== userId) throw new HttpException(403, 'Forbidden: Transaction does not belong to user');

      // Find paired transaction ID BEFORE reverting budget adjustments
      let pairedTransactionId: string | null = null;
      if (existingTransaction.isTransfer && existingTransaction.transferGroupId) {
        const paired = await tx.transaction.findFirst({ 
          where: { transferGroupId: existingTransaction.transferGroupId, id: { not: transactionId } },
          select: { id: true }
        });
        pairedTransactionId = paired?.id || null;
      }
      const idsToDelete = [transactionId];
      if(pairedTransactionId) idsToDelete.push(pairedTransactionId);

      const transactionDate = new Date(existingTransaction.date);
      const year = transactionDate.getFullYear();
      const month = transactionDate.getMonth() + 1;

      // --- Revert Budget Adjustments (BEFORE DELETE) --- >
      const account1 = existingTransaction.account;
      const account2 = pairedTransactionId ? await tx.account.findUnique({ 
          where: { id: existingTransaction.transferAccountId! },
           // @ts-ignore // TODO: TS select issue
          select: { id:true, type: true, onBudget: true, paymentCategoryId: true }
       }) : null;

      // Case 1: Revert CC Spending (Outflow)
      if (!existingTransaction.isTransfer && account1?.type === AccountType.CREDIT_CARD && existingTransaction.amount.isNegative() && existingTransaction.categoryId) {
          // @ts-ignore
          const paymentCategoryId = account1.paymentCategoryId;
           // @ts-ignore
          if (paymentCategoryId && existingTransaction.categoryId !== paymentCategoryId) {
               const spendingAmount = existingTransaction.amount.abs();
               await this.budgetService.revertBudgetAdjustmentForCreditSpending(
                   tx as Prisma.TransactionClient, existingTransaction.budgetId, existingTransaction.categoryId, paymentCategoryId, spendingAmount, year, month
               );
          }
      }
      // Case 2: Revert CC Refund (Inflow)
      else if (!existingTransaction.isTransfer && account1?.type === AccountType.CREDIT_CARD && existingTransaction.amount.isPositive()) {
          // @ts-ignore
          const paymentCategoryId = account1.paymentCategoryId;
          if (paymentCategoryId) {
              const refundAmount = existingTransaction.amount; // Positive
              if (existingTransaction.categoryId) {
                  // Refund to Category
                   // @ts-ignore
                  if (existingTransaction.categoryId !== paymentCategoryId) {
                       await this.budgetService.revertCreditCardRefundToCategory(
                          tx as Prisma.TransactionClient, existingTransaction.budgetId, existingTransaction.categoryId, paymentCategoryId, refundAmount, year, month
                       );
                  } else {
                       await this.budgetService.revertCreditCardRefundToTBB(
                           tx as Prisma.TransactionClient, existingTransaction.budgetId, paymentCategoryId, refundAmount, year, month
                       );
                  }
              } else {
                  // Refund to TBB
                   await this.budgetService.revertCreditCardRefundToTBB(
                       tx as Prisma.TransactionClient, existingTransaction.budgetId, paymentCategoryId, refundAmount, year, month
                   );
              }
          }
      }
      // Case 3: Revert CC Payment (Transfer)
      else if (existingTransaction.isTransfer && account1 && account2) {
           let paymentAmount = existingTransaction.amount.abs();
           let paymentCategoryId: string | null = null;
           if (account1.type === AccountType.CREDIT_CARD && account2.onBudget) { // Deleting inflow TO CC
                // @ts-ignore
                 paymentCategoryId = account1.paymentCategoryId;
           } else if (account1.onBudget && account2.type === AccountType.CREDIT_CARD) { // Deleting outflow FROM budget
                 // @ts-ignore
                 paymentCategoryId = account2.paymentCategoryId;
           }
           if (paymentCategoryId) {
               await this.budgetService.revertCreditCardPayment(
                  tx as Prisma.TransactionClient, existingTransaction.budgetId, paymentCategoryId, paymentAmount, year, month
              );
           }
      }
      // < --- End Revert Budget Adjustments ---

      // Delete splits for all transactions being deleted
      await tx.splitTransaction.deleteMany({ where: { transactionId: { in: idsToDelete } } });

      // Delete the transaction(s)
      await tx.transaction.deleteMany({ where: { id: { in: idsToDelete } } });
    });
  }

}

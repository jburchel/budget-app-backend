import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/transaction.service';
import { CreateTransactionDto, UpdateTransactionDto } from '../interfaces/transaction.interface';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

export class TransactionController {
  private transactionService = new TransactionService();

  // POST /transactions
  createTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const createDto: CreateTransactionDto = req.body;

      // Basic validation (more specific validation done in service)
      if (!createDto.accountId || !createDto.date || createDto.amount === undefined) {
        res.status(400).json({ message: 'Missing required fields: accountId, date, amount' });
        return;
      }

      const newTransaction = await this.transactionService.createTransaction(userId, createDto);
      res.status(201).json(newTransaction);
    } catch (error) {
      next(error);
    }
  };

  // GET /transactions?budgetId=...&accountId=...
  getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const budgetId = req.query.budgetId as string;
      const accountId = req.query.accountId as string | undefined;

      if (!budgetId) {
          res.status(400).json({ message: 'budgetId query parameter is required' });
          return;
      }
      // Add validation/parsing for other query params (filter, sort, pagination) later

      const transactions = await this.transactionService.getTransactions(userId, budgetId, accountId);
      res.status(200).json(transactions);
    } catch (error) {
      next(error);
    }
  };

  // PUT /transactions/:transactionId
  updateTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { transactionId } = req.params;
      const updateDto: UpdateTransactionDto = req.body;

      if (Object.keys(updateDto).length === 0) {
        res.status(400).json({ message: 'Request body cannot be empty' });
        return;
      }

      const updatedTransaction = await this.transactionService.updateTransaction(userId, transactionId, updateDto);
      res.status(200).json(updatedTransaction);
    } catch (error) {
      next(error);
    }
  };

  // DELETE /transactions/:transactionId
  deleteTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { transactionId } = req.params;
      await this.transactionService.deleteTransaction(userId, transactionId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

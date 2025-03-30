import { Request, Response, NextFunction } from 'express';
import { AccountService } from '../services/account.service';
import { CreateAccountDto, UpdateAccountDto } from '../interfaces/account.interface';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

export class AccountController {
  private accountService = new AccountService();

  // Assumes budgetId is available, e.g., from a parent router or query param
  // GET /accounts?budgetId=...
  getAllAccounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      // Get budgetId from query parameter for this structure
      const budgetId = req.query.budgetId as string;
      if (!budgetId) {
        res.status(400).json({ message: 'budgetId query parameter is required' });
        return;
      }
      const accounts = await this.accountService.getAllAccountsForBudget(userId, budgetId);
      res.status(200).json(accounts);
    } catch (error) {
      next(error);
    }
  };

  // GET /accounts/:accountId
  getAccountById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { accountId } = req.params;
      const account = await this.accountService.getAccountById(userId, accountId);
      res.status(200).json(account);
    } catch (error) {
      next(error);
    }
  };

  // POST /accounts
  createAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const createDto: CreateAccountDto = req.body;

      // Basic validation
      if (!createDto.name || !createDto.type || !createDto.budgetId) {
        res.status(400).json({ message: 'Missing required fields: name, type, budgetId' });
        return;
      }
      // TODO: Validate AccountType enum

      const newAccount = await this.accountService.createAccount(userId, createDto);
      res.status(201).json(newAccount);
    } catch (error) {
      next(error);
    }
  };

  // PUT /accounts/:accountId
  updateAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { accountId } = req.params;
      const updateDto: UpdateAccountDto = req.body;

      if (Object.keys(updateDto).length === 0) {
        res.status(400).json({ message: 'Request body cannot be empty' });
        return;
      }
      // TODO: Validate AccountType enum if provided

      const updatedAccount = await this.accountService.updateAccount(userId, accountId, updateDto);
      res.status(200).json(updatedAccount);
    } catch (error) {
      next(error);
    }
  };

  // POST /accounts/:accountId/close (Using POST for action)
  closeAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { accountId } = req.params;
      const closedAccount = await this.accountService.closeAccount(userId, accountId);
      res.status(200).json(closedAccount);
    } catch (error) {
      next(error);
    }
  };

   // POST /accounts/:accountId/reopen (Using POST for action)
  reopenAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { accountId } = req.params;
      const reopenedAccount = await this.accountService.reopenAccount(userId, accountId);
      res.status(200).json(reopenedAccount);
    } catch (error) {
      next(error);
    }
  };

  // POST /accounts/:accountId/reconcile/start
  startReconciliation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = (req.user as AuthenticatedUser).id;
        const { accountId } = req.params;
        const { statementBalance } = req.body; // Expect statement balance in body

        if (statementBalance === undefined || typeof statementBalance !== 'number') {
            res.status(400).json({ message: 'statementBalance (number) is required in request body' });
            return;
        }

        const result = await this.accountService.startReconciliation(userId, accountId, statementBalance);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
  };

  // POST /accounts/:accountId/reconcile/finish
  finishReconciliation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
          const userId = (req.user as AuthenticatedUser).id;
          const { accountId } = req.params;

          // Logic assumes frontend has verified balances match before calling finish.
          // Could add a check here comparing statementBalance (passed again?) vs calculated cleared balance.

          const result = await this.accountService.finishReconciliation(userId, accountId);
          res.status(200).json(result);
      } catch (error) {
          next(error);
      }
  };

}

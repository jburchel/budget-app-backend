import { Request, Response, NextFunction } from 'express';
import { PayeeService } from '../services/payee.service';
import { UpdatePayeeDto } from '../interfaces/payee.interface';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

export class PayeeController {
  private payeeService = new PayeeService();

  // GET /payees?budgetId=...
  getAllPayees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const budgetId = req.query.budgetId as string;
      if (!budgetId) {
        res.status(400).json({ message: 'budgetId query parameter is required' });
        return;
      }
      const payees = await this.payeeService.getAllPayees(userId, budgetId);
      res.status(200).json(payees);
    } catch (error) {
      next(error);
    }
  };

  // GET /payees/:payeeId
  getPayeeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { payeeId } = req.params;
      const payee = await this.payeeService.getPayeeById(userId, payeeId);
      res.status(200).json(payee);
    } catch (error) {
      next(error);
    }
  };

  // PUT /payees/:payeeId
  updatePayee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { payeeId } = req.params;
      const updateDto: UpdatePayeeDto = req.body;

      if (!updateDto.name) {
        res.status(400).json({ message: 'Payee name is required' });
        return;
      }

      const updatedPayee = await this.payeeService.updatePayee(userId, payeeId, updateDto);
      res.status(200).json(updatedPayee);
    } catch (error) {
      next(error);
    }
  };

  // DELETE is omitted for now
}

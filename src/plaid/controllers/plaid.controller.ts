import { Request, Response, NextFunction } from 'express';
import { PlaidService } from '../services/plaid.service';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

export class PlaidController {
  private plaidService = new PlaidService();

  // POST /plaid/create_link_token
  createLinkToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const linkToken = await this.plaidService.createLinkToken(userId);
      res.status(200).json({ link_token: linkToken });
    } catch (error) {
      next(error);
    }
  };

  // POST /plaid/exchange_public_token
  exchangePublicToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      const { public_token } = req.body;

      if (!public_token) {
        res.status(400).json({ message: 'public_token is required' });
        return;
      }

      const result = await this.plaidService.exchangePublicToken(userId, public_token);
      res.status(200).json({
          message: 'Public token exchanged successfully',
          itemId: result.itemId,
          institutionName: result.institutionName
        });
    } catch (error) {
      next(error);
    }
  };

  // POST /plaid/sync_transactions
  syncTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req.user as AuthenticatedUser).id;
      // Expect the plaid item ID in the request body or params
      const { itemId } = req.body; // Or req.params if route is /plaid/items/:itemId/sync

      if (!itemId) {
        res.status(400).json({ message: 'itemId is required' });
        return;
      }

      const syncResult = await this.plaidService.syncTransactions(userId, itemId);
      res.status(200).json({
        message: `Sync completed for item ${itemId}`,
        added: syncResult.added,
        modified: syncResult.modified,
        removed: syncResult.removed,
        nextCursor: syncResult.nextCursor,
      });
    } catch (error) {
      next(error);
    }
  };

  // TODO: Add controllers for webhooks, etc.
}

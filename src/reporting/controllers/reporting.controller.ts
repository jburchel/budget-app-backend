import { Request, Response, NextFunction } from 'express';
import { ReportingService } from '../services/reporting.service';
import { ReportQueryDto, IncomeExpenseReportResponse, NetWorthReportResponse, AgeOfMoneyResponse } from '../interfaces/reporting.interface';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import dayjs from 'dayjs';
import { HttpException } from '../../middleware/errorHandler';

export class ReportingController {
    private reportingService = new ReportingService();

    /**
     * GET /spending
     * Generates a spending report grouped by category or payee.
     */
    getSpendingReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as AuthenticatedUser).id;

            // Extract and validate query parameters
            const { budgetId, startDate, endDate, accountIds, categoryIds, groupBy } = req.query;

            if (!budgetId || typeof budgetId !== 'string') {
                throw new HttpException(400, 'Missing or invalid budgetId query parameter');
            }
            if (!startDate || typeof startDate !== 'string' || !dayjs(startDate).isValid()) {
                throw new HttpException(400, 'Missing or invalid startDate query parameter (use YYYY-MM-DD format)');
            }
            if (!endDate || typeof endDate !== 'string' || !dayjs(endDate).isValid()) {
                throw new HttpException(400, 'Missing or invalid endDate query parameter (use YYYY-MM-DD format)');
            }
            if (groupBy !== 'category' && groupBy !== 'payee') {
                throw new HttpException(400, 'Invalid groupBy query parameter. Must be \'category\' or \'payee\'.');
            }

            // Prepare DTO (handle optional array parameters)
            const queryDto: ReportQueryDto = {
                budgetId,
                startDate,
                endDate,
                accountIds: typeof accountIds === 'string' ? [accountIds] : (Array.isArray(accountIds) ? accountIds as string[] : undefined),
                categoryIds: typeof categoryIds === 'string' ? [categoryIds] : (Array.isArray(categoryIds) ? categoryIds as string[] : undefined),
            };

            const reportData = await this.reportingService.getSpendingReport(userId, queryDto, groupBy);
            res.status(200).json(reportData);

        } catch (error) {
            next(error);
        }
    };
    
    /**
     * GET /income-expense
     * Generates an income vs. expense report.
     */
    getIncomeExpenseReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as AuthenticatedUser).id;

            // Extract and validate query parameters
            const { budgetId, startDate, endDate, accountIds, categoryIds } = req.query;

            if (!budgetId || typeof budgetId !== 'string') {
                throw new HttpException(400, 'Missing or invalid budgetId query parameter');
            }
             if (!startDate || typeof startDate !== 'string' || !dayjs(startDate).isValid()) {
                throw new HttpException(400, 'Missing or invalid startDate query parameter (use YYYY-MM-DD format)');
            }
             if (!endDate || typeof endDate !== 'string' || !dayjs(endDate).isValid()) {
                throw new HttpException(400, 'Missing or invalid endDate query parameter (use YYYY-MM-DD format)');
            }
            
            // Prepare DTO 
            const queryDto: ReportQueryDto = {
                budgetId,
                startDate,
                endDate,
                accountIds: typeof accountIds === 'string' ? [accountIds] : (Array.isArray(accountIds) ? accountIds as string[] : undefined),
                categoryIds: typeof categoryIds === 'string' ? [categoryIds] : (Array.isArray(categoryIds) ? categoryIds as string[] : undefined),
            };

            const reportData: IncomeExpenseReportResponse = await this.reportingService.getIncomeExpenseReport(userId, queryDto);
            res.status(200).json(reportData);

        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /net-worth
     * Generates a net worth report over time.
     */
    getNetWorthReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as AuthenticatedUser).id;

            // Extract and validate query parameters
            const { budgetId, startDate, endDate } = req.query;

            if (!budgetId || typeof budgetId !== 'string') {
                throw new HttpException(400, 'Missing or invalid budgetId query parameter');
            }
            if (!startDate || typeof startDate !== 'string' || !dayjs(startDate).isValid()) {
                throw new HttpException(400, 'Missing or invalid startDate query parameter (use YYYY-MM-DD format)');
            }
            if (!endDate || typeof endDate !== 'string' || !dayjs(endDate).isValid()) {
                throw new HttpException(400, 'Missing or invalid endDate query parameter (use YYYY-MM-DD format)');
            }

            // Prepare DTO (ignoring optional account/category filters for this report)
            const queryDto: ReportQueryDto = {
                budgetId,
                startDate,
                endDate,
                // accountIds and categoryIds are not typically used for Net Worth, but could be added later if needed
            };

            const reportData: NetWorthReportResponse = await this.reportingService.getNetWorthReport(userId, queryDto);
            res.status(200).json(reportData);

        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /age-of-money
     * Calculates the Age of Money (AoM) for the budget.
     */
    getAgeOfMoney = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = (req.user as AuthenticatedUser).id;
            const { budgetId } = req.query; // Only budgetId is needed from query

            if (!budgetId || typeof budgetId !== 'string') {
                throw new HttpException(400, 'Missing or invalid budgetId query parameter');
            }

            // No other query parameters needed for AoM calculation itself

            const reportData: AgeOfMoneyResponse = await this.reportingService.getAgeOfMoney(userId, budgetId);
            res.status(200).json(reportData);

        } catch (error) {
            next(error);
        }
    };

    // --- Add controller methods for other reports later --- 
}

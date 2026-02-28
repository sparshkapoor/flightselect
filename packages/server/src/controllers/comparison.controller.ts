import { Request, Response, NextFunction } from 'express';
import { comparisonService } from '../services/comparison.service';
import { AppError } from '../middleware/error.middleware';

export class ComparisonController {
  async getComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await comparisonService.getComparison(req.params.id);
      if (!result) throw new AppError(404, `Comparison not found: ${req.params.id}`);
      res.json({ status: 'ok', data: result });
    } catch (error) {
      next(error);
    }
  }

  async getComparisonsByQuery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { searchQueryId } = req.query as { searchQueryId?: string };
      if (!searchQueryId) throw new AppError(400, 'searchQueryId query param is required');
      const comparisons = await comparisonService.getComparisonsByQuery(searchQueryId);
      res.json({ status: 'ok', data: comparisons });
    } catch (error) {
      next(error);
    }
  }
}

export const comparisonController = new ComparisonController();

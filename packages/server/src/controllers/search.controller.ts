import { Request, Response, NextFunction } from 'express';
import { searchService } from '../services/search.service';
import { AppError } from '../middleware/error.middleware';

export class SearchController {
  async createSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await searchService.createSearch(req.body);
      res.status(202).json({
        status: 'accepted',
        ...result,
        message: 'Search queued. Poll GET /search/:id for results.',
      });
    } catch (error) {
      next(error);
    }
  }

  async getSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await searchService.getSearch(id);
      if (!result) {
        throw new AppError(404, `Search query not found: ${id}`);
      }
      res.json({ status: 'ok', data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const searchController = new SearchController();

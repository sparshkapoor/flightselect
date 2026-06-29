import { Request, Response, NextFunction } from 'express';
import { getBookingOptions, getBookingOptionsBatch } from '../services/bookingOptions.service';
import { AppError } from '../middleware/error.middleware';

export const bookingOptionsController = {
  async getBookingOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await getBookingOptions(id);
      res.json({ status: 'ok', ...result });
    } catch (err) {
      next(err);
    }
  },

  async getBookingOptionsBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { flightIds } = req.body as { flightIds?: unknown };
      if (!Array.isArray(flightIds) || flightIds.length === 0 || !flightIds.every((id) => typeof id === 'string')) {
        throw new AppError(400, 'flightIds must be a non-empty array of strings');
      }
      const data = await getBookingOptionsBatch(flightIds);
      res.json({ status: 'ok', data });
    } catch (err) {
      next(err);
    }
  },
};

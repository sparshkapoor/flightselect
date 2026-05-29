import { Request, Response, NextFunction } from 'express';
import { getBookingOptions } from '../services/bookingOptions.service';

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
};

import { Request, Response, NextFunction } from 'express';
import { flightService } from '../services/flight.service';
import { AppError } from '../middleware/error.middleware';

export class FlightsController {
  async getFlights(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { searchQueryId } = req.query as { searchQueryId?: string };
      const flights = await flightService.getFlights(searchQueryId);
      res.json({ status: 'ok', data: flights, total: flights.length });
    } catch (error) {
      next(error);
    }
  }

  async getFlightById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const flight = await flightService.getFlightById(req.params.id);
      if (!flight) throw new AppError(404, `Flight not found: ${req.params.id}`);
      res.json({ status: 'ok', data: flight });
    } catch (error) {
      next(error);
    }
  }
}

export const flightsController = new FlightsController();

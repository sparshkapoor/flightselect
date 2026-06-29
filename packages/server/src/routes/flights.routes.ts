import { Router } from 'express';
import { flightsController } from '../controllers/flights.controller';
import { bookingOptionsController } from '../controllers/bookingOptions.controller';
import { serpApiRateLimit, createSerpApiRateLimit } from '../middleware/serpApiRateLimit.middleware';

const router = Router();
const bookingOptionsRateLimit = createSerpApiRateLimit(5, 'serpapi:booking');

router.get('/', (req, res, next) => flightsController.getFlights(req, res, next));
router.get('/:id/booking-options', bookingOptionsRateLimit, (req, res, next) =>
  bookingOptionsController.getBookingOptions(req, res, next)
);
router.get('/:id', (req, res, next) => flightsController.getFlightById(req, res, next));

export default router;

import { Router } from 'express';
import { flightsController } from '../controllers/flights.controller';

const router = Router();

router.get('/', (req, res, next) => flightsController.getFlights(req, res, next));
router.get('/:id', (req, res, next) => flightsController.getFlightById(req, res, next));

export default router;

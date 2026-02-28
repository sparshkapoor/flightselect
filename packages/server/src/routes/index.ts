import { Router } from 'express';
import healthRoutes from './health.routes';
import searchRoutes from './search.routes';
import flightsRoutes from './flights.routes';
import comparisonRoutes from './comparison.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/search', searchRoutes);
router.use('/flights', flightsRoutes);
router.use('/comparison', comparisonRoutes);
router.use('/users', userRoutes);

export default router;

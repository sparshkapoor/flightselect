import { Router } from 'express';
import { comparisonController } from '../controllers/comparison.controller';

const router = Router();

router.get('/', (req, res, next) => comparisonController.getComparisonsByQuery(req, res, next));
router.get('/:id', (req, res, next) => comparisonController.getComparison(req, res, next));

export default router;

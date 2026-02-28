import { Router } from 'express';
import { searchController } from '../controllers/search.controller';
import { validateBody } from '../middleware/validation.middleware';
import { SearchRequestSchema } from '@flightselect/shared';
import { searchRateLimit } from '../middleware/rateLimit.middleware';

const router = Router();

router.post('/', searchRateLimit, validateBody(SearchRequestSchema), (req, res, next) =>
  searchController.createSearch(req, res, next)
);

router.get('/:id', (req, res, next) => searchController.getSearch(req, res, next));

export default router;

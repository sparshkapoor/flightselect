import { Router } from 'express';
import { searchController } from '../controllers/search.controller';
import { validateBody } from '../middleware/validation.middleware';
import { SearchRequestSchema } from '@flightselect/shared';
import { searchRateLimit } from '../middleware/rateLimit.middleware';
import { serpApiRateLimit, getRateLimitStatus } from '../middleware/serpApiRateLimit.middleware';

const router = Router();

// Rate limit status endpoint (no rate limiting on this GET)
router.get('/rate-limit', getRateLimitStatus);

// POST /search — per-client sliding window (1/60s) + global monthly cap (225) + basic rate limit
router.post('/', searchRateLimit, serpApiRateLimit, validateBody(SearchRequestSchema), (req, res, next) =>
  searchController.createSearch(req, res, next)
);

router.get('/:id', (req, res, next) => searchController.getSearch(req, res, next));

export default router;

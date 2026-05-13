import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validation.middleware';
import { queryRag } from '../services/rag.service';

const router = Router();

const RagQuerySchema = z.object({
  question: z.string().min(1).max(500).trim(),
  nResults: z.number().int().min(1).max(20).optional(),
  mode: z.enum(['general', 'comparison']).optional().default('general'),
});

router.post('/query', validateBody(RagQuerySchema), async (req, res, next) => {
  try {
    const { question, nResults, mode } = req.body as z.infer<typeof RagQuerySchema>;
    const answer = await queryRag(question, nResults, mode);
    if (!answer) {
      res.status(503).json({ status: 'error', message: 'RAG service unavailable' });
      return;
    }
    res.json({ status: 'ok', answer });
  } catch (err) {
    next(err);
  }
});

export default router;

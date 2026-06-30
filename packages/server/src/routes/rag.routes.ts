import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validation.middleware';
import { queryRag, queryKnowledge } from '../services/rag.service';

const router = Router();

const RagQuerySchema = z.object({
  question: z.string().min(1).max(500).trim(),
  nResults: z.number().int().min(1).max(20).optional(),
  mode: z.enum(['general', 'comparison']).optional().default('general'),
  origin: z.string().trim().min(1).max(10).optional(),
  destination: z.string().trim().min(1).max(10).optional(),
});

const RagKnowledgeSchema = z.object({
  itinerarySummary: z.string().min(1).max(500).trim(),
  airlines: z.array(z.string().trim().min(1).max(60)).max(20).optional().default([]),
});

router.post('/query', validateBody(RagQuerySchema), async (req, res, next) => {
  try {
    const { question, nResults, mode, origin, destination } = req.body as z.infer<typeof RagQuerySchema>;
    const answer = await queryRag(question, nResults, mode, origin, destination);
    if (!answer) {
      res.status(503).json({ status: 'error', message: 'RAG service unavailable' });
      return;
    }
    res.json({ status: 'ok', answer });
  } catch (err) {
    next(err);
  }
});

router.post('/knowledge', validateBody(RagKnowledgeSchema), async (req, res, next) => {
  try {
    const { itinerarySummary, airlines } = req.body as z.infer<typeof RagKnowledgeSchema>;
    const insight = await queryKnowledge(itinerarySummary, airlines);
    if (!insight || insight.answer.trim().toLowerCase() === 'insufficient data') {
      res.status(503).json({ status: 'error', message: 'No knowledge available' });
      return;
    }
    res.json({ status: 'ok', ...insight });
  } catch (err) {
    next(err);
  }
});

export default router;

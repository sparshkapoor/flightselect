import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { errorMiddleware } from './middleware/error.middleware';
import { apiRateLimit } from './middleware/rateLimit.middleware';
import routes from './routes';
import { logger } from './utils/logger';
import { createSearchWorker } from './jobs/queue';
import { processSearchJob } from './jobs/search.job';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

app.use('/api', apiRateLimit, routes);

app.use(errorMiddleware);

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();

    try {
      await createSearchWorker((job) => processSearchJob(job.data as { searchQueryId: string }));
      logger.info('Search worker started');
    } catch (workerError) {
      logger.warn({ err: workerError }, 'Search worker failed to start — searches will process directly without queue');
    }

    app.listen(parseInt(env.PORT), () => {
      logger.info(`FlightSelect server running on port ${env.PORT} (${env.NODE_ENV})`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();

export default app;

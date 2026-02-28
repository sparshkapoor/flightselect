import { Queue, Worker, QueueEvents } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const redisConnection = {
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port || '6379'),
};

export const searchQueue = new Queue('flight-search', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const comparisonQueue = new Queue('flight-comparison', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const searchQueueEvents = new QueueEvents('flight-search', {
  connection: redisConnection,
});

export async function createSearchWorker(
  processor: (job: { data: unknown }) => Promise<void>
): Promise<Worker> {
  const worker = new Worker('flight-search', processor, {
    connection: redisConnection,
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    logger.info(`Search job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Search job ${job?.id} failed:`, err);
  });

  return worker;
}

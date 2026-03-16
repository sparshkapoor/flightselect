import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  AI_SERVICE_API_KEY: z.string().optional(),
  AI_SERVICE_MODEL: z.string().default('claude-3-opus-20240229'),
  AMADEUS_API_KEY: z.string().optional(),
  AMADEUS_API_SECRET: z.string().optional(),
  SERPAPI_API_KEY: z.string().optional(),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('Invalid environment variables:', parseResult.error.flatten());
  process.exit(1);
}

export const env = parseResult.data;

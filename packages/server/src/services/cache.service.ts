import { redis } from '../config/redis';
import { logger } from '../utils/logger';

const DEFAULT_TTL = 60 * 60; // 1 hour

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.warn(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttl = DEFAULT_TTL): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.warn(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.warn(`Cache del error for key ${key}:`, error);
    }
  }

  buildSearchKey(params: Record<string, unknown>): string {
    return `search:${JSON.stringify(params)}`;
  }
}

export const cacheService = new CacheService();

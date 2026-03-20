import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * SerpAPI Rate Limiter
 *
 * Two layers:
 * 1. Global monthly cap — max MONTHLY_LIMIT searches per billing cycle (renewal date-based).
 *    Uses a Redis key with TTL set to expire at the next renewal date.
 * 2. Per-client sliding window — max 1 search per CLIENT_WINDOW_SECONDS per IP.
 *    Prevents any single client from spamming.
 *
 * Returns 429 with a clear message when either limit is hit.
 */

const MONTHLY_LIMIT = 225;
const CLIENT_WINDOW_SECONDS = 60;
const RENEWAL_DAY = 28; // SerpAPI renews on the 28th of each month

function getGlobalKey(): { key: string; ttlSeconds: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // Determine current billing cycle start and next renewal
  let cycleStart: Date;
  let cycleEnd: Date;

  if (now.getDate() >= RENEWAL_DAY) {
    // We're past the renewal day this month — cycle is this month's 28th to next month's 28th
    cycleStart = new Date(year, month, RENEWAL_DAY);
    cycleEnd = new Date(year, month + 1, RENEWAL_DAY);
  } else {
    // We're before the renewal day — cycle is last month's 28th to this month's 28th
    cycleStart = new Date(year, month - 1, RENEWAL_DAY);
    cycleEnd = new Date(year, month, RENEWAL_DAY);
  }

  const key = `serpapi:global:${cycleStart.toISOString().slice(0, 10)}`;
  const ttlSeconds = Math.max(1, Math.ceil((cycleEnd.getTime() - now.getTime()) / 1000));

  return { key, ttlSeconds };
}

function getClientKey(ip: string): string {
  return `serpapi:client:${ip}`;
}

export async function serpApiRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  try {
    // --- Layer 1: Per-client sliding window (1 request per 60s) ---
    const clientKey = getClientKey(clientIp);
    const clientExists = await redis.exists(clientKey);

    if (clientExists) {
      const ttl = await redis.ttl(clientKey);
      logger.warn({ clientIp, ttl }, 'SerpAPI per-client rate limit hit');
      res.status(429).json({
        status: 'error',
        message: `Rate limited: please wait ${ttl} seconds before searching again.`,
        retryAfterSeconds: ttl,
        limitType: 'per_client',
      });
      return;
    }

    // --- Layer 2: Global monthly cap ---
    const { key: globalKey, ttlSeconds } = getGlobalKey();
    const currentCount = await redis.get(globalKey);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    if (count >= MONTHLY_LIMIT) {
      logger.warn({ count, limit: MONTHLY_LIMIT }, 'SerpAPI global monthly limit reached');
      res.status(429).json({
        status: 'error',
        message: `Monthly search limit reached (${MONTHLY_LIMIT} searches). Resets on the ${RENEWAL_DAY}th.`,
        remaining: 0,
        limitType: 'global_monthly',
      });
      return;
    }

    // --- Both checks passed: consume a token ---
    // Set per-client window (atomic SET with EX)
    await redis.set(clientKey, '1', 'EX', CLIENT_WINDOW_SECONDS);

    // Increment global counter (INCR + set TTL if new key)
    const newCount = await redis.incr(globalKey);
    if (newCount === 1) {
      // First search this cycle — set expiry to end of billing cycle
      await redis.expire(globalKey, ttlSeconds);
    }

    // Attach remaining count to response headers for transparency
    res.setHeader('X-RateLimit-Remaining', String(MONTHLY_LIMIT - newCount));
    res.setHeader('X-RateLimit-Limit', String(MONTHLY_LIMIT));
    res.setHeader('X-RateLimit-Client-RetryAfter', String(CLIENT_WINDOW_SECONDS));

    logger.info({ clientIp, globalCount: newCount, remaining: MONTHLY_LIMIT - newCount }, 'SerpAPI search token consumed');

    next();
  } catch (err) {
    // If Redis is down, allow the request through (fail-open) but log the error
    logger.error({ err }, 'SerpAPI rate limiter error — failing open');
    next();
  }
}

/**
 * GET endpoint handler for checking current rate limit status.
 * Useful for the frontend to show remaining searches.
 */
export async function getRateLimitStatus(_req: Request, res: Response): Promise<void> {
  try {
    const { key: globalKey } = getGlobalKey();
    const currentCount = await redis.get(globalKey);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    res.json({
      status: 'ok',
      monthlyLimit: MONTHLY_LIMIT,
      used: count,
      remaining: MONTHLY_LIMIT - count,
      renewalDay: RENEWAL_DAY,
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Could not fetch rate limit status' });
  }
}

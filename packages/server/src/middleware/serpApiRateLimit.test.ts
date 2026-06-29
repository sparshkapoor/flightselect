import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock redis before importing the middleware
vi.mock('../config/redis', () => ({
  redis: {
    exists: vi.fn(),
    ttl: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
  },
}));

import { serpApiRateLimit, createSerpApiRateLimit } from './serpApiRateLimit.middleware';
import { redis } from '../config/redis';

const mockRedis = redis as { [K in keyof typeof redis]: ReturnType<typeof vi.fn> };

function makeReq(ip = '1.2.3.4'): Request {
  return { ip, socket: { remoteAddress: ip } } as unknown as Request;
}

function makeRes(): { res: Response; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn>; setHeader: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const setHeader = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status, setHeader } as unknown as Response, json, status, setHeader };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('serpApiRateLimit', () => {
  it('passes first request for a new client', async () => {
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);

    const { res, setHeader } = makeRes();
    const next: NextFunction = vi.fn();

    await serpApiRateLimit(makeReq(), res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
  });

  it('returns 429 per_client when client key exists', async () => {
    mockRedis.exists.mockResolvedValue(1);
    mockRedis.ttl.mockResolvedValue(45);

    const { res, status, json } = makeRes();
    const next: NextFunction = vi.fn();

    await serpApiRateLimit(makeReq(), res, next);

    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ limitType: 'per_client' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 429 global_monthly when count >= 225', async () => {
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.get.mockResolvedValue('225');

    const { res, status, json } = makeRes();
    const next: NextFunction = vi.fn();

    await serpApiRateLimit(makeReq(), res, next);

    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ limitType: 'global_monthly' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('fails closed when Redis throws, instead of silently dropping the budget cap', async () => {
    mockRedis.exists.mockRejectedValue(new Error('Redis down'));

    const { res, status, json } = makeRes();
    const next: NextFunction = vi.fn();

    await serpApiRateLimit(makeReq(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ limitType: 'limiter_unavailable' }));
  });
});

describe('createSerpApiRateLimit', () => {
  it('passes first request with 5s window', async () => {
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);

    const middleware = createSerpApiRateLimit(5);
    const { res, setHeader } = makeRes();
    const next: NextFunction = vi.fn();

    await middleware(makeReq(), res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Client-RetryAfter', '5');
  });

  it('sets redis key with EX equal to provided window', async () => {
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);

    const middleware = createSerpApiRateLimit(5);
    const { res } = makeRes();
    const next: NextFunction = vi.fn();

    await middleware(makeReq(), res, next);

    expect(mockRedis.set).toHaveBeenCalledWith(expect.any(String), '1', 'EX', 5);
  });

  it('uses separate Redis key when keyPrefix differs', async () => {
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);

    const middleware = createSerpApiRateLimit(5, 'serpapi:booking');
    const { res } = makeRes();
    const next: NextFunction = vi.fn();

    await middleware(makeReq('1.2.3.4'), res, next);

    expect(mockRedis.set).toHaveBeenCalledWith('serpapi:booking:1.2.3.4', '1', 'EX', 5);
    expect(mockRedis.exists).toHaveBeenCalledWith('serpapi:booking:1.2.3.4');
  });

  it('still blocks global monthly at 225', async () => {
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.get.mockResolvedValue('225');

    const middleware = createSerpApiRateLimit(5);
    const { res, status, json } = makeRes();
    const next: NextFunction = vi.fn();

    await middleware(makeReq(), res, next);

    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ limitType: 'global_monthly' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('createSerpApiRateLimit(60) behaves same as exported serpApiRateLimit', async () => {
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);

    const middleware = createSerpApiRateLimit(60);
    const { res, setHeader } = makeRes();
    const next: NextFunction = vi.fn();

    await middleware(makeReq(), res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Client-RetryAfter', '60');
    expect(mockRedis.set).toHaveBeenCalledWith(expect.any(String), '1', 'EX', 60);
  });
});

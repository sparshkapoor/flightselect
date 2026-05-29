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

import { serpApiRateLimit } from './serpApiRateLimit.middleware';
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

  it('fails open when Redis throws', async () => {
    mockRedis.exists.mockRejectedValue(new Error('Redis down'));

    const { res } = makeRes();
    const next: NextFunction = vi.fn();

    await serpApiRateLimit(makeReq(), res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

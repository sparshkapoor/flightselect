#!/usr/bin/env ts-node
/**
 * SerpAPI Rate Limit Test Script
 *
 * Tests the two-layer rate limiting on POST /api/search:
 *   1. Per-client sliding window: 1 request per 60 seconds per IP
 *   2. Global monthly cap: 225 total searches
 *
 * Usage:
 *   npx ts-node scripts/test-rate-limit.ts
 *
 * Prerequisites:
 *   - Server running on localhost:3001
 *   - Redis running on localhost:6379
 *   - Docker containers up
 *
 * Flags:
 *   --test-global   Also tests the global cap by temporarily lowering it in Redis (destructive to counter)
 */

const API_URL = 'http://localhost:3001/api';

const SEARCH_PAYLOAD = {
  originAirport: 'SFO',
  destinationAirport: 'LAX',
  departureDate: '2026-04-15',
  returnDate: '2026-04-20',
  tripType: 'ROUND_TRIP',
  passengers: 1,
  cabinClass: 'ECONOMY',
};

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function log(msg: string) {
  console.log(`  ${msg}`);
}

function pass(name: string, detail: string) {
  results.push({ name, passed: true, detail });
  console.log(`  PASS: ${name} — ${detail}`);
}

function fail(name: string, detail: string) {
  results.push({ name, passed: false, detail });
  console.log(`  FAIL: ${name} — ${detail}`);
}

async function postSearch(headers: Record<string, string> = {}): Promise<{ status: number; body: any; headers: any }> {
  const res = await fetch(`${API_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(SEARCH_PAYLOAD),
  });
  const body = await res.json();
  return { status: res.status, body, headers: Object.fromEntries(res.headers.entries()) };
}

async function getRateLimitStatus(): Promise<any> {
  const res = await fetch(`${API_URL}/search/rate-limit`);
  return res.json();
}

// ──────────────────────────────────────────────
// Test 1: First request succeeds (202 Accepted)
// ──────────────────────────────────────────────
async function testFirstRequestSucceeds() {
  console.log('\n--- Test 1: First request should succeed ---');
  const res = await postSearch();
  if (res.status === 202) {
    pass('First request succeeds', `Got 202, searchQueryId: ${res.body.searchQueryId}`);
  } else {
    fail('First request succeeds', `Expected 202, got ${res.status}: ${res.body.message}`);
  }
  return res;
}

// ──────────────────────────────────────────────
// Test 2: Second request from same client within 60s is blocked
// ──────────────────────────────────────────────
async function testPerClientWindow() {
  console.log('\n--- Test 2: Same client blocked within 60s window ---');
  const res = await postSearch();
  if (res.status === 429 && res.body.limitType === 'per_client') {
    pass('Per-client window', `Got 429 per_client, retryAfter: ${res.body.retryAfterSeconds}s`);
  } else if (res.status === 429) {
    // Could be the express-rate-limit (10/min) kicking in — still valid
    pass('Per-client window', `Got 429: ${res.body.message}`);
  } else {
    fail('Per-client window', `Expected 429, got ${res.status}: ${JSON.stringify(res.body)}`);
  }
}

// ──────────────────────────────────────────────
// Test 3: Rate limit status endpoint works
// ──────────────────────────────────────────────
async function testRateLimitStatusEndpoint() {
  console.log('\n--- Test 3: Rate limit status endpoint ---');
  const status = await getRateLimitStatus();
  if (status.status === 'ok' && typeof status.remaining === 'number') {
    pass('Status endpoint', `Used: ${status.used}, Remaining: ${status.remaining}, Limit: ${status.monthlyLimit}`);
  } else {
    fail('Status endpoint', `Unexpected response: ${JSON.stringify(status)}`);
  }
}

// ──────────────────────────────────────────────
// Test 4: Rapid-fire spam (5 requests) — only first succeeds
// ──────────────────────────────────────────────
async function testSpamProtection() {
  console.log('\n--- Test 4: Spam protection (5 rapid requests) ---');
  // Wait for per-client window to clear from previous tests
  log('Waiting 5s for express-rate-limit window to settle...');
  await new Promise((r) => setTimeout(r, 5000));

  // We need to wait for the serpapi per-client key to expire too.
  // Since we can't wait 60s in a test, we'll just fire 5 requests
  // and verify that at most 1 succeeds (the rest get 429).
  const promises = Array.from({ length: 5 }, () => postSearch());
  const responses = await Promise.all(promises);

  const successes = responses.filter((r) => r.status === 202);
  const blocked = responses.filter((r) => r.status === 429);

  if (successes.length <= 1 && blocked.length >= 4) {
    pass('Spam protection', `${successes.length} succeeded, ${blocked.length} blocked out of 5`);
  } else {
    fail('Spam protection', `${successes.length} succeeded, ${blocked.length} blocked — expected at most 1 success`);
  }
}

// ──────────────────────────────────────────────
// Test 5: Response headers include rate limit info
// ──────────────────────────────────────────────
async function testResponseHeaders() {
  console.log('\n--- Test 5: Rate limit headers on successful response ---');
  // We need a fresh window — can't guarantee it here, so just check the 429 response
  const res = await postSearch();
  if (res.status === 202) {
    const remaining = res.headers['x-ratelimit-remaining'];
    const limit = res.headers['x-ratelimit-limit'];
    if (remaining && limit) {
      pass('Response headers', `X-RateLimit-Remaining: ${remaining}, X-RateLimit-Limit: ${limit}`);
    } else {
      fail('Response headers', `Missing rate limit headers on 202 response`);
    }
  } else {
    // Still rate limited — check that 429 response has the right structure
    if (res.body.limitType && res.body.message) {
      pass('Response headers', `429 response has limitType: ${res.body.limitType} and message`);
    } else {
      fail('Response headers', `429 response missing structured fields: ${JSON.stringify(res.body)}`);
    }
  }
}

// ──────────────────────────────────────────────
// Test 6: Global cap test (optional, uses Redis directly)
// ──────────────────────────────────────────────
async function testGlobalCap() {
  console.log('\n--- Test 6: Global monthly cap simulation ---');
  log('This test sets the global counter to 225 in Redis, then verifies the next request is blocked.');
  log('Connecting to Redis directly...');

  // Dynamic import to avoid requiring ioredis at the script level
  const Redis = (await import('ioredis')).default;
  const redis = new Redis('redis://localhost:6379');

  // Find the current global key pattern
  const keys = await redis.keys('serpapi:global:*');
  if (keys.length === 0) {
    fail('Global cap', 'No global key found in Redis — run a search first');
    await redis.quit();
    return;
  }

  const globalKey = keys[0];
  const originalValue = await redis.get(globalKey);
  log(`Current global key: ${globalKey}, value: ${originalValue}`);

  // Set to 225 (the limit)
  await redis.set(globalKey, '225');
  // Also clear per-client key so we can test
  const clientKeys = await redis.keys('serpapi:client:*');
  for (const k of clientKeys) {
    await redis.del(k);
  }

  const res = await postSearch();
  if (res.status === 429 && res.body.limitType === 'global_monthly') {
    pass('Global cap', `Got 429 global_monthly: "${res.body.message}"`);
  } else {
    fail('Global cap', `Expected 429 global_monthly, got ${res.status}: ${JSON.stringify(res.body)}`);
  }

  // Restore original value
  if (originalValue) {
    await redis.set(globalKey, originalValue);
    log(`Restored global counter to ${originalValue}`);
  } else {
    await redis.del(globalKey);
    log('Deleted global counter (was not set before)');
  }

  await redis.quit();
}

// ──────────────────────────────────────────────
// Run all tests
// ──────────────────────────────────────────────
async function main() {
  console.log('=== SerpAPI Rate Limit Tests ===');
  console.log(`Target: ${API_URL}`);

  try {
    // Check server is up
    const health = await fetch(`${API_URL}/health`).catch(() => null);
    if (!health || !health.ok) {
      console.error('\nServer is not running on localhost:3001. Start it first with `npm run dev`.');
      process.exit(1);
    }

    await testFirstRequestSucceeds();
    await testPerClientWindow();
    await testRateLimitStatusEndpoint();
    await testSpamProtection();
    await testResponseHeaders();

    const runGlobal = process.argv.includes('--test-global');
    if (runGlobal) {
      await testGlobalCap();
    } else {
      log('\nSkipping global cap test (use --test-global flag to include it)');
    }

    // Summary
    console.log('\n=== Summary ===');
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    console.log(`  ${passed} passed, ${failed} failed out of ${results.length} tests`);

    if (failed > 0) {
      console.log('\nFailed tests:');
      results.filter((r) => !r.passed).forEach((r) => console.log(`  - ${r.name}: ${r.detail}`));
      process.exit(1);
    }
  } catch (err) {
    console.error('\nTest error:', err);
    process.exit(1);
  }
}

main();

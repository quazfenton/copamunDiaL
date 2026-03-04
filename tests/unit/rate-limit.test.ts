/**
 * Unit Tests for Rate Limiter
 * 
 * Tests for lib/rate-limit.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter, RateLimitPresets, getRateLimitConfigForPath } from '@/lib/rate-limit';

// Mock Redis
vi.mock('redis', () => {
  return {
    createClient: vi.fn(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      zAdd: vi.fn().mockResolvedValue(1),
      zCard: vi.fn().mockResolvedValue(0),
      zRemRangeByScore: vi.fn().mockResolvedValue(1),
      zRange: vi.fn().mockResolvedValue([]),
      keys: vi.fn().mockResolvedValue([]),
      incrBy: vi.fn().mockResolvedValue(1),
      decrBy: vi.fn().mockResolvedValue(1),
      on: vi.fn(),
      quit: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  describe('isRateLimited', () => {
    it('should allow requests under the limit', async () => {
      const result = await limiter.isRateLimited('test-user', {
        interval: 60000,
        maxRequests: 10,
        strategy: 'sliding-window',
      });

      expect(result.limited).toBe(false);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should block requests over the limit', async () => {
      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        await limiter.isRateLimited('test-user-2', {
          interval: 60000,
          maxRequests: 10,
          strategy: 'sliding-window',
        });
      }

      // 11th request should be blocked
      const result = await limiter.isRateLimited('test-user-2', {
        interval: 60000,
        maxRequests: 10,
        strategy: 'sliding-window',
      });

      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should support different strategies', async () => {
      const strategies = ['sliding-window', 'fixed-window', 'token-bucket'] as const;

      for (const strategy of strategies) {
        const result = await limiter.isRateLimited(`test-${strategy}`, {
          interval: 60000,
          maxRequests: 10,
          strategy,
        });

        expect(result).toHaveProperty('limited');
        expect(result).toHaveProperty('remaining');
        expect(result).toHaveProperty('reset');
      }
    });
  });

  describe('getStatus', () => {
    it('should return current rate limit status without consuming a request', async () => {
      const status1 = await limiter.getStatus('test-status');
      const status2 = await limiter.getStatus('test-status');

      // Both should return the same remaining count
      expect(status1.remaining).toBe(status2.remaining);
    });
  });

  describe('reset', () => {
    it('should reset rate limit for an identifier', async () => {
      // Make some requests
      await limiter.isRateLimited('test-reset', {
        interval: 60000,
        maxRequests: 10,
      });

      // Reset
      await limiter.reset('test-reset');

      // Should be allowed again
      const result = await limiter.isRateLimited('test-reset', {
        interval: 60000,
        maxRequests: 10,
      });

      expect(result.limited).toBe(false);
    });
  });

  describe('increment/decrement', () => {
    it('should increment counter', async () => {
      const result1 = await limiter.increment('test-counter');
      const result2 = await limiter.increment('test-counter');

      expect(result2).toBeGreaterThan(result1);
    });

    it('should decrement counter', async () => {
      await limiter.increment('test-dec-counter');
      const result = await limiter.decrement('test-dec-counter');

      expect(result).toBeLessThanOrEqual(1);
    });
  });
});

describe('RateLimitPresets', () => {
  it('should have correct auth preset', () => {
    expect(RateLimitPresets.auth).toEqual({
      interval: 60000,
      maxRequests: 5,
      strategy: 'fixed-window',
    });
  });

  it('should have correct api preset', () => {
    expect(RateLimitPresets.api).toEqual({
      interval: 60000,
      maxRequests: 30,
      strategy: 'sliding-window',
    });
  });

  it('should have correct upload preset', () => {
    expect(RateLimitPresets.upload).toEqual({
      interval: 60000,
      maxRequests: 5,
      strategy: 'fixed-window',
    });
  });

  it('should have correct search preset', () => {
    expect(RateLimitPresets.search).toEqual({
      interval: 10000,
      maxRequests: 5,
      strategy: 'sliding-window',
    });
  });

  it('should have correct webhook preset', () => {
    expect(RateLimitPresets.webhook).toEqual({
      interval: 60000,
      maxRequests: 100,
      strategy: 'token-bucket',
    });
  });
});

describe('getRateLimitConfigForPath', () => {
  it('should return auth config for /api/auth paths', () => {
    const config = getRateLimitConfigForPath('/api/auth/login');
    expect(config).toBe(RateLimitPresets.auth);
  });

  it('should return upload config for /api/upload paths', () => {
    const config = getRateLimitConfigForPath('/api/upload/image');
    expect(config).toBe(RateLimitPresets.upload);
  });

  it('should return search config for /api/search paths', () => {
    const config = getRateLimitConfigForPath('/api/search');
    expect(config).toBe(RateLimitPresets.search);
  });

  it('should return webhook config for /api/webhook paths', () => {
    const config = getRateLimitConfigForPath('/api/webhooks/stripe');
    expect(config).toBe(RateLimitPresets.webhook);
  });

  it('should return default config for unknown paths', () => {
    const config = getRateLimitConfigForPath('/api/unknown');
    expect(config).toBe(RateLimitPresets.api);
  });
});

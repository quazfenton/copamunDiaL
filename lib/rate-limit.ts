/**
 * Redis-backed Rate Limiter
 * 
 * Production-ready rate limiting with:
 * - Distributed rate limiting via Redis
 * - Multiple strategies (sliding window, fixed window, token bucket)
 * - User-specific and IP-based limiting
 * - Rate limit headers
 */

import { createClient } from 'redis';
import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitConfig {
  interval: number; // milliseconds
  maxRequests: number;
  strategy?: 'sliding-window' | 'fixed-window' | 'token-bucket';
}

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export class RateLimiter {
  private redis: ReturnType<typeof createClient>;
  private defaultConfig: RateLimitConfig = {
    interval: 60000, // 1 minute
    maxRequests: 10,
    strategy: 'sliding-window',
  };

  constructor() {
    this.redis = createClient({ 
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    this.redis.connect().catch(console.error);
  }

  /**
   * Check if request is rate limited
   */
  async isRateLimited(
    identifier: string,
    config: RateLimitConfig = this.defaultConfig
  ): Promise<RateLimitResult> {
    const strategy = config.strategy || 'sliding-window';

    switch (strategy) {
      case 'sliding-window':
        return this.slidingWindowLimit(identifier, config);
      case 'fixed-window':
        return this.fixedWindowLimit(identifier, config);
      case 'token-bucket':
        return this.tokenBucketLimit(identifier, config);
      default:
        return this.slidingWindowLimit(identifier, config);
    }
  }

  /**
   * Sliding window rate limiting (most accurate)
   */
  private async slidingWindowLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `ratelimit:sliding:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.interval;

    // Remove old entries outside the window
    await this.redis.zRemRangeByScore(key, 0, windowStart);

    // Count requests in current window
    const requestCount = await this.redis.zCard(key);

    if (requestCount >= config.maxRequests) {
      // Get oldest request to calculate reset time
      const oldest = await this.redis.zRange(key, 0, 0, { REV: true });
      const oldestTime = oldest.length > 0 ? parseInt(oldest[0]) : now;
      const reset = oldestTime + config.interval;

      return {
        limited: true,
        remaining: 0,
        reset,
        retryAfter: Math.ceil((reset - now) / 1000),
      };
    }

    // Add current request with timestamp as score
    const requestId = `${now}-${Math.random()}`;
    await this.redis.zAdd(key, { score: now, value: requestId });
    await this.redis.expire(key, Math.ceil(config.interval / 1000) + 1);

    return {
      limited: false,
      remaining: config.maxRequests - requestCount - 1,
      reset: now + config.interval,
    };
  }

  /**
   * Fixed window rate limiting (simpler, less accurate)
   */
  private async fixedWindowLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `ratelimit:fixed:${identifier}`;
    const windowKey = `${key}:${Math.floor(Date.now() / config.interval)}`;

    const current = await this.redis.get(windowKey);
    const count = current ? parseInt(current) : 0;

    if (count >= config.maxRequests) {
      const reset = (Math.floor(Date.now() / config.interval) + 1) * config.interval;
      
      return {
        limited: true,
        remaining: 0,
        reset,
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      };
    }

    const remaining = config.maxRequests - count - 1;
    await this.redis.set(windowKey, (count + 1).toString(), {
      PX: config.interval,
    });

    return {
      limited: false,
      remaining,
      reset: (Math.floor(Date.now() / config.interval) + 1) * config.interval,
    };
  }

  /**
   * Token bucket rate limiting (allows bursts)
   */
  private async tokenBucketLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `ratelimit:bucket:${identifier}`;
    const now = Date.now();

    // Get current bucket state
    const bucketData = await this.redis.hGetAll(key);
    let tokens = bucketData.tokens ? parseFloat(bucketData.tokens) : config.maxRequests;
    let lastRefill = bucketData.lastRefill ? parseInt(bucketData.lastRefill) : now;

    // Calculate tokens to add based on time elapsed
    const elapsed = now - lastRefill;
    const refillRate = config.maxRequests / config.interval;
    const tokensToAdd = elapsed * refillRate;
    tokens = Math.min(config.maxRequests, tokens + tokensToAdd);

    if (tokens < 1) {
      const reset = lastRefill + config.interval;
      
      return {
        limited: true,
        remaining: Math.floor(tokens),
        reset,
        retryAfter: Math.ceil((reset - now) / 1000),
      };
    }

    // Consume a token
    tokens -= 1;
    await this.redis.hSet(key, {
      tokens: tokens.toString(),
      lastRefill: now.toString(),
    });
    await this.redis.expire(key, Math.ceil(config.interval / 1000) + 1);

    return {
      limited: false,
      remaining: Math.floor(tokens),
      reset: now + config.interval,
    };
  }

  /**
   * Get rate limit status without consuming a request
   */
  async getStatus(
    identifier: string,
    config: RateLimitConfig = this.defaultConfig
  ): Promise<RateLimitResult> {
    const key = `ratelimit:sliding:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.interval;

    await this.redis.zRemRangeByScore(key, 0, windowStart);
    const requestCount = await this.redis.zCard(key);

    return {
      limited: requestCount >= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - requestCount),
      reset: now + config.interval,
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  async reset(identifier: string): Promise<void> {
    const patterns = [
      `ratelimit:sliding:${identifier}`,
      `ratelimit:fixed:${identifier}`,
      `ratelimit:bucket:${identifier}`,
    ];

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    }
  }
}

/**
 * Rate limit middleware for Next.js API routes
 */
export async function rateLimitMiddleware(
  req: NextRequest,
  config?: RateLimitConfig
): Promise<{ limited: boolean; response?: NextResponse; headers: Headers }> {
  const limiter = new RateLimiter();
  
  // Get identifier (API key, user ID, or IP)
  const apiKey = req.headers.get('x-api-key');
  const userId = req.headers.get('x-user-id');
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  
  const identifier = apiKey || userId || `ip:${ip}`;

  const result = await limiter.isRateLimited(identifier, config);

  // Create headers
  const headers = new Headers({
    'X-RateLimit-Limit': config?.maxRequests.toString() || '10',
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  });

  if (result.limited) {
    headers.set('Retry-After', Math.ceil((result.reset - Date.now()) / 1000).toString());
    
    return {
      limited: true,
      response: NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers,
        }
      ),
      headers,
    };
  }

  return {
    limited: false,
    headers,
  };
}

/**
 * Pre-configured rate limit configs for common use cases
 */
export const RateLimitPresets = {
  // Auth endpoints (prevent brute force)
  auth: {
    interval: 60000, // 1 minute
    maxRequests: 5,
    strategy: 'fixed-window' as const,
  },

  // API endpoints (standard)
  api: {
    interval: 60000, // 1 minute
    maxRequests: 30,
    strategy: 'sliding-window' as const,
  },

  // Upload endpoints (prevent floods)
  upload: {
    interval: 60000, // 1 minute
    maxRequests: 5,
    strategy: 'fixed-window' as const,
  },

  // Search endpoints (expensive operations)
  search: {
    interval: 10000, // 10 seconds
    maxRequests: 5,
    strategy: 'sliding-window' as const,
  },

  // Webhook endpoints
  webhook: {
    interval: 60000, // 1 minute
    maxRequests: 100,
    strategy: 'token-bucket' as const,
  },

  // Public endpoints (generous limits)
  public: {
    interval: 60000, // 1 minute
    maxRequests: 100,
    strategy: 'sliding-window' as const,
  },
};

/**
 * Get rate limit config for a path
 */
export function getRateLimitConfigForPath(path: string): RateLimitConfig {
  if (path.includes('/api/auth')) return RateLimitPresets.auth;
  if (path.includes('/api/upload')) return RateLimitPresets.upload;
  if (path.includes('/api/search')) return RateLimitPresets.search;
  if (path.includes('/api/webhook')) return RateLimitPresets.webhook;
  return RateLimitPresets.api;
}

export default RateLimiter;

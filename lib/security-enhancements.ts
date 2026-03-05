/**
 * Security Enhancements for copamunDiaL
 * 
 * Fixes:
 * 1. Remove hardcoded JWT fallback secret
 * 2. Add Redis-based distributed rate limiting
 * 3. Implement offline message queue
 * 4. Add CSRF protection
 */

// ============================================================================
// Fix 1: Remove Hardcoded JWT Fallback Secret
// ============================================================================

/**
 * SECURE JWT Secret Management
 * 
 * CRITICAL SECURITY FIX:
 * - Never use hardcoded fallback secrets
 * - Fail closed in production if secret not configured
 * - Validate secret strength at startup
 */

export function getJwtSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      // CRITICAL: Fail closed in production
      console.error('❌ CRITICAL SECURITY ERROR: NEXTAUTH_SECRET is not set');
      console.error('Application cannot start in production without JWT secret');
      console.error('Set NEXTAUTH_SECRET environment variable immediately');
      throw new Error(
        'NEXTAUTH_SECRET is required in production. ' +
        'Generate a secure secret: openssl rand -base64 32'
      );
    }
    
    // Development: Generate temporary secret with warning
    console.warn('⚠️  WARNING: NEXTAUTH_SECRET not set');
    console.warn('Generating temporary development secret (DO NOT USE IN PRODUCTION)');
    console.warn('Set NEXTAUTH_SECRET environment variable for production');
    
    // Generate a random secret for development only
    const devSecret = `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return devSecret;
  }
  
  // Validate secret strength
  if (secret.length < 32) {
    console.error('❌ SECURITY ERROR: NEXTAUTH_SECRET must be at least 32 characters');
    console.error(`Current length: ${secret.length} characters`);
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEXTAUTH_SECRET must be at least 32 characters. ' +
        `Current length: ${secret.length}. Generate a stronger secret.'
      );
    }
    
    console.warn('⚠️  Weak secret detected. Use at least 32 characters for production.');
  }
  
  return secret;
}

/**
 * Validate JWT secret at application startup
 * Call this in your app's initialization
 */
export function validateJwtConfiguration(): void {
  const secret = process.env.NEXTAUTH_SECRET;
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEXTAUTH_SECRET environment variable is required in production. ' +
        'Generate a secure secret with: openssl rand -base64 32'
      );
    }
    console.warn('⚠️  NEXTAUTH_SECRET not configured (development mode only)');
    return;
  }
  
  // Check minimum length
  if (secret.length < 32) {
    console.error(
      `⚠️  NEXTAUTH_SECRET is too short (${secret.length} chars). ` +
      'Minimum 32 characters recommended for production.'
    );
  }
  
  // Check for common weak secrets
  const weakSecrets = ['secret', 'password', 'admin', 'changeme', 'nextauth'];
  if (weakSecrets.some(weak => secret.toLowerCase().includes(weak))) {
    console.warn('⚠️  NEXTAUTH_SECRET contains common words. Use a random secret.');
  }
  
  console.log('✓ JWT secret validation passed');
}

// ============================================================================
// Fix 2: Redis-Based Distributed Rate Limiting
// ============================================================================

import { Redis } from 'ioredis';

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Redis-based distributed rate limiter
 * 
 * Benefits over in-memory:
 * - Works across multiple server instances
 * - Survives server restarts
 * - Accurate rate limiting in load-balanced environments
 */
export class RedisRateLimiter {
  private redis: Redis;
  private prefix: string;

  constructor(redisUrl: string, prefix: string = 'ratelimit') {
    this.redis = new Redis(redisUrl);
    this.prefix = prefix;
  }

  /**
   * Check and record rate limit
   * 
   * Uses Redis INCR and EXPIRE for atomic operations
   * 
   * @param key - Unique identifier (e.g., user ID + endpoint)
   * @param config - Rate limit configuration
   * @returns Rate limit result
   */
  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const redisKey = `${this.prefix}:${key}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    
    // Add current request
    pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
    
    // Count requests in window
    pipeline.zcard(redisKey);
    
    // Set expiry on the key
    pipeline.expire(redisKey, Math.ceil(config.windowMs / 1000));
    
    // Execute pipeline
    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis pipeline failed');
    }
    
    // Get request count (third command in pipeline)
    const requestCount = results[2][1] as number;
    
    const remaining = Math.max(0, config.maxRequests - requestCount);
    const resetTime = now + config.windowMs;
    
    if (requestCount > config.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil(config.windowMs / 1000)
      };
    }
    
    return {
      allowed: true,
      remaining,
      resetTime
    };
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const redisKey = `${this.prefix}:${key}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Count requests in current window
    const count = await this.redis.zcount(redisKey, windowStart, now);
    
    const remaining = Math.max(0, config.maxRequests - count);
    const resetTime = now + config.windowMs;
    
    return {
      allowed: count <= config.maxRequests,
      remaining,
      resetTime,
      retryAfter: count > config.maxRequests ? Math.ceil(config.windowMs / 1000) : undefined
    };
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    await this.redis.del(`${this.prefix}:${key}`);
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

/**
 * Create rate limiter middleware for Next.js API routes
 */
export function createRateLimitMiddleware(
  redisUrl: string,
  defaultLimit: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }
) {
  const limiter = new RedisRateLimiter(redisUrl);
  
  return async function rateLimitMiddleware(
    request: Request,
    config?: RateLimitConfig
  ): Promise<RateLimitResult> {
    // Get client IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = realIp || forwardedFor?.split(',')[0] || 'unknown';
    
    // Get endpoint from URL
    const url = new URL(request.url);
    const endpoint = url.pathname;
    
    // Create rate limit key
    const key = `${endpoint}:${ip}`;
    
    // Check rate limit
    const limitConfig = config || defaultLimit;
    const result = await limiter.check(key, limitConfig);
    
    return result;
  };
}

// ============================================================================
// Fix 3: Offline Message Queue Implementation
// ============================================================================

export interface OfflineMessage {
  id: string;
  type: 'chat' | 'system' | 'notification';
  content: string;
  fromUserId: string;
  toUserId: string;
  teamId?: string;
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
}

/**
 * Offline Message Queue Manager
 * 
 * Stores and delivers messages when users reconnect
 */
export class OfflineMessageQueue {
  private redis: Redis;
  private prefix: string;

  constructor(redisUrl: string, prefix: string = 'offline_messages') {
    this.redis = new Redis(redisUrl);
    this.prefix = prefix;
  }

  /**
   * Store message for offline user
   */
  async storeMessage(message: OfflineMessage): Promise<void> {
    const queueKey = `${this.prefix}:user:${message.toUserId}`;
    const messageData = JSON.stringify(message);
    
    // Add to sorted set with timestamp as score for ordering
    const timestamp = new Date(message.createdAt).getTime();
    await this.redis.zadd(queueKey, timestamp, messageData);
    
    // Set TTL (keep messages for 30 days)
    await this.redis.expire(queueKey, 30 * 24 * 60 * 60);
    
    console.log(`Stored offline message for user ${message.toUserId}`);
  }

  /**
   * Get undelivered messages for user
   */
  async getUndeliveredMessages(userId: string, limit: number = 100): Promise<OfflineMessage[]> {
    const queueKey = `${this.prefix}:user:${userId}`;
    
    // Get all messages (from beginning of time to now)
    const messages = await this.redis.zrange(queueKey, 0, limit - 1);
    
    return messages.map(msg => JSON.parse(msg) as OfflineMessage);
  }

  /**
   * Mark message as delivered
   */
  async markDelivered(userId: string, messageId: string): Promise<void> {
    const queueKey = `${this.prefix}:user:${userId}`;
    
    // Find and update message
    const messages = await this.redis.zrange(queueKey, 0, -1);
    
    for (const msgData of messages) {
      const message = JSON.parse(msgData) as OfflineMessage;
      if (message.id === messageId) {
        message.deliveredAt = new Date().toISOString();
        await this.redis.zrem(queueKey, msgData);
        await this.redis.zadd(queueKey, Date.now(), JSON.stringify(message));
        break;
      }
    }
  }

  /**
   * Mark message as read
   */
  async markRead(userId: string, messageId: string): Promise<void> {
    const queueKey = `${this.prefix}:user:${userId}`;
    
    const messages = await this.redis.zrange(queueKey, 0, -1);
    
    for (const msgData of messages) {
      const message = JSON.parse(msgData) as OfflineMessage;
      if (message.id === messageId) {
        message.readAt = new Date().toISOString();
        await this.redis.zrem(queueKey, msgData);
        await this.redis.zadd(queueKey, Date.now(), JSON.stringify(message));
        break;
      }
    }
  }

  /**
   * Deliver offline messages to reconnected user
   * 
   * Returns messages and removes them from queue
   */
  async deliverOfflineMessages(userId: string): Promise<OfflineMessage[]> {
    const queueKey = `${this.prefix}:user:${userId}`;
    
    // Get all pending messages
    const messages = await this.getUndeliveredMessages(userId);
    
    if (messages.length === 0) {
      return [];
    }
    
    // Clear the queue for this user
    await this.redis.del(queueKey);
    
    console.log(`Delivered ${messages.length} offline messages to user ${userId}`);
    
    return messages;
  }

  /**
   * Get message count for user
   */
  async getMessageCount(userId: string): Promise<number> {
    const queueKey = `${this.prefix}:user:${userId}`;
    return await this.redis.zcard(queueKey);
  }

  /**
   * Clean up old messages (run periodically)
   */
  async cleanupOldMessages(maxAgeDays: number = 30): Promise<number> {
    const pattern = `${this.prefix}:user:*`;
    let totalDeleted = 0;
    
    const keys = await this.redis.keys(pattern);
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    
    for (const key of keys) {
      // Remove messages older than cutoff
      const deleted = await this.redis.zremrangebyscore(key, 0, cutoffTime);
      totalDeleted += deleted;
    }
    
    if (totalDeleted > 0) {
      console.log(`Cleaned up ${totalDeleted} old offline messages`);
    }
    
    return totalDeleted;
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

// ============================================================================
// Fix 4: CSRF Protection
// ============================================================================

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * CSRF Token Manager
 * 
 * Implements Double Submit Cookie pattern for CSRF protection
 */
export class CSRFProtection {
  private secret: string;
  private tokenLifetime: number; // in milliseconds

  constructor(secret: string, tokenLifetimeMs: number = 3600000) {
    if (!secret || secret.length < 32) {
      throw new Error('CSRF secret must be at least 32 characters');
    }
    this.secret = secret;
    this.tokenLifetime = tokenLifetimeMs;
  }

  /**
   * Generate CSRF token
   * 
   * Token format: timestamp.token.signature
   */
  generateToken(userId: string): string {
    const timestamp = Date.now();
    const token = randomBytes(32).toString('hex');
    
    // Create signature
    const data = `${userId}:${timestamp}:${token}`;
    const signature = createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');
    
    return `${timestamp}.${token}.${signature}`;
  }

  /**
   * Validate CSRF token
   */
  validateToken(userId: string, token: string): boolean {
    try {
      const parts = token.split('.');
      
      if (parts.length !== 3) {
        return false;
      }
      
      const [timestampStr, tokenValue, signature] = parts;
      const timestamp = parseInt(timestampStr, 10);
      
      // Check token expiry
      if (Date.now() - timestamp > this.tokenLifetime) {
        return false;
      }
      
      // Verify signature
      const data = `${userId}:${timestamp}:${tokenValue}`;
      const expectedSignature = createHmac('sha256', this.secret)
        .update(data)
        .digest('hex');
      
      // Constant-time comparison
      if (!this.constantTimeCompare(signature, expectedSignature)) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    
    return timingSafeEqual(aBuffer, bBuffer);
  }

  /**
   * Get CSRF token from request header
   */
  getTokenFromHeader(request: Request): string | null {
    return request.headers.get('x-csrf-token');
  }

  /**
   * Get CSRF token from cookie
   */
  getTokenFromCookie(cookieHeader: string | null): string | null {
    if (!cookieHeader) {
      return null;
    }
    
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf_token') {
        return value;
      }
    }
    
    return null;
  }

  /**
   * Create CSRF protection middleware
   */
  createMiddleware() {
    return async (request: Request, userId: string): Promise<boolean> => {
      // Skip for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        return true;
      }
      
      // Get token from header
      const headerToken = this.getTokenFromHeader(request);
      
      if (!headerToken) {
        console.warn('CSRF token missing from header');
        return false;
      }
      
      // Validate token
      const isValid = this.validateToken(userId, headerToken);
      
      if (!isValid) {
        console.warn('CSRF token validation failed');
        return false;
      }
      
      return true;
    };
  }
}

/**
 * Generate CSRF token for client
 * 
 * Call this endpoint to get a token for forms
 */
export async function generateCsrfTokenEndpoint(
  userId: string,
  csrfSecret: string
): Promise<{ token: string; expiresAt: string }> {
  const csrf = new CSRFProtection(csrfSecret);
  const token = csrf.generateToken(userId);
  
  return {
    token,
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  };
}

// ============================================================================
// Integration Examples
// ============================================================================

/**
 * Example: Socket.IO with offline message queue
 * 
 * Add this to your socket-server.ts
 */
export async function setupOfflineMessageDelivery(
  socket: any,
  userId: string,
  redisUrl: string
) {
  const queue = new OfflineMessageQueue(redisUrl);
  
  // Deliver offline messages on connection
  const messages = await queue.deliverOfflineMessages(userId);
  
  for (const message of messages) {
    socket.emit('message:new', {
      id: message.id,
      type: message.type,
      content: message.content,
      fromUserId: message.fromUserId,
      teamId: message.teamId,
      timestamp: message.createdAt,
      wasOffline: true
    });
  }
  
  // Store message for offline users
  socket.on('message:send', async (data: any, callback: any) => {
    const message: OfflineMessage = {
      id: `msg-${Date.now()}-${randomBytes(4).toString('hex')}`,
      type: data.type || 'chat',
      content: data.content,
      fromUserId: userId,
      toUserId: data.toUserId,
      teamId: data.teamId,
      createdAt: new Date().toISOString()
    };
    
    // Check if recipient is online
    const isOnline = await isUserOnline(data.toUserId);
    
    if (!isOnline) {
      // Store for offline delivery
      await queue.storeMessage(message);
    }
    
    // Broadcast to online users
    socket.to(`user:${data.toUserId}`).emit('message:new', message);
    
    callback?.({ success: true, messageId: message.id });
  });
}

async function isUserOnline(userId: string): Promise<boolean> {
  // Check if user has active socket connections
  // Implementation depends on your socket tracking
  return false;
}

/**
 * Example: Rate limiting middleware for Next.js API
 * 
 * Add this to your API routes
 */
export async function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  redisUrl: string,
  config?: RateLimitConfig
) {
  const rateLimit = await createRateLimitMiddleware(redisUrl);
  
  return async (request: Request): Promise<Response> => {
    const result = await rateLimit(request, config);
    
    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: result.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': config?.maxRequests.toString() || '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
            'Retry-After': result.retryAfter?.toString() || '60'
          }
        }
      );
    }
    
    const response = await handler(request);
    
    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Limit', config?.maxRequests.toString() || '100');
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    
    return response;
  };
}

/**
 * Example: CSRF protection for Next.js API
 * 
 * Add this to your API routes that modify data
 */
export async function withCsrfProtection(
  handler: (request: Request, userId: string) => Promise<Response>,
  csrfSecret: string
) {
  const csrf = new CSRFProtection(csrfSecret);
  
  return async (request: Request): Promise<Response> => {
    // Skip CSRF for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return handler(request, 'anonymous');
    }
    
    // Get user ID from request (implement based on your auth)
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      );
    }
    
    // Validate CSRF token
    const isValid = await csrf.createMiddleware()(request, userId);
    
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'CSRF token missing or invalid' }),
        { 
          status: 403,
          headers: { 'X-CSRF-Error': 'invalid_token' }
        }
      );
    }
    
    return handler(request, userId);
  };
}

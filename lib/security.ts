/**
 * Security Middleware & Utilities
 *
 * Provides:
 * - Rate limiting (Redis-backed in production, in-memory fallback)
 * - Request validation
 * - Security headers
 * - CSRF protection utilities
 * - Input sanitization
 */

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

// Types
interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Max requests per window
  message?: string      // Custom error message
}

// In-memory rate limit store (fallback when Redis unavailable)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Redis client for distributed rate limiting (production)
let redisClient: Redis | null = null

/**
 * Initialize Redis client for rate limiting
 * Call this on application startup
 */
export function initRedisRateLimiter(redisUrl?: string): void {
  const url = redisUrl || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  
  if (url && token) {
    try {
      redisClient = new Redis({ url, token })
      console.log('✅ Redis rate limiting initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Redis for rate limiting:', error)
      redisClient = null
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Production mode: Redis not configured. Rate limiting will use in-memory storage (not distributed).')
    console.warn('   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.')
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis | null {
  return redisClient
}

// Default rate limit configurations
export const RATE_LIMITS = {
  default: { windowMs: 60 * 1000, maxRequests: 100 },        // 100 req/min
  auth: { windowMs: 60 * 1000, maxRequests: 10 },            // 10 req/min
  upload: { windowMs: 60 * 1000, maxRequests: 10 },          // 10 req/min
  search: { windowMs: 60 * 1000, maxRequests: 30 },          // 30 req/min
  create: { windowMs: 60 * 1000, maxRequests: 20 },          // 20 req/min
  sensitive: { windowMs: 60 * 1000, maxRequests: 5 },        // 5 req/min
} as const

/**
 * Clean up expired rate limit entries periodically
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}

// Run cleanup every 5 minutes
let cleanupInterval: NodeJS.Timeout | null = null;
if (typeof setInterval !== 'undefined') {
  cleanupInterval = setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

// Export cleanup function to allow clearing the interval
export function stopRateLimitCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown'
  
  // Include user agent for additional uniqueness (optional)
  const userAgent = request.headers.get('user-agent') || ''
  
return ip
}

/**
 * Rate limiter middleware
 * Uses Redis for distributed rate limiting in production, falls back to in-memory
 */
export function rateLimit(config: RateLimitConfig = RATE_LIMITS.default) {
  return async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
    const clientId = getClientIdentifier(request)
    const key = `ratelimit:${request.nextUrl.pathname}:${clientId}`
    const now = Date.now()

    // Use Redis if available (production), otherwise use in-memory
    if (redisClient) {
      return await rateLimitWithRedis(redisClient, key, config, now)
    } else {
      return rateLimitWithMemory(key, config, now)
    }
  }
}

/**
 * Redis-backed rate limiting (production)
 */
async function rateLimitWithRedis(
  redis: Redis,
  key: string,
  config: RateLimitConfig,
  now: number
): Promise<NextResponse | null> {
  try {
    const windowKey = `${key}:${Math.floor(now / config.windowMs)}`
    
    // Use Redis INCR with expiration
    const current = await redis.incr(windowKey)
    
    // Set expiration on first request
    if (current === 1) {
      await redis.expire(windowKey, Math.ceil(config.windowMs / 1000))
    }

    const remaining = Math.max(0, config.maxRequests - current)
    const resetSeconds = Math.ceil(config.windowMs / 1000)

    if (current > config.maxRequests) {
      return NextResponse.json(
        {
          error: config.message || 'Too many requests, please try again later',
          retryAfter: resetSeconds,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (now + config.windowMs).toString(),
            'Retry-After': resetSeconds.toString(),
          }
        }
      )
    }

    return null
  } catch (error) {
    console.error('Redis rate limit error:', error)
    // Fallback to in-memory on Redis error
    return rateLimitWithMemory(key, config, now)
  }
}

/**
 * In-memory rate limiting (development/fallback)
 */
function rateLimitWithMemory(
  key: string,
  config: RateLimitConfig,
  now: number
): NextResponse | null {
  let entry = rateLimitStore.get(key)

  // Create new entry if doesn't exist or expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    }
  }

  entry.count++
  rateLimitStore.set(key, entry)

  const remaining = Math.max(0, config.maxRequests - entry.count)
  const resetSeconds = Math.ceil((entry.resetTime - now) / 1000)

  if (entry.count > config.maxRequests) {
    return NextResponse.json(
      {
        error: config.message || 'Too many requests, please try again later',
        retryAfter: resetSeconds,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetTime.toString(),
          'Retry-After': resetSeconds.toString(),
        }
      }
    )
  }

  return null
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse, isDev = false): NextResponse {
  const headers = response.headers

  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY')

  // Enable XSS filter
  headers.set('X-XSS-Protection', '1; mode=block')

  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff')

  // Referrer policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')

  // Generate nonce for production CSP
  const nonce = crypto.randomUUID()
  if (!isDev) {
    headers.set('X-Nonce', nonce)
  }

  // Content Security Policy - strict in production, relaxed in development
  const cspDirectives = [
    "default-src 'self'",
    isDev 
      ? "script-src 'self' 'unsafe-inline'" // Development mode
      : `script-src 'self' 'nonce-${nonce}'`,
    isDev
      ? "style-src 'self' 'unsafe-inline'" // Development mode
      : `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' wss: ws: https:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  
  headers.set('Content-Security-Policy', cspDirectives)

  // Strict Transport Security (HSTS)
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  return response
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim()
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : 
        typeof item === 'object' && item !== null ? sanitizeObject(item) : 
        item
      )
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized as T
}

/**
 * Validate request origin for CSRF protection
 */
export function validateOrigin(request: NextRequest, allowedOrigins: string[]): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  // For same-origin requests, origin might not be present
  if (!origin && !referer) {
    return false
  }
  
  let requestOrigin = origin || ''
  if (!requestOrigin && referer) {
    try {
      requestOrigin = new URL(referer).origin
    } catch {
      return false
    }
  }
  
  return allowedOrigins.some(allowed => requestOrigin === allowed)
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate CSRF token from request
 * Must be called on all state-changing operations (POST, PUT, DELETE, PATCH)
 */
export function validateCSRFToken(request: NextRequest): { valid: boolean; error?: string } {
  const csrfToken = request.headers.get('x-csrf-token')
  const sessionToken = request.cookies.get('csrf_token')?.value
  
  if (!csrfToken) {
    return { valid: false, error: 'Missing CSRF token' }
  }
  
  if (!sessionToken) {
    return { valid: false, error: 'Missing session CSRF token' }
  }
  
  // Constant-time comparison to prevent timing attacks
  try {
    const tokenBuffer = Buffer.from(csrfToken, 'hex')
    const sessionBuffer = Buffer.from(sessionToken, 'hex')

    if (tokenBuffer.length !== sessionBuffer.length) {
      return { valid: false, error: 'CSRF token mismatch' }
    }

    // Use constant-time comparison to prevent timing attacks
    // In Edge runtime, use a simple constant-time comparison
    let result = 0
    for (let i = 0; i < tokenBuffer.length; i++) {
      result |= tokenBuffer[i] ^ sessionBuffer[i]
    }
    const isValid = result === 0
    return { valid: isValid, error: isValid ? undefined : 'CSRF token mismatch' }
  } catch (error) {
    return { valid: false, error: 'Invalid CSRF token format' }
  }
}

/**
 * Middleware wrapper for CSRF protection on state-changing operations
 */
export function withCSRFProtection(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: { methods?: string[] } = {}
) {
  const protectedMethods = options.methods || ['POST', 'PUT', 'DELETE', 'PATCH']
  
  return async function csrfProtectedHandler(request: NextRequest): Promise<NextResponse> {
    // Only validate on state-changing methods
    if (protectedMethods.includes(request.method)) {
      const csrfResult = validateCSRFToken(request)
      if (!csrfResult.valid) {
        return NextResponse.json(
          { error: csrfResult.error || 'CSRF validation failed' },
          { status: 403 }
        )
      }
    }
    
    return handler(request)
  }
}

/**
 * Password strength validator
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0
  
  // Length check
  if (password.length >= 8) score += 1
  else feedback.push('Password must be at least 8 characters')
  
  if (password.length >= 12) score += 1
  
  // Uppercase check
  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('Add uppercase letters')
  
  // Lowercase check
  if (/[a-z]/.test(password)) score += 1
  else feedback.push('Add lowercase letters')
  
  // Number check
  if (/\d/.test(password)) score += 1
  else feedback.push('Add numbers')
  
  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1
  else feedback.push('Add special characters')
  
  // No common patterns
  const commonPatterns = ['123456', 'password', 'qwerty', 'abc123']
  if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    score = Math.max(0, score - 2)
    feedback.push('Avoid common patterns')
  }
  
  return {
    isValid: score >= 4 && password.length >= 8,
    score: Math.min(5, score),
    feedback,
  }
}

/**
 * Create a wrapped API handler with security middleware
 */
export function withSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    rateLimit?: RateLimitConfig
    requireAuth?: boolean
    allowedOrigins?: string[]
  } = {}
) {
  return async function securedHandler(request: NextRequest): Promise<NextResponse> {
    // Apply rate limiting
    if (options.rateLimit) {
      const rateLimitResponse = await rateLimit(options.rateLimit)(request)
      if (rateLimitResponse) return rateLimitResponse
    }
    
    // Validate origin
    if (options.allowedOrigins) {
      if (!validateOrigin(request, options.allowedOrigins)) {
        return NextResponse.json(
          { error: 'Invalid request origin' },
          { status: 403 }
        )
      }
    }
    
    // Execute handler
    const response = await handler(request)
    
    // Apply security headers
    return applySecurityHeaders(response)
  }
}

/**
 * Audit log entry creator
 */
export function createAuditLog(
  action: string,
  userId: string | null,
  details: Record<string, any>,
  request: NextRequest
) {
  const log = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    ip: getClientIdentifier(request),
    userAgent: request.headers.get('user-agent'),
    path: request.nextUrl.pathname,
    method: request.method,
    details,
  }

  // In production, send to logging service
  console.log('[AUDIT]', JSON.stringify(log))

  return log
}

// Alias exports for convenience (must be before default export that uses them)
export const withCSRF = withCSRFProtection

// Default export for convenience
export default {
  rateLimit,
  RATE_LIMITS,
  applySecurityHeaders,
  sanitizeString,
  sanitizeObject,
  validateOrigin,
  generateCSRFToken,
  validateCSRFToken,
  withCSRFProtection,
  withCSRF,
  validatePasswordStrength,
  withSecurity,
  createAuditLog,
  initRedisRateLimiter,
  getRedisClient,
}

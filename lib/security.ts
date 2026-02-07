/**
 * Security Middleware & Utilities
 * 
 * Provides:
 * - Rate limiting
 * - Request validation
 * - Security headers
 * - CSRF protection utilities
 * - Input sanitization
 */

import { NextRequest, NextResponse } from 'next/server'

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

// In-memory rate limit store (in production, use Redis)
const rateLimitStore = new Map<string, RateLimitEntry>()

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
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000)
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
 */
export function rateLimit(config: RateLimitConfig = RATE_LIMITS.default) {
  return async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
    const clientId = getClientIdentifier(request)
    const key = `${request.nextUrl.pathname}:${clientId}`
    const now = Date.now()
    
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
    
    // Calculate remaining requests and reset time
    const remaining = Math.max(0, config.maxRequests - entry.count)
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000)
    
    // Check if rate limit exceeded
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
    
    // Return null to continue processing (rate limit not exceeded)
    return null
  }
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
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
  
  // Content Security Policy (adjust as needed)
  headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' wss: ws: https:",
    "frame-ancestors 'none'",
  ].join('; '))
  
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
return false // Disallow requests without Origin or Referer for CSRF protection
  }
  
  const requestOrigin = origin || (referer ? new URL(referer).origin : '')
  
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
    ip: getClientIdentifier(request).split(':')[0],
    userAgent: request.headers.get('user-agent'),
    path: request.nextUrl.pathname,
    method: request.method,
    details,
  }
  
  // In production, send to logging service
  console.log('[AUDIT]', JSON.stringify(log))
  
  return log
}

export default {
  rateLimit,
  RATE_LIMITS,
  applySecurityHeaders,
  sanitizeString,
  sanitizeObject,
  validateOrigin,
  generateCSRFToken,
  validatePasswordStrength,
  withSecurity,
  createAuditLog,
}

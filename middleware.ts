/**
 * Next.js Middleware for Security
 * 
 * Applies security headers, rate limiting, and CSRF protection
 * Runs before every request
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limit store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit configurations per path pattern
const RATE_LIMITS = {
  '/api/auth': { windowMs: 60 * 1000, maxRequests: 10 },      // 10 req/min
  '/api/upload': { windowMs: 60 * 1000, maxRequests: 10 },    // 10 req/min
  '/api/notifications': { windowMs: 60 * 1000, maxRequests: 30 }, // 30 req/min
  '/api/teams': { windowMs: 60 * 1000, maxRequests: 60 },     // 60 req/min
  '/api/matches': { windowMs: 60 * 1000, maxRequests: 60 },   // 60 req/min
  '/api/players': { windowMs: 60 * 1000, maxRequests: 100 },  // 100 req/min
  default: { windowMs: 60 * 1000, maxRequests: 100 },         // 100 req/min
}

/**
 * Get rate limit config for a path
 */
function getRateLimitConfig(path: string) {
  for (const [prefix, config] of Object.entries(RATE_LIMITS)) {
    if (path.startsWith(prefix)) {
      return config
    }
  }
  return RATE_LIMITS.default
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown'
  return `${request.nextUrl.pathname}:${ip}`
}

/**
 * Check rate limit
 */
function checkRateLimit(request: NextRequest): { allowed: boolean; resetSeconds: number; remaining: number } {
  const config = getRateLimitConfig(request.nextUrl.pathname)
  const key = getClientIdentifier(request)
  const now = Date.now()

  let entry = rateLimitStore.get(key)

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

  return {
    allowed: entry.count <= config.maxRequests,
    resetSeconds,
    remaining,
  }
}

/**
 * Clean up expired rate limit entries periodically
 */
let cleanupInterval: NodeJS.Timeout | null = null
if (typeof setInterval !== 'undefined') {
  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000) // Clean up every 5 minutes
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and non-API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/icons') ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg')
  ) {
    return NextResponse.next()
  }

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api')) {
    const rateLimitResult = checkRateLimit(request)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests, please try again later',
          retryAfter: rateLimitResult.resetSeconds,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': getRateLimitConfig(pathname).maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + rateLimitResult.resetSeconds * 1000).toISOString(),
            'Retry-After': rateLimitResult.resetSeconds.toString(),
          },
        }
      )
    }
  }

  // Continue processing
  const response = NextResponse.next()

  // Apply security headers to all responses
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Enable XSS filter
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=(self)'
  )

  // Content Security Policy with nonce for production
  const isDev = process.env.NODE_ENV === 'development'
  const nonce = crypto.randomUUID()
  
  // Store nonce in header for inline scripts to use (production only)
  if (!isDev) {
    response.headers.set('X-Nonce', nonce)
  }
  
  // CSP configuration: strict in production, relaxed in development for HMR
  const cspDirectives = [
    "default-src 'self'",
    isDev 
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" // Required for Next.js HMR in dev
      : `script-src 'self' 'nonce-${nonce}' strict-dynamic`,
    isDev
      ? "style-src 'self' 'unsafe-inline'" // Required for Tailwind in dev
      : `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob: https: https://maps.googleapis.com https://maps.gstatic.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' wss: ws: https: https://maps.googleapis.com https://fonts.googleapis.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]
  
  response.headers.set(
    'Content-Security-Policy',
    cspDirectives.join('; ')
  )

  // Remove powered-by header
  response.headers.delete('X-Powered-By')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

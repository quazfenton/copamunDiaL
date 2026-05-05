/**
 * CSRF Protection Middleware for API Routes
 * 
 * Usage:
 * export const POST = withCSRF(async (request) => { ... })
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateCSRFToken } from '@/lib/security'

/**
 * Wrap an API handler with CSRF protection
 * Only applies to state-changing methods (POST, PUT, DELETE, PATCH)
 */
export function withCSRF<T extends NextResponse>(
  handler: (request: NextRequest) => Promise<T>
): (request: NextRequest) => Promise<T> {
  return async function csrfProtectedHandler(request: NextRequest): Promise<T> {
    // Only validate on state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const csrfResult = validateCSRFToken(request)
      if (!csrfResult.valid) {
        return NextResponse.json(
          { error: csrfResult.error || 'CSRF validation failed' },
          { status: 403 }
        ) as unknown as T
      }
    }
    
    return handler(request)
  }
}

/**
 * CSRF protection with custom options
 */
export function withCSRFOptions(options: {
  methods?: string[]
  skipPaths?: string[]
} = {}) {
  const protectedMethods = options.methods || ['POST', 'PUT', 'DELETE', 'PATCH']
  const skipPaths = options.skipPaths || []
  
  return function withCSRFDecorator<T extends NextResponse>(
    handler: (request: NextRequest) => Promise<T>
  ): (request: NextRequest) => Promise<T> {
    return async function csrfProtectedHandler(request: NextRequest): Promise<T> {
      // Skip protection for specified paths
      const urlPath = new URL(request.url).pathname
      if (skipPaths.some(path => urlPath.includes(path))) {
        return handler(request)
      }
      
      // Only validate on specified methods
      if (protectedMethods.includes(request.method)) {
        const csrfResult = validateCSRFToken(request)
        if (!csrfResult.valid) {
          return NextResponse.json(
            { error: csrfResult.error || 'CSRF validation failed', code: 'CSRF_VALIDATION_FAILED' },
            { status: 403 }
          ) as unknown as T
        }
      }
      
      return handler(request)
    }
  }
}

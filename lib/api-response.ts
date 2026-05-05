import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
};

// ==================== SUCCESS RESPONSE ====================

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } as ApiResponse<T>, {
    status,
  });
}

// Success response namespace with convenience methods
export namespace successResponse {
  export function ok<T>(data: T) {
    return NextResponse.json({ success: true, data } as ApiResponse<T>, { status: 200 });
  }

  export function created<T>(data: T) {
    return NextResponse.json({ success: true, data } as ApiResponse<T>, { status: 201 });
  }

  export function accepted<T>(data: T) {
    return NextResponse.json({ success: true, data } as ApiResponse<T>, { status: 202 });
  }

  export function noContent() {
    return NextResponse.json({ success: true } as ApiResponse<never>, { status: 204 });
  }
}

// ==================== ERROR RESPONSE ====================

export function errorResponse(code: string, message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { code, message } } as ApiResponse<never>,
    { status }
  );
}

// Error response namespace with convenience methods
export namespace errorResponse {
  export function badRequest(message: string) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message } } as ApiResponse<never>,
      { status: 400 }
    );
  }

  export function unauthorized(message = 'Authentication required') {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message } } as ApiResponse<never>,
      { status: 401 }
    );
  }

  export function forbidden(message = 'Access denied') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message } } as ApiResponse<never>,
      { status: 403 }
    );
  }

  export function notFound(message = 'Resource not found') {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message } } as ApiResponse<never>,
      { status: 404 }
    );
  }

  export function conflict(message = 'Resource conflict') {
    return NextResponse.json(
      { success: false, error: { code: 'CONFLICT', message } } as ApiResponse<never>,
      { status: 409 }
    );
  }

  export function tooManyRequests(message = 'Too many requests', retryAfter?: number) {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '0',
    };
    if (retryAfter) {
      headers['Retry-After'] = retryAfter.toString();
    }
    return NextResponse.json(
      { 
        success: false, 
        error: { code: 'RATE_LIMIT_EXCEEDED', message } 
      } as ApiResponse<never>,
      { status: 429, headers }
    );
  }

  export function internal(message = 'Internal server error') {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message } } as ApiResponse<never>,
      { status: 500 }
    );
  }

  export function badGateway(message = 'Bad gateway') {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_GATEWAY', message } } as ApiResponse<never>,
      { status: 502 }
    );
  }

  export function serviceUnavailable(message = 'Service unavailable') {
    return NextResponse.json(
      { success: false, error: { code: 'SERVICE_UNAVAILABLE', message } } as ApiResponse<never>,
      { status: 503 }
    );
  }
}

// ==================== ERROR HANDLERS ====================

export function handleZodError(error: ZodError) {
  const details = error.errors.map(e => ({
    path: e.path.join('.'),
    message: e.message,
  }));
  return errorResponse.badRequest('Invalid input');
}

export function handleDatabaseError(error: unknown) {
  console.error('Database error:', error);
  return errorResponse.internal('Database operation failed');
}

export function handleUnauthorizedError() {
  return errorResponse.unauthorized();
}

export function handleForbiddenError() {
  return errorResponse.forbidden();
}

export function handleNotFoundError(resource: string) {
  return errorResponse.notFound(`${resource} not found`);
}

export function handleInternalError(error: unknown) {
  console.error('Internal error:', error);
  return errorResponse.internal();
}

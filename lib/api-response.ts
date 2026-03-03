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

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } as ApiResponse<T>, {
    status,
  });
}

export function errorResponse(code: string, message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { code, message } } as ApiResponse<never>,
    { status }
  );
}

export function handleZodError(error: ZodError) {
  const details = error.errors.map(e => ({
    path: e.path.join('.'),
    message: e.message,
  }));
  return NextResponse.json(
    { 
      success: false, 
      error: { 
        code: 'VALIDATION_ERROR', 
        message: 'Invalid input',
        details 
      } 
    } as ApiResponse<never>,
    { status: 400 }
  );
}

export function handleDatabaseError(error: unknown) {
  console.error('Database error:', error);
  return errorResponse('DATABASE_ERROR', 'Database operation failed', 500);
}

export function handleUnauthorizedError() {
  return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
}

export function handleForbiddenError() {
  return errorResponse('FORBIDDEN', 'Access denied', 403);
}

export function handleNotFoundError(resource: string) {
  return errorResponse('NOT_FOUND', `${resource} not found`, 404);
}

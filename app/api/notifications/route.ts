import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { successResponse, errorResponse, handleZodError, handleDatabaseError } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit-log'
import { rateLimitMiddleware, RateLimitPresets } from '@/lib/rate-limit'
import { getSocketServer } from '@/lib/socket-server'

const createNotificationSchema = z.object({
  userId: z.string().cuid(),
  type: z.enum(['TEAM_INVITE', 'MATCH_REQUEST', 'PLAYER_INVITE', 'MATCH_SCHEDULED', 'MATCH_REMINDER', 'ACHIEVEMENT', 'SYSTEM']),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  data: z.record(z.any()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimitMiddleware(request, RateLimitPresets.api);
    if (rateLimitResult.limited && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam) : 50;

    // Validate limit
    if (isNaN(limit) || limit <= 0 || limit > 100) {
      return errorResponse('INVALID_PARAMS', 'Invalid limit parameter (must be 1-100)', 400);
    }

    const where: any = {
      userId: session.user.id
    }

    if (unreadOnly) {
      where.isRead = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    return successResponse(notifications)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error)
    }
    console.error('GET /api/notifications error:', error)
    return handleDatabaseError(error)
  }
}

async function POSTHandler(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimitMiddleware(request, RateLimitPresets.api);
    if (rateLimitResult.limited && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    const body = await request.json()
    const validatedData = createNotificationSchema.parse(body);

    // Security: Ensure notification is for the authenticated user or an admin
    if (validatedData.userId !== session.user.id) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { roles: true },
      });

      const isAdmin = currentUser?.roles.some((role: any) => 
        ["SUPER_ADMIN", "LEAGUE_ADMIN"].includes(role)
      );

      if (!isAdmin) {
        return errorResponse('FORBIDDEN', 'Unauthorized to create notification for this user', 403);
      }
    }

    const notification = await prisma.notification.create({
      data: {
        userId: validatedData.userId,
        type: validatedData.type,
        title: validatedData.title,
        message: validatedData.message,
        data: validatedData.data,
      }
    })

    // Emit real-time notification via Socket.IO
    try {
      const socketServer = getSocketServer();
      if (socketServer) {
        socketServer.emitToUser(validatedData.userId, 'notification:new', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          createdAt: notification.createdAt.toISOString(),
        });
      }
    } catch (socketError) {
      console.error('Failed to emit notification:', socketError);
      // Don't fail the request if socket emission fails
    }

    // Create audit log for system notifications
    if (validatedData.type === 'SYSTEM') {
      await createAuditLog('NOTIFICATION_CREATED', {
        userId: session.user.id,
        userEmail: session.user.email || undefined,
        resourceId: notification.id,
        metadata: {
          targetUserId: validatedData.userId,
          notificationType: validatedData.type,
        },
      });
    }

    return successResponse(notification, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error)
    }
    console.error('POST /api/notifications error:', error)
    return handleDatabaseError(error)
  }
}

// Wrap state-changing methods with CSRF protection
export const POST = withCSRF(POSTHandler)

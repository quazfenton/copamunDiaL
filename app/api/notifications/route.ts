import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleError } from '@/lib/error-handler'
import { Server as ServerIO } from "socket.io";
import { z } from 'zod';
import { NotificationType } from '@prisma/client';

const createNotificationSchema = z.object({
  userId: z.string().cuid(), // Ensure userId is a valid CUID
  type: z.nativeEnum(NotificationType), // Validate against NotificationType enum
  title: z.string().min(1).max(255), // Add length constraints
  message: z.string().min(1).max(1000), // Add length constraints
  data: z.record(z.any()).optional(), // Flexible for JSON data
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam) : 50;

    if (isNaN(limit) || limit <= 0) {
      return NextResponse.json({ error: 'Invalid limit parameter' }, { status: 400 });
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

    return NextResponse.json(notifications)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createNotificationSchema.parse(body);

    // Security: Ensure notification is for the authenticated user or an admin
    if (validatedData.userId !== session.user.id) {
      // Check if the authenticated user has an admin role
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { roles: true },
      });

      if (!currentUser || !currentUser.roles.some(role => ["SUPER_ADMIN", "LEAGUE_ADMIN"].includes(role))) {
        return NextResponse.json({ error: 'Unauthorized to create notification for this user' }, { status: 403 });
      }
    }

    const notification = await prisma.notification.create({
      data: validatedData
    })

    const response = new NextResponse(JSON.stringify(notification), { status: 201 });
    const io = (response as any).socket?.server?.io as ServerIO | undefined;
    if (io) {
      io.to(`user-${validatedData.userId}`).emit("new-notification", notification);
    }

    return response;
  } catch (error) {
    return handleError(error)
  }
}
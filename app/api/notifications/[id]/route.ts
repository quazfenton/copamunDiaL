import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

function handleError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
  }
  console.error('API Error:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
  status: z.string().optional(), // Assuming status is a string for now, could be enum
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params;
    const body = await request.json()
    const validatedData = updateNotificationSchema.parse(body);

    // Verify notification belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: {
        ...(validatedData.isRead !== undefined && { isRead: validatedData.isRead }),
        ...(validatedData.status && { data: { ...(notification.data as any), status: validatedData.status } })
      }
    })

    return NextResponse.json(updatedNotification)
  } catch (error) {
    return handleError(error)
  }
}
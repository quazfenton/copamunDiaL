import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleError } from '@/lib/error-handler'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleError } from '@/lib/error-handler'
import { z } from 'zod';

const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
  status: z.string().optional(), // Assuming status is a string for now, could be enum
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateNotificationSchema.parse(body);

    // Verify notification belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: params.id },
      data: {
        ...(validatedData.isRead !== undefined && { isRead: validatedData.isRead }),
        ...(validatedData.status && { data: { ...notification.data, status: validatedData.status } })
      }
    })

    return NextResponse.json(updatedNotification)
  } catch (error) {
    return handleError(error)
  }
}
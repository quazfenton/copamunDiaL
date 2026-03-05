import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleError } from '@/lib/error-handler'

/**
 * DELETE /api/notifications/[id]
 * Delete a notification
 */
async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: notificationId } = await params

    // Find notification and verify ownership
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Verify the notification belongs to the current user
    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Delete the notification
    await prisma.notification.delete({
      where: { id: notificationId },
    })

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully',
    })
  } catch (error) {
    return handleError(error)
  }
}

// Wrap state-changing methods with CSRF protection
export const DELETE = withCSRF(DELETEHandler)

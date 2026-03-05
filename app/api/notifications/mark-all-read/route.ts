import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleError } from '@/lib/error-handler'

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read for the current user
 */
async function PUTHandler(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mark all notifications as read
    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
    })
  } catch (error) {
    return handleError(error)
  }
}

// Wrap state-changing methods with CSRF protection
export const PUT = withCSRF(PUTHandler)

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleError } from '@/lib/error-handler'
import { withCSRF } from '@/lib/security'

const updateFriendshipSchema = z.object({
  status: z.enum(['accepted', 'declined']),
})

/**
 * GET /api/friends/status/[userId]
 * Check friendship status with another user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId: targetUserId } = await params
    const currentUserId = session.user.id

    // Cannot check status with self
    if (targetUserId === currentUserId) {
      return NextResponse.json({ status: 'self' })
    }

    // Check for existing friendship
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: currentUserId, friendId: targetUserId },
          { userId: targetUserId, friendId: currentUserId },
        ],
      },
    })

    if (!friendship) {
      return NextResponse.json({ status: 'not_friends' })
    }

    // Determine status based on who sent the request
    if (friendship.status === 'ACCEPTED') {
      return NextResponse.json({ status: 'friends' })
    }

    // If pending, determine if we sent or received the request
    if (friendship.userId === currentUserId) {
      return NextResponse.json({ status: 'pending_sent' })
    } else {
      return NextResponse.json({ status: 'pending_received' })
    }
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/friends/[friendshipId]
 * Remove friendship
 */
async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ friendshipId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { friendshipId } = await params
    const currentUserId = session.user.id

    // Find the friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    })

    if (!friendship) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 })
    }

    // Only participants can remove the friendship
    if (friendship.userId !== currentUserId && friendship.friendId !== currentUserId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Delete the friendship
    await prisma.friendship.delete({
      where: { id: friendshipId },
    })

    return NextResponse.json({
      success: true,
      message: 'Friendship removed successfully',
    })
  } catch (error) {
    return handleError(error)
  }
}

// Wrap state-changing methods with CSRF protection
export const DELETE = withCSRF(DELETEHandler)

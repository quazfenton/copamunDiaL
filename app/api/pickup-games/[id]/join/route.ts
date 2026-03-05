import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleError } from '@/lib/error-handler'

const joinPickupGameSchema = z.object({
  // Schema for validation if needed in future
})

/**
 * POST /api/pickup-games/[id]/join
 * Join a pickup game
 */
async function POSTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: pickupGameId } = await params
    const userId = session.user.id

    // Verify pickup game exists
    const pickupGame = await prisma.pickupGame.findUnique({
      where: { id: pickupGameId },
      include: {
        participants: true,
      },
    })

    if (!pickupGame) {
      return NextResponse.json({ error: 'Pickup game not found' }, { status: 404 })
    }

    // Check if already joined
    const existingParticipant = pickupGame.participants.find(
      (p) => p.userId === userId
    )

    if (existingParticipant) {
      return NextResponse.json(
        { error: 'You have already joined this game' },
        { status: 400 }
      )
    }

    // Check if game is full
    if (pickupGame.participants.length >= pickupGame.playersNeeded) {
      return NextResponse.json(
        { error: 'This game is full' },
        { status: 400 }
      )
    }

    // Check if game is in the past
    if (new Date(pickupGame.date) < new Date()) {
      return NextResponse.json(
        { error: 'Cannot join a game that has already occurred' },
        { status: 400 }
      )
    }

    // Add participant
    const participant = await prisma.pickupGameParticipant.create({
      data: {
        pickupGameId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    // Send notification to organizer
    if (pickupGame.organizerId !== userId) {
      await prisma.notification.create({
        data: {
          userId: pickupGame.organizerId,
          type: 'SYSTEM',
          title: 'New Player Joined',
          message: `${session.user.name || 'A player'} joined your pickup game`,
          data: {
            pickupGameId,
            playerId: userId,
            playerName: session.user.name,
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      participant,
      message: 'Successfully joined pickup game',
    })
  } catch (error) {
    return handleError(error)
  }
}

// Wrap state-changing methods with CSRF protection
export const POST = withCSRF(POSTHandler)

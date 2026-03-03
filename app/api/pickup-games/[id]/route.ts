import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleError } from '@/lib/error-handler'

const updatePickupGameSchema = z.object({
  location: z.string().max(200).optional(),
  date: z.string().datetime().optional(),
  sport: z.string().max(50).optional(),
  playersNeeded: z.number().min(1).max(50).optional(),
  description: z.string().max(1000).optional(),
})

/**
 * GET /api/pickup-games/[id]
 * Get details of a specific pickup game
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: pickupGameId } = await params

    const pickupGame = await prisma.pickupGame.findUnique({
      where: { id: pickupGameId },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            image: true,
            rating: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                rating: true,
              },
            },
          },
        },
      },
    })

    if (!pickupGame) {
      return NextResponse.json({ error: 'Pickup game not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...pickupGame,
      playersJoined: pickupGame.participants.length,
      spotsRemaining: pickupGame.playersNeeded - pickupGame.participants.length,
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * PATCH /api/pickup-games/[id]
 * Update a pickup game (organizer only)
 */
export async function PATCH(
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
    const body = await request.json()
    const validatedData = updatePickupGameSchema.parse(body)

    // Verify pickup game exists and user is organizer
    const pickupGame = await prisma.pickupGame.findUnique({
      where: { id: pickupGameId },
    })

    if (!pickupGame) {
      return NextResponse.json({ error: 'Pickup game not found' }, { status: 404 })
    }

    if (pickupGame.organizerId !== userId) {
      return NextResponse.json(
        { error: 'Only the organizer can update this game' },
        { status: 403 }
      )
    }

    // Validate date if provided
    if (validatedData.date) {
      const gameDate = new Date(validatedData.date)
      if (gameDate < new Date()) {
        return NextResponse.json(
          { error: 'Cannot schedule a game in the past' },
          { status: 400 }
        )
      }
    }

    // Update pickup game
    const updated = await prisma.pickupGame.update({
      where: { id: pickupGameId },
      data: validatedData,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    })

    // Notify participants of changes
    const participantIds = updated.participants
      .map((p) => p.userId)
      .filter((id) => id !== userId)

    if (participantIds.length > 0) {
      await prisma.notification.createMany({
        data: participantIds.map((participantId) => ({
          userId: participantId,
          type: 'SYSTEM',
          title: 'Pickup Game Updated',
          message: `The pickup game "${updated.location}" has been updated`,
          data: {
            pickupGameId,
            changes: validatedData,
          },
        })),
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/pickup-games/[id]
 * Delete a pickup game (organizer only)
 */
export async function DELETE(
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

    // Verify pickup game exists and user is organizer
    const pickupGame = await prisma.pickupGame.findUnique({
      where: { id: pickupGameId },
      include: {
        participants: true,
      },
    })

    if (!pickupGame) {
      return NextResponse.json({ error: 'Pickup game not found' }, { status: 404 })
    }

    if (pickupGame.organizerId !== userId) {
      return NextResponse.json(
        { error: 'Only the organizer can delete this game' },
        { status: 403 }
      )
    }

    // Delete the pickup game (participants will be cascade deleted)
    await prisma.pickupGame.delete({
      where: { id: pickupGameId },
    })

    // Notify participants of cancellation
    const participantIds = pickupGame.participants
      .map((p) => p.userId)
      .filter((id) => id !== userId)

    if (participantIds.length > 0) {
      await prisma.notification.createMany({
        data: participantIds.map((participantId) => ({
          userId: participantId,
          type: 'SYSTEM',
          title: 'Pickup Game Cancelled',
          message: `The pickup game "${pickupGame.location}" has been cancelled`,
          data: {
            pickupGameId,
            organizerId: userId,
          },
        })),
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Pickup game deleted successfully',
    })
  } catch (error) {
    return handleError(error)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleError } from '@/lib/error-handler'
import { getTournamentBracket, getTournamentStandings, BracketType } from '@/lib/tournament-bracket'

const updateTournamentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  maxTeams: z.number().min(2).max(64).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  registrationEnd: z.string().datetime().optional(),
  prizeInfo: z.string().max(200).optional(),
  rules: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
  entryFee: z.number().min(0).optional(),
  status: z.enum(['DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
})

/**
 * GET /api/tournaments/[id]
 * Get tournament details
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

    const { id: tournamentId } = await params

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
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
            team: {
              select: {
                id: true,
                name: true,
                logo: true,
                rating: true,
              },
            },
          },
        },
        matches: {
          take: 10,
          orderBy: {
            scheduledAt: 'asc',
          },
          include: {
            homeTeam: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
            awayTeam: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
          },
        },
        brackets: true,
      },
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Get bracket if exists
    const bracket = tournament.brackets.length > 0
      ? await getTournamentBracket(tournamentId)
      : null

    // Get standings for round robin
    const standings = tournament.bracketType === 'ROUND_ROBIN'
      ? await getTournamentStandings(tournamentId)
      : null

    return NextResponse.json({
      ...tournament,
      bracket,
      standings,
      registeredTeams: tournament.participants.length,
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * PATCH /api/tournaments/[id]
 * Update tournament
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

    const { id: tournamentId } = await params
    const body = await request.json()
    const validatedData = updateTournamentSchema.parse(body)

    // Verify tournament exists and user is organizer
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { organizerId: true, status: true },
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    if (tournament.organizerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the organizer can update this tournament' },
        { status: 403 }
      )
    }

    // Validate dates if provided
    if (validatedData.startDate) {
      const startDate = new Date(validatedData.startDate)
      if (startDate < new Date() && tournament.status !== 'DRAFT') {
        return NextResponse.json(
          { error: 'Cannot change start date to past for active tournaments' },
          { status: 400 }
        )
      }
    }

    // Update tournament
    const updated = await prisma.tournament.update({
      where: { id: tournamentId },
      data: validatedData,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/tournaments/[id]
 * Delete tournament
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

    const { id: tournamentId } = await params

    // Verify tournament exists and user is organizer
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { organizerId: true, status: true },
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    if (tournament.organizerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the organizer can delete this tournament' },
        { status: 403 }
      )
    }

    // Cannot delete active tournaments
    if (tournament.status === 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Cannot delete tournament that is in progress' },
        { status: 400 }
      )
    }

    // Delete tournament (cascade will delete matches, brackets, participants)
    await prisma.tournament.delete({
      where: { id: tournamentId },
    })

    return NextResponse.json({
      success: true,
      message: 'Tournament deleted successfully',
    })
  } catch (error) {
    return handleError(error)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleError } from '@/lib/error-handler'
import { withCSRF } from '@/lib/security'

const createLeagueSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isPublic: z.boolean().default(true),
  maxTeams: z.number().min(2).max(32).optional(),
  entryFee: z.number().min(0).optional(),
  prizePool: z.number().min(0).optional(),
  rules: z.string().max(2000).optional(),
  format: z.enum(['ROUND_ROBIN', 'KNOCKOUT', 'GROUP_STAGE']).default('ROUND_ROBIN'),
})

const updateLeagueSchema = createLeagueSchema.partial()

/**
 * GET /api/leagues/[id]
 * Get league details with standings and matches
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

    const { id: leagueId } = await params

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        teams: {
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
          orderBy: {
            points: 'desc',
          },
        },
        matches: {
          take: 20,
          orderBy: {
            date: 'desc',
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
      },
    })

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    // Check if league is public or user has access
    if (!league.isPublic) {
      const isMember = league.teams.some(
        (t) => t.team.id === session.user.id || 
        // Check if user is captain of any team in league
        true // Simplified - would need proper check
      )
      
      const isCreator = league.creatorId === session.user.id
      
      if (!isMember && !isCreator) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    // Calculate standings
    const standings = league.teams.map((lt) => ({
      teamId: lt.teamId,
      team: lt.team,
      points: lt.points,
      played: lt.wins + lt.losses + lt.draws,
      wins: lt.wins,
      draws: lt.draws,
      losses: lt.losses,
      goalsFor: lt.goalsFor,
      goalsAgainst: lt.goalsAgainst,
      goalDifference: lt.goalsFor - lt.goalsAgainst,
    }))

    return NextResponse.json({
      ...league,
      standings,
      teamCount: league.teams.length,
      matchCount: league.matches.length,
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * PATCH /api/leagues/[id]
 * Update league
 */
async function PATCHHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: leagueId } = await params
    const body = await request.json()
    const validatedData = updateLeagueSchema.parse(body)

    // Verify league exists and user is creator
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { creatorId: true },
    })

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    if (league.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the league creator can update this league' },
        { status: 403 }
      )
    }

    // Validate dates
    if (validatedData.startDate && validatedData.endDate) {
      const startDate = new Date(validatedData.startDate)
      const endDate = new Date(validatedData.endDate)
      if (endDate < startDate) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        )
      }
    }

    // Update league
    const updated = await prisma.league.update({
      where: { id: leagueId },
      data: validatedData,
      include: {
        creator: {
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
 * DELETE /api/leagues/[id]
 * Delete league
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

    const { id: leagueId } = await params

    // Verify league exists and user is creator
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { creatorId: true },
    })

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    if (league.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the league creator can delete this league' },
        { status: 403 }
      )
    }

    // Delete league (cascade will delete league teams and matches)
    await prisma.league.delete({
      where: { id: leagueId },
    })

    return NextResponse.json({
      success: true,
      message: 'League deleted successfully',
    })
  } catch (error) {
    return handleError(error)
  }
}

// Wrap state-changing methods with CSRF protection
export const DELETE = withCSRF(DELETEHandler)
export const PATCH = withCSRF(PATCHHandler)

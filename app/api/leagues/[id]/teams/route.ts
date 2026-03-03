import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleError } from '@/lib/error-handler'

const addTeamSchema = z.object({
  teamId: z.string(),
})

/**
 * POST /api/leagues/[id]/teams
 * Add a team to the league
 */
export async function POST(
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
    const validatedData = addTeamSchema.parse(body)

    // Verify league exists and user is creator
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        teams: true,
      },
    })

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    if (league.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the league creator can add teams' },
        { status: 403 }
      )
    }

    // Check if team is already in league
    const existingTeam = league.teams.find((t) => t.teamId === validatedData.teamId)
    if (existingTeam) {
      return NextResponse.json(
        { error: 'Team is already in the league' },
        { status: 400 }
      )
    }

    // Check max teams limit
    if (league.maxTeams && league.teams.length >= league.maxTeams) {
      return NextResponse.json(
        { error: 'League has reached maximum team capacity' },
        { status: 400 }
      )
    }

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: validatedData.teamId },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Add team to league
    const leagueTeam = await prisma.leagueTeam.create({
      data: {
        leagueId,
        teamId: validatedData.teamId,
      },
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
    })

    return NextResponse.json({
      success: true,
      leagueTeam,
      message: 'Team added to league successfully',
    }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/leagues/[id]/teams/[teamId]
 * Remove a team from the league
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: leagueId, teamId } = await params

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
        { error: 'Only the league creator can remove teams' },
        { status: 403 }
      )
    }

    // Remove team from league
    await prisma.leagueTeam.delete({
      where: {
        leagueId_teamId: {
          leagueId,
          teamId,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Team removed from league successfully',
    })
  } catch (error) {
    return handleError(error)
  }
}

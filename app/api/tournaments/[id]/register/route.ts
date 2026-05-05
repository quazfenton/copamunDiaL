import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleError } from '@/lib/error-handler'
import { createTournamentBracket } from '@/lib/tournament-bracket'
import { withCSRF } from '@/lib/security'
import type { BracketType } from '@/lib/types'

const registerTeamSchema = z.object({
  teamId: z.string(),
})

/**
 * POST /api/tournaments/[id]/register
 * Register a team for a tournament
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

    const { id: tournamentId } = await params
    const body = await request.json()
    const validatedData = registerTeamSchema.parse(body)

    // Get tournament details
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: true,
      },
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Check if registration is open
    if (tournament.status !== 'DRAFT' && tournament.status !== 'REGISTRATION_OPEN') {
      return NextResponse.json(
        { error: 'Registration is not open for this tournament' },
        { status: 400 }
      )
    }

    // Check if registration deadline has passed
    if (tournament.registrationEnd && new Date(tournament.registrationEnd) < new Date()) {
      return NextResponse.json(
        { error: 'Registration deadline has passed' },
        { status: 400 }
      )
    }

    // Check if tournament is full
    if (tournament.participants.length >= tournament.maxTeams) {
      return NextResponse.json(
        { error: 'Tournament is full' },
        { status: 400 }
      )
    }

    // Check if team is already registered
    const existingRegistration = tournament.participants.find(
      (p) => p.teamId === validatedData.teamId
    )

    if (existingRegistration) {
      return NextResponse.json(
        { error: 'Team is already registered' },
        { status: 400 }
      )
    }

    // Verify team exists and user is captain/creator
    const team = await prisma.team.findUnique({
      where: { id: validatedData.teamId },
      select: {
        createdBy: true,
        captains: true,
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const isCaptain = team.captains.some((c) => c.id === session.user.id)
    const isCreator = team.createdBy === session.user.id

    if (!isCaptain && !isCreator) {
      return NextResponse.json(
        { error: 'Only team captains or creators can register for tournaments' },
        { status: 403 }
      )
    }

    // Register team
    const registration = await prisma.tournamentTeam.create({
      data: {
        tournamentId,
        teamId: validatedData.teamId,
        status: 'REGISTERED',
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

    // If this is the second team and tournament is starting, generate bracket
    if (tournament.participants.length + 1 === 2 && tournament.status === 'DRAFT') {
      // Update status to registration open
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: 'REGISTRATION_OPEN' },
      })
    }

    // If tournament is full, generate bracket and close registration
    if (tournament.participants.length + 1 === tournament.maxTeams) {
      const allTeams = await prisma.tournamentTeam.findMany({
        where: { tournamentId },
        select: { teamId: true },
      })

      await createTournamentBracket(
        tournamentId,
        tournament.bracketType as BracketType,
        allTeams.map((t) => t.teamId)
      )

      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: 'REGISTRATION_CLOSED' },
      })
    }

    return NextResponse.json({
      success: true,
      registration,
      message: 'Team registered successfully',
    }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}

// Wrap state-changing methods with CSRF protection
export const POST = withCSRF(POSTHandler)

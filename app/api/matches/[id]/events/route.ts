import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleError } from '@/lib/error-handler'
import { createMatchEvent, getMatchEvents, getLiveCommentary, MatchEventType } from '@/lib/match-events'
import { withCSRF } from '@/lib/security'

const createEventSchema = z.object({
  type: z.nativeEnum(MatchEventType),
  minute: z.number().min(0).max(120),
  addedTime: z.number().min(0).max(10).optional(),
  playerId: z.string().optional(),
  teamId: z.string().optional(),
  details: z.object({
    description: z.string().optional(),
    assistPlayerId: z.string().optional(),
    assistPlayerName: z.string().optional(),
    reason: z.string().optional(),
    playerOutId: z.string().optional(),
    playerOutName: z.string().optional(),
    playerInId: z.string().optional(),
    playerInName: z.string().optional(),
    homeScore: z.number().optional(),
    awayScore: z.number().optional(),
    varOutcome: z.string().optional(),
    injuryDuration: z.number().optional(),
  }).optional(),
})

/**
 * GET /api/matches/[id]/events
 * Get all events for a match with commentary
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

    const { id: matchId } = await params

    // Verify match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        status: true,
        homeTeamId: true,
        awayTeamId: true,
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
    })

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Get events and commentary
    const { events, commentary, currentScore } = await getLiveCommentary(matchId)

    return NextResponse.json({
      match: {
        id: match.id,
        status: match.status,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
      },
      events,
      commentary,
      score: currentScore,
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * POST /api/matches/[id]/events
 * Create a new match event
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

    const { id: matchId } = await params
    const body = await request.json()
    const validatedData = createEventSchema.parse(body)

    // Verify match exists and user has permission
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: {
          select: {
            id: true,
            createdBy: true,
            captains: { select: { id: true } },
          },
        },
        awayTeam: {
          select: {
            id: true,
            createdBy: true,
            captains: { select: { id: true } },
          },
        },
      },
    })

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Check if user is authorized (match admin, team captain, or creator)
    const isHomeTeamAdmin = 
      match.homeTeam.createdBy === session.user.id ||
      match.homeTeam.captains.some((c) => c.id === session.user.id)
    
    const isAwayTeamAdmin =
      match.awayTeam.createdBy === session.user.id ||
      match.awayTeam.captains.some((c) => c.id === session.user.id)

    if (!isHomeTeamAdmin && !isAwayTeamAdmin) {
      return NextResponse.json(
        { error: 'Only match officials or team captains can add events' },
        { status: 403 }
      )
    }

    // Create event
    const result = await createMatchEvent(matchId, validatedData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Emit socket event for real-time update (if socket available)
    // This would be handled by the socket server

    return NextResponse.json({
      success: true,
      event: result.event,
      message: 'Event created successfully',
    }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/matches/[id]/events/[eventId]
 * Delete a match event
 */
async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: matchId, eventId } = await params

    // Verify event exists
    const event = await prisma.matchEvent.findUnique({
      where: { id: eventId },
      include: {
        match: {
          include: {
            homeTeam: { select: { createdBy: true, captains: { select: { id: true } } } },
            awayTeam: { select: { createdBy: true, captains: { select: { id: true } } } },
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check authorization
    const isHomeTeamAdmin = 
      event.match.homeTeam.createdBy === session.user.id ||
      event.match.homeTeam.captains.some((c) => c.id === session.user.id)
    
    const isAwayTeamAdmin =
      event.match.awayTeam.createdBy === session.user.id ||
      event.match.awayTeam.captains.some((c) => c.id === session.user.id)

    if (!isHomeTeamAdmin && !isAwayTeamAdmin) {
      return NextResponse.json(
        { error: 'Only match officials or team captains can delete events' },
        { status: 403 }
      )
    }

    // Delete event
    await prisma.matchEvent.delete({
      where: { id: eventId },
    })

    // TODO: Recalculate stats if goal/assist was deleted

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    })
  } catch (error) {
    return handleError(error)
  }
}

// Wrap state-changing methods with CSRF protection
export const POST = withCSRF(POSTHandler)
export const DELETE = withCSRF(DELETEHandler)

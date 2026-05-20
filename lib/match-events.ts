/**
 * Match Event Tracking System
 * 
 * Real-time match event tracking with commentary and statistics
 */

import { prisma } from './db'
import { z } from 'zod'

export enum MatchEventType {
  GOAL = 'GOAL',
  ASSIST = 'ASSIST',
  YELLOW_CARD = 'YELLOW_CARD',
  RED_CARD = 'RED_CARD',
  SUBSTITUTION = 'SUBSTITUTION',
  MATCH_START = 'MATCH_START',
  MATCH_END = 'MATCH_END',
  HALF_TIME = 'HALF_TIME',
  SECOND_HALF_START = 'SECOND_HALF_START',
  PENALTY = 'PENALTY',
  OWN_GOAL = 'OWN_GOAL',
  VAR_REVIEW = 'VAR_REVIEW',
  INJURY = 'INJURY',
}

export interface MatchEvent {
  id: string
  matchId: string
  type: MatchEventType
  minute: number
  addedTime?: number
  playerId?: string
  playerName?: string
  teamId?: string
  teamName?: string
  details?: {
    description?: string
    assistPlayerId?: string
    assistPlayerName?: string
    reason?: string
    playerOutId?: string
    playerOutName?: string
    playerInId?: string
    playerInName?: string
    homeScore?: number
    awayScore?: number
    varOutcome?: string
    injuryDuration?: number
  }
  timestamp: Date
}

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
 * Create a match event
 */
export async function createMatchEvent(
  matchId: string,
  data: z.infer<typeof createEventSchema>
): Promise<{ success: boolean; event?: MatchEvent; error?: string }> {
  try {
    // Verify match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        status: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
      },
    })

    if (!match) {
      return { success: false, error: 'Match not found' }
    }

    if (match.status !== 'LIVE' && data.type !== MatchEventType.MATCH_START) {
      return { success: false, error: 'Match is not live' }
    }

    // Create event
    const event = await prisma.matchEvent.create({
      data: {
        matchId,
        type: data.type,
        minute: data.minute,
        userId: data.playerId,
        details: data.details as any,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
          },
        },
      },
    })

    // Update match score if goal
    if (data.type === MatchEventType.GOAL && data.details?.homeScore !== undefined) {
      await prisma.match.update({
        where: { id: matchId },
        data: {
          homeScore: data.details.homeScore,
          awayScore: data.details.awayScore,
        },
      })
    }

    // Update player stats for goals
    if (data.type === MatchEventType.GOAL && data.playerId) {
      await prisma.matchParticipant.upsert({
        where: {
          matchId_userId: {
            matchId,
            userId: data.playerId,
          },
        },
        update: {
          goals: { increment: 1 },
        },
        create: {
          matchId,
          userId: data.playerId,
          teamId: data.teamId!,
          goals: 1,
          assists: 0,
        },
      })
    }

    // Update player stats for assists
    if (data.details?.assistPlayerId) {
      await prisma.matchParticipant.upsert({
        where: {
          matchId_userId: {
            matchId,
            userId: data.details.assistPlayerId,
          },
        },
        update: {
          assists: { increment: 1 },
        },
        create: {
          matchId,
          userId: data.details.assistPlayerId,
          teamId: data.teamId!,
          goals: 0,
          assists: 1,
        },
      })
    }

    return {
      success: true,
      event: {
        ...event,
        playerName: event.user?.name || event.user?.firstName,
        timestamp: event.match.date,
      },
    }
  } catch (error) {
    console.error('Create match event error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create event',
    }
  }
}

/**
 * Get match events with commentary
 */
export async function getMatchEvents(matchId: string): Promise<MatchEvent[]> {
  const events = await prisma.matchEvent.findMany({
    where: { matchId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          firstName: true,
        },
      },
    },
    orderBy: [{ minute: 'asc' }, { id: 'asc' }],
  })

  return events.map((e) => ({
    ...e,
    playerName: e.user?.name || e.user?.firstName,
    timestamp: e.match.date,
  }))
}

/**
 * Generate commentary text for an event
 */
export function generateCommentary(event: MatchEvent): string {
  const minute = event.addedTime 
    ? `${event.minute}+${event.addedTime}'` 
    : `${event.minute}'`

  const playerName = event.playerName || 'Unknown Player'

  switch (event.type) {
    case MatchEventType.GOAL:
      return `⚽ GOAL! ${playerName} scores! (${minute}) ${event.details?.description || ''}`
    
    case MatchEventType.ASSIST:
      return `🎯 Assist by ${playerName} (${minute})`
    
    case MatchEventType.YELLOW_CARD:
      return `🟨 Yellow card for ${playerName} - ${event.details?.reason || 'Foul'} (${minute})`
    
    case MatchEventType.RED_CARD:
      return `🟥 RED CARD! ${playerName} is sent off! ${event.details?.reason || ''} (${minute})`
    
    case MatchEventType.SUBSTITUTION:
      return `🔄 Substitution: ${event.details?.playerInName} replaces ${event.details?.playerOutName} (${minute})`
    
    case MatchEventType.MATCH_START:
      return `🏁 Match started! (${minute})`
    
    case MatchEventType.HALF_TIME:
      return `⏸️ Half-time (${minute})`
    
    case MatchEventType.SECOND_HALF_START:
      return `▶️ Second half underway (${minute})`
    
    case MatchEventType.MATCH_END:
      return `🏁 Full-time! Final score: ${event.details?.homeScore}-${event.details?.awayScore}`
    
    case MatchEventType.PENALTY:
      return `🎯 Penalty ${event.details?.description ? `- ${event.details.description}` : ''} (${minute})`
    
    case MatchEventType.OWN_GOAL:
      return `😓 Own goal! ${playerName} scores against their own team (${minute})`
    
    case MatchEventType.VAR_REVIEW:
      return `📺 VAR Review: ${event.details?.varOutcome || 'Checking...'} (${minute})`
    
    case MatchEventType.INJURY:
      return `🏥 Injury: ${playerName} - ${event.details?.injuryDuration || ''} minutes treatment (${minute})`
    
    default:
      return `Event: ${event.type} (${minute})`
  }
}

/**
 * Get live match commentary
 */
export async function getLiveCommentary(matchId: string): Promise<{
  events: MatchEvent[]
  commentary: string[]
  currentScore: { home: number; away: number }
}> {
  const events = await getMatchEvents(matchId)
  const commentary = events.map(generateCommentary)

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      homeScore: true,
      awayScore: true,
    },
  })

  return {
    events,
    commentary,
    currentScore: {
      home: match?.homeScore || 0,
      away: match?.awayScore || 0,
    },
  }
}

/**
 * Update match status based on events
 */
export async function updateMatchStatusFromEvents(
  matchId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const events = await getMatchEvents(matchId)
    
    const matchStart = events.find((e) => e.type === MatchEventType.MATCH_START)
    const halfTime = events.find((e) => e.type === MatchEventType.HALF_TIME)
    const matchEnd = events.find((e) => e.type === MatchEventType.MATCH_END)

    let newStatus = 'SCHEDULED'
    
    if (matchStart && !matchEnd) {
      if (halfTime) {
        // Check if second half started
        const secondHalf = events.find((e) => e.type === MatchEventType.SECOND_HALF_START)
        newStatus = secondHalf ? 'LIVE' : 'LIVE' // Could be at half-time
      } else {
        newStatus = 'LIVE'
      }
    } else if (matchEnd) {
      newStatus = 'COMPLETED'
    }

    await prisma.match.update({
      where: { id: matchId },
      data: { status: newStatus as any },
    })

    return { success: true }
  } catch (error) {
    console.error('Update match status error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update status',
    }
  }
}

/**
 * Get match statistics
 */
export async function getMatchStatistics(matchId: string): Promise<{
  homeTeam: {
    goals: number
    shots: number
    shotsOnTarget: number
    possession: number
    corners: number
    fouls: number
    yellowCards: number
    redCards: number
  }
  awayTeam: {
    goals: number
    shots: number
    shotsOnTarget: number
    possession: number
    corners: number
    fouls: number
    yellowCards: number
    redCards: number
  }
}> {
  const events = await getMatchEvents(matchId)
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
    },
  })

  const stats = {
    homeTeam: {
      goals: match?.homeScore || 0,
      shots: 0,
      shotsOnTarget: 0,
      possession: 50,
      corners: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
    },
    awayTeam: {
      goals: match?.awayScore || 0,
      shots: 0,
      shotsOnTarget: 0,
      possession: 50,
      corners: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
    },
  }

  // Count cards from events
  events.forEach((event) => {
    const isHome = event.teamId === match?.homeTeamId
    const team = isHome ? stats.homeTeam : stats.awayTeam

    if (event.type === MatchEventType.YELLOW_CARD) {
      team.yellowCards++
    } else if (event.type === MatchEventType.RED_CARD) {
      team.redCards++
    } else if (event.type === MatchEventType.GOAL) {
      team.goals = (event.details?.homeScore !== undefined && isHome) 
        ? event.details.homeScore 
        : (event.details?.awayScore !== undefined && !isHome)
        ? event.details.awayScore
        : team.goals
    }
  })

  return stats
}

export default {
  createMatchEvent,
  getMatchEvents,
  generateCommentary,
  getLiveCommentary,
  updateMatchStatusFromEvents,
  getMatchStatistics,
  MatchEventType,
}

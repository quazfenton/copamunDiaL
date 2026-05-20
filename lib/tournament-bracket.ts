/**
 * Tournament Bracket System
 * 
 * Generates and manages tournament brackets for various formats
 */

import { prisma } from './db'
import { z } from 'zod'

export type BracketType = 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS'
export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED'

export interface BracketMatch {
  id?: string
  round: number
  matchNumber: number
  homeTeamId?: string | null
  awayTeamId?: string | null
  homeTeamName?: string
  awayTeamName?: string
  winnerId?: string | null
  homeScore?: number | null
  awayScore?: number | null
  scheduledAt?: Date | null
  completedAt?: Date | null
  status: MatchStatus
  bracketId?: string
}

export interface BracketRound {
  round: number
  name: string
  matches: BracketMatch[]
}

export interface TournamentBracket {
  id: string
  tournamentId: string
  rounds: BracketRound[]
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED'
}

const updateMatchScoreSchema = z.object({
  homeScore: z.number().min(0),
  awayScore: z.number().min(0),
})

/**
 * Generate a single elimination bracket
 */
export function generateSingleEliminationBracket(
  teamIds: string[],
  teamNames?: Map<string, string>
): BracketMatch[] {
  const matches: BracketMatch[] = []
  const numRounds = Math.ceil(Math.log2(teamIds.length))
  const totalMatches = teamIds.length - 1

  let matchNumber = 1
  let teamsInRound = [...teamIds]

  // Generate rounds
  for (let round = 1; round <= numRounds; round++) {
    const roundMatches: BracketMatch[] = []
    const nextRoundTeams: string[] = []

    for (let i = 0; i < teamsInRound.length; i += 2) {
      const homeTeamId = teamsInRound[i]
      const awayTeamId = teamsInRound[i + 1] || null // Bye if odd number

      roundMatches.push({
        round,
        matchNumber: matchNumber++,
        homeTeamId,
        awayTeamId,
        homeTeamName: homeTeamId ? teamNames?.get(homeTeamId) : 'TBD',
        awayTeamName: awayTeamId ? teamNames?.get(awayTeamId) : 'BYE',
        status: awayTeamId ? 'SCHEDULED' : 'COMPLETED',
        homeScore: awayTeamId ? null : 0,
        awayScore: awayTeamId ? null : 0,
        winnerId: awayTeamId ? null : homeTeamId, // Auto-advance on bye
      })

      // For bye, team auto-advances
      if (!awayTeamId && homeTeamId) {
        nextRoundTeams.push(homeTeamId)
      }
    }

    matches.push(...roundMatches)
    teamsInRound = nextRoundTeams.length > 0 ? nextRoundTeams : teamsInRound.slice(0, teamsInRound.length / 2)
  }

  return matches
}

/**
 * Generate round robin bracket
 */
export function generateRoundRobinBracket(
  teamIds: string[],
  teamNames?: Map<string, string>
): BracketMatch[] {
  const matches: BracketMatch[] = []
  let matchNumber = 1

  // Each team plays every other team once
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push({
        round: 1, // All matches in same "round" for round robin
        matchNumber: matchNumber++,
        homeTeamId: teamIds[i],
        awayTeamId: teamIds[j],
        homeTeamName: teamNames?.get(teamIds[i]),
        awayTeamName: teamNames?.get(teamIds[j]),
        status: 'SCHEDULED',
      })
    }
  }

  return matches
}

/**
 * Generate double elimination bracket
 */
export function generateDoubleEliminationBracket(
  teamIds: string[],
  teamNames?: Map<string, string>
): {
  winnersBracket: BracketMatch[]
  losersBracket: BracketMatch[]
  final: BracketMatch
} {
  const winnersBracket = generateSingleEliminationBracket(teamIds, teamNames)
  const losersBracket: BracketMatch[] = []
  let matchNumber = 1000 // Start losers bracket match numbers at 1000

  // Generate losers bracket matches
  // Losers from winners bracket round 1 go to losers bracket round 1
  const round1Matches = winnersBracket.filter((m) => m.round === 1)
  const round2Matches = winnersBracket.filter((m) => m.round === 2)

  // For each round in winners bracket (except final), add losers matches
  for (let i = 0; i < round1Matches.length - 1; i++) {
    losersBracket.push({
      round: 1,
      matchNumber: matchNumber++,
      homeTeamId: null, // Will be filled when winners bracket matches complete
      awayTeamId: null,
      status: 'SCHEDULED',
    })
  }

  // Grand final
  const final: BracketMatch = {
    round: 999,
    matchNumber: 9999,
    homeTeamId: null,
    awayTeamId: null,
    status: 'SCHEDULED',
  }

  return { winnersBracket, losersBracket, final }
}

/**
 * Create tournament bracket in database
 */
export async function createTournamentBracket(
  tournamentId: string,
  bracketType: BracketType,
  teamIds: string[]
): Promise<TournamentBracket> {
  // Get team names
  const teams = await prisma.team.findMany({
    where: { id: { in: teamIds } },
    select: { id: true, name: true },
  })

  const teamNames = new Map<string, string>(teams.map((t) => [t.id, t.name] as [string, string]))

  // Generate bracket based on type
  let matches: BracketMatch[] = []

  switch (bracketType) {
    case 'SINGLE_ELIMINATION':
      matches = generateSingleEliminationBracket(teamIds, teamNames)
      break
    case 'ROUND_ROBIN':
      matches = generateRoundRobinBracket(teamIds, teamNames)
      break
    case 'DOUBLE_ELIMINATION':
      const doubleElim = generateDoubleEliminationBracket(teamIds, teamNames)
      matches = [...doubleElim.winnersBracket, ...doubleElim.losersBracket, doubleElim.final]
      break
    default:
      throw new Error(`Unsupported bracket type: ${bracketType}`)
  }

  // Create bracket in database
  const bracket = await prisma.tournamentBracket.create({
    data: {
      tournamentId,
      bracketData: { rounds: groupMatchesByRound(matches) },
    },
  })

  // Create matches in database
  const createdMatches = await prisma.tournamentMatch.createMany({
    data: matches.map((m) => ({
      tournamentId,
      bracketId: bracket.id,
      round: m.round,
      matchNumber: m.matchNumber,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      status: m.status,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
    })),
  })

  return {
    id: bracket.id,
    tournamentId,
    rounds: groupMatchesByRound(matches),
    status: 'DRAFT',
  }
}

/**
 * Group matches by round
 */
function groupMatchesByRound(matches: BracketMatch[]): BracketRound[] {
  const rounds = new Map<number, BracketMatch[]>()

  matches.forEach((match) => {
    if (!rounds.has(match.round)) {
      rounds.set(match.round, [])
    }
    rounds.get(match.round)!.push(match)
  })

  const roundNames: { [key: number]: string } = {
    1: 'Round 1',
    2: 'Round 2',
    3: 'Quarterfinals',
    4: 'Semifinals',
    5: 'Finals',
  }

  return Array.from(rounds.entries())
    .sort(([a], [b]) => a - b)
    .map(([round, matches]) => ({
      round,
      name: roundNames[round] || `Round ${round}`,
      matches,
    }))
}

/**
 * Update match score and advance winner
 */
export async function updateMatchScore(
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<{
  success: boolean
  error?: string
  nextMatches?: string[]
}> {
  try {
    const match = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: {
        tournament: {
          include: {
            matches: {
              orderBy: { round: 'asc' },
            },
          },
        },
      },
    })

    if (!match) {
      return { success: false, error: 'Match not found' }
    }

    if (match.status === 'COMPLETED') {
      return { success: false, error: 'Match already completed' }
    }

    // Update match score
    await prisma.tournamentMatch.update({
      where: { id: matchId },
      data: {
        homeScore,
        awayScore,
        status: 'COMPLETED',
        completedAt: new Date(),
        winnerId: homeScore > awayScore ? match.homeTeamId : match.awayTeamId,
      },
    })

    // Find next match(es) for the winner
    const nextMatches = await advanceWinner(match.tournamentId, match.round, match.matchNumber)

    return {
      success: true,
      nextMatches,
    }
  } catch (error) {
    console.error('Update match score error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update score',
    }
  }
}

/**
 * Advance winner to next round
 */
async function advanceWinner(
  tournamentId: string,
  currentRound: number,
  currentMatchNumber: number
): Promise<string[]> {
  const nextRound = currentRound + 1
  const nextMatchNumber = Math.ceil(currentMatchNumber / 2)

  // Find the next match
  const nextMatch = await prisma.tournamentMatch.findFirst({
    where: {
      tournamentId,
      round: nextRound,
      matchNumber: nextMatchNumber,
    },
  })

  if (!nextMatch) {
    return [] // No next match (tournament complete)
  }

  // Get current match to find winner
  const currentMatch = await prisma.tournamentMatch.findFirst({
    where: {
      tournamentId,
      round: currentRound,
      matchNumber: currentMatchNumber,
    },
  })

  if (!currentMatch?.winnerId) {
    return []
  }

  // Determine if winner goes to home or away slot in next match
  const isHomeSlot = currentMatchNumber % 2 === 1

  await prisma.tournamentMatch.update({
    where: { id: nextMatch.id },
    data: {
      [isHomeSlot ? 'homeTeamId' : 'awayTeamId']: currentMatch.winnerId,
    },
  })

  return [nextMatch.id]
}

/**
 * Get tournament bracket
 */
export async function getTournamentBracket(
  tournamentId: string
): Promise<TournamentBracket | null> {
  const bracket = await prisma.tournamentBracket.findFirst({
    where: { tournamentId },
    include: {
      matches: {
        include: {
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
        },
        orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
      },
    },
  })

  if (!bracket) {
    return null
  }

  const matches: BracketMatch[] = bracket.matches.map((m) => ({
    id: m.id,
    round: m.round,
    matchNumber: m.matchNumber,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeTeamName: m.homeTeam?.name,
    awayTeamName: m.awayTeam?.name,
    winnerId: m.winnerId,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    scheduledAt: m.scheduledAt,
    completedAt: m.completedAt,
    status: m.status as MatchStatus,
    bracketId: m.bracketId,
  }))

  return {
    id: bracket.id,
    tournamentId: bracket.tournamentId,
    rounds: groupMatchesByRound(matches),
    status: bracket.matches.every((m) => m.status === 'COMPLETED') ? 'COMPLETED' : 'IN_PROGRESS',
  }
}

/**
 * Reset tournament bracket
 */
export async function resetTournamentBracket(
  tournamentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete all matches
    await prisma.tournamentMatch.deleteMany({
      where: { tournamentId },
    })

    // Delete bracket
    await prisma.tournamentBracket.deleteMany({
      where: { tournamentId },
    })

    return { success: true }
  } catch (error) {
    console.error('Reset bracket error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset bracket',
    }
  }
}

/**
 * Get tournament standings (for round robin)
 */
export async function getTournamentStandings(
  tournamentId: string
): Promise<
  Array<{
    teamId: string
    teamName: string
    played: number
    wins: number
    losses: number
    draws: number
    goalsFor: number
    goalsAgainst: number
    goalDifference: number
    points: number
  }>
> {
  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
    },
  })

  const standings = new Map<
    string,
    {
      teamId: string
      teamName: string
      played: number
      wins: number
      losses: number
      draws: number
      goalsFor: number
      goalsAgainst: number
      points: number
    }
  >()

  matches.forEach((match) => {
    if (!match.homeTeam || !match.awayTeam) return
    if (match.status !== 'COMPLETED') return

    // Initialize teams if not exists
    if (!standings.has(match.homeTeam.id)) {
      standings.set(match.homeTeam.id, {
        teamId: match.homeTeam.id,
        teamName: match.homeTeam.name,
        played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      })
    }
    if (!standings.has(match.awayTeam.id)) {
      standings.set(match.awayTeam.id, {
        teamId: match.awayTeam.id,
        teamName: match.awayTeam.name,
        played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      })
    }

    const home = standings.get(match.homeTeam.id)!
    const away = standings.get(match.awayTeam.id)!

    // Update stats
    home.played++
    away.played++
    home.goalsFor += match.homeScore || 0
    home.goalsAgainst += match.awayScore || 0
    away.goalsFor += match.awayScore || 0
    away.goalsAgainst += match.homeScore || 0

    // Determine winner
    if ((match.homeScore || 0) > (match.awayScore || 0)) {
      home.wins++
      home.points += 3
      away.losses++
    } else if ((match.awayScore || 0) > (match.homeScore || 0)) {
      away.wins++
      away.points += 3
      home.losses++
    } else {
      home.draws++
      home.points += 1
      away.draws++
      away.points += 1
    }
  })

  // Sort by points, then goal difference
  return Array.from(standings.values()).map((team) => ({
    ...team,
    goalDifference: team.goalsFor - team.goalsAgainst,
  })).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    return b.goalDifference - a.goalDifference
  })
}

export default {
  generateSingleEliminationBracket,
  generateRoundRobinBracket,
  generateDoubleEliminationBracket,
  createTournamentBracket,
  updateMatchScore,
  getTournamentBracket,
  resetTournamentBracket,
  getTournamentStandings,
}

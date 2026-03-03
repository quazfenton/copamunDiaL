/**
 * CopaMundial MCP Server
 * 
 * Model Context Protocol server for AI agent integration
 * Provides tools, resources, and prompts for sports management
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Create MCP server
const server = new Server(
  {
    name: 'copamundial-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
)

// ==================== TOOLS ====================

// Tool: Create Team
server.tool(
  'create_team',
  'Create a new sports team with specified configuration',
  {
    name: z.string().min(1).max(100),
    bio: z.string().max(500).optional(),
    location: z.string().max(100).optional(),
    formation: z.string().default('4-4-2'),
    isPrivate: z.boolean().default(false),
    creatorId: z.string(),
  },
  async (params) => {
    try {
      const team = await prisma.team.create({
        data: {
          name: params.name,
          bio: params.bio,
          location: params.location,
          formation: params.formation,
          isPrivate: params.isPrivate,
          createdBy: params.creatorId,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      return {
        success: true,
        team,
        message: `Team "${params.name}" created successfully`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create team',
      }
    }
  }
)

// Tool: Find Teams
server.tool(
  'find_teams',
  'Search for teams matching specified criteria',
  {
    search: z.string().optional(),
    location: z.string().optional(),
    minRating: z.number().optional(),
    sport: z.string().optional(),
    limit: z.number().default(20),
  },
  async (params) => {
    try {
      const where: any = {}

      if (params.search) {
        where.name = { contains: params.search, mode: 'insensitive' }
      }

      if (params.location) {
        where.location = { contains: params.location, mode: 'insensitive' }
      }

      if (params.minRating) {
        where.rating = { gte: params.minRating }
      }

      const teams = await prisma.team.findMany({
        where,
        take: params.limit,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          captains: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: {
          rating: 'desc',
        },
      })

      return {
        success: true,
        teams: teams.map((t) => ({
          ...t,
          memberCount: t._count.members,
        })),
        count: teams.length,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search teams',
      }
    }
  }
)

// Tool: Schedule Match
server.tool(
  'schedule_match',
  'Schedule a match between two teams',
  {
    homeTeamId: z.string(),
    awayTeamId: z.string(),
    date: z.string().datetime(),
    location: z.string(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    sport: z.string().optional(),
    leagueId: z.string().optional(),
  },
  async (params) => {
    try {
      // Validate teams exist
      const [homeTeam, awayTeam] = await Promise.all([
        prisma.team.findUnique({ where: { id: params.homeTeamId } }),
        prisma.team.findUnique({ where: { id: params.awayTeamId } }),
      ])

      if (!homeTeam || !awayTeam) {
        return {
          success: false,
          error: 'One or both teams not found',
        }
      }

      // Validate date is in future
      const matchDate = new Date(params.date)
      if (matchDate < new Date()) {
        return {
          success: false,
          error: 'Match date must be in the future',
        }
      }

      const match = await prisma.match.create({
        data: {
          homeTeamId: params.homeTeamId,
          awayTeamId: params.awayTeamId,
          date: matchDate,
          location: params.location,
          latitude: params.latitude,
          longitude: params.longitude,
          sport: params.sport || 'soccer',
          leagueId: params.leagueId,
          status: 'SCHEDULED',
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
      })

      return {
        success: true,
        match,
        message: `Match scheduled: ${homeTeam.name} vs ${awayTeam.name}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule match',
      }
    }
  }
)

// Tool: Calculate Player Rating
server.tool(
  'calculate_player_rating',
  'Calculate comprehensive player rating based on performance metrics',
  {
    playerId: z.string(),
    includeHistory: z.boolean().default(true),
  },
  async (params) => {
    try {
      const player = await prisma.user.findUnique({
        where: { id: params.playerId },
        include: {
          matchParticipants: {
            include: {
              match: {
                select: {
                  date: true,
                  status: true,
                },
              },
            },
            orderBy: {
              match: {
                date: 'desc',
              },
            },
          },
        },
      })

      if (!player) {
        return {
          success: false,
          error: 'Player not found',
        }
      }

      // Calculate rating components
      const baseRating = player.rating || 0
      const matchesPlayed = player.matchParticipants.length
      const totalGoals = player.matchParticipants.reduce(
        (sum, mp) => sum + mp.goals,
        0
      )
      const totalAssists = player.matchParticipants.reduce(
        (sum, mp) => sum + mp.assists,
        0
      )

      // Calculate recent performance (last 10 matches)
      const recentMatches = player.matchParticipants.slice(0, 10)
      const recentRating =
        recentMatches.reduce((sum, mp) => sum + (mp.rating || 0), 0) /
        (recentMatches.length || 1)

      // Calculate consistency score
      const ratings = player.matchParticipants
        .map((mp) => mp.rating)
        .filter((r): r is number => r !== null)
      const avgRating =
        ratings.reduce((sum, r) => sum + r, 0) / (ratings.length || 1)
      const variance =
        ratings.reduce((sum, r) => sum + Math.pow(r - avgRating, 2), 0) /
        (ratings.length || 1)
      const consistencyScore = Math.max(0, 10 - Math.sqrt(variance))

      // Calculate improvement rate
      const olderMatches = player.matchParticipants.slice(-5)
      const newerMatches = player.matchParticipants.slice(0, 5)
      const olderAvg =
        olderMatches.reduce((sum, mp) => sum + (mp.rating || 0), 0) /
        (olderMatches.length || 1)
      const newerAvg =
        newerMatches.reduce((sum, mp) => sum + (mp.rating || 0), 0) /
        (newerMatches.length || 1)
      const improvementRate = newerAvg - olderAvg

      const overallRating = {
        base: baseRating,
        recent: recentRating,
        consistency: consistencyScore,
        improvement: improvementRate,
        offensive: (totalGoals + totalAssists) / (matchesPlayed || 1),
      }

      return {
        success: true,
        playerId: params.playerId,
        rating: overallRating,
        stats: {
          matchesPlayed,
          totalGoals,
          totalAssists,
          averageRating: avgRating,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate rating',
      }
    }
  }
)

// Tool: Get Team Statistics
server.tool(
  'get_team_statistics',
  'Get comprehensive statistics for a team',
  {
    teamId: z.string(),
  },
  async (params) => {
    try {
      const team = await prisma.team.findUnique({
        where: { id: params.teamId },
        include: {
          homeMatches: {
            where: {
              status: 'COMPLETED',
            },
            select: {
              homeScore: true,
              awayScore: true,
            },
          },
          awayMatches: {
            where: {
              status: 'COMPLETED',
            },
            select: {
              homeScore: true,
              awayScore: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  matches: true,
                  goals: true,
                  assists: true,
                  rating: true,
                },
              },
            },
          },
        },
      })

      if (!team) {
        return {
          success: false,
          error: 'Team not found',
        }
      }

      // Calculate match statistics
      const allMatches = [...team.homeMatches, ...team.awayMatches]
      const wins = allMatches.filter(
        (m) =>
          (m.homeTeamId === params.teamId && (m.homeScore || 0) > (m.awayScore || 0)) ||
          (m.awayTeamId === params.teamId && (m.awayScore || 0) > (m.homeScore || 0))
      ).length

      const losses = allMatches.filter(
        (m) =>
          (m.homeTeamId === params.teamId && (m.homeScore || 0) < (m.awayScore || 0)) ||
          (m.awayTeamId === params.teamId && (m.awayScore || 0) < (m.homeScore || 0))
      ).length

      const draws = allMatches.filter(
        (m) => (m.homeScore || 0) === (m.awayScore || 0)
      ).length

      const goalsFor = allMatches.reduce((sum, m) => {
        if (m.homeTeamId === params.teamId) return sum + (m.homeScore || 0)
        if (m.awayTeamId === params.teamId) return sum + (m.awayScore || 0)
        return sum
      }, 0)

      const goalsAgainst = allMatches.reduce((sum, m) => {
        if (m.homeTeamId === params.teamId) return sum + (m.awayScore || 0)
        if (m.awayTeamId === params.teamId) return sum + (m.homeScore || 0)
        return sum
      }, 0)

      // Calculate player statistics
      const playerStats = team.members.map((m) => ({
        playerId: m.userId,
        playerName: m.user.name,
        matches: m.user.matches,
        goals: m.user.goals,
        assists: m.user.assists,
        rating: m.user.rating,
      }))

      const avgPlayerRating =
        playerStats.reduce((sum, p) => sum + (p.rating || 0), 0) /
        (playerStats.length || 1)

      return {
        success: true,
        teamId: params.teamId,
        statistics: {
          matches: {
            total: allMatches.length,
            wins,
            losses,
            draws,
            winRate: wins / (allMatches.length || 1),
          },
          goals: {
            for: goalsFor,
            against: goalsAgainst,
            difference: goalsFor - goalsAgainst,
            avgPerMatch: goalsFor / (allMatches.length || 1),
          },
          players: {
            count: team.members.length,
            averageRating: avgPlayerRating,
            topPlayers: playerStats.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5),
          },
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get team statistics',
      }
    }
  }
)

// Tool: Find Available Matches
server.tool(
  'find_available_matches',
  'Find matches matching specified criteria',
  {
    teamId: z.string().optional(),
    status: z.enum(['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED']).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    location: z.string().optional(),
    radius: z.number().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    limit: z.number().default(20),
  },
  async (params) => {
    try {
      const where: any = {}

      if (params.status) {
        where.status = params.status
      }

      if (params.teamId) {
        where.OR = [
          { homeTeamId: params.teamId },
          { awayTeamId: params.teamId },
        ]
      }

      if (params.dateFrom || params.dateTo) {
        where.date = {}
        if (params.dateFrom) {
          where.date.gte = new Date(params.dateFrom)
        }
        if (params.dateTo) {
          where.date.lte = new Date(params.dateTo)
        }
      }

      if (params.location) {
        where.location = { contains: params.location, mode: 'insensitive' }
      }

      const matches = await prisma.match.findMany({
        where,
        take: params.limit,
        include: {
          homeTeam: {
            select: {
              id: true,
              name: true,
              logo: true,
              rating: true,
            },
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              logo: true,
              rating: true,
            },
          },
          league: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          date: 'asc',
        },
      })

      return {
        success: true,
        matches,
        count: matches.length,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find matches',
      }
    }
  }
)

// ==================== RESOURCES ====================

// Resource: Player Profile
server.resource(
  'player_profile',
  new URLPattern('copamundial://players/{playerId}'),
  async (uri, playerId) => {
    try {
      const player = await prisma.user.findUnique({
        where: { id: playerId },
        include: {
          teams: {
            include: {
              team: true,
            },
          },
          achievements: true,
        },
      })

      if (!player) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Player not found' }),
            },
          ],
        }
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                id: player.id,
                name: player.name,
                firstName: player.firstName,
                position: player.position,
                preferredPositions: player.preferredPositions,
                image: player.image,
                bio: player.bio,
                rating: player.rating,
                stats: {
                  matches: player.matches,
                  goals: player.goals,
                  assists: player.assists,
                  wins: player.wins,
                  losses: player.losses,
                  draws: player.draws,
                },
                teams: player.teams.map((t) => t.team),
                achievements: player.achievements,
              },
              null,
              2
            ),
          },
        ],
      }
    } catch (error) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Failed to fetch player',
            }),
          },
        ],
      }
    }
  }
)

// Resource: Team Profile
server.resource(
  'team_profile',
  new URLPattern('copamundial://teams/{teamId}'),
  async (uri, teamId) => {
    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          captains: {
            select: {
              id: true,
              name: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  position: true,
                  image: true,
                  rating: true,
                },
              },
            },
          },
          homeMatches: {
            take: 5,
            orderBy: { date: 'desc' },
          },
          awayMatches: {
            take: 5,
            orderBy: { date: 'desc' },
          },
        },
      })

      if (!team) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Team not found' }),
            },
          ],
        }
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                id: team.id,
                name: team.name,
                logo: team.logo,
                bio: team.bio,
                formation: team.formation,
                location: team.location,
                rating: team.rating,
                stats: {
                  wins: team.wins,
                  losses: team.losses,
                  draws: team.draws,
                },
                creator: team.creator,
                captains: team.captains,
                members: team.members.map((m) => ({
                  id: m.user.id,
                  name: m.user.name,
                  position: m.user.position,
                  image: m.user.image,
                  rating: m.user.rating,
                  teamPosition: m.position,
                  isReserve: m.isReserve,
                })),
                recentMatches: [...team.homeMatches, ...team.awayMatches].sort(
                  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                ),
              },
              null,
              2
            ),
          },
        ],
      }
    } catch (error) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Failed to fetch team',
            }),
          },
        ],
      }
    }
  }
)

// ==================== PROMPTS ====================

// Prompt: Build Optimal Team
server.prompt(
  'build_optimal_team',
  'Generate an optimal team composition based on available players',
  {
    availablePlayerIds: z.array(z.string()),
    preferredFormation: z.string().optional(),
    strategy: z.enum(['balanced', 'offensive', 'defensive']).optional(),
  },
  (args) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Given these available players: ${args.availablePlayerIds.join(', ')}, 
suggest an optimal lineup using a ${args.preferredFormation || '4-4-2'} formation 
with a ${args.strategy || 'balanced'} strategy. 

Consider:
1. Player ratings and preferred positions
2. Team chemistry and balance
3. Offensive/defensive balance based on strategy
4. Player form and recent performance

Provide:
- Starting 11 with positions
- Substitutes (if applicable)
- Brief explanation of tactical choices`,
          },
        },
      ],
    }
  }
)

// Prompt: Match Analysis
server.prompt(
  'match_analysis',
  'Analyze a completed match and provide insights',
  {
    matchId: z.string(),
  },
  (args) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze match ${args.matchId} and provide comprehensive insights including:

1. Key moments and turning points
2. Player performances (standout players, disappointing performances)
3. Tactical analysis (formations, strategies used)
4. Statistical breakdown (possession, shots, etc. if available)
5. Areas of improvement for both teams

Provide actionable recommendations for both teams based on the analysis.`,
          },
        },
      ],
    }
  }
)

// Prompt: Player Scouting Report
server.prompt(
  'player_scouting_report',
  'Generate a detailed scouting report for a player',
  {
    playerId: z.string(),
    position: z.string().optional(),
  },
  (args) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Generate a comprehensive scouting report for player ${args.playerId}${
              args.position ? ` for the ${args.position} position` : ''
            }.

Include:
1. Technical abilities (passing, shooting, dribbling, etc.)
2. Physical attributes (pace, strength, stamina)
3. Mental attributes (decision making, positioning, leadership)
4. Strengths and weaknesses
5. Performance trends (improving, declining, consistent)
6. Best suited formation and role
7. Comparison to similar players (if data available)
8. Transfer/market value estimate (if applicable)

Provide an overall assessment and recommendation.`,
          },
        },
      ],
    }
  }
)

// Start server
async function main() {
  try {
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('CopaMundial MCP Server running on stdio')
  } catch (error) {
    console.error('Failed to start MCP server:', error)
    process.exit(1)
  }
}

main()

export default server

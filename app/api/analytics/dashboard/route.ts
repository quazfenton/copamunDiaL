import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleError } from '@/lib/error-handler'

/**
 * GET /api/analytics/dashboard
 * Get comprehensive analytics dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'

    switch (type) {
      case 'player':
        return getPlayerAnalytics(session.user.id)
      case 'team':
        return getTeamAnalytics(session.user.id)
      case 'match':
        return getMatchAnalytics(session.user.id)
      case 'overview':
      default:
        return getOverviewAnalytics(session.user.id)
    }
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Get overview analytics
 */
async function getOverviewAnalytics(userId: string) {
  const [
    playerCount,
    teamCount,
    matchCount,
    tournamentCount,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.team.count(),
    prisma.match.count(),
    prisma.tournament.count(),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      select: {
        eventType: true,
        timestamp: true,
        userId: true,
        userEmail: true,
        action: true,
      },
    }),
  ])

  // Get user's teams
  const userTeams = await prisma.teamMember.findMany({
    where: { userId },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          logo: true,
          rating: true,
          wins: true,
          losses: true,
          draws: true,
        },
      },
    },
  })

  // Get upcoming matches for user's teams
  const teamIds = userTeams.map((m) => m.team.id)
  const upcomingMatches = await prisma.match.findMany({
    where: {
      OR: [
        { homeTeamId: { in: teamIds } },
        { awayTeamId: { in: teamIds } },
      ],
      status: 'SCHEDULED',
      date: {
        gte: new Date(),
      },
    },
    take: 5,
    include: {
      homeTeam: { select: { id: true, name: true, logo: true } },
      awayTeam: { select: { id: true, name: true, logo: true } },
    },
    orderBy: { date: 'asc' },
  })

  return NextResponse.json({
    overview: {
      totalPlayers: playerCount,
      totalTeams: teamCount,
      totalMatches: matchCount,
      totalTournaments: tournamentCount,
    },
    userTeams: userTeams.map((m) => ({
      ...m.team,
      role: m.position || 'Member',
      joinedAt: m.joinedAt,
    })),
    upcomingMatches,
    recentActivity: recentActivity.map((a) => ({
      ...a,
      timestamp: a.timestamp.toISOString(),
    })),
  })
}

/**
 * Get player analytics
 */
async function getPlayerAnalytics(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      matchParticipants: {
        include: {
          match: {
            select: {
              date: true,
              status: true,
              homeScore: true,
              awayScore: true,
            },
          },
        },
        orderBy: {
          match: { date: 'desc' },
        },
      },
      teams: {
        include: {
          team: true,
        },
      },
      achievements: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Calculate performance trends
  const matches = user.matchParticipants
  const recentMatches = matches.slice(0, 10)
  const olderMatches = matches.slice(10)

  const recentAvgRating =
    recentMatches.reduce((sum, m) => sum + (m.rating || 0), 0) /
    (recentMatches.length || 1)

  const olderAvgRating =
    olderMatches.reduce((sum, m) => sum + (m.rating || 0), 0) /
    (olderMatches.length || 1)

  const trend = recentAvgRating - olderAvgRating

  // Goal/Assist breakdown
  const totalGoals = matches.reduce((sum, m) => sum + m.goals, 0)
  const totalAssists = matches.reduce((sum, m) => sum + m.assists, 0)

  // Performance by position
  const performanceByPosition = new Map<string, { matches: number; avgRating: number }>()
  matches.forEach((m) => {
    const pos = m.position || 'Unknown'
    const existing = performanceByPosition.get(pos) || { matches: 0, totalRating: 0 }
    existing.matches++
    existing.totalRating = (existing.totalRating || 0) + (m.rating || 0)
    performanceByPosition.set(pos, existing)
  })

  return NextResponse.json({
    player: {
      id: user.id,
      name: user.name,
      position: user.position,
      rating: user.rating,
      stats: {
        matches: user.matches,
        goals: user.goals,
        assists: user.assists,
        wins: user.wins,
        losses: user.losses,
        draws: user.draws,
      },
    },
    performance: {
      recentAvgRating: Math.round(recentAvgRating * 100) / 100,
      olderAvgRating: Math.round(olderAvgRating * 100) / 100,
      trend: Math.round(trend * 100) / 100,
      trendDirection: trend > 0.1 ? 'improving' : trend < -0.1 ? 'declining' : 'stable',
      totalGoals,
      totalAssists,
      goalsPerMatch: Math.round((totalGoals / (matches.length || 1)) * 100) / 100,
      assistsPerMatch: Math.round((totalAssists / (matches.length || 1)) * 100) / 100,
    },
    positionPerformance: Array.from(performanceByPosition.entries()).map(([pos, data]) => ({
      position: pos,
      matches: data.matches,
      avgRating: Math.round((data.totalRating / data.matches) * 100) / 100,
    })),
    teams: user.teams.map((t) => ({
      id: t.team.id,
      name: t.team.name,
      role: t.position || 'Member',
    })),
    achievements: user.achievements,
    recentMatches: matches.slice(0, 5).map((m) => ({
      matchId: m.matchId,
      date: m.match.date,
      goals: m.goals,
      assists: m.assists,
      rating: m.rating,
      result: m.match.status,
    })),
  })
}

/**
 * Get team analytics
 */
async function getTeamAnalytics(userId: string) {
  // Get teams user is associated with
  const userTeams = await prisma.teamMember.findMany({
    where: { userId },
    include: {
      team: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  position: true,
                  rating: true,
                  goals: true,
                  assists: true,
                },
              },
            },
          },
          homeMatches: {
            where: { status: 'COMPLETED' },
            select: {
              homeScore: true,
              awayScore: true,
              date: true,
            },
          },
          awayMatches: {
            where: { status: 'COMPLETED' },
            select: {
              homeScore: true,
              awayScore: true,
              date: true,
            },
          },
        },
      },
    },
  })

  const analytics = userTeams.map(({ team }) => {
    const allMatches = [...team.homeMatches, ...team.awayMatches]
    
    // Calculate team stats
    const wins = allMatches.filter(
      (m) =>
        (team.id === m.homeScore && m.homeScore! > m.awayScore!) ||
        (team.id === m.awayScore && m.awayScore! > m.homeScore!)
    ).length

    const losses = allMatches.filter(
      (m) =>
        (team.id === m.homeScore && m.homeScore! < m.awayScore!) ||
        (team.id === m.awayScore && m.awayScore! < m.homeScore!)
    ).length

    const draws = allMatches.filter(
      (m) => m.homeScore === m.awayScore
    ).length

    const goalsFor = allMatches.reduce((sum, m) => {
      if (team.id === m.homeScore) return sum + (m.homeScore || 0)
      if (team.id === m.awayScore) return sum + (m.awayScore || 0)
      return sum
    }, 0)

    const goalsAgainst = allMatches.reduce((sum, m) => {
      if (team.id === m.homeScore) return sum + (m.awayScore || 0)
      if (team.id === m.awayScore) return sum + (m.homeScore || 0)
      return sum
    }, 0)

    // Top players
    const topPlayers = team.members
      .map((m) => ({
        id: m.user.id,
        name: m.user.name,
        position: m.user.position,
        rating: m.user.rating,
        goals: m.user.goals,
        assists: m.user.assists,
      }))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)

    return {
      team: {
        id: team.id,
        name: team.name,
        logo: team.logo,
        formation: team.formation,
        rating: team.rating,
      },
      stats: {
        matches: allMatches.length,
        wins,
        losses,
        draws,
        winRate: Math.round((wins / (allMatches.length || 1)) * 100) / 100,
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        avgGoalsPerMatch: Math.round((goalsFor / (allMatches.length || 1)) * 100) / 100,
      },
      squad: {
        totalPlayers: team.members.length,
        avgRating: Math.round(
          (team.members.reduce((sum, m) => sum + (m.user.rating || 0), 0) /
            (team.members.length || 1)) * 100
        ) / 100,
        topPlayers,
      },
    }
  })

  return NextResponse.json({
    teams: analytics,
  })
}

/**
 * Get match analytics
 */
async function getMatchAnalytics(userId: string) {
  // Get user's teams
  const userTeams = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  })

  const teamIds = userTeams.map((t) => t.teamId)

  const [
    totalMatches,
    completedMatches,
    upcomingMatches,
    liveMatches,
  ] = await Promise.all([
    prisma.match.count({
      where: {
        OR: [
          { homeTeamId: { in: teamIds } },
          { awayTeamId: { in: teamIds } },
        ],
      },
    }),
    prisma.match.count({
      where: {
        OR: [
          { homeTeamId: { in: teamIds } },
          { awayTeamId: { in: teamIds } },
        ],
        status: 'COMPLETED',
      },
    }),
    prisma.match.findMany({
      where: {
        OR: [
          { homeTeamId: { in: teamIds } },
          { awayTeamId: { in: teamIds } },
        ],
        status: 'SCHEDULED',
        date: { gte: new Date() },
      },
      take: 10,
      include: {
        homeTeam: { select: { id: true, name: true, logo: true } },
        awayTeam: { select: { id: true, name: true, logo: true } },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.match.count({
      where: {
        OR: [
          { homeTeamId: { in: teamIds } },
          { awayTeamId: { in: teamIds } },
        ],
        status: 'LIVE',
      },
    }),
  ])

  // Get recent results
  const recentResults = await prisma.match.findMany({
    where: {
      OR: [
        { homeTeamId: { in: teamIds } },
        { awayTeamId: { in: teamIds } },
      ],
      status: 'COMPLETED',
    },
    take: 10,
    include: {
      homeTeam: { select: { id: true, name: true, logo: true } },
      awayTeam: { select: { id: true, name: true, logo: true } },
    },
    orderBy: { date: 'desc' },
  })

  // Calculate win/loss ratio
  const wins = recentResults.filter(
    (m) =>
      (m.homeTeamId === m.homeTeam.id && m.homeScore! > m.awayScore!) ||
      (m.awayTeamId === m.awayTeam.id && m.awayScore! > m.homeScore!)
  ).length

  return NextResponse.json({
    summary: {
      total: totalMatches,
      completed: completedMatches,
      upcoming: upcomingMatches.length,
      live: liveMatches,
    },
    winRate: Math.round((wins / (recentResults.length || 1)) * 100) / 100,
    upcomingMatches,
    recentResults: recentResults.map((m) => ({
      id: m.id,
      date: m.date,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
    })),
  })
}

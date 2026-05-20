import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleError } from '@/lib/error-handler'
import { areFriends } from '@/lib/privacy'

/**
 * GET /api/players/[id]
 * Get detailed player profile with privacy controls
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

    const { id: playerId } = await params
    const currentUserId = session.user.id

    // Fetch player profile
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      include: {
        teams: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                logo: true,
                formation: true,
              },
            },
          },
        },
        achievements: true,
        matchParticipants: {
          include: {
            match: {
              select: {
                id: true,
                date: true,
                homeTeam: { select: { id: true, name: true } },
                awayTeam: { select: { id: true, name: true } },
                homeScore: true,
                awayScore: true,
                status: true,
              },
            },
          },
          take: 10,
          orderBy: { match: { date: 'desc' } },
        },
        captainOf: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Check privacy settings
    const isOwnProfile = currentUserId === playerId
    const isFriend = await areFriends(currentUserId, playerId)

    // Return public or private data based on relationship
    const publicData = {
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
      teams: player.teams.map((t) => ({
        id: t.team.id,
        name: t.team.name,
        logo: t.team.logo,
        formation: t.team.formation,
      })),
      achievements: player.achievements,
      captainOf: player.captainOf,
      recentMatches: player.matchParticipants.map((mp) => ({
        matchId: mp.match.id,
        date: mp.match.date,
        homeTeam: mp.match.homeTeam,
        awayTeam: mp.match.awayTeam,
        homeScore: mp.match.homeScore,
        awayScore: mp.match.awayScore,
        status: mp.match.status,
        personalStats: {
          goals: mp.goals,
          assists: mp.assists,
          rating: mp.rating,
        },
      })),
    }

    // Add private fields if own profile or friend
    const responseData = isOwnProfile || isFriend
      ? {
          ...publicData,
          email: player.email,
          phone: player.phone,
          location: player.location,
        }
      : publicData

    return NextResponse.json(responseData)
  } catch (error) {
    return handleError(error)
  }
}

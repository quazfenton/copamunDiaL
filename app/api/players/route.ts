import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createPlayerSchema = z.object({
  name: z.string().min(1),
  firstName: z.string().min(1),
  position: z.string().min(1),
  preferredPositions: z.array(z.string()),
  bio: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
})

const updatePlayerSchema = createPlayerSchema.partial()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const position = searchParams.get('position')
    const location = searchParams.get('location')

    const where: any = {
      isActive: true
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (position) {
      where.OR = [
        { position: { contains: position, mode: 'insensitive' } },
        { preferredPositions: { has: position } }
      ]
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' }
    }

        const where: any = {
      isActive: true
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (position) {
      // If position is provided, add it to the WHERE clause
      // This will implicitly AND with other conditions
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { position: { contains: position, mode: 'insensitive' } },
          { preferredPositions: { has: position } }
        ]
      });
    }

    if (location) {
      where.AND = where.AND || [];
      where.AND.push({ location: { contains: location, mode: 'insensitive' } });
    }

    const players = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        firstName: true,
        position: true,
        preferredPositions: true,
        image: true,
        bio: true,
        email: true,
        phone: true,
        location: true,
        rating: true,
        matches: true,
        goals: true,
        assists: true,
        wins: true,
        losses: true,
        draws: true,
        teams: {
          select: {
            team: {
              select: {
                id: true,
                name: true,
                logo: true
              }
            }
          }
        },
        achievements: {
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            earnedAt: true
          }
        },
        captainOf: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        rating: 'desc'
      }
    })

    const formattedPlayers = players.map(player => ({
      ...player,
      stats: {
        matches: player.matches,
        goals: player.goals,
        assists: player.assists,
        rating: player.rating || 0
      },
      teams: player.teams.map(t => t.team.id),
      isCaptain: player.captainOf.length > 0 // Dynamically determine if player is a captain
    }))

    return NextResponse.json(formattedPlayers)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createPlayerSchema.parse(body)

    // Fetch existing user to preserve roles
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true },
    });

    const currentRoles = existingUser?.roles || [];
    const newRoles = currentRoles.includes('PLAYER') ? currentRoles : [...currentRoles, 'PLAYER'];

    const player = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...validatedData,
        roles: newRoles,
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        position: true,
        preferredPositions: true,
        image: true,
        bio: true,
        email: true,
        phone: true,
        location: true,
        rating: true,
        matches: true,
        goals: true,
        assists: true,
        wins: true,
        losses: true,
        draws: true,
        teams: {
          select: {
            team: {
              select: {
                id: true,
                name: true,
                logo: true
              }
            }
          }
        },
        captainOf: {
          select: {
            id: true
          }
        }
      }
    })

    return NextResponse.json({
      ...player,
      stats: {
        matches: player.matches,
        goals: player.goals,
        assists: player.assists,
        rating: player.rating || 0
      },
      teams: player.teams.map(t => t.team.id),
      isCaptain: player.captainOf.length > 0
    })
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updatePlayerSchema.parse(body)

    const player = await prisma.user.update({
      where: { id: session.user.id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        firstName: true,
        position: true,
        preferredPositions: true,
        image: true,
        bio: true,
        email: true,
        phone: true,
        location: true,
        rating: true,
        matches: true,
        goals: true,
        assists: true,
        wins: true,
        losses: true,
        draws: true,
        teams: {
          select: {
            team: {
              select: {
                id: true,
                name: true,
                logo: true
              }
            }
          }
        },
        captainOf: {
          select: {
            id: true
          }
        }
      }
    })

    return NextResponse.json({
      ...player,
      stats: {
        matches: player.matches,
        goals: player.goals,
        assists: player.assists,
        rating: player.rating || 0
      },
      teams: player.teams.map(t => t.team.id),
      isCaptain: player.captainOf.length > 0
    })
  } catch (error) {
    return handleError(error)
  }
}

    const formattedPlayers = players.map(player => ({
      ...player,
      stats: {
        matches: player.matches,
        goals: player.goals,
        assists: player.assists,
        rating: player.rating || 0
      },
      teams: player.teams.map(t => t.team.id),
      isCaptain: false // This will be determined by team context
    }))

    return NextResponse.json(formattedPlayers)
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createPlayerSchema.parse(body)

    const player = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...validatedData,
        roles: ['PLAYER']
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        position: true,
        preferredPositions: true,
        image: true,
        bio: true,
        email: true,
        phone: true,
        location: true,
        rating: true,
        matches: true,
        goals: true,
        assists: true,
        wins: true,
        losses: true,
        draws: true
      }
    })

    return NextResponse.json({
      ...player,
      stats: {
        matches: player.matches,
        goals: player.goals,
        assists: player.assists,
        rating: player.rating || 0
      },
      teams: [],
      isCaptain: false
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Error creating player:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updatePlayerSchema.parse(body)

    const player = await prisma.user.update({
      where: { id: session.user.id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        firstName: true,
        position: true,
        preferredPositions: true,
        image: true,
        bio: true,
        email: true,
        phone: true,
        location: true,
        rating: true,
        matches: true,
        goals: true,
        assists: true,
        wins: true,
        losses: true,
        draws: true
      }
    })

    return NextResponse.json({
      ...player,
      stats: {
        matches: player.matches,
        goals: player.goals,
        assists: player.assists,
        rating: player.rating || 0
      },
      teams: [],
      isCaptain: false
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Error updating player:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
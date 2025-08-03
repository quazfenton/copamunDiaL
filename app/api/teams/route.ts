import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createTeamSchema = z.object({
  name: z.string().min(1),
  bio: z.string().optional(),
  location: z.string().optional(),
  isPrivate: z.boolean().default(false),
  formation: z.string().default('4-4-2')
})

const updateTeamSchema = createTeamSchema.partial()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const location = searchParams.get('location')
    const userTeamsOnly = searchParams.get('userTeamsOnly') === 'true'

    let where: any = {}

    if (userTeamsOnly) {
      where.members = {
        some: {
          userId: session.user.id
        }
      }
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' }
    }

    const teams = await prisma.team.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            firstName: true,
            image: true
          }
        },
        captains: {
          select: {
            id: true,
            name: true,
            firstName: true,
            image: true
          }
        },
        members: {
          include: {
            user: {
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
            }
          }
        }
      },
      orderBy: {
        rating: 'desc'
      }
    })

    const formattedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      logo: team.logo,
      bio: team.bio,
      formation: team.formation,
      location: team.location,
      isPrivate: team.isPrivate,
      wins: team.wins,
      losses: team.losses,
      draws: team.draws,
      rating: team.rating,
      createdBy: team.createdBy,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
      captains: team.captains.map(c => c.id),
      players: team.members
        .filter(m => !m.isReserve)
        .map(m => ({
          ...m.user,
          stats: {
            matches: m.user.matches,
            goals: m.user.goals,
            assists: m.user.assists,
            rating: m.user.rating || 0
          },
          teams: [team.id],
          isCaptain: team.captains.some(c => c.id === m.user.id)
        })),
      reserves: team.members
        .filter(m => m.isReserve)
        .map(m => ({
          ...m.user,
          stats: {
            matches: m.user.matches,
            goals: m.user.goals,
            assists: m.user.assists,
            rating: m.user.rating || 0
          },
          teams: [team.id],
          isCaptain: team.captains.some(c => c.id === m.user.id)
        }))
    }))

    return NextResponse.json(formattedTeams)
  } catch (error) {
    console.error('Error fetching teams:', error)
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
    const validatedData = createTeamSchema.parse(body)

    const team = await prisma.team.create({
      data: {
        ...validatedData,
        createdBy: session.user.id,
        captains: {
          connect: { id: session.user.id }
        },
        members: {
          create: {
            userId: session.user.id,
            position: 'Captain'
          }
        }
      },
      include: {
        captains: {
          select: {
            id: true,
            name: true,
            firstName: true,
            image: true
          }
        },
        members: {
          include: {
            user: {
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
            }
          }
        }
      }
    })

    const formattedTeam = {
      id: team.id,
      name: team.name,
      logo: team.logo,
      bio: team.bio,
      formation: team.formation,
      location: team.location,
      isPrivate: team.isPrivate,
      wins: team.wins,
      losses: team.losses,
      draws: team.draws,
      rating: team.rating,
      createdBy: team.createdBy,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
      captains: team.captains.map(c => c.id),
      players: team.members
        .filter(m => !m.isReserve)
        .map(m => ({
          ...m.user,
          stats: {
            matches: m.user.matches,
            goals: m.user.goals,
            assists: m.user.assists,
            rating: m.user.rating || 0
          },
          teams: [team.id],
          isCaptain: team.captains.some(c => c.id === m.user.id)
        })),
      reserves: team.members
        .filter(m => m.isReserve)
        .map(m => ({
          ...m.user,
          stats: {
            matches: m.user.matches,
            goals: m.user.goals,
            assists: m.user.assists,
            rating: m.user.rating || 0
          },
          teams: [team.id],
          isCaptain: team.captains.some(c => c.id === m.user.id)
        }))
    }

    return NextResponse.json(formattedTeam)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Error creating team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
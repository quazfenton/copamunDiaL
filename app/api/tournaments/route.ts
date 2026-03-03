import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleError } from '@/lib/error-handler'
import { createTournamentBracket, getTournamentBracket, BracketType } from '@/lib/tournament-bracket'

const createTournamentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  sport: z.string().max(50),
  bracketType: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN']).default('SINGLE_ELIMINATION'),
  maxTeams: z.number().min(2).max(64),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  registrationEnd: z.string().datetime().optional(),
  prizeInfo: z.string().max(200).optional(),
  rules: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
  entryFee: z.number().min(0).optional(),
})

const updateTournamentSchema = createTournamentSchema.partial()

/**
 * GET /api/tournaments
 * Get all tournaments with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}

    if (sport) {
      where.sport = sport
    }

    if (status) {
      where.status = status
    }

    const skip = (page - 1) * limit

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        skip,
        take: limit,
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
            },
          },
          participants: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  logo: true,
                },
              },
            },
          },
          _count: {
            select: {
              participants: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.tournament.count({ where }),
    ])

    return NextResponse.json({
      data: tournaments.map((t) => ({
        ...t,
        registeredTeams: t._count.participants,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * POST /api/tournaments
 * Create a new tournament
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createTournamentSchema.parse(body)

    // Validate dates
    const startDate = new Date(validatedData.startDate)
    if (startDate < new Date()) {
      return NextResponse.json(
        { error: 'Start date cannot be in the past' },
        { status: 400 }
      )
    }

    if (validatedData.endDate) {
      const endDate = new Date(validatedData.endDate)
      if (endDate < startDate) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        )
      }
    }

    // Create tournament
    const tournament = await prisma.tournament.create({
      data: {
        ...validatedData,
        organizerId: session.user.id,
        status: 'DRAFT',
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      ...tournament,
      message: 'Tournament created successfully',
    }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}

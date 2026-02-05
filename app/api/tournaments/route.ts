import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

// Validation schemas
const createTournamentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  sport: z.string().min(1),
  bracketType: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS']),
  maxTeams: z.number().min(4).max(64),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  registrationEnd: z.string().datetime().optional(),
  prizeInfo: z.string().optional(),
  rules: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  entryFee: z.number().min(0).optional(),
})

// GET /api/tournaments - Get all tournaments with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const sport = searchParams.get('sport')
    const myTournaments = searchParams.get('my') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (sport) {
      where.sport = sport
    }
    
    if (myTournaments && session?.user?.id) {
      where.OR = [
        { organizerId: session.user.id },
        { participants: { some: { team: { members: { some: { userId: session.user.id } } } } } }
      ]
    }

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          },
          participants: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  logo: true,
                  rating: true,
                }
              }
            }
          },
          _count: {
            select: {
              matches: true,
              participants: true,
            }
          }
        },
        orderBy: { startDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.tournament.count({ where })
    ])

    return NextResponse.json({
      tournaments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + tournaments.length < total
      }
    })
  } catch (error) {
    console.error('Error fetching tournaments:', error)
    return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 })
  }
}

// POST /api/tournaments - Create a new tournament
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createTournamentSchema.parse(body)

    const tournament = await prisma.tournament.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        sport: validatedData.sport,
        bracketType: validatedData.bracketType,
        maxTeams: validatedData.maxTeams,
        location: validatedData.location,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        prizeInfo: validatedData.prizeInfo,
        rules: validatedData.rules,
        entryFee: validatedData.entryFee,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
        registrationEnd: validatedData.registrationEnd ? new Date(validatedData.registrationEnd) : undefined,
        organizerId: session.user.id,
        status: 'DRAFT',
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      }
    })

    return NextResponse.json(tournament, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating tournament:', error)
    return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 })
  }
}

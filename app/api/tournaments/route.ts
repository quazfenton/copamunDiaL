import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { successResponse, errorResponse, handleZodError, handleDatabaseError } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit-log'
import { rateLimitMiddleware, RateLimitPresets } from '@/lib/rate-limit'
import { InputSanitizer } from '@/lib/sanitizer'
import { createTournamentBracket, getTournamentBracket, BracketType } from '@/lib/tournament-bracket'

const createTournamentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  sport: z.string().max(50),
  bracketType: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS']).default('SINGLE_ELIMINATION'),
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
    // Rate limiting
    const rateLimitResult = await rateLimitMiddleware(request, RateLimitPresets.api);
    if (rateLimitResult.limited && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport') ? InputSanitizer.sanitizeText(searchParams.get('sport')!) : null
    const status = searchParams.get('status') ? InputSanitizer.sanitizeText(searchParams.get('status')!) : null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Validate pagination
    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1 || limit > 100) {
      return errorResponse('INVALID_PARAMS', 'Invalid pagination (page >= 1, limit: 1-100)', 400)
    }

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

    return successResponse({
      tournaments: tournaments.map((t) => ({
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
    if (error instanceof z.ZodError) {
      return handleZodError(error)
    }
    console.error('GET /api/tournaments error:', error)
    return handleDatabaseError(error)
  }
}

/**
 * POST /api/tournaments
 * Create a new tournament
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimitMiddleware(request, RateLimitPresets.api);
    if (rateLimitResult.limited && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    const body = await request.json()
    const validatedData = createTournamentSchema.parse(body)

    // Validate dates
    const startDate = new Date(validatedData.startDate)
    if (startDate < new Date()) {
      return errorResponse('INVALID_DATE', 'Start date cannot be in the past', 400)
    }

    if (validatedData.endDate) {
      const endDate = new Date(validatedData.endDate)
      if (endDate < startDate) {
        return errorResponse('INVALID_DATE', 'End date must be after start date', 400)
      }
    }

    if (validatedData.registrationEnd) {
      const registrationEnd = new Date(validatedData.registrationEnd)
      if (registrationEnd > startDate) {
        return errorResponse('INVALID_DATE', 'Registration must end before tournament starts', 400)
      }
    }

    // Sanitize text fields
    const sanitizedData = {
      ...validatedData,
      name: InputSanitizer.sanitizeText(validatedData.name),
      description: validatedData.description ? InputSanitizer.sanitizeRichText(validatedData.description, { maxLength: 500 }) : undefined,
      location: validatedData.location ? InputSanitizer.sanitizeText(validatedData.location) : undefined,
      prizeInfo: validatedData.prizeInfo ? InputSanitizer.sanitizeText(validatedData.prizeInfo) : undefined,
      rules: validatedData.rules ? InputSanitizer.sanitizeRichText(validatedData.rules, { maxLength: 2000 }) : undefined,
    }

    // Create tournament
    const tournament = await prisma.tournament.create({
      data: {
        ...sanitizedData,
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

    // Create audit log
    await createAuditLog('TOURNAMENT_CREATED', {
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      resourceId: tournament.id,
      metadata: {
        tournamentName: tournament.name,
        sport: tournament.sport,
        maxTeams: tournament.maxTeams,
      },
    });

    return successResponse({
      ...tournament,
      message: 'Tournament created successfully',
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error)
    }
    console.error('POST /api/tournaments error:', error)
    return handleDatabaseError(error)
  }
}

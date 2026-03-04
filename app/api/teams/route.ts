import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { successResponse, errorResponse, handleZodError, handleDatabaseError } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit-log'
import { InputSanitizer } from '@/lib/sanitizer'
import { rateLimitMiddleware, RateLimitPresets } from '@/lib/rate-limit'

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  isPrivate: z.boolean().default(false),
  formation: z.string().default('4-4-2')
})

const updateTeamSchema = createTeamSchema.partial()

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
    const search = searchParams.get('search') ? InputSanitizer.sanitizeSearchQuery(searchParams.get('search')!) : null
    const location = searchParams.get('location') ? InputSanitizer.sanitizeText(searchParams.get('location')!) : null
    const userTeamsOnly = searchParams.get('userTeamsOnly') === 'true'
    const take = parseInt(searchParams.get('take') || '10')
    const skip = parseInt(searchParams.get('skip') || '0')

    // Validate pagination
    if (isNaN(take) || take <= 0 || take > 100 || isNaN(skip) || skip < 0) {
      return errorResponse('INVALID_PARAMS', 'Invalid pagination parameters (take: 1-100, skip: >= 0)', 400);
    }

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
      },
      take,
      skip
    })

    const formattedTeams = teams.map((team: any) => {
      const captainIds = new Set(team.captains.map((c: any) => c.id));
      return ({
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
        captains: Array.from(captainIds),
        players: team.members
          .filter((m: any) => !m.isReserve)
          .map((m: any) => ({
            ...m.user,
            stats: {
              matches: m.user.matches,
              goals: m.user.goals,
              assists: m.user.assists,
              rating: m.user.rating || 0
            },
            isCaptain: captainIds.has(m.user.id)
          })),
        reserves: team.members
          .filter((m: any) => m.isReserve)
          .map((m: any) => ({
            ...m.user,
            stats: {
              matches: m.user.matches,
              goals: m.user.goals,
              assists: m.user.assists,
              rating: m.user.rating || 0
            },
            isCaptain: captainIds.has(m.user.id)
          }))
      })
    })

    return successResponse(formattedTeams)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error)
    }
    console.error('GET /api/teams error:', error)
    return handleDatabaseError(error)
  }
}

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
    const validatedData = createTeamSchema.parse(body)

    const team = await prisma.team.create({
      data: {
        name: InputSanitizer.sanitizeText(validatedData.name),
        bio: validatedData.bio ? InputSanitizer.sanitizeRichText(validatedData.bio, { maxLength: 500 }) : null,
        location: validatedData.location ? InputSanitizer.sanitizeText(validatedData.location) : null,
        formation: validatedData.formation,
        isPrivate: validatedData.isPrivate,
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

    // Create audit log
    await createAuditLog('TEAM_CREATED', {
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      resourceId: team.id,
      metadata: {
        teamName: team.name,
        isPrivate: team.isPrivate,
      },
    });

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
      captains: team.captains.map((c: any) => c.id),
      players: team.members
        .filter((m: any) => !m.isReserve)
        .map((m: any) => ({
          ...m.user,
          stats: {
            matches: m.user.matches,
            goals: m.user.goals,
            assists: m.user.assists,
            rating: m.user.rating || 0
          },
          teams: [team.id],
          isCaptain: team.captains.some((c: any) => c.id === m.user.id)
        })),
      reserves: team.members
        .filter((m: any) => m.isReserve)
        .map((m: any) => ({
          ...m.user,
          stats: {
            matches: m.user.matches,
            goals: m.user.goals,
            assists: m.user.assists,
            rating: m.user.rating || 0
          },
          teams: [team.id],
          isCaptain: team.captains.some((c: any) => c.id === m.user.id)
        }))
    }

    return successResponse(formattedTeam, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error)
    }
    console.error('POST /api/teams error:', error)
    return handleDatabaseError(error)
  }
}

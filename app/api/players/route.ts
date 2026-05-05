import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { successResponse, errorResponse, handleZodError, handleDatabaseError } from '@/lib/api-response'
import { createAuditLog, AuditEventType } from '@/lib/audit-log'
import { InputSanitizer } from '@/lib/sanitizer'
import { rateLimitMiddleware, RateLimitPresets } from '@/lib/rate-limit'
import { withCSRF } from '@/lib/security'

// Schemas with proper validation
const createPlayerSchema = z.object({
  name: z.string().min(1).max(100),
  firstName: z.string().min(1).max(50),
  position: z.string().min(1).max(50),
  preferredPositions: z.array(z.string()).max(5),
  bio: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  location: z.string().max(100).optional(),
})

const updatePlayerSchema = createPlayerSchema.partial()

// Public player fields (safe to expose to all authenticated users)
const publicPlayerFields = {
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
}

// Private player fields (only visible to self or friends)
const privatePlayerFields = {
  ...publicPlayerFields,
  email: true,
  phone: true,
  location: true,
}

/**
 * Check if two users are friends
 */
async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: userId1, friendId: userId2 },
        { userId: userId2, friendId: userId1 },
      ],
      status: 'ACCEPTED',
    },
  })
  return !!friendship
}

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
    const position = searchParams.get('position') ? InputSanitizer.sanitizeText(searchParams.get('position')!) : null
    const location = searchParams.get('location') ? InputSanitizer.sanitizeText(searchParams.get('location')!) : null
    const includePrivate = searchParams.get('includePrivate') === 'true'

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

    // Determine which fields to return based on privacy settings
    const selectFields = includePrivate ? privatePlayerFields : publicPlayerFields

    const players = await prisma.user.findMany({
      where,
      select: selectFields,
      orderBy: {
        rating: 'desc'
      }
    })

    const formattedPlayers = players.map((player: any) => ({
      ...player,
      stats: {
        matches: player.matches,
        goals: player.goals,
        assists: player.assists,
        rating: player.rating || 0
      },
      teams: player.teams.map((t: any) => t.team.id),
      isCaptain: player.captainOf.length > 0
    }))

    return successResponse(formattedPlayers)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error)
    }
    console.error('GET /api/players error:', error)
    return handleDatabaseError(error)
  }
}

async function POSTHandler(request: NextRequest) {
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
    const validatedData = createPlayerSchema.parse(body)

    // Fetch existing user to preserve roles
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true },
    });

    const currentRoles = existingUser?.roles || [];
    const newRoles = currentRoles.includes('PLAYER') ? currentRoles : [...currentRoles, 'PLAYER'];

    // Sanitize input data
    const sanitizedData = {
      name: InputSanitizer.sanitizeText(validatedData.name),
      firstName: InputSanitizer.sanitizeText(validatedData.firstName),
      position: InputSanitizer.sanitizeText(validatedData.position),
      preferredPositions: validatedData.preferredPositions.map(p => InputSanitizer.sanitizeText(p)),
      bio: validatedData.bio ? InputSanitizer.sanitizeRichText(validatedData.bio, { maxLength: 500 }) : undefined,
      phone: validatedData.phone ? InputSanitizer.sanitizePhone(validatedData.phone) : undefined,
      location: validatedData.location ? InputSanitizer.sanitizeText(validatedData.location) : undefined,
    };

    const player = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...sanitizedData,
        roles: newRoles as any,
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

    // Create audit log
    await createAuditLog(AuditEventType.PLAYER_PROFILE_UPDATED, {
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      metadata: {
        playerName: player.name,
        position: player.position,
      },
    });

    return successResponse({
      ...player,
      stats: {
        matches: player.matches,
        goals: player.goals,
        assists: player.assists,
        rating: player.rating || 0
      },
      teams: player.teams.map((t: any) => t.team.id),
      isCaptain: player.captainOf.length > 0
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error)
    }
    console.error('POST /api/players error:', error)
    return handleDatabaseError(error)
  }
}

async function PUTHandler(request: NextRequest) {
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
    const validatedData = updatePlayerSchema.parse(body)

    // Sanitize input data
    const sanitizedData: any = {};
    if (validatedData.name) sanitizedData.name = InputSanitizer.sanitizeText(validatedData.name);
    if (validatedData.firstName) sanitizedData.firstName = InputSanitizer.sanitizeText(validatedData.firstName);
    if (validatedData.position) sanitizedData.position = InputSanitizer.sanitizeText(validatedData.position);
    if (validatedData.preferredPositions) sanitizedData.preferredPositions = validatedData.preferredPositions.map(p => InputSanitizer.sanitizeText(p));
    if (validatedData.bio) sanitizedData.bio = InputSanitizer.sanitizeRichText(validatedData.bio, { maxLength: 500 });
    if (validatedData.phone) sanitizedData.phone = InputSanitizer.sanitizePhone(validatedData.phone);
    if (validatedData.location) sanitizedData.location = InputSanitizer.sanitizeText(validatedData.location);

    const player = await prisma.user.update({
      where: { id: session.user.id },
      data: sanitizedData,
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

    return successResponse({
      ...player,
      stats: {
        matches: player.matches,
        goals: player.goals,
        assists: player.assists,
        rating: player.rating || 0
      },
      teams: player.teams.map((t: any) => t.team.id),
      isCaptain: player.captainOf.length > 0
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error)
    }
    console.error('PUT /api/players error:', error)
    return handleDatabaseError(error)
  }
}

// Wrap state-changing methods with CSRF protection
export const POST = withCSRF(POSTHandler)
export const PUT = withCSRF(PUTHandler)

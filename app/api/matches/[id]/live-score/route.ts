/**
 * Live Score Update API Endpoint
 * 
 * Allows authorized users (team captains) to update match scores in real-time.
 * Emits events via Socket.IO for live spectators.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { z } from 'zod';
import { getSocketServer } from '@/lib/socket-server';

// Validation schema
const liveScoreSchema = z.object({
  homeScore: z.number().min(0).max(99),
  awayScore: z.number().min(0).max(99),
  minute: z.number().min(0).max(120),
  additionalTime: z.number().min(0).max(15).optional(),
  status: z.enum(['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED']).optional(),
  events: z.array(
    z.object({
      type: z.enum(['GOAL', 'ASSIST', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'PENALTY', 'OWN_GOAL']),
      playerId: z.string(),
      playerName: z.string().optional(),
      minute: z.number(),
      team: z.enum(['home', 'away']),
      details: z.record(z.any()).optional(),
    })
  ).optional(),
});

/**
 * POST /api/matches/[id]/live-score
 * Update live match score
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponse.unauthorized('Authentication required');
    }

    // 2. Get match
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: {
          include: {
            captains: true,
            members: {
              include: { user: true },
            },
          },
        },
        awayTeam: {
          include: {
            captains: true,
            members: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!match) {
      return errorResponse.notFound('Match not found');
    }

    // 3. Verify authorization (captain or team member)
    const isHomeCaptain = match.homeTeam.captains.some((c) => c.id === session.user.id);
    const isAwayCaptain = match.awayTeam.captains.some((c) => c.id === session.user.id);
    const isHomeMember = match.homeTeam.members.some((m) => m.userId === session.user.id);
    const isAwayMember = match.awayTeam.members.some((m) => m.userId === session.user.id);

    if (!isHomeCaptain && !isAwayCaptain && !isHomeMember && !isAwayMember) {
      return errorResponse.forbidden('Not authorized to update this match');
    }

    // 4. Validate input
    const body = await req.json();
    const validatedData = liveScoreSchema.parse(body);

    // 5. Check match status
    if (match.status === 'COMPLETED') {
      return errorResponse.badRequest('Match is already completed');
    }

    // 6. Update match
    const updatedMatch = await prisma.match.update({
      where: { id },
      data: {
        homeScore: validatedData.homeScore,
        awayScore: validatedData.awayScore,
        status: validatedData.status || (
          validatedData.minute >= 90 ? 'COMPLETED' : 'LIVE'
        ),
      },
      include: {
        homeTeam: { select: { id: true, name: true, logo: true } },
        awayTeam: { select: { id: true, name: true, logo: true } },
      },
    });

    // 7. Process events if provided
    const processedEvents = [];
    if (validatedData.events?.length) {
      for (const event of validatedData.events) {
        const createdEvent = await prisma.matchEvent.create({
          data: {
            matchId: id,
            type: event.type,
            minute: event.minute,
            userId: event.playerId,
            details: event.details,
          },
        });

        processedEvents.push({
          ...event,
          id: createdEvent.id,
        });

        // Update player stats for goals/assists
        if (event.type === 'GOAL') {
          await prisma.matchParticipant.updateMany({
            where: {
              matchId: id,
              userId: event.playerId,
            },
            data: {
              goals: { increment: 1 },
            },
          });

          // Update user total goals
          await prisma.user.update({
            where: { id: event.playerId },
            data: {
              goals: { increment: 1 },
            },
          });
        }

        if (event.type === 'ASSIST') {
          await prisma.matchParticipant.updateMany({
            where: {
              matchId: id,
              userId: event.playerId,
            },
            data: {
              assists: { increment: 1 },
            },
          });

          await prisma.user.update({
            where: { id: event.playerId },
            data: {
              assists: { increment: 1 },
            },
          });
        }
      }
    }

    // 8. Emit real-time update via Socket.IO
    try {
      const socketServer = getSocketServer();
      if (socketServer) {
        socketServer.emitToMatch(id, 'match:scoreUpdated', {
          matchId: id,
          homeScore: validatedData.homeScore,
          awayScore: validatedData.awayScore,
          minute: validatedData.minute,
          status: updatedMatch.status,
          events: processedEvents,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (socketError) {
      console.error('Failed to emit socket event:', socketError);
      // Don't fail the request if socket emission fails
    }

    // 9. Create notifications for participants
    await createScoreUpdateNotifications(id, validatedData);

    return successResponse.ok({
      match: updatedMatch,
      events: processedEvents,
    });
  } catch (error) {
    console.error('Live score update error:', error);

    if (error instanceof z.ZodError) {
      return errorResponse.badRequest('Invalid input', error.errors);
    }

    return errorResponse.internal('Failed to update live score');
  }
}

/**
 * GET /api/matches/[id]/live-score
 * Get current match score and events
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: {
          select: { id: true, name: true, logo: true, rating: true },
        },
        awayTeam: {
          select: { id: true, name: true, logo: true, rating: true },
        },
        events: {
          orderBy: { minute: 'asc' },
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, image: true, position: true },
            },
          },
        },
      },
    });

    if (!match) {
      return errorResponse.notFound('Match not found');
    }

    return successResponse.ok({
      match: {
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
        date: match.date,
        location: match.location,
      },
      events: match.events.map((e) => ({
        id: e.id,
        type: e.type,
        minute: e.minute,
        playerId: e.userId,
        playerName: e.user?.name,
        playerImage: e.user?.image,
        details: e.details,
      })),
      participants: match.participants.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        image: p.user.image,
        position: p.user.position,
        position: p.position,
        goals: p.goals,
        assists: p.assists,
        rating: p.rating,
      })),
    });
  } catch (error) {
    console.error('Get match score error:', error);
    return errorResponse.internal('Failed to get match score');
  }
}

/**
 * Create notifications for match participants
 */
async function createScoreUpdateNotifications(
  matchId: string,
  data: { homeScore: number; awayScore: number; minute: number }
) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: {
          include: {
            members: { select: { userId: true } },
            captains: { select: { id: true } },
          },
        },
        awayTeam: {
          include: {
            members: { select: { userId: true } },
            captains: { select: { id: true } },
          },
        },
      },
    });

    if (!match) return;

    const userIds = new Set<string>();

    // Collect all participant IDs
    match.homeTeam.members.forEach((m) => userIds.add(m.userId));
    match.awayTeam.members.forEach((m) => userIds.add(m.userId));
    match.homeTeam.captains.forEach((c) => userIds.add(c.id));
    match.awayTeam.captains.forEach((c) => userIds.add(c.id));

    // Create notifications
    const notifications = Array.from(userIds).map((userId) => ({
      userId,
      type: 'MATCH_SCHEDULED' as const,
      title: 'Match Score Updated',
      message: `${match.homeTeam.name} ${data.homeScore} - ${data.awayScore} ${match.awayTeam.name} (${data.minute}')`,
      data: {
        matchId,
        homeScore: data.homeScore,
        awayScore: data.awayScore,
        minute: data.minute,
      },
    }));

    await prisma.notification.createMany({
      data: notifications,
    });
  } catch (error) {
    console.error('Failed to create notifications:', error);
  }
}

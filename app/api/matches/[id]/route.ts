import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/error-handler';
import { z } from 'zod';
import { Server as ServerIO } from "socket.io";

const updateMatchSchema = z.object({
  homeScore: z.number().int().min(0).optional(),
  awayScore: z.number().int().min(0).optional(),
  status: z.enum(["SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matchId = params.id;
    const body = await request.json();
    const validatedData = updateMatchSchema.parse(body);

    const existingMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        league: true,
      },
    });

    if (!existingMatch) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Only allow updates if the user is authorized (e.g., team captain or league admin)
    const isAuthorized = await prisma.team.findFirst({
      where: {
        OR: [
          { id: existingMatch.homeTeamId, createdBy: session.user.id },
          { id: existingMatch.awayTeamId, createdBy: session.user.id },
          { id: existingMatch.homeTeamId, captains: { some: { id: session.user.id } } },
          { id: existingMatch.awayTeamId, captains: { some: { id: session.user.id } } },
        ],
      },
    });

    const isLeagueAdmin = existingMatch.league && existingMatch.league.creatorId === session.user.id;

    if (!isAuthorized && !isLeagueAdmin) {
      return NextResponse.json({ error: 'Unauthorized to update this match' }, { status: 403 });
    }

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: validatedData,
    });

    // Emit a socket event for score updates
    const response = new NextResponse(JSON.stringify(updatedMatch), { status: 200 });
    const io = (response as any).socket?.server?.io as ServerIO | undefined;
    if (io) {
      io.to(`match-${matchId}`).emit("score-update", {
        homeScore: updatedMatch.homeScore,
        awayScore: updatedMatch.awayScore,
        status: updatedMatch.status,
      });
    }

    // Update team stats if match is completed and stats haven't been processed yet
    if (updatedMatch.status === "COMPLETED" && !existingMatch.statsProcessed && validatedData.homeScore !== undefined && validatedData.awayScore !== undefined) {
      const homeScore = validatedData.homeScore;
      const awayScore = validatedData.awayScore;

      await prisma.$transaction(async (tx) => {
        if (homeScore > awayScore) {
          // Home team wins
          await tx.team.update({
            where: { id: existingMatch.homeTeamId },
            data: { wins: { increment: 1 } },
          });
          await tx.team.update({
            where: { id: existingMatch.awayTeamId },
            data: { losses: { increment: 1 } },
          });
        } else if (awayScore > homeScore) {
          // Away team wins
          await tx.team.update({
            where: { id: existingMatch.awayTeamId },
            data: { wins: { increment: 1 } },
          });
          await tx.team.update({
            where: { id: existingMatch.homeTeamId },
            data: { losses: { increment: 1 } },
          });
        } else {
          // Draw
          await tx.team.update({
            where: { id: existingMatch.homeTeamId },
            data: { draws: { increment: 1 } },
          });
          await tx.team.update({
            where: { id: existingMatch.awayTeamId },
            data: { draws: { increment: 1 } },
          });
        }

        // Update league team stats if part of a league
        if (existingMatch.leagueId) {
          await tx.leagueTeam.updateMany({
            where: {
              leagueId: existingMatch.leagueId,
              teamId: existingMatch.homeTeamId,
            },
            data: {
              goalsFor: { increment: homeScore },
              goalsAgainst: { increment: awayScore },
              points: { increment: homeScore > awayScore ? 3 : (homeScore === awayScore ? 1 : 0) },
              wins: { increment: homeScore > awayScore ? 1 : 0 },
              losses: { increment: awayScore > homeScore ? 1 : 0 },
              draws: { increment: homeScore === awayScore ? 1 : 0 },
            },
          });
          await tx.leagueTeam.updateMany({
            where: {
              leagueId: existingMatch.leagueId,
              teamId: existingMatch.awayTeamId,
            },
            data: {
              goalsFor: { increment: awayScore },
              goalsAgainst: { increment: homeScore },
              points: { increment: awayScore > homeScore ? 3 : (homeScore === awayScore ? 1 : 0) },
              wins: { increment: awayScore > homeScore ? 1 : 0 },
              losses: { increment: homeScore > awayScore ? 1 : 0 },
              draws: { increment: homeScore === awayScore ? 1 : 0 },
            },
          });
        }

        // Mark stats as processed
        await tx.match.update({
          where: { id: matchId },
          data: { statsProcessed: true },
        });
      });
    }

    return response;
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matchId = params.id;

    const existingMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        league: true,
      },
    });

    if (!existingMatch) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Only allow deletion if the user is authorized (e.g., team captain or league admin)
    const isAuthorized = await prisma.team.findFirst({
      where: {
        OR: [
          { id: existingMatch.homeTeamId, createdBy: session.user.id },
          { id: existingMatch.awayTeamId, createdBy: session.user.id },
          { id: existingMatch.homeTeamId, captains: { some: { id: session.user.id } } },
          { id: existingMatch.awayTeamId, captains: { some: { id: session.user.id } } },
        ],
      },
    });

    const isLeagueAdmin = existingMatch.league && existingMatch.league.creatorId === session.user.id;

    if (!isAuthorized && !isLeagueAdmin) {
      return NextResponse.json({ error: 'Unauthorized to delete this match' }, { status: 403 });
    }

    await prisma.match.delete({
      where: { id: matchId },
    });

    return NextResponse.json({ message: 'Match deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
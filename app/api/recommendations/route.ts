import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth'; // Import Session
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/error-handler';
import { z } from 'zod';
import { calculateDistance } from '@/lib/utils';

const recommendationSchema = z.object({
  type: z.enum(["player", "team", "match"]),
  entityId: z.string().optional(), // ID of the user/team/match for which recommendations are sought
  sport: z.string().optional(),
  location: z.string().optional(),
  ageGroup: z.string().optional(),
  minRating: z.number().optional(),
  maxRating: z.number().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radius: z.number().optional(),
  date: z.coerce.date().optional(), // Added date field
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userSession = session.user; // Use a different variable name to avoid conflict with 'user' in player recommendation logic

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const entityId = searchParams.get('entityId');
    const sport = searchParams.get('sport');
    const location = searchParams.get('location');
    const ageGroup = searchParams.get('ageGroup');
    const minRating = parseFloat(searchParams.get('minRating') || 'NaN');
    const maxRating = parseFloat(searchParams.get('maxRating') || 'NaN');
    const latitude = parseFloat(searchParams.get('latitude') || 'NaN');
    const longitude = parseFloat(searchParams.get('longitude') || 'NaN');
    const radius = parseFloat(searchParams.get('radius') || 'NaN');
    const dateParam = searchParams.get('date');
    const date = dateParam ? z.coerce.date().parse(dateParam) : undefined;

    let recommendations: any[] = [];

    if (type === "player") {
      // Recommend players for a team or a match
      const team = entityId ? await prisma.team.findUnique({ where: { id: entityId } }) : null;
      const user = await prisma.user.findUnique({ where: { id: userSession.id } }); // Use userSession.id here

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      let playerWhere: any = {
        id: { not: userSession.id }, // Don't recommend self
        isActive: true,
      };

      if (sport) {
        // This is a simplified example. In a real app, you'd have a more robust way to link player skills to sports.
        // For now, we'll assume preferredPositions might indicate sport interest.
        playerWhere.preferredPositions = { has: sport };
      }
      if (location) {
        playerWhere.location = location;
      }
      if (ageGroup) {
        playerWhere.ageGroup = ageGroup;
      }
      if (!isNaN(minRating)) {
        playerWhere.rating = { gte: minRating };
      }
      if (!isNaN(maxRating)) {
        playerWhere.rating = { ...playerWhere.rating, lte: maxRating };
      }

      // Exclude existing team members if entityId is a team
      if (team) {
        const teamMembers = await prisma.teamMember.findMany({
          where: { teamId: team.id },
          select: { userId: true }
        });
        const memberIds = teamMembers.map(tm => tm.userId);
        playerWhere.id = { notIn: [...memberIds, userSession.id] };
      }

      let players = await prisma.user.findMany({
        where: playerWhere,
        select: {
          id: true,
          name: true,
          firstName: true,
          email: true,
          image: true,
          position: true,
          preferredPositions: true,
          rating: true,
          location: true,
          ageGroup: true,
          matches: true,
          goals: true,
          assists: true,
          latitude: true, // Include latitude for distance calculation
          longitude: true, // Include longitude for distance calculation
        },
        take: 10, // Limit recommendations
      });

      // Apply radius filtering if coordinates and radius are provided
      if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(radius)) {
        players = players.filter(player => {
          if (player.latitude && player.longitude) {
            const distance = calculateDistance(latitude, longitude, player.latitude, player.longitude);
            return distance <= radius;
          }
          return false;
        });
      }
      recommendations = players;

    } else if (type === "team") {
      // Recommend teams for a user or another team
      const currentUserTeamIds = (await prisma.teamMember.findMany({
        where: { userId: userSession.id },
        select: { teamId: true }
      })).map(tm => tm.teamId);

      let teamWhere: any = {
        id: { notIn: currentUserTeamIds }, // Don't recommend teams user is already in
        isPrivate: false, // Only recommend public teams for now
      };

      if (sport) {
        // Assuming team bio or name might indicate sport
        teamWhere.OR = [
          { name: { contains: sport, mode: 'insensitive' } },
          { bio: { contains: sport, mode: 'insensitive' } }
        ];
      }
      if (location) {
        teamWhere.location = location;
      }
      if (!isNaN(minRating)) {
        teamWhere.rating = { gte: minRating };
      }
      if (!isNaN(maxRating)) {
        teamWhere.rating = { ...teamWhere.rating, lte: maxRating };
      }

      let teams = await prisma.team.findMany({
        where: teamWhere,
        select: {
          id: true,
          name: true,
          logo: true,
          bio: true,
          location: true,
          rating: true,
          wins: true,
          losses: true,
          draws: true,
          latitude: true, // Include latitude for distance calculation
          longitude: true, // Include longitude for distance calculation
        },
        take: 10,
      });

      // Apply radius filtering if coordinates and radius are provided
      if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(radius)) {
        teams = teams.filter(team => {
          if (team.latitude && team.longitude) {
            const distance = calculateDistance(latitude, longitude, team.latitude, team.longitude);
            return distance <= radius;
          }
          return false;
        });
      }
      recommendations = teams;

    } else if (type === "match") {
      // Recommend matches for a user or team
      const user = await prisma.user.findUnique({ where: { id: userSession.id } }); // Use userSession.id here
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      let matchWhere: any = {
        status: "SCHEDULED", // Only recommend upcoming matches
        OR: [
          { homeTeam: { isPrivate: false } }, // Public home teams
          { awayTeam: { isPrivate: false } }, // Public away teams
          { homeTeam: { members: { some: { userId: userSession.id } } } }, // Matches involving user's teams
          { awayTeam: { members: { some: { userId: userSession.id } } } },
        ],
      };

      if (sport) {
        matchWhere.sport = sport;
      }
      if (location) {
        matchWhere.location = location;
      }
      if (ageGroup) {
        matchWhere.ageGroup = ageGroup;
      }
      if (date) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        matchWhere.date = {
          gte: startDate,
          lt: endDate,
        };
      }

      let matches = await prisma.match.findMany({
        where: matchWhere,
        include: {
          homeTeam: { select: { id: true, name: true, logo: true } },
          awayTeam: { select: { id: true, name: true, logo: true } },
        },
        orderBy: { date: 'asc' },
        take: 10,
      });

      // Apply radius filtering if coordinates and radius are provided
      if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(radius)) {
        matches = matches.filter(match => {
          if (match.latitude && match.longitude) {
            const distance = calculateDistance(latitude, longitude, match.latitude, match.longitude);
            return distance <= radius;
          }
          return false;
        });
      }
      recommendations = matches;

    } else {
      return NextResponse.json({ error: 'Invalid recommendation type' }, { status: 400 });
    }

    return NextResponse.json(recommendations, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
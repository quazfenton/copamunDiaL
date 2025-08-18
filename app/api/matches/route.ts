import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/error-handler';
import { z } from 'zod';
import { calculateDistance } from '@/lib/utils';
import { MatchStatus } from '@prisma/client'; // Import MatchStatus enum

const createMatchSchema = z.object({
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  date: z.coerce.date(), // Use z.coerce.date()
  location: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  sport: z.string().optional(),
  ageGroup: z.string().optional(),
  leagueId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const statusParam = searchParams.get('status'); // Renamed to avoid conflict
    const date = searchParams.get('date');
    const leagueId = searchParams.get('leagueId');
    const sport = searchParams.get('sport');
    const ageGroup = searchParams.get('ageGroup');
    const userLatitude = parseFloat(searchParams.get('latitude') || 'NaN');
    const userLongitude = parseFloat(searchParams.get('longitude') || 'NaN');
    const radius = parseFloat(searchParams.get('radius') || 'NaN'); // in kilometers

    let where: any = {};

    if (teamId) {
      where.OR = [{ homeTeamId: teamId }, { awayTeamId: teamId }];
    }

    if (statusParam) {
      // Validate status against MatchStatus enum
      if (!Object.values(MatchStatus).includes(statusParam as MatchStatus)) {
        return NextResponse.json({ error: 'Invalid match status' }, { status: 400 });
      }
      where.status = statusParam;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      where.date = {
        gte: startDate,
        lt: endDate,
      };
    }

    if (leagueId) {
      where.leagueId = leagueId;
    }

    if (sport) {
      where.sport = sport;
    }

    if (ageGroup) {
      where.ageGroup = ageGroup;
    }

    let matches = await prisma.match.findMany({
      where,
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Apply radius filtering if coordinates and radius are provided
    if (!isNaN(userLatitude) && !isNaN(userLongitude) && !isNaN(radius)) {
      matches = matches.filter(match => {
        if (match.latitude && match.longitude) {
          const distance = calculateDistance(userLatitude, userLongitude, match.latitude, match.longitude);
          return distance <= radius;
        }
        return false;
      });
    }

    return NextResponse.json(matches);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createMatchSchema.parse(body);

    // Verify user has permission to create matches for the home team
    const homeTeam = await prisma.team.findFirst({
      where: {
        id: validatedData.homeTeamId,
        OR: [
          { createdBy: session.user.id },
          { captains: { some: { id: session.user.id } } },
        ],
      },
    });

    if (!homeTeam) {
      return NextResponse.json({ error: 'Unauthorized to create matches for this team' }, { status: 403 });
    }

    // Verify away team exists
    const awayTeam = await prisma.team.findUnique({
      where: { id: validatedData.awayTeamId },
    });

    if (!awayTeam) {
      return NextResponse.json({ error: 'Away team not found' }, { status: 404 });
    }

    const match = await prisma.match.create({
      data: {
        ...validatedData,
        date: validatedData.date, // date is already a Date object due to z.coerce.date()
      },
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    return NextResponse.json(match);
  } catch (error) {
    return handleError(error);
  }
}
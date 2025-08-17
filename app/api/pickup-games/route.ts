import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/error-handler';
import { z } from 'zod';

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

const createPickupGameSchema = z.object({
  location: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  date: z.string(),
  sport: z.string(),
  playersNeeded: z.number().int().min(1),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const date = searchParams.get('date');
    const userLatitude = parseFloat(searchParams.get('latitude') || 'NaN');
    const userLongitude = parseFloat(searchParams.get('longitude') || 'NaN');
    const radius = parseFloat(searchParams.get('radius') || 'NaN'); // in kilometers

    let where: any = {};

    if (sport) {
      where.sport = sport;
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

    let pickupGames = await prisma.pickupGame.findMany({
      where,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            firstName: true,
            image: true,
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
      pickupGames = pickupGames.filter(game => {
        if (game.latitude && game.longitude) {
          const distance = calculateDistance(userLatitude, userLongitude, game.latitude, game.longitude);
          return distance <= radius;
        }
        return false;
      });
    }

    return NextResponse.json(pickupGames);
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
    const validatedData = createPickupGameSchema.parse(body);

    const newPickupGame = await prisma.pickupGame.create({
      data: {
        ...validatedData,
        date: new Date(validatedData.date),
        organizerId: session.user.id,
      },
    });

    return NextResponse.json(newPickupGame, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
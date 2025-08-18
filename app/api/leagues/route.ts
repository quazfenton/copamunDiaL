import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

// Create a new league
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, startDate, endDate, isPublic } = await request.json();

  if (!name || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  if (parsedStartDate >= parsedEndDate) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }

  // Optional: Prevent creating leagues with start dates in the past
  // if (parsedStartDate < new Date()) {
  //   return NextResponse.json({ error: "Start date cannot be in the past" }, { status: 400 });
  // }

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newLeague = await prisma.league.create({
      data: {
        name,
        description,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        isPublic: isPublic ?? true,
        creatorId: user.id,
      },
    });

    return NextResponse.json(newLeague, { status: 201 });
  } catch (error) {
    console.error("Error creating league:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Get all leagues
export async function GET() {
  try {
    const leagues = await prisma.league.findMany({
      include: {
        teams: {
          include: {
            team: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return NextResponse.json(leagues, { status: 200 });
  } catch (error) {
    console.error("Error fetching leagues:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
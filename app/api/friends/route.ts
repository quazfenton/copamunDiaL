import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

// Send friend request
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { friendEmail } = await request.json();
  if (!friendEmail) {
    return NextResponse.json({ error: "Friend email required" }, { status: 400 });
  }

  try {
    // Check if users exist
    const [currentUser, friendUser] = await Promise.all([
      prisma.user.findUnique({ where: { email: session.user.email } }),
      prisma.user.findUnique({ where: { email: friendEmail } })
    ]);

    if (!currentUser || !friendUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if friendship already exists
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: currentUser.id, friendId: friendUser.id },
          { userId: friendUser.id, friendId: currentUser.id }
        ]
      }
    });

    if (existingFriendship) {
      return NextResponse.json({ error: "Friend request already exists" }, { status: 400 });
    }

    // Create new friendship request
    const friendship = await prisma.friendship.create({
      data: {
        userId: currentUser.id,
        friendId: friendUser.id,
        status: "pending"
      }
    });

    return NextResponse.json(friendship, { status: 201 });
  } catch (error) {
    console.error("Friend request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// List friends and pending requests
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        friendshipsAsUser: {
          include: { friend: true }
        },
        friendshipsAsFriend: {
          include: { user: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Combine and format friendships
    const friendships = [
      ...user.friendshipsAsUser.map((f: any) => ({ ...f, type: "outgoing", friend: f.friend })),
      ...user.friendshipsAsFriend.map((f: any) => ({ ...f, type: "incoming", friend: f.user }))
    ];

    return NextResponse.json(friendships, { status: 200 });
  } catch (error) {
    console.error("Get friends error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Update friend request status (accept/reject)
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { friendshipId, status } = await request.json();
  if (!friendshipId || !["accepted", "declined"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    // Verify the friendship exists and belongs to current user
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: { friend: true }
    });

    if (!friendship || friendship.friend.email !== session.user.email) {
      return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
    }

    // Update friendship status
    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status }
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Update friend status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
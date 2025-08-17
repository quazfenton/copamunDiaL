import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth'; // Import Session
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/error-handler';
import { z } from 'zod';
import { Server as ServerIO } from "socket.io";

const createMessageSchema = z.object({
  content: z.string().min(1),
  type: z.enum(["TEXT", "IMAGE"]).default("TEXT"),
});

// Get messages for a specific team
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user;

    const teamId = params.id;

    // Verify user is a member of the team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: user.id,
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { teamId: teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

// Send a message to a specific team
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user;

    const teamId = params.id;
    const body = await request.json();
    const validatedData = createMessageSchema.parse(body);

    // Verify user is a member of the team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: user.id,
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
    }

    const newMessage = await prisma.message.create({
      data: {
        content: validatedData.content,
        type: validatedData.type,
        teamId: teamId,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Emit a socket event
    const response = new NextResponse(JSON.stringify(newMessage), { status: 201 });
    const io = (response as any).socket?.server?.io as ServerIO | undefined;
    if (io) {
      io.to(`team-${teamId}`).emit("new-message", newMessage);
    }

    return response;
  } catch (error) {
    return handleError(error);
  }
}
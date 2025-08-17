import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/error-handler';
import { z } from 'zod';

const createTeamInviteSchema = z.object({
  toUserId: z.string(),
  message: z.string().optional(),
});

// Send a team invite
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id;
    const body = await request.json();
    const validatedData = createTeamInviteSchema.parse(body);

    // Verify the sender is a captain or creator of the team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        captains: {
          where: { id: session.user.id }
        },
        creator: {
          where: { id: session.user.id }
        }
      }
    });

    if (!team || (team.captains.length === 0 && team.creator?.id !== session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized to send invites for this team' }, { status: 403 });
    }

    // Check if the recipient user exists
    const toUser = await prisma.user.findUnique({
      where: { id: validatedData.toUserId },
    });

    if (!toUser) {
      return NextResponse.json({ error: 'Recipient user not found' }, { status: 404 });
    }

    // Check if invite already exists
    const existingInvite = await prisma.teamInvite.findFirst({
      where: {
        teamId: teamId,
        toId: validatedData.toUserId,
        status: {
          in: ["PENDING", "ACCEPTED"]
        }
      }
    });

    if (existingInvite) {
      return NextResponse.json({ error: 'Team invite already exists or is accepted' }, { status: 400 });
    }

    const newInvite = await prisma.teamInvite.create({
      data: {
        teamId: teamId,
        fromId: session.user.id,
        toId: validatedData.toUserId,
        message: validatedData.message,
        status: "PENDING",
      },
    });

    return NextResponse.json(newInvite, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

// Get team invites (for a specific team, or for the current user)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'sent' or 'received'

    let whereClause: any = { teamId: teamId };

    if (type === 'sent') {
      whereClause.fromId = session.user.id;
    } else if (type === 'received') {
      whereClause.toId = session.user.id;
    } else {
      // If no type specified, return invites related to the current user for this team
      whereClause.OR = [
        { fromId: session.user.id },
        { toId: session.user.id }
      ];
    }

    const invites = await prisma.teamInvite.findMany({
      where: whereClause,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        from: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        to: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(invites, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

// Update team invite status (accept/decline)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inviteId = params.id; // This 'id' param is actually the inviteId
    const { status } = await request.json();

    if (!["ACCEPTED", "DECLINED"].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const existingInvite = await prisma.teamInvite.findUnique({
      where: { id: inviteId },
      include: { team: true, to: true },
    });

    if (!existingInvite || existingInvite.toId !== session.user.id) {
      return NextResponse.json({ error: 'Invite not found or not authorized' }, { status: 404 });
    }

    const updatedInvite = await prisma.teamInvite.update({
      where: { id: inviteId },
      data: { status: status as "ACCEPTED" | "DECLINED" },
    });

    // If accepted, add user to team members
    if (status === "ACCEPTED") {
      await prisma.teamMember.create({
        data: {
          teamId: existingInvite.teamId,
          userId: existingInvite.toId,
        },
      });
    }

    return NextResponse.json(updatedInvite, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

// Delete a team invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inviteId = params.id; // This 'id' param is actually the inviteId

    const existingInvite = await prisma.teamInvite.findUnique({
      where: { id: inviteId },
      include: { team: true, from: true, to: true },
    });

    if (!existingInvite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Only allow deletion by sender, receiver, or team creator/captain
    const isAuthorized = existingInvite.fromId === session.user.id ||
                         existingInvite.toId === session.user.id ||
                         existingInvite.team.createdBy === session.user.id ||
                         existingInvite.team.captains.some(captain => captain.id === session.user.id);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized to delete this invite' }, { status: 403 });
    }

    await prisma.teamInvite.delete({
      where: { id: inviteId },
    });

    return NextResponse.json({ message: 'Invite deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
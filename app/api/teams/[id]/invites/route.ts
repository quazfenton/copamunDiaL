import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/error-handler';
import { z } from 'zod';
import { withCSRF } from '@/lib/security';

const createTeamInviteSchema = z.object({
  toUserId: z.string().cuid(), // Ensure toUserId is a valid CUID
  message: z.string().optional(),
});

// Send a team invite
async function POSTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId } = await params;
    const body = await request.json();
    const validatedData = createTeamInviteSchema.parse(body);

    // Prevent self-invites
    if (validatedData.toUserId === session.user.id) {
      return NextResponse.json({ error: 'Cannot invite yourself to a team' }, { status: 400 });
    }

    // Verify the sender is a captain or creator of the team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        captains: true,
        creator: true,
        members: { // Include members to check if already a member
          where: { userId: validatedData.toUserId }
        }
      }
    });

    if (!team || (!team.captains.some((c: any) => c.id === session.user.id) && team.creator?.id !== session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized to send invites for this team' }, { status: 403 });
    }

    // Check if the recipient user exists
    const toUser = await prisma.user.findUnique({
      where: { id: validatedData.toUserId },
    });

    if (!toUser) {
      return NextResponse.json({ error: 'Recipient user not found' }, { status: 404 });
    }

    // Check if recipient is already a member of the team
    if (team.members.length > 0) {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 400 });
    }

    // Check if invite already exists
    const existingInvite = await prisma.teamInvite.findFirst({
      where: {
        teamId: teamId,
        toId: validatedData.toUserId,
        status: {
          in: ['PENDING', 'ACCEPTED'] // Use string literals
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
        status: 'PENDING', // Use string literal
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'sent' or 'received'

    // Authorization: Only team members, captains, or creator can view invites for their team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        captains: true,
        members: { where: { userId: session.user.id } },
      },
    });

    const isTeamMember = team?.members && team.members.length > 0;
    const isTeamCaptain = team?.captains?.some((c: any) => c.id === session.user.id) ?? false;
    const isTeamCreator = team?.createdBy === session.user.id;

    if (!isTeamMember && !isTeamCaptain && !isTeamCreator) {
      // If not authorized to view team invites, check if it's a received invite for the user
      if (type === 'received') {
        const receivedInvite = await prisma.teamInvite.findFirst({
          where: { teamId: teamId, toId: session.user.id },
        });
        if (receivedInvite) {
          // Allow viewing only this specific received invite
          return NextResponse.json([receivedInvite], { status: 200 });
        }
      }
      return NextResponse.json({ error: 'Unauthorized to view invites for this team' }, { status: 403 });
    }

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
async function PATCHHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId } = await params;
    const { inviteId, status } = await request.json();

    if (!inviteId || !status) {
      return NextResponse.json({ error: 'Missing inviteId or status' }, { status: 400 });
    }

    if (!['PENDING', 'ACCEPTED', 'DECLINED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const existingInvite = await prisma.teamInvite.findUnique({
      where: { id: inviteId },
      include: { team: true, to: true },
    });

    if (!existingInvite || existingInvite.toId !== session.user.id || existingInvite.teamId !== teamId) {
      return NextResponse.json({ error: 'Invite not found or not authorized' }, { status: 404 });
    }

    const updatedInvite = await prisma.teamInvite.update({
      where: { id: inviteId },
      data: { status: status as any },
    });

    // If accepted, add user to team members
    if (status === 'ACCEPTED') {
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
async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId } = await params; // This 'id' param is the teamId
    const { inviteId } = await request.json(); // Get inviteId from request body

    if (!inviteId) {
      return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 });
    }

    const existingInvite = await prisma.teamInvite.findUnique({
      where: { id: inviteId },
      include: { 
        team: {
          include: {
            captains: true
          }
        }, 
        from: true, 
        to: true 
      },
    });

    if (!existingInvite || existingInvite.teamId !== teamId) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Only allow deletion by sender, receiver, or team creator/captain
    const isAuthorized = existingInvite.fromId === session.user.id ||
                         existingInvite.toId === session.user.id ||
                         existingInvite.team.createdBy === session.user.id ||
                         existingInvite.team.captains.some((captain: any) => captain.id === session.user.id);

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

// Wrap state-changing methods with CSRF protection
export const POST = withCSRF(POSTHandler)
export const DELETE = withCSRF(DELETEHandler)
export const PATCH = withCSRF(PATCHHandler)

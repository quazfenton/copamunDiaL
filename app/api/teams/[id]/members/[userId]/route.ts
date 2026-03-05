import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleError } from '@/lib/error-handler'

const removeMemberSchema = z.object({
  userId: z.string().min(1),
})

async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId, userId: targetUserId } = await params

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { createdBy: true, captains: true },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check authorization: only creator or captains can remove members
    const isCreator = team.createdBy === session.user.id
    const isCaptain = team.captains.some((c) => c.id === session.user.id)

    if (!isCreator && !isCaptain) {
      return NextResponse.json(
        { error: 'Only team creator or captains can remove members' },
        { status: 403 }
      )
    }

    // Cannot remove the creator
    if (targetUserId === team.createdBy) {
      return NextResponse.json(
        { error: 'Cannot remove team creator' },
        { status: 400 }
      )
    }

    // Check if member exists
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: targetUserId,
          teamId,
        },
      },
    })

    if (!existingMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Remove member
    await prisma.teamMember.delete({
      where: {
        userId_teamId: {
          userId: targetUserId,
          teamId,
        },
      },
    })

    // Send notification to removed member
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: 'SYSTEM',
        title: 'Removed from Team',
        message: `You have been removed from the team.`,
        data: { teamId, teamName: team },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
    })
  } catch (error) {
    return handleError(error)
  }
}

// Wrap state-changing methods with CSRF protection
export const DELETE = withCSRF(DELETEHandler)

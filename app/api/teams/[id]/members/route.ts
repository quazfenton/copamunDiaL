import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleError } from '@/lib/error-handler'

const getTeamMembersSchema = z.object({
  teamId: z.string().min(1),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params

    // Validate team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, isPrivate: true, createdBy: true, captains: true },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if user has access to view members
    const isTeamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: session.user.id,
          teamId,
        },
      },
    })

    const isCaptain = team.captains.some((c) => c.id === session.user.id)
    const isCreator = team.createdBy === session.user.id

    // For private teams, only members can view
    if (team.isPrivate && !isTeamMember && !isCaptain && !isCreator) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch team members with user details (public fields only)
    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            position: true,
            image: true,
            rating: true,
            matches: true,
            goals: true,
            assists: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    })

    const formattedMembers = members.map((member) => ({
      id: member.id,
      userId: member.userId,
      name: member.user.name,
      firstName: member.user.firstName,
      position: member.user.position,
      image: member.user.image,
      rating: member.user.rating,
      stats: {
        matches: member.user.matches,
        goals: member.user.goals,
        assists: member.user.assists,
      },
      teamPosition: member.position,
      isReserve: member.isReserve,
      joinedAt: member.joinedAt,
    }))

    return NextResponse.json(formattedMembers)
  } catch (error) {
    return handleError(error)
  }
}

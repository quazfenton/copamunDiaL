import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { updateTeamSchema } from '@/lib/schemas'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            firstName: true,
            image: true
          }
        },
        captains: {
          select: {
            id: true,
            name: true,
            firstName: true,
            image: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                position: true,
                preferredPositions: true,
                image: true,
                bio: true,
                email: true,
                phone: true,
                location: true,
                rating: true,
                matches: true,
                goals: true,
                assists: true,
                wins: true,
                losses: true,
                draws: true
              }
            }
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const formattedTeam = {
      id: team.id,
      name: team.name,
      logo: team.logo,
      bio: team.bio,
      formation: team.formation,
      location: team.location,
      isPrivate: team.isPrivate,
      wins: team.wins,
      losses: team.losses,
      draws: team.draws,
      rating: team.rating,
      createdBy: team.createdBy,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
      captains: team.captains.map(c => c.id),
      players: team.members
        .filter(m => !m.isReserve)
        .map(m => ({
          ...m.user,
          stats: {
            matches: m.user.matches,
            goals: m.user.goals,
            assists: m.user.assists,
            rating: m.user.rating || 0
          },
          teams: [team.id],
          isCaptain: team.captains.some(c => c.id === m.user.id)
        })),
      reserves: team.members
        .filter(m => m.isReserve)
        .map(m => ({
          ...m.user,
          stats: {
            matches: m.user.matches,
            goals: m.user.goals,
            assists: m.user.assists,
            rating: m.user.rating || 0
          },
          teams: [team.id],
          isCaptain: team.captains.some(c => c.id === m.user.id)
        }))
    }

    return NextResponse.json(formattedTeam)
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is captain or creator of the team
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        captains: true
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const isCaptain = team.captains.some(c => c.id === session.user.id)
    const isCreator = team.createdBy === session.user.id

    if (!isCaptain && !isCreator) {
      return NextResponse.json({ error: 'Forbidden: Only team captains can edit team details' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateTeamSchema.parse(body)

    const updatedTeam = await prisma.team.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        captains: {
          select: {
            id: true,
            name: true,
            firstName: true,
            image: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                position: true,
                preferredPositions: true,
                image: true,
                bio: true,
                email: true,
                phone: true,
                location: true,
                rating: true,
                matches: true,
                goals: true,
                assists: true,
                wins: true,
                losses: true,
                draws: true
              }
            }
          }
        }
      }
    })

    const captainIds = new Set(updatedTeam.captains.map(c => c.id)); // Optimize captain lookup
    const formattedTeam = {
      id: updatedTeam.id,
      name: updatedTeam.name,
      logo: updatedTeam.logo,
      bio: updatedTeam.bio,
      formation: updatedTeam.formation,
      location: updatedTeam.location,
      isPrivate: updatedTeam.isPrivate,
      wins: updatedTeam.wins,
      losses: updatedTeam.losses,
      draws: updatedTeam.draws,
      rating: updatedTeam.rating,
      createdBy: updatedTeam.createdBy,
      createdAt: updatedTeam.createdAt.toISOString(),
      updatedAt: updatedTeam.updatedAt.toISOString(),
      captains: Array.from(captainIds),
      players: updatedTeam.members
        .filter(m => !m.isReserve)
        .map(m => ({
          ...m.user,
          stats: {
            matches: m.user.matches,
            goals: m.user.goals,
            assists: m.user.assists,
            rating: m.user.rating || 0
          },
          teams: [updatedTeam.id],
          isCaptain: captainIds.has(m.user.id) // Optimized lookup
        })),
      reserves: updatedTeam.members
        .filter(m => m.isReserve)
        .map(m => ({
          ...m.user,
          stats: {
            matches: m.user.matches,
            goals: m.user.goals,
            assists: m.user.assists,
            rating: m.user.rating || 0
          },
          teams: [updatedTeam.id],
          isCaptain: captainIds.has(m.user.id) // Optimized lookup
        }))
    }

    return NextResponse.json(formattedTeam)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is the creator of the team
    const team = await prisma.team.findUnique({
      where: { id: params.id }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (team.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: Only team creator can delete team' }, { status: 403 })
    }

    await prisma.team.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Team deleted successfully' })
  } catch (error) {
    return handleError(error)
  }
}
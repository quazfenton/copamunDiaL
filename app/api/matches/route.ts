import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleError } from '@/lib/error-handler'
import { z } from 'zod'

const createMatchSchema = z.object({
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  date: z.string(),
  location: z.string()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const status = searchParams.get('status')
    const date = searchParams.get('date')

    let where: any = {}

    if (teamId) {
      where.OR = [
        { homeTeamId: teamId },
        { awayTeamId: teamId }
      ]
    }

    if (status) {
      where.status = status
    }

    if (date) {
      const startDate = new Date(date)
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 1)
      
      where.date = {
        gte: startDate,
        lt: endDate
      }
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    return NextResponse.json(matches)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createMatchSchema.parse(body)

    // Verify user has permission to create matches for the home team
    const homeTeam = await prisma.team.findFirst({
      where: {
        id: validatedData.homeTeamId,
        OR: [
          { createdBy: session.user.id },
          { captains: { some: { id: session.user.id } } }
        ]
      }
    })

    if (!homeTeam) {
      return NextResponse.json({ error: 'Unauthorized to create matches for this team' }, { status: 403 })
    }

    const match = await prisma.match.create({
      data: {
        ...validatedData,
        date: new Date(validatedData.date)
      },
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        }
      }
    })

    return NextResponse.json(match)
  } catch (error) {
    return handleError(error)
  }
}
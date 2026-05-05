import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleError } from '@/lib/error-handler'
import { getRecentSecurityEvents, getFailedLoginCount, AuditEventType } from '@/lib/audit-log'

/**
 * GET /api/admin/dashboard
 * Admin dashboard analytics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true },
    })

    const isAdmin = user?.roles?.includes('SUPER_ADMIN') || user?.roles?.includes('LEAGUE_ADMIN')
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'

    switch (type) {
      case 'overview':
        return getAdminOverview()
      case 'security':
        return getSecurityAnalytics()
      case 'users':
        return getUserAnalytics()
      default:
        return getAdminOverview()
    }
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Get admin overview statistics
 */
async function getAdminOverview() {
  const [
    totalUsers,
    totalTeams,
    totalMatches,
    totalTournaments,
    totalLeagues,
    recentUsers,
    activeUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.team.count(),
    prisma.match.count(),
    prisma.tournament.count(),
    prisma.league.count(),
    // Recent users (last 7 days)
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    // Active users (logged in last 24 hours - would need lastLogin field)
    prisma.user.count({
      where: {
        isActive: true,
      },
    }),
  ])

  // Get recent activity summary
  const recentActivity = await prisma.auditLog.groupBy({
    by: ['eventType'],
    where: {
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    _count: true,
    take: 10,
    orderBy: {
      _count: 'desc',
    },
  })

  // Growth stats
  const lastMonthUsers = await prisma.user.count({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
  })

  const previousMonthUsers = await prisma.user.count({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
  })

  const growthRate = previousMonthUsers > 0
    ? ((lastMonthUsers - previousMonthUsers) / previousMonthUsers) * 100
    : 0

  return NextResponse.json({
    statistics: {
      totalUsers,
      totalTeams,
      totalMatches,
      totalTournaments,
      totalLeagues,
    },
    userStats: {
      recentUsers,
      activeUsers,
      growthRate: Math.round(growthRate * 100) / 100,
    },
    recentActivity: recentActivity.map((a) => ({
      eventType: a.eventType,
      count: a._count,
    })),
  })
}

/**
 * Get security analytics
 */
async function getSecurityAnalytics() {
  const [
    recentSecurityEvents,
    failedLoginAttempts,
    twoFactorStats,
    roleDistribution,
  ] = await Promise.all([
    getRecentSecurityEvents(50),
    prisma.auditLog.findMany({
      where: {
        eventType: AuditEventType.LOGIN_FAILED,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      select: {
        ipAddress: true,
        userEmail: true,
        timestamp: true,
        errorMessage: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
    }),
    prisma.user.groupBy({
      by: ['twoFactorEnabled'],
      _count: true,
    }),
    prisma.user.groupBy({
      by: ['roles'],
      _count: true,
    }),
  ])

  // Calculate security metrics
  const totalFailedLogins = failedLoginAttempts.length
  const uniqueIpsWithFailures = new Set(failedLoginAttempts.map((f) => f.ipAddress)).size

  const twoFactorEnabled = twoFactorStats.find((s) => s.twoFactorEnabled === true)?._count || 0
  const twoFactorDisabled = twoFactorStats.find((s) => s.twoFactorEnabled === false)?._count || 0
  const twoFactorRate = (twoFactorEnabled / (twoFactorEnabled + twoFactorDisabled)) * 100

  return NextResponse.json({
    security: {
      recentEvents: recentSecurityEvents.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        timestamp: e.timestamp,
        userId: e.userId,
        userEmail: e.userEmail,
        ipAddress: e.ipAddress,
        action: e.action,
        riskLevel: e.riskLevel,
      })),
      failedLoginAttempts,
      metrics: {
        totalFailedLogins,
        uniqueIpsWithFailures,
        twoFactorEnabled,
        twoFactorDisabled,
        twoFactorAdoptionRate: Math.round(twoFactorRate * 100) / 100,
      },
    },
  })
}

/**
 * Get user analytics
 */
async function getUserAnalytics() {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        position: true,
        rating: true,
        matches: true,
        goals: true,
        assists: true,
        roles: true,
        twoFactorEnabled: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            teams: true,
            createdTeams: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ])

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      teamsCount: u._count.teams,
      createdTeamsCount: u._count.createdTeams,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

/**
 * POST /api/admin/users/[id]/role
 * Update user role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true },
    })

    if (!user?.roles?.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const { id: userId } = await params
    const body = await request.json()
    const { roles } = body as { roles?: string[] }

    if (!roles || !Array.isArray(roles)) {
      return NextResponse.json(
        { error: 'Roles must be provided as an array' },
        { status: 400 }
      )
    }

    // Validate roles
    const validRoles = ['PLAYER', 'TEAM_MANAGER', 'LEAGUE_ADMIN', 'SUPER_ADMIN']
    const invalidRoles = roles.filter((r) => !validRoles.includes(r))
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        { error: `Invalid roles: ${invalidRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Update user roles
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { roles: roles as any },
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
      },
    })

    // Log the role change
    await prisma.auditLog.create({
      data: {
        eventType: 'ROLE_CHANGED',
        userId: session.user.id,
        userEmail: session.user.email || undefined,
        action: `Updated roles for user ${userId}`,
        metadata: { newRoles: roles },
        resourceId: userId,
        resource: 'User',
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    return handleError(error)
  }
}

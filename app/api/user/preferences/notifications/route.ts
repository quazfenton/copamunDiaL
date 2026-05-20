import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleError } from '@/lib/error-handler'
import {
  getNotificationPreferences,
  setNotificationPreferences,
  resetNotificationPreferences,
} from '@/lib/notification-preferences'

/**
 * GET /api/user/preferences/notifications
 * Get user's notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await getNotificationPreferences(session.user.id)

    return NextResponse.json(preferences)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * PUT /api/user/preferences/notifications
 * Update user's notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const preferences = await setNotificationPreferences(session.user.id, body)

    return NextResponse.json({
      success: true,
      preferences,
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * POST /api/user/preferences/notifications/reset
 * Reset preferences to defaults
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await resetNotificationPreferences(session.user.id)

    return NextResponse.json({
      success: true,
      preferences,
    })
  } catch (error) {
    return handleError(error)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleError } from '@/lib/error-handler'
import { get2FAStatus } from '@/lib/2fa'

/**
 * GET /api/auth/2fa/status
 * Get 2FA status for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = await get2FAStatus(session.user.id)

    return NextResponse.json(status)
  } catch (error) {
    return handleError(error)
  }
}

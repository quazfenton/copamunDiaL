import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleError } from '@/lib/error-handler'
import {
  generate2FASecret,
  generate2FAQRCode,
  enable2FA,
  verify2FAToken,
  get2FAStatus,
} from '@/lib/2fa'

const enable2FASchema = z.object({
  token: z.string().length(6),
})

const disable2FASchema = z.object({
  token: z.string().length(6),
})

const verify2FASchema = z.object({
  token: z.string().length(6),
})

/**
 * GET /api/auth/2fa/setup
 * Generate 2FA secret and QR code for setup
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate 2FA secret
    const issuer = process.env._2FA_ISSUER || 'CopaMundial'
    const secret = generate2FASecret(user.email, issuer)

    // Generate QR code
    const qrCode = await generate2FAQRCode(secret.otpauth_url!)

    return NextResponse.json({
      secret: secret.base32,
      qrCode,
      otpauth_url: secret.otpauth_url,
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * POST /api/auth/2fa/enable
 * Enable 2FA for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = enable2FASchema.parse(body)

    // Get user's 2FA secret (stored temporarily before enabling)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    })

    if (!user?.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA setup not initiated. Call /api/auth/2fa/setup first.' },
        { status: 400 }
      )
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled' },
        { status: 400 }
      )
    }

    // Verify the token
    const isValid = verify2FAToken(user.twoFactorSecret, validatedData.token)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid 2FA token' },
        { status: 400 }
      )
    }

    // Enable 2FA
    const result = await enable2FA(session.user.id, user.twoFactorSecret)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      backupCodes: result.backupCodes,
      message: '2FA enabled successfully',
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA for the current user
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = disable2FASchema.parse(body)

    const {
      disable2FA,
    } = await import('@/lib/2fa')

    const result = await disable2FA(session.user.id, validatedData.token)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully',
    })
  } catch (error) {
    return handleError(error)
  }
}

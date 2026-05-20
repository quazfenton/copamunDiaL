/**
 * Two-Factor Authentication (2FA) Utilities
 * 
 * Implements TOTP-based 2FA using Google Authenticator compatible algorithm
 */

import speakeasy from 'speakeasy'
import qrcode from 'qrcode'
import { prisma } from './db'

/**
 * Generate a new 2FA secret for a user
 */
export function generate2FASecret(email: string, issuer: string = 'CopaMundial') {
  const secret = speakeasy.generateSecret({
    name: `${issuer} (${email})`,
    issuer,
    length: 32,
  })

  return {
    base32: secret.base32,
    otpauth_url: secret.otpauth_url,
    qr_code_ascii: secret.qr_code_ascii,
    qr_code_png: secret.qr_code_png,
  }
}

/**
 * Generate QR code data URI for 2FA setup
 */
export async function generate2FAQRCode(otpauth_url: string): Promise<string> {
  return qrcode.toDataURL(otpauth_url)
}

/**
 * Verify a 2FA token
 */
export function verify2FAToken(
  secret: string,
  token: string,
  window: number = 1
): boolean {
  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window, // Allow 1 step before/after for clock skew
  })

  return verified
}

/**
 * Enable 2FA for a user
 */
export async function enable2FA(
  userId: string,
  secret: string
): Promise<{
  success: boolean
  backupCodes?: string[]
  error?: string
}> {
  try {
    // Generate backup codes (10 codes, 8 digits each)
    const backupCodes = Array.from({ length: 10 }, () =>
      Array.from({ length: 8 }, () =>
        '0123456789ABCDEF'[Math.floor(Math.random() * 16)]
      ).join('')
    )

    // Store encrypted secret and backup codes
    await prisma.user.update({
      where: { id: userId },
      data: {
        // In production, encrypt these with a server-side key
        twoFactorSecret: secret,
        twoFactorBackupCodes: backupCodes,
        twoFactorEnabled: true,
      },
    })

    return {
      success: true,
      backupCodes,
    }
  } catch (error) {
    console.error('Enable 2FA error:', error)
    return {
      success: false,
      error: 'Failed to enable 2FA',
    }
  }
}

/**
 * Disable 2FA for a user
 */
export async function disable2FA(
  userId: string,
  token: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    })

    if (!user?.twoFactorSecret || !user.twoFactorEnabled) {
      return {
        success: false,
        error: '2FA is not enabled',
      }
    }

    // Verify token before disabling
    const isValid = verify2FAToken(user.twoFactorSecret, token)
    if (!isValid) {
      return {
        success: false,
        error: 'Invalid 2FA token',
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        twoFactorEnabled: false,
      },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error('Disable 2FA error:', error)
    return {
      success: false,
      error: 'Failed to disable 2FA',
    }
  }
}

/**
 * Verify 2FA token during login
 */
export async function verify2FADuringLogin(
  userId: string,
  token: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    })

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      }
    }

    if (!user.twoFactorEnabled) {
      return {
        success: false,
        error: '2FA is not enabled for this account',
      }
    }

    const isValid = verify2FAToken(user.twoFactorSecret, token)
    if (!isValid) {
      return {
        success: false,
        error: 'Invalid 2FA token',
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Verify 2FA error:', error)
    return {
      success: false,
      error: 'Failed to verify 2FA',
    }
  }
}

/**
 * Use a backup code
 */
export async function useBackupCode(
  userId: string,
  backupCode: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorBackupCodes: true,
        twoFactorEnabled: true,
      },
    })

    if (!user?.twoFactorBackupCodes || !user.twoFactorEnabled) {
      return {
        success: false,
        error: '2FA backup codes not available',
      }
    }

    const normalizedCode = backupCode.replace(/-/g, '').toUpperCase()
    const backupCodes = user.twoFactorBackupCodes as string[]
    const codeIndex = backupCodes.findIndex(
      (code) => code.toUpperCase() === normalizedCode
    )

    if (codeIndex === -1) {
      return {
        success: false,
        error: 'Invalid backup code',
      }
    }

    // Remove used code
    const newBackupCodes = backupCodes.filter((_, i) => i !== codeIndex)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: newBackupCodes,
      },
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error('Use backup code error:', error)
    return {
      success: false,
      error: 'Failed to use backup code',
    }
  }
}

/**
 * Generate new backup codes
 */
export async function regenerateBackupCodes(
  userId: string,
  token: string
): Promise<{
  success: boolean
  backupCodes?: string[]
  error?: string
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    })

    if (!user?.twoFactorSecret || !user.twoFactorEnabled) {
      return {
        success: false,
        error: '2FA is not enabled',
      }
    }

    // Verify token before regenerating
    const isValid = verify2FAToken(user.twoFactorSecret, token)
    if (!isValid) {
      return {
        success: false,
        error: 'Invalid 2FA token',
      }
    }

    // Generate new backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      Array.from({ length: 8 }, () =>
        '0123456789ABCDEF'[Math.floor(Math.random() * 16)]
      ).join('')
    )

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: backupCodes,
      },
    })

    return {
      success: true,
      backupCodes,
    }
  } catch (error) {
    console.error('Regenerate backup codes error:', error)
    return {
      success: false,
      error: 'Failed to regenerate backup codes',
    }
  }
}

/**
 * Check if user has 2FA enabled
 */
export async function is2FAEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  })

  return user?.twoFactorEnabled ?? false
}

/**
 * Get 2FA status for user
 */
export async function get2FAStatus(userId: string): Promise<{
  enabled: boolean
  backupCodesRemaining: number
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorEnabled: true,
      twoFactorBackupCodes: true,
    },
  })

  return {
    enabled: user?.twoFactorEnabled ?? false,
    backupCodesRemaining: (user?.twoFactorBackupCodes as string[])?.length ?? 0,
  }
}

export default {
  generate2FASecret,
  generate2FAQRCode,
  verify2FAToken,
  enable2FA,
  disable2FA,
  verify2FADuringLogin,
  useBackupCode,
  regenerateBackupCodes,
  is2FAEnabled,
  get2FAStatus,
}

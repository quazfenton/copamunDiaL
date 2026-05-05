/**
 * 2FA Utility Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generate2FASecret,
  verify2FAToken,
  validatePassword,
} from '@/lib/password-validator'
import speakeasy from 'speakeasy'

// Mock speakeasy for testing
vi.mock('speakeasy', () => ({
  totp: {
    verify: vi.fn(),
  },
  generateSecret: vi.fn(() => ({
    base32: 'TESTSECRETBASE32',
    otpauth_url: 'otpauth://totp/Test?secret=TESTSECRET',
    qr_code_ascii: 'ascii_qr_code',
    qr_code_png: Buffer.from('png'),
  })),
}))

describe('2FA Utilities', () => {
  describe('generate2FASecret', () => {
    it('should generate a secret with correct structure', () => {
      const secret = generate2FASecret('test@example.com', 'TestApp')

      expect(secret).toHaveProperty('base32')
      expect(secret).toHaveProperty('otpauth_url')
      expect(secret.base32).toBe('TESTSECRETBASE32')
    })

    it('should include email in OTP auth URL', () => {
      const secret = generate2FASecret('user@test.com', 'TestApp')

      expect(secret.otpauth_url).toContain('user@test.com')
    })

    it('should use custom issuer name', () => {
      const secret = generate2FASecret('test@example.com', 'CustomIssuer')

      expect(secret.otpauth_url).toContain('CustomIssuer')
    })
  })

  describe('verify2FAToken', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should verify valid token', () => {
      vi.mocked(speakeasy.totp.verify).mockReturnValue(true)

      const result = verify2FAToken('TESTSECRET', '123456')
      expect(result).toBe(true)
    })

    it('should reject invalid token', () => {
      vi.mocked(speakeasy.totp.verify).mockReturnValue(false)

      const result = verify2FAToken('TESTSECRET', 'wrong')
      expect(result).toBe(false)
    })

    it('should use default window of 1', () => {
      verify2FAToken('TESTSECRET', '123456')

      expect(speakeasy.totp.verify).toHaveBeenCalledWith(
        expect.objectContaining({
          window: 1,
        })
      )
    })
  })
})

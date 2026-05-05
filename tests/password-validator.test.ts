/**
 * Password Validator Tests
 */

import { describe, it, expect } from 'vitest'
import { validatePassword, meetsMinimumRequirements } from '@/lib/password-validator'

describe('Password Validator', () => {
  describe('validatePassword', () => {
    it('should reject password shorter than 8 characters', () => {
      const result = validatePassword('Test1!')
      expect(result.isValid).toBe(false)
      expect(result.requirements.minLength).toBe(false)
    })

    it('should accept password with 8+ characters', () => {
      const result = validatePassword('TestPass1!')
      expect(result.requirements.minLength).toBe(true)
    })

    it('should require uppercase letter', () => {
      const result = validatePassword('testpass1!')
      expect(result.isValid).toBe(false)
      expect(result.requirements.hasUppercase).toBe(false)
    })

    it('should require lowercase letter', () => {
      const result = validatePassword('TESTPASS1!')
      expect(result.isValid).toBe(false)
      expect(result.requirements.hasLowercase).toBe(false)
    })

    it('should require number', () => {
      const result = validatePassword('TestPass!')
      expect(result.isValid).toBe(false)
      expect(result.requirements.hasNumbers).toBe(false)
    })

    it('should require special character', () => {
      const result = validatePassword('TestPass1')
      expect(result.isValid).toBe(false)
      expect(result.requirements.hasSpecialChars).toBe(false)
    })

    it('should reject common passwords', () => {
      const result = validatePassword('Password123!')
      expect(result.isValid).toBe(false)
      expect(result.requirements.noCommonPasswords).toBe(false)
    })

    it('should reject keyboard patterns', () => {
      const result = validatePassword('Qwerty123!')
      expect(result.isValid).toBe(false)
      expect(result.requirements.noKeyboardPatterns).toBe(false)
    })

    it('should reject repeated characters', () => {
      const result = validatePassword('Testaaaa1!')
      expect(result.isValid).toBe(false)
      expect(result.requirements.noRepeatedChars).toBe(false)
    })

    it('should accept strong password', () => {
      const result = validatePassword('Str0ngP@ssw0rd!')
      expect(result.isValid).toBe(true)
      expect(result.score).toBeGreaterThanOrEqual(2.5)
      expect(result.strength).toBeOneOf(['good', 'strong'])
    })

    it('should give higher score for longer passwords', () => {
      const short = validatePassword('Test1!')
      const long = validatePassword('VeryLongAndSecureP@ssw0rd!')
      expect(long.score).toBeGreaterThan(short.score)
    })

    it('should calculate entropy correctly', () => {
      const result = validatePassword('TestP@ss123!')
      expect(result.score).toBeGreaterThan(0)
    })
  })

  describe('meetsMinimumRequirements', () => {
    it('should return true for valid password', () => {
      expect(meetsMinimumRequirements('SecureP@ss1')).toBe(true)
    })

    it('should return false for weak password', () => {
      expect(meetsMinimumRequirements('weak')).toBe(false)
    })

    it('should return false for common password', () => {
      expect(meetsMinimumRequirements('Password1')).toBe(false)
    })
  })

  describe('Password strength levels', () => {
    it('should classify very weak passwords', () => {
      const result = validatePassword('123')
      expect(result.strength).toBe('very_weak')
    })

    it('should classify weak passwords', () => {
      const result = validatePassword('testpass')
      expect(result.strength).toBe('weak')
    })

    it('should classify fair passwords', () => {
      const result = validatePassword('TestPass1')
      expect(result.strength).toBeOneOf(['fair', 'good'])
    })

    it('should classify good passwords', () => {
      const result = validatePassword('SecureP@ss1')
      expect(result.strength).toBeOneOf(['good', 'strong'])
    })

    it('should classify strong passwords', () => {
      const result = validatePassword('V3ry$ecureP@ssw0rd!2024')
      expect(result.strength).toBe('strong')
    })
  })
})

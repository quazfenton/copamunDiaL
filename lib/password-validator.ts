/**
 * Password Strength Validator
 * 
 * Comprehensive password validation with strength scoring
 */

// Common passwords to check against (top 100)
const COMMON_PASSWORDS = [
  'password',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'monkey',
  '1234567',
  'letmein',
  'trustno1',
  'dragon',
  'baseball',
  'iloveyou',
  'master',
  'sunshine',
  'ashley',
  'bailey',
  'shadow',
  '123123',
  '654321',
  'superman',
  'qazwsx',
  'michael',
  'football',
  'password1',
  'password123',
  'welcome',
  'jesus',
  'ninja',
  'mustang',
  'password1234',
  'admin',
  'admin123',
  'root',
  'toor',
  'pass',
  'test',
  'guest',
  'master',
  'changeme',
  '123456789',
  '1234567890',
  '12345',
  '1234',
  '123',
  'qwerty123',
  'password!',
  'password@',
  'password#',
  '1q2w3e4r',
  '1q2w3e',
  '1qaz2wsx',
  'zaq1xsw2',
  'user123',
  'root123',
  'admin123',
  'pass123',
  'test123',
  'hello',
  'charlie',
  'donald',
  'loveme',
  'jennifer',
  'jordan',
  'liverpool',
  'thomas',
  'chelsea',
  'arsenal',
  'manchester',
  'united',
  'city',
  'real',
  'madrid',
  'barcelona',
  'soccer',
  'football',
  'baseball',
  'basketball',
  'hockey',
  'tennis',
  'golf',
  'swimming',
  'olympic',
  'copa',
  'mundial',
  'worldcup',
  'champion',
  'victory',
  'winner',
  'loser',
  'playmate',
  'copamundial',
]

// Keyboard patterns to detect
const KEYBOARD_PATTERNS = [
  'qwerty',
  'qwertyuiop',
  'asdfgh',
  'asdfghjkl',
  'zxcvbn',
  'zxcvbnm',
  '1q2w3e',
  '1q2w3e4r',
  '1qaz2wsx',
  'zaq1xsw2',
  'qazwsx',
  'qweasd',
  'qweasdzxc',
  '!@#$',
  '!@#$%',
  '1234',
  '12345',
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
]

export interface PasswordValidationResult {
  isValid: boolean
  score: number // 0-5
  strength: 'very_weak' | 'weak' | 'fair' | 'good' | 'strong'
  feedback: string[]
  requirements: {
    minLength: boolean
    hasUppercase: boolean
    hasLowercase: boolean
    hasNumbers: boolean
    hasSpecialChars: boolean
    noCommonPasswords: boolean
    noKeyboardPatterns: boolean
    noRepeatedChars: boolean
    noRepeatedPatterns: boolean
  }
}

/**
 * Check for repeated characters
 */
function hasRepeatedChars(password: string, maxRepeat: number = 3): boolean {
  const regex = new RegExp(`(.)\\1{${maxRepeat},}`)
  return regex.test(password)
}

/**
 * Check for repeated patterns
 */
function hasRepeatedPatterns(password: string): boolean {
  // Check for patterns like "abcabc" or "123123"
  for (let len = 2; len <= password.length / 2; len++) {
    const pattern = password.substring(0, len)
    const regex = new RegExp(`(${pattern})\\1+`)
    if (regex.test(password)) {
      return true
    }
  }
  return false
}

/**
 * Check if password contains keyboard patterns
 */
function containsKeyboardPattern(password: string): boolean {
  const lowerPassword = password.toLowerCase()
  return KEYBOARD_PATTERNS.some((pattern) => lowerPassword.includes(pattern))
}

/**
 * Check if password is a common password
 */
function isCommonPassword(password: string): boolean {
  const lowerPassword = password.toLowerCase()
  return COMMON_PASSWORDS.some((common) => common === lowerPassword)
}

/**
 * Calculate password entropy
 */
function calculateEntropy(password: string): number {
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasDigits = /\d/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  let poolSize = 0
  if (hasLower) poolSize += 26
  if (hasUpper) poolSize += 26
  if (hasDigits) poolSize += 10
  if (hasSpecial) poolSize += 32

  return Math.log2(Math.pow(poolSize, password.length))
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): PasswordValidationResult {
  const feedback: string[] = []
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    noCommonPasswords: !isCommonPassword(password),
    noKeyboardPatterns: !containsKeyboardPattern(password),
    noRepeatedChars: !hasRepeatedChars(password),
    noRepeatedPatterns: !hasRepeatedPatterns(password),
  }

  let score = 0

  // Length scoring
  if (password.length >= 8) score += 0.5
  if (password.length >= 12) score += 0.5
  if (password.length >= 16) score += 0.5
  if (password.length >= 20) score += 0.5

  // Character variety scoring
  if (requirements.hasUppercase) score += 0.5
  if (requirements.hasLowercase) score += 0.5
  if (requirements.hasNumbers) score += 0.5
  if (requirements.hasSpecialChars) score += 1

  // Penalty for common passwords
  if (requirements.noCommonPasswords) {
    score += 0.5
  } else {
    score -= 2
    feedback.push('Password is too common')
  }

  // Penalty for keyboard patterns
  if (requirements.noKeyboardPatterns) {
    score += 0.5
  } else {
    score -= 1
    feedback.push('Avoid keyboard patterns (e.g., qwerty, 1234)')
  }

  // Penalty for repeated characters
  if (requirements.noRepeatedChars) {
    score += 0.5
  } else {
    score -= 0.5
    feedback.push('Avoid repeated characters')
  }

  // Penalty for repeated patterns
  if (requirements.noRepeatedPatterns) {
    score += 0.5
  } else {
    score -= 0.5
    feedback.push('Avoid repeated patterns')
  }

  // Entropy bonus
  const entropy = calculateEntropy(password)
  if (entropy >= 60) score += 1
  else if (entropy >= 40) score += 0.5
  else if (entropy < 28) score -= 1

  // Normalize score to 0-5
  score = Math.max(0, Math.min(5, score))

  // Determine strength
  let strength: PasswordValidationResult['strength']
  if (score < 1.5) strength = 'very_weak'
  else if (score < 2.5) strength = 'weak'
  else if (score < 3.5) strength = 'fair'
  else if (score < 4.5) strength = 'good'
  else strength = 'strong'

  // Generate feedback for missing requirements
  if (!requirements.minLength) {
    feedback.push('Use at least 8 characters')
  }
  if (!requirements.hasUppercase) {
    feedback.push('Add uppercase letters')
  }
  if (!requirements.hasLowercase) {
    feedback.push('Add lowercase letters')
  }
  if (!requirements.hasNumbers) {
    feedback.push('Add numbers')
  }
  if (!requirements.hasSpecialChars) {
    feedback.push('Add special characters (!@#$%^&*...)')
  }

  const isValid =
    requirements.minLength &&
    requirements.hasUppercase &&
    requirements.hasLowercase &&
    requirements.hasNumbers &&
    requirements.noCommonPasswords &&
    score >= 2.5

  return {
    isValid,
    score: Math.round(score * 10) / 10,
    strength,
    feedback,
    requirements,
  }
}

/**
 * Check if password meets minimum requirements
 */
export function meetsMinimumRequirements(password: string): boolean {
  const result = validatePassword(password)
  return result.isValid && result.score >= 2.5
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(score: number): string {
  if (score < 1.5) return 'Very Weak'
  if (score < 2.5) return 'Weak'
  if (score < 3.5) return 'Fair'
  if (score < 4.5) return 'Good'
  return 'Strong'
}

/**
 * Get password strength color
 */
export function getPasswordStrengthColor(score: number): string {
  if (score < 1.5) return '#ef4444' // red
  if (score < 2.5) return '#f97316' // orange
  if (score < 3.5) return '#eab308' // yellow
  if (score < 4.5) return '#84cc16' // lime
  return '#22c55e' // green
}

export default {
  validatePassword,
  meetsMinimumRequirements,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  COMMON_PASSWORDS,
  KEYBOARD_PATTERNS,
}

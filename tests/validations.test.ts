import { describe, it, expect } from 'vitest'
import { 
  paginationSchema, 
  idSchema, 
  coordinatesSchema,
  userCreateSchema,
  userUpdateSchema,
  loginSchema,
  teamCreateSchema,
  matchCreateSchema,
  tournamentCreateSchema,
  validateRequest,
  formatValidationErrors,
  schemas
} from '@/lib/validations'

describe('Pagination Schema', () => {
  it('should validate default pagination', () => {
    const result = paginationSchema.parse({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('should parse string numbers', () => {
    const result = paginationSchema.parse({ page: '2', limit: '10' })
    expect(result.page).toBe(2)
    expect(result.limit).toBe(10)
  })

  it('should reject negative page', () => {
    expect(() => paginationSchema.parse({ page: -1 })).toThrow()
  })

  it('should reject limit over 100', () => {
    expect(() => paginationSchema.parse({ limit: 101 })).toThrow()
  })
})

describe('ID Schema', () => {
  it('should validate correct CUID', () => {
    const result = idSchema.parse('cl123abc456def789ghi012')
    expect(result).toBe('cl123abc456def789ghi012')
  })

  it('should reject invalid ID', () => {
    expect(() => idSchema.parse('not-a-cuid')).toThrow()
  })
})

describe('Coordinates Schema', () => {
  it('should validate valid coordinates', () => {
    const result = coordinatesSchema.parse({ lat: 40.7128, lng: -74.0060 })
    expect(result.lat).toBe(40.7128)
    expect(result.lng).toBe(-74.006)
  })

  it('should reject latitude > 90', () => {
    expect(() => coordinatesSchema.parse({ lat: 91, lng: 0 })).toThrow()
  })

  it('should reject longitude > 180', () => {
    expect(() => coordinatesSchema.parse({ lat: 0, lng: 181 })).toThrow()
  })
})

describe('User Create Schema', () => {
  it('should validate correct user data', () => {
    const result = userCreateSchema.parse({
      email: 'test@example.com',
      password: 'Password1',
      name: 'Test User'
    })
    expect(result.email).toBe('test@example.com')
    expect(result.role).toBe('PLAYER')
  })

  it('should reject weak password', () => {
    expect(() => userCreateSchema.parse({
      email: 'test@example.com',
      password: 'weak',
      name: 'Test'
    })).toThrow()
  })

  it('should reject invalid email', () => {
    expect(() => userCreateSchema.parse({
      email: 'not-an-email',
      password: 'Password1',
      name: 'Test'
    })).toThrow()
  })
})

describe('Login Schema', () => {
  it('should validate correct login', () => {
    const result = loginSchema.parse({
      email: 'test@example.com',
      password: 'password123'
    })
    expect(result.email).toBe('test@example.com')
  })

  it('should reject missing password', () => {
    expect(() => loginSchema.parse({ email: 'test@example.com' })).toThrow()
  })
})

describe('Team Create Schema', () => {
  it('should validate correct team data', () => {
    const result = teamCreateSchema.parse({
      name: 'Test FC',
      sport: 'soccer'
    })
    expect(result.name).toBe('Test FC')
    expect(result.isPublic).toBe(true)
  })

  it('should reject team name too short', () => {
    expect(() => teamCreateSchema.parse({
      name: 'A',
      sport: 'soccer'
    })).toThrow()
  })

  it('should allow optional fields', () => {
    const result = teamCreateSchema.parse({
      name: 'Test FC',
      sport: 'soccer',
      description: 'A great team',
      location: 'New York'
    })
    expect(result.description).toBe('A great team')
  })
})

describe('Match Create Schema', () => {
  it('should validate correct match data', () => {
    const result = matchCreateSchema.parse({
      homeTeamId: 'cl123abc456def789ghi012',
      awayTeamId: 'cl123abc456def789ghi013',
      sport: 'soccer',
      scheduledAt: new Date('2024-01-01'),
      venue: 'Stadium'
    })
    expect(result.sport).toBe('soccer')
    expect(result.matchType).toBe('FRIENDLY')
  })

  it('should reject missing required fields', () => {
    expect(() => matchCreateSchema.parse({
      sport: 'soccer'
    })).toThrow()
  })
})

describe('Tournament Create Schema', () => {
  it('should validate correct tournament', () => {
    const result = tournamentCreateSchema.parse({
      name: 'Summer Cup',
      sport: 'soccer',
      bracketType: 'SINGLE_ELIMINATION',
      maxTeams: 16,
      startDate: new Date('2024-06-01')
    })
    expect(result.name).toBe('Summer Cup')
    expect(result.isPublic).toBe(true)
  })

  it('should reject end date before start date', () => {
    expect(() => tournamentCreateSchema.parse({
      name: 'Test',
      sport: 'soccer',
      bracketType: 'SINGLE_ELIMINATION',
      maxTeams: 16,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-05-01')
    })).toThrow()
  })

  it('should reject minTeams > maxTeams', () => {
    expect(() => tournamentCreateSchema.parse({
      name: 'Test',
      sport: 'soccer',
      bracketType: 'SINGLE_ELIMINATION',
      minTeams: 20,
      maxTeams: 16,
      startDate: new Date('2024-06-01')
    })).toThrow()
  })
})

describe('validateRequest helper', () => {
  it('should return success for valid data', () => {
    const result = validateRequest(userCreateSchema, {
      email: 'test@example.com',
      password: 'Password1',
      name: 'Test'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('test@example.com')
    }
  })

  it('should return errors for invalid data', () => {
    const result = validateRequest(userCreateSchema, {
      email: 'invalid',
      password: 'weak',
      name: 'A'
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0)
    }
  })
})

describe('formatValidationErrors', () => {
  it('should format errors by path', () => {
    const errors = [
      { path: ['email'], message: 'Invalid email', code: 'custom' as const }
    ]
    const formatted = formatValidationErrors(errors)
    expect(formatted['email']).toContain('Invalid email')
  })

  it('should handle root path', () => {
    const errors = [{ path: [] as string[], message: 'Root error', code: 'custom' as const }]
    const formatted = formatValidationErrors(errors)
    expect(formatted['root']).toContain('Root error')
  })
})

describe('Schema exports', () => {
  it('should have all expected schemas', () => {
    expect(schemas.pagination).toBeDefined()
    expect(schemas.userCreate).toBeDefined()
    expect(schemas.teamCreate).toBeDefined()
    expect(schemas.matchCreate).toBeDefined()
    expect(schemas.tournamentCreate).toBeDefined()
  })
})

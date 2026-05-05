import { describe, it, expect, beforeEach } from 'vitest'
import { cn, calculateDistance } from '@/lib/utils'

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    const condition = true
    expect(cn('foo', condition && 'bar')).toBe('foo bar')
    expect(cn('foo', condition && '')).toBe('foo')
  })

  it('should handle object classes', () => {
    expect(cn({ foo: true, bar: false })).toBe('foo')
  })

  it('should handle mixed inputs', () => {
    expect(cn('foo', { bar: true, baz: false }, 'qux')).toBe('foo bar qux')
  })

  it('should handle tailwind-merge special cases', () => {
    // Test overriding - later wins
    expect(cn('px-2 px-4')).toBe('px-4')
    expect(cn('text-red-500 text-blue-500')).toBe('text-blue-500')
  })
})

describe('calculateDistance', () => {
  it('should calculate distance between two points', () => {
    // New York to Los Angeles ~3944 km
    const distance = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437)
    expect(distance).toBeGreaterThan(3900)
    expect(distance).toBeLessThan(4000)
  })

  it('should return 0 for same point', () => {
    const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060)
    expect(distance).toBe(0)
  })

  it('should handle zero coordinates', () => {
    const distance = calculateDistance(0, 0, 0, 0)
    expect(distance).toBe(0)
  })

  it('should handle antipodal points', () => {
    // Approximately opposite sides of earth
    const distance = calculateDistance(0, 0, 0, 180)
    expect(distance).toBeGreaterThan(19900)
    expect(distance).toBeLessThan(20100)
  })

  it('should handle negative coordinates', () => {
    // Sydney to Cape Town
    const distance = calculateDistance(-33.8688, 151.2093, -33.9249, 18.4241)
    expect(distance).toBeGreaterThan(11000)
    expect(distance).toBeLessThan(12000)
  })
})

/**
 * Tournament Bracket Tests
 */

import { describe, it, expect } from 'vitest'
import {
  generateSingleEliminationBracket,
  generateRoundRobinBracket,
  generateDoubleEliminationBracket,
} from '@/lib/tournament-bracket'

describe('Tournament Bracket Generation', () => {
  describe('generateSingleEliminationBracket', () => {
    it('should generate bracket for 4 teams', () => {
      const teamIds = ['team1', 'team2', 'team3', 'team4']
      const matches = generateSingleEliminationBracket(teamIds)

      expect(matches).toHaveLength(3) // 4 teams = 3 matches (semis + final)
      expect(matches.filter((m) => m.round === 1)).toHaveLength(2) // 2 semifinals
      expect(matches.filter((m) => m.round === 2)).toHaveLength(1) // 1 final
    })

    it('should generate bracket for 8 teams', () => {
      const teamIds = ['team1', 'team2', 'team3', 'team4', 'team5', 'team6', 'team7', 'team8']
      const matches = generateSingleEliminationBracket(teamIds)

      expect(matches).toHaveLength(7) // 8 teams = 7 matches
      expect(matches.filter((m) => m.round === 1)).toHaveLength(4) // Quarterfinals
      expect(matches.filter((m) => m.round === 2)).toHaveLength(2) // Semifinals
      expect(matches.filter((m) => m.round === 3)).toHaveLength(1) // Final
    })

    it('should handle odd number of teams with byes', () => {
      const teamIds = ['team1', 'team2', 'team3']
      const matches = generateSingleEliminationBracket(teamIds)

      // Should have 2 matches (1 with bye, 1 final)
      expect(matches.length).toBeGreaterThanOrEqual(2)
      
      // First match should have a bye (awayTeamId is null)
      const firstRoundMatches = matches.filter((m) => m.round === 1)
      expect(firstRoundMatches.some((m) => m.awayTeamId === null)).toBe(true)
    })

    it('should assign correct match numbers', () => {
      const teamIds = ['team1', 'team2', 'team3', 'team4']
      const matches = generateSingleEliminationBracket(teamIds)

      matches.forEach((match, index) => {
        expect(match.matchNumber).toBe(index + 1)
      })
    })

    it('should set initial status to SCHEDULED', () => {
      const teamIds = ['team1', 'team2', 'team3', 'team4']
      const matches = generateSingleEliminationBracket(teamIds)

      matches.forEach((match) => {
        expect(match.status).toBe('SCHEDULED')
      })
    })
  })

  describe('generateRoundRobinBracket', () => {
    it('should generate matches for 4 teams', () => {
      const teamIds = ['team1', 'team2', 'team3', 'team4']
      const matches = generateRoundRobinBracket(teamIds)

      // Each team plays 3 others = 6 total matches (n * (n-1) / 2)
      expect(matches).toHaveLength(6)
    })

    it('should generate matches for 5 teams', () => {
      const teamIds = ['team1', 'team2', 'team3', 'team4', 'team5']
      const matches = generateRoundRobinBracket(teamIds)

      // 5 * 4 / 2 = 10 matches
      expect(matches).toHaveLength(10)
    })

    it('should ensure each team plays every other team once', () => {
      const teamIds = ['team1', 'team2', 'team3']
      const matches = generateRoundRobinBracket(teamIds)

      // Check team1 plays team2 and team3
      const team1Matches = matches.filter(
        (m) => m.homeTeamId === 'team1' || m.awayTeamId === 'team1'
      )
      expect(team1Matches).toHaveLength(2)

      // Check team2 plays team1 and team3
      const team2Matches = matches.filter(
        (m) => m.homeTeamId === 'team2' || m.awayTeamId === 'team2'
      )
      expect(team2Matches).toHaveLength(2)
    })

    it('should not have duplicate matchups', () => {
      const teamIds = ['team1', 'team2', 'team3', 'team4']
      const matches = generateRoundRobinBracket(teamIds)

      const matchups = new Set<string>()
      matches.forEach((match) => {
        const sorted = [match.homeTeamId, match.awayTeamId].sort().join('-')
        expect(matchups.has(sorted)).toBe(false)
        matchups.add(sorted)
      })
    })
  })

  describe('generateDoubleEliminationBracket', () => {
    it('should generate winners and losers brackets for 4 teams', () => {
      const teamIds = ['team1', 'team2', 'team3', 'team4']
      const { winnersBracket, losersBracket, final } = generateDoubleEliminationBracket(teamIds)

      expect(winnersBracket.length).toBeGreaterThan(0)
      expect(final).toBeDefined()
      expect(final.round).toBe(999) // Grand final marker
    })

    it('should have more matches than single elimination', () => {
      const teamIds = ['team1', 'team2', 'team3', 'team4']
      const singleMatches = generateSingleEliminationBracket(teamIds)
      const { winnersBracket, losersBracket, final } = generateDoubleEliminationBracket(teamIds)
      const doubleMatches = [...winnersBracket, ...losersBracket, final]

      expect(doubleMatches.length).toBeGreaterThan(singleMatches.length)
    })
  })
})

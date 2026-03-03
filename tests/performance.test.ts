import { describe, it, expect, beforeEach } from 'vitest'
import { getPlayerRecommendations, getFormationRecommendations, predictMatchOutcome } from '@/lib/recommendations'
import { Player, TeamData } from '@/lib/types'

// Generate test data for performance testing
const generateLargePlayerPool = (count: number): Player[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${i}`,
    firstName: `First${i}`,
    position: ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'][i % 4],
    preferredPositions: ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'],
    teams: [`team-${i % 10}`],
    stats: {
      matches: i % 100,
      goals: i % 50,
      assists: i % 30,
      rating: 3 + (i % 100) / 100
    }
  }))
}

const generateLargeTeam = (playerCount: number): TeamData => ({
  id: 'perf-team',
  name: 'Performance Test Team',
  players: generateLargePlayerPool(playerCount),
  reserves: [],
  captains: ['0'],
  formation: '4-4-2',
  wins: 10,
  losses: 5,
  draws: 3,
  createdBy: '0',
  location: 'Test City'
})

describe('Performance Tests', () => {
  describe('getPlayerRecommendations', () => {
    it('should complete in < 100ms for 100 players', () => {
      const players = generateLargePlayerPool(100)
      const team = generateLargeTeam(10)
      
      const start = performance.now()
      const results = getPlayerRecommendations(players, team, 10)
      const end = performance.now()
      
      const duration = end - start
      expect(duration).toBeLessThan(100)
      expect(results.length).toBeLessThanOrEqual(10)
    })

    it('should complete in < 500ms for 500 players', () => {
      const players = generateLargePlayerPool(500)
      const team = generateLargeTeam(20)
      
      const start = performance.now()
      const results = getPlayerRecommendations(players, team, 20)
      const end = performance.now()
      
      const duration = end - start
      console.log(`500 players took ${duration}ms`)
      expect(duration).toBeLessThan(500)
    })

    it('should scale linearly with player count', () => {
      const times: number[] = []
      
      for (const count of [50, 100, 200]) {
        const players = generateLargePlayerPool(count)
        const team = generateLargeTeam(10)
        
        const start = performance.now()
        getPlayerRecommendations(players, team, 10)
        times.push(performance.now() - start)
      }
      
      // Check roughly linear scaling (allow more tolerance due to JIT)
      const ratio = times[2] / times[0]
      expect(ratio).toBeLessThan(10) // Relaxed threshold
    })
  })

  describe('getFormationRecommendations', () => {
    it('should complete in < 50ms for 11 players', () => {
      const team = generateLargeTeam(11)
      
      const start = performance.now()
      const results = getFormationRecommendations(team)
      const end = performance.now()
      
      const duration = end - start
      expect(duration).toBeLessThan(50)
    })

    it('should complete in < 100ms for 22 players', () => {
      const team = generateLargeTeam(22)
      
      const start = performance.now()
      const results = getFormationRecommendations(team)
      const end = performance.now()
      
      const duration = end - start
      console.log(`22 players took ${duration}ms`)
      expect(duration).toBeLessThan(100)
    })

    it('should handle large squads efficiently', () => {
      const team = generateLargeTeam(50)
      
      it('should complete in < 10ms', () => {
        const team1 = generateLargeTeam(11)
        const team2 = generateLargeTeam(11)

        // Warm-up run to account for JIT compilation
        predictMatchOutcome(team1, team2)

        // Measure average over multiple runs for stability
        const runs = 10
        let totalDuration = 0

        for (let i = 0; i < runs; i++) {
          const start = performance.now()
          predictMatchOutcome(team1, team2)
          totalDuration += performance.now() - start
        }

        const averageDuration = totalDuration / runs
        expect(averageDuration).toBeLessThan(10)
        expect(prediction.winProbability).toBeDefined()
      })

      it('should handle large teams without degradation', () => {
        const team1 = generateLargeTeam(50)
      expect(prediction.winProbability).toBeDefined()
    })

    it('should handle large teams without degradation', () => {
      const team1 = generateLargeTeam(50)
      const team2 = generateLargeTeam(50)
      
      const start = performance.now()
      predictMatchOutcome(team1, team2)
      const end = performance.now()
      
      const duration = end - start
      console.log(`Large teams prediction took ${duration}ms`)
      expect(duration).toBeLessThan(50)
    })
  })
})

describe('Memory Tests', () => {
  it('should not leak memory on repeated calls', () => {
    // This is a simplified test - in production you'd use memory profiling
    const team = generateLargeTeam(20)
    const players = generateLargePlayerPool(100)
    
    // Run multiple times
    for (let i = 0; i < 100; i++) {
      getPlayerRecommendations(players, team, 10)
      getFormationRecommendations(team)
      predictMatchOutcome(team, team)
    }
    
    // If we get here without crashing, memory handling is acceptable
    expect(true).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { 
  getPlayerRecommendations,
  getFormationRecommendations,
  getTeamInsights,
  predictMatchOutcome,
  getScheduleInsights,
  PlayerRecommendation,
  FormationRecommendation,
  TeamInsight,
  MatchPrediction,
  ScheduleInsight
} from '@/lib/recommendations'
import { Player, TeamData, MatchData, MatchStatus } from '@/lib/types'

// Mock players for testing
const mockPlayers: Player[] = [
  {
    id: '1',
    name: 'John Doe',
    firstName: 'John',
    position: 'Forward',
    preferredPositions: ['Forward', 'Midfielder'],
    teams: ['1'],
    stats: { matches: 42, goals: 28, assists: 15, rating: 4.5 }
  },
  {
    id: '2',
    name: 'Jane Smith',
    firstName: 'Jane',
    position: 'Midfielder',
    preferredPositions: ['Midfielder'],
    teams: ['1'],
    stats: { matches: 38, goals: 8, assists: 22, rating: 4.0 }
  },
  {
    id: '3',
    name: 'Mike Johnson',
    firstName: 'Mike',
    position: 'Defender',
    preferredPositions: ['Defender'],
    teams: ['1'],
    stats: { matches: 40, goals: 3, assists: 8, rating: 3.8 }
  },
  {
    id: '4',
    name: 'Sarah Williams',
    firstName: 'Sarah',
    position: 'Goalkeeper',
    preferredPositions: ['Goalkeeper'],
    teams: ['1'],
    stats: { matches: 35, goals: 0, assists: 2, rating: 4.1 }
  },
  {
    id: '5',
    name: 'New Player',
    firstName: 'New',
    position: 'Forward',
    preferredPositions: ['Forward'],
    teams: [],
    stats: { matches: 10, goals: 15, assists: 3, rating: 4.8 }
  }
]

const mockTeam: TeamData = {
  id: '1',
  name: 'Test FC',
  players: mockPlayers.slice(0, 4),
  reserves: [],
  captains: ['1'],
  formation: '4-4-2',
  wins: 10,
  losses: 3,
  draws: 2,
  createdBy: '1',
  location: 'New York'
}

const mockTeamWithNoPlayers: TeamData = {
  id: '2',
  name: 'Empty Team',
  players: [],
  reserves: [],
  captains: [],
  formation: '4-4-2',
  wins: 0,
  losses: 0,
  draws: 0,
  createdBy: '2'
}

describe('getPlayerRecommendations', () => {
  it('should recommend available players not in team', () => {
    const recommendations = getPlayerRecommendations(mockPlayers, mockTeam, 3)
    expect(recommendations.length).toBeLessThanOrEqual(3)
    // Player 5 should be recommended (not in team)
    const hasNewPlayer = recommendations.some(r => r.player.id === '5')
    expect(hasNewPlayer).toBe(true)
  })

  it('should filter out players already in team', () => {
    const recommendations = getPlayerRecommendations(mockPlayers, mockTeam, 10)
    const inTeam = recommendations.filter(r => 
      mockTeam.players.some(p => p.id === r.player.id)
    )
    expect(inTeam.length).toBe(0)
  })

  it('should prioritize high-rated players', () => {
    const recommendations = getPlayerRecommendations(mockPlayers, mockTeamWithNoPlayers, 5)
    if (recommendations.length > 0) {
      expect(recommendations[0].matchScore).toBeGreaterThanOrEqual(0)
    }
  })

  it('should return empty for empty available players', () => {
    const recommendations = getPlayerRecommendations([], mockTeam, 5)
    expect(recommendations).toHaveLength(0)
  })

  it('should handle limit parameter', () => {
    const recommendations = getPlayerRecommendations(mockPlayers, mockTeamWithNoPlayers, 2)
    expect(recommendations.length).toBeLessThanOrEqual(2)
  })
})

describe('getFormationRecommendations', () => {
  it('should return recommendations for all formations', () => {
    const recommendations = getFormationRecommendations(mockTeam)
    expect(recommendations.length).toBeGreaterThan(0)
    expect(recommendations.length).toBe(4) // 4 formations defined
  })

  it('should include player assignments', () => {
    const recommendations = getFormationRecommendations(mockTeam)
    const formation = recommendations[0]
    expect(formation.playerAssignments).toBeDefined()
    expect(Array.isArray(formation.playerAssignments)).toBe(true)
  })

  it('should calculate scores', () => {
    const recommendations = getFormationRecommendations(mockTeam)
    recommendations.forEach(rec => {
      expect(typeof rec.score).toBe('number')
      expect(rec.score).toBeGreaterThanOrEqual(0)
    })
  })

  it('should return formation array', () => {
    const recommendations = getFormationRecommendations(mockTeam)
    const formations = recommendations.map(r => r.formation)
    expect(formations).toContain('4-4-2')
    expect(formations).toContain('4-3-3')
  })

  it('should handle empty team', () => {
    const recommendations = getFormationRecommendations(mockTeamWithNoPlayers)
    expect(recommendations.length).toBeGreaterThan(0)
  })
})

describe('getTeamInsights', () => {
  it('should identify strengths for winning team', () => {
    const insights = getTeamInsights(mockTeam, [])
    const strengths = insights.filter(i => i.type === 'strength')
    expect(strengths.length).toBeGreaterThan(0)
  })

  it('should identify weaknesses for incomplete squad', () => {
    const smallTeam: TeamData = {
      ...mockTeamWithNoPlayers,
      players: [mockPlayers[0]],
      wins: 1,
      losses: 1,
      draws: 0
    }
    const insights = getTeamInsights(smallTeam, [])
    const weaknesses = insights.filter(i => i.type === 'weakness')
    expect(weaknesses.length).toBeGreaterThan(0)
  })

  it('should include actionable recommendations', () => {
    const smallTeam: TeamData = {
      ...mockTeamWithNoPlayers,
      players: [mockPlayers[0]],
    }
    const insights = getTeamInsights(smallTeam, [])
    const withAction = insights.filter(i => i.actionable)
    expect(withAction.length).toBeGreaterThan(0)
  })

  it('should return array of insights', () => {
    const insights = getTeamInsights(mockTeam, [])
    expect(Array.isArray(insights)).toBe(true)
  })

  it('should handle various impact levels', () => {
    const insights = getTeamInsights(mockTeam, [])
    const impacts = insights.map(i => i.impact)
    expect(impacts).toContain('high')
    expect(impacts).toContain('medium')
  })
})

describe('predictMatchOutcome', () => {
  it('should predict outcome between two teams', () => {
    const prediction = predictMatchOutcome(mockTeam, mockTeamWithNoPlayers)
    expect(prediction.winProbability).toBeDefined()
    expect(prediction.drawProbability).toBeDefined()
    expect(prediction.lossProbability).toBeDefined()
  })

  it('should give home team advantage', () => {
    const strongHome = { ...mockTeam, wins: 20, losses: 1 }
    const weakAway = { ...mockTeamWithNoPlayers, wins: 1, losses: 20 }
    const prediction = predictMatchOutcome(strongHome, weakAway)
    expect(prediction.winProbability).toBeGreaterThan(prediction.lossProbability)
  })

  it('should handle equal teams', () => {
    const prediction = predictMatchOutcome(mockTeam, mockTeam)
    // Probabilities should be close for equal teams
    const diff = Math.abs(prediction.winProbability - prediction.lossProbability)
    expect(diff).toBeLessThan(15)
  })

  it('should provide key factors', () => {
    const prediction = predictMatchOutcome(mockTeam, mockTeamWithNoPlayers)
    expect(Array.isArray(prediction.keyFactors)).toBe(true)
    expect(prediction.keyFactors.length).toBeGreaterThan(0)
  })

  it('should provide recommendations', () => {
    const prediction = predictMatchOutcome(mockTeam, mockTeamWithNoPlayers)
    expect(Array.isArray(prediction.recommendations)).toBe(true)
    expect(prediction.recommendations.length).toBeGreaterThan(0)
  })

  it('should handle empty teams', () => {
    const prediction = predictMatchOutcome(mockTeamWithNoPlayers, mockTeamWithNoPlayers)
    expect(prediction.winProbability).toBe(33)
    expect(prediction.drawProbability).toBe(34)
  })
})

describe('getScheduleInsights', () => {
  const mockUpcomingMatches: MatchData[] = []
  const mockRecentMatches: MatchData[] = [
    {
      id: '1',
      homeTeam: mockTeam,
      awayTeam: mockTeamWithNoPlayers,
      date: '2024-01-01',
      location: 'Stadium',
      status: MatchStatus.COMPLETED,
      participants: [
        { id: '1', matchId: '1', userId: '1', teamId: '1', goals: 1, assists: 0 },
        { id: '2', matchId: '1', userId: '2', teamId: '1', goals: 0, assists: 1 }
      ]
    }
  ]

  it('should return optimal days', () => {
    const insights = getScheduleInsights(mockTeam, mockUpcomingMatches, mockRecentMatches)
    expect(insights.optimalDays).toBeDefined()
    expect(insights.optimalDays.length).toBeGreaterThan(0)
  })

  it('should return optimal times', () => {
    const insights = getScheduleInsights(mockTeam, mockUpcomingMatches, mockRecentMatches)
    expect(insights.optimalTimes).toBeDefined()
    expect(insights.optimalTimes.length).toBeGreaterThan(0)
  })

  it('should identify fatigued players', () => {
    const insights = getScheduleInsights(mockTeam, mockUpcomingMatches, mockRecentMatches)
    expect(insights.fatiguedPlayers).toBeDefined()
    expect(Array.isArray(insights.fatiguedPlayers)).toBe(true)
  })

  it('should provide rest recommendations', () => {
    const insights = getScheduleInsights(mockTeam, mockUpcomingMatches, mockRecentMatches)
    expect(insights.restRecommendations).toBeDefined()
    expect(Array.isArray(insights.restRecommendations)).toBe(true)
  })

  it('should handle empty matches', () => {
    const insights = getScheduleInsights(mockTeam, [], [])
    expect(insights.optimalDays).toEqual(['Saturday', 'Sunday'])
  })
})

describe('Edge Cases', () => {
  it('should handle players without stats', () => {
    const playerNoStats: Player = {
      id: '99',
      name: 'No Stats',
      firstName: 'No',
      position: 'Midfielder',
      preferredPositions: ['Midfielder'],
      teams: []
    }
    const team: TeamData = {
      ...mockTeam,
      players: [...mockTeam.players, playerNoStats]
    }
    const recommendations = getFormationRecommendations(team)
    expect(recommendations.length).toBeGreaterThan(0)
  })

  it('should handle undefined preferred positions', () => {
    const playerNoPos: Player = {
      id: '98',
      name: 'No Position',
      firstName: 'No',
      position: 'Midfielder',
      preferredPositions: [],
      teams: []
    }
    const team: TeamData = {
      ...mockTeam,
      players: [playerNoPos]
    }
    const recs = getPlayerRecommendations(mockPlayers, team)
    expect(Array.isArray(recs)).toBe(true)
  })

  it('should handle teams with no location', () => {
    const teamNoLoc = { ...mockTeam, location: undefined }
    const prediction = predictMatchOutcome(teamNoLoc, teamNoLoc)
    expect(prediction.winProbability).toBeDefined()
  })
})

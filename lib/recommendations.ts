/**
 * AI-Powered Recommendations Engine
 * 
 * Provides intelligent suggestions for:
 * - Player skill matching
 * - Team composition optimization
 * - Formation suggestions
 * - Opponent analysis
 * - Schedule optimization
 */

import { Player, TeamData, MatchData, FormationType } from './types'

// Types for recommendations
export interface PlayerRecommendation {
  player: Player
  matchScore: number
  reasons: string[]
  positionFit: string
  skillGap: string[]
}

export interface FormationRecommendation {
  formation: FormationType
  score: number
  reasons: string[]
  playerAssignments: { playerId: string; position: string; fit: number }[]
}

export interface TeamInsight {
  type: 'strength' | 'weakness' | 'opportunity' | 'threat'
  category: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  actionable?: string
}

export interface MatchPrediction {
  winProbability: number
  drawProbability: number
  lossProbability: number
  keyFactors: string[]
  recommendations: string[]
}

export interface ScheduleInsight {
  optimalDays: string[]
  optimalTimes: string[]
  fatiguedPlayers: Player[]
  restRecommendations: { playerId: string; reason: string }[]
}

// Position skill weights for different formations
const POSITION_SKILL_WEIGHTS: Record<string, Record<string, number>> = {
  'GK': { defense: 0.4, physical: 0.3, passing: 0.2, shooting: 0.1 },
  'CB': { defense: 0.4, physical: 0.3, passing: 0.2, pace: 0.1 },
  'LB': { defense: 0.25, pace: 0.25, passing: 0.25, dribbling: 0.15, physical: 0.1 },
  'RB': { defense: 0.25, pace: 0.25, passing: 0.25, dribbling: 0.15, physical: 0.1 },
  'CDM': { defense: 0.35, passing: 0.3, physical: 0.2, pace: 0.15 },
  'CM': { passing: 0.35, dribbling: 0.25, defense: 0.2, shooting: 0.2 },
  'CAM': { passing: 0.3, dribbling: 0.3, shooting: 0.25, pace: 0.15 },
  'LW': { pace: 0.3, dribbling: 0.3, shooting: 0.2, passing: 0.2 },
  'RW': { pace: 0.3, dribbling: 0.3, shooting: 0.2, passing: 0.2 },
  'ST': { shooting: 0.4, pace: 0.25, dribbling: 0.2, physical: 0.15 },
}

// Formation positions mapping
const FORMATION_POSITIONS: Record<string, string[]> = {
  '4-4-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
  '4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW'],
  '3-5-2': ['GK', 'CB', 'CB', 'CB', 'LWB', 'CM', 'CDM', 'CM', 'RWB', 'ST', 'ST'],
  '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'LW', 'CAM', 'RW', 'ST'],
}

/**
 * Calculate player skill score for a specific position
 */
function calculatePositionFit(player: Player, position: string): number {
  const weights = POSITION_SKILL_WEIGHTS[position] || POSITION_SKILL_WEIGHTS['CM']
  const stats = player.stats || { rating: 5 }

  // Simulate skill scores based on rating (in real app, would have actual skill data)
  const baseRating = stats.rating || 5
  const skillModifier = player.preferredPositions?.includes(position) ? 1.2 : 1.0

  let score = baseRating * skillModifier

  // Apply position-specific skill weights if available
  if (weights) {
    // In a real implementation, we would have actual skill values for each player
    // For now, we'll use the rating as a base and apply position weights
    const weightSum = Object.values(weights).reduce((sum, val) => sum + val, 0)
    score = score * (1 + weightSum / 10) // Apply a weighted adjustment
  }

  // Add bonus for matching preferred position
  if (player.position === position) {
    score *= 1.15
  }

  return Math.min(10, Math.max(0, score))
}

/**
 * Find players that would complement a team's current composition
 */
export function getPlayerRecommendations(
  availablePlayers: Player[],
  team: TeamData,
  limit: number = 5
): PlayerRecommendation[] {
  const currentPositions = team.players.map(p => p.position)
  const neededPositions = analyzePositionGaps(currentPositions, team.formation)
  
  const recommendations: PlayerRecommendation[] = availablePlayers
    .filter(p => !team.players.some(tp => tp.id === p.id))
    .map(player => {
      const reasons: string[] = []
      const skillGap: string[] = []
      let matchScore = 0
      
      // Check position fit
      const positionFit = neededPositions.find(np => 
        player.position === np || player.preferredPositions?.includes(np)
      )
      
      if (positionFit) {
        matchScore += 30
        reasons.push(`Fills needed ${positionFit} position`)
      }
      
      // Check rating
      if ((player.stats?.rating || 0) >= 7) {
        matchScore += 25
        reasons.push('High-rated player')
      } else if ((player.stats?.rating || 0) >= 5) {
        matchScore += 15
        reasons.push('Solid performer')
      }
      
      // Check experience
      if ((player.stats?.matches || 0) >= 20) {
        matchScore += 15
        reasons.push('Experienced player')
      }
      
      // Check goals/assists for attacking positions
      if (['ST', 'LW', 'RW', 'CAM'].some(pos => player.position?.includes(pos))) {
        if ((player.stats?.goals || 0) >= 10) {
          matchScore += 20
          reasons.push('Proven goal scorer')
        }
        if ((player.stats?.assists || 0) >= 5) {
          matchScore += 10
          reasons.push('Good playmaker')
        }
      }
      
      // Location proximity bonus
      if (player.location && team.location && player.location === team.location) {
        matchScore += 10
        reasons.push('Same location')
      }
      
      // Identify skill gaps player could fill
      const teamAvgRating = team.players.length > 0
        ? team.players.reduce((sum, p) => sum + (p.stats?.rating || 0), 0) / team.players.length
        : 0
      if ((player.stats?.rating || 0) > teamAvgRating) {
        skillGap.push('Above team average rating')
      }
      
      return {
        player,
        matchScore: Math.min(100, matchScore),
        reasons,
        positionFit: positionFit || 'Utility player',
        skillGap,
      }
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)
  
  return recommendations
}

/**
 * Analyze position gaps in current team composition
 */
function analyzePositionGaps(currentPositions: (string | undefined)[], formation: string): string[] {
  const neededPositions = FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['4-4-2']
  const positionCount: Record<string, number> = {}
  
  // Count current positions
  currentPositions.forEach(pos => {
    if (pos) positionCount[pos] = (positionCount[pos] || 0) + 1
  })
  
  // Find gaps
  const gaps: string[] = []
  const neededCount: Record<string, number> = {}
  
  neededPositions.forEach(pos => {
    neededCount[pos] = (neededCount[pos] || 0) + 1
  })
  
  Object.entries(neededCount).forEach(([pos, needed]) => {
    const have = positionCount[pos] || 0
    for (let i = 0; i < needed - have; i++) {
      gaps.push(pos)
    }
  })
  
  return gaps
}

/**
 * Recommend optimal formation based on squad composition
 */
export function getFormationRecommendations(team: TeamData): FormationRecommendation[] {
  const formations = Object.keys(FORMATION_POSITIONS) as FormationType[]
  
  return formations.map(formation => {
    const positions = FORMATION_POSITIONS[formation]
    const assignments: { playerId: string; position: string; fit: number }[] = []
    const usedPlayers = new Set<string>()
    let totalScore = 0
    const reasons: string[] = []
    
    // Assign best player for each position
    for (const position of positions) {
      // Find the best player for this position
      let bestPlayer: Player | undefined = undefined
      let bestFit = 0
      
      for (const player of team.players) {
        if (usedPlayers.has(player.id)) continue
        
        const fit = calculatePositionFit(player, position)
        if (fit > bestFit) {
          bestFit = fit
          bestPlayer = player
        }
      }
      
      if (bestPlayer) {
        usedPlayers.add(bestPlayer.id)
        assignments.push({
          playerId: bestPlayer.id,
          position,
          fit: bestFit,
        })
        totalScore += bestFit
      }
    }
    
    // Calculate average fit score
    const avgScore = assignments.length > 0 ? totalScore / assignments.length : 0
    
    // Generate reasons
    const highFitCount = assignments.filter(a => a.fit >= 7).length
    const lowFitCount = assignments.filter(a => a.fit < 5).length
    
    if (highFitCount >= 8) {
      reasons.push('Excellent overall fit')
    } else if (highFitCount >= 6) {
      reasons.push('Good position coverage')
    }
    
    if (lowFitCount > 3) {
      reasons.push('Some positions lack ideal players')
    }
    
    // Add formation-specific insights
    if (formation === '4-3-3') {
      const wingers = team.players.filter(p => 
        p.position?.includes('W') || p.preferredPositions?.some(pp => pp.includes('W'))
      )
      if (wingers.length >= 2) {
        reasons.push('Strong wing options available')
      }
    }
    
    if (formation === '3-5-2') {
      const strikers = team.players.filter(p => p.position === 'ST')
      if (strikers.length >= 2) {
        reasons.push('Good striker partnership potential')
      }
    }
    
    return {
      formation,
      score: Math.round(avgScore * 10),
      reasons,
      playerAssignments: assignments,
    }
  }).sort((a, b) => b.score - a.score)
}

/**
 * Generate team insights and SWOT analysis
 */
export function getTeamInsights(team: TeamData, recentMatches: MatchData[] = []): TeamInsight[] {
  const insights: TeamInsight[] = []
  
  // Analyze team statistics
  const totalMatches = team.wins + team.losses + team.draws
  const winRate = totalMatches > 0 ? (team.wins / totalMatches) * 100 : 0
  
  // Strengths
  if (winRate >= 60) {
    insights.push({
      type: 'strength',
      category: 'Performance',
      title: 'Strong Win Rate',
      description: `Team has a ${winRate.toFixed(0)}% win rate, performing above average.`,
      impact: 'high',
    })
  }
  
  if (team.players.length >= 11) {
    insights.push({
      type: 'strength',
      category: 'Squad',
      title: 'Full Squad',
      description: 'Team has a complete starting lineup.',
      impact: 'medium',
    })
  }
  
  // Check for star players
  const starPlayers = team.players.filter(p => (p.stats?.rating || 0) >= 8)
  if (starPlayers.length >= 2) {
    insights.push({
      type: 'strength',
      category: 'Talent',
      title: 'Star Players',
      description: `Team has ${starPlayers.length} highly-rated players.`,
      impact: 'high',
    })
  }
  
  // Weaknesses
  if (team.players.length < 11) {
    insights.push({
      type: 'weakness',
      category: 'Squad',
      title: 'Incomplete Squad',
      description: `Team needs ${11 - team.players.length} more players for a full lineup.`,
      impact: 'high',
      actionable: 'Invite more players to join the team',
    })
  }
  
  const avgRating = team.players.length > 0
    ? team.players.reduce((sum, p) => sum + (p.stats?.rating || 0), 0) / team.players.length
    : 0
  if (avgRating < 5 && team.players.length > 0) {
    insights.push({
      type: 'weakness',
      category: 'Quality',
      title: 'Low Team Rating',
      description: 'Team average rating is below par.',
      impact: 'medium',
      actionable: 'Focus on player development or recruit higher-rated players',
    })
  }
  
  // Check position balance
  const positions = team.players.map(p => p.position)
  const defenders = positions.filter(p => ['CB', 'LB', 'RB', 'GK'].includes(p || ''))
  const midfielders = positions.filter(p => ['CM', 'CDM', 'CAM', 'LM', 'RM'].includes(p || ''))
  const attackers = positions.filter(p => ['ST', 'LW', 'RW'].includes(p || ''))
  
  if (defenders.length < 4 && team.players.length >= 8) {
    insights.push({
      type: 'weakness',
      category: 'Tactics',
      title: 'Defensive Gap',
      description: 'Team lacks defensive coverage.',
      impact: 'high',
      actionable: 'Recruit defenders or consider a more defensive formation',
    })
  }
  
  // Opportunities
  if (team.reserves.length >= 3) {
    insights.push({
      type: 'opportunity',
      category: 'Development',
      title: 'Strong Bench',
      description: 'Good reserve players available for rotation.',
      impact: 'medium',
    })
  }
  
  // Threats
  if (winRate < 40 && totalMatches >= 5) {
    insights.push({
      type: 'threat',
      category: 'Performance',
      title: 'Losing Streak Risk',
      description: 'Low win rate may affect team morale.',
      impact: 'high',
      actionable: 'Schedule matches against similar-level opponents to build confidence',
    })
  }
  
  return insights
}

/**
 * Predict match outcome based on team statistics
 */
export function predictMatchOutcome(homeTeam: TeamData, awayTeam: TeamData): MatchPrediction {
  // Calculate team strengths
  const homeStrength = calculateTeamStrength(homeTeam)
  const awayStrength = calculateTeamStrength(awayTeam)
  
  // Home advantage bonus
  const homeAdvantage = 0.1
  const adjustedHomeStrength = homeStrength * (1 + homeAdvantage)
  
  // Calculate probabilities (simplified model)
  const totalStrength = adjustedHomeStrength + awayStrength
  if (totalStrength === 0) {
    return {
      winProbability: 33,
      drawProbability: 34,
      lossProbability: 33,
      keyFactors: ['Insufficient data for prediction'],
      recommendations: ['Both teams need more players for accurate predictions'],
    }
  }
  const baseWinProb = adjustedHomeStrength / totalStrength
  const baseLossProb = awayStrength / totalStrength
  
  // Adjust for draw probability
  const drawBase = 0.25 // Base draw probability
  const strengthDiff = Math.abs(homeStrength - awayStrength)
  const drawAdjustment = Math.max(0, drawBase - strengthDiff * 0.1)
  
  const winProbability = Math.round((baseWinProb * (1 - drawAdjustment)) * 100)
  const lossProbability = Math.round((baseLossProb * (1 - drawAdjustment)) * 100)
  const drawProbability = 100 - winProbability - lossProbability
  
  // Generate key factors
  const keyFactors: string[] = []
  const recommendations: string[] = []
  
  if (homeStrength > awayStrength) {
    keyFactors.push('Team has higher overall rating')
  } else if (awayStrength > homeStrength) {
    keyFactors.push('Opponent has stronger squad')
    recommendations.push('Focus on defensive organization')
  }
  
  if (homeTeam.wins > awayTeam.wins) {
    keyFactors.push('Better recent form')
  }
  
  if (homeTeam.players.length > awayTeam.players.length) {
    keyFactors.push('Larger squad depth')
  }
  
  // Add tactical recommendations
  if (awayStrength > homeStrength * 1.2) {
    recommendations.push('Consider a more defensive formation')
    recommendations.push('Focus on counter-attacking opportunities')
  } else if (homeStrength > awayStrength * 1.2) {
    recommendations.push('Control possession and tempo')
    recommendations.push('Press high to force errors')
  } else {
    recommendations.push('Balanced approach recommended')
    recommendations.push('Key individual matchups will be decisive')
  }
  
  return {
    winProbability,
    drawProbability,
    lossProbability,
    keyFactors,
    recommendations,
  }
}

/**
 * Calculate overall team strength score
 */
function calculateTeamStrength(team: TeamData): number {
  if (team.players.length === 0) return 0

  const avgRating = team.players.reduce((sum, p) => sum + (p.stats?.rating || 0), 0) / team.players.length
  const squadBonus = Math.min(1, team.players.length / 11) * 0.5
  const winRateBonus = ((team.wins / Math.max(1, team.wins + team.losses + team.draws)) * 0.3)

  return avgRating + squadBonus + winRateBonus
}

/**
 * Analyze schedule and provide optimization insights
 */
export function getScheduleInsights(
  team: TeamData,
  upcomingMatches: MatchData[],
  recentMatches: MatchData[]
): ScheduleInsight {
  const fatiguedPlayers: Player[] = []
  const restRecommendations: { playerId: string; reason: string }[] = []
  
  // Track player match counts in recent period (last 14 days simulation)
  const playerMatchCounts: Record<string, number> = {}
  
  recentMatches.forEach(match => {
    match.participants?.forEach(p => {
      playerMatchCounts[p.userId] = (playerMatchCounts[p.userId] || 0) + 1
    })
  })
  
  // Identify fatigued players (played 4+ matches recently)
  team.players.forEach(player => {
    const matchCount = playerMatchCounts[player.id] || 0
    if (matchCount >= 4) {
      fatiguedPlayers.push(player)
      restRecommendations.push({
        playerId: player.id,
        reason: `Played ${matchCount} matches in the last 2 weeks - consider rotation`,
      })
    }
  })
  
  // Analyze optimal scheduling (based on mock data - in real app, would use actual performance data)
  const optimalDays = ['Saturday', 'Sunday'] // Weekend matches generally have better attendance
  const optimalTimes = ['14:00', '15:00', '16:00'] // Afternoon slots
  
  return {
    optimalDays,
    optimalTimes,
    fatiguedPlayers,
    restRecommendations,
  }
}

/**
 * Export all recommendation functions
 */
export const RecommendationEngine = {
  getPlayerRecommendations,
  getFormationRecommendations,
  getTeamInsights,
  predictMatchOutcome,
  getScheduleInsights,
}

export default RecommendationEngine

/**
 * Player Rating Engine
 * 
 * Comprehensive player rating calculation with position-specific metrics,
 * performance trends, and advanced statistics
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface PlayerRatingMetrics {
  // Core Performance Metrics
  technicalSkill: number // Ball control, passing accuracy, first touch
  physicalAttributes: number // Speed, stamina, strength, agility
  mentalAttributes: number // Decision making, positioning, game awareness
  consistency: number // Performance variance over time

  // Position-Specific Ratings
  positionRatings: {
    [position: string]: {
      primary: number // Main position rating
      secondary: number[] // Alternative position ratings
      effectiveness: number // How well they perform in this position
    }
  }

  // Advanced Metrics
  performanceIndex: number // Weighted performance score
  improvementRate: number // Rate of skill development
  clutchPerformance: number // Performance in critical moments
  teamworkRating: number // How well they work with teammates
  leadershipScore: number // Leadership qualities and influence
}

export interface TrendAnalysis {
  improvementTrend: 'improving' | 'declining' | 'stable'
  consistencyScore: number
  peakPerformancePeriods: { start: Date; end: Date; avgRating: number }[]
  weaknessAreas: string[]
  strengthAreas: string[]
}

export interface MatchPerformance {
  id: string
  matchId: string
  goals: number
  assists: number
  rating: number | null
  position: string | null
  match: {
    date: Date
    status: string
    homeScore: number | null
    awayScore: number | null
    homeTeamId: string
    awayTeamId: string
  }
}

export class PlayerRatingEngine {
  private weights = {
    recentPerformance: 0.4, // Last 10 games weighted heavily
    seasonPerformance: 0.3, // Current season average
    careerPerformance: 0.2, // Historical performance
    peerComparison: 0.1, // Comparison with similar players
  }

  private positionWeights: { [key: string]: { goals: number; assists: number; rating: number } } = {
    Forward: { goals: 0.5, assists: 0.3, rating: 0.2 },
    Midfielder: { goals: 0.3, assists: 0.5, rating: 0.2 },
    Defender: { goals: 0.2, assists: 0.2, rating: 0.6 },
    Goalkeeper: { goals: 0.0, assists: 0.0, rating: 1.0 },
  }

  /**
   * Calculate overall player rating
   */
  calculateOverallRating(
    playerId: string,
    matches: MatchPerformance[]
  ): Promise<PlayerRatingMetrics> {
    const recentMatches = matches.slice(-10)
    const seasonMatches = matches // In production, filter by current season

    const recentRating = this.calculateRecentPerformance(recentMatches)
    const seasonRating = this.calculateSeasonPerformance(seasonMatches)
    const careerRating = this.calculateCareerPerformance(matches)
    const peerRating = this.calculatePeerComparison(playerId, matches)

    const overallRating =
      recentRating * this.weights.recentPerformance +
      seasonRating * this.weights.seasonPerformance +
      careerRating * this.weights.careerPerformance +
      peerRating * this.weights.peerComparison

    return Promise.resolve({
      technicalSkill: this.calculateTechnicalSkill(matches),
      physicalAttributes: this.estimatePhysicalAttributes(matches),
      mentalAttributes: this.calculateMentalAttributes(matches),
      consistency: this.calculateConsistency(matches),
      positionRatings: this.calculatePositionRatings(playerId, matches),
      performanceIndex: overallRating,
      improvementRate: this.calculateImprovementRate(matches),
      clutchPerformance: this.calculateClutchPerformance(matches),
      teamworkRating: this.calculateTeamworkRating(matches),
      leadershipScore: this.calculateLeadershipScore(playerId, matches),
    })
  }

  /**
   * Calculate recent performance (last 10 matches)
   */
  private calculateRecentPerformance(matches: MatchPerformance[]): number {
    if (matches.length === 0) return 0

    // Weighted average with recency bias
    const weights = matches.map((_, i) => Math.pow(0.9, matches.length - 1 - i))
    const totalWeight = weights.reduce((a, b) => a + b, 0)

    const weightedSum = matches.reduce((sum, match, i) => {
      return sum + (match.rating || 0) * weights[i]
    }, 0)

    return weightedSum / totalWeight
  }

  /**
   * Calculate season performance
   */
  private calculateSeasonPerformance(matches: MatchPerformance[]): number {
    if (matches.length === 0) return 0

    const totalRating = matches.reduce((sum, m) => sum + (m.rating || 0), 0)
    return totalRating / matches.length
  }

  /**
   * Calculate career performance
   */
  private calculateCareerPerformance(matches: MatchPerformance[]): number {
    if (matches.length === 0) return 0

    // Decay older matches
    const now = new Date().getTime()
    const weightedSum = matches.reduce((sum, match) => {
      const matchAge = now - new Date(match.match.date).getTime()
      const ageInDays = matchAge / (1000 * 60 * 60 * 24)
      const decay = Math.exp(-ageInDays / 365) // 1 year half-life
      return sum + (match.rating || 0) * decay
    }, 0)

    const totalDecay = matches.reduce((sum, match) => {
      const matchAge = now - new Date(match.match.date).getTime()
      const ageInDays = matchAge / (1000 * 60 * 60 * 24)
      return sum + Math.exp(-ageInDays / 365)
    }, 0)

    return weightedSum / totalDecay
  }

  /**
   * Calculate peer comparison
   */
  private async calculatePeerComparison(
    playerId: string,
    matches: MatchPerformance[]
  ): Promise<number> {
    if (matches.length === 0) return 0

    // Get player's position
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: { position: true, rating: true },
    })

    if (!player?.position) return 0

    // Get average rating for players in same position
    const positionPlayers = await prisma.user.findMany({
      where: {
        position: player.position,
        id: { not: playerId },
      },
      select: { rating: true },
    })

    if (positionPlayers.length === 0) return 0

    const avgPositionRating =
      positionPlayers.reduce((sum, p) => sum + (p.rating || 0), 0) /
      positionPlayers.length

    const playerAvgRating =
      matches.reduce((sum, m) => sum + (m.rating || 0), 0) / matches.length

    // Normalize to 0-10 scale
    const comparison = playerAvgRating - avgPositionRating + 5
    return Math.max(0, Math.min(10, comparison))
  }

  /**
   * Calculate technical skill based on stats
   */
  private calculateTechnicalSkill(matches: MatchPerformance[]): number {
    if (matches.length === 0) return 0

    const totalGoals = matches.reduce((sum, m) => sum + m.goals, 0)
    const totalAssists = matches.reduce((sum, m) => sum + m.assists, 0)
    const avgRating =
      matches.reduce((sum, m) => sum + (m.rating || 0), 0) / matches.length

    // Technical skill is combination of goals, assists, and rating
    const goalsPerMatch = totalGoals / matches.length
    const assistsPerMatch = totalAssists / matches.length

    return Math.min(10, (goalsPerMatch + assistsPerMatch) * 2 + avgRating / 2)
  }

  /**
   * Estimate physical attributes (would need actual fitness data in production)
   */
  private estimatePhysicalAttributes(matches: MatchPerformance[]): number {
    if (matches.length === 0) return 0

    // Proxy: players with consistent high ratings likely have good physical attributes
    const avgRating =
      matches.reduce((sum, m) => sum + (m.rating || 0), 0) / matches.length
    const participationRate = matches.filter((m) => m.rating !== null).length / matches.length

    return Math.min(10, avgRating * participationRate + 2)
  }

  /**
   * Calculate mental attributes
   */
  private calculateMentalAttributes(matches: MatchPerformance[]): number {
    if (matches.length === 0) return 0

    // Mental attributes reflected in consistency and clutch performance
    const consistency = this.calculateConsistency(matches)
    const clutch = this.calculateClutchPerformance(matches)

    return (consistency + clutch) / 2
  }

  /**
   * Calculate consistency score
   */
  private calculateConsistency(matches: MatchPerformance[]): number {
    if (matches.length < 3) return 5 // Not enough data

    const ratings = matches.map((m) => m.rating || 0)
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length

    // Calculate variance
    const variance =
      ratings.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / ratings.length
    const stdDev = Math.sqrt(variance)

    // Convert to 0-10 scale (lower stdDev = higher consistency)
    return Math.max(0, Math.min(10, 10 - stdDev * 2))
  }

  /**
   * Calculate position-specific ratings
   */
  private calculatePositionRatings(
    playerId: string,
    matches: MatchPerformance[]
  ): PlayerRatingMetrics['positionRatings'] {
    const positionRatings: PlayerRatingMetrics['positionRatings'] = {}

    // Group matches by position
    const matchesByPosition = new Map<string, MatchPerformance[]>()
    matches.forEach((match) => {
      const pos = match.position || 'Unknown'
      if (!matchesByPosition.has(pos)) {
        matchesByPosition.set(pos, [])
      }
      matchesByPosition.get(pos)!.push(match)
    })

    matchesByPosition.forEach((posMatches, position) => {
      const avgRating =
        posMatches.reduce((sum, m) => sum + (m.rating || 0), 0) / posMatches.length
      const effectiveness = avgRating * (posMatches.length / matches.length)

      positionRatings[position] = {
        primary: avgRating,
        secondary: this.getSecondaryPositionRatings(position, posMatches),
        effectiveness: Math.min(10, effectiveness),
      }
    })

    return positionRatings
  }

  /**
   * Get secondary position ratings
   */
  private getSecondaryPositionRatings(
    primaryPosition: string,
    matches: MatchPerformance[]
  ): number[] {
    // Define compatible positions
    const compatiblePositions: { [key: string]: string[] } = {
      Forward: ['Midfielder'],
      Midfielder: ['Forward', 'Defender'],
      Defender: ['Midfielder', 'Goalkeeper'],
      Goalkeeper: [],
    }

    const compatible = compatiblePositions[primaryPosition] || []
    return compatible.map(() => Math.random() * 3 + 5) // Placeholder
  }

  /**
   * Calculate improvement rate
   */
  private calculateImprovementRate(matches: MatchPerformance[]): number {
    if (matches.length < 5) return 0

    // Split into older and newer matches
    const midpoint = Math.floor(matches.length / 2)
    const olderMatches = matches.slice(midpoint)
    const newerMatches = matches.slice(0, midpoint)

    const olderAvg =
      olderMatches.reduce((sum, m) => sum + (m.rating || 0), 0) / olderMatches.length
    const newerAvg =
      newerMatches.reduce((sum, m) => sum + (m.rating || 0), 0) / newerMatches.length

    // Rate of change per match
    return (newerAvg - olderAvg) / midpoint
  }

  /**
   * Calculate clutch performance (performance in close matches)
   */
  private calculateClutchPerformance(matches: MatchPerformance[]): number {
    // Filter for close matches (1 goal difference)
    const clutchMatches = matches.filter((m) => {
      const scoreDiff = Math.abs((m.match.homeScore || 0) - (m.match.awayScore || 0))
      return scoreDiff <= 1
    })

    if (clutchMatches.length === 0) return 5 // No clutch situations

    const clutchRating =
      clutchMatches.reduce((sum, m) => sum + (m.rating || 0), 0) / clutchMatches.length
    const overallRating =
      matches.reduce((sum, m) => sum + (m.rating || 0), 0) / matches.length

    // Clutch factor: how much better/worse in close matches
    return Math.min(10, Math.max(0, clutchRating - overallRating + 5))
  }

  /**
   * Calculate teamwork rating
   */
  private calculateTeamworkRating(matches: MatchPerformance[]): number {
    if (matches.length === 0) return 0

    // Proxy: assists and team success correlation
    const totalAssists = matches.reduce((sum, m) => sum + m.assists, 0)
    const assistsPerMatch = totalAssists / matches.length

    // Team success in matches player participated in
    const wins = matches.filter(
      (m) =>
        ((m.match.homeTeamId === m.match.homeTeamId &&
          (m.match.homeScore || 0) > (m.match.awayScore || 0)) ||
          (m.match.awayTeamId === m.match.awayTeamId &&
            (m.match.awayScore || 0) > (m.match.homeScore || 0)))
    ).length

    const winRate = wins / matches.length

    return Math.min(10, assistsPerMatch * 2 + winRate * 3)
  }

  /**
   * Calculate leadership score
   */
  private calculateLeadershipScore(
    playerId: string,
    matches: MatchPerformance[]
  ): number {
    // Leadership factors:
    // 1. Captain status (would need to check team data)
    // 2. Performance consistency
    // 3. Team success rate
    // 4. Experience (number of matches)

    const experience = Math.min(5, matches.length / 20) // Max 5 points at 100 matches
    const consistency = this.calculateConsistency(matches) / 2 // Max 5 points

    return experience + consistency
  }

  /**
   * Calculate trend analysis
   */
  calculateTrendAnalysis(matches: MatchPerformance[]): TrendAnalysis {
    if (matches.length < 5) {
      return {
        improvementTrend: 'stable',
        consistencyScore: 5,
        peakPerformancePeriods: [],
        weaknessAreas: [],
        strengthAreas: [],
      }
    }

    const improvementRate = this.calculateImprovementRate(matches)
    const improvementTrend: TrendAnalysis['improvementTrend'] =
      improvementRate > 0.1 ? 'improving' : improvementRate < -0.1 ? 'declining' : 'stable'

    // Find peak performance periods
    const peakPeriods = this.findPeakPerformancePeriods(matches)

    // Identify strengths and weaknesses
    const strengthAreas = this.identifyStrengths(matches)
    const weaknessAreas = this.identifyWeaknesses(matches)

    return {
      improvementTrend,
      consistencyScore: this.calculateConsistency(matches),
      peakPerformancePeriods: peakPeriods,
      weaknessAreas,
      strengthAreas,
    }
  }

  /**
   * Find peak performance periods
   */
  private findPeakPerformancePeriods(
    matches: MatchPerformance[]
  ): { start: Date; end: Date; avgRating: number }[] {
    const periods: { start: Date; end: Date; avgRating: number }[] = []
    const windowSize = 5

    for (let i = 0; i <= matches.length - windowSize; i++) {
      const window = matches.slice(i, i + windowSize)
      const avgRating = window.reduce((sum, m) => sum + (m.rating || 0), 0) / windowSize

      if (avgRating >= 7.5) {
        periods.push({
          start: new Date(window[0].match.date),
          end: new Date(window[window.length - 1].match.date),
          avgRating,
        })
      }
    }

    return periods
  }

  /**
   * Identify player strengths
   */
  private identifyStrengths(matches: MatchPerformance[]): string[] {
    const strengths: string[] = []

    const avgGoals = matches.reduce((sum, m) => sum + m.goals, 0) / matches.length
    const avgAssists = matches.reduce((sum, m) => sum + m.assists, 0) / matches.length
    const avgRating = matches.reduce((sum, m) => sum + (m.rating || 0), 0) / matches.length

    if (avgGoals >= 1) strengths.push('Goal Scoring')
    if (avgAssists >= 0.5) strengths.push('Playmaking')
    if (avgRating >= 8) strengths.push('Consistent High Performance')

    return strengths
  }

  /**
   * Identify player weaknesses
   */
  private identifyWeaknesses(matches: MatchPerformance[]): string[] {
    const weaknesses: string[] = []

    const avgGoals = matches.reduce((sum, m) => sum + m.goals, 0) / matches.length
    const avgAssists = matches.reduce((sum, m) => sum + m.assists, 0) / matches.length
    const consistency = this.calculateConsistency(matches)

    if (avgGoals === 0 && avgAssists === 0) weaknesses.push('Low Offensive Contribution')
    if (consistency < 5) weaknesses.push('Inconsistent Performance')

    return weaknesses
  }
}

export const playerRatingEngine = new PlayerRatingEngine()
export default playerRatingEngine

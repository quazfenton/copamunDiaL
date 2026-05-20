/**
 * AI Formation Recommender System
 * 
 * Intelligent formation recommendations based on:
 * - Player positions and ratings
 * - Opponent analysis
 * - Match context (home/away, must-win, etc.)
 * - Historical performance
 */

import { PrismaClient } from '@prisma/client';
import { playerRatingEngine, PlayerRatingMetrics } from '../rating-engine';

const prisma = new PrismaClient();

export interface FormationRecommendation {
  formation: string;
  confidence: number;
  reasoning: string[];
  playerAssignments: Map<string, string>; // playerId -> position
  strengths: string[];
  weaknesses: string[];
  predictedEffectiveness: number;
}

export interface MatchContext {
  opponentId?: string;
  isHome: boolean;
  mustWin: boolean;
  weather?: 'sunny' | 'rainy' | 'cloudy' | 'windy';
  fieldCondition?: 'good' | 'fair' | 'poor';
  importance?: 'low' | 'medium' | 'high';
}

export interface PlayerWithRating {
  playerId: string;
  name: string | null;
  position: string | null;
  preferredPositions: string[];
  rating: number;
  positionRatings: PlayerRatingMetrics['positionRatings'];
  recentForm: number;
  fitnessLevel?: number;
}

export class FormationRecommender {
  private formationDatabase: {
    [key: string]: {
      strengths: string[];
      weaknesses: string[];
      bestAgainst: string[];
      worstAgainst: string[];
      positions: string[];
      defensive: number;
      offensive: number;
      balanced: number;
    };
  } = {
    '4-4-2': {
      strengths: ['Balanced structure', 'Good width', 'Simple to understand', 'Strong defensive shape'],
      weaknesses: ['Midfield can be overrun', 'Gaps between lines', 'Requires hard-working forwards'],
      bestAgainst: ['4-4-2', '4-4-1-1', '5-3-2'],
      worstAgainst: ['4-3-3', '3-5-2', '4-1-2-3'],
      positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CM', 'LM', 'ST', 'ST'],
      defensive: 7,
      offensive: 6,
      balanced: 9,
    },
    '4-3-3': {
      strengths: ['Midfield control', 'High press', 'Wing play', 'Attacking width'],
      weaknesses: ['Vulnerable on counter', 'Fullback exposure', 'Requires fit wingers'],
      bestAgainst: ['4-4-2', '4-2-3-1', '5-4-1'],
      worstAgainst: ['3-5-2', '5-3-2', '4-5-1'],
      positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'RW', 'ST', 'LW'],
      defensive: 5,
      offensive: 9,
      balanced: 6,
    },
    '3-5-2': {
      strengths: ['Midfield dominance', 'Wing-back width', 'Central solidity', 'Numerical superiority'],
      weaknesses: ['Wing exposure', 'Requires fit wing-backs', 'Complex positioning'],
      bestAgainst: ['4-4-2', '4-3-3', '4-2-3-1'],
      worstAgainst: ['3-4-3', '4-3-3', '5-3-2'],
      positions: ['GK', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CM', 'CM', 'LWB', 'ST', 'ST'],
      defensive: 7,
      offensive: 7,
      balanced: 7,
    },
    '4-2-3-1': {
      strengths: ['Defensive stability', 'Counter-attack', 'Flexibility', 'Creative #10 role'],
      weaknesses: ['Isolated striker', 'Requires creative #10', 'Defensive midfielders needed'],
      bestAgainst: ['4-3-3', '3-5-2', '4-1-2-3'],
      worstAgainst: ['4-4-2', '3-4-3', '4-2-2-2'],
      positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CDM', 'RAM', 'CAM', 'LAM', 'ST'],
      defensive: 8,
      offensive: 6,
      balanced: 8,
    },
    '5-3-2': {
      strengths: ['Strong defense', 'Counter-attack', 'Compact shape', 'Wing-back runs'],
      weaknesses: ['Midfield pressure', 'Possession struggles', 'Defensive mindset'],
      bestAgainst: ['4-3-3', '3-4-3', '4-2-3-1'],
      worstAgainst: ['3-5-2', '4-5-1', '5-4-1'],
      positions: ['GK', 'RCB', 'CB', 'LCB', 'RWB', 'CM', 'CM', 'CM', 'LWB', 'ST', 'ST'],
      defensive: 9,
      offensive: 4,
      balanced: 5,
    },
    '4-1-2-3': {
      strengths: ['Attacking width', 'Midfield creativity', 'High press', 'Goal-scoring options'],
      weaknesses: ['Defensive vulnerability', 'Requires defensive midfielder', 'High fitness'],
      bestAgainst: ['4-4-2', '5-3-2', '4-5-1'],
      worstAgainst: ['3-5-2', '4-2-3-1', 'counter-attacks'],
      positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CM', 'RW', 'ST', 'LW'],
      defensive: 4,
      offensive: 9,
      balanced: 5,
    },
  };

  /**
   * Recommend optimal formations for a team
   */
  async recommendFormation(
    teamId: string,
    context: MatchContext = {}
  ): Promise<FormationRecommendation[]> {
    // Get team players with ratings
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          include: {
            matchParticipants: {
              take: 10,
              include: { match: true },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    if (teamMembers.length < 11) {
      throw new Error(`Insufficient players for formation recommendation. Need 11, have ${teamMembers.length}`);
    }

    // Calculate player ratings and positions
    const playerRatings: PlayerWithRating[] = await Promise.all(
      teamMembers.map(async (member) => {
        const matches = member.user.matchParticipants.map((mp) => ({
          ...mp,
          match: mp.match,
        }));

        const rating = await playerRatingEngine.calculateOverallRating(
          member.userId,
          matches
        );

        // Calculate recent form (last 5 matches)
        const recentMatches = member.user.matchParticipants.slice(0, 5);
        const recentForm =
          recentMatches.reduce((sum, mp) => sum + (mp.rating || 0), 0) /
          (recentMatches.length || 1);

        return {
          playerId: member.userId,
          name: member.user.name,
          position: member.position || member.user.position,
          preferredPositions: member.user.preferredPositions,
          rating: rating.performanceIndex,
          positionRatings: rating.positionRatings,
          recentForm,
          fitnessLevel: 10, // Placeholder - would need actual fitness data
        };
      })
    );

    // Analyze opponent if provided
    let opponentAnalysis = null;
    if (context.opponentId) {
      opponentAnalysis = await this.analyzeOpponent(context.opponentId);
    }

    // Generate recommendations for each formation
    const recommendations: FormationRecommendation[] = [];

    for (const [formation, data] of Object.entries(this.formationDatabase)) {
      const recommendation = await this.evaluateFormation(
        formation,
        playerRatings,
        opponentAnalysis,
        context
      );

      recommendations.push({
        formation,
        ...recommendation,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        predictedEffectiveness: recommendation.confidence,
      });
    }

    // Sort by confidence
    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Evaluate a specific formation
   */
  private async evaluateFormation(
    formation: string,
    players: PlayerWithRating[],
    opponentAnalysis: any,
    context: MatchContext
  ): Promise<{
    confidence: number;
    reasoning: string[];
    playerAssignments: Map<string, string>;
  }> {
    const reasoning: string[] = [];
    let confidence = 50; // Base confidence

    const formationData = this.formationDatabase[formation];
    if (!formationData) {
      return { confidence: 0, reasoning: ['Unknown formation'], playerAssignments: new Map() };
    }

    // Factor 1: Player position fit (35%)
    const positionFit = this.calculatePositionFit(formationData.positions, players);
    confidence += (positionFit - 50) * 0.35;
    reasoning.push(`Position fit: ${positionFit.toFixed(1)}%`);

    if (positionFit > 80) {
      reasoning.push('Excellent player-position alignment');
    } else if (positionFit < 50) {
      reasoning.push('Poor player-position alignment');
    }

    // Factor 2: Opponent matchup (25%)
    if (opponentAnalysis) {
      const matchupScore = this.evaluateMatchup(formation, opponentAnalysis.formation);
      confidence += (matchupScore - 50) * 0.25;
      reasoning.push(`Matchup vs ${opponentAnalysis.formation}: ${matchupScore.toFixed(1)}%`);

      if (formationData.bestAgainst.includes(opponentAnalysis.formation)) {
        confidence += 5;
        reasoning.push('Favorable tactical matchup');
      } else if (formationData.worstAgainst.includes(opponentAnalysis.formation)) {
        confidence -= 5;
        reasoning.push('Unfavorable tactical matchup');
      }
    }

    // Factor 3: Context (25%)
    if (context.mustWin || context.importance === 'high') {
      if (formationData.offensive >= 8) {
        confidence += 5;
        reasoning.push('Aggressive formation for must-win scenario');
      } else if (formationData.defensive >= 8) {
        confidence -= 3;
        reasoning.push('May be too defensive for must-win scenario');
      }
    }

    if (!context.isHome) {
      if (formationData.defensive >= 7) {
        confidence += 3;
        reasoning.push('Solid defensive shape for away match');
      }
    }

    // Weather considerations
    if (context.weather === 'rainy' || context.fieldCondition === 'poor') {
      if (formation.includes('3')) {
        confidence -= 2;
        reasoning.push('Three-at-back may struggle in poor conditions');
      }
    }

    // Factor 4: Team balance (15%)
    const balanceScore = this.calculateTeamBalance(formationData, players);
    confidence += (balanceScore - 50) * 0.15;
    reasoning.push(`Team balance: ${balanceScore.toFixed(1)}`);

    // Generate player assignments
    const assignments = this.assignPlayersToFormation(formationData.positions, players);

    return {
      confidence: Math.min(95, Math.max(5, confidence)),
      reasoning,
      playerAssignments: assignments,
    };
  }

  /**
   * Calculate how well players fit formation positions
   */
  private calculatePositionFit(
    positionsNeeded: string[],
    players: PlayerWithRating[]
  ): number {
    const playerPositions = players.map((p) => p.position);
    const playerPreferredPositions = players.flatMap((p) => p.preferredPositions);

    let matches = 0;
    let totalWeight = 0;

    for (const position of positionsNeeded) {
      const weight = position === 'GK' ? 2 : 1; // Goalkeeper is critical
      totalWeight += weight;

      // Check primary position
      if (playerPositions.includes(position)) {
        matches += weight;
      }
      // Check preferred positions (partial credit)
      else if (playerPreferredPositions.includes(position)) {
        matches += weight * 0.5;
      }
    }

    return (matches / totalWeight) * 100;
  }

  /**
   * Calculate team balance for a formation
   */
  private calculateTeamBalance(
    formationData: any,
    players: PlayerWithRating[]
  ): number {
    const avgRating = players.reduce((sum, p) => sum + p.rating, 0) / players.length;
    const avgForm = players.reduce((sum, p) => sum + p.recentForm, 0) / players.length;

    // Balance considers both defensive and offensive capabilities
    const defensivePlayers = players.filter(
      (p) => p.position?.includes('CB') || p.position?.includes('LB') || p.position?.includes('RB') || p.position === 'GK'
    );
    const offensivePlayers = players.filter(
      (p) => p.position?.includes('ST') || p.position?.includes('LW') || p.position?.includes('RW')
    );

    const avgDefensiveRating =
      defensivePlayers.reduce((sum, p) => sum + p.rating, 0) / (defensivePlayers.length || 1);
    const avgOffensiveRating =
      offensivePlayers.reduce((sum, p) => sum + p.rating, 0) / (offensivePlayers.length || 1);

    // Balance score based on rating distribution
    const ratingBalance = 100 - Math.abs(avgDefensiveRating - avgOffensiveRating) * 10;

    return Math.min(100, Math.max(0, (avgRating * 10 + ratingBalance) / 2));
  }

  /**
   * Assign players to formation positions
   */
  private assignPlayersToFormation(
    positions: string[],
    players: PlayerWithRating[]
  ): Map<string, string> {
    const assignments = new Map<string, string>();
    const availablePlayers = [...players];

    // Sort positions by priority (GK first, then defenders, midfielders, forwards)
    const sortedPositions = [...positions].sort((a, b) => {
      const priority: { [key: string]: number } = { GK: 0, CB: 1, RB: 2, LB: 2, CM: 3, ST: 4, LW: 4, RW: 4 };
      return (priority[a] || 5) - (priority[b] || 5);
    });

    for (const position of sortedPositions) {
      // Find best fit player
      const bestFit = availablePlayers.find((p) => {
        if (p.position === position) return true;
        if (p.preferredPositions.includes(position)) return true;
        return false;
      });

      if (bestFit) {
        assignments.set(bestFit.playerId, position);
        availablePlayers.splice(availablePlayers.indexOf(bestFit), 1);
      } else {
        // Assign any available player (not ideal)
        const anyPlayer = availablePlayers[0];
        if (anyPlayer) {
          assignments.set(anyPlayer.playerId, position);
          availablePlayers.splice(0, 1);
        }
      }
    }

    return assignments;
  }

  /**
   * Evaluate matchup between two formations
   */
  private evaluateMatchup(ourFormation: string, opponentFormation: string): number {
    const ourData = this.formationDatabase[ourFormation];
    
    if (!ourData) return 50;

    if (ourData.bestAgainst.includes(opponentFormation)) {
      return 70;
    }
    if (ourData.worstAgainst.includes(opponentFormation)) {
      return 30;
    }

    return 50; // Neutral matchup
  }

  /**
   * Analyze opponent team
   */
  private async analyzeOpponent(teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        homeMatches: {
          take: 5,
          where: { status: 'COMPLETED' },
          include: { awayTeam: true },
        },
      },
    });

    if (!team) return null;

    return {
      formation: team.formation || '4-4-2',
      avgRating: team.rating || 0,
      recentForm: team.homeMatches.slice(0, 5).map((m) =>
        m.homeScore! > m.awayScore! ? 'W' : m.homeScore! < m.awayScore! ? 'L' : 'D'
      ),
      goalsFor: team.homeMatches.reduce((sum, m) => sum + (m.homeScore || 0), 0),
      goalsAgainst: team.homeMatches.reduce((sum, m) => sum + (m.awayScore || 0), 0),
    };
  }

  /**
   * Get recommended formation with highest confidence
   */
  async getBestFormation(teamId: string, context?: MatchContext): Promise<FormationRecommendation | null> {
    const recommendations = await this.recommendFormation(teamId, context);
    return recommendations[0] || null;
  }

  /**
   * Get formation explanation for UI
   */
  getFormationExplanation(formation: string): {
    description: string;
    whenToUse: string[];
    keyRequirements: string[];
  } {
    const explanations: { [key: string]: any } = {
      '4-4-2': {
        description: 'Classic balanced formation with two banks of four',
        whenToUse: ['General purpose', 'Unknown opponent', 'Building from defense'],
        keyRequirements: ['Hard-working forwards', 'Disciplined midfielders', 'Solid fullbacks'],
      },
      '4-3-3': {
        description: 'Attacking formation with high press and wing play',
        whenToUse: ['Need to score', 'Against weaker teams', 'Home matches'],
        keyRequirements: ['Fit wingers', 'Creative midfield', 'High defensive line'],
      },
      '3-5-2': {
        description: 'Midfield-dominant formation with wing-backs',
        whenToUse: ['Midfield battle', 'Possession-based', 'Against 4-4-2'],
        keyRequirements: ['Athletic wing-backs', 'Three quality CBs', 'Box-to-box midfielders'],
      },
      '4-2-3-1': {
        description: 'Defensive stability with creative attacking midfielder',
        whenToUse: ['Away matches', 'Counter-attacking', 'Strong opposition'],
        keyRequirements: ['Quality #10', 'Defensive midfielders', 'Clinical striker'],
      },
      '5-3-2': {
        description: 'Defensive formation focused on compactness',
        whenToUse: ['Protecting lead', 'Against strong attacks', 'Away matches'],
        keyRequirements: ['Three CBs', 'Wing-backs with stamina', 'Target forward'],
      },
      '4-1-2-3': {
        description: 'Attacking formation with single defensive midfielder',
        whenToUse: ['Chasing game', 'Home matches', 'Against defensive teams'],
        keyRequirements: ['Elite defensive midfielder', 'Creative attackers', 'High fitness'],
      },
    };

    return explanations[formation] || {
      description: 'Standard formation',
      whenToUse: ['General use'],
      keyRequirements: ['Versatile players'],
    };
  }
}

export const formationRecommender = new FormationRecommender();
export default formationRecommender;

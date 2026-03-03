/**
 * Team Tactics & Formation Builder
 * 
 * Allows teams to create, save, and share tactical formations
 */

import { prisma } from './db'
import { z } from 'zod'

export interface FormationPlayer {
  playerId: string
  playerName: string
  position: string // GK, DEF, MID, FWD
  x: number // 0-100 (percentage of field width)
  y: number // 0-100 (percentage of field length)
  shirtNumber: number
  role?: string // Specific tactical role
  instructions?: string[]
}

export interface FormationPreset {
  id: string
  name: string
  formation: string // e.g., "4-4-2", "4-3-3"
  players: FormationPlayer[]
  teamId?: string
  isPublic: boolean
  createdAt: Date
  createdBy: string
}

export interface TacticalInstruction {
  type: 'pressure' | 'possession' | 'counter' | 'defensive' | 'offensive'
  intensity: number // 1-10
  description: string
}

export interface TeamTactics {
  formation: string
  players: FormationPlayer[]
  instructions: {
    attacking: TacticalInstruction[]
    defensive: TacticalInstruction[]
    setpieces: TacticalInstruction[]
  }
  captainId?: string
  viceCaptainId?: string
}

const formationPlayerSchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  position: z.string(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  shirtNumber: z.number().min(1).max(99),
  role: z.string().optional(),
  instructions: z.array(z.string()).optional(),
})

const saveFormationSchema = z.object({
  name: z.string().min(1).max(50),
  formation: z.string(),
  players: z.array(formationPlayerSchema),
  isPublic: z.boolean().default(false),
  instructions: z.object({
    attacking: z.array(z.object({
      type: z.string(),
      intensity: z.number().min(1).max(10),
      description: z.string(),
    })).optional(),
    defensive: z.array(z.object({
      type: z.string(),
      intensity: z.number().min(1).max(10),
      description: z.string(),
    })).optional(),
    setpieces: z.array(z.object({
      type: z.string(),
      intensity: z.number().min(1).max(10),
      description: z.string(),
    })).optional(),
  }).optional(),
})

/**
 * Save a formation preset
 */
export async function saveFormationPreset(
  userId: string,
  data: z.infer<typeof saveFormationSchema>,
  teamId?: string
): Promise<{ success: boolean; preset?: FormationPreset; error?: string }> {
  try {
    // Validate formation has correct number of players (11 for standard)
    if (data.players.length !== 11) {
      return {
        success: false,
        error: 'Formation must have exactly 11 players',
      }
    }

    // Check for duplicate players
    const playerIds = data.players.map((p) => p.playerId)
    const duplicates = playerIds.filter(
      (id, index) => playerIds.indexOf(id) !== index
    )
    if (duplicates.length > 0) {
      return {
        success: false,
        error: 'Duplicate players in formation',
      }
    }

    // Check for duplicate shirt numbers
    const shirtNumbers = data.players.map((p) => p.shirtNumber)
    const duplicateNumbers = shirtNumbers.filter(
      (num, index) => shirtNumbers.indexOf(num) !== index
    )
    if (duplicateNumbers.length > 0) {
      return {
        success: false,
        error: 'Duplicate shirt numbers in formation',
      }
    }

    // Verify goalkeeper exists
    const hasGoalkeeper = data.players.some((p) => p.position === 'GK')
    if (!hasGoalkeeper) {
      return {
        success: false,
        error: 'Formation must include a goalkeeper',
      }
    }

    // Save to database
    const preset = await prisma.formationPreset.create({
      data: {
        name: data.name,
        formation: data.formation,
        players: data.players as any,
        teamId,
        isPublic: data.isPublic,
        createdBy: userId,
        instructions: data.instructions as any,
      },
    })

    return {
      success: true,
      preset: {
        id: preset.id,
        name: preset.name,
        formation: preset.formation,
        players: preset.players as FormationPlayer[],
        teamId: preset.teamId || undefined,
        isPublic: preset.isPublic,
        createdAt: preset.createdAt,
        createdBy: preset.createdBy,
      },
    }
  } catch (error) {
    console.error('Save formation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save formation',
    }
  }
}

/**
 * Get formation presets
 */
export async function getFormationPresets(
  teamId?: string,
  userId?: string,
  includePublic: boolean = false
): Promise<FormationPreset[]> {
  const where: any = {}

  if (teamId) {
    where.teamId = teamId
  } else if (userId && !includePublic) {
    where.createdBy = userId
  }

  if (includePublic) {
    where.OR = [
      { isPublic: true },
      where,
    ]
  }

  const presets = await prisma.formationPreset.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return presets.map((p) => ({
    id: p.id,
    name: p.name,
    formation: p.formation,
    players: p.players as FormationPlayer[],
    teamId: p.teamId || undefined,
    isPublic: p.isPublic,
    createdAt: p.createdAt,
    createdBy: p.createdBy,
  }))
}

/**
 * Delete formation preset
 */
export async function deleteFormationPreset(
  presetId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const preset = await prisma.formationPreset.findUnique({
      where: { id: presetId },
    })

    if (!preset) {
      return { success: false, error: 'Preset not found' }
    }

    if (preset.createdBy !== userId) {
      return {
        success: false,
        error: 'Only the creator can delete this preset',
      }
    }

    await prisma.formationPreset.delete({
      where: { id: presetId },
    })

    return { success: true }
  } catch (error) {
    console.error('Delete formation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete formation',
    }
  }
}

/**
 * Get popular public formations
 */
export async function getPopularFormations(limit: number = 10): Promise<FormationPreset[]> {
  const presets = await prisma.formationPreset.findMany({
    where: {
      isPublic: true,
      teamId: null, // Only global presets
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  })

  return presets.map((p) => ({
    id: p.id,
    name: p.name,
    formation: p.formation,
    players: p.players as FormationPlayer[],
    teamId: p.teamId || undefined,
    isPublic: p.isPublic,
    createdAt: p.createdAt,
    createdBy: p.createdBy,
  }))
}

/**
 * Apply formation to team (set as active formation)
 */
export async function applyFormationToTeam(
  teamId: string,
  formation: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify user is team captain or creator
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        createdBy: true,
        captains: { select: { id: true } },
      },
    })

    if (!team) {
      return { success: false, error: 'Team not found' }
    }

    const isCaptain = team.captains.some((c) => c.id === userId)
    const isCreator = team.createdBy === userId

    if (!isCaptain && !isCreator) {
      return {
        success: false,
        error: 'Only team captains or creator can change formation',
      }
    }

    await prisma.team.update({
      where: { id: teamId },
      data: { formation },
    })

    return { success: true }
  } catch (error) {
    console.error('Apply formation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply formation',
    }
  }
}

/**
 * Validate formation structure
 */
export function validateFormation(formation: string): boolean {
  // Common formations: 4-4-2, 4-3-3, 3-5-2, 4-2-3-1, etc.
  const formationRegex = /^\d(-?\d)+$/
  if (!formationRegex.test(formation)) {
    return false
  }

  // Sum of outfield players should be 10 (excluding goalkeeper)
  const parts = formation.split('-').map((p) => parseInt(p, 10))
  const totalOutfield = parts.reduce((sum, p) => sum + p, 0)

  return totalOutfield === 10
}

/**
 * Get formation suggestions based on opponent
 */
export async function getFormationSuggestions(
  opponentFormation: string,
  teamStrength: 'weaker' | 'equal' | 'stronger' = 'equal'
): Promise<string[]> {
  const suggestions: string[] = []

  // Basic tactical suggestions
  if (opponentFormation === '4-4-2') {
    suggestions.push('4-4-2', '4-3-3', '3-5-2')
  } else if (opponentFormation === '4-3-3') {
    suggestions.push('4-3-3', '3-4-3', '4-5-1')
  } else if (opponentFormation === '3-5-2') {
    suggestions.push('3-5-2', '4-5-1', '3-4-3')
  }

  // Adjust based on team strength
  if (teamStrength === 'weaker') {
    // More defensive formations
    suggestions.unshift('5-4-1', '4-5-1')
  } else if (teamStrength === 'stronger') {
    // More attacking formations
    suggestions.unshift('3-4-3', '4-3-3')
  }

  // Remove duplicates and limit
  return [...new Set(suggestions)].slice(0, 5)
}

export default {
  saveFormationPreset,
  getFormationPresets,
  deleteFormationPreset,
  getPopularFormations,
  applyFormationToTeam,
  validateFormation,
  getFormationSuggestions,
}

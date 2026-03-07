import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { handleError } from '@/lib/error-handler'
import { withCSRF } from '@/lib/security'
import {
  saveFormationPreset,
  getFormationPresets,
  deleteFormationPreset,
  getPopularFormations,
  applyFormationToTeam,
} from '@/lib/tactics'

const saveFormationSchema = z.object({
  name: z.string().min(1).max(50),
  formation: z.string(),
  players: z.array(z.object({
    playerId: z.string(),
    playerName: z.string(),
    position: z.string(),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    shirtNumber: z.number().min(1).max(99),
    role: z.string().optional(),
    instructions: z.array(z.string()).optional(),
  })),
  isPublic: z.boolean().default(false),
  teamId: z.string().optional(),
})

/**
 * GET /api/tactics/formations
 * Get formation presets
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId') || undefined
    const includePublic = searchParams.get('includePublic') === 'true'
    const popular = searchParams.get('popular') === 'true'

    if (popular) {
      const formations = await getPopularFormations()
      return NextResponse.json({ formations })
    }

    const formations = await getFormationPresets(teamId, session.user.id, includePublic)

    return NextResponse.json({ formations })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * POST /api/tactics/formations
 * Save a formation preset
 */
async function POSTHandler(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = saveFormationSchema.parse(body)

    const result = await saveFormationPreset(
      session.user.id,
      validatedData,
      validatedData.teamId
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      preset: result.preset,
    }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/tactics/formations/[id]
 * Delete a formation preset
 */
async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: presetId } = await params

    const result = await deleteFormationPreset(presetId, session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Formation deleted successfully',
    })
  } catch (error) {
    return handleError(error)
  }
}

// Wrap state-changing methods with CSRF protection
export const POST = withCSRF(POSTHandler)
export const DELETE = withCSRF(DELETEHandler)

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleError } from '@/lib/error-handler'
import {
  searchPlayers,
  searchTeams,
  searchMatches,
  globalSearch,
  getSearchSuggestions,
} from '@/lib/search'

/**
 * GET /api/search
 * Global search endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!query.trim()) {
      return NextResponse.json({
        players: [],
        teams: [],
        matches: [],
        total: 0,
      })
    }

    switch (type) {
      case 'players': {
        const location = searchParams.get('location') || undefined
        const position = searchParams.get('position') || undefined
        const minRating = searchParams.get('minRating')
          ? parseFloat(searchParams.get('minRating')!)
          : undefined

        const results = await searchPlayers(query, {
          limit,
          offset,
          location,
          position,
          minRating,
        })
        return NextResponse.json(results)
      }

      case 'teams': {
        const location = searchParams.get('location') || undefined
        const minRating = searchParams.get('minRating')
          ? parseFloat(searchParams.get('minRating')!)
          : undefined

        const results = await searchTeams(query, {
          limit,
          offset,
          location,
          minRating,
        })
        return NextResponse.json(results)
      }

      case 'matches': {
        const status = searchParams.get('status') || undefined
        const dateFrom = searchParams.get('dateFrom')
          ? new Date(searchParams.get('dateFrom')!)
          : undefined
        const dateTo = searchParams.get('dateTo')
          ? new Date(searchParams.get('dateTo')!)
          : undefined

        const results = await searchMatches(query, {
          limit,
          offset,
          status,
          dateFrom,
          dateTo,
        })
        return NextResponse.json(results)
      }

      case 'suggestions': {
        const suggestType = searchParams.get('suggestType') as 'players' | 'teams' | 'all' || 'all'
        const suggestLimit = parseInt(searchParams.get('suggestLimit') || '5')

        const suggestions = await getSearchSuggestions(query, suggestType, suggestLimit)
        return NextResponse.json(suggestions)
      }

      case 'all':
      default: {
        const includePlayers = searchParams.get('includePlayers') !== 'false'
        const includeTeams = searchParams.get('includeTeams') !== 'false'
        const includeMatches = searchParams.get('includeMatches') === 'true'

        const results = await globalSearch(query, {
          limit,
          includePlayers,
          includeTeams,
          includeMatches,
        })
        return NextResponse.json(results)
      }
    }
  } catch (error) {
    return handleError(error)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { successResponse, errorResponse, handleDatabaseError } from '@/lib/api-response'
import { rateLimitMiddleware, RateLimitPresets } from '@/lib/rate-limit'
import { InputSanitizer } from '@/lib/sanitizer'
import {
  searchPlayers,
  searchTeams,
  searchMatches,
  globalSearch,
  getSearchSuggestions,
} from '@/lib/search'

/**
 * GET /api/search
 * Global search endpoint with rate limiting and input sanitization
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting (stricter for search - expensive operation)
    const rateLimitResult = await rateLimitMiddleware(request, RateLimitPresets.search);
    if (rateLimitResult.limited && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Sanitize search query
    const sanitizedQuery = InputSanitizer.sanitizeSearchQuery(query)

    // Return empty results for empty query
    if (!sanitizedQuery.trim()) {
      return successResponse({
        players: [],
        teams: [],
        matches: [],
        total: 0,
      })
    }

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return errorResponse('INVALID_PARAMS', 'Invalid limit (must be 1-50)', 400)
    }

    if (isNaN(offset) || offset < 0) {
      return errorResponse('INVALID_PARAMS', 'Invalid offset (must be >= 0)', 400)
    }

    switch (type) {
      case 'players': {
        const location = searchParams.get('location') 
          ? InputSanitizer.sanitizeText(searchParams.get('location')!) 
          : undefined
        const position = searchParams.get('position') 
          ? InputSanitizer.sanitizeText(searchParams.get('position')!) 
          : undefined
        const minRating = searchParams.get('minRating')
          ? parseFloat(searchParams.get('minRating')!)
          : undefined

        const results = await searchPlayers(sanitizedQuery, {
          limit,
          offset,
          location,
          position,
          minRating,
        })
        return successResponse(results)
      }

      case 'teams': {
        const location = searchParams.get('location') 
          ? InputSanitizer.sanitizeText(searchParams.get('location')!) 
          : undefined
        const minRating = searchParams.get('minRating')
          ? parseFloat(searchParams.get('minRating')!)
          : undefined

        const results = await searchTeams(sanitizedQuery, {
          limit,
          offset,
          location,
          minRating,
        })
        return successResponse(results)
      }

      case 'matches': {
        const status = searchParams.get('status') 
          ? InputSanitizer.sanitizeText(searchParams.get('status')!) 
          : undefined
        const dateFrom = searchParams.get('dateFrom')
          ? new Date(searchParams.get('dateFrom')!)
          : undefined
        const dateTo = searchParams.get('dateTo')
          ? new Date(searchParams.get('dateTo')!)
          : undefined

        const results = await searchMatches(sanitizedQuery, {
          limit,
          offset,
          status,
          dateFrom,
          dateTo,
        })
        return successResponse(results)
      }

      case 'suggestions': {
        const suggestType = searchParams.get('suggestType') as 'players' | 'teams' | 'all' || 'all'
        const suggestLimit = parseInt(searchParams.get('suggestLimit') || '5')

        // Validate suggest limit
        if (isNaN(suggestLimit) || suggestLimit < 1 || suggestLimit > 10) {
          return errorResponse('INVALID_PARAMS', 'Invalid suggestLimit (must be 1-10)', 400)
        }

        const suggestions = await getSearchSuggestions(sanitizedQuery, suggestType, suggestLimit)
        return successResponse(suggestions)
      }

      case 'all':
      default: {
        const includePlayers = searchParams.get('includePlayers') !== 'false'
        const includeTeams = searchParams.get('includeTeams') !== 'false'
        const includeMatches = searchParams.get('includeMatches') === 'true'

        const results = await globalSearch(sanitizedQuery, {
          limit,
          includePlayers,
          includeTeams,
          includeMatches,
        })
        return successResponse(results)
      }
    }
  } catch (error) {
    console.error('GET /api/search error:', error)
    return handleDatabaseError(error)
  }
}

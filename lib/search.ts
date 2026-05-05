/**
 * Full-Text Search Implementation
 * 
 * PostgreSQL full-text search for players, teams, and matches
 */

import { prisma } from './db'

/**
 * Search players with full-text search
 */
export async function searchPlayers(
  query: string,
  options?: {
    limit?: number
    offset?: number
    location?: string
    position?: string
    minRating?: number
  }
) {
  const {
    limit = 20,
    offset = 0,
    location,
    position,
    minRating,
  } = options || {}

  // Build search query with PostgreSQL full-text search
  const searchQuery = query
    .split(' ')
    .filter((w) => w.trim().length > 0)
    .map((w) => `${w}:*`)
    .join(' & ')

  const whereClauses: string[] = []
  const params: any[] = []

  // Full-text search on name and firstName
  if (searchQuery) {
    whereClauses.push(`
      (
        to_tsvector('english', COALESCE("name", '') || ' ' || COALESCE("firstName", '')) 
        @@ to_tsquery('english', $${params.length + 1})
      )
    `)
    params.push(searchQuery)
  }

  // Location filter
  if (location) {
    whereClauses.push(`"location" ILIKE $${params.length + 1}`)
    params.push(`%${location}%`)
  }

  // Position filter
  if (position) {
    whereClauses.push(`"position" ILIKE $${params.length + 1}`)
    params.push(`%${position}%`)
  }

  // Rating filter
  if (minRating) {
    whereClauses.push(`"rating" >= $${params.length + 1}`)
    params.push(minRating)
  }

  // Only active players
  whereClauses.push(`"isActive" = true`)

  const whereClause = whereClauses.length > 0 
    ? `WHERE ${whereClauses.join(' AND ')}` 
    : ''

  // Execute raw SQL query for full-text search
  const players = await prisma.$queryRaw`
    SELECT 
      id,
      name,
      "firstName",
      position,
      "preferredPositions",
      image,
      bio,
      rating,
      matches,
      goals,
      assists,
      location,
      "createdAt",
      ts_rank(
        to_tsvector('english', COALESCE("name", '') || ' ' || COALESCE("firstName", '')),
        to_tsquery('english', ${searchQuery})
      ) as rank
    FROM users
    ${prisma.sql.raw(whereClause)}
    ORDER BY rank DESC, rating DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  // Get total count
  const countResult = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM users
    ${prisma.sql.raw(whereClause)}
  `

  return {
    players,
    total: parseInt((countResult as any)[0]?.count || '0'),
    limit,
    offset,
  }
}

/**
 * Search teams with full-text search
 */
export async function searchTeams(
  query: string,
  options?: {
    limit?: number
    offset?: number
    location?: string
    minRating?: number
    sport?: string
  }
) {
  const {
    limit = 20,
    offset = 0,
    location,
    minRating,
    sport,
  } = options || {}

  const searchQuery = query
    .split(' ')
    .filter((w) => w.trim().length > 0)
    .map((w) => `${w}:*`)
    .join(' & ')

  const whereClauses: string[] = []
  const params: any[] = []

  // Full-text search on name and bio
  if (searchQuery) {
    whereClauses.push(`
      (
        to_tsvector('english', COALESCE("name", '') || ' ' || COALESCE("bio", '')) 
        @@ to_tsquery('english', $${params.length + 1})
      )
    `)
    params.push(searchQuery)
  }

  // Location filter
  if (location) {
    whereClauses.push(`"location" ILIKE $${params.length + 1}`)
    params.push(`%${location}%`)
  }

  // Rating filter
  if (minRating) {
    whereClauses.push(`"rating" >= $${params.length + 1}`)
    params.push(minRating)
  }

  const whereClause = whereClauses.length > 0 
    ? `WHERE ${whereClauses.join(' AND ')}` 
    : ''

  const teams = await prisma.$queryRaw`
    SELECT 
      id,
      name,
      logo,
      bio,
      formation,
      location,
      rating,
      wins,
      losses,
      draws,
      "createdAt",
      ts_rank(
        to_tsvector('english', COALESCE("name", '') || ' ' || COALESCE("bio", '')),
        to_tsquery('english', ${searchQuery})
      ) as rank
    FROM teams
    ${prisma.sql.raw(whereClause)}
    ORDER BY rank DESC, rating DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  // Get total count
  const countResult = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM teams
    ${prisma.sql.raw(whereClause)}
  `

  return {
    teams,
    total: parseInt((countResult as any)[0]?.count || '0'),
    limit,
    offset,
  }
}

/**
 * Search matches by location or team names
 */
export async function searchMatches(
  query: string,
  options?: {
    limit?: number
    offset?: number
    status?: string
    dateFrom?: Date
    dateTo?: Date
  }
) {
  const {
    limit = 20,
    offset = 0,
    status,
    dateFrom,
    dateTo,
  } = options || {}

  const searchQuery = query
    .split(' ')
    .filter((w) => w.trim().length > 0)
    .map((w) => `${w}:*`)
    .join(' & ')

  const whereClauses: string[] = []
  const params: any[] = []

  // Full-text search on location
  if (searchQuery) {
    whereClauses.push(`
      (
        to_tsvector('english', COALESCE("location", '')) 
        @@ to_tsquery('english', $${params.length + 1})
      )
    `)
    params.push(searchQuery)
  }

  // Status filter
  if (status) {
    whereClauses.push(`"status" = $${params.length + 1}`)
    params.push(status)
  }

  // Date range filter
  if (dateFrom) {
    whereClauses.push(`"date" >= $${params.length + 1}`)
    params.push(dateFrom)
  }
  if (dateTo) {
    whereClauses.push(`"date" <= $${params.length + 1}`)
    params.push(dateTo)
  }

  const whereClause = whereClauses.length > 0 
    ? `WHERE ${whereClauses.join(' AND ')}` 
    : ''

  const matches = await prisma.$queryRaw`
    SELECT 
      m.id,
      m."homeTeamId",
      m."awayTeamId",
      m.date,
      m.location,
      m.status,
      m."homeScore",
      m."awayScore",
      m.sport,
      ht.name as "homeTeamName",
      at.name as "awayTeamName",
      ts_rank(
        to_tsvector('english', COALESCE(m."location", '')),
        to_tsquery('english', ${searchQuery})
      ) as rank
    FROM matches m
    LEFT JOIN teams ht ON m."homeTeamId" = ht.id
    LEFT JOIN teams at ON m."awayTeamId" = at.id
    ${prisma.sql.raw(whereClause)}
    ORDER BY rank DESC, m.date ASC
    LIMIT ${limit} OFFSET ${offset}
  `

  // Get total count
  const countResult = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM matches m
    ${prisma.sql.raw(whereClause)}
  `

  return {
    matches,
    total: parseInt((countResult as any)[0]?.count || '0'),
    limit,
    offset,
  }
}

/**
 * Generic search across all entities
 */
export async function globalSearch(
  query: string,
  options?: {
    limit?: number
    includePlayers?: boolean
    includeTeams?: boolean
    includeMatches?: boolean
  }
) {
  const {
    limit = 10,
    includePlayers = true,
    includeTeams = true,
    includeMatches = false,
  } = options || {}

  const results: {
    players?: any[]
    teams?: any[]
    matches?: any[]
  } = {}

  if (includePlayers) {
    const playerResults = await searchPlayers(query, { limit })
    results.players = playerResults.players
  }

  if (includeTeams) {
    const teamResults = await searchTeams(query, { limit })
    results.teams = teamResults.teams
  }

  if (includeMatches) {
    const matchResults = await searchMatches(query, { limit })
    results.matches = matchResults.matches
  }

  return results
}

/**
 * Create search index (run during migration)
 */
export async function createSearchIndexes(): Promise<void> {
  try {
    // Create full-text search index for users
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_users_search 
      ON users 
      USING gin(to_tsvector('english', COALESCE("name", '') || ' ' || COALESCE("firstName", '')))
    `

    // Create full-text search index for teams
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_teams_search 
      ON teams 
      USING gin(to_tsvector('english', COALESCE("name", '') || ' ' || COALESCE("bio", '')))
    `

    // Create full-text search index for matches
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_matches_search 
      ON matches 
      USING gin(to_tsvector('english', COALESCE("location", '')))
    `

    console.log('Search indexes created successfully')
  } catch (error) {
    console.error('Failed to create search indexes:', error)
    throw error
  }
}

/**
 * Get search suggestions (autocomplete)
 */
export async function getSearchSuggestions(
  query: string,
  type: 'players' | 'teams' | 'all' = 'all',
  limit: number = 5
) {
  const suggestions: { players?: any[]; teams?: any[] } = {}

  const searchQuery = query.toLowerCase()

  if (type === 'players' || type === 'all') {
    suggestions.players = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { firstName: { contains: searchQuery, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        position: true,
        image: true,
      },
      take: limit,
    })
  }

  if (type === 'teams' || type === 'all') {
    suggestions.teams = await prisma.team.findMany({
      where: {
        name: { contains: searchQuery, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        logo: true,
        location: true,
      },
      take: limit,
    })
  }

  return suggestions
}

export default {
  searchPlayers,
  searchTeams,
  searchMatches,
  globalSearch,
  createSearchIndexes,
  getSearchSuggestions,
}

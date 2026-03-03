/**
 * Redis Caching Layer
 * 
 * Provides caching for frequently accessed data to improve performance
 */

import { createClient, RedisClientType } from 'redis'

type RedisClient = RedisClientType<any, any, any>

let redisClient: RedisClient | null = null
let isConnected = false

/**
 * Get or create Redis client
 */
function getClient(): RedisClient | null {
  if (redisClient) {
    return redisClient
  }

  const redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    console.warn('REDIS_URL not configured. Caching disabled.')
    return null
  }

  redisClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis max retries reached')
          return new Error('Redis max retries reached')
        }
        return Math.min(retries * 100, 3000)
      },
    },
  })

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err)
    isConnected = false
  })

  redisClient.on('connect', () => {
    console.log('Redis connected')
    isConnected = true
  })

  redisClient.on('disconnect', () => {
    console.log('Redis disconnected')
    isConnected = false
  })

  redisClient.connect().catch(console.error)

  return redisClient
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return isConnected && redisClient !== null
}

/**
 * Get value from cache
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  const client = getClient()
  if (!client || !isConnected) {
    return null
  }

  try {
    const value = await client.get(key)
    if (!value) {
      return null
    }
    return JSON.parse(value) as T
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

/**
 * Set value in cache with optional TTL
 */
export async function setInCache<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<boolean> {
  const client = getClient()
  if (!client || !isConnected) {
    return false
  }

  try {
    const stringValue = JSON.stringify(value)
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, stringValue)
    } else {
      await client.set(key, stringValue)
    }
    return true
  } catch (error) {
    console.error('Cache set error:', error)
    return false
  }
}

/**
 * Delete value from cache
 */
export async function deleteFromCache(key: string): Promise<boolean> {
  const client = getClient()
  if (!client || !isConnected) {
    return false
  }

  try {
    await client.del(key)
    return true
  } catch (error) {
    console.error('Cache delete error:', error)
    return false
  }
}

/**
 * Delete multiple keys by pattern
 */
export async function deleteKeysByPattern(pattern: string): Promise<number> {
  const client = getClient()
  if (!client || !isConnected) {
    return 0
  }

  try {
    const keys = await client.keys(pattern)
    if (keys.length === 0) {
      return 0
    }
    return await client.del(keys)
  } catch (error) {
    console.error('Cache delete pattern error:', error)
    return 0
  }
}

/**
 * Cache wrapper for async functions
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // Try to get from cache first
  const cached = await getFromCache<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch and cache
  const value = await fetcher()
  await setInCache(key, value, ttlSeconds)
  return value
}

/**
 * Cache keys helpers
 */
export const CacheKeys = {
  // Player cache keys
  player: (playerId: string) => `player:${playerId}`,
  playerStats: (playerId: string) => `player:${playerId}:stats`,
  playerRating: (playerId: string) => `player:${playerId}:rating`,
  playerMatches: (playerId: string) => `player:${playerId}:matches`,
  
  // Team cache keys
  team: (teamId: string) => `team:${teamId}`,
  teamMembers: (teamId: string) => `team:${teamId}:members`,
  teamStats: (teamId: string) => `team:${teamId}:stats`,
  teamMatches: (teamId: string) => `team:${teamId}:matches`,
  
  // Match cache keys
  match: (matchId: string) => `match:${matchId}`,
  matchEvents: (matchId: string) => `match:${matchId}:events`,
  matchStats: (matchId: string) => `match:${matchId}:stats`,
  matchLineups: (matchId: string) => `match:${matchId}:lineups`,
  
  // Tournament cache keys
  tournament: (tournamentId: string) => `tournament:${tournamentId}`,
  tournamentBracket: (tournamentId: string) => `tournament:${tournamentId}:bracket`,
  tournamentStandings: (tournamentId: string) => `tournament:${tournamentId}:standings`,
  
  // League cache keys
  league: (leagueId: string) => `league:${leagueId}`,
  leagueStandings: (leagueId: string) => `league:${leagueId}:standings`,
  leagueTeams: (leagueId: string) => `league:${leagueId}:teams`,
  
  // Search cache keys
  searchPlayers: (query: string) => `search:players:${query}`,
  searchTeams: (query: string) => `search:teams:${query}`,
  searchMatches: (query: string) => `search:matches:${query}`,
  
  // Analytics cache keys
  analyticsOverview: () => 'analytics:overview',
  analyticsSecurity: () => 'analytics:security',
  
  // User cache keys
  user: (userId: string) => `user:${userId}`,
  userNotifications: (userId: string) => `user:${userId}:notifications`,
  userFriends: (userId: string) => `user:${userId}:friends`,
}

/**
 * Invalidate related caches when data changes
 */
export async function invalidatePlayerCaches(playerId: string): Promise<void> {
  const patterns = [
    CacheKeys.player(playerId),
    CacheKeys.playerStats(playerId),
    CacheKeys.playerRating(playerId),
    CacheKeys.playerMatches(playerId),
  ]
  
  for (const key of patterns) {
    await deleteFromCache(key)
  }
}

/**
 * Invalidate team related caches
 */
export async function invalidateTeamCaches(teamId: string): Promise<void> {
  const patterns = [
    CacheKeys.team(teamId),
    CacheKeys.teamMembers(teamId),
    CacheKeys.teamStats(teamId),
    CacheKeys.teamMatches(teamId),
  ]
  
  for (const key of patterns) {
    await deleteFromCache(key)
  }
}

/**
 * Invalidate match related caches
 */
export async function invalidateMatchCaches(matchId: string): Promise<void> {
  const patterns = [
    CacheKeys.match(matchId),
    CacheKeys.matchEvents(matchId),
    CacheKeys.matchStats(matchId),
  ]
  
  for (const key of patterns) {
    await deleteFromCache(key)
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  connected: boolean
  keysCount?: number
  memoryUsage?: number
} | null> {
  const client = getClient()
  if (!client || !isConnected) {
    return null
  }

  try {
    const dbSize = await client.dbSize()
    const info = await client.info('memory')
    
    // Parse memory usage from info string
    const memoryMatch = info.match(/used_memory:(\d+)/)
    const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0

    return {
      connected: true,
      keysCount: dbSize,
      memoryUsage,
    }
  } catch (error) {
    console.error('Cache stats error:', error)
    return null
  }
}

/**
 * Clear all cache (use with caution)
 */
export async function clearAllCache(): Promise<boolean> {
  const client = getClient()
  if (!client || !isConnected) {
    return false
  }

  try {
    await client.flushDb()
    return true
  } catch (error) {
    console.error('Clear cache error:', error)
    return false
  }
}

export default {
  getFromCache,
  setInCache,
  deleteFromCache,
  deleteKeysByPattern,
  withCache,
  isRedisConnected,
  invalidatePlayerCaches,
  invalidateTeamCaches,
  invalidateMatchCaches,
  getCacheStats,
  clearAllCache,
  CacheKeys,
}

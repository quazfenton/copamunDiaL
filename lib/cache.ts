/**
 * Enhanced Cache Service with Redis
 * 
 * Production-ready caching with:
 * - Redis-backed distributed caching
 * - Multiple cache strategies
 * - Automatic cache invalidation
 * - Cache warming
 * - Statistics and monitoring
 */

import { createClient } from 'redis';

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  keys: number;
}

export class CacheService {
  private redis: ReturnType<typeof createClient>;
  private defaultTTL = 3600; // 1 hour
  private stats: Map<string, { hits: number; misses: number }> = new Map();
  private connected = false;

  constructor() {
    this.redis = createClient({ 
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    
    this.redis.on('error', (err) => {
      console.error('Redis cache error:', err);
      this.connected = false;
    });

    this.redis.on('connect', () => {
      console.log('Redis cache connected');
      this.connected = true;
    });

    this.redis.connect().catch(console.error);
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.connected) return null;

    try {
      const data = await this.redis.get(key);
      
      if (!data) {
        this.recordMiss(key);
        return null;
      }

      this.recordHit(key);
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    ttl: number = this.defaultTTL
  ): Promise<void> {
    if (!this.connected) return;

    try {
      await this.redis.set(key, JSON.stringify(value), { EX: ttl });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.connected) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.connected) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
    }
  }

  /**
   * Cache wrapper for async functions with automatic caching
   */
  async cacheable<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached) {
      return cached;
    }

    // Fetch fresh data
    const fresh = await fetcher();
    
    // Cache the result
    await this.set(key, fresh, ttl);
    
    return fresh;
  }

  /**
   * Get or set with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const fresh = await factory();
    await this.set(key, fresh, ttl);
    return fresh;
  }

  /**
   * Increment counter
   */
  async increment(key: string, by: number = 1): Promise<number> {
    if (!this.connected) return 0;

    try {
      return await this.redis.incrBy(key, by);
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Decrement counter
   */
  async decrement(key: string, by: number = 1): Promise<number> {
    if (!this.connected) return 0;

    try {
      return await this.redis.decrBy(key, by);
    } catch (error) {
      console.error('Cache decrement error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    if (!this.connected) {
      return { hits: 0, misses: 0, size: 0, keys: 0 };
    }

    try {
      const keys = await this.redis.keys('player:*');
      const totalKeys = await this.redis.keys('*');
      
      let totalHits = 0;
      let totalMisses = 0;
      
      this.stats.forEach((stat) => {
        totalHits += stat.hits;
        totalMisses += stat.misses;
      });

      return {
        hits: totalHits,
        misses: totalMisses,
        size: keys.length,
        keys: totalKeys.length,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { hits: 0, misses: 0, size: 0, keys: 0 };
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmup(keys: Array<{ key: string; fetcher: () => Promise<any>; ttl?: number }>): Promise<void> {
    console.log(`Warming up cache for ${keys.length} keys...`);
    
    await Promise.all(
      keys.map(async ({ key, fetcher, ttl }) => {
        try {
          const data = await fetcher();
          await this.set(key, data, ttl);
          console.log(`✓ Cached: ${key}`);
        } catch (error) {
          console.error(`Failed to warm cache for ${key}:`, error);
        }
      })
    );
  }

  /**
   * Record cache hit
   */
  private recordHit(key: string): void {
    const prefix = key.split(':')[0];
    const stat = this.stats.get(prefix) || { hits: 0, misses: 0 };
    stat.hits++;
    this.stats.set(prefix, stat);
  }

  /**
   * Record cache miss
   */
  private recordMiss(key: string): void {
    const prefix = key.split(':')[0];
    const stat = this.stats.get(prefix) || { hits: 0, misses: 0 };
    stat.misses++;
    this.stats.set(prefix, stat);
  }

  // ==================== Specific Cache Methods ====================

  /**
   * Get player stats with caching
   */
  async getPlayerStats(playerId: string) {
    return this.cacheable(
      `player:stats:${playerId}`,
      async () => {
        const { prisma } = await import('./db');
        return prisma.user.findUnique({
          where: { id: playerId },
          include: {
            matchParticipants: {
              take: 20,
              include: { match: true },
            },
            achievements: true,
            teams: { include: { team: true } },
          },
        });
      },
      300 // 5 minutes for frequently accessed data
    );
  }

  /**
   * Get team stats with caching
   */
  async getTeamStats(teamId: string) {
    return this.cacheable(
      `team:stats:${teamId}`,
      async () => {
        const { prisma } = await import('./db');
        return prisma.team.findUnique({
          where: { id: teamId },
          include: {
            members: { include: { user: true } },
            homeMatches: {
              take: 10,
              where: { status: 'COMPLETED' },
              include: { awayTeam: true },
            },
            awayMatches: {
              take: 10,
              where: { status: 'COMPLETED' },
              include: { homeTeam: true },
            },
            captains: true,
            creator: true,
          },
        });
      },
      600 // 10 minutes
    );
  }

  /**
   * Get match details with caching
   */
  async getMatchDetails(matchId: string) {
    return this.cacheable(
      `match:details:${matchId}`,
      async () => {
        const { prisma } = await import('./db');
        return prisma.match.findUnique({
          where: { id: matchId },
          include: {
            homeTeam: { select: { id: true, name: true, logo: true, rating: true } },
            awayTeam: { select: { id: true, name: true, logo: true, rating: true } },
            participants: { include: { user: true } },
            events: { include: { match: { select: { date: true } } } },
          },
        });
      },
      60 // 1 minute for live matches
    );
  }

  /**
   * Get league standings with caching
   */
  async getLeagueStandings(leagueId: string) {
    return this.cacheable(
      `league:standings:${leagueId}`,
      async () => {
        const { prisma } = await import('./db');
        return prisma.leagueTeam.findMany({
          where: { leagueId },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                logo: true,
                rating: true,
              },
            },
          },
          orderBy: [
            { points: 'desc' },
            { goalsFor: 'desc' },
          ],
        });
      },
      300 // 5 minutes
    );
  }

  /**
   * Get tournament bracket with caching
   */
  async getTournamentBracket(tournamentId: string) {
    return this.cacheable(
      `tournament:bracket:${tournamentId}`,
      async () => {
        const { prisma } = await import('./db');
        const bracket = await prisma.tournamentBracket.findFirst({
          where: { tournamentId },
          include: {
            matches: {
              orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
            },
          },
        });

        if (!bracket) return null;

        // Fetch team names for all matches
        const teamIds = [...new Set(
          bracket.matches.flatMap(m => [m.homeTeamId, m.awayTeamId].filter((id): id is string => id !== null))
        )];
        const teams = teamIds.length > 0 ? await prisma.team.findMany({
          where: { id: { in: teamIds } },
          select: { id: true, name: true },
        }) : [];
        const teamNameMap = new Map(teams.map(t => [t.id, t.name]));

        return {
          ...bracket,
          matches: bracket.matches.map(m => ({
            ...m,
            homeTeamName: m.homeTeamId ? teamNameMap.get(m.homeTeamId) : undefined,
            awayTeamName: m.awayTeamId ? teamNameMap.get(m.awayTeamId) : undefined,
          })),
        };
      },
      120 // 2 minutes
    );
  }

  /**
   * Invalidate team-related cache
   */
  async invalidateTeam(teamId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`team:stats:${teamId}`),
      this.invalidatePattern(`team:members:${teamId}`),
    ]);
  }

  /**
   * Invalidate player-related cache
   */
  async invalidatePlayer(playerId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`player:stats:${playerId}`),
      this.invalidatePattern(`player:matches:${playerId}`),
    ]);
  }

  /**
   * Invalidate match-related cache
   */
  async invalidateMatch(matchId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`match:details:${matchId}`),
      this.invalidatePattern(`match:events:${matchId}`),
    ]);
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAll(): Promise<void> {
    if (!this.connected) return;

    try {
      const keys = await this.redis.keys('*');
      if (keys.length > 0) {
        await this.redis.del(keys);
        console.log('Cache cleared');
      }
    } catch (error) {
      console.error('Cache clear all error:', error);
    }
  }

  /**
   * Check if cache is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Shutdown cache service
   */
  async shutdown(): Promise<void> {
    try {
      await this.redis.quit();
      console.log('Cache service shut down');
    } catch (error) {
      console.error('Cache shutdown error:', error);
    }
  }
}

// Singleton instance
export const cache = new CacheService();

export default cache;

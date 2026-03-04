/**
 * Unit Tests for Cache Service
 * 
 * Tests for lib/cache.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService } from '@/lib/cache';

// Mock Redis
vi.mock('redis', () => {
  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    incrBy: vi.fn().mockResolvedValue(1),
    decrBy: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
  };

  return {
    createClient: vi.fn(() => mockClient),
  };
});

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService();
  });

  describe('get', () => {
    it('should return null when cache is not connected', async () => {
      const result = await cache.get('test-key');
      expect(result).toBeNull();
    });

    it('should return cached value when available', async () => {
      // Mock connected state
      (cache as any).connected = true;
      
      const mockData = { id: 1, name: 'Test' };
      vi.spyOn((cache as any).redis, 'get').mockResolvedValue(JSON.stringify(mockData));

      const result = await cache.get<typeof mockData>('test-key');
      
      expect(result).toEqual(mockData);
    });

    it('should return null for missing keys', async () => {
      (cache as any).connected = true;
      vi.spyOn((cache as any).redis, 'get').mockResolvedValue(null);

      const result = await cache.get('missing-key');
      
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should skip when cache is not connected', async () => {
      await cache.set('test-key', { data: 'value' });
      expect((cache as any).redis.set).not.toHaveBeenCalled();
    });

    it('should set value with default TTL', async () => {
      (cache as any).connected = true;
      const mockData = { id: 1, name: 'Test' };

      await cache.set('test-key', mockData);

      expect((cache as any).redis.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(mockData),
        { EX: 3600 } // Default TTL
      );
    });

    it('should set value with custom TTL', async () => {
      (cache as any).connected = true;

      await cache.set('test-key', 'value', 1800);

      expect((cache as any).redis.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify('value'),
        { EX: 1800 }
      );
    });
  });

  describe('delete', () => {
    it('should skip when cache is not connected', async () => {
      await cache.delete('test-key');
      expect((cache as any).redis.del).not.toHaveBeenCalled();
    });

    it('should delete key when connected', async () => {
      (cache as any).connected = true;

      await cache.delete('test-key');

      expect((cache as any).redis.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('invalidatePattern', () => {
    it('should skip when cache is not connected', async () => {
      await cache.invalidatePattern('test:*');
      expect((cache as any).redis.keys).not.toHaveBeenCalled();
    });

    it('should delete all keys matching pattern', async () => {
      (cache as any).connected = true;
      vi.spyOn((cache as any).redis, 'keys').mockResolvedValue(['test:1', 'test:2', 'test:3']);

      await cache.invalidatePattern('test:*');

      expect((cache as any).redis.keys).toHaveBeenCalledWith('test:*');
      expect((cache as any).redis.del).toHaveBeenCalledWith(['test:1', 'test:2', 'test:3']);
    });
  });

  describe('cacheable', () => {
    it('should return cached value when available', async () => {
      (cache as any).connected = true;
      const cachedData = { id: 1, cached: true };
      vi.spyOn((cache as any).redis, 'get').mockResolvedValue(JSON.stringify(cachedData));

      const fetcher = vi.fn().mockResolvedValue({ id: 1, cached: false });
      const result = await cache.cacheable('test-key', fetcher);

      expect(result).toEqual(cachedData);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should call fetcher when cache miss', async () => {
      (cache as any).connected = true;
      const freshData = { id: 1, fresh: true };
      vi.spyOn((cache as any).redis, 'get').mockResolvedValue(null);

      const fetcher = vi.fn().mockResolvedValue(freshData);
      const result = await cache.cacheable('test-key', fetcher);

      expect(result).toEqual(freshData);
      expect(fetcher).toHaveBeenCalled();
      expect((cache as any).redis.set).toHaveBeenCalled();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value when available', async () => {
      (cache as any).connected = true;
      const cachedData = { id: 1, cached: true };
      vi.spyOn((cache as any).redis, 'get').mockResolvedValue(JSON.stringify(cachedData));

      const factory = vi.fn().mockResolvedValue({ id: 1, fresh: true });
      const result = await cache.getOrSet('test-key', factory);

      expect(result).toEqual(cachedData);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result when cache miss', async () => {
      (cache as any).connected = true;
      const freshData = { id: 1, fresh: true };
      vi.spyOn((cache as any).redis, 'get').mockResolvedValue(null);

      const factory = vi.fn().mockResolvedValue(freshData);
      const result = await cache.getOrSet('test-key', factory);

      expect(result).toEqual(freshData);
      expect(factory).toHaveBeenCalled();
      expect((cache as any).redis.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(freshData),
        { EX: 3600 }
      );
    });
  });

  describe('increment/decrement', () => {
    it('should increment counter', async () => {
      (cache as any).connected = true;
      vi.spyOn((cache as any).redis, 'incrBy').mockResolvedValue(5);

      const result = await cache.increment('counter', 5);

      expect(result).toBe(5);
      expect((cache as any).redis.incrBy).toHaveBeenCalledWith('counter', 5);
    });

    it('should decrement counter', async () => {
      (cache as any).connected = true;
      vi.spyOn((cache as any).redis, 'decrBy').mockResolvedValue(3);

      const result = await cache.decrement('counter', 3);

      expect(result).toBe(3);
      expect((cache as any).redis.decrBy).toHaveBeenCalledWith('counter', 3);
    });

    it('should return 0 when not connected', async () => {
      const result = await cache.increment('counter');
      expect(result).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return zero stats when not connected', async () => {
      const stats = await cache.getStats();

      expect(stats).toEqual({
        hits: 0,
        misses: 0,
        size: 0,
        keys: 0,
      });
    });

    it('should return cache statistics when connected', async () => {
      (cache as any).connected = true;
      vi.spyOn((cache as any).redis, 'keys').mockResolvedValue(['player:1', 'player:2']);

      const stats = await cache.getStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats.size).toBe(2);
      expect(stats.keys).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isConnected', () => {
    it('should return connection status', () => {
      expect(cache.isConnected()).toBe(false);

      (cache as any).connected = true;
      expect(cache.isConnected()).toBe(true);
    });
  });

  describe('entity-specific methods', () => {
    beforeEach(() => {
      (cache as any).connected = true;
    });

    it('should cache player stats with correct TTL', async () => {
      const mockPlayer = { id: '1', name: 'John', rating: 75 };
      vi.spyOn((cache as any).redis, 'get').mockResolvedValue(null);
      
      // Mock Prisma
      vi.mock('@/lib/db', () => ({
        prisma: {
          user: {
            findUnique: vi.fn().mockResolvedValue(mockPlayer),
          },
        },
      }));

      const result = await cache.getPlayerStats('player-1');

      // Should cache with 300s TTL (5 minutes)
      expect((cache as any).redis.set).toHaveBeenCalledWith(
        'player:stats:player-1',
        expect.any(String),
        { EX: 300 }
      );
    });

    it('should cache team stats with correct TTL', async () => {
      vi.spyOn((cache as any).redis, 'get').mockResolvedValue(null);

      const result = await cache.getTeamStats('team-1');

      // Should cache with 600s TTL (10 minutes)
      expect((cache as any).redis.set).toHaveBeenCalledWith(
        'team:stats:team-1',
        expect.any(String),
        { EX: 600 }
      );
    });

    it('should cache match details with correct TTL', async () => {
      vi.spyOn((cache as any).redis, 'get').mockResolvedValue(null);

      const result = await cache.getMatchDetails('match-1');

      // Should cache with 60s TTL (1 minute for live matches)
      expect((cache as any).redis.set).toHaveBeenCalledWith(
        'match:details:match-1',
        expect.any(String),
        { EX: 60 }
      );
    });
  });

  describe('cache invalidation helpers', () => {
    beforeEach(() => {
      (cache as any).connected = true;
      vi.spyOn((cache as any).redis, 'keys').mockResolvedValue([]);
    });

    it('should invalidate team-related cache', async () => {
      await cache.invalidateTeam('team-1');

      expect((cache as any).redis.keys).toHaveBeenCalledWith('team:stats:team-1');
      expect((cache as any).redis.keys).toHaveBeenCalledWith('team:members:team-1');
    });

    it('should invalidate player-related cache', async () => {
      await cache.invalidatePlayer('player-1');

      expect((cache as any).redis.keys).toHaveBeenCalledWith('player:stats:player-1');
      expect((cache as any).redis.keys).toHaveBeenCalledWith('player:matches:player-1');
    });

    it('should invalidate match-related cache', async () => {
      await cache.invalidateMatch('match-1');

      expect((cache as any).redis.keys).toHaveBeenCalledWith('match:details:match-1');
      expect((cache as any).redis.keys).toHaveBeenCalledWith('match:events:match-1');
    });
  });
});

/**
 * Integration Tests for Teams API
 * 
 * Tests for app/api/teams/route.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  team: {
    findMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  teamMember: {
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

describe('Teams API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/teams', () => {
    it('should return teams list with proper filtering', async () => {
      // Mock authenticated user
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user_123', email: 'test@example.com' },
      } as any);

      // Mock teams data
      const mockTeams = [
        {
          id: 'team_1',
          name: 'FC Barcelona',
          logo: null,
          bio: 'Professional team',
          formation: '4-3-3',
          location: 'Barcelona',
          isPrivate: false,
          wins: 10,
          losses: 2,
          draws: 3,
          rating: 85.5,
          createdBy: 'user_123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.team.findMany.mockResolvedValue(mockTeams);

      // Import after mocks are set up
      const { GET } = await import('@/app/api/teams/route');
      const mockRequest = new Request('http://localhost:3000/api/teams?search=Barcelona&take=10');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('FC Barcelona');
    });

    it('should enforce rate limiting', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user_123' },
      } as any);

      const { GET } = await import('@/app/api/teams/route');
      const mockRequest = new Request('http://localhost:3000/api/teams');

      // Make multiple requests rapidly
      const responses = await Promise.all(
        Array(35).fill(null).map(() => GET(mockRequest))
      );

      // Some should be rate limited (429)
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should reject unauthorized requests', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValue(null);

      const { GET } = await import('@/app/api/teams/route');
      const mockRequest = new Request('http://localhost:3000/api/teams');

      const response = await GET(mockRequest);

      expect(response.status).toBe(401);
    });

    it('should validate pagination parameters', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user_123' },
      } as any);

      const { GET } = await import('@/app/api/teams/route');

      // Invalid take parameter
      const invalidRequest = new Request('http://localhost:3000/api/teams?take=500');
      const response = await GET(invalidRequest);

      expect(response.status).toBe(400);
    });

    it('should sanitize search input', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user_123' },
      } as any);

      const { GET } = await import('@/app/api/teams/route');

      // XSS attempt in search
      const xssRequest = new Request(
        'http://localhost:3000/api/teams?search=<script>alert(1)</script>Team'
      );
      const response = await GET(xssRequest);

      // Should not error, should sanitize input
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/teams', () => {
    it('should create team with valid data', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user_123', email: 'test@example.com' },
      } as any);

      const mockTeam = {
        id: 'team_1',
        name: 'New Team',
        logo: null,
        bio: 'Team bio',
        formation: '4-4-2',
        location: 'New York',
        isPrivate: false,
        wins: 0,
        losses: 0,
        draws: 0,
        rating: 0.0,
        createdBy: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.team.create.mockResolvedValue(mockTeam);

      const { POST } = await import('@/app/api/teams/route');
      const mockRequest = new Request('http://localhost:3000/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Team',
          bio: 'Team bio',
          location: 'New York',
          formation: '4-4-2',
          isPrivate: false,
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New Team');
    });

    it('should reject invalid team data', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user_123' },
      } as any);

      const { POST } = await import('@/app/api/teams/route');

      // Empty name
      const invalidRequest = new Request('http://localhost:3000/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      });

      const response = await POST(invalidRequest);

      expect(response.status).toBe(400);
    });

    it('should sanitize team input', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user_123' },
      } as any);

      const mockTeam = {
        id: 'team_1',
        name: 'Team',
        logo: null,
        bio: 'Bio',
        formation: '4-4-2',
        location: 'Location',
        isPrivate: false,
        wins: 0,
        losses: 0,
        draws: 0,
        rating: 0.0,
        createdBy: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.team.create.mockResolvedValue(mockTeam);

      const { POST } = await import('@/app/api/teams/route');
      const xssRequest = new Request('http://localhost:3000/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '<script>alert(1)</script>Team',
          bio: 'Normal bio',
        }),
      });

      const response = await POST(xssRequest);

      // Should sanitize, not error
      expect(response.status).toBe(201);
    });

    it('should create audit log on team creation', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user_123', email: 'test@example.com' },
      } as any);

      const mockTeam = {
        id: 'team_1',
        name: 'Team',
        logo: null,
        bio: null,
        formation: '4-4-2',
        location: null,
        isPrivate: false,
        wins: 0,
        losses: 0,
        draws: 0,
        rating: 0.0,
        createdBy: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.team.create.mockResolvedValue(mockTeam);

      // Mock audit log
      const mockCreateAuditLog = vi.fn().mockResolvedValue(undefined);
      vi.mock('@/lib/audit-log', () => ({
        createAuditLog: mockCreateAuditLog,
      }));

      const { POST } = await import('@/app/api/teams/route');
      const mockRequest = new Request('http://localhost:3000/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Team' }),
      });

      await POST(mockRequest);

      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        'TEAM_CREATED',
        expect.objectContaining({
          userId: 'user_123',
          resourceId: 'team_1',
        })
      );
    });
  });
});

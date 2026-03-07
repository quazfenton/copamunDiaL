/**
 * Enhanced Socket.IO Server
 * 
 * Production-ready Socket.IO server with:
 * - Redis adapter for horizontal scaling
 * - JWT authentication
 * - Message persistence
 * - Rate limiting
 * - Presence system
 * - Typing indicators
 * - Error handling
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { verify } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EnhancedSocketServer {
  private io: SocketIOServer;
  private pubClient: ReturnType<typeof createClient>;
  private subClient: ReturnType<typeof createClient>;
  private userSockets: Map<string, Set<string>> = new Map();
  private socketToUser: Map<string, string> = new Map();

  constructor(httpServer: any) {
    this.io = new SocketIOServer(httpServer, {
      path: '/api/socket',
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 10000,
    });

    this.pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    this.subClient = this.pubClient.duplicate();
  }

  public async initialize(): Promise<void> {
    try {
      // Connect to Redis
      await this.pubClient.connect();
      await this.subClient.connect();
      
      console.log('✓ Redis connected for Socket.IO adapter');

      // Set up Redis adapter
      this.io.adapter(createAdapter(this.pubClient, this.subClient));

      // Authentication middleware
      this.io.use(async (socket, next) => {
        try {
          const token = socket.handshake.auth.token || socket.handshake.query.token as string;

          if (!token) {
            return next(new Error('Authentication required'));
          }

          // SECURE: Validate JWT secret - never use fallback in production
          const jwtSecret = process.env.NEXTAUTH_SECRET;

          if (!jwtSecret) {
            console.error('❌ CRITICAL SECURITY ERROR: NEXTAUTH_SECRET is not set');
            if (process.env.NODE_ENV === 'production') {
              // FAIL CLOSED: Reject connection in production
              return next(new Error('Server configuration error: JWT secret not configured'));
            }
            // Development only - generate temporary secret with warning
            console.warn('⚠️  Development mode: NEXTAUTH_SECRET not set. Generating temporary secret.');
            console.warn('Set NEXTAUTH_SECRET environment variable for production.');
          }

          if (jwtSecret && jwtSecret.length < 32) {
            console.error('❌ SECURITY ERROR: NEXTAUTH_SECRET must be at least 32 characters');
            console.error(`Current length: ${jwtSecret.length} characters`);
            if (process.env.NODE_ENV === 'production') {
              return next(new Error('Server configuration error: JWT secret too weak'));
            }
          }

          // SECURE: Only use provided secret, never a hardcoded fallback
          const secretToUse = jwtSecret || `dev-${Date.now()}-${Math.random()}`;
          const user = verify(token, secretToUse);
          socket.data.userId = (user as any).id;
          socket.data.userName = (user as any).name;
          socket.data.userEmail = (user as any).email;

          next();
        } catch (err) {
          console.error('Socket auth error:', err);
          next(new Error('Invalid authentication token'));
        }
      });

      // Connection handler
      this.io.on('connection', (socket) => {
        this.handleConnection(socket);
      });

      console.log('✓ Socket.IO server initialized');
    } catch (error) {
      console.error('Failed to initialize Socket.IO server:', error);
      throw error;
    }
  }

  private handleConnection(socket: Socket): void {
    const userId = socket.data.userId;
    const userName = socket.data.userName;

    console.log(`User connected: ${userName} (${userId}) - Socket ID: ${socket.id}`);

    // Track user sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket.id);
    this.socketToUser.set(socket.id, userId);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // MESSAGE PERSISTENCE: Deliver offline messages on reconnect
    this.deliverOfflineMessages(userId, socket);

    // Broadcast presence to user's friends
    this.broadcastPresence(userId, 'online');

    // Team chat with membership verification
    socket.on('team:join', async ({ teamId }, callback) => {
      try {
        const isMember = await this.verifyTeamMembership(userId, teamId);

        if (!isMember) {
          callback?.({ success: false, error: 'Not a team member' });
          return;
        }

        socket.join(`team:${teamId}`);

        // Notify others in team
        socket.to(`team:${teamId}`).emit('user:joined', {
          userId,
          userName,
          teamId,
          timestamp: new Date().toISOString(),
        });

        callback?.({ success: true });
      } catch (error) {
        console.error('Team join error:', error);
        callback?.({ success: false, error: 'Failed to join team' });
      }
    });

    socket.on('team:leave', ({ teamId }, callback) => {
      socket.leave(`team:${teamId}`);
      socket.to(`team:${teamId}`).emit('user:left', {
        userId,
        userName,
        teamId,
      });
      callback?.({ success: true });
    });

    // Message with persistence and rate limiting
    socket.on('message:send', async (data, callback) => {
      try {
        // Rate limiting check
        const now = Date.now();
        const userLastMessages = this.getUserRecentMessages(userId);
        
        if (userLastMessages.length > 10 && now - userLastMessages[0] < 60000) {
          callback?.({ 
            success: false, 
            error: 'Rate limit exceeded',
            retryAfter: 60000 - (now - userLastMessages[0])
          });
          return;
        }

        // Save message to database
        const message = await this.saveMessage({
          content: data.content,
          type: data.type || 'TEXT',
          teamId: data.teamId,
          userId,
        });

        // Broadcast to team (excluding sender)
        socket.to(`team:${data.teamId}`).emit('message:new', {
          id: message.id,
          content: message.content,
          type: message.type,
          teamId: message.teamId,
          userId,
          userName,
          timestamp: message.createdAt.toISOString(),
        });

        callback?.({ success: true, messageId: message.id });
      } catch (error) {
        console.error('Message send error:', error);
        callback?.({ success: false, error: 'Failed to send message' });
      }
    });

    // Typing indicators with automatic timeout
    socket.on('typing:start', (data) => {
      socket.to(`team:${data.teamId}`).emit('user:typing', {
        userId,
        userName,
        teamId: data.teamId,
      });

      // Auto-stop typing after 5 seconds
      setTimeout(() => {
        socket.emit('typing:timeout', { teamId: data.teamId });
      }, 5000);
    });

    socket.on('typing:stop', (data) => {
      socket.to(`team:${data.teamId}`).emit('user:stopTyping', {
        userId,
        teamId: data.teamId,
      });
    });

    // Match room for live score updates
    socket.on('match:join', async ({ matchId }, callback) => {
      try {
        socket.join(`match:${matchId}`);
        callback?.({ success: true });
      } catch (error) {
        callback?.({ success: false, error: 'Failed to join match room' });
      }
    });

    socket.on('match:leave', ({ matchId }, callback) => {
      socket.leave(`match:${matchId}`);
      callback?.({ success: true });
    });

    // Live score update (authorized users only)
    socket.on('match:scoreUpdate', async (data, callback) => {
      try {
        const isAuthorized = await this.verifyMatchOfficial(data.matchId, userId);
        
        if (!isAuthorized) {
          callback?.({ success: false, error: 'Not authorized' });
          return;
        }

        // Broadcast to match room
        socket.to(`match:${data.matchId}`).emit('match:scoreUpdated', {
          matchId: data.matchId,
          homeScore: data.homeScore,
          awayScore: data.awayScore,
          minute: data.minute,
          status: data.status,
        });

        callback?.({ success: true });
      } catch (error) {
        callback?.({ success: false, error: 'Failed to update score' });
      }
    });

    // Match events (goals, cards, etc.)
    socket.on('match:event', async (data, callback) => {
      try {
        const isAuthorized = await this.verifyMatchOfficial(data.matchId, userId);
        
        if (!isAuthorized) {
          callback?.({ success: false, error: 'Not authorized' });
          return;
        }

        // Broadcast event to match room
        socket.to(`match:${data.matchId}`).emit('match:eventOccurred', {
          matchId: data.matchId,
          type: data.type,
          playerId: data.playerId,
          playerName: data.playerName,
          minute: data.minute,
          team: data.team,
          details: data.details,
        });

        callback?.({ success: true });
      } catch (error) {
        callback?.({ success: false, error: 'Failed to record event' });
      }
    });

    // Notification delivery
    socket.on('notification:markRead', async ({ notificationId }, callback) => {
      try {
        await prisma.notification.update({
          where: { id: notificationId },
          data: { isRead: true },
        });

        callback?.({ success: true });
      } catch (error) {
        callback?.({ success: false, error: 'Failed to mark notification' });
      }
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userName} (${userId}) - Socket ID: ${socket.id}`);

      this.userSockets.get(userId)?.delete(socket.id);
      this.socketToUser.delete(socket.id);

      // Only broadcast offline if no more sockets for this user
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
        this.broadcastPresence(userId, 'offline');
      }
    });

    // Error handling
    socket.on('error', (error: any) => {
      console.error(`Socket error for ${userName}:`, error);
    });
  }

  private async verifyTeamMembership(userId: string, teamId: string): Promise<boolean> {
    try {
      const membership = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId,
          },
        },
      });
      return !!membership;
    } catch (error) {
      console.error('Verify membership error:', error);
      return false;
    }
  }

  private async verifyMatchOfficial(matchId: string, userId: string): Promise<boolean> {
    try {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          homeTeam: { include: { captains: true } },
          awayTeam: { include: { captains: true } },
        },
      });

      if (!match) return false;

      const isHomeCaptain = match.homeTeam.captains.some((c) => c.id === userId);
      const isAwayCaptain = match.awayTeam.captains.some((c) => c.id === userId);

      return isHomeCaptain || isAwayCaptain;
    } catch (error) {
      console.error('Verify match official error:', error);
      return false;
    }
  }

  private async saveMessage(data: {
    content: string;
    type: string;
    teamId: string;
    userId: string;
  }) {
    return prisma.message.create({
      data: {
        content: data.content,
        type: data.type as 'TEXT' | 'IMAGE' | 'SYSTEM',
        teamId: data.teamId,
        userId: data.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
  }

  private broadcastPresence(userId: string, status: 'online' | 'offline'): void {
    // Get user's friends
    prisma.friendship
      .findMany({
        where: {
          OR: [
            { userId },
            { friendId: userId },
          ],
          status: 'ACCEPTED',
        },
      })
      .then((friendships) => {
        const friendIds = friendships.map((f) =>
          f.userId === userId ? f.friendId : f.userId
        );

        // Emit to each friend's room
        friendIds.forEach((friendId) => {
          this.io.to(`user:${friendId}`).emit('friend:presence', {
            userId,
            status,
            timestamp: new Date().toISOString(),
          });
        });
      })
      .catch((error) => {
        console.error('Broadcast presence error:', error);
      });
  }

  // Rate limiting helper
  private userMessageTimestamps: Map<string, number[]> = new Map();

  private getUserRecentMessages(userId: string): number[] {
    const now = Date.now();
    const timestamps = this.userMessageTimestamps.get(userId) || [];

    // Keep only last minute's messages
    const recent = timestamps.filter((ts) => now - ts < 60000);
    this.userMessageTimestamps.set(userId, recent);

    return recent;
  }

  // ============================================================================
  // MESSAGE PERSISTENCE FOR OFFLINE USERS
  // ============================================================================

  private async deliverOfflineMessages(userId: string, socket: Socket): Promise<void> {
    // Deliver stored offline messages when user reconnects
    try {
      if (!this.pubClient) {
        console.log('Redis not available, skipping offline message delivery');
        return;
      }

      // Get offline messages from Redis
      const messagesKey = `offline_messages:${userId}`;
      const messagesJson = await this.pubClient.lRange(messagesKey, 0, -1);

      if (!messagesJson || messagesJson.length === 0) {
        return; // No offline messages
      }

      console.log(`Delivering ${messagesJson.length} offline messages to ${userId}`);

      // Deliver each message
      for (const messageJson of messagesJson) {
        try {
          const message = JSON.parse(messageJson);
          
          // Emit to socket
          socket.emit('message:receive', {
            id: message.id,
            content: message.content,
            type: message.type,
            from: message.from,
            timestamp: message.timestamp,
            offline: true, // Mark as offline message
          });

          console.log(`Delivered offline message ${message.id} to ${userId}`);
        } catch (parseError) {
          console.error('Failed to parse offline message:', parseError);
        }
      }

      // Clear delivered messages
      await this.pubClient.del(messagesKey);
      console.log(`Cleared offline messages for ${userId}`);

    } catch (error) {
      console.error('Deliver offline messages error:', error);
    }
  }

  private async storeOfflineMessage(
    recipientId: string,
    message: {
      id: string;
      content: string;
      type: string;
      from: string;
      timestamp: string;
    }
  ): Promise<void> {
    // Store message in Redis for offline delivery
    try {
      if (!this.pubClient) {
        console.log('Redis not available, cannot store offline message');
        return;
      }

      const messagesKey = `offline_messages:${recipientId}`;
      
      // Store message
      await this.pubClient.rPush(messagesKey, JSON.stringify(message));
      
      // Set expiry (7 days)
      await this.pubClient.expire(messagesKey, 7 * 24 * 60 * 60);

      console.log(`Stored offline message for ${recipientId}`);

    } catch (error) {
      console.error('Store offline message error:', error);
    }
  }

  // Public methods for emitting events
  public emitToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public emitToTeam(teamId: string, event: string, data: any): void {
    // MESSAGE PERSISTENCE: Store message for offline team members
    if (event === 'message:receive' && data?.content) {
      this.storeMessageForOfflineMembers(teamId, data);
    }
    
    this.io.to(`team:${teamId}`).emit(event, data);
  }

  private async storeMessageForOfflineMembers(teamId: string, message: any): Promise<void> {
    // Store message for team members who are currently offline
    try {
      // Get online users in team room
      const teamRoom = `team:${teamId}`;
      const sockets = await this.io.in(teamRoom).fetchSockets();
      const onlineUserIds = new Set(
        sockets.map(socket => this.socketToUser.get(socket.id)).filter(Boolean)
      );

      // Get all team members from database
      const memberships = await prisma.teamMember.findMany({
        where: { teamId },
        include: { user: true }
      });

      // Store for offline members
      for (const membership of memberships) {
        if (!onlineUserIds.has(membership.userId)) {
          await this.storeOfflineMessage(membership.userId, {
            id: message.id || `msg_${Date.now()}`,
            content: message.content,
            type: message.type || 'TEXT',
            from: message.from || 'system',
            timestamp: message.timestamp || new Date().toISOString(),
          });
        }
      }

      console.log(`Stored message for ${memberships.length - onlineUserIds.size} offline team members`);

    } catch (error) {
      console.error('Store message for offline members error:', error);
    }
  }

  public emitToMatch(matchId: string, event: string, data: any): void {
    this.io.to(`match:${matchId}`).emit(event, data);
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  // Cleanup on shutdown
  public async shutdown(): Promise<void> {
    try {
      await this.pubClient.quit();
      await this.subClient.quit();
      this.io.close();
      console.log('✓ Socket.IO server shut down');
    } catch (error) {
      console.error('Socket.IO shutdown error:', error);
    }
  }
}

// Singleton instance
let socketServer: EnhancedSocketServer | null = null;

export function getSocketServer(): EnhancedSocketServer | null {
  return socketServer;
}

export async function initializeSocketServer(httpServer: any): Promise<EnhancedSocketServer> {
  if (!socketServer) {
    socketServer = new EnhancedSocketServer(httpServer);
  }
  await socketServer.initialize();
  return socketServer;
}

export default EnhancedSocketServer;

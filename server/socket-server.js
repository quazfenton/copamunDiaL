/**
 * Standalone Socket.IO Server for CopaMundial
 *
 * This server runs independently from Next.js and handles all real-time
 * communication. It's designed to work with horizontal scaling via Redis adapter.
 */

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const { z } = require('zod');

const PORT = process.env.SOCKET_PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CORS_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Zod validation schemas
const userSchema = z.object({
  userId: z.string().min(1),
  userName: z.string().min(1),
});

const teamSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
});

const messageSchema = z.object({
  teamId: z.string().min(1),
  message: z.object({
    content: z.string().min(1),
  }),
  senderId: z.string().min(1),
  senderName: z.string().min(1),
});

const typingSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
});

const matchScoreSchema = z.object({
  matchId: z.string().min(1),
  teamId: z.string().min(1),
  score: z.number(),
  updatedBy: z.string().min(1),
});

const formationSchema = z.object({
  teamId: z.string().min(1),
  formation: z.string().min(1),
  updatedBy: z.string().min(1),
});

const notificationSchema = z.object({
  userId: z.string().min(1),
  notification: z.record(z.any()),
});

// Create Redis clients for adapter
const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

// Create a separate Redis client for custom operations
const redisClient = createClient({ url: REDIS_URL });

// Helper functions for Redis-based room and user management
async function addUserToRoom(socketId, userId, userName, teamId) {
  const roomKey = `room:${teamId}`;
  const userKey = `user:${socketId}`;
  
  // Store user info
  await redisClient.hSet(userKey, { userId, userName, socketId });
  await redisClient.sAdd(roomKey, socketId);
}

async function removeUserFromRoom(socketId, teamId) {
  const roomKey = `room:${teamId}`;
  
  await redisClient.sRem(roomKey, socketId);
}

async function getRoomMembers(teamId) {
  const roomKey = `room:${teamId}`;
  const socketIds = await redisClient.sMembers(roomKey);
  const members = [];
  
  for (const socketId of socketIds) {
    const userInfo = await redisClient.hGetAll(`user:${socketId}`);
    if (Object.keys(userInfo).length > 0) {
      members.push(userInfo);
    }
  }
  
  return members;
}

async function getUserConnections(userId) {
  // Get all user sockets by scanning for user:* keys using SCAN to avoid blocking
  const sockets = [];
  let cursor = '0';
  
  do {
    const result = await redisClient.scan(cursor, { MATCH: 'user:*', COUNT: 100 });
    cursor = result.cursor;
    const userKeys = result.keys;
    
    for (const key of userKeys) {
      const userInfo = await redisClient.hGetAll(key);
      if (userInfo.userId === userId) {
        sockets.push(userInfo.socketId);
      }
    }
  } while (cursor !== '0');

  return sockets;
}

async function trackUserPresence(socketId, userId, userName) {
  const userKey = `user:${socketId}`;
  await redisClient.hSet(userKey, { userId, userName, socketId });
  // Refresh TTL for user presence data on every update
  await redisClient.expire(userKey, 3600); // 1 hour TTL
}

async function removeUserPresence(socketId) {
  const userKey = `user:${socketId}`;
  await redisClient.del(userKey);
}

async function startServer() {
  try {
    // Connect Redis clients
    await pubClient.connect();
    await subClient.connect();
    await redisClient.connect();
    console.log('✅ Redis connected');

    // Create Socket.IO server
    const io = new Server({
      cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Enable Redis adapter for horizontal scaling
    io.adapter(createAdapter(pubClient, subClient));

    // Connection handling
    io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Track user presence
      socket.on('user-online', async (data) => {
        try {
          const validatedData = userSchema.parse(data);
          const { userId, userName } = validatedData;

          await trackUserPresence(socket.id, userId, userName);

          // Broadcast to relevant rooms
          socket.broadcast.emit('user-status-change', {
            userId,
            userName,
            status: 'online',
            timestamp: new Date().toISOString(),
          });

          console.log(`👤 User online: ${userName} (${userId})`);
        } catch (error) {
          if (error instanceof z.ZodError) {
            console.warn(`⚠️ Invalid user-online data from ${socket.id}:`, error.errors);
            socket.emit('error', { message: 'Invalid user data' });
          } else {
            console.error(`❌ Error processing user-online from ${socket.id}:`, error);
          }
        }
      });

      // Join team room
      socket.on('join-team', async (data) => {
        try {
          const validatedData = teamSchema.parse(data);
          const { teamId, userId, userName } = validatedData;
          const roomName = `team-${teamId}`;

          socket.join(roomName);

          await addUserToRoom(socket.id, userId, userName, teamId);

          // Notify room members
          socket.to(roomName).emit('member-joined', {
            userId,
            userName,
            teamId,
            timestamp: new Date().toISOString(),
          });

          // Send current members to new joiner
          const members = await getRoomMembers(teamId);
          socket.emit('team-members', { teamId, members });

          console.log(`👥 User ${userName} joined team ${teamId}`);
        } catch (error) {
          if (error instanceof z.ZodError) {
            console.warn(`⚠️ Invalid join-team data from ${socket.id}:`, error.errors);
            socket.emit('error', { message: 'Invalid team join data' });
          } else {
            console.error(`❌ Error processing join-team from ${socket.id}:`, error);
          }
        }
      });

      // Leave team room
      socket.on('leave-team', async (data) => {
        try {
          const validatedData = teamSchema.parse(data);
          const { teamId, userId, userName } = validatedData;
          const roomName = `team-${teamId}`;

          socket.leave(roomName);

          await removeUserFromRoom(socket.id, teamId);

          socket.to(roomName).emit('member-left', {
            userId,
            userName,
            teamId,
            timestamp: new Date().toISOString(),
          });

          console.log(`👋 User ${userName} left team ${teamId}`);
        } catch (error) {
          if (error instanceof z.ZodError) {
            console.warn(`⚠️ Invalid leave-team data from ${socket.id}:`, error.errors);
            socket.emit('error', { message: 'Invalid team leave data' });
          } else {
            console.error(`❌ Error processing leave-team from ${socket.id}:`, error);
          }
        }
      });

      // Handle team messages
      socket.on('send-team-message', (data) => {
        try {
          const validatedData = messageSchema.parse(data);
          const { teamId, message, senderId, senderName } = validatedData;
          const roomName = `team-${teamId}`;

          const enrichedMessage = {
            ...message,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            senderId,
            senderName,
            teamId,
            timestamp: new Date().toISOString(),
          };

          // Broadcast to all room members including sender
          io.to(roomName).emit('new-team-message', enrichedMessage);

          console.log(`💬 Message in team ${teamId} from ${senderName}`);
        } catch (error) {
          if (error instanceof z.ZodError) {
            console.warn(`⚠️ Invalid send-team-message data from ${socket.id}:`, error.errors);
            socket.emit('error', { message: 'Invalid message data' });
          } else {
            console.error(`❌ Error processing send-team-message from ${socket.id}:`, error);
          }
        }
      });

      // Handle typing indicators
      socket.on('typing-start', (data) => {
        try {
          const validatedData = typingSchema.parse(data);
          const { teamId, userId, userName } = validatedData;
          socket.to(`team-${teamId}`).emit('user-typing', {
            userId,
            userName,
            teamId,
            isTyping: true,
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            console.warn(`⚠️ Invalid typing-start data from ${socket.id}:`, error.errors);
            socket.emit('error', { message: 'Invalid typing data' });
          } else {
            console.error(`❌ Error processing typing-start from ${socket.id}:`, error);
          }
        }
      });

      socket.on('typing-stop', (data) => {
        try {
          const validatedData = typingSchema.parse(data);
          const { teamId, userId, userName } = validatedData;
          socket.to(`team-${teamId}`).emit('user-typing', {
            userId,
            userName,
            teamId,
            isTyping: false,
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            console.warn(`⚠️ Invalid typing-stop data from ${socket.id}:`, error.errors);
            socket.emit('error', { message: 'Invalid typing data' });
          } else {
            console.error(`❌ Error processing typing-stop from ${socket.id}:`, error);
          }
        }
      });

      // Handle match score updates
      socket.on('match-score-update', (data) => {
        try {
          const validatedData = matchScoreSchema.parse(data);
          const { matchId, teamId, score, updatedBy } = validatedData;
          const roomName = `match-${matchId}`;

          io.to(roomName).emit('score-updated', {
            matchId,
            teamId,
            score,
            updatedBy,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            console.warn(`⚠️ Invalid match-score-update data from ${socket.id}:`, error.errors);
            socket.emit('error', { message: 'Invalid score update data' });
          } else {
            console.error(`❌ Error processing match-score-update from ${socket.id}:`, error);
          }
        }
      });

      // Handle formation updates
      socket.on('formation-update', (data) => {
        try {
          const validatedData = formationSchema.parse(data);
          const { teamId, formation, updatedBy } = validatedData;
          const roomName = `team-${teamId}`;

          socket.to(roomName).emit('formation-changed', {
            teamId,
            formation,
            updatedBy,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            console.warn(`⚠️ Invalid formation-update data from ${socket.id}:`, error.errors);
            socket.emit('error', { message: 'Invalid formation data' });
          } else {
            console.error(`❌ Error processing formation-update from ${socket.id}:`, error);
          }
        }
      });

      // Handle notifications
      socket.on('send-notification', async (data) => {
        try {
          const validatedData = notificationSchema.parse(data);
          const { userId, notification } = validatedData;

          // Find user's socket and emit
          const userSockets = await getUserConnections(userId);
          for (const socketId of userSockets) {
            io.to(socketId).emit('new-notification', {
              ...notification,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            console.warn(`⚠️ Invalid send-notification data from ${socket.id}:`, error.errors);
            socket.emit('error', { message: 'Invalid notification data' });
          } else {
            console.error(`❌ Error processing send-notification from ${socket.id}:`, error);
          }
        }
      });

      // Disconnect handling
      socket.on('disconnect', async (reason) => {
        console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);

        try {
          // Clean up user presence
          const userData = await redisClient.hGetAll(`user:${socket.id}`);
          if (Object.keys(userData).length > 0) {
            const { userId, userName } = userData;

            // Broadcast offline status
            socket.broadcast.emit('user-status-change', {
              userId,
              userName,
              status: 'offline',
              timestamp: new Date().toISOString(),
            });

            await removeUserPresence(socket.id);
            console.log(`👤 User offline: ${userName} (${userId})`);
          }

          // Clean up room memberships - we need to check all possible rooms this user was in
          // Since we don't know which rooms the user was in, we'll need to iterate through all rooms
          // and remove the user from each one where they exist
          let cursor = '0';
          do {
            const result = await redisClient.scan(cursor, { MATCH: 'room:*', COUNT: 100 });
            cursor = result.cursor;
            for (const roomKey of result.keys) {
              const teamId = roomKey.replace('room:', '');
              await removeUserFromRoom(socket.id, teamId);

              // Notify remaining members that user left
              const roomName = `team-${teamId}`;
              socket.to(roomName).emit('member-left', {
                userId: userData.userId,
                userName: userData.userName,
                teamId,
                timestamp: new Date().toISOString(),
              });
            }
          } while (cursor !== '0');
        } catch (error) {
          console.error(`❌ Error during disconnect handling for socket ${socket.id}:`, error);
        }
      });
    });

    // Health check endpoint
    const http = require('http');
    const server = http.createServer(async (req, res) => {
      if (req.url === '/health') {
        try {
          // Get room count using non-blocking counter
          const roomCount = await redisClient.get('room:count') || 0;

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'healthy',
            connections: io.engine.clientsCount,
            rooms: roomCount,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
          }));
        } catch (error) {
          console.error('Health check failed:', error);
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'unhealthy',
            error: 'Redis connection failed',
            timestamp: new Date().toISOString(),
          }));
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    // Attach Socket.IO to HTTP server
    io.attach(server);

    server.listen(PORT, () => {
      console.log(`🚀 Socket.IO server running on port ${PORT}`);
      console.log(`📡 CORS origin: ${CORS_ORIGIN}`);
      
      // Redact credentials from Redis URL for logging
      const redactedRedisUrl = REDIS_URL.replace(/\/\/[^@]*@/, '//***@');
      console.log(`🔄 Redis adapter: ${redactedRedisUrl}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      io.close();
      await pubClient.quit();
      await subClient.quit();
      await redisClient.quit();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

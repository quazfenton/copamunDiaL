/**
 * Standalone Socket.IO Server for CopaMundial
 * 
 * This server runs independently from Next.js and handles all real-time
 * communication. It's designed to work with horizontal scaling via Redis adapter.
 */

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const PORT = process.env.SOCKET_PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CORS_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Create Redis clients for adapter
const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

// Track active rooms and user presence
const activeRooms = new Map();
const userPresence = new Map();

async function startServer() {
  try {
    // Connect Redis clients
    await pubClient.connect();
    await subClient.connect();
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
      socket.on('user-online', (data) => {
        const { userId, userName } = data;
        userPresence.set(socket.id, { userId, userName, socketId: socket.id });
        
        // Broadcast to relevant rooms
        socket.broadcast.emit('user-status-change', {
          userId,
          userName,
          status: 'online',
          timestamp: new Date().toISOString(),
        });
        
        console.log(`👤 User online: ${userName} (${userId})`);
      });

      // Join team room
      socket.on('join-team', (data) => {
        const { teamId, userId, userName } = data;
        const roomName = `team-${teamId}`;
        
        socket.join(roomName);
        
        if (!activeRooms.has(roomName)) {
          activeRooms.set(roomName, new Set());
        }
        activeRooms.get(roomName).add({ socketId: socket.id, userId, userName });

        // Notify room members
        socket.to(roomName).emit('member-joined', {
          userId,
          userName,
          teamId,
          timestamp: new Date().toISOString(),
        });

        // Send current members to new joiner
        const members = Array.from(activeRooms.get(roomName) || []);
        socket.emit('team-members', { teamId, members });

        console.log(`👥 User ${userName} joined team ${teamId}`);
      });

      // Leave team room
      socket.on('leave-team', (data) => {
        const { teamId, userId, userName } = data;
        const roomName = `team-${teamId}`;
        
        socket.leave(roomName);
        
        if (activeRooms.has(roomName)) {
          const members = activeRooms.get(roomName);
          for (const member of members) {
            if (member.socketId === socket.id) {
              members.delete(member);
              break;
            }
          }
          if (members.size === 0) {
            activeRooms.delete(roomName);
          }
        }

        socket.to(roomName).emit('member-left', {
          userId,
          userName,
          teamId,
          timestamp: new Date().toISOString(),
        });

        console.log(`👋 User ${userName} left team ${teamId}`);
      });

      // Handle team messages
      socket.on('send-team-message', (data) => {
        const { teamId, message, senderId, senderName } = data;
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
      });

      // Handle typing indicators
      socket.on('typing-start', (data) => {
        const { teamId, userId, userName } = data;
        socket.to(`team-${teamId}`).emit('user-typing', {
          userId,
          userName,
          teamId,
          isTyping: true,
        });
      });

      socket.on('typing-stop', (data) => {
        const { teamId, userId, userName } = data;
        socket.to(`team-${teamId}`).emit('user-typing', {
          userId,
          userName,
          teamId,
          isTyping: false,
        });
      });

      // Handle match score updates
      socket.on('match-score-update', (data) => {
        const { matchId, teamId, score, updatedBy } = data;
        const roomName = `match-${matchId}`;
        
        io.to(roomName).emit('score-updated', {
          matchId,
          teamId,
          score,
          updatedBy,
          timestamp: new Date().toISOString(),
        });
      });

      // Handle formation updates
      socket.on('formation-update', (data) => {
        const { teamId, formation, updatedBy } = data;
        const roomName = `team-${teamId}`;
        
        socket.to(roomName).emit('formation-changed', {
          teamId,
          formation,
          updatedBy,
          timestamp: new Date().toISOString(),
        });
      });

      // Handle notifications
      socket.on('send-notification', (data) => {
        const { userId, notification } = data;
        
        // Find user's socket and emit
        for (const [socketId, userData] of userPresence.entries()) {
          if (userData.userId === userId) {
            io.to(socketId).emit('new-notification', {
              ...notification,
              timestamp: new Date().toISOString(),
            });
            break;
          }
        }
      });

      // Disconnect handling
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
        
        // Clean up user presence
        const userData = userPresence.get(socket.id);
        if (userData) {
          const { userId, userName } = userData;
          
          // Broadcast offline status
          socket.broadcast.emit('user-status-change', {
            userId,
            userName,
            status: 'offline',
            timestamp: new Date().toISOString(),
          });
          
          userPresence.delete(socket.id);
          console.log(`👤 User offline: ${userName} (${userId})`);
        }

        // Clean up room memberships
        for (const [roomName, members] of activeRooms.entries()) {
          for (const member of members) {
            if (member.socketId === socket.id) {
              members.delete(member);
              socket.to(roomName).emit('member-left', {
                userId: member.userId,
                userName: member.userName,
                teamId: roomName.replace('team-', ''),
                timestamp: new Date().toISOString(),
              });
              break;
            }
          }
          if (members.size === 0) {
            activeRooms.delete(roomName);
          }
        }
      });
    });

    // Health check endpoint
    const http = require('http');
    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          connections: io.engine.clientsCount,
          rooms: activeRooms.size,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        }));
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
      console.log(`🔄 Redis adapter: ${REDIS_URL}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      io.close();
      await pubClient.quit();
      await subClient.quit();
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

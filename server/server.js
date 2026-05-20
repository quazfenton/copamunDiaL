/**
 * CopaMundial Production Server
 * 
 * Enhanced server with:
 * - Standalone Socket.IO server with Redis adapter
 * - Next.js application
 * - Health check endpoint
 * - Graceful shutdown
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, hostname: 'localhost', port: 3000 });
const handle = app.getRequestHandler();

// Configuration
const PORT = process.env.PORT || 3000;
const SOCKET_PORT = process.env.SOCKET_PORT || 3001;
const REDIS_URL = process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '' ? process.env.REDIS_URL : null;

// Global state
let io;
let pubClient;
let subClient;
let httpServer;
let isShuttingDown = false;

/**
 * Initialize Redis clients for Socket.IO adapter
 */
async function initializeRedis() {
  if (!REDIS_URL) {
    console.log('⚠ REDIS_URL not set, running without Redis adapter (single instance mode)');
    return false;
  }

  try {
    pubClient = createClient({ url: REDIS_URL });
    subClient = pubClient.duplicate();

    pubClient.on('error', (err) => console.error('Redis Pub Client Error:', err.message));
    subClient.on('error', (err) => console.error('Redis Sub Client Error:', err.message));

    await Promise.all([pubClient.connect(), subClient.connect()]);
    
    console.log('✓ Redis connected for Socket.IO adapter');
    return true;
  } catch (error) {
    console.error('Failed to connect to Redis:', error.message);
    console.log('⚠ Running without Redis adapter (single instance mode)');
    return false;
  }
}

/**
 * Initialize Socket.IO server
 */
function initializeSocketIO(server) {
  io = new Server(server, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 10000,
    maxHttpBufferSize: 1e6, // 1MB
  });

  // Use Redis adapter if available
  if (pubClient && subClient) {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✓ Socket.IO using Redis adapter (multi-instance ready)');
  } else {
    console.log('✓ Socket.IO using default adapter (single instance)');
  }

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token && process.env.NODE_ENV === 'production') {
        return next(new Error('Authentication required'));
      }

      // In production, verify JWT token here
      // For now, we'll allow connections with or without token
      if (token) {
        // Verify token logic would go here
        socket.data.authenticated = true;
      } else {
        socket.data.authenticated = false;
      }

      next();
    } catch (err) {
      console.error('Socket auth error:', err);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
    });

    // Join room
    socket.on('join-room', (room, callback) => {
      socket.join(room);
      console.log(`[Socket] ${socket.id} joined room: ${room}`);
      
      // Notify others in room
      socket.to(room).emit('user:joined', {
        socketId: socket.id,
        room,
        timestamp: new Date().toISOString(),
      });

      if (callback) callback({ success: true });
    });

    // Leave room
    socket.on('leave-room', (room, callback) => {
      socket.leave(room);
      console.log(`[Socket] ${socket.id} left room: ${room}`);
      
      if (callback) callback({ success: true });
    });

    // Team chat messages
    socket.on('team:join', (data, callback) => {
      const { teamId } = data;
      if (!teamId) {
        if (callback) callback({ success: false, error: 'Team ID required' });
        return;
      }

      socket.join(`team:${teamId}`);
      console.log(`[Socket] ${socket.id} joined team room: team:${teamId}`);

      socket.to(`team:${teamId}`).emit('user:joined', {
        socketId: socket.id,
        teamId,
        timestamp: new Date().toISOString(),
      });

      if (callback) callback({ success: true });
    });

    socket.on('team:leave', (data, callback) => {
      const { teamId } = data;
      if (teamId) {
        socket.leave(`team:${teamId}`);
        socket.to(`team:${teamId}`).emit('user:left', {
          socketId: socket.id,
          teamId,
        });
      }
      if (callback) callback({ success: true });
    });

    // Send message to team
    socket.on('message:send', (data, callback) => {
      const { teamId, content, type = 'TEXT' } = data;

      if (!teamId || !content) {
        if (callback) callback({ success: false, error: 'Team ID and content required' });
        return;
      }

      // Broadcast to team (excluding sender)
      socket.to(`team:${teamId}`).emit('message:new', {
        socketId: socket.id,
        teamId,
        content,
        type,
        timestamp: new Date().toISOString(),
      });

      if (callback) callback({ success: true });
    });

    // Typing indicators
    socket.on('typing:start', (data) => {
      const { teamId } = data;
      if (teamId) {
        socket.to(`team:${teamId}`).emit('user:typing', {
          socketId: socket.id,
          teamId,
        });
      }
    });

    socket.on('typing:stop', (data) => {
      const { teamId } = data;
      if (teamId) {
        socket.to(`team:${teamId}`).emit('user:stopTyping', {
          socketId: socket.id,
          teamId,
        });
      }
    });

    // Match room
    socket.on('match:join', (data, callback) => {
      const { matchId } = data;
      if (matchId) {
        socket.join(`match:${matchId}`);
        console.log(`[Socket] ${socket.id} joined match room: match:${matchId}`);
      }
      if (callback) callback({ success: true });
    });

    socket.on('match:leave', (data, callback) => {
      const { matchId } = data;
      if (matchId) {
        socket.leave(`match:${matchId}`);
      }
      if (callback) callback({ success: true });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`[Socket] Error for ${socket.id}:`, error);
    });
  });

  console.log('✓ Socket.IO server initialized');
  
  return io;
}

/**
 * Health check endpoint
 */
async function healthCheck() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      http: 'connected',
      socket: io ? 'connected' : 'disconnected',
      redis: pubClient?.isOpen ? 'connected' : 'disconnected',
    },
    memory: process.memoryUsage(),
  };

  return health;
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);

  try {
    // Close HTTP server
    if (httpServer) {
      await new Promise((resolve) => {
        httpServer.close(resolve);
      });
      console.log('✓ HTTP server closed');
    }

    // Close Socket.IO
    if (io) {
      io.close();
      console.log('✓ Socket.IO server closed');
    }

    // Close Redis connections
    if (pubClient) {
      await pubClient.quit();
      console.log('✓ Redis pub client closed');
    }
    if (subClient) {
      await subClient.quit();
      console.log('✓ Redis sub client closed');
    }

    console.log('✓ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Server] Shutdown error:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
app.prepare().then(async () => {
  try {
    // Initialize Redis
    const redisConnected = await initializeRedis();

    // Create HTTP server
    httpServer = createServer(async (req, res) => {
      const parsedUrl = parse(req.url, true);

      // Health check endpoint
      if (parsedUrl.pathname === '/health') {
        const health = await healthCheck();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health));
        return;
      }

      // Handle Next.js requests
      await handle(req, res, parsedUrl);
    });

    // Initialize Socket.IO
    initializeSocketIO(httpServer);

    // Start listening
    httpServer.listen(PORT, (err) => {
      if (err) throw err;
      console.log(`\n🚀 CopaMundial Server Ready`);
      console.log(`📡 HTTP: http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO: http://localhost:${PORT}/api/socket`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Environment: ${dev ? 'Development' : 'Production'}`);
      console.log(`💾 Redis: ${redisConnected ? 'Connected' : 'Not configured (single instance mode)'}\n`);
    });

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('[Server] Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
    });

  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
});

// Export for use in other modules
module.exports = { io, healthCheck };

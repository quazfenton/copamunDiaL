/**
 * Enhanced Socket.IO Client Hook
 * 
 * Features:
 * - JWT authentication
 * - Auto-reconnection with exponential backoff
 * - Connection state management
 * - Error handling
 * - Room management
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

// Singleton socket instance
let socketInstance: Socket | null = null;

interface UseSocketOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  emit: (event: string, data: any, callback?: (response: any) => void) => void;
}

function createSocketConnection(token?: string, options: UseSocketOptions = {}): Socket {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
  } = options;

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

  const socket = io(socketUrl, {
    auth: {
      token: token || undefined,
    },
    transports: ['websocket', 'polling'],
    reconnection: autoConnect,
    reconnectionAttempts: reconnectAttempts,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    autoConnect: autoConnect,
  });

  // Connection logging
  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  socket.on('error', (error) => {
    console.error('[Socket] Error:', error);
  });

  return socket;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket
  useEffect(() => {
    if (!socketInstance && session?.user) {
      setIsConnecting(true);
      
      // Get token from session (you may need to customize this based on your auth setup)
      const token = (session.user as any).token;
      
      socketInstance = createSocketConnection(token, options);
      socketRef.current = socketInstance;

      socketInstance.on('connect', () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      });

      socketInstance.on('disconnect', () => {
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (err) => {
        setIsConnected(false);
        setIsConnecting(false);
        setError(err.message);
      });
    }

    return () => {
      // Don't disconnect on unmount, keep socket alive
    };
  }, [session?.user, options]);

  // Connect manually
  const connect = useCallback(() => {
    if (socketInstance && !isConnected) {
      setIsConnecting(true);
      socketInstance.connect();
    }
  }, [isConnected]);

  // Disconnect manually
  const disconnect = useCallback(() => {
    if (socketInstance) {
      socketInstance.disconnect();
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, []);

  // Join room
  const joinRoom = useCallback((room: string) => {
    if (socketInstance) {
      socketInstance.emit('join-room', room);
      console.log(`[Socket] Joined room: ${room}`);
    }
  }, []);

  // Leave room
  const leaveRoom = useCallback((room: string) => {
    if (socketInstance) {
      socketInstance.emit('leave-room', room);
      console.log(`[Socket] Left room: ${room}`);
    }
  }, []);

  // Emit event
  const emit = useCallback((event: string, data: any, callback?: (response: any) => void) => {
    if (socketInstance) {
      if (callback) {
        socketInstance.emit(event, data, callback);
      } else {
        socketInstance.emit(event, data);
      }
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    emit,
  };
}

/**
 * Team-specific socket hook
 * Automatically joins team room and handles team events
 */
export function useTeamSocket(teamId: string): UseSocketReturn & {
  messages: any[];
  typingUsers: string[];
  sendMessage: (content: string) => Promise<void>;
} {
  const { socket, isConnected, joinRoom, leaveRoom, emit } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Join team room
  useEffect(() => {
    if (isConnected && teamId) {
      joinRoom(`team:${teamId}`);
      return () => {
        leaveRoom(`team:${teamId}`);
      };
    }
  }, [isConnected, teamId, joinRoom, leaveRoom]);

  // Listen for team messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: any) => {
      setMessages(prev => [message, ...prev]);
    };

    const handleUserTyping = (data: { userId: string; userName: string }) => {
      setTypingUsers(prev => {
        if (!prev.includes(data.userName)) {
          return [...prev, data.userName];
        }
        return prev;
      });

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(name => name !== data.userName));
      }, 5000);
    };

    const handleUserStopTyping = (data: { userId: string }) => {
      setTypingUsers(prev => prev.filter((_, idx) => idx !== 0));
    };

    socket.on('message:new', handleNewMessage);
    socket.on('user:typing', handleUserTyping);
    socket.on('user:stopTyping', handleUserStopTyping);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('user:typing', handleUserTyping);
      socket.off('user:stopTyping', handleUserStopTyping);
    };
  }, [socket, teamId]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!socket || !teamId) {
        reject(new Error('Socket not connected'));
        return;
      }

      emit('message:send', {
        teamId,
        content,
        type: 'TEXT',
      }, (response: any) => {
        if (response?.success) {
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to send message'));
        }
      });
    });
  }, [socket, teamId, emit]);

  return {
    socket,
    isConnected,
    isConnecting: false,
    error: null,
    connect: () => {},
    disconnect: () => {},
    joinRoom,
    leaveRoom,
    emit,
    messages,
    typingUsers,
    sendMessage,
  };
}

/**
 * Match-specific socket hook
 * Automatically joins match room and handles match events
 */
export function useMatchSocket(matchId: string) {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const [score, setScore] = useState<{ home: number; away: number }>({ home: 0, away: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('SCHEDULED');

  // Join match room
  useEffect(() => {
    if (isConnected && matchId) {
      joinRoom(`match:${matchId}`);
      return () => {
        leaveRoom(`match:${matchId}`);
      };
    }
  }, [isConnected, matchId, joinRoom, leaveRoom]);

  // Listen for match events
  useEffect(() => {
    if (!socket) return;

    const handleScoreUpdate = (data: { 
      matchId: string; 
      homeScore: number; 
      awayScore: number;
      status: string;
    }) => {
      setScore({ home: data.homeScore, away: data.awayScore });
      setStatus(data.status);
    };

    const handleEvent = (event: any) => {
      setEvents(prev => [event, ...prev]);
    };

    socket.on('match:scoreUpdated', handleScoreUpdate);
    socket.on('match:eventOccurred', handleEvent);

    return () => {
      socket.off('match:scoreUpdated', handleScoreUpdate);
      socket.off('match:eventOccurred', handleEvent);
    };
  }, [socket, matchId]);

  return {
    socket,
    isConnected,
    score,
    events,
    status,
  };
}

export default useSocket;

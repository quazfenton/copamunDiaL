/**
 * Updated Socket.IO Client Hook
 * 
 * This hook connects to the standalone Socket.IO server instead of the
 * Next.js API route, enabling reliable real-time communication in production.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketOptions {
  userId?: string;
  userName?: string;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  joinTeam: (teamId: string) => void;
  leaveTeam: (teamId: string) => void;
  sendTeamMessage: (teamId: string, message: string) => void;
  startTyping: (teamId: string) => void;
  stopTyping: (teamId: string) => void;
  updatePresence: (status: 'online' | 'away' | 'offline') => void;
}

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function useSocket(options: SocketOptions = {}): UseSocketReturn {
  const { userId, userName, autoConnect = true, onConnect, onDisconnect, onError } = options;
  
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize socket connection
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;
    
    setIsConnecting(true);
    setError(null);

    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);

      // Notify server of user presence
      if (userId && userName) {
        socket.emit('user-online', { userId, userName });
      }

      onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
      setIsConnecting(false);
      onDisconnect?.(reason);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err);
      setError(err);
      setIsConnecting(false);
      onError?.(err);
    });

    socket.on('error', (err: Error) => {
      console.error('❌ Socket error:', err);
      setError(err);
      onError?.(err);
    });

  }, [userId, userName, onConnect, onDisconnect, onError]);

  // Disconnect socket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Join team room
  const joinTeam = useCallback((teamId: string) => {
    if (socketRef.current && isConnected && userId && userName) {
      socketRef.current.emit('join-team', { teamId, userId, userName });
    }
  }, [isConnected, userId, userName]);

  // Leave team room
  const leaveTeam = useCallback((teamId: string) => {
    if (socketRef.current && isConnected && userId && userName) {
      socketRef.current.emit('leave-team', { teamId, userId, userName });
    }
  }, [isConnected, userId, userName]);

  // Send message to team
  const sendTeamMessage = useCallback((teamId: string, message: string) => {
    if (socketRef.current && isConnected && userId && userName) {
      socketRef.current.emit('send-team-message', {
        teamId,
        message: { content: message },
        senderId: userId,
        senderName: userName,
      });
    }
  }, [isConnected, userId, userName]);

  // Typing indicators
  const startTyping = useCallback((teamId: string) => {
    if (socketRef.current && isConnected && userId && userName) {
      socketRef.current.emit('typing-start', { teamId, userId, userName });
    }
  }, [isConnected, userId, userName]);

  const stopTyping = useCallback((teamId: string) => {
    if (socketRef.current && isConnected && userId && userName) {
      socketRef.current.emit('typing-stop', { teamId, userId, userName });
    }
  }, [isConnected, userId, userName]);

  // Update presence status
  const updatePresence = useCallback((status: 'online' | 'away' | 'offline') => {
    if (socketRef.current && isConnected && userId && userName) {
      socketRef.current.emit('user-status-change', {
        userId,
        userName,
        status,
        timestamp: new Date().toISOString(),
      });
    }
  }, [isConnected, userId, userName]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    joinTeam,
    leaveTeam,
    sendTeamMessage,
    startTyping,
    stopTyping,
    updatePresence,
  };
}

// Hook for team-specific socket events
export function useTeamSocket(teamId: string, userId?: string, userName?: string) {
  const { socket, isConnected, joinTeam, leaveTeam } = useSocket({ userId, userName });
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!socket || !isConnected || !teamId) return;

    // Join team room
    joinTeam(teamId);

    // Listen for messages
    const handleNewMessage = (message: any) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleTeamMembers = (data: { teamId: string; members: any[] }) => {
      if (data.teamId === teamId) {
        setMembers(data.members);
      }
    };

    const handleMemberJoined = (data: any) => {
      if (data.teamId === teamId) {
        setMembers((prev) => [...prev, data]);
      }
    };

    const handleMemberLeft = (data: any) => {
      if (data.teamId === teamId) {
        setMembers((prev) => prev.filter((m) => m.userId !== data.userId));
      }
    };

    const handleUserTyping = (data: { userId: string; userName: string; teamId: string; isTyping: boolean }) => {
      if (data.teamId === teamId) {
        setTypingUsers((prev) => {
          if (data.isTyping) {
            return prev.includes(data.userName) ? prev : [...prev, data.userName];
          } else {
            return prev.filter((name) => name !== data.userName);
          }
        });
      }
    };

    socket.on('new-team-message', handleNewMessage);
    socket.on('team-members', handleTeamMembers);
    socket.on('member-joined', handleMemberJoined);
    socket.on('member-left', handleMemberLeft);
    socket.on('user-typing', handleUserTyping);

    return () => {
      socket.off('new-team-message', handleNewMessage);
      socket.off('team-members', handleTeamMembers);
      socket.off('member-joined', handleMemberJoined);
      socket.off('member-left', handleMemberLeft);
      socket.off('user-typing', handleUserTyping);
      leaveTeam(teamId);
    };
  }, [socket, isConnected, teamId, joinTeam, leaveTeam]);

  const sendMessage = useCallback((content: string) => {
    if (socket && isConnected && userId && userName) {
      socket.emit('send-team-message', {
        teamId,
        message: { content },
        senderId: userId,
        senderName: userName,
      });
    }
  }, [socket, isConnected, teamId, userId, userName]);

  return {
    messages,
    members,
    typingUsers,
    sendMessage,
    isConnected,
  };
}

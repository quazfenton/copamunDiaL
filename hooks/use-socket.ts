'use client'

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000;
const RECONNECT_MAX_DELAY = 5000;

// Singleton socket instance
let socketInstance: Socket | null = null;

function getOrCreateSocket(url?: string, token?: string) {
  if (!socketInstance) {
    const socketUrl = url || process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    socketInstance = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_DELAY,
      reconnectionDelayMax: RECONNECT_MAX_DELAY,
      reconnectionJitter: 0.3, // Add jitter to prevent thundering herd
      timeout: 10000,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socketInstance;
}

export function useSocket(url?: string) {
  const [isConnected, setIsConnected] = useState(socketInstance?.connected || false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const socket = getOrCreateSocket(url);

  useEffect(() => {
    if (socket.connected) {
      setIsConnected(true);
      setReconnectAttempts(0);
    }

    const handleConnect = () => {
      setIsConnected(true);
      setReconnectAttempts(0);
      setLastError(null);
    };
    
    const handleDisconnect = () => {
      setIsConnected(false);
    };
    
    const handleConnectError = (error: Error) => {
      console.error('Socket connection error:', error);
      setLastError(error.message);
      
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(
          RECONNECT_DELAY * Math.pow(2, reconnectAttempts) * (0.5 + Math.random()),
          RECONNECT_MAX_DELAY
        );
        
        reconnectTimerRef.current = setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          socket.connect();
        }, delay);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [socket, reconnectAttempts]);

  const reconnect = useCallback(() => {
    setReconnectAttempts(0);
    socket.connect();
  }, [socket]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    socket.disconnect();
  }, [socket]);

  return { 
    socket, 
    isConnected,
    reconnectAttempts,
    lastError,
    reconnect,
    disconnect,
  };
}

export function useNotifications() {
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notification: any) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification && !notification.isRead) {
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      }
      return prev.map(n => n.id === id ? { ...n, isRead: true } : n);
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    isConnected,
  };
}

export function useUserPresence() {
  const { socket, isConnected } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handlePresenceUpdate = (users: string[]) => {
      setOnlineUsers(users);
    };

    socket.on('presence-update', handlePresenceUpdate);

    return () => {
      socket.off('presence-update', handlePresenceUpdate);
    };
  }, [socket]);

  const setOnline = useCallback(() => {
    socket?.emit('set-presence', 'online');
  }, [socket]);

  const setOffline = useCallback(() => {
    socket?.emit('set-presence', 'offline');
  }, [socket]);

  return {
    onlineUsers,
    setOnline,
    setOffline,
    isConnected,
  };
}

export default useSocket;

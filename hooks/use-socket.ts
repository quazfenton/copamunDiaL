'use client'

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Singleton socket instance
let socketInstance: Socket | null = null;

function getOrCreateSocket(url?: string) {
  if (!socketInstance) {
    socketInstance = io(url || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
  }
  return socketInstance;
}

export function useSocket(url?: string) {
  const [isConnected, setIsConnected] = useState(socketInstance?.connected || false);
  const socket = getOrCreateSocket(url);

  useEffect(() => {
    if (socket.connected) {
      setIsConnected(true);
    }

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  return { socket, isConnected };
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

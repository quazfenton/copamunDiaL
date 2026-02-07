'use client'

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Singleton socket instance
let socketInstance: Socket | null = null;

export function useSocket(url?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io(url || window.location.origin, {
        path: '/api/socket',
        addTrailingSlash: false,
      });
    }

    // Sync current state for late-mounting components
    setIsConnected(socketInstance.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);

    setSocket(socketInstance);

    return () => {
      socketInstance?.off('connect', onConnect);
      socketInstance?.off('disconnect', onDisconnect);
    };
  }, [url]);

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
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
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

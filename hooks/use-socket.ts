import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'

export const useSocket = () => {
  const { data: session } = useSession()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!session?.user?.id) return

    const socketInstance = io(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000', {
      path: '/api/socket',
      addTrailingSlash: false,
    })

    socketInstance.on('connect', () => {
      console.log('Connected to socket server')
      setIsConnected(true)
      socketInstance.emit('user-online')
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from socket server')
      setIsConnected(false)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [session?.user?.id])

  return { socket, isConnected }
}

export const useTeamSocket = (teamId: string) => {
  const { socket } = useSocket()
  const [messages, setMessages] = useState<any[]>([])
  const [formationUpdates, setFormationUpdates] = useState<any>(null)

  useEffect(() => {
    if (!socket || !teamId) return

    // Join team room
    socket.emit('join-team', teamId)

    // Listen for team messages
    socket.on('team-message-received', (message) => {
      setMessages(prev => [...prev, message])
    })

    // Listen for formation updates
    socket.on('formation-updated', (update) => {
      setFormationUpdates(update)
    })

    return () => {
      socket.emit('leave-team', teamId)
      socket.off('team-message-received')
      socket.off('formation-updated')
    }
  }, [socket, teamId])

  const sendMessage = (content: string) => {
    if (socket && teamId) {
      socket.emit('team-message', { teamId, content })
    }
  }

  const updateFormation = (formation: string, players: any[]) => {
    if (socket && teamId) {
      socket.emit('formation-update', { teamId, formation, players })
    }
  }

  return {
    messages,
    formationUpdates,
    sendMessage,
    updateFormation
  }
}

export const useNotifications = () => {
  const { socket } = useSocket()
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    if (!socket) return

    socket.on('notification-received', (notification) => {
      setNotifications(prev => [notification, ...prev])
    })

    return () => {
      socket.off('notification-received')
    }
  }, [socket])

  const sendNotification = (toUserId: string, type: string, title: string, message: string, data?: any) => {
    if (socket) {
      socket.emit('send-notification', { toUserId, type, title, message, data })
    }
  }

  return {
    notifications,
    sendNotification
  }
}

export const useUserPresence = () => {
  const { socket } = useSocket()
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!socket) return

    socket.on('user-status-changed', ({ userId, isOnline }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev)
        if (isOnline) {
          newSet.add(userId)
        } else {
          newSet.delete(userId)
        }
        return newSet
      })
    })

    return () => {
      socket.off('user-status-changed')
    }
  }, [socket])

  return {
    onlineUsers,
    isUserOnline: (userId: string) => onlineUsers.has(userId)
  }
}
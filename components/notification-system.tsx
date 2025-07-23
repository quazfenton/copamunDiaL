"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Check, Users, Calendar, UserPlus, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Notification } from "@/lib/types"

interface NotificationSystemProps {
  notifications: Notification[]
  onAccept: (notificationId: number) => void
  onDecline: (notificationId: number) => void
  onDismiss: (notificationId: number) => void
}

export default function NotificationSystem({
  notifications,
  onAccept,
  onDecline,
  onDismiss
}: NotificationSystemProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const pending = notifications.filter(n => n.status === 'pending' && !n.isRead)
    setVisibleNotifications(pending)
  }, [notifications])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'team_invite':
        return <Users className="w-5 h-5" />
      case 'match_request':
        return <Calendar className="w-5 h-5" />
      case 'player_invite':
        return <UserPlus className="w-5 h-5" />
      default:
        return <Trophy className="w-5 h-5" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'team_invite':
        return 'bg-blue-500'
      case 'match_request':
        return 'bg-green-500'
      case 'player_invite':
        return 'bg-purple-500'
      default:
        return 'bg-yellow-500'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {visibleNotifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-4 text-white shadow-xl"
          >
            <div className="flex items-start space-x-3">
              <div className={`${getNotificationColor(notification.type)} p-2 rounded-full flex-shrink-0`}>
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">{notification.title}</h4>
                    <p className="text-xs text-white/80 mt-1">{notification.message}</p>
                    
                    {notification.fromPlayer && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={notification.fromPlayer.avatar} />
                          <AvatarFallback className="text-xs">
                            {notification.fromPlayer.firstName?.charAt(0) || 
                             notification.fromPlayer.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-white/70">
                          {notification.fromPlayer.firstName || notification.fromPlayer.name}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white/60 hover:text-white"
                    onClick={() => onDismiss(notification.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {notification.status === 'pending' && (
                  <div className="flex space-x-2 mt-3">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                      onClick={() => {
                        onAccept(notification.id)
                        toast.success("Invitation accepted!")
                      }}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white h-7 text-xs"
                      onClick={() => {
                        onDecline(notification.id)
                        toast.error("Invitation declined")
                      }}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Auto dismiss timer */}
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-white/30"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 10, ease: "linear" }}
              onAnimationComplete={() => onDismiss(notification.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Sample notifications for testing
export const sampleNotifications: Notification[] = [
  {
    id: 1,
    type: 'team_invite',
    title: 'Team Invitation',
    message: 'David invited you to join Rival FC',
    fromPlayer: {
      id: 7,
      name: 'David Wilson',
      firstName: 'David',
      position: 'Defender',
      preferredPositions: ['Defender'],
      avatar: '/placeholder.svg',
      teams: [2]
    },
    toPlayer: 1,
    teamId: 2,
    timestamp: new Date().toISOString(),
    isRead: false,
    status: 'pending'
  },
  {
    id: 2,
    type: 'match_request',
    title: 'Match Request',
    message: 'Rival FC wants to schedule a match for June 25th',
    toPlayer: 1,
    timestamp: new Date().toISOString(),
    isRead: false,
    status: 'pending'
  }
]
"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Send, Users, MessageCircle } from 'lucide-react'
import { useTeamSocket } from '@/hooks/use-socket'
import { Message } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'

interface TeamChatProps {
  teamId: string
  currentUserId: string
  isOpen: boolean
  onClose: () => void
}

export default function TeamChat({ teamId, currentUserId, isOpen, onClose }: TeamChatProps) {
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, sendMessage } = useTeamSocket(teamId)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessage(newMessage.trim())
      setNewMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl h-[600px] bg-black/90 border-gray-800 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-white">Team Chat</CardTitle>
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {messages.length > 0 ? `${new Set(messages.map(m => m.userId)).size} members` : '0 members'}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </Button>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col space-y-4 p-4">
          {/* Messages Area */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwnMessage={message.userId === currentUserId}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
              maxLength={500}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              size="icon"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Character count */}
          <div className="text-xs text-gray-400 text-right">
            {newMessage.length}/500
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
}

function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
        {!isOwnMessage && (
          <Avatar className="h-8 w-8 mt-1">
            <AvatarImage src={message.user.image || '/placeholder.svg'} />
            <AvatarFallback className="text-xs">
              {message.user.firstName?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          {!isOwnMessage && (
            <span className="text-xs text-gray-400 mb-1">
              {message.user.firstName || message.user.name}
            </span>
          )}
          
          <div
            className={`rounded-lg px-3 py-2 max-w-full break-words ${
              isOwnMessage
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-100'
            }`}
          >
            {message.type === 'SYSTEM' ? (
              <div className="flex items-center space-x-2 text-yellow-400">
                <span className="text-xs">🔔</span>
                <span className="text-sm italic">{message.content}</span>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
          
          <span className="text-xs text-gray-500 mt-1">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  )
}

// Typing indicator component
function TypingIndicator({ users }: { users: string[] }) {
  if (users.length === 0) return null

  return (
    <div className="flex items-center space-x-2 text-gray-400 text-sm">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>
        {users.length === 1
          ? `${users[0]} is typing...`
          : `${users.slice(0, -1).join(', ')} and ${users[users.length - 1]} are typing...`
        }
      </span>
    </div>
  )
}
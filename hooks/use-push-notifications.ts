/**
 * Push Notifications Hook
 * 
 * Provides functionality to:
 * - Request notification permissions
 * - Subscribe to push notifications
 * - Handle notification events
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

// VAPID public key - replace with your own in production
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

interface PushNotificationState {
  isSupported: boolean
  permission: NotificationPermission | 'default'
  subscription: PushSubscription | null
  isLoading: boolean
  error: string | null
}

interface NotificationPayload {
  title: string
  body: string
  type?: 'match_invite' | 'match_reminder' | 'score_update' | 'team_invite' | 'chat' | 'system'
  icon?: string
  badge?: string
  tag?: string
  url?: string
  data?: Record<string, unknown>
  actions?: Array<{ action: string; title: string }>
  requireInteraction?: boolean
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    subscription: null,
    isLoading: false,
    error: null,
  })

  // Check support and current state on mount
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 
        'serviceWorker' in navigator && 
        'PushManager' in window && 
        'Notification' in window

      if (!isSupported) {
        setState(prev => ({ ...prev, isSupported: false }))
        return
      }

      const permission = Notification.permission

      // Try to get existing subscription
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        
        setState(prev => ({
          ...prev,
          isSupported: true,
          permission,
          subscription,
        }))
      } catch (error) {
        setState(prev => ({
          ...prev,
          isSupported: true,
          permission,
          error: 'Failed to check subscription status',
        }))
      }
    }

    checkSupport()
  }, [])

  // Request permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!state.isSupported) {
      throw new Error('Push notifications not supported')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const permission = await Notification.requestPermission()
      setState(prev => ({ ...prev, permission, isLoading: false }))
      return permission
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to request permission'
      setState(prev => ({ ...prev, isLoading: false, error: message }))
      throw error
    }
  }, [state.isSupported])

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    if (!state.isSupported) {
      throw new Error('Push notifications not supported')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Request permission if not granted
      if (Notification.permission !== 'granted') {
        const permission = await requestPermission()
        if (permission !== 'granted') {
          setState(prev => ({ ...prev, isLoading: false }))
          return null
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        // Create new subscription
if (!VAPID_PUBLIC_KEY) {
          throw new Error('VAPID_PUBLIC_KEY is not set. Push notifications cannot be subscribed to without it.')
        }
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        })

        // Send subscription to server
        await sendSubscriptionToServer(subscription)
      }

      setState(prev => ({ ...prev, subscription, isLoading: false }))
      return subscription
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to subscribe'
      setState(prev => ({ ...prev, isLoading: false, error: message }))
      throw error
    }
  }, [state.isSupported, requestPermission])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!state.subscription) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      await state.subscription.unsubscribe()
      
      // Notify server about unsubscription
      await removeSubscriptionFromServer(state.subscription)

      setState(prev => ({ ...prev, subscription: null, isLoading: false }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unsubscribe'
      setState(prev => ({ ...prev, isLoading: false, error: message }))
      throw error
    }
  }, [state.subscription])

  // Show local notification
  const showNotification = useCallback(async (payload: NotificationPayload): Promise<void> => {
    if (Notification.permission !== 'granted') {
      throw new Error('Notification permission not granted')
    }

    const registration = await navigator.serviceWorker.ready

    await registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-72x72.png',
      tag: payload.tag || 'playmate-notification',
      requireInteraction: payload.requireInteraction || false,
      data: {
        url: payload.url || '/',
        type: payload.type,
        ...payload.data,
      },
      actions: payload.actions,
    })
  }, [])

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
  }
}

// Service worker message listener hook
export function useServiceWorkerMessages(
  onMessage: (event: MessageEvent) => void
) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleMessage = (event: MessageEvent) => {
      onMessage(event)
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [onMessage])
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            console.log('[SW] New version available')
            // Optionally notify user about update
          }
        })
      }
    })

    console.log('[SW] Service worker registered')
    return registration
  } catch (error) {
    console.error('[SW] Registration failed:', error)
    return null
  }
}

// Send skip waiting message to service worker
export function skipWaiting(): void {
export function skipWaiting(): void {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported, cannot send skip waiting message.')
    return
  }
  navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' })
}
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  })

  if (!response.ok) {
    throw new Error('Failed to save subscription on server')
  }
}

async function removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
  const response = await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })

  if (!response.ok) {
    throw new Error('Failed to remove subscription from server')
  }
}

// Notification types for type-safe notifications
export const NotificationTypes = {
  MATCH_INVITE: 'match_invite',
  MATCH_REMINDER: 'match_reminder',
  SCORE_UPDATE: 'score_update',
  TEAM_INVITE: 'team_invite',
  CHAT: 'chat',
  SYSTEM: 'system',
} as const

export type NotificationType = typeof NotificationTypes[keyof typeof NotificationTypes]

// Pre-built notification creators
export const createMatchInviteNotification = (
  teamName: string,
  matchDate: string,
  acceptUrl: string,
  declineUrl: string
): NotificationPayload => ({
  title: 'Match Invitation',
  body: `${teamName} wants to play on ${matchDate}`,
  type: 'match_invite',
  url: acceptUrl,
  data: { acceptUrl, declineUrl },
  requireInteraction: true,
})

export const createMatchReminderNotification = (
  matchName: string,
  venue: string,
  timeUntil: string,
  matchUrl: string
): NotificationPayload => ({
  title: 'Match Reminder',
  body: `${matchName} at ${venue} in ${timeUntil}`,
  type: 'match_reminder',
  url: matchUrl,
  data: { venue },
  requireInteraction: true,
})

export const createScoreUpdateNotification = (
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  matchUrl: string
): NotificationPayload => ({
  title: 'Score Update',
  body: `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`,
  type: 'score_update',
  url: matchUrl,
})

export const createTeamInviteNotification = (
  teamName: string,
  inviterName: string,
  teamUrl: string
): NotificationPayload => ({
  title: 'Team Invitation',
  body: `${inviterName} invited you to join ${teamName}`,
  type: 'team_invite',
  url: teamUrl,
  requireInteraction: true,
})

export const createChatNotification = (
  senderName: string,
  message: string,
  chatUrl: string
): NotificationPayload => ({
  title: senderName,
  body: message.slice(0, 100),
  type: 'chat',
  url: chatUrl,
})

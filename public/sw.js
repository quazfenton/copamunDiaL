/**
 * PlayMate Service Worker v2
 * 
 * Features:
 * - Push notifications with rich actions
 * - Offline caching strategies
 * - Background sync
 * - Periodic sync for live scores
 */

const CACHE_VERSION = 'v2'
const STATIC_CACHE = `playmate-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `playmate-dynamic-${CACHE_VERSION}`
const API_CACHE = `playmate-api-${CACHE_VERSION}`
const PENDING_CACHE = `playmate-pending-${CACHE_VERSION}`

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

const API_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// ============================================
// Installation & Activation
// ============================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => !name.includes(CACHE_VERSION))
            .map((name) => caches.delete(name))
        )
      })
      .then(() => self.clients.claim())
  )
})

// ============================================
// Fetch Strategies
// ============================================

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return

  // API requests - network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request))
    return
  }

  // Static assets - cache first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Dynamic pages - stale while revalidate
  event.respondWith(staleWhileRevalidate(request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
return undefined
  }
}

async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(API_CACHE)
      const responseToCache = response.clone()
      // Add timestamp header for cache expiration
      cache.put(request, responseToCache)
    }
    return response
  } catch (error) {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request)
  
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, response.clone()))
      }
      return response
    })
    .catch(() => cached || caches.match('/offline.html'))

  return cached || networkPromise
}

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|eot|ico)$/i.test(pathname)
}

// ============================================
// Push Notifications
// ============================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')

  let data = {
    title: 'PlayMate',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'playmate-general',
    url: '/',
  }

  if (event.data) {
    try {
      const payload = event.data.json()
      data = { ...data, ...payload }
    } catch (e) {
      data.body = event.data.text()
    }
  }

  // Determine notification type and customize
  const options = getNotificationOptions(data)

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

function getNotificationOptions(data) {
  const baseOptions = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    vibrate: [100, 50, 100, 50, 100],
    timestamp: data.timestamp || Date.now(),
    data: { url: data.url, ...data.data },
  }

  // Customize actions based on notification type
  switch (data.type) {
    case 'match_invite':
      return {
        ...baseOptions,
        actions: [
          { action: 'accept', title: 'Accept', icon: '/icons/check.png' },
          { action: 'decline', title: 'Decline', icon: '/icons/x.png' },
        ],
      }
    case 'match_reminder':
      return {
        ...baseOptions,
        requireInteraction: true,
        actions: [
          { action: 'view', title: 'View Match', icon: '/icons/view.png' },
          { action: 'directions', title: 'Directions', icon: '/icons/map.png' },
        ],
      }
    case 'score_update':
      return {
        ...baseOptions,
        actions: [
          { action: 'view', title: 'View Live', icon: '/icons/live.png' },
        ],
      }
    case 'team_invite':
      return {
        ...baseOptions,
        actions: [
          { action: 'view_team', title: 'View Team', icon: '/icons/team.png' },
          { action: 'dismiss', title: 'Later', icon: '/icons/clock.png' },
        ],
      }
    case 'chat':
      return {
        ...baseOptions,
        actions: [
          { action: 'reply', title: 'Reply', icon: '/icons/reply.png' },
          { action: 'view', title: 'View', icon: '/icons/view.png' },
        ],
      }
    default:
      return {
        ...baseOptions,
        actions: [
          { action: 'view', title: 'View', icon: '/icons/view.png' },
          { action: 'dismiss', title: 'Dismiss', icon: '/icons/x.png' },
        ],
      }
  }
}

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action, event.notification.tag)
  event.notification.close()

  const data = event.notification.data || {}
  let urlToOpen = data.url || '/'

  // Handle action buttons
  switch (event.action) {
    case 'accept':
      urlToOpen = data.acceptUrl || '/matches?action=accept'
      break
    case 'decline':
      urlToOpen = data.declineUrl || '/matches?action=decline'
      break
    case 'view':
    case 'view_team':
      urlToOpen = data.viewUrl || data.url || '/'
      break
    case 'directions':
      urlToOpen = data.mapsUrl || `https://maps.google.com/?q=${encodeURIComponent(data.venue || '')}`
      break
    case 'reply':
      urlToOpen = data.replyUrl || '/chat'
      break
    case 'dismiss':
      return // Just close
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing window if found
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({
              type: 'NOTIFICATION_ACTION',
              action: event.action,
              data: data,
            })
            return client.navigate(urlToOpen).then((c) => c.focus())
          }
        }
        // Open new window
        return clients.openWindow(urlToOpen)
      })
  )
})

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification dismissed:', event.notification.tag)
  // Track dismissals if needed
})

// ============================================
// Background Sync
// ============================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)

  switch (event.tag) {
    case 'sync-match-data':
      event.waitUntil(syncPendingMatchData())
      break
    case 'sync-messages':
      event.waitUntil(syncPendingMessages())
      break
    case 'sync-scores':
      event.waitUntil(syncScoreUpdates())
      break
  }
})

async function syncPendingMatchData() {
  const cache = await caches.open(PENDING_CACHE)
  const requests = await cache.keys()
  
  for (const request of requests) {
    if (request.url.includes('/api/matches')) {
      try {
        const cachedResponse = await cache.match(request)
        const data = await cachedResponse?.json()
        if (data) {
          await fetch(request, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
          await cache.delete(request)
        }
      } catch (error) {
        console.error('[SW] Sync match data failed:', error)
      }
    }
  }
}

async function syncPendingMessages() {
  console.log('[SW] Syncing pending messages...')
  // Implement message sync logic
}

async function syncScoreUpdates() {
  console.log('[SW] Syncing score updates...')
  // Implement score sync logic
}

// ============================================
// Periodic Background Sync (for live scores)
// ============================================

self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag)

  if (event.tag === 'live-scores') {
    event.waitUntil(fetchLiveScores())
  }
})

async function fetchLiveScores() {
  try {
    const response = await fetch('/api/matches/live')
    if (response.ok) {
      const data = await response.json()
      // Notify clients about live score updates
      const clients = await self.clients.matchAll()
      clients.forEach((client) => {
        client.postMessage({
          type: 'LIVE_SCORES_UPDATE',
          scores: data,
        })
      })
    }
  } catch (error) {
    console.error('[SW] Live scores fetch failed:', error)
  }
}

// ============================================
// Message Handling
// ============================================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data?.type)

  switch (event.data?.type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
    case 'CACHE_URLS':
      event.waitUntil(
        caches.open(DYNAMIC_CACHE).then((cache) => cache.addAll(event.data.urls))
      )
      break
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
      )
      break
    case 'STORE_PENDING':
      event.waitUntil(storePendingRequest(event.data.request, event.data.body))
      break
  }
})

async function storePendingRequest(requestInfo, body) {
  const cache = await caches.open(PENDING_CACHE)
  const request = new Request(requestInfo.url, requestInfo)
  const response = new Response(JSON.stringify(body))
  await cache.put(request, response)
}

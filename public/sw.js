// ChainBridge DEX Service Worker
const CACHE_NAME = 'chainbridge-dex-v1.0.0'
const STATIC_CACHE = 'chainbridge-static-v1.0.0'
const DYNAMIC_CACHE = 'chainbridge-dynamic-v1.0.0'
const API_CACHE = 'chainbridge-api-v1.0.0'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/swap',
  '/pools',
  '/portfolio',
  '/analytics',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add critical CSS and JS files
]

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/tokens',
  '/api/prices',
  '/api/pools',
]

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only',
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== API_CACHE
            ) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      
      // Claim all clients
      self.clients.claim()
    ])
  )
})

// Fetch event - handle requests with appropriate strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return
  }
  
  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request))
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request))
  } else if (isPageRequest(request)) {
    event.respondWith(handlePageRequest(request))
  } else {
    event.respondWith(handleDynamicRequest(request))
  }
})

// Handle static assets (cache first)
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('Static asset fetch failed:', error)
    return new Response('Asset not available offline', { status: 503 })
  }
}

// Handle API requests (stale while revalidate)
async function handleAPIRequest(request) {
  try {
    const cache = await caches.open(API_CACHE)
    const cachedResponse = await cache.match(request)
    
    // Start network request
    const networkPromise = fetch(request).then((response) => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    
    // Return cached response immediately if available
    if (cachedResponse) {
      // Update cache in background
      networkPromise.catch(() => {
        // Ignore network errors when we have cached data
      })
      return cachedResponse
    }
    
    // Wait for network if no cache
    return await networkPromise
  } catch (error) {
    console.error('API request failed:', error)
    
    // Try to return cached version
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    return new Response(
      JSON.stringify({ error: 'Service unavailable offline' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle page requests (network first with fallback)
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('Page request failed:', error)
    
    // Try cached version
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Fallback to offline page
    const offlinePage = await caches.match('/')
    if (offlinePage) {
      return offlinePage
    }
    
    return new Response('Page not available offline', { status: 503 })
  }
}

// Handle dynamic requests
async function handleDynamicRequest(request) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    return new Response('Resource not available offline', { status: 503 })
  }
}

// Utility functions
function isStaticAsset(request) {
  const url = new URL(request.url)
  return (
    url.pathname.includes('/icons/') ||
    url.pathname.includes('/images/') ||
    url.pathname.includes('/fonts/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf')
  )
}

function isAPIRequest(request) {
  const url = new URL(request.url)
  return (
    url.pathname.startsWith('/api/') ||
    API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))
  )
}

function isPageRequest(request) {
  const url = new URL(request.url)
  return (
    request.headers.get('accept')?.includes('text/html') ||
    url.pathname === '/' ||
    url.pathname.startsWith('/swap') ||
    url.pathname.startsWith('/pools') ||
    url.pathname.startsWith('/portfolio') ||
    url.pathname.startsWith('/analytics')
  )
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag)
  
  if (event.tag === 'background-sync-transactions') {
    event.waitUntil(syncPendingTransactions())
  }
})

async function syncPendingTransactions() {
  try {
    // Get pending transactions from IndexedDB
    const pendingTransactions = await getPendingTransactions()
    
    for (const transaction of pendingTransactions) {
      try {
        // Attempt to submit transaction
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transaction),
        })
        
        if (response.ok) {
          // Remove from pending queue
          await removePendingTransaction(transaction.id)
          
          // Notify client
          await notifyClient('transaction-synced', {
            transactionId: transaction.id,
            status: 'success',
          })
        }
      } catch (error) {
        console.error('Failed to sync transaction:', error)
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received')
  
  const options = {
    body: 'You have new updates in ChainBridge DEX',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
    },
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icons/open-24x24.png',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-24x24.png',
      },
    ],
  }
  
  if (event.data) {
    const data = event.data.json()
    options.body = data.body || options.body
    options.data = { ...options.data, ...data }
  }
  
  event.waitUntil(
    self.registration.showNotification('ChainBridge DEX', options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action)
  
  event.notification.close()
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    )
  }
})

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data)
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME })
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches())
  }
})

async function clearAllCaches() {
  const cacheNames = await caches.keys()
  await Promise.all(cacheNames.map(name => caches.delete(name)))
}

// Utility functions for IndexedDB operations
async function getPendingTransactions() {
  // Implementation would use IndexedDB
  return []
}

async function removePendingTransaction(id) {
  // Implementation would use IndexedDB
}

async function notifyClient(type, data) {
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    client.postMessage({ type, data })
  })
}

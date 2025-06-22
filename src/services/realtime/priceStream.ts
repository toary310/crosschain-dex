'use client'

import { EventEmitter } from 'events'

export interface PriceUpdate {
  token: string
  price: number
  change24h: number
  volume24h: number
  timestamp: number
  source: string
  chainId?: number
}

export interface PriceStreamConfig {
  tokens: string[]
  updateInterval: number
  sources: string[]
  enableWebSocket: boolean
  chainIds?: number[]
}

export interface PriceAlert {
  id: string
  token: string
  condition: 'above' | 'below'
  targetPrice: number
  isActive: boolean
}

export class PriceStreamService extends EventEmitter {
  private config: PriceStreamConfig
  private websockets: Map<string, WebSocket> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private isActive = false
  private priceCache: Map<string, PriceUpdate> = new Map()
  private alerts: Map<string, PriceAlert> = new Map()
  private reconnectAttempts: Map<string, number> = new Map()

  constructor(config: PriceStreamConfig) {
    super()
    this.config = config
    this.setupErrorHandling()
  }

  start() {
    if (this.isActive) return
    this.isActive = true

    console.log('Starting price stream service...')

    if (this.config.enableWebSocket) {
      this.startWebSocketStreams()
    } else {
      this.startPollingStreams()
    }

    // Start price alert monitoring
    this.startAlertMonitoring()
  }

  stop() {
    this.isActive = false
    
    console.log('Stopping price stream service...')

    // Close WebSocket connections
    this.websockets.forEach(ws => ws.close())
    this.websockets.clear()

    // Clear polling intervals
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals.clear()

    // Clear reconnect attempts
    this.reconnectAttempts.clear()
  }

  // Price alert management
  addPriceAlert(alert: PriceAlert) {
    this.alerts.set(alert.id, alert)
    this.emit('alertAdded', alert)
  }

  removePriceAlert(alertId: string) {
    const alert = this.alerts.get(alertId)
    if (alert) {
      this.alerts.delete(alertId)
      this.emit('alertRemoved', alert)
    }
  }

  getPriceAlerts(): PriceAlert[] {
    return Array.from(this.alerts.values())
  }

  // Get cached price
  getCachedPrice(token: string): PriceUpdate | null {
    return this.priceCache.get(token) || null
  }

  // Get all cached prices
  getAllCachedPrices(): Map<string, PriceUpdate> {
    return new Map(this.priceCache)
  }

  private setupErrorHandling() {
    this.on('error', (error) => {
      console.error('Price stream error:', error)
    })
  }

  private startWebSocketStreams() {
    // Connect to multiple price sources
    this.connectToBinance()
    this.connectToCustomFeeds()
    
    // Fallback polling for tokens not covered by WebSocket
    this.startFallbackPolling()
  }

  private startPollingStreams() {
    const interval = setInterval(() => {
      this.fetchPricesFromAPIs()
    }, this.config.updateInterval)

    this.intervals.set('polling', interval)
  }

  private startAlertMonitoring() {
    const interval = setInterval(() => {
      this.checkPriceAlerts()
    }, 5000) // Check every 5 seconds

    this.intervals.set('alerts', interval)
  }

  private checkPriceAlerts() {
    this.alerts.forEach((alert) => {
      if (!alert.isActive) return

      const cachedPrice = this.priceCache.get(alert.token)
      if (!cachedPrice) return

      const shouldTrigger = 
        (alert.condition === 'above' && cachedPrice.price >= alert.targetPrice) ||
        (alert.condition === 'below' && cachedPrice.price <= alert.targetPrice)

      if (shouldTrigger) {
        this.emit('priceAlert', {
          alert,
          currentPrice: cachedPrice.price,
          timestamp: Date.now(),
        })

        // Deactivate alert after triggering
        alert.isActive = false
      }
    })
  }

  private connectToBinance() {
    const symbols = this.config.tokens
      .filter(token => ['BTC', 'ETH', 'BNB', 'USDT', 'USDC'].includes(token.toUpperCase()))
      .map(token => `${token.toLowerCase()}usdt@ticker`)
      .join('/')

    if (!symbols) return

    const wsUrl = `wss://stream.binance.com:9443/ws/${symbols}`
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      console.log('Connected to Binance WebSocket')
      this.reconnectAttempts.set('binance', 0)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const token = data.s?.replace('USDT', '').toUpperCase()
        
        if (token) {
          const priceUpdate: PriceUpdate = {
            token,
            price: parseFloat(data.c),
            change24h: parseFloat(data.P),
            volume24h: parseFloat(data.v),
            timestamp: Date.now(),
            source: 'binance'
          }
          
          this.updatePrice(priceUpdate)
        }
      } catch (error) {
        console.error('Binance WebSocket message error:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('Binance WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('Binance WebSocket closed')
      this.handleReconnect('binance', () => this.connectToBinance())
    }

    this.websockets.set('binance', ws)
  }

  private connectToCustomFeeds() {
    // Mock custom WebSocket for demo
    const ws = new WebSocket('wss://echo.websocket.org')
    
    ws.onopen = () => {
      console.log('Connected to custom price feed')
      this.reconnectAttempts.set('custom', 0)
      
      // Send subscription message
      ws.send(JSON.stringify({
        type: 'subscribe',
        tokens: this.config.tokens
      }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'price_update') {
          this.updatePrice(data.payload)
        }
      } catch (error) {
        console.error('Custom feed WebSocket error:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('Custom feed WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('Custom feed WebSocket closed')
      this.handleReconnect('custom', () => this.connectToCustomFeeds())
    }

    this.websockets.set('custom', ws)
  }

  private startFallbackPolling() {
    const interval = setInterval(() => {
      this.fetchCoinGeckoPrices()
    }, 30000) // Poll every 30 seconds

    this.intervals.set('fallback', interval)
  }

  private async fetchPricesFromAPIs() {
    try {
      await Promise.all([
        this.fetchCoinGeckoPrices(),
        this.fetchMockDEXPrices()
      ])
    } catch (error) {
      console.error('Error fetching prices:', error)
    }
  }

  private async fetchCoinGeckoPrices() {
    try {
      // Mock CoinGecko API response for demo
      const mockPrices = {
        'ethereum': { usd: 2500 + Math.random() * 100, usd_24h_change: Math.random() * 10 - 5 },
        'bitcoin': { usd: 45000 + Math.random() * 1000, usd_24h_change: Math.random() * 10 - 5 },
        'usd-coin': { usd: 1.0 + Math.random() * 0.01, usd_24h_change: Math.random() * 0.1 - 0.05 }
      }
      
      Object.entries(mockPrices).forEach(([token, info]: [string, any]) => {
        const priceUpdate: PriceUpdate = {
          token: token.toUpperCase(),
          price: info.usd,
          change24h: info.usd_24h_change || 0,
          volume24h: Math.random() * 1000000,
          timestamp: Date.now(),
          source: 'coingecko'
        }
        
        this.updatePrice(priceUpdate)
      })
    } catch (error) {
      console.error('CoinGecko API error:', error)
    }
  }

  private async fetchMockDEXPrices() {
    // Mock DEX prices for demo
    const mockTokens = ['UNI', 'SUSHI', 'AAVE', 'COMP']
    
    mockTokens.forEach(token => {
      const priceUpdate: PriceUpdate = {
        token,
        price: Math.random() * 100 + 10,
        change24h: Math.random() * 20 - 10,
        volume24h: Math.random() * 500000,
        timestamp: Date.now(),
        source: 'dex'
      }
      
      this.updatePrice(priceUpdate)
    })
  }

  private updatePrice(priceUpdate: PriceUpdate) {
    // Update cache
    this.priceCache.set(priceUpdate.token, priceUpdate)
    
    // Emit update event
    this.emit('priceUpdate', priceUpdate)
  }

  private handleReconnect(source: string, reconnectFn: () => void) {
    if (!this.isActive) return

    const attempts = this.reconnectAttempts.get(source) || 0
    const maxAttempts = 5
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000) // Exponential backoff

    if (attempts < maxAttempts) {
      this.reconnectAttempts.set(source, attempts + 1)
      
      setTimeout(() => {
        if (this.isActive) {
          console.log(`Reconnecting to ${source} (attempt ${attempts + 1})...`)
          reconnectFn()
        }
      }, delay)
    } else {
      console.error(`Max reconnection attempts reached for ${source}`)
    }
  }
}

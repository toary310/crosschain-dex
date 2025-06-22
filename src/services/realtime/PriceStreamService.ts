import { WebSocketManager } from '../websocket/WebSocketManager'
import { useMarketStore } from '@/store/advanced/store'
import { Token } from '@/config/tokens'

export interface PriceUpdate {
  symbol: string
  address: string
  price: number
  change24h: number
  volume24h: number
  marketCap?: number
  timestamp: number
  source: string
}

export interface PriceStreamConfig {
  symbols: string[]
  updateInterval?: number
  enableAggregation?: boolean
  sources?: string[]
  maxRetries?: number
}

export class PriceStreamService {
  private wsManager: WebSocketManager
  private subscriptions = new Map<string, string>()
  private priceCache = new Map<string, PriceUpdate>()
  private aggregationTimer: NodeJS.Timeout | null = null
  private config: Required<PriceStreamConfig>
  private listeners = new Map<string, Set<(update: PriceUpdate) => void>>()

  constructor(config: PriceStreamConfig) {
    this.config = {
      updateInterval: 1000, // 1 second
      enableAggregation: true,
      sources: ['binance', 'coinbase', 'uniswap'],
      maxRetries: 3,
      ...config,
    }

    // Initialize WebSocket connection
    this.wsManager = new WebSocketManager({
      url: process.env.NEXT_PUBLIC_PRICE_STREAM_URL || 'wss://stream.binance.com:9443/ws/!ticker@arr',
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.wsManager.on('connected', () => {
      console.log('Price stream connected')
      this.subscribeToSymbols()
    })

    this.wsManager.on('message', (data) => {
      this.handlePriceUpdate(data)
    })

    this.wsManager.on('error', (error) => {
      console.error('Price stream error:', error)
    })

    this.wsManager.on('disconnected', () => {
      console.log('Price stream disconnected')
    })
  }

  async start(): Promise<void> {
    try {
      await this.wsManager.connect()
      
      if (this.config.enableAggregation) {
        this.startAggregation()
      }
    } catch (error) {
      console.error('Failed to start price stream:', error)
      throw error
    }
  }

  stop(): void {
    this.wsManager.disconnect()
    this.stopAggregation()
    this.subscriptions.clear()
    this.priceCache.clear()
  }

  // Subscribe to price updates for specific symbols
  subscribeToSymbol(symbol: string, callback: (update: PriceUpdate) => void): () => void {
    if (!this.listeners.has(symbol)) {
      this.listeners.set(symbol, new Set())
    }
    
    this.listeners.get(symbol)!.add(callback)
    
    // Subscribe to WebSocket stream if not already subscribed
    if (!this.subscriptions.has(symbol)) {
      const subscriptionId = this.wsManager.subscribe(`ticker.${symbol}`, (data) => {
        this.handleSymbolUpdate(symbol, data)
      })
      
      this.subscriptions.set(symbol, subscriptionId)
    }
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(symbol)?.delete(callback)
      
      // Unsubscribe from WebSocket if no more listeners
      if (this.listeners.get(symbol)?.size === 0) {
        const subscriptionId = this.subscriptions.get(symbol)
        if (subscriptionId) {
          this.wsManager.unsubscribe(subscriptionId)
          this.subscriptions.delete(symbol)
        }
      }
    }
  }

  // Subscribe to multiple symbols
  subscribeToSymbols(): void {
    this.config.symbols.forEach(symbol => {
      this.subscribeToSymbol(symbol, (update) => {
        // Update global market store
        const marketStore = useMarketStore.getState()
        marketStore.updatePrices({
          [update.address]: {
            price: update.price,
            change24h: update.change24h,
            volume24h: update.volume24h,
            marketCap: update.marketCap || 0,
            lastUpdated: update.timestamp,
          }
        })
      })
    })
  }

  private handlePriceUpdate(data: any): void {
    try {
      // Parse different data formats from various sources
      let priceUpdate: PriceUpdate

      if (data.stream && data.stream.includes('ticker')) {
        // Binance format
        priceUpdate = this.parseBinanceUpdate(data.data)
      } else if (data.type === 'ticker') {
        // Coinbase format
        priceUpdate = this.parseCoinbaseUpdate(data)
      } else if (data.type === 'uniswap_price') {
        // Uniswap format
        priceUpdate = this.parseUniswapUpdate(data)
      } else {
        console.warn('Unknown price update format:', data)
        return
      }

      // Cache the update
      this.priceCache.set(priceUpdate.symbol, priceUpdate)

      // Emit to listeners
      this.emitPriceUpdate(priceUpdate)

    } catch (error) {
      console.error('Error handling price update:', error)
    }
  }

  private handleSymbolUpdate(symbol: string, data: any): void {
    const listeners = this.listeners.get(symbol)
    if (listeners) {
      const priceUpdate = this.priceCache.get(symbol)
      if (priceUpdate) {
        listeners.forEach(callback => {
          try {
            callback(priceUpdate)
          } catch (error) {
            console.error('Price update callback error:', error)
          }
        })
      }
    }
  }

  private parseBinanceUpdate(data: any): PriceUpdate {
    return {
      symbol: data.s,
      address: this.getTokenAddress(data.s),
      price: parseFloat(data.c),
      change24h: parseFloat(data.P),
      volume24h: parseFloat(data.v),
      marketCap: parseFloat(data.c) * parseFloat(data.v), // Approximation
      timestamp: Date.now(),
      source: 'binance',
    }
  }

  private parseCoinbaseUpdate(data: any): PriceUpdate {
    return {
      symbol: data.product_id.replace('-USD', ''),
      address: this.getTokenAddress(data.product_id),
      price: parseFloat(data.price),
      change24h: parseFloat(data.open_24h) ? 
        ((parseFloat(data.price) - parseFloat(data.open_24h)) / parseFloat(data.open_24h)) * 100 : 0,
      volume24h: parseFloat(data.volume_24h),
      timestamp: Date.now(),
      source: 'coinbase',
    }
  }

  private parseUniswapUpdate(data: any): PriceUpdate {
    return {
      symbol: data.symbol,
      address: data.address,
      price: parseFloat(data.priceUSD),
      change24h: parseFloat(data.priceChange24h),
      volume24h: parseFloat(data.volumeUSD),
      marketCap: parseFloat(data.marketCap),
      timestamp: Date.now(),
      source: 'uniswap',
    }
  }

  private getTokenAddress(symbol: string): string {
    // This would map symbols to contract addresses
    // For now, return a placeholder
    const symbolMap: Record<string, string> = {
      'ETHUSDT': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      'BTCUSDT': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      // Add more mappings
    }
    
    return symbolMap[symbol] || symbol
  }

  private emitPriceUpdate(update: PriceUpdate): void {
    const listeners = this.listeners.get(update.symbol)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(update)
        } catch (error) {
          console.error('Price update listener error:', error)
        }
      })
    }

    // Emit to global listeners
    const globalListeners = this.listeners.get('*')
    if (globalListeners) {
      globalListeners.forEach(callback => {
        try {
          callback(update)
        } catch (error) {
          console.error('Global price update listener error:', error)
        }
      })
    }
  }

  // Price aggregation for better accuracy
  private startAggregation(): void {
    this.aggregationTimer = setInterval(() => {
      this.aggregatePrices()
    }, this.config.updateInterval)
  }

  private stopAggregation(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer)
      this.aggregationTimer = null
    }
  }

  private aggregatePrices(): void {
    // Aggregate prices from multiple sources
    const aggregatedPrices = new Map<string, PriceUpdate>()
    
    for (const [symbol, update] of this.priceCache) {
      const existing = aggregatedPrices.get(symbol)
      
      if (!existing) {
        aggregatedPrices.set(symbol, { ...update })
      } else {
        // Simple average aggregation
        existing.price = (existing.price + update.price) / 2
        existing.volume24h = Math.max(existing.volume24h, update.volume24h)
        existing.timestamp = Math.max(existing.timestamp, update.timestamp)
      }
    }

    // Update market store with aggregated prices
    const marketStore = useMarketStore.getState()
    const priceUpdates: Record<string, any> = {}
    
    for (const [symbol, update] of aggregatedPrices) {
      priceUpdates[update.address] = {
        price: update.price,
        change24h: update.change24h,
        volume24h: update.volume24h,
        marketCap: update.marketCap || 0,
        lastUpdated: update.timestamp,
      }
    }
    
    marketStore.updatePrices(priceUpdates)
  }

  // Get current price for a symbol
  getCurrentPrice(symbol: string): PriceUpdate | null {
    return this.priceCache.get(symbol) || null
  }

  // Get all current prices
  getAllPrices(): Map<string, PriceUpdate> {
    return new Map(this.priceCache)
  }

  // Get connection status
  get isConnected(): boolean {
    return this.wsManager.isConnected
  }

  get connectionMetrics() {
    return this.wsManager.connectionMetrics
  }
}

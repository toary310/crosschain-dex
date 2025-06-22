import { Token } from '@/config/tokens'

// Price feed providers
export type PriceProvider = 'coingecko' | 'coinmarketcap' | 'chainlink' | 'pyth' | 'uniswap' | 'dexscreener'

// Enhanced price interfaces
export interface PriceAlert {
  id: string
  token: Token
  condition: 'above' | 'below' | 'change'
  targetPrice?: number
  changePercent?: number
  timeframe?: number
  active: boolean
  triggered: boolean
  createdAt: number
  triggeredAt?: number
  callback?: (alert: PriceAlert, price: PriceQuote) => void
}

export interface PriceHistory {
  token: Token
  prices: Array<{
    timestamp: number
    price: number
    volume: number
  }>
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  startTime: number
  endTime: number
}

export interface MarketData {
  token: Token
  price: number
  marketCap: number
  volume24h: number
  change24h: number
  change7d: number
  change30d: number
  high24h: number
  low24h: number
  ath: number
  athDate: number
  atl: number
  atlDate: number
  circulatingSupply: number
  totalSupply: number
  maxSupply?: number
  rank: number
  lastUpdated: number
}

export interface PriceComparison {
  token: Token
  providers: Array<{
    provider: PriceProvider
    price: number
    timestamp: number
    confidence: number
  }>
  averagePrice: number
  spread: number
  bestPrice: number
  worstPrice: number
  recommendation: PriceProvider
}

export interface PriceServiceConfig {
  providers: PriceProvider[]
  fallbackProvider: PriceProvider
  cacheTimeout: number
  retryAttempts: number
  retryDelay: number
}

export interface PriceQuote {
  token: Token
  price: number
  priceUsd: number
  change24h: number
  volume24h: number
  marketCap: number
  provider: PriceProvider
  timestamp: number
  confidence: number
}

export interface PriceCache {
  [key: string]: {
    data: PriceQuote
    timestamp: number
    ttl: number
  }
}

// Default configuration
const DEFAULT_CONFIG: PriceServiceConfig = {
  providers: ['coingecko', 'chainlink'],
  fallbackProvider: 'coingecko',
  cacheTimeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
}

class PriceService {
  private config: PriceServiceConfig
  private cache: PriceCache = {}
  private subscribers: Map<string, Set<(price: PriceQuote) => void>> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private alerts: Map<string, PriceAlert> = new Map()
  private priceHistory: Map<string, PriceHistory> = new Map()
  private websockets: Map<PriceProvider, WebSocket> = new Map()

  constructor(config: Partial<PriceServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeWebSockets()
  }

  /**
   * Get current price for a token
   */
  async getPrice(token: Token): Promise<PriceQuote | null> {
    const cacheKey = this.getCacheKey(token)

    // Check cache first
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Fetch from providers
    for (const provider of this.config.providers) {
      try {
        const price = await this.fetchFromProvider(token, provider)
        if (price) {
          this.setCache(cacheKey, price)
          return price
        }
      } catch (error) {
        console.warn(`Failed to fetch price from ${provider}:`, error)
      }
    }

    // Try fallback provider
    try {
      const price = await this.fetchFromProvider(token, this.config.fallbackProvider)
      if (price) {
        this.setCache(cacheKey, price)
        return price
      }
    } catch (error) {
      console.error(`Fallback provider ${this.config.fallbackProvider} failed:`, error)
    }

    return null
  }

  /**
   * Get prices for multiple tokens
   */
  async getPrices(tokens: Token[]): Promise<Map<string, PriceQuote>> {
    const results = new Map<string, PriceQuote>()

    // Process in batches to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize)
      const promises = batch.map(async (token) => {
        const price = await this.getPrice(token)
        if (price) {
          results.set(this.getCacheKey(token), price)
        }
      })

      await Promise.allSettled(promises)

      // Rate limiting delay
      if (i + batchSize < tokens.length) {
        await this.delay(100)
      }
    }

    return results
  }

  /**
   * Subscribe to real-time price updates
   */
  subscribe(token: Token, callback: (price: PriceQuote) => void): () => void {
    const key = this.getCacheKey(token)

    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set())
      this.startPriceUpdates(token)
    }

    this.subscribers.get(key)!.add(callback)

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(key)
      if (subs) {
        subs.delete(callback)
        if (subs.size === 0) {
          this.stopPriceUpdates(key)
          this.subscribers.delete(key)
        }
      }
    }
  }

  /**
   * Start real-time price updates for a token
   */
  private startPriceUpdates(token: Token): void {
    const key = this.getCacheKey(token)

    if (this.intervals.has(key)) {
      return
    }

    const interval = setInterval(async () => {
      try {
        const price = await this.getPrice(token)
        if (price) {
          this.notifySubscribers(key, price)
        }
      } catch (error) {
        console.error(`Failed to update price for ${token.symbol}:`, error)
      }
    }, this.config.cacheTimeout)

    this.intervals.set(key, interval)
  }

  /**
   * Stop price updates for a token
   */
  private stopPriceUpdates(key: string): void {
    const interval = this.intervals.get(key)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(key)
    }
  }

  /**
   * Notify subscribers of price updates
   */
  private notifySubscribers(key: string, price: PriceQuote): void {
    const subscribers = this.subscribers.get(key)
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(price)
        } catch (error) {
          console.error('Error in price subscriber callback:', error)
        }
      })
    }
  }

  /**
   * Fetch price from specific provider
   */
  private async fetchFromProvider(token: Token, provider: PriceProvider): Promise<PriceQuote | null> {
    switch (provider) {
      case 'coingecko':
        return this.fetchFromCoinGecko(token)
      case 'coinmarketcap':
        return this.fetchFromCoinMarketCap(token)
      case 'chainlink':
        return this.fetchFromChainlink(token)
      case 'pyth':
        return this.fetchFromPyth(token)
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  /**
   * Fetch from CoinGecko API
   */
  private async fetchFromCoinGecko(token: Token): Promise<PriceQuote | null> {
    if (!token.coingeckoId) {
      return null
    }

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${token.coingeckoId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
    )

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()
    const tokenData = data[token.coingeckoId]

    if (!tokenData) {
      return null
    }

    return {
      token,
      price: tokenData.usd,
      priceUsd: tokenData.usd,
      change24h: tokenData.usd_24h_change || 0,
      volume24h: tokenData.usd_24h_vol || 0,
      marketCap: tokenData.usd_market_cap || 0,
      provider: 'coingecko',
      timestamp: Date.now(),
      confidence: 0.95,
    }
  }

  /**
   * Fetch from CoinMarketCap API
   */
  private async fetchFromCoinMarketCap(token: Token): Promise<PriceQuote | null> {
    // Implementation would require API key
    // This is a placeholder for the structure
    return null
  }

  /**
   * Fetch from Chainlink price feeds
   */
  private async fetchFromChainlink(token: Token): Promise<PriceQuote | null> {
    // Implementation would require on-chain price feed contracts
    // This is a placeholder for the structure
    return null
  }

  /**
   * Fetch from Pyth Network
   */
  private async fetchFromPyth(token: Token): Promise<PriceQuote | null> {
    // Implementation would require Pyth Network integration
    // This is a placeholder for the structure
    return null
  }

  /**
   * Cache management
   */
  private getCacheKey(token: Token): string {
    return `${token.chainId}-${token.address.toLowerCase()}`
  }

  private getFromCache(key: string): PriceQuote | null {
    const cached = this.cache[key]
    if (!cached) {
      return null
    }

    if (Date.now() - cached.timestamp > cached.ttl) {
      delete this.cache[key]
      return null
    }

    return cached.data
  }

  private setCache(key: string, price: PriceQuote): void {
    this.cache[key] = {
      data: price,
      timestamp: Date.now(),
      ttl: this.config.cacheTimeout,
    }
  }

  /**
   * Utility methods
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get comprehensive market data for a token
   */
  async getMarketData(token: Token): Promise<MarketData | null> {
    try {
      if (!token.coingeckoId) {
        return null
      }

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${token.coingeckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
      )

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`)
      }

      const data = await response.json()
      const marketData = data.market_data

      return {
        token,
        price: marketData.current_price?.usd || 0,
        marketCap: marketData.market_cap?.usd || 0,
        volume24h: marketData.total_volume?.usd || 0,
        change24h: marketData.price_change_percentage_24h || 0,
        change7d: marketData.price_change_percentage_7d || 0,
        change30d: marketData.price_change_percentage_30d || 0,
        high24h: marketData.high_24h?.usd || 0,
        low24h: marketData.low_24h?.usd || 0,
        ath: marketData.ath?.usd || 0,
        athDate: new Date(marketData.ath_date?.usd || 0).getTime(),
        atl: marketData.atl?.usd || 0,
        atlDate: new Date(marketData.atl_date?.usd || 0).getTime(),
        circulatingSupply: marketData.circulating_supply || 0,
        totalSupply: marketData.total_supply || 0,
        maxSupply: marketData.max_supply,
        rank: data.market_cap_rank || 0,
        lastUpdated: Date.now(),
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error)
      return null
    }
  }

  /**
   * Get price history for a token
   */
  async getPriceHistory(token: Token, timeframe: PriceHistory['timeframe'], days: number = 7): Promise<PriceHistory | null> {
    try {
      if (!token.coingeckoId) {
        return null
      }

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${token.coingeckoId}/market_chart?vs_currency=usd&days=${days}&interval=${timeframe}`
      )

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`)
      }

      const data = await response.json()

      const prices = data.prices.map((item: [number, number], index: number) => ({
        timestamp: item[0],
        price: item[1],
        volume: data.total_volumes[index]?.[1] || 0,
      }))

      const history: PriceHistory = {
        token,
        prices,
        timeframe,
        startTime: prices[0]?.timestamp || Date.now(),
        endTime: prices[prices.length - 1]?.timestamp || Date.now(),
      }

      // Cache the history
      const cacheKey = `${this.getCacheKey(token)}-${timeframe}-${days}`
      this.priceHistory.set(cacheKey, history)

      return history
    } catch (error) {
      console.error('Failed to fetch price history:', error)
      return null
    }
  }

  /**
   * Compare prices across multiple providers
   */
  async comparePrices(token: Token): Promise<PriceComparison | null> {
    try {
      const providers: PriceProvider[] = ['coingecko', 'coinmarketcap']
      const pricePromises = providers.map(async (provider) => {
        try {
          const quote = await this.fetchFromProvider(token, provider)
          return quote ? {
            provider,
            price: quote.price,
            timestamp: quote.timestamp,
            confidence: quote.confidence,
          } : null
        } catch {
          return null
        }
      })

      const results = await Promise.allSettled(pricePromises)
      const validPrices = results
        .filter((result): result is PromiseFulfilledResult<any> =>
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value)

      if (validPrices.length === 0) {
        return null
      }

      const prices = validPrices.map(p => p.price)
      const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
      const bestPrice = Math.max(...prices)
      const worstPrice = Math.min(...prices)
      const spread = ((bestPrice - worstPrice) / averagePrice) * 100

      // Recommend provider with highest confidence and reasonable price
      const recommendation = validPrices.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      ).provider

      return {
        token,
        providers: validPrices,
        averagePrice,
        spread,
        bestPrice,
        worstPrice,
        recommendation,
      }
    } catch (error) {
      console.error('Failed to compare prices:', error)
      return null
    }
  }

  /**
   * Create price alert
   */
  createAlert(alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>): string {
    const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const fullAlert: PriceAlert = {
      ...alert,
      id,
      createdAt: Date.now(),
      triggered: false,
    }

    this.alerts.set(id, fullAlert)

    // Start monitoring if not already subscribed
    const tokenKey = this.getCacheKey(alert.token)
    if (!this.subscribers.has(tokenKey)) {
      this.subscribe(alert.token, (price) => this.checkAlerts(alert.token, price))
    }

    return id
  }

  /**
   * Remove price alert
   */
  removeAlert(alertId: string): boolean {
    return this.alerts.delete(alertId)
  }

  /**
   * Get all active alerts
   */
  getAlerts(token?: Token): PriceAlert[] {
    const alerts = Array.from(this.alerts.values())

    if (token) {
      const tokenKey = this.getCacheKey(token)
      return alerts.filter(alert => this.getCacheKey(alert.token) === tokenKey)
    }

    return alerts
  }

  /**
   * Initialize WebSocket connections for real-time data
   */
  private initializeWebSockets(): void {
    // CoinGecko WebSocket (if available)
    // this.initializeCoinGeckoWS()

    // Other provider WebSockets would be initialized here
  }

  /**
   * Check alerts against current price
   */
  private checkAlerts(token: Token, price: PriceQuote): void {
    const tokenKey = this.getCacheKey(token)
    const tokenAlerts = Array.from(this.alerts.values())
      .filter(alert =>
        alert.active &&
        !alert.triggered &&
        this.getCacheKey(alert.token) === tokenKey
      )

    tokenAlerts.forEach(alert => {
      let shouldTrigger = false

      switch (alert.condition) {
        case 'above':
          shouldTrigger = alert.targetPrice !== undefined && price.price >= alert.targetPrice
          break
        case 'below':
          shouldTrigger = alert.targetPrice !== undefined && price.price <= alert.targetPrice
          break
        case 'change':
          shouldTrigger = alert.changePercent !== undefined &&
            Math.abs(price.change24h) >= Math.abs(alert.changePercent)
          break
      }

      if (shouldTrigger) {
        alert.triggered = true
        alert.triggeredAt = Date.now()

        if (alert.callback) {
          try {
            alert.callback(alert, price)
          } catch (error) {
            console.error('Error in price alert callback:', error)
          }
        }
      }
    })
  }

  /**
   * Enhanced cleanup
   */
  destroy(): void {
    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals.clear()

    // Close WebSocket connections
    this.websockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    })
    this.websockets.clear()

    // Clear subscribers
    this.subscribers.clear()

    // Clear alerts
    this.alerts.clear()

    // Clear price history
    this.priceHistory.clear()

    // Clear cache
    this.cache = {}
  }
}

// Export singleton instance
export const priceService = new PriceService()

// Export class for custom instances
export { PriceService }

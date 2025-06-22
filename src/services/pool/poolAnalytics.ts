import {
    LiquidityPool,
    PoolAnalytics,
    PoolEvent,
    PoolHistoricalData
} from './types'

export interface AnalyticsTimeframe {
  label: string
  value: '1h' | '24h' | '7d' | '30d' | '90d' | '1y'
  seconds: number
}

export interface PoolMetrics {
  poolId: string

  // Liquidity Metrics
  tvl: string
  tvlChange24h: number
  tvlChange7d: number
  liquidityUtilization: number
  liquidityEfficiency: number

  // Volume Metrics
  volume24h: string
  volume7d: string
  volume30d: string
  volumeChange24h: number
  volumeChange7d: number

  // Fee Metrics
  fees24h: string
  fees7d: string
  fees30d: string
  feeAPR: number
  protocolFees: string

  // Trading Metrics
  trades24h: number
  trades7d: number
  uniqueTraders24h: number
  uniqueTraders7d: number
  averageTradeSize: string

  // Price Metrics
  tokenPrices: string[]
  priceChange24h: number[]
  priceChange7d: number[]
  volatility24h: number
  volatility7d: number

  // Yield Metrics
  apr: number
  apy: number
  realYield: number
  impermanentLoss: number

  // Risk Metrics
  riskScore: number
  liquidityRisk: number
  volatilityRisk: number
  smartContractRisk: number

  lastUpdated: number
}

export interface PoolComparison {
  pools: LiquidityPool[]
  metrics: {
    poolId: string
    tvl: string
    volume24h: string
    apr: number
    fees24h: string
    riskScore: number
  }[]
  rankings: {
    byTVL: string[]
    byVolume: string[]
    byAPR: string[]
    byFees: string[]
  }
}

export interface AnalyticsConfig {
  updateInterval: number
  historicalDataPoints: number
  enableRealTimeUpdates: boolean
  enableAdvancedMetrics: boolean
  cacheTimeout: number
}

const DEFAULT_CONFIG: AnalyticsConfig = {
  updateInterval: 300000, // 5 minutes
  historicalDataPoints: 1000,
  enableRealTimeUpdates: true,
  enableAdvancedMetrics: true,
  cacheTimeout: 60000, // 1 minute
}

const TIMEFRAMES: AnalyticsTimeframe[] = [
  { label: '1H', value: '1h', seconds: 3600 },
  { label: '24H', value: '24h', seconds: 86400 },
  { label: '7D', value: '7d', seconds: 604800 },
  { label: '30D', value: '30d', seconds: 2592000 },
  { label: '90D', value: '90d', seconds: 7776000 },
  { label: '1Y', value: '1y', seconds: 31536000 },
]

export class PoolAnalyticsService {
  private config: AnalyticsConfig
  private metricsCache: Map<string, { data: PoolMetrics; timestamp: number }> = new Map()
  private analyticsCache: Map<string, { data: PoolAnalytics; timestamp: number }> = new Map()
  private historicalCache: Map<string, { data: PoolHistoricalData[]; timestamp: number }> = new Map()
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map()

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Get comprehensive pool analytics
   */
  async getPoolAnalytics(poolId: string, timeframe: string): Promise<PoolAnalytics> {
    try {
      const cacheKey = `${poolId}-${timeframe}`

      // Check cache first
      const cached = this.getFromCache(this.analyticsCache, cacheKey)
      if (cached) {
        return cached
      }

      // Generate analytics
      const analytics = await this.generatePoolAnalytics(poolId, timeframe)

      // Cache result
      this.setCache(this.analyticsCache, cacheKey, analytics)

      return analytics
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to get pool analytics')
    }
  }

  /**
   * Get pool metrics
   */
  async getPoolMetrics(poolId: string): Promise<PoolMetrics> {
    try {
      // Check cache first
      const cached = this.getFromCache(this.metricsCache, poolId)
      if (cached) {
        return cached
      }

      // Generate metrics
      const metrics = await this.generatePoolMetrics(poolId)

      // Cache result
      this.setCache(this.metricsCache, poolId, metrics)

      return metrics
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to get pool metrics')
    }
  }

  /**
   * Get historical data
   */
  async getPoolHistory(poolId: string, timeframe: string): Promise<PoolHistoricalData[]> {
    try {
      const cacheKey = `${poolId}-${timeframe}-history`

      // Check cache first
      const cached = this.getFromCache(this.historicalCache, cacheKey)
      if (cached) {
        return cached
      }

      // Generate historical data
      const history = await this.generateHistoricalData(poolId, timeframe)

      // Cache result
      this.setCache(this.historicalCache, cacheKey, history)

      return history
    } catch (error) {
      console.error(`Failed to get pool history for ${poolId}:`, error)
      return []
    }
  }

  /**
   * Compare multiple pools
   */
  async comparePools(poolIds: string[]): Promise<PoolComparison> {
    try {
      const pools: LiquidityPool[] = []
      const metrics: PoolComparison['metrics'] = []

      // Get data for each pool
      for (const poolId of poolIds) {
        try {
          const pool = await this.getPoolData(poolId)
          const poolMetrics = await this.getPoolMetrics(poolId)

          if (pool) {
            pools.push(pool)
            metrics.push({
              poolId,
              tvl: poolMetrics.tvl,
              volume24h: poolMetrics.volume24h,
              apr: poolMetrics.apr,
              fees24h: poolMetrics.fees24h,
              riskScore: poolMetrics.riskScore,
            })
          }
        } catch (error) {
          console.warn(`Failed to get data for pool ${poolId}:`, error)
        }
      }

      // Generate rankings
      const rankings = {
        byTVL: [...metrics].sort((a, b) => parseFloat(b.tvl) - parseFloat(a.tvl)).map(m => m.poolId),
        byVolume: [...metrics].sort((a, b) => parseFloat(b.volume24h) - parseFloat(a.volume24h)).map(m => m.poolId),
        byAPR: [...metrics].sort((a, b) => b.apr - a.apr).map(m => m.poolId),
        byFees: [...metrics].sort((a, b) => parseFloat(b.fees24h) - parseFloat(a.fees24h)).map(m => m.poolId),
      }

      return {
        pools,
        metrics,
        rankings,
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to compare pools')
    }
  }

  /**
   * Get top pools by metric
   */
  async getTopPools(metric: 'tvl' | 'volume' | 'fees' | 'apr', limit: number = 10): Promise<LiquidityPool[]> {
    try {
      // In real implementation, this would query from database/subgraph
      const mockPools = await this.getMockPools()

      const sortedPools = mockPools.sort((a, b) => {
        switch (metric) {
          case 'tvl':
            return parseFloat(b.tvlUSD) - parseFloat(a.tvlUSD)
          case 'volume':
            return parseFloat(b.volume24h) - parseFloat(a.volume24h)
          case 'fees':
            return parseFloat(b.fees24h) - parseFloat(a.fees24h)
          case 'apr':
            return b.apr - a.apr
          default:
            return 0
        }
      })

      return sortedPools.slice(0, limit)
    } catch (error) {
      console.error(`Failed to get top pools by ${metric}:`, error)
      return []
    }
  }

  /**
   * Get pool events
   */
  async getPoolEvents(poolId: string, limit: number = 100): Promise<PoolEvent[]> {
    try {
      // In real implementation, this would query events from subgraph
      return []
    } catch (error) {
      console.error(`Failed to get pool events for ${poolId}:`, error)
      return []
    }
  }

  /**
   * Start real-time tracking for a pool
   */
  startRealTimeTracking(poolId: string): void {
    if (!this.config.enableRealTimeUpdates) return

    // Clear existing interval
    this.stopRealTimeTracking(poolId)

    // Start new interval
    const interval = setInterval(async () => {
      try {
        // Clear cache to force refresh
        this.clearPoolCache(poolId)

        // Update metrics
        await this.getPoolMetrics(poolId)
      } catch (error) {
        console.error(`Failed to update real-time data for pool ${poolId}:`, error)
      }
    }, this.config.updateInterval)

    this.updateIntervals.set(poolId, interval)
  }

  /**
   * Stop real-time tracking for a pool
   */
  stopRealTimeTracking(poolId: string): void {
    const interval = this.updateIntervals.get(poolId)
    if (interval) {
      clearInterval(interval)
      this.updateIntervals.delete(poolId)
    }
  }

  /**
   * Private helper methods
   */
  private async generatePoolAnalytics(poolId: string, timeframe: string): Promise<PoolAnalytics> {
    const pool = await this.getPoolData(poolId)
    if (!pool) {
      throw new Error('Pool not found')
    }

    const metrics = await this.getPoolMetrics(poolId)
    const history = await this.getPoolHistory(poolId, timeframe)

    return {
      poolId,
      timeframe: timeframe as any,
      volume: metrics.volume24h,
      volumeUSD: metrics.volume24h,
      volumeChange: metrics.volumeChange24h,
      tvl: metrics.tvl,
      tvlUSD: metrics.tvl,
      tvlChange: metrics.tvlChange24h,
      fees: metrics.fees24h,
      feesUSD: metrics.fees24h,
      feeAPR: metrics.feeAPR,
      trades: metrics.trades24h,
      uniqueTraders: metrics.uniqueTraders24h,
      averageTradeSize: metrics.averageTradeSize,
      liquidityUtilization: metrics.liquidityUtilization,
      liquidityEfficiency: metrics.liquidityEfficiency,
      priceChange: metrics.priceChange24h,
      volatility: metrics.volatility24h,
      historicalData: history,
    }
  }

  private async generatePoolMetrics(poolId: string): Promise<PoolMetrics> {
    const pool = await this.getPoolData(poolId)
    if (!pool) {
      throw new Error('Pool not found')
    }

    // In real implementation, these would be calculated from actual data
    return {
      poolId,
      tvl: pool.tvlUSD,
      tvlChange24h: 2.5,
      tvlChange7d: 8.3,
      liquidityUtilization: 0.65,
      liquidityEfficiency: 0.85,
      volume24h: pool.volume24h,
      volume7d: pool.volume7d,
      volume30d: (parseFloat(pool.volume7d) * 4.3).toString(),
      volumeChange24h: 12.4,
      volumeChange7d: -3.2,
      fees24h: pool.fees24h,
      fees7d: pool.fees7d,
      fees30d: (parseFloat(pool.fees7d) * 4.3).toString(),
      feeAPR: pool.apr,
      protocolFees: (parseFloat(pool.fees24h) * 0.05).toString(),
      trades24h: 150,
      trades7d: 1050,
      uniqueTraders24h: 75,
      uniqueTraders7d: 425,
      averageTradeSize: (parseFloat(pool.volume24h) / 150).toString(),
      tokenPrices: ['1.00', '2100.50'],
      priceChange24h: [0.1, 2.3],
      priceChange7d: [-0.2, -1.8],
      volatility24h: 15.5,
      volatility7d: 22.1,
      apr: pool.apr,
      apy: pool.apy,
      realYield: pool.apr * 0.8, // 80% of APR as real yield
      impermanentLoss: -0.5,
      riskScore: this.calculateRiskScore(pool),
      liquidityRisk: 0.3,
      volatilityRisk: 0.6,
      smartContractRisk: 0.2,
      lastUpdated: Date.now(),
    }
  }

  private async generateHistoricalData(poolId: string, timeframe: string): Promise<PoolHistoricalData[]> {
    const timeframeConfig = TIMEFRAMES.find(tf => tf.value === timeframe)
    if (!timeframeConfig) {
      throw new Error('Invalid timeframe')
    }

    // Generate mock historical data
    const dataPoints = Math.min(this.config.historicalDataPoints, 100)
    const interval = timeframeConfig.seconds * 1000 / dataPoints
    const now = Date.now()

    const history: PoolHistoricalData[] = []

    for (let i = 0; i < dataPoints; i++) {
      const timestamp = now - (interval * (dataPoints - i))

      // Generate realistic-looking data with some randomness
      const baseValue = 1000000 + (Math.sin(i / 10) * 100000)
      const randomFactor = 0.9 + (Math.random() * 0.2)

      history.push({
        timestamp,
        tvl: (baseValue * randomFactor).toString(),
        volume: (baseValue * 0.1 * randomFactor).toString(),
        fees: (baseValue * 0.001 * randomFactor).toString(),
        price: ['1.00', (2000 + (Math.sin(i / 5) * 200) * randomFactor).toString()],
        apr: 10 + (Math.sin(i / 8) * 5) * randomFactor,
      })
    }

    return history
  }

  private calculateRiskScore(pool: LiquidityPool): number {
    let score = 0

    // TVL risk (higher TVL = lower risk)
    const tvl = parseFloat(pool.tvlUSD)
    if (tvl > 10000000) score += 0.3 // $10M+
    else if (tvl > 1000000) score += 0.2 // $1M+
    else if (tvl > 100000) score += 0.1 // $100K+

    // Verification risk
    if (pool.metadata?.verified) score += 0.2

    // Age risk (older pools are generally safer)
    const age = Date.now() - pool.createdAt
    const ageInDays = age / (1000 * 60 * 60 * 24)
    if (ageInDays > 365) score += 0.2 // 1+ years
    else if (ageInDays > 90) score += 0.1 // 3+ months

    // Token risk
    const lowRiskTokens = pool.tokens.filter(token => token.riskLevel === 'low').length
    score += (lowRiskTokens / pool.tokens.length) * 0.3

    return Math.min(score, 1) // Cap at 1.0
  }

  private async getPoolData(poolId: string): Promise<LiquidityPool | null> {
    // In real implementation, this would fetch from pool manager
    return null
  }

  private async getMockPools(): Promise<LiquidityPool[]> {
    // Mock data for demonstration
    return []
  }

  private getFromCache<T>(cache: Map<string, { data: T; timestamp: number }>, key: string): T | null {
    const cached = cache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > this.config.cacheTimeout) {
      cache.delete(key)
      return null
    }

    return cached.data
  }

  private setCache<T>(cache: Map<string, { data: T; timestamp: number }>, key: string, data: T): void {
    cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  private clearPoolCache(poolId: string): void {
    // Clear all cache entries for this pool
    for (const cache of [this.metricsCache, this.analyticsCache, this.historicalCache]) {
      for (const key of cache.keys()) {
        if (key.startsWith(poolId)) {
          cache.delete(key)
        }
      }
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      metricsCache: this.metricsCache.size,
      analyticsCache: this.analyticsCache.size,
      historicalCache: this.historicalCache.size,
      activeTracking: this.updateIntervals.size,
      config: this.config,
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear all intervals
    this.updateIntervals.forEach(interval => clearInterval(interval))
    this.updateIntervals.clear()

    // Clear caches
    this.metricsCache.clear()
    this.analyticsCache.clear()
    this.historicalCache.clear()
  }
}

// Export singleton instance
export const poolAnalyticsService = new PoolAnalyticsService()

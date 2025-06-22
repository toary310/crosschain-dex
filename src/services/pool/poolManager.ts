import { Address } from 'viem'
import {
    AddLiquidityRequest,
    AddLiquidityResponse,
    PoolManager as IPoolManager,
    LiquidityPool,
    LiquidityPosition,
    PoolAnalytics,
    PoolAnalyticsService,
    PoolCreationRequest,
    PoolEvent,
    PoolFactory,
    PoolFilter,
    PoolSearchRequest,
    PoolSearchResponse,
    PositionReward,
    RemoveLiquidityRequest,
    RemoveLiquidityResponse
} from './types'
import { UniswapV3Service } from './uniswapV3Service'

export interface PoolManagerConfig {
  enabledProtocols: string[]
  defaultProtocol: string
  cacheTimeout: number
  maxPositions: number
  autoCompound: boolean
  slippageTolerance: number
}

const DEFAULT_CONFIG: PoolManagerConfig = {
  enabledProtocols: ['uniswap-v3'],
  defaultProtocol: 'uniswap-v3',
  cacheTimeout: 60000,
  maxPositions: 100,
  autoCompound: false,
  slippageTolerance: 0.5,
}

export class PoolManager implements IPoolManager, PoolFactory, PoolAnalyticsService {
  private config: PoolManagerConfig
  private services: Map<string, any> = new Map()
  private poolCache: Map<string, LiquidityPool> = new Map()
  private positionCache: Map<string, LiquidityPosition[]> = new Map()
  private analyticsCache: Map<string, PoolAnalytics> = new Map()

  constructor(config: Partial<PoolManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeServices()
  }

  /**
   * Initialize pool services
   */
  private initializeServices(): void {
    if (this.config.enabledProtocols.includes('uniswap-v3')) {
      this.services.set('uniswap-v3', new UniswapV3Service())
    }

    // Add other protocols here as they're implemented
    // if (this.config.enabledProtocols.includes('uniswap-v2')) {
    //   this.services.set('uniswap-v2', new UniswapV2Service())
    // }
    // if (this.config.enabledProtocols.includes('curve')) {
    //   this.services.set('curve', new CurveService())
    // }
  }

  /**
   * Create a new liquidity pool
   */
  async createPool(request: PoolCreationRequest): Promise<{ poolId: string; transaction: any }> {
    try {
      const protocol = this.determineProtocol(request)
      const service = this.services.get(protocol)

      if (!service) {
        throw new Error(`Protocol ${protocol} not supported`)
      }

      const result = await service.createPool(request)

      // Clear cache to ensure fresh data
      this.clearPoolCache()

      return result
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to create pool')
    }
  }

  /**
   * Get pool by ID
   */
  async getPool(poolId: string): Promise<LiquidityPool | null> {
    try {
      // Check cache first
      const cached = this.poolCache.get(poolId)
      if (cached) {
        return cached
      }

      // Try each service until we find the pool
      for (const [protocol, service] of this.services) {
        try {
          const pool = await service.getPool(poolId)
          if (pool) {
            this.poolCache.set(poolId, pool)
            return pool
          }
        } catch (error) {
          console.warn(`Failed to get pool ${poolId} from ${protocol}:`, error)
        }
      }

      return null
    } catch (error) {
      console.error(`Failed to get pool ${poolId}:`, error)
      return null
    }
  }

  /**
   * Get pools with filtering
   */
  async getPools(filter?: PoolFilter): Promise<LiquidityPool[]> {
    try {
      const allPools: LiquidityPool[] = []

      // Get pools from all services
      for (const [protocol, service] of this.services) {
        try {
          const pools = await service.searchPools({ filter })
          allPools.push(...pools.pools)
        } catch (error) {
          console.warn(`Failed to get pools from ${protocol}:`, error)
        }
      }

      // Remove duplicates and apply additional filtering
      const uniquePools = this.deduplicatePools(allPools)
      return this.applyAdvancedFiltering(uniquePools, filter)
    } catch (error) {
      console.error('Failed to get pools:', error)
      return []
    }
  }

  /**
   * Search pools with advanced filtering
   */
  async searchPools(request: PoolSearchRequest): Promise<PoolSearchResponse> {
    try {
      const allResults: PoolSearchResponse[] = []

      // Search across all services
      for (const [protocol, service] of this.services) {
        try {
          const result = await service.searchPools(request)
          allResults.push(result)
        } catch (error) {
          console.warn(`Failed to search pools in ${protocol}:`, error)
        }
      }

      // Combine and deduplicate results
      const combinedPools = allResults.flatMap(result => result.pools)
      const uniquePools = this.deduplicatePools(combinedPools)

      // Apply sorting and pagination
      const sortedPools = this.sortPools(uniquePools, request.sort)
      const pagination = request.pagination || { page: 1, limit: 20 }
      const startIndex = (pagination.page - 1) * pagination.limit
      const endIndex = startIndex + pagination.limit
      const paginatedPools = sortedPools.slice(startIndex, endIndex)

      return {
        pools: paginatedPools,
        total: uniquePools.length,
        page: pagination.page,
        limit: pagination.limit,
        hasMore: endIndex < uniquePools.length,
      }
    } catch (error) {
      console.error('Failed to search pools:', error)
      return {
        pools: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      }
    }
  }

  /**
   * Add liquidity to a pool
   */
  async addLiquidity(request: AddLiquidityRequest): Promise<AddLiquidityResponse> {
    try {
      const pool = await this.getPool(request.poolId)
      if (!pool) {
        return {
          success: false,
          error: 'Pool not found',
        }
      }

      const protocol = this.getPoolProtocol(pool)
      const service = this.services.get(protocol)

      if (!service) {
        return {
          success: false,
          error: `Protocol ${protocol} not supported`,
        }
      }

      const result = await service.addLiquidity(request)

      // Clear position cache for user
      this.clearPositionCache(request.userAddress)

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add liquidity',
      }
    }
  }

  /**
   * Remove liquidity from a pool
   */
  async removeLiquidity(request: RemoveLiquidityRequest): Promise<RemoveLiquidityResponse> {
    try {
      const pool = await this.getPool(request.poolId)
      if (!pool) {
        return {
          success: false,
          error: 'Pool not found',
        }
      }

      const protocol = this.getPoolProtocol(pool)
      const service = this.services.get(protocol)

      if (!service) {
        return {
          success: false,
          error: `Protocol ${protocol} not supported`,
        }
      }

      const result = await service.removeLiquidity(request)

      // Clear position cache for user
      this.clearPositionCache(request.userAddress)

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove liquidity',
      }
    }
  }

  /**
   * Get user positions across all protocols
   */
  async getUserPositions(userAddress: Address, chainId?: number): Promise<LiquidityPosition[]> {
    try {
      const cacheKey = `${userAddress}-${chainId || 'all'}`

      // Check cache first
      const cached = this.positionCache.get(cacheKey)
      if (cached) {
        return cached
      }

      const allPositions: LiquidityPosition[] = []

      // Get positions from all services
      for (const [protocol, service] of this.services) {
        try {
          const positions = await service.getUserPositions(userAddress, chainId)
          allPositions.push(...positions)
        } catch (error) {
          console.warn(`Failed to get positions from ${protocol}:`, error)
        }
      }

      // Sort by total value (descending)
      const sortedPositions = allPositions.sort((a, b) =>
        parseFloat(b.totalValueUSD) - parseFloat(a.totalValueUSD)
      )

      // Cache the result
      this.positionCache.set(cacheKey, sortedPositions)

      return sortedPositions
    } catch (error) {
      console.error(`Failed to get positions for ${userAddress}:`, error)
      return []
    }
  }

  /**
   * Get position by ID
   */
  async getPosition(positionId: string): Promise<LiquidityPosition | null> {
    try {
      // Try each service until we find the position
      for (const [protocol, service] of this.services) {
        try {
          const position = await service.getPosition(positionId)
          if (position) {
            return position
          }
        } catch (error) {
          console.warn(`Failed to get position ${positionId} from ${protocol}:`, error)
        }
      }

      return null
    } catch (error) {
      console.error(`Failed to get position ${positionId}:`, error)
      return null
    }
  }

  /**
   * Claim rewards for a position
   */
  async claimRewards(positionId: string): Promise<{ transaction: any; rewards: PositionReward[] }> {
    try {
      const position = await this.getPosition(positionId)
      if (!position) {
        throw new Error('Position not found')
      }

      const pool = await this.getPool(position.poolId)
      if (!pool) {
        throw new Error('Pool not found')
      }

      const protocol = this.getPoolProtocol(pool)
      const service = this.services.get(protocol)

      if (!service || !service.claimRewards) {
        throw new Error(`Reward claiming not supported for ${protocol}`)
      }

      const result = await service.claimRewards(positionId)

      // Clear position cache for user
      this.clearPositionCache(position.userAddress)

      return result
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to claim rewards')
    }
  }

  /**
   * Get pool analytics
   */
  async getPoolAnalytics(poolId: string, timeframe: string): Promise<PoolAnalytics> {
    try {
      const cacheKey = `${poolId}-${timeframe}`

      // Check cache first
      const cached = this.analyticsCache.get(cacheKey)
      if (cached) {
        return cached
      }

      const pool = await this.getPool(poolId)
      if (!pool) {
        throw new Error('Pool not found')
      }

      // Generate analytics (in real implementation, this would fetch from subgraph/API)
      const analytics: PoolAnalytics = {
        poolId,
        timeframe: timeframe as any,
        volume: pool.volume24h,
        volumeUSD: pool.volume24h,
        volumeChange: 5.2,
        tvl: pool.tvl,
        tvlUSD: pool.tvlUSD,
        tvlChange: 2.1,
        fees: pool.fees24h,
        feesUSD: pool.fees24h,
        feeAPR: pool.apr,
        trades: 150,
        uniqueTraders: 75,
        averageTradeSize: (parseFloat(pool.volume24h) / 150).toString(),
        liquidityUtilization: 0.65,
        liquidityEfficiency: 0.85,
        priceChange: [1.2, -0.8],
        volatility: 15.5,
        historicalData: [],
      }

      // Cache the result
      this.analyticsCache.set(cacheKey, analytics)

      return analytics
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to get pool analytics')
    }
  }

  /**
   * Get pool history
   */
  async getPoolHistory(poolId: string, timeframe: string): Promise<any[]> {
    try {
      // In real implementation, this would fetch historical data
      return []
    } catch (error) {
      console.error(`Failed to get pool history for ${poolId}:`, error)
      return []
    }
  }

  /**
   * Get top pools by metric
   */
  async getTopPools(metric: 'tvl' | 'volume' | 'fees', limit: number): Promise<LiquidityPool[]> {
    try {
      const allPools = await this.getPools()

      const sortedPools = allPools.sort((a, b) => {
        switch (metric) {
          case 'tvl':
            return parseFloat(b.tvlUSD) - parseFloat(a.tvlUSD)
          case 'volume':
            return parseFloat(b.volume24h) - parseFloat(a.volume24h)
          case 'fees':
            return parseFloat(b.fees24h) - parseFloat(a.fees24h)
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
  async getPoolEvents(poolId: string, limit?: number): Promise<PoolEvent[]> {
    try {
      // In real implementation, this would fetch events from subgraph
      return []
    } catch (error) {
      console.error(`Failed to get pool events for ${poolId}:`, error)
      return []
    }
  }

  /**
   * Private helper methods
   */
  private determineProtocol(request: PoolCreationRequest): string {
    // Simple protocol selection logic
    if (request.type === 'concentrated') {
      return 'uniswap-v3'
    }

    return this.config.defaultProtocol
  }

  private getPoolProtocol(pool: LiquidityPool): string {
    // Determine protocol from pool data
    if (pool.version === 'v3' && pool.type === 'concentrated') {
      return 'uniswap-v3'
    }

    return this.config.defaultProtocol
  }

  private deduplicatePools(pools: LiquidityPool[]): LiquidityPool[] {
    const seen = new Set<string>()
    return pools.filter(pool => {
      const key = `${pool.chainId}-${pool.address.toLowerCase()}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  private applyAdvancedFiltering(pools: LiquidityPool[], filter?: PoolFilter): LiquidityPool[] {
    if (!filter) return pools

    return pools.filter(pool => {
      // Additional filtering logic can be added here
      return true
    })
  }

  private sortPools(pools: LiquidityPool[], sort?: { field: string; order: 'asc' | 'desc' }): LiquidityPool[] {
    if (!sort) return pools

    return pools.sort((a, b) => {
      let aValue: number
      let bValue: number

      switch (sort.field) {
        case 'tvl':
          aValue = parseFloat(a.tvlUSD)
          bValue = parseFloat(b.tvlUSD)
          break
        case 'volume24h':
          aValue = parseFloat(a.volume24h)
          bValue = parseFloat(b.volume24h)
          break
        case 'fees24h':
          aValue = parseFloat(a.fees24h)
          bValue = parseFloat(b.fees24h)
          break
        case 'apr':
          aValue = a.apr
          bValue = b.apr
          break
        case 'createdAt':
          aValue = a.createdAt
          bValue = b.createdAt
          break
        default:
          return 0
      }

      if (sort.order === 'desc') {
        return bValue - aValue
      } else {
        return aValue - bValue
      }
    })
  }

  private clearPoolCache(): void {
    this.poolCache.clear()
  }

  private clearPositionCache(userAddress?: Address): void {
    if (userAddress) {
      // Clear specific user's cache
      for (const key of this.positionCache.keys()) {
        if (key.startsWith(userAddress.toLowerCase())) {
          this.positionCache.delete(key)
        }
      }
    } else {
      // Clear all position cache
      this.positionCache.clear()
    }
  }

  /**
   * Get manager statistics
   */
  getStats() {
    return {
      enabledProtocols: this.config.enabledProtocols,
      poolCache: this.poolCache.size,
      positionCache: this.positionCache.size,
      analyticsCache: this.analyticsCache.size,
      services: Array.from(this.services.keys()),
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.services.forEach(service => service.destroy())
    this.services.clear()
    this.poolCache.clear()
    this.positionCache.clear()
    this.analyticsCache.clear()
  }
}

// Export singleton instance
export const poolManager = new PoolManager()

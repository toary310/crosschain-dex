import { Address, TransactionRequest } from 'viem'
import {
    AddLiquidityRequest,
    AddLiquidityResponse,
    LiquidityPool,
    LiquidityPosition,
    PoolConfig,
    PoolCreationRequest,
    PoolError,
    PoolErrorCode,
    PoolFilter,
    PoolSearchRequest,
    PoolSearchResponse,
    RemoveLiquidityRequest,
    RemoveLiquidityResponse
} from './types'

export interface PoolServiceConfig extends PoolConfig {
  rpcUrl: string
  apiKey?: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  cacheTimeout: number
}

const DEFAULT_CONFIG: PoolServiceConfig = {
  rpcUrl: '',
  timeout: 15000,
  retryAttempts: 3,
  retryDelay: 2000,
  cacheTimeout: 60000,
  maxPools: 1000,
  minLiquidity: '1000',
  maxSlippage: 5,
  defaultFeeTier: 3000,
  supportedTypes: ['constant_product', 'stable', 'weighted'],
  feeRecipient: '0x0000000000000000000000000000000000000000' as Address,
  protocolFeeRate: 0.05,
  emergencyPause: false,
}

export abstract class BasePoolService {
  protected config: PoolServiceConfig
  protected cache: Map<string, { data: unknown; timestamp: number }> = new Map()
  protected pools: Map<string, LiquidityPool> = new Map()
  protected positions: Map<string, LiquidityPosition> = new Map()

  constructor(protected protocol: string, config: Partial<PoolServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // Abstract methods to be implemented by specific pool services
  abstract createPool(request: PoolCreationRequest): Promise<{ poolId: string; transaction: TransactionRequest }>
  abstract addLiquidity(request: AddLiquidityRequest): Promise<AddLiquidityResponse>
  abstract removeLiquidity(request: RemoveLiquidityRequest): Promise<RemoveLiquidityResponse>
  abstract getPoolFromChain(poolId: string): Promise<LiquidityPool | null>
  abstract getUserPositionsFromChain(userAddress: Address, chainId?: number): Promise<LiquidityPosition[]>

  /**
   * Get pool by ID with caching
   */
  async getPool(poolId: string): Promise<LiquidityPool | null> {
    try {
      // Check cache first
      const cached = this.getFromCache(`pool-${poolId}`)
      if (cached) {
        return cached as LiquidityPool
      }

      // Fetch from chain
      const pool = await this.getPoolFromChain(poolId)
      if (pool) {
        this.setCache(`pool-${poolId}`, pool)
        this.pools.set(poolId, pool)
      }

      return pool
    } catch (error) {
      console.error(`Failed to get pool ${poolId}:`, error)
      return null
    }
  }

  /**
   * Search pools with filtering and pagination
   */
  async searchPools(request: PoolSearchRequest): Promise<PoolSearchResponse> {
    try {
      const cacheKey = this.getSearchCacheKey(request)
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        return cached as PoolSearchResponse
      }

      // Get all pools (in real implementation, this would be optimized)
      const allPools = Array.from(this.pools.values())

      // Apply filters
      let filteredPools = this.applyFilters(allPools, request.filter)

      // Apply search query
      if (request.query) {
        filteredPools = this.applySearchQuery(filteredPools, request.query)
      }

      // Apply sorting
      if (request.sort) {
        filteredPools = this.applySorting(filteredPools, request.sort)
      }

      // Apply pagination
      const pagination = request.pagination || { page: 1, limit: 20 }
      const startIndex = (pagination.page - 1) * pagination.limit
      const endIndex = startIndex + pagination.limit
      const paginatedPools = filteredPools.slice(startIndex, endIndex)

      const response: PoolSearchResponse = {
        pools: paginatedPools,
        total: filteredPools.length,
        page: pagination.page,
        limit: pagination.limit,
        hasMore: endIndex < filteredPools.length,
      }

      this.setCache(cacheKey, response)
      return response
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
   * Get user positions
   */
  async getUserPositions(userAddress: Address, chainId?: number): Promise<LiquidityPosition[]> {
    try {
      const cacheKey = `positions-${userAddress}-${chainId || 'all'}`
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        return cached as LiquidityPosition[]
      }

      const positions = await this.getUserPositionsFromChain(userAddress, chainId)
      this.setCache(cacheKey, positions)

      // Update positions cache
      positions.forEach(position => {
        this.positions.set(position.id, position)
      })

      return positions
    } catch (error) {
      console.error(`Failed to get user positions for ${userAddress}:`, error)
      return []
    }
  }

  /**
   * Get position by ID
   */
  async getPosition(positionId: string): Promise<LiquidityPosition | null> {
    try {
      // Check cache first
      const cached = this.positions.get(positionId)
      if (cached) {
        return cached
      }

      // In real implementation, fetch from chain
      return null
    } catch (error) {
      console.error(`Failed to get position ${positionId}:`, error)
      return null
    }
  }

  /**
   * Calculate APR for a pool
   */
  protected calculateAPR(pool: LiquidityPool): number {
    try {
      if (!pool.fees24h || !pool.tvlUSD) {
        return 0
      }

      const dailyFees = parseFloat(pool.fees24h)
      const tvl = parseFloat(pool.tvlUSD)

      if (tvl === 0) return 0

      const dailyReturn = dailyFees / tvl
      const annualReturn = dailyReturn * 365

      return annualReturn * 100 // Convert to percentage
    } catch {
      return 0
    }
  }

  /**
   * Calculate APY from APR
   */
  protected calculateAPY(apr: number, compoundingFrequency: number = 365): number {
    try {
      const r = apr / 100 // Convert percentage to decimal
      const n = compoundingFrequency
      const apy = Math.pow(1 + r / n, n) - 1
      return apy * 100 // Convert back to percentage
    } catch {
      return apr // Fallback to APR if calculation fails
    }
  }

  /**
   * Calculate impermanent loss
   */
  protected calculateImpermanentLoss(
    entryPrices: number[],
    currentPrices: number[],
    weights?: number[]
  ): number {
    try {
      if (entryPrices.length !== currentPrices.length) {
        return 0
      }

      // For constant product pools (50/50)
      if (!weights || weights.every(w => w === 0.5)) {
        const priceRatio = currentPrices[1] / currentPrices[0] / (entryPrices[1] / entryPrices[0])
        const holdValue = 1
        const poolValue = 2 * Math.sqrt(priceRatio) / (1 + priceRatio)
        return (poolValue / holdValue - 1) * 100
      }

      // For weighted pools (simplified calculation)
      let holdValue = 0
      let poolValue = 0

      for (let i = 0; i < entryPrices.length; i++) {
        const weight = weights[i] || 1 / entryPrices.length
        holdValue += weight * (currentPrices[i] / entryPrices[i])
        poolValue += weight * Math.pow(currentPrices[i] / entryPrices[i], weight)
      }

      return (poolValue / holdValue - 1) * 100
    } catch {
      return 0
    }
  }

  /**
   * Validate pool creation request
   */
  protected validatePoolCreation(request: PoolCreationRequest): void {
    if (!request.tokens || request.tokens.length < 2) {
      throw this.createError('INVALID_PARAMETERS', 'Pool must have at least 2 tokens')
    }

    if (request.tokens.length > 8) {
      throw this.createError('INVALID_PARAMETERS', 'Pool cannot have more than 8 tokens')
    }

    if (request.weights && request.weights.length !== request.tokens.length) {
      throw this.createError('INVALID_PARAMETERS', 'Weights array must match tokens array length')
    }

    if (request.weights) {
      const totalWeight = request.weights.reduce((sum, weight) => sum + weight, 0)
      if (Math.abs(totalWeight - 1) > 0.001) {
        throw this.createError('INVALID_PARAMETERS', 'Weights must sum to 1')
      }
    }

    if (request.initialAmounts.length !== request.tokens.length) {
      throw this.createError('INVALID_PARAMETERS', 'Initial amounts must match tokens array length')
    }

    // Check for duplicate tokens
    const tokenAddresses = request.tokens.map(t => t.address.toLowerCase())
    const uniqueAddresses = new Set(tokenAddresses)
    if (uniqueAddresses.size !== tokenAddresses.length) {
      throw this.createError('INVALID_PARAMETERS', 'Duplicate tokens not allowed')
    }
  }

  /**
   * Validate liquidity request
   */
  protected validateLiquidityRequest(request: AddLiquidityRequest | RemoveLiquidityRequest): void {
    if (!request.poolId) {
      throw this.createError('INVALID_PARAMETERS', 'Pool ID is required')
    }

    if (!request.userAddress) {
      throw this.createError('INVALID_PARAMETERS', 'User address is required')
    }

    if (request.deadline && request.deadline < Date.now()) {
      throw this.createError('DEADLINE_EXCEEDED', 'Transaction deadline has passed')
    }
  }

  /**
   * Apply filters to pools
   */
  private applyFilters(pools: LiquidityPool[], filter?: PoolFilter): LiquidityPool[] {
    if (!filter) return pools

    return pools.filter(pool => {
      if (filter.chainIds && !filter.chainIds.includes(pool.chainId)) return false
      if (filter.types && !filter.types.includes(pool.type)) return false
      if (filter.feeTiers && !filter.feeTiers.includes(pool.feeTier)) return false
      if (filter.verified !== undefined && pool.metadata?.verified !== filter.verified) return false
      if (filter.featured !== undefined && pool.metadata?.featured !== filter.featured) return false

      if (filter.minTVL && parseFloat(pool.tvlUSD) < parseFloat(filter.minTVL)) return false
      if (filter.maxTVL && parseFloat(pool.tvlUSD) > parseFloat(filter.maxTVL)) return false
      if (filter.minAPR && pool.apr < filter.minAPR) return false
      if (filter.maxAPR && pool.apr > filter.maxAPR) return false

      if (filter.riskLevels && pool.metadata?.riskLevel && !filter.riskLevels.includes(pool.metadata.riskLevel)) return false

      if (filter.tokens) {
        const poolTokens = pool.tokens.map(t => t.address.toLowerCase())
        const hasRequiredToken = filter.tokens.some(addr =>
          poolTokens.includes(addr.toLowerCase())
        )
        if (!hasRequiredToken) return false
      }

      return true
    })
  }

  /**
   * Apply search query to pools
   */
  private applySearchQuery(pools: LiquidityPool[], query: string): LiquidityPool[] {
    const searchTerm = query.toLowerCase()

    return pools.filter(pool => {
      // Search in pool metadata
      if (pool.metadata?.name?.toLowerCase().includes(searchTerm)) return true
      if (pool.metadata?.description?.toLowerCase().includes(searchTerm)) return true

      // Search in token symbols and names
      const tokenMatch = pool.tokens.some(token =>
        token.symbol.toLowerCase().includes(searchTerm) ||
        token.name.toLowerCase().includes(searchTerm)
      )
      if (tokenMatch) return true

      // Search in pool address
      if (pool.address.toLowerCase().includes(searchTerm)) return true

      return false
    })
  }

  /**
   * Apply sorting to pools
   */
  private applySorting(pools: LiquidityPool[], sort: { field: string; order: 'asc' | 'desc' }): LiquidityPool[] {
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

  /**
   * Cache management
   */
  protected getFromCache(key: string): unknown | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > this.config.cacheTimeout) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  protected setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  private getSearchCacheKey(request: PoolSearchRequest): string {
    return `search-${JSON.stringify(request)}`
  }

  /**
   * Error handling
   */
  protected createError(code: PoolErrorCode, message: string, details?: Record<string, unknown>): PoolError {
    return {
      code,
      message,
      details,
    }
  }

  /**
   * Utility methods
   */
  protected formatAmount(amount: string, decimals: number): string {
    return (parseFloat(amount) * Math.pow(10, decimals)).toString()
  }

  protected parseAmount(amount: string, decimals: number): string {
    return (parseFloat(amount) / Math.pow(10, decimals)).toString()
  }

  protected generatePoolId(): string {
    return `pool-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }

  protected generatePositionId(): string {
    return `pos-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.cache.clear()
    this.pools.clear()
    this.positions.clear()
  }
}

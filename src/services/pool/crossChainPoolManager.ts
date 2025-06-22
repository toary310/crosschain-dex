import { Token } from '@/config/tokens'
import { Address } from 'viem'
import { PoolManager } from './poolManager'
import {
    AddLiquidityRequest,
    LiquidityPool,
    LiquidityPosition,
    PoolSearchRequest,
    PoolSearchResponse
} from './types'

export interface CrossChainPool extends LiquidityPool {
  // Cross-chain specific properties
  bridgeTokens: Token[] // Tokens that can be bridged to this pool
  supportedChains: number[]
  crossChainLiquidity: Record<number, string> // TVL per chain
  bridgeRoutes: BridgeRoute[]
  unifiedPoolId: string // ID that links pools across chains
}

export interface BridgeRoute {
  fromChainId: number
  toChainId: number
  bridgeProtocol: string
  bridgeAddress: Address
  estimatedTime: number // seconds
  estimatedCost: string // in native token
  supported: boolean
}

export interface CrossChainPosition extends LiquidityPosition {
  // Cross-chain specific properties
  sourceChain: number
  bridgedFrom?: {
    chainId: number
    originalAmount: string
    bridgeTransactionHash: string
    bridgedAt: number
  }
  canBridge: boolean
  bridgeOptions: BridgeRoute[]
}

export interface CrossChainLiquidityRequest extends AddLiquidityRequest {
  sourceChainId?: number
  bridgeTokens?: boolean
  maxBridgeCost?: string
  bridgeDeadline?: number
}

export interface ChainConfig {
  chainId: number
  name: string
  rpcUrl: string
  explorerUrl: string
  nativeToken: Token
  supportedProtocols: string[]
  bridgeContracts: Record<string, Address>
  gasMultiplier: number
  enabled: boolean
}

export interface CrossChainStats {
  totalChains: number
  totalPools: number
  totalTVL: string
  chainDistribution: Record<number, {
    pools: number
    tvl: string
    volume24h: string
  }>
  bridgeVolume24h: string
  crossChainPositions: number
}

const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  1: {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
    explorerUrl: 'https://etherscan.io',
    nativeToken: {
      address: '0x0000000000000000000000000000000000000000' as Address,
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      chainId: 1,
      verified: true,
      riskLevel: 'low',
    },
    supportedProtocols: ['uniswap-v3', 'uniswap-v2'],
    bridgeContracts: {
      layerzero: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675' as Address,
    },
    gasMultiplier: 1.0,
    enabled: true,
  },
  137: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/your-api-key',
    explorerUrl: 'https://polygonscan.com',
    nativeToken: {
      address: '0x0000000000000000000000000000000000000000' as Address,
      symbol: 'MATIC',
      name: 'Polygon',
      decimals: 18,
      chainId: 137,
      verified: true,
      riskLevel: 'low',
    },
    supportedProtocols: ['uniswap-v3', 'quickswap'],
    bridgeContracts: {
      layerzero: '0x3c2269811836af69497E5F486A85D7316753cf62' as Address,
    },
    gasMultiplier: 0.1,
    enabled: true,
  },
  42161: {
    chainId: 42161,
    name: 'Arbitrum',
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/your-api-key',
    explorerUrl: 'https://arbiscan.io',
    nativeToken: {
      address: '0x0000000000000000000000000000000000000000' as Address,
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      chainId: 42161,
      verified: true,
      riskLevel: 'low',
    },
    supportedProtocols: ['uniswap-v3', 'camelot'],
    bridgeContracts: {
      layerzero: '0x3c2269811836af69497E5F486A85D7316753cf62' as Address,
    },
    gasMultiplier: 0.05,
    enabled: true,
  },
}

export class CrossChainPoolManager {
  private chainManagers: Map<number, PoolManager> = new Map()
  private chainConfigs: Record<number, ChainConfig>
  private unifiedPools: Map<string, CrossChainPool[]> = new Map()
  private bridgeRoutes: Map<string, BridgeRoute> = new Map()

  constructor(chainConfigs: Record<number, ChainConfig> = SUPPORTED_CHAINS) {
    this.chainConfigs = chainConfigs
    this.initializeChainManagers()
    this.initializeBridgeRoutes()
  }

  /**
   * Initialize pool managers for each supported chain
   */
  private initializeChainManagers(): void {
    Object.values(this.chainConfigs).forEach(config => {
      if (config.enabled) {
        const manager = new PoolManager({
          enabledProtocols: config.supportedProtocols,
        })
        this.chainManagers.set(config.chainId, manager)
      }
    })
  }

  /**
   * Initialize bridge routes between chains
   */
  private initializeBridgeRoutes(): void {
    const chains = Object.keys(this.chainConfigs).map(Number)

    chains.forEach(fromChain => {
      chains.forEach(toChain => {
        if (fromChain !== toChain) {
          const routeKey = `${fromChain}-${toChain}`
          const route: BridgeRoute = {
            fromChainId: fromChain,
            toChainId: toChain,
            bridgeProtocol: 'layerzero',
            bridgeAddress: this.chainConfigs[fromChain].bridgeContracts.layerzero,
            estimatedTime: this.estimateBridgeTime(fromChain, toChain),
            estimatedCost: this.estimateBridgeCost(fromChain, toChain),
            supported: true,
          }
          this.bridgeRoutes.set(routeKey, route)
        }
      })
    })
  }

  /**
   * Search pools across all chains
   */
  async searchPoolsAcrossChains(request: PoolSearchRequest): Promise<PoolSearchResponse> {
    try {
      const allResults: PoolSearchResponse[] = []

      // Search on each chain
      for (const [chainId, manager] of this.chainManagers) {
        try {
          const chainRequest = {
            ...request,
            filter: {
              ...request.filter,
              chainIds: [chainId],
            },
          }

          const result = await manager.searchPools(chainRequest)
          allResults.push(result)
        } catch (error) {
          console.warn(`Failed to search pools on chain ${chainId}:`, error)
        }
      }

      // Combine results
      const combinedPools = allResults.flatMap(result => result.pools)
      const enhancedPools = await this.enhancePoolsWithCrossChainData(combinedPools)

      // Apply cross-chain specific sorting and filtering
      const sortedPools = this.sortCrossChainPools(enhancedPools, request.sort)

      // Apply pagination
      const pagination = request.pagination || { page: 1, limit: 20 }
      const startIndex = (pagination.page - 1) * pagination.limit
      const endIndex = startIndex + pagination.limit
      const paginatedPools = sortedPools.slice(startIndex, endIndex)

      return {
        pools: paginatedPools,
        total: sortedPools.length,
        page: pagination.page,
        limit: pagination.limit,
        hasMore: endIndex < sortedPools.length,
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to search cross-chain pools')
    }
  }

  /**
   * Get unified pools (same pool across multiple chains)
   */
  async getUnifiedPools(): Promise<Map<string, CrossChainPool[]>> {
    try {
      const unifiedPools = new Map<string, CrossChainPool[]>()

      // Group pools by token pairs
      for (const [chainId, manager] of this.chainManagers) {
        try {
          const pools = await manager.getPools()

          pools.forEach(pool => {
            const poolKey = this.generateUnifiedPoolKey(pool)
            const crossChainPool = this.convertToCrossChainPool(pool)

            if (!unifiedPools.has(poolKey)) {
              unifiedPools.set(poolKey, [])
            }

            unifiedPools.get(poolKey)!.push(crossChainPool)
          })
        } catch (error) {
          console.warn(`Failed to get pools from chain ${chainId}:`, error)
        }
      }

      this.unifiedPools = unifiedPools
      return unifiedPools
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to get unified pools')
    }
  }

  /**
   * Add liquidity with cross-chain bridging
   */
  async addCrossChainLiquidity(request: CrossChainLiquidityRequest): Promise<{
    bridgeTransaction?: any
    liquidityTransaction: any
    estimatedTime: number
    totalCost: string
  }> {
    try {
      const pool = await this.getPool(request.poolId)
      if (!pool) {
        throw new Error('Pool not found')
      }

      const targetChainId = pool.chainId
      const sourceChainId = request.sourceChainId || targetChainId

      let bridgeTransaction: any = undefined
      let totalCost = '0'
      let estimatedTime = 0

      // If cross-chain bridging is needed
      if (sourceChainId !== targetChainId && request.bridgeTokens) {
        const bridgeRoute = this.getBridgeRoute(sourceChainId, targetChainId)
        if (!bridgeRoute) {
          throw new Error(`No bridge route available from chain ${sourceChainId} to ${targetChainId}`)
        }

        // Create bridge transaction
        bridgeTransaction = await this.createBridgeTransaction(
          request.tokenAmounts,
          sourceChainId,
          targetChainId,
          request.userAddress
        )

        totalCost = bridgeRoute.estimatedCost
        estimatedTime = bridgeRoute.estimatedTime
      }

      // Create liquidity transaction on target chain
      const targetManager = this.chainManagers.get(targetChainId)
      if (!targetManager) {
        throw new Error(`Chain ${targetChainId} not supported`)
      }

      const liquidityResponse = await targetManager.addLiquidity(request)
      if (!liquidityResponse.success) {
        throw new Error(liquidityResponse.error || 'Failed to add liquidity')
      }

      return {
        bridgeTransaction,
        liquidityTransaction: liquidityResponse.transaction,
        estimatedTime: estimatedTime + 300, // Add 5 minutes for liquidity transaction
        totalCost: (parseFloat(totalCost) + parseFloat(liquidityResponse.transaction?.gas?.toString() || '0')).toString(),
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to add cross-chain liquidity')
    }
  }

  /**
   * Get user positions across all chains
   */
  async getCrossChainPositions(userAddress: Address): Promise<CrossChainPosition[]> {
    try {
      const allPositions: CrossChainPosition[] = []

      for (const [chainId, manager] of this.chainManagers) {
        try {
          const positions = await manager.getUserPositions(userAddress, chainId)
          const crossChainPositions = positions.map(pos => this.convertToCrossChainPosition(pos, chainId))
          allPositions.push(...crossChainPositions)
        } catch (error) {
          console.warn(`Failed to get positions from chain ${chainId}:`, error)
        }
      }

      return allPositions.sort((a, b) => parseFloat(b.totalValueUSD) - parseFloat(a.totalValueUSD))
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to get cross-chain positions')
    }
  }

  /**
   * Get cross-chain statistics
   */
  async getCrossChainStats(): Promise<CrossChainStats> {
    try {
      const stats: CrossChainStats = {
        totalChains: 0,
        totalPools: 0,
        totalTVL: '0',
        chainDistribution: {},
        bridgeVolume24h: '0',
        crossChainPositions: 0,
      }

      let totalTVL = 0

      for (const [chainId, manager] of this.chainManagers) {
        try {
          const pools = await manager.getPools()
          const chainTVL = pools.reduce((sum, pool) => sum + parseFloat(pool.tvlUSD), 0)
          const chainVolume = pools.reduce((sum, pool) => sum + parseFloat(pool.volume24h), 0)

          stats.chainDistribution[chainId] = {
            pools: pools.length,
            tvl: chainTVL.toString(),
            volume24h: chainVolume.toString(),
          }

          stats.totalPools += pools.length
          totalTVL += chainTVL
          stats.totalChains++
        } catch (error) {
          console.warn(`Failed to get stats from chain ${chainId}:`, error)
        }
      }

      stats.totalTVL = totalTVL.toString()

      // Mock bridge volume (would be calculated from actual bridge data)
      stats.bridgeVolume24h = (totalTVL * 0.05).toString() // 5% of TVL as daily bridge volume

      return stats
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to get cross-chain stats')
    }
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): ChainConfig[] {
    return Object.values(this.chainConfigs).filter(config => config.enabled)
  }

  /**
   * Get bridge routes
   */
  getBridgeRoutes(): BridgeRoute[] {
    return Array.from(this.bridgeRoutes.values())
  }

  /**
   * Private helper methods
   */
  private async getPool(poolId: string): Promise<LiquidityPool | null> {
    for (const manager of this.chainManagers.values()) {
      try {
        const pool = await manager.getPool(poolId)
        if (pool) return pool
      } catch (error) {
        // Continue searching other chains
      }
    }
    return null
  }

  private getBridgeRoute(fromChainId: number, toChainId: number): BridgeRoute | null {
    return this.bridgeRoutes.get(`${fromChainId}-${toChainId}`) || null
  }

  private async enhancePoolsWithCrossChainData(pools: LiquidityPool[]): Promise<CrossChainPool[]> {
    return pools.map(pool => this.convertToCrossChainPool(pool))
  }

  private convertToCrossChainPool(pool: LiquidityPool): CrossChainPool {
    const bridgeTokens = this.findBridgeableTokens(pool.tokens)
    const supportedChains = this.findSupportedChains(pool.tokens)
    const bridgeRoutes = this.findBridgeRoutes(pool.chainId)

    return {
      ...pool,
      bridgeTokens,
      supportedChains,
      crossChainLiquidity: { [pool.chainId]: pool.tvlUSD },
      bridgeRoutes,
      unifiedPoolId: this.generateUnifiedPoolKey(pool),
    }
  }

  private convertToCrossChainPosition(position: LiquidityPosition, chainId: number): CrossChainPosition {
    const bridgeOptions = Array.from(this.bridgeRoutes.values())
      .filter(route => route.fromChainId === chainId)

    return {
      ...position,
      sourceChain: chainId,
      canBridge: bridgeOptions.length > 0,
      bridgeOptions,
    }
  }

  private findBridgeableTokens(tokens: Token[]): Token[] {
    // Find tokens that exist on multiple chains
    return tokens.filter(token => {
      // Simplified logic - in reality, would check token bridge mappings
      return ['USDC', 'USDT', 'WETH', 'WBTC'].includes(token.symbol)
    })
  }

  private findSupportedChains(tokens: Token[]): number[] {
    // Find chains where these tokens are available
    const supportedChains = new Set<number>()

    tokens.forEach(token => {
      // Simplified logic - would check actual token availability
      Object.keys(this.chainConfigs).forEach(chainId => {
        supportedChains.add(parseInt(chainId))
      })
    })

    return Array.from(supportedChains)
  }

  private findBridgeRoutes(fromChainId: number): BridgeRoute[] {
    return Array.from(this.bridgeRoutes.values())
      .filter(route => route.fromChainId === fromChainId)
  }

  private generateUnifiedPoolKey(pool: LiquidityPool): string {
    // Create a key that identifies the same pool across chains
    const tokenSymbols = pool.tokens.map(t => t.symbol).sort().join('-')
    return `${tokenSymbols}-${pool.feeTier}`
  }

  private sortCrossChainPools(pools: CrossChainPool[], sort?: any): CrossChainPool[] {
    if (!sort) return pools

    return pools.sort((a, b) => {
      switch (sort.field) {
        case 'tvl':
          return sort.order === 'desc'
            ? parseFloat(b.tvlUSD) - parseFloat(a.tvlUSD)
            : parseFloat(a.tvlUSD) - parseFloat(b.tvlUSD)
        case 'chains':
          return sort.order === 'desc'
            ? b.supportedChains.length - a.supportedChains.length
            : a.supportedChains.length - b.supportedChains.length
        default:
          return 0
      }
    })
  }

  private estimateBridgeTime(fromChain: number, toChain: number): number {
    // Simplified estimation based on chain types
    if (fromChain === 1 || toChain === 1) return 900 // 15 minutes for Ethereum
    return 300 // 5 minutes for L2s
  }

  private estimateBridgeCost(fromChain: number, toChain: number): string {
    // Simplified cost estimation
    const fromConfig = this.chainConfigs[fromChain]
    const baseCost = fromChain === 1 ? 0.01 : 0.001 // ETH or equivalent
    return (baseCost * fromConfig.gasMultiplier).toString()
  }

  private async createBridgeTransaction(
    amounts: string[],
    fromChain: number,
    toChain: number,
    userAddress: Address
  ): Promise<any> {
    // Placeholder for bridge transaction creation
    const bridgeRoute = this.getBridgeRoute(fromChain, toChain)
    if (!bridgeRoute) {
      throw new Error('Bridge route not found')
    }

    return {
      to: bridgeRoute.bridgeAddress,
      data: '0x', // Would encode actual bridge call
      value: '0',
      gasLimit: '200000',
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.chainManagers.forEach(manager => manager.destroy())
    this.chainManagers.clear()
    this.unifiedPools.clear()
    this.bridgeRoutes.clear()
  }
}

// Export singleton instance
export const crossChainPoolManager = new CrossChainPoolManager()

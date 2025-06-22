import { Address, TransactionRequest } from 'viem'
import { BasePoolService } from './basePoolService'
import {
    AddLiquidityRequest,
    AddLiquidityResponse,
    FeeTier,
    LiquidityPool,
    LiquidityPosition,
    PoolCreationRequest,
    PoolType,
    RemoveLiquidityRequest,
    RemoveLiquidityResponse
} from './types'

interface UniswapV3Config {
  factoryAddress: Address
  positionManagerAddress: Address
  quoterAddress: Address
  routerAddress: Address
  subgraphUrl: string
}

const UNISWAP_V3_CONFIGS: Record<number, UniswapV3Config> = {
  1: { // Ethereum
    factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984' as Address,
    positionManagerAddress: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88' as Address,
    quoterAddress: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6' as Address,
    routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564' as Address,
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
  },
  137: { // Polygon
    factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984' as Address,
    positionManagerAddress: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88' as Address,
    quoterAddress: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6' as Address,
    routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564' as Address,
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon',
  },
  42161: { // Arbitrum
    factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984' as Address,
    positionManagerAddress: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88' as Address,
    quoterAddress: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6' as Address,
    routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564' as Address,
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal',
  },
}

interface UniswapV3Pool {
  id: string
  token0: {
    id: string
    symbol: string
    name: string
    decimals: string
  }
  token1: {
    id: string
    symbol: string
    name: string
    decimals: string
  }
  feeTier: string
  liquidity: string
  sqrtPrice: string
  tick: string
  token0Price: string
  token1Price: string
  volumeUSD: string
  tvlUSD: string
  feesUSD: string
  createdAtTimestamp: string
}

interface UniswapV3Position {
  id: string
  owner: string
  pool: {
    id: string
    token0: UniswapV3Pool['token0']
    token1: UniswapV3Pool['token1']
    feeTier: string
  }
  tickLower: {
    tickIdx: string
  }
  tickUpper: {
    tickIdx: string
  }
  liquidity: string
  depositedToken0: string
  depositedToken1: string
  withdrawnToken0: string
  withdrawnToken1: string
  collectedFeesToken0: string
  collectedFeesToken1: string
}

export class UniswapV3Service extends BasePoolService {
  private chainConfigs: Record<number, UniswapV3Config>

  constructor(config: Record<string, unknown> = {}) {
    super('uniswap-v3', config)
    this.chainConfigs = UNISWAP_V3_CONFIGS
  }

  /**
   * Create a new Uniswap V3 pool
   */
  async createPool(request: PoolCreationRequest): Promise<{ poolId: string; transaction: TransactionRequest }> {
    try {
      this.validatePoolCreation(request)

      if (request.tokens.length !== 2) {
        throw this.createError('INVALID_PARAMETERS', 'Uniswap V3 pools must have exactly 2 tokens')
      }

      const chainId = request.tokens[0].chainId
      const config = this.chainConfigs[chainId]
      if (!config) {
        throw this.createError('NETWORK_ERROR', `Uniswap V3 not supported on chain ${chainId}`)
      }

      // Sort tokens (token0 < token1)
      const [token0, token1] = request.tokens[0].address.toLowerCase() < request.tokens[1].address.toLowerCase()
        ? [request.tokens[0], request.tokens[1]]
        : [request.tokens[1], request.tokens[0]]

      // Calculate initial price from amounts
      const amount0 = parseFloat(request.initialAmounts[0])
      const amount1 = parseFloat(request.initialAmounts[1])
      const price = amount1 / amount0
      const sqrtPriceX96 = this.priceToSqrtPriceX96(price)

      const poolId = this.generatePoolId()

      // Create transaction data for pool creation
      const transaction: TransactionRequest = {
        to: config.factoryAddress,
        data: this.encodeCreatePoolData(token0.address, token1.address, request.feeTier, sqrtPriceX96),
        value: BigInt(0),
        gas: BigInt(500000),
      }

      return { poolId, transaction }
    } catch (error) {
      throw error instanceof Error ? error : this.createError('UNKNOWN_ERROR', 'Failed to create pool')
    }
  }

  /**
   * Add liquidity to a Uniswap V3 pool
   */
  async addLiquidity(request: AddLiquidityRequest): Promise<AddLiquidityResponse> {
    try {
      this.validateLiquidityRequest(request)

      const pool = await this.getPool(request.poolId)
      if (!pool) {
        throw this.createError('POOL_NOT_FOUND', 'Pool not found')
      }

      if (pool.status !== 'active') {
        throw this.createError('POOL_PAUSED', 'Pool is not active')
      }

      const chainId = pool.chainId
      const config = this.chainConfigs[chainId]
      if (!config) {
        throw this.createError('NETWORK_ERROR', `Uniswap V3 not supported on chain ${chainId}`)
      }

      // Calculate position parameters
      const tickLower = this.calculateTickLower(pool)
      const tickUpper = this.calculateTickUpper(pool)
      const liquidity = this.calculateLiquidity(request.tokenAmounts, pool)

      // Calculate expected shares (for V3, this is the liquidity amount)
      const expectedShares = liquidity

      // Calculate price impact
      const priceImpact = this.calculatePriceImpact(request.tokenAmounts, pool)

      // Create transaction data
      const transaction: TransactionRequest = {
        to: config.positionManagerAddress,
        data: this.encodeMintData({
          token0: pool.tokens[0].address,
          token1: pool.tokens[1].address,
          fee: pool.feeTier,
          tickLower,
          tickUpper,
          amount0Desired: request.tokenAmounts[0],
          amount1Desired: request.tokenAmounts[1],
          amount0Min: this.calculateMinAmount(request.tokenAmounts[0], 0.5), // 0.5% slippage
          amount1Min: this.calculateMinAmount(request.tokenAmounts[1], 0.5),
          recipient: request.userAddress,
          deadline: request.deadline,
        }),
        value: BigInt(0),
        gas: BigInt(300000),
      }

      return {
        success: true,
        transaction,
        expectedShares,
        priceImpact,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add liquidity',
      }
    }
  }

  /**
   * Remove liquidity from a Uniswap V3 pool
   */
  async removeLiquidity(request: RemoveLiquidityRequest): Promise<RemoveLiquidityResponse> {
    try {
      this.validateLiquidityRequest(request)

      const pool = await this.getPool(request.poolId)
      if (!pool) {
        throw this.createError('POOL_NOT_FOUND', 'Pool not found')
      }

      const chainId = pool.chainId
      const config = this.chainConfigs[chainId]
      if (!config) {
        throw this.createError('NETWORK_ERROR', `Uniswap V3 not supported on chain ${chainId}`)
      }

      // For V3, we need the position token ID (simplified here)
      const tokenId = parseInt(request.shares) // In real implementation, this would be the NFT token ID

      // Calculate expected amounts
      const expectedAmounts = this.calculateRemovalAmounts(request.shares, pool)

      // Calculate price impact
      const priceImpact = this.calculateRemovalPriceImpact(request.shares, pool)

      // Create transaction data
      const transaction: TransactionRequest = {
        to: config.positionManagerAddress,
        data: this.encodeDecreaseLiquidityData({
          tokenId,
          liquidity: request.shares,
          amount0Min: request.minTokenAmounts[0],
          amount1Min: request.minTokenAmounts[1],
          deadline: request.deadline,
        }),
        value: BigInt(0),
        gas: BigInt(250000),
      }

      return {
        success: true,
        transaction,
        expectedAmounts,
        priceImpact,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove liquidity',
      }
    }
  }

  /**
   * Get pool data from chain/subgraph
   */
  async getPoolFromChain(poolId: string): Promise<LiquidityPool | null> {
    try {
      // In real implementation, this would query the subgraph
      const mockPool: LiquidityPool = {
        id: poolId,
        address: '0x1234567890123456789012345678901234567890' as Address,
        type: 'concentrated' as PoolType,
        version: 'v3',
        status: 'active',
        chainId: 1,
        tokens: [
          {
            address: '0xA0b86a33E6441b8dB4B2b8b8b8b8b8b8b8b8b8b8' as Address,
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            chainId: 1,
            verified: true,
            riskLevel: 'low',
          },
          {
            address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address,
            symbol: 'WETH',
            name: 'Wrapped Ether',
            decimals: 18,
            chainId: 1,
            verified: true,
            riskLevel: 'low',
          },
        ],
        feeTier: 3000 as FeeTier,
        reserves: ['1000000000000', '500000000000000000000'],
        totalSupply: '1000000000000000000',
        tvl: '2000000000000000000000',
        tvlUSD: '2000000',
        volume24h: '100000000000000000000',
        volume7d: '700000000000000000000',
        fees24h: '1000000000000000000',
        fees7d: '7000000000000000000',
        apr: 12.5,
        apy: 13.2,
        swapFee: 0.3,
        protocolFee: 0.05,
        tickSpacing: 60,
        createdAt: Date.now() - 86400000,
        lastUpdated: Date.now(),
        metadata: {
          name: 'USDC/WETH 0.3%',
          tags: ['stable', 'major'],
          verified: true,
          featured: true,
          riskLevel: 'low',
          category: 'volatile',
        },
      }

      return mockPool
    } catch (error) {
      console.error(`Failed to fetch pool ${poolId} from chain:`, error)
      return null
    }
  }

  /**
   * Get user positions from chain/subgraph
   */
  async getUserPositionsFromChain(userAddress: Address, chainId?: number): Promise<LiquidityPosition[]> {
    try {
      // In real implementation, this would query the subgraph
      const mockPosition: LiquidityPosition = {
        id: this.generatePositionId(),
        poolId: 'mock-pool-id',
        userAddress,
        liquidity: '1000000000000000000',
        shares: '1000000000000000000',
        sharePercentage: 0.1,
        tokenAmounts: ['1000000000', '500000000000000000'],
        tokenAmountsUSD: ['1000', '1000'],
        totalValueUSD: '2000',
        entryPrice: ['1', '2000'],
        currentPrice: ['1', '2100'],
        pnl: '100',
        pnlPercentage: 5,
        impermanentLoss: '-10',
        impermanentLossPercentage: -0.5,
        unclaimedRewards: [
          {
            token: {
              address: '0xA0b86a33E6441b8dB4B2b8b8b8b8b8b8b8b8b8b8' as Address,
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              chainId: 1,
              verified: true,
              riskLevel: 'low',
            },
            amount: '10000000',
            amountUSD: '10',
            apr: 5,
            source: 'trading_fees',
          },
        ],
        claimedRewards: [],
        totalRewardsUSD: '10',
        createdAt: Date.now() - 86400000,
        lastUpdated: Date.now(),
        tickLower: -887220,
        tickUpper: 887220,
        inRange: true,
      }

      return [mockPosition]
    } catch (error) {
      console.error(`Failed to fetch positions for ${userAddress}:`, error)
      return []
    }
  }

  /**
   * Private helper methods
   */
  private priceToSqrtPriceX96(price: number): string {
    const sqrtPrice = Math.sqrt(price)
    const sqrtPriceX96 = sqrtPrice * Math.pow(2, 96)
    return Math.floor(sqrtPriceX96).toString()
  }

  private calculateTickLower(pool: LiquidityPool): number {
    // Simplified calculation - in real implementation, this would be based on user input
    return -887220 // Full range for simplicity
  }

  private calculateTickUpper(pool: LiquidityPool): number {
    // Simplified calculation - in real implementation, this would be based on user input
    return 887220 // Full range for simplicity
  }

  private calculateLiquidity(amounts: string[], pool: LiquidityPool): string {
    // Simplified liquidity calculation
    const amount0 = parseFloat(amounts[0])
    const amount1 = parseFloat(amounts[1])
    return Math.sqrt(amount0 * amount1).toString()
  }

  private calculatePriceImpact(amounts: string[], pool: LiquidityPool): number {
    // Simplified price impact calculation
    const totalValue = amounts.reduce((sum, amount) => sum + parseFloat(amount), 0)
    const poolTVL = parseFloat(pool.tvlUSD)
    return (totalValue / poolTVL) * 100
  }

  private calculateMinAmount(amount: string, slippage: number): string {
    const amountNum = parseFloat(amount)
    const minAmount = amountNum * (1 - slippage / 100)
    return minAmount.toString()
  }

  private calculateRemovalAmounts(shares: string, pool: LiquidityPool): string[] {
    // Simplified calculation
    const shareRatio = parseFloat(shares) / parseFloat(pool.totalSupply)
    return pool.reserves.map(reserve => (parseFloat(reserve) * shareRatio).toString())
  }

  private calculateRemovalPriceImpact(shares: string, pool: LiquidityPool): number {
    // Simplified calculation
    const shareRatio = parseFloat(shares) / parseFloat(pool.totalSupply)
    return shareRatio * 100
  }

  private encodeCreatePoolData(token0: Address, token1: Address, fee: FeeTier, sqrtPriceX96: string): `0x${string}` {
    // Placeholder for actual encoding
    return '0x' as `0x${string}`
  }

  private encodeMintData(params: Record<string, unknown>): `0x${string}` {
    // Placeholder for actual encoding
    return '0x' as `0x${string}`
  }

  private encodeDecreaseLiquidityData(params: Record<string, unknown>): `0x${string}` {
    // Placeholder for actual encoding
    return '0x' as `0x${string}`
  }
}

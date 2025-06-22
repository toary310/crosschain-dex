import { Token } from '@/config/tokens'
import { Address } from 'viem'
import { BaseBridgeService } from './baseBridgeService'
import {
    BridgeApiResponse,
    BridgeConfig,
    BridgeParams,
    BridgeQuote,
    BridgeRequest,
    BridgeRoute,
    BridgeStatus,
    BridgeTransaction,
    LayerZeroConfig,
    LiquidityInfo
} from './types'

interface LayerZeroBridgeConfig extends BridgeConfig {
  stargateApiUrl: string
  layerZeroScanUrl: string
  endpoints: Record<number, LayerZeroConfig>
}

interface StargateQuoteResponse {
  amountLD: string
  minAmountLD: string
  eqFee: string
  eqReward: string
  lpFee: string
  protocolFee: string
  lkbRemove: string
}

interface StargatePoolInfo {
  poolId: number
  token: string
  symbol: string
  decimals: number
  liquidity: string
  weight: string
  balance: string
}

const DEFAULT_CONFIG: LayerZeroBridgeConfig = {
  baseUrl: 'https://api.stargate.finance',
  stargateApiUrl: 'https://api.stargate.finance',
  layerZeroScanUrl: 'https://layerzeroscan.com',
  timeout: 15000,
  retryAttempts: 3,
  retryDelay: 2000,
  maxSlippage: 5,
  defaultDeadline: 30,
  gasMultiplier: 1.3,
  endpoints: {
    1: { // Ethereum
      endpoint: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675' as Address,
      chainId: 101,
      confirmations: 15,
      oracle: '0x5a54fe5234E811466D5366846283323c954310B2' as Address,
      relayer: '0x902F09715B6303d4173037652FA7377e5b98089E' as Address,
    },
    137: { // Polygon
      endpoint: '0x3c2269811836af69497E5F486A85D7316753cf62' as Address,
      chainId: 109,
      confirmations: 512,
      oracle: '0x5a54fe5234E811466D5366846283323c954310B2' as Address,
      relayer: '0x75dC8e5F50C8221a82CA6aF64aF811caA983B65f' as Address,
    },
    42161: { // Arbitrum
      endpoint: '0x3c2269811836af69497E5F486A85D7316753cf62' as Address,
      chainId: 110,
      confirmations: 20,
      oracle: '0x5a54fe5234E811466D5366846283323c954310B2' as Address,
      relayer: '0x177d36dBE2271A4DdB2Ad8304d82628eb921d790' as Address,
    },
    10: { // Optimism
      endpoint: '0x3c2269811836af69497E5F486A85D7316753cf62' as Address,
      chainId: 111,
      confirmations: 20,
      oracle: '0x5a54fe5234E811466D5366846283323c954310B2' as Address,
      relayer: '0x81E792e5a9003CC1C8BF5569A00f34b65d75b017' as Address,
    },
    43114: { // Avalanche
      endpoint: '0x3c2269811836af69497E5F486A85D7316753cf62' as Address,
      chainId: 106,
      confirmations: 12,
      oracle: '0x5a54fe5234E811466D5366846283323c954310B2' as Address,
      relayer: '0x81E792e5a9003CC1C8BF5569A00f34b65d75b017' as Address,
    },
  },
}

export class LayerZeroService extends BaseBridgeService {
  private layerZeroConfig: LayerZeroBridgeConfig

  constructor(config: Partial<LayerZeroBridgeConfig> = {}) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }
    super('layerzero', mergedConfig)
    this.layerZeroConfig = mergedConfig
  }

  /**
   * Get bridge quote from Stargate
   */
  async getQuote(request: BridgeRequest): Promise<BridgeApiResponse<BridgeQuote>> {
    try {
      this.validateBridgeRequest(request)

      // Check if route is supported
      if (!(await this.isRouteSupported(request.fromChain, request.toChain, request.fromToken))) {
        throw this.createError('ROUTE_NOT_FOUND', 'Route not supported by LayerZero/Stargate')
      }

      const quote = await this.getStargateQuote(request)
      return this.createResponse(quote)
    } catch (error) {
      const bridgeError = error instanceof Error
        ? this.createError('API_ERROR', error.message)
        : this.createError('UNKNOWN_ERROR', 'Failed to get quote')

      return this.createResponse(null as any, bridgeError)
    }
  }

  /**
   * Build transaction for Stargate bridge
   */
  async buildTransaction(params: BridgeParams): Promise<BridgeApiResponse<BridgeTransaction>> {
    try {
      this.validateBridgeParams(params)

      const transaction = await this.buildStargateTransaction(params)
      return this.createResponse(transaction)
    } catch (error) {
      const bridgeError = error instanceof Error
        ? this.createError('API_ERROR', error.message)
        : this.createError('UNKNOWN_ERROR', 'Failed to build transaction')

      return this.createResponse(null as any, bridgeError)
    }
  }

  /**
   * Get bridge status
   */
  async getStatus(txHash: string): Promise<BridgeApiResponse<BridgeStatus>> {
    try {
      const url = `${this.layerZeroConfig.layerZeroScanUrl}/api/tx/${txHash}`
      const response = await this.makeRequest<any>(url)

      const status: BridgeStatus = {
        id: txHash,
        status: this.mapLayerZeroStatus(response.status),
        fromTxHash: response.srcTxHash,
        toTxHash: response.dstTxHash,
        fromChain: response.srcChainId,
        toChain: response.dstChainId,
        fromAmount: response.amount,
        toAmount: response.dstAmount,
        estimatedTime: response.estimatedTime || 300, // 5 minutes default
        actualTime: response.actualTime,
        updatedAt: Date.now(),
      }

      return this.createResponse(status)
    } catch (error) {
      const bridgeError = error instanceof Error
        ? this.createError('API_ERROR', error.message)
        : this.createError('UNKNOWN_ERROR', 'Failed to get status')

      return this.createResponse(null as any, bridgeError)
    }
  }

  /**
   * Get supported chains
   */
  async getSupportedChains(): Promise<BridgeApiResponse<number[]>> {
    const chains = Object.keys(this.layerZeroConfig.endpoints).map(Number)
    return this.createResponse(chains)
  }

  /**
   * Get supported tokens for chain pair
   */
  async getSupportedTokens(fromChain: number, toChain: number): Promise<BridgeApiResponse<Token[]>> {
    try {
      const url = `${this.layerZeroConfig.stargateApiUrl}/v1/pools`
      const response = await this.makeRequest<{ pools: StargatePoolInfo[] }>(url)

      // Filter pools for the specific chains and convert to tokens
      const tokens: Token[] = response.pools
        .filter(pool => this.isPoolSupportedForChains(pool, fromChain, toChain))
        .map(pool => this.convertPoolToToken(pool, fromChain))

      return this.createResponse(tokens)
    } catch (error) {
      const bridgeError = error instanceof Error
        ? this.createError('API_ERROR', error.message)
        : this.createError('UNKNOWN_ERROR', 'Failed to get supported tokens')

      return this.createResponse([] as any, bridgeError)
    }
  }

  /**
   * Check if route is supported
   */
  async isRouteSupported(fromChain: number, toChain: number, token: Token): Promise<boolean> {
    try {
      // Check if both chains are supported
      if (!this.layerZeroConfig.endpoints[fromChain] || !this.layerZeroConfig.endpoints[toChain]) {
        return false
      }

      // Check if token is supported (simplified check for stablecoins)
      const supportedSymbols = ['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD']
      return supportedSymbols.includes(token.symbol)
    } catch {
      return false
    }
  }

  /**
   * Get liquidity information
   */
  async getLiquidity(fromChain: number, toChain: number, token: Token): Promise<BridgeApiResponse<LiquidityInfo>> {
    try {
      const url = `${this.layerZeroConfig.stargateApiUrl}/v1/pools/${fromChain}/${token.symbol}`
      const response = await this.makeRequest<StargatePoolInfo>(url)

      const liquidity: LiquidityInfo = {
        protocol: 'layerzero',
        fromChain,
        toChain,
        token,
        available: response.liquidity,
        capacity: response.balance,
        utilization: parseFloat(response.liquidity) / parseFloat(response.balance),
        lastUpdated: Date.now(),
      }

      return this.createResponse(liquidity)
    } catch (error) {
      const bridgeError = error instanceof Error
        ? this.createError('API_ERROR', error.message)
        : this.createError('UNKNOWN_ERROR', 'Failed to get liquidity')

      return this.createResponse(null as any, bridgeError)
    }
  }

  /**
   * Get Stargate quote
   */
  private async getStargateQuote(request: BridgeRequest): Promise<BridgeQuote> {
    const fromPoolId = this.getPoolId(request.fromToken.symbol, request.fromChain)
    const toPoolId = this.getPoolId(request.toToken.symbol, request.toChain)
    const amount = this.formatAmount(request.amount, request.fromToken.decimals)

    const url = `${this.layerZeroConfig.stargateApiUrl}/v1/quote`
    const params = new URLSearchParams({
      srcChainId: request.fromChain.toString(),
      dstChainId: request.toChain.toString(),
      srcPoolId: fromPoolId.toString(),
      dstPoolId: toPoolId.toString(),
      amount,
    })

    const response = await this.makeRequest<StargateQuoteResponse>(`${url}?${params}`)

    const toAmount = this.parseAmount(response.amountLD, request.toToken.decimals)
    const toAmountMin = this.calculateMinOutput(toAmount, request.slippage)
    const totalFee = this.parseAmount(
      (parseFloat(response.eqFee) + parseFloat(response.lpFee) + parseFloat(response.protocolFee)).toString(),
      request.fromToken.decimals
    )

    const route: BridgeRoute = {
      protocol: 'layerzero',
      fromChain: request.fromChain,
      toChain: request.toChain,
      fromToken: request.fromToken,
      toToken: request.toToken,
      steps: [{
        protocol: 'layerzero',
        action: 'bridge',
        fromToken: request.fromToken,
        toToken: request.toToken,
        fromAmount: request.amount,
        toAmount,
        gasEstimate: this.estimateGas(200000), // Stargate typical gas
        fee: totalFee,
        contractAddress: this.getStargateRouter(request.fromChain),
        data: '0x' as `0x${string}`,
      }],
      estimatedTime: 300, // 5 minutes typical
      confidence: 0.95,
    }

    return {
      route,
      fromAmount: request.amount,
      toAmount,
      toAmountMin,
      totalFee,
      totalGas: this.estimateGas(200000),
      estimatedTime: 300,
      priceImpact: this.calculatePriceImpact(response),
      validUntil: Date.now() + 60000, // 1 minute
      requestId: this.generateRequestId(),
    }
  }

  /**
   * Build Stargate transaction
   */
  private async buildStargateTransaction(params: BridgeParams): Promise<BridgeTransaction> {
    const { quote, userAddress, deadline } = params
    const step = quote.route.steps[0]

    // This would typically involve encoding the actual Stargate swap function call
    // For now, return a placeholder structure
    return {
      chainId: quote.route.fromChain,
      to: step.contractAddress,
      data: '0x' as `0x${string}`, // Would contain encoded function call
      value: '0',
      gasLimit: step.gasEstimate,
      gasPrice: '0', // Will be filled by wallet
    }
  }

  /**
   * Utility methods
   */
  private getPoolId(tokenSymbol: string, chainId: number): number {
    // Simplified pool ID mapping
    const poolIds: Record<string, Record<number, number>> = {
      'USDC': { 1: 1, 137: 1, 42161: 1, 10: 1, 43114: 1 },
      'USDT': { 1: 2, 137: 2, 42161: 2, 10: 2, 43114: 2 },
      'DAI': { 1: 3, 137: 3 },
    }

    return poolIds[tokenSymbol]?.[chainId] || 1
  }

  private getStargateRouter(chainId: number): Address {
    const routers: Record<number, Address> = {
      1: '0x8731d54E9D02c286767d56ac03e8037C07e01e98' as Address,
      137: '0x45A01E4e04F14f7A4a6702c74187c5F6222033cd' as Address,
      42161: '0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614' as Address,
      10: '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b' as Address,
      43114: '0x45A01E4e04F14f7A4a6702c74187c5F6222033cd' as Address,
    }

    return routers[chainId] || routers[1]
  }

  private mapLayerZeroStatus(status: string): any {
    const statusMap: Record<string, any> = {
      'PENDING': 'pending',
      'CONFIRMED': 'confirmed',
      'DELIVERED': 'completed',
      'FAILED': 'failed',
    }

    return statusMap[status] || 'pending'
  }

  private calculatePriceImpact(response: StargateQuoteResponse): number {
    // Simplified price impact calculation
    const fees = parseFloat(response.eqFee) + parseFloat(response.lpFee)
    const amount = parseFloat(response.amountLD)
    return (fees / amount) * 100
  }

  private isPoolSupportedForChains(pool: StargatePoolInfo, fromChain: number, toChain: number): boolean {
    // Simplified check - in reality would check actual pool availability
    return ['USDC', 'USDT', 'DAI'].includes(pool.symbol)
  }

  private convertPoolToToken(pool: StargatePoolInfo, chainId: number): Token {
    return {
      address: pool.token as Address,
      symbol: pool.symbol,
      name: pool.symbol,
      decimals: pool.decimals,
      chainId,
      verified: true,
      riskLevel: 'low',
    }
  }
}

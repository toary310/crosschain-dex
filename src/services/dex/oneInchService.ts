import { Token } from '@/config/tokens'
import { Address } from 'viem'
import { BaseDexService } from './baseDexService'
import {
    ApiResponse,
    DexConfig,
    QuoteRequest,
    SwapParams,
    SwapQuote,
    SwapRoute,
    SwapTransaction
} from './types'

interface OneInchConfig extends DexConfig {
  apiKey?: string
  version: string
  referrer?: Address
  fee?: number // in basis points
}

interface OneInchQuoteResponse {
  fromToken: {
    symbol: string
    name: string
    address: string
    decimals: number
    logoURI: string
  }
  toToken: {
    symbol: string
    name: string
    address: string
    decimals: number
    logoURI: string
  }
  toTokenAmount: string
  fromTokenAmount: string
  protocols: Array<{
    name: string
    part: number
    fromTokenAddress: string
    toTokenAddress: string
  }>[]
  estimatedGas: number
}

interface OneInchSwapResponse {
  fromToken: {
    symbol: string
    name: string
    address: string
    decimals: number
  }
  toToken: {
    symbol: string
    name: string
    address: string
    decimals: number
  }
  toTokenAmount: string
  fromTokenAmount: string
  protocols: any[]
  tx: {
    from: string
    to: string
    data: string
    value: string
    gasPrice: string
    gas: number
  }
}

const DEFAULT_CONFIG: OneInchConfig = {
  baseUrl: 'https://api.1inch.io',
  version: 'v5.0',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  rateLimit: {
    requests: 10,
    window: 60000, // 1 minute
  },
  gasMultiplier: 1.2,
  maxPriceImpact: 15,
  maxSlippage: 50,
}

export class OneInchService extends BaseDexService {
  private oneInchConfig: OneInchConfig

  constructor(config: Partial<OneInchConfig> = {}) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }
    super('1inch', mergedConfig)
    this.oneInchConfig = mergedConfig
  }

  /**
   * Get quote from 1inch API
   */
  async getQuote(request: QuoteRequest): Promise<ApiResponse<SwapQuote>> {
    try {
      this.validateQuoteRequest(request)

      const fromTokenAddress = this.normalizeAddress(request.fromToken.address)
      const toTokenAddress = this.normalizeAddress(request.toToken.address)
      const amount = this.formatAmount(request.amount, request.fromToken.decimals)

      const url = this.buildQuoteUrl(
        request.chainId,
        fromTokenAddress,
        toTokenAddress,
        amount,
        request.slippage
      )

      const response = await this.makeRequest<OneInchQuoteResponse>(url)
      const quote = this.parseQuoteResponse(response, request)

      return this.createResponse(quote)
    } catch (error) {
      const dexError = error instanceof Error
        ? this.createError('API_ERROR', error.message)
        : this.createError('UNKNOWN_ERROR', 'Failed to get quote')

      return this.createResponse(null as any, dexError)
    }
  }

  /**
   * Build transaction for swap
   */
  async buildTransaction(params: SwapParams): Promise<ApiResponse<SwapTransaction>> {
    try {
      this.validateSwapParams(params)

      const { quote, userAddress, deadline } = params
      const fromTokenAddress = this.normalizeAddress(quote.fromToken.address)
      const toTokenAddress = this.normalizeAddress(quote.toToken.address)
      const amount = this.formatAmount(quote.fromAmount, quote.fromToken.decimals)

      const url = this.buildSwapUrl(
        quote.fromToken.chainId,
        fromTokenAddress,
        toTokenAddress,
        amount,
        userAddress,
        quote.slippage,
        deadline
      )

      const response = await this.makeRequest<OneInchSwapResponse>(url)
      const transaction = this.parseSwapResponse(response, quote)

      return this.createResponse(transaction)
    } catch (error) {
      const dexError = error instanceof Error
        ? this.createError('API_ERROR', error.message)
        : this.createError('UNKNOWN_ERROR', 'Failed to build transaction')

      return this.createResponse(null as any, dexError)
    }
  }

  /**
   * Get supported tokens
   */
  async getSupportedTokens(chainId: number): Promise<ApiResponse<Token[]>> {
    try {
      const url = `${this.oneInchConfig.baseUrl}/${this.oneInchConfig.version}/${chainId}/tokens`

      const response = await this.makeRequest<{ tokens: Record<string, any> }>(url)
      const tokens = Object.values(response.tokens).map(this.parseTokenData)

      return this.createResponse(tokens)
    } catch (error) {
      const dexError = error instanceof Error
        ? this.createError('API_ERROR', error.message)
        : this.createError('UNKNOWN_ERROR', 'Failed to get supported tokens')

      return this.createResponse([] as any, dexError)
    }
  }

  /**
   * Check if pair is supported
   */
  async isPairSupported(fromToken: Token, toToken: Token): Promise<boolean> {
    try {
      const supportedTokensResponse = await this.getSupportedTokens(fromToken.chainId)

      if (!supportedTokensResponse.success || !supportedTokensResponse.data) {
        return false
      }

      const tokens = supportedTokensResponse.data
      const fromSupported = tokens.some(t =>
        t.address.toLowerCase() === fromToken.address.toLowerCase()
      )
      const toSupported = tokens.some(t =>
        t.address.toLowerCase() === toToken.address.toLowerCase()
      )

      return fromSupported && toSupported
    } catch {
      return false
    }
  }

  /**
   * Build quote URL
   */
  private buildQuoteUrl(
    chainId: number,
    fromToken: Address,
    toToken: Address,
    amount: string,
    slippage: number
  ): string {
    const params = new URLSearchParams({
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount,
      slippage: slippage.toString(),
    })

    if (this.oneInchConfig.fee) {
      params.append('fee', this.oneInchConfig.fee.toString())
    }

    if (this.oneInchConfig.referrer) {
      params.append('referrerAddress', this.oneInchConfig.referrer)
    }

    return `${this.oneInchConfig.baseUrl}/${this.oneInchConfig.version}/${chainId}/quote?${params}`
  }

  /**
   * Build swap URL
   */
  private buildSwapUrl(
    chainId: number,
    fromToken: Address,
    toToken: Address,
    amount: string,
    fromAddress: Address,
    slippage: number,
    deadline?: number
  ): string {
    const params = new URLSearchParams({
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount,
      fromAddress,
      slippage: slippage.toString(),
    })

    if (deadline) {
      params.append('deadline', deadline.toString())
    }

    if (this.oneInchConfig.fee) {
      params.append('fee', this.oneInchConfig.fee.toString())
    }

    if (this.oneInchConfig.referrer) {
      params.append('referrerAddress', this.oneInchConfig.referrer)
    }

    return `${this.oneInchConfig.baseUrl}/${this.oneInchConfig.version}/${chainId}/swap?${params}`
  }

  /**
   * Parse quote response
   */
  private parseQuoteResponse(response: OneInchQuoteResponse, request: QuoteRequest): SwapQuote {
    const toAmount = this.parseAmount(response.toTokenAmount, request.toToken.decimals)
    const toAmountMin = this.calculateMinOutput(toAmount, request.slippage)

    // Parse routes from protocols
    const routes: SwapRoute[] = response.protocols.flat().map(protocol => ({
      protocol: this.mapProtocolName(protocol.name),
      poolAddress: '0x0000000000000000000000000000000000000000' as Address,
      fromToken: request.fromToken,
      toToken: request.toToken,
      percentage: protocol.part,
      fee: 0, // 1inch doesn't provide individual pool fees
      liquidity: '0',
    }))

    return {
      protocol: '1inch',
      fromToken: request.fromToken,
      toToken: request.toToken,
      fromAmount: request.amount,
      toAmount,
      toAmountMin,
      priceImpact: 0, // 1inch doesn't provide price impact directly
      gasEstimate: this.estimateGas(response.estimatedGas),
      gasPrice: '0', // Will be filled by wallet
      route: routes,
      validUntil: Date.now() + 30000, // 30 seconds
      confidence: 0.95,
      slippage: request.slippage,
    }
  }

  /**
   * Parse swap response
   */
  private parseSwapResponse(response: OneInchSwapResponse, quote: SwapQuote): SwapTransaction {
    return {
      to: response.tx.to as Address,
      data: response.tx.data as `0x${string}`,
      value: response.tx.value,
      gasLimit: response.tx.gas.toString(),
      gasPrice: response.tx.gasPrice,
      chainId: quote.fromToken.chainId,
    }
  }

  /**
   * Parse token data from 1inch API
   */
  private parseTokenData(tokenData: any): Token {
    return {
      address: tokenData.address as Address,
      symbol: tokenData.symbol,
      name: tokenData.name,
      decimals: tokenData.decimals,
      chainId: 1, // Will be set by caller
      logoURI: tokenData.logoURI,
      verified: true, // 1inch tokens are considered verified
      riskLevel: 'low',
    }
  }

  /**
   * Map 1inch protocol names to our enum
   */
  private mapProtocolName(protocolName: string): any {
    const mapping: Record<string, any> = {
      'UNISWAP_V2': 'uniswap-v2',
      'UNISWAP_V3': 'uniswap-v3',
      'SUSHISWAP': 'sushiswap',
      'CURVE': 'curve',
      'BALANCER': 'balancer',
    }

    return mapping[protocolName] || 'uniswap-v2'
  }
}

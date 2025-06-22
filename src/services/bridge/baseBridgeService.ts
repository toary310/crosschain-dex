import { Address } from 'viem'
import { Token } from '@/config/tokens'
import {
  BridgeProtocol,
  BridgeConfig,
  BridgeRequest,
  BridgeQuote,
  BridgeTransaction,
  BridgeParams,
  BridgeStatus,
  BridgeError,
  BridgeErrorCode,
  BridgeApiResponse,
  LiquidityInfo,
  CapacityCheck
} from './types'

/**
 * Abstract base class for all bridge service implementations
 * Provides common functionality and enforces interface consistency
 */
export abstract class BaseBridgeService {
  protected config: BridgeConfig
  protected protocol: BridgeProtocol
  protected rateLimiter: Map<string, number[]> = new Map()

  constructor(protocol: BridgeProtocol, config: BridgeConfig) {
    this.protocol = protocol
    this.config = config
  }

  /**
   * Get bridge quote for cross-chain transfer
   */
  abstract getQuote(request: BridgeRequest): Promise<BridgeApiResponse<BridgeQuote>>

  /**
   * Build transaction for bridge execution
   */
  abstract buildTransaction(params: BridgeParams): Promise<BridgeApiResponse<BridgeTransaction>>

  /**
   * Get bridge status by transaction hash or bridge ID
   */
  abstract getStatus(id: string): Promise<BridgeApiResponse<BridgeStatus>>

  /**
   * Get supported chains for this bridge
   */
  abstract getSupportedChains(): Promise<BridgeApiResponse<number[]>>

  /**
   * Get supported tokens for specific chain pair
   */
  abstract getSupportedTokens(fromChain: number, toChain: number): Promise<BridgeApiResponse<Token[]>>

  /**
   * Check if route is supported
   */
  abstract isRouteSupported(fromChain: number, toChain: number, token: Token): Promise<boolean>

  /**
   * Get liquidity information
   */
  abstract getLiquidity(fromChain: number, toChain: number, token: Token): Promise<BridgeApiResponse<LiquidityInfo>>

  /**
   * Get protocol information
   */
  getProtocol(): BridgeProtocol {
    return this.protocol
  }

  /**
   * Get configuration
   */
  getConfig(): BridgeConfig {
    return { ...this.config }
  }

  /**
   * Rate limiting check
   */
  protected async checkRateLimit(): Promise<boolean> {
    const now = Date.now()
    const windowStart = now - 60000 // 1 minute window
    const key = this.protocol

    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, [])
    }

    const requests = this.rateLimiter.get(key)!
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => time > windowStart)
    
    // Most bridge APIs allow 60 requests per minute
    if (validRequests.length >= 60) {
      return false
    }

    // Add current request
    validRequests.push(now)
    this.rateLimiter.set(key, validRequests)
    
    return true
  }

  /**
   * Make HTTP request with retry logic
   */
  protected async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Check rate limit
        if (!(await this.checkRateLimit())) {
          throw this.createError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded')
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return data
      } catch (error) {
        lastError = error as Error
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt))
        }
      }
    }

    throw this.createError('NETWORK_ERROR', `Request failed: ${lastError?.message}`)
  }

  /**
   * Validate bridge request
   */
  protected validateBridgeRequest(request: BridgeRequest): void {
    if (!request.fromToken || !request.toToken) {
      throw this.createError('TOKEN_NOT_SUPPORTED', 'From and to tokens are required')
    }

    if (request.fromChain === request.toChain) {
      throw this.createError('CHAIN_NOT_SUPPORTED', 'Cannot bridge to the same chain')
    }

    if (!request.amount || parseFloat(request.amount) <= 0) {
      throw this.createError('AMOUNT_TOO_SMALL', 'Amount must be greater than 0')
    }

    if (request.slippage < 0 || request.slippage > this.config.maxSlippage) {
      throw this.createError('SLIPPAGE_TOO_HIGH', `Slippage must be between 0 and ${this.config.maxSlippage}%`)
    }

    if (!request.userAddress) {
      throw this.createError('UNKNOWN_ERROR', 'User address is required')
    }
  }

  /**
   * Validate bridge parameters
   */
  protected validateBridgeParams(params: BridgeParams): void {
    if (!params.quote) {
      throw this.createError('UNKNOWN_ERROR', 'Quote is required')
    }

    if (!params.userAddress) {
      throw this.createError('UNKNOWN_ERROR', 'User address is required')
    }

    // Check if quote is still valid
    if (Date.now() > params.quote.validUntil) {
      throw this.createError('DEADLINE_EXCEEDED', 'Quote has expired')
    }
  }

  /**
   * Check capacity for bridge amount
   */
  protected async checkCapacity(
    fromChain: number,
    toChain: number,
    token: Token,
    amount: string
  ): Promise<CapacityCheck> {
    try {
      const liquidityResponse = await this.getLiquidity(fromChain, toChain, token)
      
      if (!liquidityResponse.success || !liquidityResponse.data) {
        return {
          sufficient: false,
          available: '0',
          requested: amount,
        }
      }

      const available = parseFloat(liquidityResponse.data.available)
      const requested = parseFloat(amount)

      return {
        sufficient: available >= requested,
        available: liquidityResponse.data.available,
        requested: amount,
      }
    } catch {
      return {
        sufficient: false,
        available: '0',
        requested: amount,
      }
    }
  }

  /**
   * Calculate minimum output amount with slippage
   */
  protected calculateMinOutput(outputAmount: string, slippage: number): string {
    const output = parseFloat(outputAmount)
    const minOutput = output * (1 - slippage / 100)
    return minOutput.toString()
  }

  /**
   * Estimate gas for transaction
   */
  protected estimateGas(baseGas: number): string {
    return Math.ceil(baseGas * this.config.gasMultiplier).toString()
  }

  /**
   * Calculate bridge fees
   */
  protected calculateFees(amount: string, baseFee: string, protocolFeeRate: number): string {
    const amountNum = parseFloat(amount)
    const baseFeeNum = parseFloat(baseFee)
    const protocolFee = amountNum * (protocolFeeRate / 10000) // basis points to decimal
    
    return (baseFeeNum + protocolFee).toString()
  }

  /**
   * Create standardized error
   */
  protected createError(code: BridgeErrorCode, message: string, details?: any): BridgeError {
    return {
      code,
      message,
      protocol: this.protocol,
      details,
    }
  }

  /**
   * Create API response wrapper
   */
  protected createResponse<T>(
    data?: T,
    error?: BridgeError,
    requestId?: string
  ): BridgeApiResponse<T> {
    return {
      success: !error,
      data,
      error,
      timestamp: Date.now(),
      requestId: requestId || this.generateRequestId(),
    }
  }

  /**
   * Generate unique request ID
   */
  protected generateRequestId(): string {
    return `${this.protocol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Delay utility for retry logic
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Format token amount for API calls
   */
  protected formatAmount(amount: string, decimals: number): string {
    const num = parseFloat(amount)
    return (num * Math.pow(10, decimals)).toString()
  }

  /**
   * Parse token amount from API responses
   */
  protected parseAmount(amount: string, decimals: number): string {
    const num = parseFloat(amount)
    return (num / Math.pow(10, decimals)).toString()
  }

  /**
   * Normalize address (lowercase, handle native tokens)
   */
  protected normalizeAddress(address: Address): Address {
    if (address === '0x0000000000000000000000000000000000000000') {
      return address
    }
    return address.toLowerCase() as Address
  }

  /**
   * Get current timestamp in seconds
   */
  protected getCurrentTimestamp(): number {
    return Math.floor(Date.now() / 1000)
  }

  /**
   * Calculate deadline for transaction
   */
  protected calculateDeadline(minutes: number = 30): number {
    return this.getCurrentTimestamp() + (minutes * 60)
  }

  /**
   * Validate chain ID
   */
  protected isValidChainId(chainId: number): boolean {
    // Common chain IDs
    const validChains = [1, 10, 56, 137, 250, 42161, 43114, 8453]
    return validChains.includes(chainId)
  }

  /**
   * Get chain name from ID
   */
  protected getChainName(chainId: number): string {
    const chainNames: Record<number, string> = {
      1: 'ethereum',
      10: 'optimism',
      56: 'bsc',
      137: 'polygon',
      250: 'fantom',
      42161: 'arbitrum',
      43114: 'avalanche',
      8453: 'base',
    }
    
    return chainNames[chainId] || 'unknown'
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.rateLimiter.clear()
  }
}

import { Address } from 'viem'
import { Token } from '@/config/tokens'
import {
  DexProtocol,
  DexConfig,
  QuoteRequest,
  QuoteResponse,
  SwapQuote,
  SwapTransaction,
  SwapParams,
  DexError,
  DexErrorCode,
  ApiResponse
} from './types'

/**
 * Abstract base class for all DEX service implementations
 * Provides common functionality and enforces interface consistency
 */
export abstract class BaseDexService {
  protected config: DexConfig
  protected protocol: DexProtocol
  protected rateLimiter: Map<string, number[]> = new Map()

  constructor(protocol: DexProtocol, config: DexConfig) {
    this.protocol = protocol
    this.config = config
  }

  /**
   * Get quote for token swap
   */
  abstract getQuote(request: QuoteRequest): Promise<ApiResponse<SwapQuote>>

  /**
   * Build transaction for swap execution
   */
  abstract buildTransaction(params: SwapParams): Promise<ApiResponse<SwapTransaction>>

  /**
   * Get supported tokens for this DEX
   */
  abstract getSupportedTokens(chainId: number): Promise<ApiResponse<Token[]>>

  /**
   * Check if token pair is supported
   */
  abstract isPairSupported(fromToken: Token, toToken: Token): Promise<boolean>

  /**
   * Get protocol information
   */
  getProtocol(): DexProtocol {
    return this.protocol
  }

  /**
   * Get configuration
   */
  getConfig(): DexConfig {
    return { ...this.config }
  }

  /**
   * Rate limiting check
   */
  protected async checkRateLimit(): Promise<boolean> {
    const now = Date.now()
    const windowStart = now - this.config.rateLimit.window
    const key = this.protocol

    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, [])
    }

    const requests = this.rateLimiter.get(key)!
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => time > windowStart)
    
    if (validRequests.length >= this.config.rateLimit.requests) {
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
   * Validate quote request
   */
  protected validateQuoteRequest(request: QuoteRequest): void {
    if (!request.fromToken || !request.toToken) {
      throw this.createError('TOKEN_NOT_SUPPORTED', 'From and to tokens are required')
    }

    if (request.fromToken.address === request.toToken.address) {
      throw this.createError('TOKEN_NOT_SUPPORTED', 'Cannot swap token to itself')
    }

    if (!request.amount || parseFloat(request.amount) <= 0) {
      throw this.createError('AMOUNT_TOO_SMALL', 'Amount must be greater than 0')
    }

    if (request.slippage < 0 || request.slippage > 50) {
      throw this.createError('SLIPPAGE_TOO_HIGH', 'Slippage must be between 0 and 50%')
    }

    if (request.fromToken.chainId !== request.toToken.chainId) {
      throw this.createError('CHAIN_NOT_SUPPORTED', 'Cross-chain swaps not supported by this DEX')
    }
  }

  /**
   * Validate swap parameters
   */
  protected validateSwapParams(params: SwapParams): void {
    if (!params.quote) {
      throw this.createError('UNKNOWN_ERROR', 'Quote is required')
    }

    if (!params.userAddress) {
      throw this.createError('UNKNOWN_ERROR', 'User address is required')
    }

    // Check if quote is still valid
    if (Date.now() > params.quote.validUntil) {
      throw this.createError('UNKNOWN_ERROR', 'Quote has expired')
    }
  }

  /**
   * Calculate price impact
   */
  protected calculatePriceImpact(
    inputAmount: string,
    outputAmount: string,
    marketPrice: number
  ): number {
    const input = parseFloat(inputAmount)
    const output = parseFloat(outputAmount)
    const expectedOutput = input * marketPrice

    if (expectedOutput === 0) return 0

    return Math.abs((expectedOutput - output) / expectedOutput) * 100
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
   * Create standardized error
   */
  protected createError(code: DexErrorCode, message: string, details?: any): DexError {
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
    error?: DexError,
    requestId?: string
  ): ApiResponse<T> {
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
   * Check if amount is within acceptable limits
   */
  protected isAmountValid(amount: string, token: Token): boolean {
    const num = parseFloat(amount)
    
    // Check minimum amount (0.000001 tokens)
    const minAmount = 0.000001
    if (num < minAmount) return false

    // Check maximum amount (1 billion tokens)
    const maxAmount = 1000000000
    if (num > maxAmount) return false

    return true
  }

  /**
   * Normalize token address (lowercase, handle native tokens)
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
  protected calculateDeadline(minutes: number = 20): number {
    return this.getCurrentTimestamp() + (minutes * 60)
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.rateLimiter.clear()
  }
}

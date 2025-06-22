import { Token } from '@/config/tokens'
import { BaseDexService } from './baseDexService'
import { OneInchService } from './oneInchService'
import {
    ApiResponse,
    DexError,
    DexProtocol,
    QuoteFilters,
    QuoteRequest,
    QuoteResponse,
    QuoteSorting,
    SwapParams,
    SwapQuote,
    SwapTransaction
} from './types'

export interface AggregatorConfig {
  enabledServices: DexProtocol[]
  parallelQuotes: boolean
  quoteTimeout: number
  maxQuotes: number
  defaultSlippage: number
  gasOptimization: boolean
  priceImpactThreshold: number
}

const DEFAULT_CONFIG: AggregatorConfig = {
  enabledServices: ['1inch'],
  parallelQuotes: true,
  quoteTimeout: 10000,
  maxQuotes: 5,
  defaultSlippage: 0.5,
  gasOptimization: true,
  priceImpactThreshold: 15,
}

export class DexAggregator {
  private config: AggregatorConfig
  private services: Map<DexProtocol, BaseDexService> = new Map()
  private quoteCache: Map<string, { quote: SwapQuote; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 30000 // 30 seconds

  constructor(config: Partial<AggregatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeServices()
  }

  /**
   * Initialize DEX services
   */
  private initializeServices(): void {
    if (this.config.enabledServices.includes('1inch')) {
      this.services.set('1inch', new OneInchService())
    }

    // Add other services here as they're implemented
    // if (this.config.enabledServices.includes('0x')) {
    //   this.services.set('0x', new ZeroXService())
    // }
    // if (this.config.enabledServices.includes('paraswap')) {
    //   this.services.set('paraswap', new ParaswapService())
    // }
  }

  /**
   * Get best quote from all enabled DEX services
   */
  async getBestQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const requestId = this.generateRequestId()
    const startTime = Date.now()

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(request)
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        return {
          quotes: [cached],
          bestQuote: cached,
          timestamp: Date.now(),
          requestId,
        }
      }

      // Get quotes from all services
      const quotes = await this.getAllQuotes(request)

      if (quotes.length === 0) {
        return {
          quotes: [],
          error: 'No quotes available',
          timestamp: Date.now(),
          requestId,
        }
      }

      // Find best quote
      const bestQuote = this.selectBestQuote(quotes)

      // Cache the best quote
      if (bestQuote) {
        this.setCache(cacheKey, bestQuote)
      }

      return {
        quotes,
        bestQuote,
        timestamp: Date.now(),
        requestId,
      }
    } catch (error) {
      return {
        quotes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        requestId,
      }
    }
  }

  /**
   * Get quotes from all enabled services
   */
  private async getAllQuotes(request: QuoteRequest): Promise<SwapQuote[]> {
    const enabledServices = Array.from(this.services.entries()).filter(([protocol]) =>
      this.config.enabledServices.includes(protocol)
    )

    if (this.config.parallelQuotes) {
      // Parallel execution for faster response
      const promises = enabledServices.map(async ([protocol, service]) => {
        try {
          const response = await Promise.race([
            service.getQuote(request),
            this.timeoutPromise(this.config.quoteTimeout)
          ])

          return response.success ? response.data : null
        } catch (error) {
          console.warn(`Quote failed for ${protocol}:`, error)
          return null
        }
      })

      const results = await Promise.allSettled(promises)
      return results
        .filter((result): result is PromiseFulfilledResult<SwapQuote | null> =>
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value!)
    } else {
      // Sequential execution for rate limit compliance
      const quotes: SwapQuote[] = []

      for (const [protocol, service] of enabledServices) {
        try {
          const response = await service.getQuote(request)
          if (response.success && response.data) {
            quotes.push(response.data)
          }
        } catch (error) {
          console.warn(`Quote failed for ${protocol}:`, error)
        }
      }

      return quotes
    }
  }

  /**
   * Select best quote based on multiple criteria
   */
  private selectBestQuote(quotes: SwapQuote[]): SwapQuote | undefined {
    if (quotes.length === 0) return undefined
    if (quotes.length === 1) return quotes[0]

    // Filter quotes by price impact threshold
    const validQuotes = quotes.filter(quote =>
      quote.priceImpact <= this.config.priceImpactThreshold
    )

    if (validQuotes.length === 0) {
      // If all quotes exceed threshold, return the one with lowest impact
      return quotes.reduce((best, current) =>
        current.priceImpact < best.priceImpact ? current : best
      )
    }

    // Score quotes based on multiple factors
    const scoredQuotes = validQuotes.map(quote => ({
      quote,
      score: this.calculateQuoteScore(quote)
    }))

    // Return quote with highest score
    return scoredQuotes.reduce((best, current) =>
      current.score > best.score ? current : best
    ).quote
  }

  /**
   * Calculate quote score based on multiple factors
   */
  private calculateQuoteScore(quote: SwapQuote): number {
    const outputAmount = parseFloat(quote.toAmount)
    const gasEstimate = parseFloat(quote.gasEstimate)
    const priceImpact = quote.priceImpact
    const confidence = quote.confidence

    // Normalize factors (higher is better)
    const outputScore = outputAmount // Higher output is better
    const gasScore = this.config.gasOptimization ? (1000000 / gasEstimate) : 0 // Lower gas is better
    const impactScore = (15 - priceImpact) / 15 // Lower impact is better
    const confidenceScore = confidence * 100 // Higher confidence is better

    // Weighted score calculation
    return (
      outputScore * 0.4 +
      gasScore * 0.2 +
      impactScore * 0.2 +
      confidenceScore * 0.2
    )
  }

  /**
   * Filter and sort quotes
   */
  filterAndSortQuotes(
    quotes: SwapQuote[],
    filters?: QuoteFilters,
    sorting?: QuoteSorting
  ): SwapQuote[] {
    let filtered = [...quotes]

    // Apply filters
    if (filters) {
      if (filters.minOutput) {
        const minOutput = parseFloat(filters.minOutput)
        filtered = filtered.filter(quote => parseFloat(quote.toAmount) >= minOutput)
      }

      if (filters.maxPriceImpact !== undefined) {
        filtered = filtered.filter(quote => quote.priceImpact <= filters.maxPriceImpact!)
      }

      if (filters.maxGas) {
        const maxGas = parseFloat(filters.maxGas)
        filtered = filtered.filter(quote => parseFloat(quote.gasEstimate) <= maxGas)
      }

      if (filters.protocols) {
        filtered = filtered.filter(quote => filters.protocols!.includes(quote.protocol))
      }

      if (filters.excludeProtocols) {
        filtered = filtered.filter(quote => !filters.excludeProtocols!.includes(quote.protocol))
      }
    }

    // Apply sorting
    if (sorting) {
      filtered.sort((a, b) => {
        let comparison = 0

        switch (sorting.sortBy) {
          case 'output':
            comparison = parseFloat(a.toAmount) - parseFloat(b.toAmount)
            break
          case 'gas':
            comparison = parseFloat(a.gasEstimate) - parseFloat(b.gasEstimate)
            break
          case 'priceImpact':
            comparison = a.priceImpact - b.priceImpact
            break
          case 'confidence':
            comparison = a.confidence - b.confidence
            break
        }

        return sorting.order === 'desc' ? -comparison : comparison
      })
    }

    return filtered
  }

  /**
   * Build transaction using specific quote
   */
  async buildTransaction(params: SwapParams): Promise<ApiResponse<SwapTransaction>> {
    const service = this.services.get(params.quote.protocol)

    if (!service) {
      const error: DexError = {
        code: 'UNKNOWN_ERROR',
        message: `Service not available for protocol: ${params.quote.protocol}`,
      }
      return {
        success: false,
        error,
        timestamp: Date.now(),
        requestId: this.generateRequestId(),
      }
    }

    return service.buildTransaction(params)
  }

  /**
   * Check if token pair is supported by any service
   */
  async isPairSupported(fromToken: Token, toToken: Token): Promise<boolean> {
    const promises = Array.from(this.services.values()).map(service =>
      service.isPairSupported(fromToken, toToken)
    )

    const results = await Promise.allSettled(promises)
    return results.some(result =>
      result.status === 'fulfilled' && result.value === true
    )
  }

  /**
   * Cache management
   */
  private getCacheKey(request: QuoteRequest): string {
    return `${request.fromToken.address}-${request.toToken.address}-${request.amount}-${request.slippage}-${request.chainId}`
  }

  private getFromCache(key: string): SwapQuote | null {
    const cached = this.quoteCache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.quoteCache.delete(key)
      return null
    }

    return cached.quote
  }

  private setCache(key: string, quote: SwapQuote): void {
    this.quoteCache.set(key, {
      quote,
      timestamp: Date.now(),
    })
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `agg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), ms)
    })
  }

  /**
   * Get aggregator statistics
   */
  getStats() {
    return {
      enabledServices: this.config.enabledServices,
      cacheSize: this.quoteCache.size,
      services: Array.from(this.services.keys()),
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.services.forEach(service => service.destroy())
    this.services.clear()
    this.quoteCache.clear()
  }
}

// Export singleton instance
export const dexAggregator = new DexAggregator()

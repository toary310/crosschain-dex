import { Token } from '@/config/tokens'
import { BaseBridgeService } from './baseBridgeService'
import { LayerZeroService } from './layerZeroService'
import {
  BridgeProtocol,
  BridgeRequest,
  BridgeResponse,
  BridgeQuote,
  BridgeTransaction,
  BridgeParams,
  BridgeStatus,
  RouteOptimization,
  OptimizedRoute,
  BridgeApiResponse,
  BridgeError
} from './types'

export interface BridgeAggregatorConfig {
  enabledProtocols: BridgeProtocol[]
  parallelQuotes: boolean
  quoteTimeout: number
  maxQuotes: number
  defaultOptimization: RouteOptimization
  cacheTimeout: number
}

const DEFAULT_CONFIG: BridgeAggregatorConfig = {
  enabledProtocols: ['layerzero'],
  parallelQuotes: true,
  quoteTimeout: 15000,
  maxQuotes: 5,
  defaultOptimization: {
    optimizeFor: 'balanced',
    maxHops: 2,
  },
  cacheTimeout: 60000, // 1 minute
}

export class BridgeAggregator {
  private config: BridgeAggregatorConfig
  private services: Map<BridgeProtocol, BaseBridgeService> = new Map()
  private quoteCache: Map<string, { quote: BridgeQuote; timestamp: number }> = new Map()
  private statusCache: Map<string, { status: BridgeStatus; timestamp: number }> = new Map()

  constructor(config: Partial<BridgeAggregatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeServices()
  }

  /**
   * Initialize bridge services
   */
  private initializeServices(): void {
    if (this.config.enabledProtocols.includes('layerzero')) {
      this.services.set('layerzero', new LayerZeroService())
    }

    // Add other bridge services here as they're implemented
    // if (this.config.enabledProtocols.includes('wormhole')) {
    //   this.services.set('wormhole', new WormholeService())
    // }
    // if (this.config.enabledProtocols.includes('axelar')) {
    //   this.services.set('axelar', new AxelarService())
    // }
  }

  /**
   * Get best bridge quote from all enabled protocols
   */
  async getBestQuote(request: BridgeRequest, optimization?: RouteOptimization): Promise<BridgeResponse> {
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
          error: 'No bridge routes available',
          timestamp: Date.now(),
          requestId,
        }
      }

      // Optimize and select best quote
      const optimizedQuotes = this.optimizeRoutes(quotes, optimization || this.config.defaultOptimization)
      const bestQuote = optimizedQuotes[0]?.quote || quotes[0]

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
  private async getAllQuotes(request: BridgeRequest): Promise<BridgeQuote[]> {
    const enabledServices = Array.from(this.services.entries()).filter(([protocol]) =>
      this.config.enabledProtocols.includes(protocol) &&
      (!request.protocols || request.protocols.includes(protocol))
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
          console.warn(`Bridge quote failed for ${protocol}:`, error)
          return null
        }
      })

      const results = await Promise.allSettled(promises)
      return results
        .filter((result): result is PromiseFulfilledResult<BridgeQuote | null> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value!)
    } else {
      // Sequential execution for rate limit compliance
      const quotes: BridgeQuote[] = []
      
      for (const [protocol, service] of enabledServices) {
        try {
          const response = await service.getQuote(request)
          if (response.success && response.data) {
            quotes.push(response.data)
          }
        } catch (error) {
          console.warn(`Bridge quote failed for ${protocol}:`, error)
        }
      }

      return quotes
    }
  }

  /**
   * Optimize routes based on criteria
   */
  private optimizeRoutes(quotes: BridgeQuote[], optimization: RouteOptimization): OptimizedRoute[] {
    const optimizedRoutes: OptimizedRoute[] = quotes.map(quote => {
      const score = this.calculateRouteScore(quote, optimization)
      const reasoning = this.generateReasoning(quote, optimization)
      
      return {
        ...quote.route,
        score,
        reasoning,
        alternatives: [],
      }
    })

    // Sort by score (higher is better)
    return optimizedRoutes.sort((a, b) => b.score - a.score)
  }

  /**
   * Calculate route score based on optimization criteria
   */
  private calculateRouteScore(quote: BridgeQuote, optimization: RouteOptimization): number {
    const outputAmount = parseFloat(quote.toAmount)
    const totalFee = parseFloat(quote.totalFee)
    const estimatedTime = quote.estimatedTime
    const confidence = quote.route.confidence

    let score = 0

    switch (optimization.optimizeFor) {
      case 'speed':
        score = (3600 / estimatedTime) * 100 // Higher score for faster routes
        break
      case 'cost':
        score = outputAmount - totalFee // Higher score for better net output
        break
      case 'security':
        score = confidence * 100 // Higher score for more confident routes
        break
      case 'balanced':
      default:
        // Weighted combination of all factors
        const speedScore = (3600 / estimatedTime) * 25
        const costScore = (outputAmount - totalFee) * 0.1
        const securityScore = confidence * 25
        score = speedScore + costScore + securityScore
        break
    }

    // Penalty for routes exceeding max hops
    if (quote.route.steps.length > optimization.maxHops) {
      score *= 0.5
    }

    return Math.max(0, score)
  }

  /**
   * Generate reasoning for route selection
   */
  private generateReasoning(quote: BridgeQuote, optimization: RouteOptimization): string[] {
    const reasoning: string[] = []

    reasoning.push(`Protocol: ${quote.route.protocol}`)
    reasoning.push(`Estimated time: ${Math.round(quote.estimatedTime / 60)} minutes`)
    reasoning.push(`Total fee: ${quote.totalFee} ${quote.route.fromToken.symbol}`)
    reasoning.push(`Output amount: ${quote.toAmount} ${quote.route.toToken.symbol}`)
    reasoning.push(`Confidence: ${Math.round(quote.route.confidence * 100)}%`)

    if (optimization.optimizeFor === 'speed') {
      reasoning.push('Optimized for fastest execution')
    } else if (optimization.optimizeFor === 'cost') {
      reasoning.push('Optimized for lowest cost')
    } else if (optimization.optimizeFor === 'security') {
      reasoning.push('Optimized for highest security')
    } else {
      reasoning.push('Balanced optimization across all factors')
    }

    return reasoning
  }

  /**
   * Build transaction using specific quote
   */
  async buildTransaction(params: BridgeParams): Promise<BridgeApiResponse<BridgeTransaction>> {
    const service = this.services.get(params.quote.route.protocol)
    
    if (!service) {
      const error: BridgeError = {
        code: 'UNKNOWN_ERROR',
        message: `Service not available for protocol: ${params.quote.route.protocol}`,
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
   * Get bridge status
   */
  async getStatus(id: string, protocol?: BridgeProtocol): Promise<BridgeApiResponse<BridgeStatus>> {
    // Check cache first
    const cached = this.getStatusFromCache(id)
    if (cached) {
      return {
        success: true,
        data: cached,
        timestamp: Date.now(),
        requestId: this.generateRequestId(),
      }
    }

    if (protocol) {
      const service = this.services.get(protocol)
      if (service) {
        const response = await service.getStatus(id)
        if (response.success && response.data) {
          this.setStatusCache(id, response.data)
        }
        return response
      }
    }

    // Try all services if protocol not specified
    for (const [, service] of this.services) {
      try {
        const response = await service.getStatus(id)
        if (response.success && response.data) {
          this.setStatusCache(id, response.data)
          return response
        }
      } catch {
        // Continue to next service
      }
    }

    const error: BridgeError = {
      code: 'UNKNOWN_ERROR',
      message: 'Bridge transaction not found',
    }

    return {
      success: false,
      error,
      timestamp: Date.now(),
      requestId: this.generateRequestId(),
    }
  }

  /**
   * Check if route is supported by any protocol
   */
  async isRouteSupported(fromChain: number, toChain: number, token: Token): Promise<boolean> {
    const promises = Array.from(this.services.values()).map(service =>
      service.isRouteSupported(fromChain, toChain, token)
    )

    const results = await Promise.allSettled(promises)
    return results.some(result => 
      result.status === 'fulfilled' && result.value === true
    )
  }

  /**
   * Get all supported chains
   */
  async getSupportedChains(): Promise<number[]> {
    const allChains = new Set<number>()

    for (const [, service] of this.services) {
      try {
        const response = await service.getSupportedChains()
        if (response.success && response.data) {
          response.data.forEach(chain => allChains.add(chain))
        }
      } catch {
        // Continue to next service
      }
    }

    return Array.from(allChains).sort((a, b) => a - b)
  }

  /**
   * Cache management
   */
  private getCacheKey(request: BridgeRequest): string {
    return `${request.fromChain}-${request.toChain}-${request.fromToken.address}-${request.toToken.address}-${request.amount}-${request.slippage}`
  }

  private getFromCache(key: string): BridgeQuote | null {
    const cached = this.quoteCache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > this.config.cacheTimeout) {
      this.quoteCache.delete(key)
      return null
    }

    return cached.quote
  }

  private setCache(key: string, quote: BridgeQuote): void {
    this.quoteCache.set(key, {
      quote,
      timestamp: Date.now(),
    })
  }

  private getStatusFromCache(id: string): BridgeStatus | null {
    const cached = this.statusCache.get(id)
    if (!cached) return null

    if (Date.now() - cached.timestamp > 30000) { // 30 seconds for status cache
      this.statusCache.delete(id)
      return null
    }

    return cached.status
  }

  private setStatusCache(id: string, status: BridgeStatus): void {
    this.statusCache.set(id, {
      status,
      timestamp: Date.now(),
    })
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `bridge-agg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
      enabledProtocols: this.config.enabledProtocols,
      quoteCache: this.quoteCache.size,
      statusCache: this.statusCache.size,
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
    this.statusCache.clear()
  }
}

// Export singleton instance
export const bridgeAggregator = new BridgeAggregator()

// Export class for custom instances
export { BridgeAggregator }

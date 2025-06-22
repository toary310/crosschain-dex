import { Address } from 'viem'
import { 
  Token, 
  TokenMetadata, 
  getAllTokens, 
  getTokensByChain, 
  findTokenByAddress, 
  findTokenBySymbol,
  validateTokenAddress,
  getVerifiedTokens,
  getStablecoins
} from '@/config/tokens'

export interface TokenListSource {
  name: string
  url: string
  version: string
  priority: number
  enabled: boolean
}

export interface TokenRegistryConfig {
  sources: TokenListSource[]
  autoUpdate: boolean
  updateInterval: number
  maxTokensPerChain: number
  requireVerification: boolean
}

export interface TokenSearchResult {
  token: Token
  score: number
  matchType: 'symbol' | 'name' | 'address'
}

export interface TokenValidationResult {
  valid: boolean
  token?: Token
  errors: string[]
  warnings: string[]
}

// Default token list sources
const DEFAULT_SOURCES: TokenListSource[] = [
  {
    name: 'ChainBridge Verified',
    url: '/tokens/chainbridge-verified.json',
    version: '1.0.0',
    priority: 1,
    enabled: true,
  },
  {
    name: 'Uniswap Default',
    url: 'https://tokens.uniswap.org',
    version: '1.0.0',
    priority: 2,
    enabled: true,
  },
  {
    name: 'CoinGecko',
    url: 'https://tokens.coingecko.com/uniswap/all.json',
    version: '1.0.0',
    priority: 3,
    enabled: false,
  },
]

const DEFAULT_CONFIG: TokenRegistryConfig = {
  sources: DEFAULT_SOURCES,
  autoUpdate: true,
  updateInterval: 3600000, // 1 hour
  maxTokensPerChain: 1000,
  requireVerification: false,
}

class TokenRegistry {
  private config: TokenRegistryConfig
  private tokens: Map<string, Token> = new Map()
  private metadata: Map<string, TokenMetadata> = new Map()
  private updateInterval?: NodeJS.Timeout
  private lastUpdate: number = 0

  constructor(config: Partial<TokenRegistryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeRegistry()
  }

  /**
   * Initialize the token registry
   */
  private async initializeRegistry(): Promise<void> {
    // Load built-in tokens
    this.loadBuiltInTokens()
    
    // Load from external sources
    await this.updateFromSources()
    
    // Start auto-update if enabled
    if (this.config.autoUpdate) {
      this.startAutoUpdate()
    }
  }

  /**
   * Load built-in tokens from config
   */
  private loadBuiltInTokens(): void {
    const builtInTokens = getAllTokens()
    builtInTokens.forEach(token => {
      const key = this.getTokenKey(token.address, token.chainId)
      this.tokens.set(key, token)
    })
  }

  /**
   * Update tokens from external sources
   */
  private async updateFromSources(): Promise<void> {
    const enabledSources = this.config.sources
      .filter(source => source.enabled)
      .sort((a, b) => a.priority - b.priority)

    for (const source of enabledSources) {
      try {
        await this.loadFromSource(source)
      } catch (error) {
        console.warn(`Failed to load tokens from ${source.name}:`, error)
      }
    }

    this.lastUpdate = Date.now()
  }

  /**
   * Load tokens from a specific source
   */
  private async loadFromSource(source: TokenListSource): Promise<void> {
    const response = await fetch(source.url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const tokenList = await response.json()
    
    // Validate token list format
    if (!tokenList.tokens || !Array.isArray(tokenList.tokens)) {
      throw new Error('Invalid token list format')
    }

    // Process tokens
    tokenList.tokens.forEach((tokenData: any) => {
      try {
        const token = this.parseTokenData(tokenData, source)
        if (token && this.validateToken(token).valid) {
          const key = this.getTokenKey(token.address, token.chainId)
          
          // Don't override verified tokens with unverified ones
          const existing = this.tokens.get(key)
          if (existing?.verified && !token.verified) {
            return
          }
          
          this.tokens.set(key, token)
        }
      } catch (error) {
        console.warn(`Failed to parse token from ${source.name}:`, error)
      }
    })
  }

  /**
   * Parse token data from external source
   */
  private parseTokenData(data: any, source: TokenListSource): Token | null {
    if (!data.address || !data.symbol || !data.name || !data.chainId) {
      return null
    }

    return {
      address: data.address as Address,
      symbol: data.symbol,
      name: data.name,
      decimals: data.decimals || 18,
      chainId: data.chainId,
      logoURI: data.logoURI,
      isNative: data.address === '0x0000000000000000000000000000000000000000',
      isStablecoin: this.detectStablecoin(data.symbol, data.name),
      verified: source.priority <= 2, // High priority sources are considered verified
      tags: data.tags || [],
      riskLevel: this.assessRiskLevel(data, source),
      lastUpdated: Date.now(),
    }
  }

  /**
   * Get token by address and chain
   */
  getToken(address: Address, chainId: number): Token | undefined {
    const key = this.getTokenKey(address, chainId)
    return this.tokens.get(key)
  }

  /**
   * Get all tokens for a specific chain
   */
  getTokensForChain(chainId: number): Token[] {
    return Array.from(this.tokens.values())
      .filter(token => token.chainId === chainId)
      .sort((a, b) => {
        // Sort by verification status, then by symbol
        if (a.verified !== b.verified) {
          return a.verified ? -1 : 1
        }
        return a.symbol.localeCompare(b.symbol)
      })
  }

  /**
   * Search tokens by query
   */
  searchTokens(query: string, chainId?: number, limit: number = 20): TokenSearchResult[] {
    const normalizedQuery = query.toLowerCase().trim()
    const results: TokenSearchResult[] = []

    if (!normalizedQuery) {
      return results
    }

    const tokens = chainId 
      ? this.getTokensForChain(chainId)
      : Array.from(this.tokens.values())

    tokens.forEach(token => {
      const symbolMatch = token.symbol.toLowerCase().includes(normalizedQuery)
      const nameMatch = token.name.toLowerCase().includes(normalizedQuery)
      const addressMatch = token.address.toLowerCase().includes(normalizedQuery)

      if (symbolMatch || nameMatch || addressMatch) {
        let score = 0
        let matchType: 'symbol' | 'name' | 'address' = 'name'

        // Calculate relevance score
        if (token.symbol.toLowerCase() === normalizedQuery) {
          score = 100
          matchType = 'symbol'
        } else if (token.symbol.toLowerCase().startsWith(normalizedQuery)) {
          score = 90
          matchType = 'symbol'
        } else if (symbolMatch) {
          score = 80
          matchType = 'symbol'
        } else if (token.name.toLowerCase() === normalizedQuery) {
          score = 70
          matchType = 'name'
        } else if (token.name.toLowerCase().startsWith(normalizedQuery)) {
          score = 60
          matchType = 'name'
        } else if (nameMatch) {
          score = 50
          matchType = 'name'
        } else if (addressMatch) {
          score = 40
          matchType = 'address'
        }

        // Boost score for verified tokens
        if (token.verified) {
          score += 10
        }

        // Boost score for popular tokens
        if (token.tags?.includes('stablecoin')) {
          score += 5
        }

        results.push({ token, score, matchType })
      }
    })

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * Validate token
   */
  validateToken(token: Token): TokenValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate address
    if (!validateTokenAddress(token.address) && token.address !== '0x0000000000000000000000000000000000000000') {
      errors.push('Invalid token address format')
    }

    // Validate symbol
    if (!token.symbol || token.symbol.length === 0) {
      errors.push('Token symbol is required')
    } else if (token.symbol.length > 20) {
      warnings.push('Token symbol is unusually long')
    }

    // Validate name
    if (!token.name || token.name.length === 0) {
      errors.push('Token name is required')
    }

    // Validate decimals
    if (token.decimals < 0 || token.decimals > 77) {
      errors.push('Invalid token decimals')
    }

    // Check for verification
    if (!token.verified) {
      warnings.push('Token is not verified')
    }

    // Check risk level
    if (token.riskLevel === 'high' || token.riskLevel === 'unverified') {
      warnings.push(`Token has ${token.riskLevel} risk level`)
    }

    return {
      valid: errors.length === 0,
      token: errors.length === 0 ? token : undefined,
      errors,
      warnings,
    }
  }

  /**
   * Add custom token
   */
  async addCustomToken(tokenData: Partial<Token>): Promise<TokenValidationResult> {
    if (!tokenData.address || !tokenData.chainId) {
      return {
        valid: false,
        errors: ['Address and chainId are required'],
        warnings: [],
      }
    }

    // Try to fetch token metadata from blockchain
    const token = await this.fetchTokenMetadata(tokenData.address, tokenData.chainId)
    
    if (!token) {
      return {
        valid: false,
        errors: ['Failed to fetch token metadata'],
        warnings: [],
      }
    }

    // Merge with provided data
    const mergedToken: Token = {
      ...token,
      ...tokenData,
      verified: false,
      riskLevel: 'unverified',
      lastUpdated: Date.now(),
    }

    const validation = this.validateToken(mergedToken)
    
    if (validation.valid) {
      const key = this.getTokenKey(mergedToken.address, mergedToken.chainId)
      this.tokens.set(key, mergedToken)
    }

    return validation
  }

  /**
   * Fetch token metadata from blockchain
   */
  private async fetchTokenMetadata(address: Address, chainId: number): Promise<Token | null> {
    // This would integrate with viem/wagmi to fetch token metadata
    // For now, return a basic structure
    return {
      address,
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      decimals: 18,
      chainId,
      verified: false,
      riskLevel: 'unverified',
    }
  }

  /**
   * Utility methods
   */
  private getTokenKey(address: Address, chainId: number): string {
    return `${chainId}-${address.toLowerCase()}`
  }

  private detectStablecoin(symbol: string, name: string): boolean {
    const stablecoinPatterns = ['USD', 'DAI', 'USDC', 'USDT', 'BUSD', 'FRAX', 'LUSD']
    const text = `${symbol} ${name}`.toUpperCase()
    return stablecoinPatterns.some(pattern => text.includes(pattern))
  }

  private assessRiskLevel(data: any, source: TokenListSource): 'low' | 'medium' | 'high' | 'unverified' {
    if (source.priority <= 1) return 'low'
    if (source.priority <= 2) return 'medium'
    return 'unverified'
  }

  private startAutoUpdate(): void {
    this.updateInterval = setInterval(() => {
      this.updateFromSources().catch(error => {
        console.error('Auto-update failed:', error)
      })
    }, this.config.updateInterval)
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
  }
}

// Export singleton instance
export const tokenRegistry = new TokenRegistry()

// Export class for custom instances
export { TokenRegistry }

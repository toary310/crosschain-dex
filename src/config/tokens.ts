import { Address } from 'viem'
import { arbitrum, avalanche, mainnet, optimism, polygon } from 'wagmi/chains'

// Enhanced token interface with comprehensive metadata
export interface Token {
  address: Address
  symbol: string
  name: string
  decimals: number
  logoURI?: string
  chainId: number
  isNative?: boolean
  isStablecoin?: boolean
  isWrapped?: boolean
  coingeckoId?: string
  coinMarketCapId?: string
  tags?: TokenTag[]
  bridgeInfo?: BridgeInfo[]
  riskLevel?: RiskLevel
  verified?: boolean
  lastUpdated?: number
}

export interface BridgeInfo {
  chainId: number
  address: Address
  symbol: string
  bridgeProtocol: 'layerzero' | 'wormhole' | 'axelar' | 'native'
}

export interface TokenMetadata {
  description?: string
  website?: string
  twitter?: string
  telegram?: string
  discord?: string
  whitepaper?: string
  audit?: string[]
  totalSupply?: string
  circulatingSupply?: string
  marketCap?: number
  volume24h?: number
  priceChange24h?: number
}

export interface TokenPrice {
  usd: number
  usd24hChange: number
  usd24hVol: number
  usdMarketCap: number
  lastUpdated: number
}

export type TokenTag =
  | 'stablecoin'
  | 'wrapped'
  | 'native'
  | 'defi'
  | 'governance'
  | 'meme'
  | 'gaming'
  | 'nft'
  | 'layer1'
  | 'layer2'
  | 'bridge'
  | 'yield'

export type RiskLevel = 'low' | 'medium' | 'high' | 'unverified'

// Zero address constant for native tokens
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

// Wrapped native token addresses
export const WRAPPED_NATIVE_ADDRESSES: Record<number, Address> = {
  [mainnet.id]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  [polygon.id]: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
  [arbitrum.id]: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
  [optimism.id]: '0x4200000000000000000000000000000000000006', // WETH
  [avalanche.id]: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
}

// Native tokens with enhanced metadata
export const NATIVE_TOKENS: Record<number, Token> = {
  [mainnet.id]: {
    address: ZERO_ADDRESS,
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: '/tokens/eth.svg',
    chainId: mainnet.id,
    isNative: true,
    coingeckoId: 'ethereum',
    coinMarketCapId: '1027',
    tags: ['native', 'layer1'],
    riskLevel: 'low',
    verified: true,
    bridgeInfo: [
      {
        chainId: polygon.id,
        address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619' as Address,
        symbol: 'ETH',
        bridgeProtocol: 'native'
      },
      {
        chainId: arbitrum.id,
        address: ZERO_ADDRESS,
        symbol: 'ETH',
        bridgeProtocol: 'native'
      },
      {
        chainId: optimism.id,
        address: ZERO_ADDRESS,
        symbol: 'ETH',
        bridgeProtocol: 'native'
      }
    ]
  },
  [polygon.id]: {
    address: ZERO_ADDRESS,
    symbol: 'MATIC',
    name: 'Polygon',
    decimals: 18,
    logoURI: '/tokens/matic.svg',
    chainId: polygon.id,
    isNative: true,
    coingeckoId: 'matic-network',
    coinMarketCapId: '3890',
    tags: ['native', 'layer2'],
    riskLevel: 'low',
    verified: true,
    bridgeInfo: [
      {
        chainId: mainnet.id,
        address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0' as Address,
        symbol: 'MATIC',
        bridgeProtocol: 'native'
      }
    ]
  },
  [arbitrum.id]: {
    address: ZERO_ADDRESS,
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: '/tokens/eth.svg',
    chainId: arbitrum.id,
    isNative: true,
    coingeckoId: 'ethereum',
    coinMarketCapId: '1027',
    tags: ['native', 'layer2'],
    riskLevel: 'low',
    verified: true,
    bridgeInfo: [
      {
        chainId: mainnet.id,
        address: ZERO_ADDRESS,
        symbol: 'ETH',
        bridgeProtocol: 'native'
      }
    ]
  },
  [optimism.id]: {
    address: ZERO_ADDRESS,
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: '/tokens/eth.svg',
    chainId: optimism.id,
    isNative: true,
    coingeckoId: 'ethereum',
    coinMarketCapId: '1027',
    tags: ['native', 'layer2'],
    riskLevel: 'low',
    verified: true,
    bridgeInfo: [
      {
        chainId: mainnet.id,
        address: ZERO_ADDRESS,
        symbol: 'ETH',
        bridgeProtocol: 'native'
      }
    ]
  },
  [avalanche.id]: {
    address: ZERO_ADDRESS,
    symbol: 'AVAX',
    name: 'Avalanche',
    decimals: 18,
    logoURI: '/tokens/avax.svg',
    chainId: avalanche.id,
    isNative: true,
    coingeckoId: 'avalanche-2',
    coinMarketCapId: '5805',
    tags: ['native', 'layer1'],
    riskLevel: 'low',
    verified: true,
  },
}

// Popular ERC-20 tokens with enhanced metadata
export const POPULAR_TOKENS: Record<number, Token[]> = {
  [mainnet.id]: [
    {
      address: '0xA0b86a33E6441b8435b662303c0f218C8c7c8e8e' as Address,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: '/tokens/usdc.svg',
      chainId: mainnet.id,
      isStablecoin: true,
      coingeckoId: 'usd-coin',
      coinMarketCapId: '3408',
      tags: ['stablecoin', 'defi'],
      riskLevel: 'low',
      verified: true,
      bridgeInfo: [
        {
          chainId: polygon.id,
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Address,
          symbol: 'USDC',
          bridgeProtocol: 'native'
        },
        {
          chainId: arbitrum.id,
          address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8' as Address,
          symbol: 'USDC',
          bridgeProtocol: 'native'
        },
        {
          chainId: optimism.id,
          address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607' as Address,
          symbol: 'USDC',
          bridgeProtocol: 'native'
        }
      ]
    },
    {
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address,
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      logoURI: '/tokens/dai.svg',
      chainId: mainnet.id,
      isStablecoin: true,
      coingeckoId: 'dai',
      coinMarketCapId: '4943',
      tags: ['stablecoin', 'defi'],
      riskLevel: 'low',
      verified: true,
      bridgeInfo: [
        {
          chainId: polygon.id,
          address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' as Address,
          symbol: 'DAI',
          bridgeProtocol: 'native'
        }
      ]
    },
    {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address,
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      logoURI: '/tokens/usdt.svg',
      chainId: mainnet.id,
      isStablecoin: true,
      coingeckoId: 'tether',
      coinMarketCapId: '825',
      tags: ['stablecoin'],
      riskLevel: 'medium',
      verified: true,
    },
  ],
  [polygon.id]: [
    {
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Address,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: '/tokens/usdc.svg',
      chainId: polygon.id,
      isStablecoin: true,
      coingeckoId: 'usd-coin',
      coinMarketCapId: '3408',
      tags: ['stablecoin', 'defi'],
      riskLevel: 'low',
      verified: true,
    },
    {
      address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' as Address,
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      logoURI: '/tokens/dai.svg',
      chainId: polygon.id,
      isStablecoin: true,
      coingeckoId: 'dai',
      coinMarketCapId: '4943',
      tags: ['stablecoin', 'defi'],
      riskLevel: 'low',
      verified: true,
    },
    {
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as Address,
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      logoURI: '/tokens/usdt.svg',
      chainId: polygon.id,
      isStablecoin: true,
      coingeckoId: 'tether',
      coinMarketCapId: '825',
      tags: ['stablecoin'],
      riskLevel: 'medium',
      verified: true,
    },
  ],
  [arbitrum.id]: [
    {
      address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8' as Address,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: '/tokens/usdc.svg',
      chainId: arbitrum.id,
      isStablecoin: true,
      coingeckoId: 'usd-coin',
      coinMarketCapId: '3408',
      tags: ['stablecoin', 'defi'],
      riskLevel: 'low',
      verified: true,
    },
    {
      address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' as Address,
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      logoURI: '/tokens/dai.svg',
      chainId: arbitrum.id,
      isStablecoin: true,
      coingeckoId: 'dai',
      coinMarketCapId: '4943',
      tags: ['stablecoin', 'defi'],
      riskLevel: 'low',
      verified: true,
    },
  ],
  [optimism.id]: [
    {
      address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607' as Address,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: '/tokens/usdc.svg',
      chainId: optimism.id,
      isStablecoin: true,
      coingeckoId: 'usd-coin',
      coinMarketCapId: '3408',
      tags: ['stablecoin', 'defi'],
      riskLevel: 'low',
      verified: true,
    },
    {
      address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' as Address,
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      logoURI: '/tokens/dai.svg',
      chainId: optimism.id,
      isStablecoin: true,
      coingeckoId: 'dai',
      coinMarketCapId: '4943',
      tags: ['stablecoin', 'defi'],
      riskLevel: 'low',
      verified: true,
    },
  ],
  [avalanche.id]: [
    {
      address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' as Address,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: '/tokens/usdc.svg',
      chainId: avalanche.id,
      isStablecoin: true,
      coingeckoId: 'usd-coin',
      coinMarketCapId: '3408',
      tags: ['stablecoin', 'defi'],
      riskLevel: 'low',
      verified: true,
    },
  ],
}

// Enhanced utility functions
export const getTokensByChain = (chainId: number): Token[] => {
  const nativeToken = NATIVE_TOKENS[chainId]
  const popularTokens = POPULAR_TOKENS[chainId] || []

  return nativeToken ? [nativeToken, ...popularTokens] : popularTokens
}

export const getAllTokens = (): Token[] => {
  const allTokens: Token[] = []

  // Add all native tokens
  Object.values(NATIVE_TOKENS).forEach(token => allTokens.push(token))

  // Add all popular tokens
  Object.values(POPULAR_TOKENS).forEach(tokens =>
    tokens.forEach(token => allTokens.push(token))
  )

  return allTokens
}

export const findTokenByAddress = (chainId: number, address: Address): Token | undefined => {
  const tokens = getTokensByChain(chainId)
  return tokens.find(token => token.address.toLowerCase() === address.toLowerCase())
}

export const findTokenBySymbol = (symbol: string, chainId: number): Token | undefined => {
  const tokens = getTokensByChain(chainId)
  return tokens.find(token =>
    token.symbol.toLowerCase() === symbol.toLowerCase()
  )
}

export const isNativeToken = (address: Address): boolean => {
  return address === ZERO_ADDRESS
}

export const isWrappedNativeToken = (address: Address, chainId: number): boolean => {
  const wrappedAddress = WRAPPED_NATIVE_ADDRESSES[chainId]
  return wrappedAddress ? address.toLowerCase() === wrappedAddress.toLowerCase() : false
}

export const getWrappedNativeToken = (chainId: number): Address | undefined => {
  return WRAPPED_NATIVE_ADDRESSES[chainId]
}

export const getNativeToken = (chainId: number): Token | undefined => {
  return NATIVE_TOKENS[chainId]
}

export const getTokensByTag = (tag: TokenTag, chainId?: number): Token[] => {
  const tokens = chainId ? getTokensByChain(chainId) : getAllTokens()
  return tokens.filter(token => token.tags?.includes(tag))
}

export const getStablecoins = (chainId?: number): Token[] => {
  return getTokensByTag('stablecoin', chainId)
}

export const getVerifiedTokens = (chainId?: number): Token[] => {
  const tokens = chainId ? getTokensByChain(chainId) : getAllTokens()
  return tokens.filter(token => token.verified === true)
}

export const getBridgeableTokens = (fromChainId: number, toChainId: number): Token[] => {
  const tokens = getTokensByChain(fromChainId)
  return tokens.filter(token =>
    token.bridgeInfo?.some(bridge => bridge.chainId === toChainId)
  )
}

export const getBridgeInfo = (token: Token, targetChainId: number): BridgeInfo | undefined => {
  return token.bridgeInfo?.find(bridge => bridge.chainId === targetChainId)
}

export const formatTokenAmount = (amount: string, decimals: number): string => {
  const num = parseFloat(amount)
  if (num === 0) return '0'
  if (num < 0.001) return '<0.001'
  if (num < 1) return num.toFixed(6)
  if (num < 1000) return num.toFixed(4)
  if (num < 1000000) return `${(num / 1000).toFixed(2)}K`
  return `${(num / 1000000).toFixed(2)}M`
}

export const validateTokenAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Token list validation
export const validateTokenList = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = []
  const allTokens = getAllTokens()

  // Check for duplicate addresses within same chain
  const addressMap = new Map<string, Token[]>()

  allTokens.forEach(token => {
    const key = `${token.chainId}-${token.address.toLowerCase()}`
    if (!addressMap.has(key)) {
      addressMap.set(key, [])
    }
    addressMap.get(key)!.push(token)
  })

  addressMap.forEach((tokens, key) => {
    if (tokens.length > 1) {
      errors.push(`Duplicate address found: ${key}`)
    }
  })

  // Validate addresses
  allTokens.forEach(token => {
    if (!validateTokenAddress(token.address) && !isNativeToken(token.address)) {
      errors.push(`Invalid address for ${token.symbol}: ${token.address}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

// Legacy compatibility
export const getAllTokensForChain = getTokensByChain

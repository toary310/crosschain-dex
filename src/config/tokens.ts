import { Address } from 'viem'
import { mainnet, polygon, arbitrum, optimism } from 'wagmi/chains'

export interface Token {
  address: Address
  symbol: string
  name: string
  decimals: number
  logoURI?: string
  chainId: number
}

// Native tokens (ETH, MATIC, etc.)
export const NATIVE_TOKENS: Record<number, Token> = {
  [mainnet.id]: {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: '/tokens/eth.svg',
    chainId: mainnet.id,
  },
  [polygon.id]: {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'MATIC',
    name: 'Polygon',
    decimals: 18,
    logoURI: '/tokens/matic.svg',
    chainId: polygon.id,
  },
  [arbitrum.id]: {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: '/tokens/eth.svg',
    chainId: arbitrum.id,
  },
  [optimism.id]: {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: '/tokens/eth.svg',
    chainId: optimism.id,
  },
}

// Common ERC-20 tokens
export const COMMON_TOKENS: Record<number, Token[]> = {
  [mainnet.id]: [
    {
      address: '0xA0b86a33E6441b8435b662303c0f218C8F8c0c1a',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: '/tokens/usdc.svg',
      chainId: mainnet.id,
    },
    {
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      logoURI: '/tokens/dai.svg',
      chainId: mainnet.id,
    },
  ],
  [polygon.id]: [
    {
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: '/tokens/usdc.svg',
      chainId: polygon.id,
    },
    {
      address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      logoURI: '/tokens/dai.svg',
      chainId: polygon.id,
    },
  ],
  [arbitrum.id]: [
    {
      address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: '/tokens/usdc.svg',
      chainId: arbitrum.id,
    },
    {
      address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      logoURI: '/tokens/dai.svg',
      chainId: arbitrum.id,
    },
  ],
  [optimism.id]: [
    {
      address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: '/tokens/usdc.svg',
      chainId: optimism.id,
    },
    {
      address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      logoURI: '/tokens/dai.svg',
      chainId: optimism.id,
    },
  ],
}

export const getAllTokensForChain = (chainId: number): Token[] => {
  const nativeToken = NATIVE_TOKENS[chainId]
  const commonTokens = COMMON_TOKENS[chainId] || []
  
  return nativeToken ? [nativeToken, ...commonTokens] : commonTokens
}

export const findTokenByAddress = (chainId: number, address: Address): Token | undefined => {
  const tokens = getAllTokensForChain(chainId)
  return tokens.find(token => token.address.toLowerCase() === address.toLowerCase())
}

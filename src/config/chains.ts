import { mainnet, polygon, arbitrum, optimism } from 'wagmi/chains'

export const supportedChains = [mainnet, polygon, arbitrum, optimism] as const

export type SupportedChainId = (typeof supportedChains)[number]['id']

export const chainConfig = {
  [mainnet.id]: {
    name: 'Ethereum',
    shortName: 'ETH',
    icon: '/icons/ethereum.svg',
    color: '#627EEA',
    blockExplorer: 'https://etherscan.io',
    priority: 'high' as const,
    phase: 1,
  },
  [polygon.id]: {
    name: 'Polygon',
    shortName: 'MATIC',
    icon: '/icons/polygon.svg',
    color: '#8247E5',
    blockExplorer: 'https://polygonscan.com',
    priority: 'high' as const,
    phase: 1,
  },
  [arbitrum.id]: {
    name: 'Arbitrum',
    shortName: 'ARB',
    icon: '/icons/arbitrum.svg',
    color: '#28A0F0',
    blockExplorer: 'https://arbiscan.io',
    priority: 'medium' as const,
    phase: 2,
  },
  [optimism.id]: {
    name: 'Optimism',
    shortName: 'OP',
    icon: '/icons/optimism.svg',
    color: '#FF0420',
    blockExplorer: 'https://optimistic.etherscan.io',
    priority: 'medium' as const,
    phase: 2,
  },
} as const

export const getChainConfig = (chainId: SupportedChainId) => {
  return chainConfig[chainId]
}

export const isChainSupported = (chainId: number): chainId is SupportedChainId => {
  return chainId in chainConfig
}

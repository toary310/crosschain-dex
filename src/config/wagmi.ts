import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { arbitrum, avalanche, base, bsc, mainnet, optimism, polygon } from 'wagmi/chains'

// Get WalletConnect project ID from environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

if (!projectId || projectId === 'demo-project-id') {
  console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Using demo project ID.')
}

// RainbowKit configuration with enhanced wallet support
export const config = getDefaultConfig({
  appName: 'ChainBridge DEX',
  projectId,
  chains: [mainnet, polygon, arbitrum, optimism, avalanche, base, bsc],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'),
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon.llamarpc.com'),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arbitrum.llamarpc.com'),
    [optimism.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || 'https://optimism.llamarpc.com'),
    [avalanche.id]: http(process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL || 'https://avalanche.public-rpc.com'),
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://base.llamarpc.com'),
    [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC_URL || 'https://bsc.llamarpc.com'),
  },
  ssr: true, // Enable server-side rendering support
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}

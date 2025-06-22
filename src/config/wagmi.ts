import { createConfig, http } from 'wagmi'
import { arbitrum, avalanche, mainnet, optimism, polygon } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

// Get WalletConnect project ID from environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

if (!projectId && typeof window !== 'undefined') {
  console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set')
}

export const config = createConfig({
  chains: [mainnet, polygon, arbitrum, optimism, avalanche],
  connectors: [
    injected(),
    metaMask(),
    ...(projectId && typeof window !== 'undefined' ? [walletConnect({ projectId })] : []),
  ],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
      ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
      : 'https://eth.llamarpc.com'
    ),
    [polygon.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
      ? `https://polygon-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
      : 'https://polygon.llamarpc.com'
    ),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
      ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
      : 'https://arbitrum.llamarpc.com'
    ),
    [optimism.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
      ? `https://opt-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
      : 'https://optimism.llamarpc.com'
    ),
    [avalanche.id]: http('https://api.avax.network/ext/bc/C/rpc'),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}

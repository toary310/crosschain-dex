'use client'

import { config } from '@/config/wagmi'
import '@rainbow-me/rainbowkit/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'
import { WagmiProvider } from 'wagmi'
// @ts-ignore - RainbowKit import
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit'

interface Web3ProviderProps {
  children: ReactNode
}

function RainbowKitWrapper({ children }: { children: ReactNode }) {
  // Note: useColorMode hook will be available after Chakra UI provider is initialized
  // For now, we'll use light theme as default
  return (
    <RainbowKitProvider
      theme={lightTheme()}
      showRecentTransactions={true}
      appInfo={{
        appName: 'ChainBridge DEX',
        learnMoreUrl: 'https://chainbridge-dex.com',
      }}
    >
      {children}
    </RainbowKitProvider>
  )
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 10 * 60 * 1000, // 10 minutes
            retry: 3,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitWrapper>
          {children}
        </RainbowKitWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

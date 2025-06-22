'use client'

import { getChainConfig, supportedChains } from '@/config/chains'
import { useCallback } from 'react'
import { useChainId, useSwitchChain } from 'wagmi'

export function useChainSwitcher() {
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const currentChain = getChainConfig(chainId)

  const handleChainSwitch = useCallback((newChainId: string) => {
    const chainIdNumber = parseInt(newChainId)
    switchChain({ chainId: chainIdNumber as any })
  }, [switchChain])

  const switchToChain = useCallback((chainId: number) => {
    switchChain({ chainId: chainId as any })
  }, [switchChain])

  return {
    // State
    chainId,
    currentChain,
    supportedChains,

    // Actions
    handleChainSwitch,
    switchToChain,
  }
}

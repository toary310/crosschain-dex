'use client'

import { useChainId, useSwitchChain } from 'wagmi'
import { useCallback } from 'react'
import { getChainConfig, supportedChains } from '@/config/chains'

export function useChainSwitcher() {
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const currentChain = getChainConfig(chainId)

  const handleChainSwitch = useCallback((newChainId: string) => {
    const chainIdNumber = parseInt(newChainId)
    switchChain({ chainId: chainIdNumber })
  }, [switchChain])

  const switchToChain = useCallback((chainId: number) => {
    switchChain({ chainId })
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

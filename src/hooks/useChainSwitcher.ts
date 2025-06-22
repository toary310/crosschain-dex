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
    if (isNaN(chainIdNumber)) {
      console.error('Invalid chain ID:', newChainId)
      return
    }
    switchChain({ chainId: chainIdNumber })
  }, [switchChain])

  const switchToChain = useCallback((chainId: number) => {
    if (!chainId || chainId <= 0) {
      console.error('Invalid chain ID:', chainId)
      return
    }
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

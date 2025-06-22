'use client'

import { getChainConfig } from '@/config/chains'
import { useChainSwitcher } from '@/hooks/useChainSwitcher'
import { Select } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { useAccount } from 'wagmi'

export const ChainSelector = memo(function ChainSelector() {
  const { isConnected } = useAccount()
  const { chainId, supportedChains, handleChainSwitch } = useChainSwitcher()

  const chainOptions = useMemo(() =>
    supportedChains.map((chain) => {
      const config = getChainConfig(chain.id)
      return {
        id: chain.id,
        name: config.name,
      }
    }), [supportedChains]
  )

  if (!isConnected) {
    return null
  }

  return (
    <Select
      value={chainId}
      onChange={(e) => handleChainSwitch(e.target.value)}
      width="auto"
      size="sm"
      aria-label="Select blockchain network"
    >
      {chainOptions.map((chain) => (
        <option key={chain.id} value={chain.id}>
          {chain.name}
        </option>
      ))}
    </Select>
  )
})

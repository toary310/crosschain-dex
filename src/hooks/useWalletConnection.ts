'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useCallback } from 'react'

export function useWalletConnection() {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  const handleConnect = useCallback((connector: any) => {
    connect({ connector })
  }, [connect])

  const handleDisconnect = useCallback(() => {
    disconnect()
  }, [disconnect])

  const formatAddress = useCallback((address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [])

  return {
    // State
    address,
    isConnected,
    isConnecting,
    isPending,
    connectors,
    
    // Actions
    handleConnect,
    handleDisconnect,
    
    // Utils
    formatAddress,
  }
}

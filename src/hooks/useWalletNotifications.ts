'use client'

import { UI_CONSTANTS } from '@/constants/ui'
import { isValidAddress } from '@/utils/typeGuards'
import { useToast } from '@chakra-ui/react'
import { useCallback, useEffect } from 'react'
import { useAccount } from 'wagmi'

export function useWalletNotifications() {
  const { address, isConnected } = useAccount()
  const toast = useToast()

  useEffect(() => {
    if (isConnected && address && isValidAddress(address)) {
      toast({
        title: 'Wallet Connected',
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
        status: 'success',
        duration: UI_CONSTANTS.TOAST_DURATION.SUCCESS,
        isClosable: true,
      })
    }
  }, [isConnected, address, toast])

  const showDisconnectNotification = useCallback(() => {
    toast({
      title: 'Wallet Disconnected',
      status: 'info',
      duration: UI_CONSTANTS.TOAST_DURATION.INFO,
      isClosable: true,
    })
  }, [toast])

  const showErrorNotification = useCallback((error: string) => {
    toast({
      title: 'Connection Error',
      description: error,
      status: 'error',
      duration: UI_CONSTANTS.TOAST_DURATION.ERROR,
      isClosable: true,
    })
  }, [toast])

  return {
    showDisconnectNotification,
    showErrorNotification,
  }
}

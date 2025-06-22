'use client'

import { Box } from '@chakra-ui/react'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export function WalletConnectButton() {
  return (
    <Box>
      <ConnectButton
        showBalance={false}
        chainStatus="icon"
        accountStatus={{
          smallScreen: 'avatar',
          largeScreen: 'full',
        }}
      />
    </Box>
  )
}

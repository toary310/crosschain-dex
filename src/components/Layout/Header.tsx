'use client'

import { ChainSelector } from '@/components/Chain/ChainSelector'
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary'
import { Logo } from '@/components/Navigation/Logo'
import { MainNavigation } from '@/components/Navigation/MainNavigation'
import { MobileMenu } from '@/components/Navigation/MobileMenu'
import { ColorModeToggle } from '@/components/Theme/ColorModeToggle'
import { WalletConnectButton } from '@/components/WalletConnect/WalletConnectButton'
import { UI_CONSTANTS } from '@/constants/ui'
import { Box, Flex, HStack, useColorModeValue } from '@chakra-ui/react'

export function Header() {
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  return (
    <Box
      bg={bg}
      borderBottom="1px"
      borderColor={borderColor}
      px={4}
      py={3}
      position="sticky"
      top={0}
      zIndex={UI_CONSTANTS.Z_INDEX.HEADER}
    >
      <Flex alignItems="center" justifyContent="space-between" maxW="7xl" mx="auto">
        {/* Logo */}
        <Logo />

        {/* Navigation */}
        <MainNavigation />

        {/* Right side */}
        <HStack spacing={4}>
          {/* Chain Selector */}
          <ErrorBoundary>
            <ChainSelector />
          </ErrorBoundary>

          {/* Color Mode Toggle */}
          <ColorModeToggle />

          {/* Wallet Connect */}
          <ErrorBoundary>
            <WalletConnectButton />
          </ErrorBoundary>

          {/* Mobile Menu */}
          <MobileMenu />
        </HStack>
      </Flex>
    </Box>
  )
}

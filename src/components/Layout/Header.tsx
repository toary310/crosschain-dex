'use client'

import {
  Box,
  Flex,
  HStack,
  Text,
  Button,
  useColorMode,
  useColorModeValue,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Select,
} from '@chakra-ui/react'
import { MoonIcon, SunIcon, HamburgerIcon } from '@chakra-ui/icons'
import { WalletConnectButton } from '@/components/WalletConnect/WalletConnectButton'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { supportedChains, getChainConfig } from '@/config/chains'

export function Header() {
  const { colorMode, toggleColorMode } = useColorMode()
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const currentChain = getChainConfig(chainId)

  const handleChainSwitch = (newChainId: string) => {
    switchChain({ chainId: parseInt(newChainId) })
  }

  return (
    <Box
      bg={bg}
      borderBottom="1px"
      borderColor={borderColor}
      px={4}
      py={3}
      position="sticky"
      top={0}
      zIndex={1000}
    >
      <Flex alignItems="center" justifyContent="space-between" maxW="7xl" mx="auto">
        {/* Logo */}
        <HStack spacing={4}>
          <Text fontSize="xl" fontWeight="bold" color="primary.500">
            ChainBridge DEX
          </Text>
        </HStack>

        {/* Navigation */}
        <HStack spacing={6} display={{ base: 'none', md: 'flex' }}>
          <Button variant="ghost">Swap</Button>
          <Button variant="ghost">Liquidity</Button>
          <Button variant="ghost">Portfolio</Button>
          <Button variant="ghost">Analytics</Button>
        </HStack>

        {/* Right side */}
        <HStack spacing={4}>
          {/* Chain Selector */}
          {isConnected && (
            <Select
              value={chainId}
              onChange={(e) => handleChainSwitch(e.target.value)}
              width="auto"
              size="sm"
            >
              {supportedChains.map((chain) => {
                const config = getChainConfig(chain.id)
                return (
                  <option key={chain.id} value={chain.id}>
                    {config.name}
                  </option>
                )
              })}
            </Select>
          )}

          {/* Color Mode Toggle */}
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
            size="sm"
          />

          {/* Wallet Connect */}
          <WalletConnectButton />

          {/* Mobile Menu */}
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Open menu"
              icon={<HamburgerIcon />}
              variant="ghost"
              display={{ base: 'flex', md: 'none' }}
            />
            <MenuList>
              <MenuItem>Swap</MenuItem>
              <MenuItem>Liquidity</MenuItem>
              <MenuItem>Portfolio</MenuItem>
              <MenuItem>Analytics</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    </Box>
  )
}

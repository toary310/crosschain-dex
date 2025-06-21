'use client'

import {
    Avatar,
    Button,
    HStack,
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
    Spinner,
    Text,
    useToast,
} from '@chakra-ui/react'
// import { ChevronDownIcon } from '@chakra-ui/icons'
import { useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function WalletConnectButton() {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const toast = useToast()

  useEffect(() => {
    if (isConnected && address) {
      toast({
        title: 'Wallet Connected',
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    }
  }, [isConnected, address, toast])

  const handleConnect = (connector: any) => {
    connect({ connector })
  }

  const handleDisconnect = () => {
    disconnect()
    toast({
      title: 'Wallet Disconnected',
      status: 'info',
      duration: 2000,
      isClosable: true,
    })
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (isConnecting || isPending) {
    return (
      <Button isDisabled>
        <Spinner size="sm" mr={2} />
        Connecting...
      </Button>
    )
  }

  if (isConnected && address) {
    return (
      <Menu>
        <MenuButton as={Button} variant="outline">
          <HStack spacing={2}>
            <Avatar size="xs" name={address} />
            <Text>{formatAddress(address)}</Text>
          </HStack>
        </MenuButton>
        <MenuList>
          <MenuItem onClick={handleDisconnect}>
            Disconnect Wallet
          </MenuItem>
        </MenuList>
      </Menu>
    )
  }

  return (
    <Menu>
      <MenuButton as={Button}>
        Connect Wallet
      </MenuButton>
      <MenuList>
        {connectors.map((connector) => (
          <MenuItem
            key={connector.id}
            onClick={() => handleConnect(connector)}
            isDisabled={!connector.ready}
          >
            {connector.name}
            {!connector.ready && ' (unsupported)'}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  )
}

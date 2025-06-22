'use client'

import { useWalletConnection } from '@/hooks/useWalletConnection'
import { useWalletNotifications } from '@/hooks/useWalletNotifications'
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
} from '@chakra-ui/react'

export function WalletConnectButton() {
  const {
    address,
    isConnected,
    isConnecting,
    isPending,
    connectors,
    handleConnect,
    handleDisconnect,
    formatAddress,
  } = useWalletConnection()

  const { showDisconnectNotification } = useWalletNotifications()

  const onDisconnect = () => {
    handleDisconnect()
    showDisconnectNotification()
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
          <MenuItem onClick={onDisconnect}>
            Disconnect Wallet
          </MenuItem>
        </MenuList>
      </Menu>
    )
  }

  return (
    <Menu>
      <MenuButton as={Button} colorScheme="blue" rightIcon={<Text>▼</Text>}>
        Connect Wallet
      </MenuButton>
      <MenuList>
        {connectors.length > 0 ? (
          connectors.map((connector) => (
            <MenuItem
              key={connector.id}
              onClick={() => handleConnect(connector)}
              icon={<Text>🔗</Text>}
            >
              {connector.name}
            </MenuItem>
          ))
        ) : (
          <MenuItem isDisabled>
            No wallets available
          </MenuItem>
        )}
      </MenuList>
    </Menu>
  )
}

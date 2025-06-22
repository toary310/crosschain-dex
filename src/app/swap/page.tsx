'use client'

import { MainLayout } from '@/components/Layout/MainLayout'
import { TokenSelector } from '@/components/Swap/TokenSelector'
import { useSwapStore } from '@/store/useSwapStore'
import { useUIStore } from '@/store/useUIStore'
import { Token } from '@/config/tokens'
import {
    Box,
    Button,
    Card,
    CardBody,
    Divider,
    Heading,
    HStack,
    IconButton,
    Input,
    Text,
    useColorModeValue,
    useToast,
    VStack
} from '@chakra-ui/react'
import { useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'

export default function SwapPage() {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { setActiveTab } = useUIStore()
  const toast = useToast()
  const {
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    slippageTolerance,
    isLoading,
    setFromToken,
    setToToken,
    setFromAmount,
    setToAmount,
    setSlippageTolerance,
    swapTokens,
    resetSwap,
  } = useSwapStore()

  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  // Set active tab
  useEffect(() => {
    setActiveTab('swap')
  }, [setActiveTab])

  const handleSwap = () => {
    if (!isConnected) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }
    // TODO: Implement actual swap logic
    console.log('Swap initiated:', { fromToken, toToken, fromAmount, toAmount })
    toast({
      title: 'Swap initiated',
      description: 'Your swap transaction has been submitted',
      status: 'success',
      duration: 3000,
      isClosable: true,
    })
  }

  return (
    <MainLayout>
      <VStack spacing={8} align="stretch" maxW="md" mx="auto">
        {/* Page Header */}
        <Box textAlign="center">
          <Heading size="xl" mb={2}>
            Swap Tokens
          </Heading>
          <Text color="gray.500">
            Trade tokens across multiple blockchains
          </Text>
        </Box>

        {/* Swap Card */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4}>
              {/* From Token */}
              <Box w="full">
                <Text fontSize="sm" color="gray.500" mb={2}>
                  From
                </Text>
                <HStack spacing={2}>
                  <TokenSelector
                    selectedToken={fromToken || undefined}
                    onTokenSelect={(token: Token) => setFromToken(token)}
                    chainId={chainId}
                    excludeToken={toToken || undefined}
                    label="Select token"
                    showBalance={true}
                    userAddress={address}
                  />
                  <Input
                    placeholder="0.0"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    type="number"
                    w="120px"
                  />
                </HStack>
              </Box>

              {/* Swap Direction Button */}
              <IconButton
                aria-label="Swap tokens"
                icon={<Text fontSize="xl">⇅</Text>}
                onClick={swapTokens}
                variant="outline"
                size="sm"
                borderRadius="full"
              />

              {/* To Token */}
              <Box w="full">
                <Text fontSize="sm" color="gray.500" mb={2}>
                  To
                </Text>
                <HStack spacing={2}>
                  <TokenSelector
                    selectedToken={toToken || undefined}
                    onTokenSelect={(token: Token) => setToToken(token)}
                    chainId={chainId}
                    excludeToken={fromToken || undefined}
                    label="Select token"
                    showBalance={false}
                    userAddress={address}
                  />
                  <Input
                    placeholder="0.0"
                    value={toAmount}
                    onChange={(e) => setToAmount(e.target.value)}
                    type="number"
                    w="120px"
                    isReadOnly
                  />
                </HStack>
              </Box>

              <Divider />

              {/* Slippage Settings */}
              <Box w="full">
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm" color="gray.500">
                    Slippage Tolerance
                  </Text>
                  <Text fontSize="sm">
                    {slippageTolerance}%
                  </Text>
                </HStack>
                <HStack spacing={2}>
                  <Button
                    size="sm"
                    variant={slippageTolerance === 0.1 ? 'solid' : 'outline'}
                    onClick={() => setSlippageTolerance(0.1)}
                  >
                    0.1%
                  </Button>
                  <Button
                    size="sm"
                    variant={slippageTolerance === 0.5 ? 'solid' : 'outline'}
                    onClick={() => setSlippageTolerance(0.5)}
                  >
                    0.5%
                  </Button>
                  <Button
                    size="sm"
                    variant={slippageTolerance === 1.0 ? 'solid' : 'outline'}
                    onClick={() => setSlippageTolerance(1.0)}
                  >
                    1.0%
                  </Button>
                  <Input
                    size="sm"
                    placeholder="Custom"
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    w="80px"
                    onChange={(e) => setSlippageTolerance(parseFloat(e.target.value) || 0.5)}
                  />
                </HStack>
              </Box>

              <Divider />

              {/* Swap Button */}
              <Button
                colorScheme="primary"
                size="lg"
                w="full"
                onClick={handleSwap}
                isLoading={isLoading}
                isDisabled={!isConnected || !fromAmount || !toAmount}
              >
                {!isConnected ? 'Connect Wallet' : 'Swap Tokens'}
              </Button>

              {/* Reset Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetSwap}
              >
                Reset
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {/* Transaction Info */}
        {fromAmount && toAmount && (
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <VStack spacing={2} align="stretch">
                <Text fontSize="sm" fontWeight="semibold">
                  Transaction Details
                </Text>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.500">Rate</Text>
                  <Text fontSize="sm">1 ETH = 2,500 USDC</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.500">Network Fee</Text>
                  <Text fontSize="sm">~$5.00</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.500">Price Impact</Text>
                  <Text fontSize="sm" color="green.500">&lt; 0.01%</Text>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </MainLayout>
  )
}

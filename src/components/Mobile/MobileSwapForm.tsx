'use client'

import React, { useState, useCallback } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  useColorModeValue,
  Divider,
  Badge,
  Flex,
  Center,
  Spinner,
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiArrowDown, FiSettings, FiRefreshCw, FiZap } from 'react-icons/fi'
import { useIsMobile, useHapticFeedback, useTouchGestures } from '@/hooks/useMobile'
import { useTradingStore } from '@/store/advanced/store'
import { AccessibleButton } from '@/components/UI/AccessibleComponents'
import { TokenSelector } from '@/components/Swap/TokenSelector'

const MotionBox = motion(Box)
const MotionVStack = motion(VStack)

export const MobileSwapForm: React.FC = () => {
  const { isMobile } = useIsMobile()
  const { lightImpact, mediumImpact } = useHapticFeedback()
  const { isOpen: isSettingsOpen, onOpen: openSettings, onClose: closeSettings } = useDisclosure()
  
  const {
    trading,
    setFromToken,
    setToToken,
    setFromAmount,
    setToAmount,
    swapTokens,
    canTrade,
  } = useTradingStore()

  const [isSwapping, setIsSwapping] = useState(false)
  const swapRef = React.useRef<HTMLDivElement>(null)
  const { swipeDirection } = useTouchGestures(swapRef)

  // Theme colors
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const inputBg = useColorModeValue('gray.50', 'gray.700')

  // Handle swipe to swap tokens
  React.useEffect(() => {
    if (swipeDirection === 'up' || swipeDirection === 'down') {
      handleSwapTokens()
    }
  }, [swipeDirection])

  const handleSwapTokens = useCallback(() => {
    lightImpact()
    swapTokens()
  }, [lightImpact, swapTokens])

  const handleMaxAmount = useCallback(() => {
    lightImpact()
    setFromAmount('1000.0') // Mock max amount
  }, [lightImpact, setFromAmount])

  const handleSwap = useCallback(async () => {
    if (!canTrade()) return

    mediumImpact()
    setIsSwapping(true)
    
    try {
      // Mock swap process
      await new Promise(resolve => setTimeout(resolve, 2000))
      // Handle successful swap
    } catch (error) {
      // Handle error
    } finally {
      setIsSwapping(false)
    }
  }, [canTrade, mediumImpact])

  if (!isMobile) {
    return null // Use desktop version
  }

  return (
    <MotionBox
      bg={bg}
      borderRadius="2xl"
      p={4}
      mx={4}
      my={2}
      boxShadow="xl"
      border="1px solid"
      borderColor={borderColor}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <MotionVStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <Text fontSize="lg" fontWeight="bold">
            Swap
          </Text>
          <HStack spacing={2}>
            <IconButton
              aria-label="Refresh"
              icon={<FiRefreshCw />}
              size="sm"
              variant="ghost"
              borderRadius="full"
              onClick={() => {
                lightImpact()
                window.location.reload()
              }}
            />
            <IconButton
              aria-label="Settings"
              icon={<FiSettings />}
              size="sm"
              variant="ghost"
              borderRadius="full"
              onClick={() => {
                lightImpact()
                openSettings()
              }}
            />
          </HStack>
        </HStack>

        {/* From Token */}
        <Box
          bg={inputBg}
          borderRadius="xl"
          p={4}
          border="2px solid transparent"
          _focusWithin={{
            borderColor: 'primary.500',
          }}
        >
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.500" fontWeight="medium">
                From
              </Text>
              <Text fontSize="sm" color="gray.500">
                Balance: 1,234.56
              </Text>
            </HStack>
            
            <HStack spacing={3}>
              <Box flex={1}>
                <TokenSelector
                  selectedToken={trading.fromToken}
                  onTokenSelect={setFromToken}
                  chainId={1}
                  excludeToken={trading.toToken}
                  compact
                />
              </Box>
              
              <VStack spacing={1} flex={1} align="stretch">
                <InputGroup size="lg">
                  <Input
                    placeholder="0.0"
                    value={trading.fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    fontSize="xl"
                    fontWeight="semibold"
                    textAlign="right"
                    border="none"
                    bg="transparent"
                    _focus={{ boxShadow: 'none' }}
                  />
                  <InputRightElement width="auto" pr={2}>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="primary"
                      onClick={handleMaxAmount}
                    >
                      MAX
                    </Button>
                  </InputRightElement>
                </InputGroup>
                
                {trading.fromToken && (
                  <Text fontSize="sm" color="gray.500" textAlign="right">
                    ≈ $1,234.56
                  </Text>
                )}
              </VStack>
            </HStack>
          </VStack>
        </Box>

        {/* Swap Button */}
        <Center>
          <MotionBox
            ref={swapRef}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.1 }}
          >
            <IconButton
              aria-label="Swap tokens"
              icon={<FiArrowDown />}
              size="lg"
              variant="outline"
              borderRadius="full"
              bg={bg}
              borderColor={borderColor}
              onClick={handleSwapTokens}
              _hover={{
                transform: 'rotate(180deg)',
                borderColor: 'primary.500',
              }}
              transition="all 0.3s ease"
            />
          </MotionBox>
        </Center>

        {/* To Token */}
        <Box
          bg={inputBg}
          borderRadius="xl"
          p={4}
          border="2px solid transparent"
          _focusWithin={{
            borderColor: 'primary.500',
          }}
        >
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.500" fontWeight="medium">
                To
              </Text>
              <Text fontSize="sm" color="gray.500">
                Balance: 567.89
              </Text>
            </HStack>
            
            <HStack spacing={3}>
              <Box flex={1}>
                <TokenSelector
                  selectedToken={trading.toToken}
                  onTokenSelect={setToToken}
                  chainId={1}
                  excludeToken={trading.fromToken}
                  compact
                />
              </Box>
              
              <VStack spacing={1} flex={1} align="stretch">
                <Input
                  placeholder="0.0"
                  value={trading.toAmount}
                  isReadOnly
                  fontSize="xl"
                  fontWeight="semibold"
                  textAlign="right"
                  border="none"
                  bg="transparent"
                  _focus={{ boxShadow: 'none' }}
                />
                
                {trading.toToken && (
                  <Text fontSize="sm" color="gray.500" textAlign="right">
                    ≈ $1,234.56
                  </Text>
                )}
              </VStack>
            </HStack>
          </VStack>
        </Box>

        {/* Quote Information */}
        {trading.lastQuote && (
          <AnimatePresence>
            <MotionBox
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              bg={useColorModeValue('gray.50', 'gray.700')}
              borderRadius="lg"
              p={3}
            >
              <VStack spacing={2}>
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" color="gray.500">Rate</Text>
                  <Text fontSize="sm" fontWeight="medium">
                    1 {trading.fromToken?.symbol} = {trading.lastQuote.rate.toFixed(6)} {trading.toToken?.symbol}
                  </Text>
                </HStack>
                
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" color="gray.500">Price Impact</Text>
                  <Badge
                    colorScheme={trading.lastQuote.priceImpact < 1 ? 'green' : trading.lastQuote.priceImpact < 3 ? 'yellow' : 'red'}
                    variant="subtle"
                  >
                    {trading.lastQuote.priceImpact.toFixed(2)}%
                  </Badge>
                </HStack>
                
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" color="gray.500">Network Fee</Text>
                  <Text fontSize="sm" fontWeight="medium">~$2.50</Text>
                </HStack>
              </VStack>
            </MotionBox>
          </AnimatePresence>
        )}

        {/* Swap Button */}
        <AccessibleButton
          size="lg"
          variant="gradient"
          isLoading={isSwapping}
          loadingText="Swapping..."
          disabled={!canTrade() || isSwapping}
          onClick={handleSwap}
          leftIcon={<FiZap />}
          animation="bounce"
          w="full"
          h="56px"
          fontSize="lg"
          fontWeight="bold"
        >
          {!trading.fromToken || !trading.toToken ? 'Select Tokens' : 
           !trading.fromAmount ? 'Enter Amount' :
           'Swap Tokens'}
        </AccessibleButton>

        {/* Swipe Hint */}
        <Center>
          <Text fontSize="xs" color="gray.400" textAlign="center">
            💡 Swipe up or down to swap tokens
          </Text>
        </Center>
      </MotionVStack>

      {/* Settings Drawer */}
      <Drawer isOpen={isSettingsOpen} placement="bottom" onClose={closeSettings}>
        <DrawerOverlay />
        <DrawerContent borderTopRadius="2xl">
          <DrawerCloseButton />
          <DrawerHeader>Swap Settings</DrawerHeader>
          
          <DrawerBody pb={8}>
            <VStack spacing={6} align="stretch">
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={3}>
                  Slippage Tolerance
                </Text>
                <HStack spacing={2}>
                  {[0.1, 0.5, 1.0].map(value => (
                    <Button
                      key={value}
                      size="sm"
                      variant={trading.slippage === value ? 'solid' : 'outline'}
                      onClick={() => {
                        lightImpact()
                        // setSlippage(value)
                      }}
                      flex={1}
                    >
                      {value}%
                    </Button>
                  ))}
                </HStack>
              </Box>
              
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={3}>
                  Transaction Deadline
                </Text>
                <HStack spacing={2}>
                  <Input
                    placeholder="20"
                    value={trading.deadline}
                    onChange={(e) => {
                      // setDeadline(parseInt(e.target.value) || 20)
                    }}
                    size="sm"
                    textAlign="center"
                  />
                  <Text fontSize="sm" color="gray.500">minutes</Text>
                </HStack>
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </MotionBox>
  )
}

'use client'

import { MainLayout } from '@/components/Layout/MainLayout'
import { SimpleSwapForm } from '@/components/Swap/SimpleSwapForm'
import { useUIStore } from '@/store/useUIStore'
import {
    Box,
    Heading,
    Text,
    VStack
} from '@chakra-ui/react'
import { useEffect } from 'react'
import { useChainId } from 'wagmi'

export default function SwapPage() {
  const chainId = useChainId()
  const { setActiveTab } = useUIStore()

  // Set active tab
  useEffect(() => {
    setActiveTab('swap')
  }, [setActiveTab])

  return (
    <MainLayout>
      <VStack spacing={8} align="stretch" maxW="2xl" mx="auto" py={8}>
        {/* Page Header */}
        <Box textAlign="center">
          <Heading size="xl" mb={2}>
            Swap Tokens
          </Heading>
          <Text color="gray.500">
            Trade tokens across multiple blockchains with the best rates
          </Text>
        </Box>

        {/* Simple Swap Form */}
        <SimpleSwapForm chainId={chainId} />
      </VStack>
    </MainLayout>
  )
}

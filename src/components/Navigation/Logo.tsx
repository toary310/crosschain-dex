'use client'

import { HStack, Text } from '@chakra-ui/react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ size = 'md' }: LogoProps) {
  const fontSize = {
    sm: 'lg',
    md: 'xl',
    lg: '2xl',
  }[size]

  return (
    <HStack spacing={4}>
      <Text fontSize={fontSize} fontWeight="bold" color="primary.500">
        ChainBridge DEX
      </Text>
    </HStack>
  )
}

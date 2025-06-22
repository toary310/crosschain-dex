'use client'

import { Box, Text, HStack, Link } from '@chakra-ui/react'

export function Footer() {
  return (
    <Box as="footer" py={4} px={6} borderTop="1px" borderColor="gray.200">
      <HStack justify="space-between">
        <Text fontSize="sm" color="gray.600">
          © 2024 ChainBridge DEX. All rights reserved.
        </Text>
        <HStack spacing={4}>
          <Link href="/privacy" fontSize="sm" color="gray.600">
            Privacy
          </Link>
          <Link href="/terms" fontSize="sm" color="gray.600">
            Terms
          </Link>
        </HStack>
      </HStack>
    </Box>
  )
}

export default Footer

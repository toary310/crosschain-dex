'use client'

import { theme } from '@/theme'
import { ChakraProvider as BaseChakraProvider } from '@chakra-ui/react'
import { ReactNode, useEffect, useState } from 'react'

interface ChakraProviderProps {
  children: ReactNode
}

export function ChakraProvider({ children }: ChakraProviderProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <BaseChakraProvider theme={theme}>
        <div style={{ visibility: 'hidden' }}>
          {children}
        </div>
      </BaseChakraProvider>
    )
  }

  return (
    <BaseChakraProvider theme={theme}>
      {children}
    </BaseChakraProvider>
  )
}

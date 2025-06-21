'use client'

import { ChakraProvider as BaseChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { theme } from '@/theme'
import { ReactNode } from 'react'

interface ChakraProviderProps {
  children: ReactNode
}

export function ChakraProvider({ children }: ChakraProviderProps) {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <BaseChakraProvider theme={theme}>
        {children}
      </BaseChakraProvider>
    </>
  )
}

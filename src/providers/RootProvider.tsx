'use client'

import { ReactNode } from 'react'
import { ChakraProvider } from './ChakraProvider'
import { Web3Provider } from './Web3Provider'

interface RootProviderProps {
  children: ReactNode
}

export function RootProvider({ children }: RootProviderProps) {
  return (
    <ChakraProvider>
      <Web3Provider>
        {children}
      </Web3Provider>
    </ChakraProvider>
  )
}

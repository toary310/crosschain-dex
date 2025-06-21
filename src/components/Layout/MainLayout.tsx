'use client'

import { Box, Container } from '@chakra-ui/react'
import { Header } from './Header'
import { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <Box minH="100vh">
      <Header />
      <Container maxW="7xl" py={8}>
        {children}
      </Container>
    </Box>
  )
}

'use client'

import { useIsMobile, useSafeAreaInsets, useViewportHeight } from '@/hooks/useMobile'
import {
    Badge,
    Box,
    Container,
    Divider,
    Drawer,
    DrawerBody,
    DrawerCloseButton,
    DrawerContent,
    DrawerHeader,
    DrawerOverlay,
    Flex,
    HStack,
    IconButton,
    Text,
    useBreakpointValue,
    useColorModeValue,
    useDisclosure,
    VStack,
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import React from 'react'
import { FiHome, FiMenu, FiPieChart, FiTrendingUp } from 'react-icons/fi'
import { Footer } from './Footer'
import { Header } from './Header'

const MotionBox = motion(Box)
const MotionFlex = motion(Flex)

interface ResponsiveLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
  sidebarContent?: React.ReactNode
  maxWidth?: string
  padding?: number | string
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  showSidebar = false,
  sidebarContent,
  maxWidth = '7xl',
  padding = 4,
}) => {
  const { isMobile, isTablet } = useIsMobile()
  const safeAreaInsets = useSafeAreaInsets()
  const viewportHeight = useViewportHeight()
  const { isOpen, onOpen, onClose } = useDisclosure()

  const bg = useColorModeValue('gray.50', 'gray.900')
  const sidebarBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  // Responsive sidebar width
  const sidebarWidth = useBreakpointValue({
    base: '280px',
    md: '320px',
    lg: '360px',
  })

  // Dynamic layout based on screen size
  const layoutConfig = {
    mobile: {
      showSidebar: false,
      useMobileNav: true,
      containerPadding: 2,
    },
    tablet: {
      showSidebar: showSidebar,
      useMobileNav: false,
      containerPadding: 4,
    },
    desktop: {
      showSidebar: showSidebar,
      useMobileNav: false,
      containerPadding: 6,
    },
  }

  const currentConfig = isMobile
    ? layoutConfig.mobile
    : isTablet
    ? layoutConfig.tablet
    : layoutConfig.desktop

  // Mobile navigation items
  const mobileNavItems = [
    { icon: FiHome, label: 'ホーム', href: '/', badge: null },
    { icon: FiTrendingUp, label: 'スワップ', href: '/swap', badge: null },
    { icon: FiPieChart, label: 'プール', href: '/pools', badge: '新機能' },
    { icon: FiBarChart, label: 'ポートフォリオ', href: '/portfolio', badge: '3' },
  ]

  // Sidebar component
  const SidebarContent = () => (
    <VStack spacing={4} align="stretch" h="full">
      <Box p={4}>
        <Text fontSize="lg" fontWeight="bold">
          Navigation
        </Text>
      </Box>
      <Divider />
      <Box flex={1} p={4}>
        {sidebarContent || (
          <VStack spacing={2} align="stretch">
            {mobileNavItems.map((item) => (
              <HStack
                key={item.href}
                p={3}
                borderRadius="lg"
                _hover={{ bg: useColorModeValue('gray.100', 'gray.700') }}
                cursor="pointer"
                transition="all 0.2s"
              >
                <Box as={item.icon} size={20} />
                <Text flex={1}>{item.label}</Text>
                {item.badge && (
                  <Badge colorScheme="primary" variant="solid" borderRadius="full">
                    {item.badge}
                  </Badge>
                )}
              </HStack>
            ))}
          </VStack>
        )}
      </Box>
    </VStack>
  )

  // Mobile bottom navigation
  const MobileBottomNav = () => (
    <MotionBox
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      bg={sidebarBg}
      borderTop="1px solid"
      borderColor={borderColor}
      zIndex={1000}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        paddingBottom: safeAreaInsets.bottom,
      }}
    >
      <HStack spacing={0} justify="space-around" py={2}>
        {mobileNavItems.map((item) => (
          <VStack
            key={item.href}
            spacing={1}
            p={2}
            borderRadius="lg"
            cursor="pointer"
            _hover={{ bg: useColorModeValue('gray.100', 'gray.700') }}
            transition="all 0.2s"
            position="relative"
          >
            <Box as={item.icon} size={20} />
            <Text fontSize="xs" fontWeight="medium">
              {item.label}
            </Text>
            {item.badge && (
              <Badge
                position="absolute"
                top={0}
                right={0}
                colorScheme="red"
                variant="solid"
                borderRadius="full"
                fontSize="xs"
                minW="18px"
                h="18px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {item.badge}
              </Badge>
            )}
          </VStack>
        ))}
      </HStack>
    </MotionBox>
  )

  return (
    <Box
      minH={viewportHeight || '100vh'}
      bg={bg}
      style={{
        paddingTop: safeAreaInsets.top,
        paddingLeft: safeAreaInsets.left,
        paddingRight: safeAreaInsets.right,
      }}
    >
      {/* Header */}
      <Header />

      {/* Main Layout */}
      <Flex flex={1}>
        {/* Desktop Sidebar */}
        {currentConfig.showSidebar && !isMobile && (
          <MotionBox
            w={sidebarWidth}
            bg={sidebarBg}
            borderRight="1px solid"
            borderColor={borderColor}
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3 }}
            position="sticky"
            top={0}
            h={`calc(${viewportHeight || '100vh'}px - 80px)`}
            overflowY="auto"
          >
            <SidebarContent />
          </MotionBox>
        )}

        {/* Main Content */}
        <Box flex={1} position="relative">
          <Container
            maxW={maxWidth}
            p={currentConfig.containerPadding}
            pb={isMobile ? '80px' : currentConfig.containerPadding} // Extra padding for mobile nav
          >
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {children}
            </MotionBox>
          </Container>
        </Box>
      </Flex>

      {/* Mobile Sidebar Drawer */}
      {isMobile && (
        <>
          {/* Mobile Menu Button */}
          <IconButton
            aria-label="Open menu"
            icon={<FiMenu />}
            position="fixed"
            top={4}
            left={4}
            zIndex={1001}
            onClick={onOpen}
            bg={sidebarBg}
            border="1px solid"
            borderColor={borderColor}
            boxShadow="lg"
          />

          <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="sm">
            <DrawerOverlay />
            <DrawerContent>
              <DrawerCloseButton />
              <DrawerHeader>Menu</DrawerHeader>
              <DrawerBody p={0}>
                <SidebarContent />
              </DrawerBody>
            </DrawerContent>
          </Drawer>
        </>
      )}

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav />}

      {/* Footer (hidden on mobile) */}
      {!isMobile && <Footer />}
    </Box>
  )
}

// Responsive Grid Component
interface ResponsiveGridProps {
  children: React.ReactNode
  columns?: {
    base?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  spacing?: number | string
  minChildWidth?: string
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { base: 1, md: 2, lg: 3 },
  spacing = 4,
  minChildWidth,
}) => {
  const { isMobile } = useIsMobile()

  if (minChildWidth) {
    return (
      <Box
        display="grid"
        gridTemplateColumns={`repeat(auto-fit, minmax(${minChildWidth}, 1fr))`}
        gap={spacing}
      >
        {children}
      </Box>
    )
  }

  const gridColumns = useBreakpointValue(columns)

  return (
    <Box
      display="grid"
      gridTemplateColumns={`repeat(${gridColumns}, 1fr)`}
      gap={spacing}
    >
      {children}
    </Box>
  )
}

// Responsive Stack Component
interface ResponsiveStackProps {
  children: React.ReactNode
  direction?: {
    base?: 'row' | 'column'
    sm?: 'row' | 'column'
    md?: 'row' | 'column'
    lg?: 'row' | 'column'
  }
  spacing?: number | string
  align?: string
  justify?: string
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  direction = { base: 'column', md: 'row' },
  spacing = 4,
  align = 'stretch',
  justify = 'flex-start',
}) => {
  const flexDirection = useBreakpointValue(direction)

  return (
    <Flex
      direction={flexDirection}
      gap={spacing}
      align={align}
      justify={justify}
    >
      {children}
    </Flex>
  )
}

// Responsive Container Component
interface ResponsiveContainerProps {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  centerContent?: boolean
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  size = 'lg',
  centerContent = false,
}) => {
  const maxWidths = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    full: '100%',
  }

  return (
    <Container
      maxW={maxWidths[size]}
      centerContent={centerContent}
      px={{ base: 4, md: 6, lg: 8 }}
    >
      {children}
    </Container>
  )
}

'use client'

import { NAVIGATION_ITEMS } from '@/constants/navigation'
import { useHapticFeedback } from '@/hooks/useMobile'
import { useUIStore } from '@/store/useUIStore'
import { isValidNavigationId } from '@/utils/typeGuards'
import {
    Badge,
    Box,
    Button,
    HStack,
    Tooltip,
    useColorModeValue,
} from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { memo, useCallback } from 'react'

const MotionButton = motion(Button)
const MotionBox = motion(Box)

export const MainNavigation = memo(function MainNavigation() {
  const { activeTab, setActiveTab } = useUIStore()
  const router = useRouter()
  const pathname = usePathname()
  const { lightImpact } = useHapticFeedback()

  const activeBg = useColorModeValue('primary.500', 'primary.600')
  const hoverBg = useColorModeValue('gray.100', 'gray.700')

  const handleTabClick = useCallback((itemId: string, path: string) => {
    if (isValidNavigationId(itemId)) {
      lightImpact()
      setActiveTab(itemId)
      router.push(path)
    }
  }, [setActiveTab, router, lightImpact])

  const isActive = useCallback((path: string) => {
    if (path === '/' && pathname === '/') return true
    if (path !== '/' && pathname.startsWith(path)) return true
    return false
  }, [pathname])

  return (
    <HStack spacing={2} display={{ base: 'none', md: 'flex' }}>
      {NAVIGATION_ITEMS.map((item, index) => {
        const active = isActive(item.path)

        return (
          <Tooltip
            key={item.id}
            label={`Navigate to ${item.label}`}
            hasArrow
            placement="bottom"
          >
            <MotionBox
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MotionButton
                variant={active ? 'solid' : 'ghost'}
                colorScheme={active ? 'primary' : 'gray'}
                size="md"
                position="relative"
                onClick={() => handleTabClick(item.id, item.path)}
                _hover={{
                  bg: active ? activeBg : hoverBg,
                  transform: 'translateY(-1px)',
                }}
                _active={{
                  transform: 'translateY(0)',
                }}
                transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                fontWeight={active ? 'bold' : 'medium'}
              >
                {item.label}

                {/* Active indicator */}
                <AnimatePresence>
                  {active && (
                    <MotionBox
                      position="absolute"
                      bottom="-2px"
                      left="50%"
                      w="80%"
                      h="2px"
                      bg="primary.500"
                      borderRadius="full"
                      initial={{ opacity: 0, scale: 0, x: '-50%' }}
                      animate={{ opacity: 1, scale: 1, x: '-50%' }}
                      exit={{ opacity: 0, scale: 0, x: '-50%' }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </AnimatePresence>

                {/* Notification badge for specific items */}
                {item.id === 'portfolio' && (
                  <Badge
                    position="absolute"
                    top="-1"
                    right="-1"
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
                    3
                  </Badge>
                )}
              </MotionButton>
            </MotionBox>
          </Tooltip>
        )
      })}
    </HStack>
  )
})

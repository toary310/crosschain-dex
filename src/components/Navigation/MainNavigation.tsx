'use client'

import { NAVIGATION_ITEMS } from '@/constants/navigation'
import { useUIStore } from '@/store/useUIStore'
import { isValidNavigationId } from '@/utils/typeGuards'
import { Button, HStack } from '@chakra-ui/react'
import { memo, useCallback } from 'react'

export const MainNavigation = memo(function MainNavigation() {
  const { activeTab, setActiveTab } = useUIStore()

  const handleTabClick = useCallback((itemId: string) => {
    if (isValidNavigationId(itemId)) {
      setActiveTab(itemId)
    }
  }, [setActiveTab])

  return (
    <HStack spacing={6} display={{ base: 'none', md: 'flex' }}>
      {NAVIGATION_ITEMS.map((item) => (
        <Button
          key={item.id}
          variant={activeTab === item.id ? 'solid' : 'ghost'}
          onClick={() => handleTabClick(item.id)}
        >
          {item.label}
        </Button>
      ))}
    </HStack>
  )
})

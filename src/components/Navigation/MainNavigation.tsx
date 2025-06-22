'use client'

import { NAVIGATION_ITEMS } from '@/constants/navigation'
import { useUIStore } from '@/store/useUIStore'
import { isValidNavigationId } from '@/utils/typeGuards'
import { Button, HStack } from '@chakra-ui/react'
import { usePathname, useRouter } from 'next/navigation'
import { memo, useCallback } from 'react'

export const MainNavigation = memo(function MainNavigation() {
  const { activeTab, setActiveTab } = useUIStore()
  const router = useRouter()
  const pathname = usePathname()

  const handleTabClick = useCallback((itemId: string, path: string) => {
    if (isValidNavigationId(itemId)) {
      setActiveTab(itemId)
      router.push(path)
    }
  }, [setActiveTab, router])

  return (
    <HStack spacing={6} display={{ base: 'none', md: 'flex' }}>
      {NAVIGATION_ITEMS.map((item) => (
        <Button
          key={item.id}
          variant={pathname === item.path ? 'solid' : 'ghost'}
          onClick={() => handleTabClick(item.id, item.path)}
        >
          {item.label}
        </Button>
      ))}
    </HStack>
  )
})

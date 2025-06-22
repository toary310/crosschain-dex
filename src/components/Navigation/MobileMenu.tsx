'use client'

import { NAVIGATION_ITEMS } from '@/constants/navigation'
import { EMOJI_ICONS } from '@/constants/ui'
import { useUIStore } from '@/store/useUIStore'
import { isValidNavigationId } from '@/utils/typeGuards'
import {
    Button,
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
} from '@chakra-ui/react'
import { memo, useCallback } from 'react'

export const MobileMenu = memo(function MobileMenu() {
  const { setActiveTab } = useUIStore()

  const handleItemClick = useCallback((itemId: string) => {
    if (isValidNavigationId(itemId)) {
      setActiveTab(itemId)
    }
  }, [setActiveTab])

  return (
    <Menu>
      <MenuButton
        as={Button}
        aria-label="Open menu"
        variant="ghost"
        display={{ base: 'flex', md: 'none' }}
      >
        {EMOJI_ICONS.MENU}
      </MenuButton>
      <MenuList>
        {NAVIGATION_ITEMS.map((item) => (
          <MenuItem
            key={item.id}
            onClick={() => handleItemClick(item.id)}
          >
            {item.label}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  )
})

'use client'

import { EMOJI_ICONS } from '@/constants/ui'
import { Button, useColorMode } from '@chakra-ui/react'
import { memo, useMemo } from 'react'

export const ColorModeToggle = memo(function ColorModeToggle() {
  const { colorMode, toggleColorMode } = useColorMode()

  const { icon, ariaLabel, title } = useMemo(() => ({
    icon: colorMode === 'light' ? EMOJI_ICONS.DARK_MODE : EMOJI_ICONS.LIGHT_MODE,
    ariaLabel: `Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`,
    title: `Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`,
  }), [colorMode])

  return (
    <Button
      aria-label={ariaLabel}
      onClick={toggleColorMode}
      variant="ghost"
      size="sm"
      title={title}
    >
      {icon}
    </Button>
  )
})

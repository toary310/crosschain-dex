'use client'

import { useColorMode } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

export function useColorModeValue<T>(light: T, dark: T): T {
  const { colorMode } = useColorMode()
  const [value, setValue] = useState<T>(light)

  useEffect(() => {
    setValue(colorMode === 'light' ? light : dark)
  }, [colorMode, light, dark])

  return value
}

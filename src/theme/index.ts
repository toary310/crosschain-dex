import { extendTheme } from '@chakra-ui/react'
import { mode } from '@chakra-ui/theme-tools'
import {
    colors,
    config,
    fonts,
    fontSizes,
    radii,
    shadows,
    space,
    transition
} from './advanced'
import { components } from './components'

// Global styles with enhanced theming
const styles = {
  global: (props: any) => ({
    body: {
      bg: mode('gray.50', 'gray.900')(props),
      color: mode('gray.900', 'gray.50')(props),
      transition: 'background-color 0.2s, color 0.2s',
      fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
      fontVariantNumeric: 'oldstyle-nums',
      textRendering: 'optimizeLegibility',
    },
    '*': {
      borderColor: mode('gray.200', 'gray.700')(props),
    },
    '*::placeholder': {
      color: mode('gray.400', 'gray.500')(props),
    },
    '*, *::before, &::after': {
      borderColor: mode('gray.200', 'gray.700')(props),
      wordWrap: 'break-word',
    },
    // Scrollbar styling
    '::-webkit-scrollbar': {
      width: '8px',
    },
    '::-webkit-scrollbar-track': {
      bg: mode('gray.100', 'gray.800')(props),
    },
    '::-webkit-scrollbar-thumb': {
      bg: mode('gray.300', 'gray.600')(props),
      borderRadius: 'full',
    },
    '::-webkit-scrollbar-thumb:hover': {
      bg: mode('gray.400', 'gray.500')(props),
    },
    // Focus styles
    ':focus-visible': {
      outline: '2px solid',
      outlineColor: 'primary.500',
      outlineOffset: '2px',
    },
  }),
}

export const theme = extendTheme({
  config,
  colors,
  fonts,
  fontSizes,
  space,
  shadows,
  radii,
  transition,
  components,
  styles,
})

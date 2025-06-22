import { mode } from '@chakra-ui/theme-tools'
import type { ComponentStyleConfig, SystemStyleObject } from '@chakra-ui/react'

// Enhanced Button Component with micro-interactions
const Button: ComponentStyleConfig = {
  baseStyle: {
    fontWeight: 'semibold',
    borderRadius: 'lg',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    _focus: {
      boxShadow: 'outline',
      outline: 'none',
    },
    _disabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
      transform: 'none',
    },
    _active: {
      transform: 'scale(0.98)',
    },
  },
  sizes: {
    xs: {
      h: 6,
      minW: 6,
      fontSize: 'xs',
      px: 2,
    },
    sm: {
      h: 8,
      minW: 8,
      fontSize: 'sm',
      px: 3,
    },
    md: {
      h: 10,
      minW: 10,
      fontSize: 'md',
      px: 4,
    },
    lg: {
      h: 12,
      minW: 12,
      fontSize: 'lg',
      px: 6,
    },
    xl: {
      h: 14,
      minW: 14,
      fontSize: 'xl',
      px: 8,
    },
  },
  variants: {
    solid: (props) => ({
      bg: mode('primary.500', 'primary.600')(props),
      color: 'white',
      _hover: {
        bg: mode('primary.600', 'primary.700')(props),
        transform: 'translateY(-1px)',
        boxShadow: 'lg',
        _disabled: {
          bg: mode('primary.500', 'primary.600')(props),
          transform: 'none',
        },
      },
      _active: {
        bg: mode('primary.700', 'primary.800')(props),
        transform: 'scale(0.98)',
      },
    }),
    outline: (props) => ({
      border: '2px solid',
      borderColor: mode('primary.500', 'primary.400')(props),
      color: mode('primary.500', 'primary.400')(props),
      bg: 'transparent',
      _hover: {
        bg: mode('primary.50', 'primary.900')(props),
        borderColor: mode('primary.600', 'primary.300')(props),
        transform: 'translateY(-1px)',
        boxShadow: 'md',
      },
      _active: {
        bg: mode('primary.100', 'primary.800')(props),
        transform: 'scale(0.98)',
      },
    }),
    ghost: (props) => ({
      color: mode('primary.500', 'primary.400')(props),
      bg: 'transparent',
      _hover: {
        bg: mode('primary.50', 'primary.900')(props),
        transform: 'translateY(-1px)',
      },
      _active: {
        bg: mode('primary.100', 'primary.800')(props),
        transform: 'scale(0.98)',
      },
    }),
    gradient: {
      bgGradient: 'linear(to-r, primary.400, accent.400)',
      color: 'white',
      _hover: {
        bgGradient: 'linear(to-r, primary.500, accent.500)',
        transform: 'translateY(-1px)',
        boxShadow: 'glow',
      },
      _active: {
        transform: 'scale(0.98)',
      },
    },
    success: (props) => ({
      bg: mode('success.500', 'success.600')(props),
      color: 'white',
      _hover: {
        bg: mode('success.600', 'success.700')(props),
        transform: 'translateY(-1px)',
        boxShadow: 'glow-success',
      },
    }),
    danger: (props) => ({
      bg: mode('error.500', 'error.600')(props),
      color: 'white',
      _hover: {
        bg: mode('error.600', 'error.700')(props),
        transform: 'translateY(-1px)',
        boxShadow: 'glow-error',
      },
    }),
  },
  defaultProps: {
    variant: 'solid',
    size: 'md',
  },
}

// Enhanced Card Component with hover effects
const Card: ComponentStyleConfig = {
  baseStyle: (props) => ({
    container: {
      borderRadius: '2xl',
      bg: mode('white', 'gray.800')(props),
      boxShadow: mode('lg', 'dark-lg')(props),
      border: '1px solid',
      borderColor: mode('gray.200', 'gray.700')(props),
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      _hover: {
        transform: 'translateY(-2px)',
        boxShadow: mode('card-hover', 'dark-lg')(props),
        borderColor: mode('gray.300', 'gray.600')(props),
      },
    },
    header: {
      p: 6,
      pb: 0,
    },
    body: {
      p: 6,
    },
    footer: {
      p: 6,
      pt: 0,
    },
  }),
  variants: {
    elevated: (props) => ({
      container: {
        boxShadow: mode('xl', 'dark-lg')(props),
        _hover: {
          boxShadow: mode('2xl', 'dark-lg')(props),
          transform: 'translateY(-4px)',
        },
      },
    }),
    outline: (props) => ({
      container: {
        bg: 'transparent',
        border: '2px solid',
        borderColor: mode('gray.200', 'gray.700')(props),
        boxShadow: 'none',
        _hover: {
          borderColor: mode('primary.300', 'primary.600')(props),
          boxShadow: mode('md', 'dark-lg')(props),
        },
      },
    }),
    filled: (props) => ({
      container: {
        bg: mode('gray.50', 'gray.900')(props),
        border: 'none',
        _hover: {
          bg: mode('gray.100', 'gray.800')(props),
        },
      },
    }),
    gradient: {
      container: {
        bgGradient: 'linear(135deg, primary.50, accent.50)',
        _dark: {
          bgGradient: 'linear(135deg, primary.900, accent.900)',
        },
        border: 'none',
        _hover: {
          bgGradient: 'linear(135deg, primary.100, accent.100)',
          _dark: {
            bgGradient: 'linear(135deg, primary.800, accent.800)',
          },
        },
      },
    },
  },
  defaultProps: {
    variant: 'elevated',
  },
}

// Enhanced Input Component with focus states
const Input: ComponentStyleConfig = {
  baseStyle: {
    field: {
      borderRadius: 'lg',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      _focus: {
        borderColor: 'primary.500',
        boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)',
        transform: 'scale(1.01)',
      },
      _invalid: {
        borderColor: 'error.500',
        boxShadow: '0 0 0 1px var(--chakra-colors-error-500)',
      },
    },
  },
  variants: {
    outline: (props) => ({
      field: {
        border: '2px solid',
        borderColor: mode('gray.200', 'gray.600')(props),
        bg: mode('white', 'gray.800')(props),
        _hover: {
          borderColor: mode('gray.300', 'gray.500')(props),
        },
        _focus: {
          borderColor: 'primary.500',
          boxShadow: 'outline',
        },
      },
    }),
    filled: (props) => ({
      field: {
        bg: mode('gray.100', 'gray.700')(props),
        border: '2px solid transparent',
        _hover: {
          bg: mode('gray.200', 'gray.600')(props),
        },
        _focus: {
          bg: mode('white', 'gray.800')(props),
          borderColor: 'primary.500',
        },
      },
    }),
  },
}

// Enhanced Badge Component
const Badge: ComponentStyleConfig = {
  baseStyle: {
    px: 2,
    py: 1,
    borderRadius: 'md',
    fontSize: 'xs',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 'wider',
  },
  variants: {
    solid: (props) => ({
      bg: mode('gray.500', 'gray.400')(props),
      color: 'white',
    }),
    subtle: (props) => ({
      bg: mode('gray.100', 'gray.700')(props),
      color: mode('gray.800', 'gray.200')(props),
    }),
    outline: (props) => ({
      border: '1px solid',
      borderColor: mode('gray.200', 'gray.600')(props),
      color: mode('gray.600', 'gray.400')(props),
    }),
    success: {
      bg: 'success.500',
      color: 'white',
    },
    warning: {
      bg: 'warning.500',
      color: 'white',
    },
    error: {
      bg: 'error.500',
      color: 'white',
    },
    profit: {
      bg: 'profit.500',
      color: 'white',
    },
    loss: {
      bg: 'loss.500',
      color: 'white',
    },
  },
}

// Enhanced Tooltip Component
const Tooltip: ComponentStyleConfig = {
  baseStyle: (props) => ({
    bg: mode('gray.700', 'gray.300')(props),
    color: mode('white', 'gray.800')(props),
    borderRadius: 'md',
    fontWeight: 'medium',
    fontSize: 'sm',
    boxShadow: 'lg',
    maxW: 'xs',
    px: 3,
    py: 2,
  }),
}

export const components = {
  Button,
  Card,
  Input,
  Badge,
  Tooltip,
}

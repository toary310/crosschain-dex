'use client'

import { useEffect, useState, useCallback } from 'react'
import { useBreakpointValue } from '@chakra-ui/react'

// Enhanced mobile detection and optimization hooks

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const isMobileDevice = width < 768
      const isTabletDevice = width >= 768 && width < 1024
      const isDesktopDevice = width >= 1024

      setIsMobile(isMobileDevice)
      setIsTablet(isTabletDevice)
      setIsDesktop(isDesktopDevice)
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return { isMobile, isTablet, isDesktop }
}

export const useViewportHeight = () => {
  const [viewportHeight, setViewportHeight] = useState(0)

  useEffect(() => {
    const updateHeight = () => {
      // Use visualViewport API if available (better for mobile)
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height)
      } else {
        setViewportHeight(window.innerHeight)
      }
    }

    updateHeight()

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight)
      return () => window.visualViewport?.removeEventListener('resize', updateHeight)
    } else {
      window.addEventListener('resize', updateHeight)
      return () => window.removeEventListener('resize', updateHeight)
    }
  }, [])

  return viewportHeight
}

export const useSafeAreaInsets = () => {
  const [insets, setInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })

  useEffect(() => {
    const updateInsets = () => {
      const style = getComputedStyle(document.documentElement)
      setInsets({
        top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
        bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
        right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
      })
    }

    updateInsets()
    window.addEventListener('resize', updateInsets)
    return () => window.removeEventListener('resize', updateInsets)
  }, [])

  return insets
}

export const useTouchOptimization = () => {
  const [touchSupported, setTouchSupported] = useState(false)
  const [touchPoints, setTouchPoints] = useState(0)

  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    setTouchSupported(hasTouch)
    setTouchPoints(navigator.maxTouchPoints || 0)
  }, [])

  const handleTouchFeedback = useCallback((element: HTMLElement) => {
    if (!touchSupported) return

    element.style.transition = 'transform 0.1s ease'
    element.style.transform = 'scale(0.98)'
    
    setTimeout(() => {
      element.style.transform = 'scale(1)'
    }, 100)
  }, [touchSupported])

  return {
    touchSupported,
    touchPoints,
    handleTouchFeedback,
  }
}

export const useNetworkOptimization = () => {
  const [connectionType, setConnectionType] = useState<string>('unknown')
  const [isSlowConnection, setIsSlowConnection] = useState(false)

  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      
      const updateConnection = () => {
        setConnectionType(connection.effectiveType || 'unknown')
        setIsSlowConnection(['slow-2g', '2g'].includes(connection.effectiveType))
      }

      updateConnection()
      connection.addEventListener('change', updateConnection)
      
      return () => connection.removeEventListener('change', updateConnection)
    }
  }, [])

  return {
    connectionType,
    isSlowConnection,
    shouldReduceAnimations: isSlowConnection,
    shouldLazyLoad: isSlowConnection,
  }
}

export const useResponsiveValue = <T>(values: {
  base: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
  '2xl'?: T
}) => {
  return useBreakpointValue(values)
}

export const useScrollDirection = () => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.scrollY
      const direction = scrollY > lastScrollY ? 'down' : 'up'
      
      if (direction !== scrollDirection && Math.abs(scrollY - lastScrollY) > 10) {
        setScrollDirection(direction)
      }
      
      setLastScrollY(scrollY)
    }

    window.addEventListener('scroll', updateScrollDirection, { passive: true })
    return () => window.removeEventListener('scroll', updateScrollDirection)
  }, [scrollDirection, lastScrollY])

  return scrollDirection
}

export const useKeyboardHeight = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  useEffect(() => {
    if (!window.visualViewport) return

    const handleViewportChange = () => {
      const viewport = window.visualViewport!
      const keyboardHeight = window.innerHeight - viewport.height
      
      setKeyboardHeight(keyboardHeight)
      setIsKeyboardOpen(keyboardHeight > 150) // Threshold for keyboard detection
    }

    window.visualViewport.addEventListener('resize', handleViewportChange)
    return () => window.visualViewport?.removeEventListener('resize', handleViewportChange)
  }, [])

  return { keyboardHeight, isKeyboardOpen }
}

export const usePWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setIsInstallable(false)
      return true
    }
    
    return false
  }, [deferredPrompt])

  return {
    isInstallable,
    isInstalled,
    promptInstall,
  }
}

export const useHapticFeedback = () => {
  const { touchSupported } = useTouchOptimization()

  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!touchSupported || !('vibrate' in navigator)) return

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    }

    navigator.vibrate(patterns[type])
  }, [touchSupported])

  return { triggerHaptic, isSupported: touchSupported && 'vibrate' in navigator }
}

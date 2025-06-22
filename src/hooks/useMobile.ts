import { useState, useEffect, useCallback, useRef } from 'react'
import { useBreakpointValue } from '@chakra-ui/react'

// Mobile detection hook
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const userAgent = navigator.userAgent

      // Check by screen width
      const mobileWidth = width <= 768
      const tabletWidth = width > 768 && width <= 1024

      // Check by user agent
      const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      const tabletUA = /iPad|Android(?=.*Mobile)/i.test(userAgent)

      setIsMobile(mobileWidth || (mobileUA && !tabletUA))
      setIsTablet(tabletWidth || tabletUA)
      setIsDesktop(!mobileWidth && !tabletWidth && !mobileUA)
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    window.addEventListener('orientationchange', checkDevice)

    return () => {
      window.removeEventListener('resize', checkDevice)
      window.removeEventListener('orientationchange', checkDevice)
    }
  }, [])

  return { isMobile, isTablet, isDesktop }
}

// Touch gesture hook
export const useTouchGestures = (element: React.RefObject<HTMLElement>) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  const [isSwipe, setIsSwipe] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null)

  const minSwipeDistance = 50

  const onTouchStart = useCallback((e: TouchEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    })
  }, [])

  const onTouchMove = useCallback((e: TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    })
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > minSwipeDistance
    const isRightSwipe = distanceX < -minSwipeDistance
    const isUpSwipe = distanceY > minSwipeDistance
    const isDownSwipe = distanceY < -minSwipeDistance

    if (isLeftSwipe || isRightSwipe || isUpSwipe || isDownSwipe) {
      setIsSwipe(true)
      
      if (Math.abs(distanceX) > Math.abs(distanceY)) {
        setSwipeDirection(isLeftSwipe ? 'left' : 'right')
      } else {
        setSwipeDirection(isUpSwipe ? 'up' : 'down')
      }
    } else {
      setIsSwipe(false)
      setSwipeDirection(null)
    }
  }, [touchStart, touchEnd, minSwipeDistance])

  useEffect(() => {
    const el = element.current
    if (!el) return

    el.addEventListener('touchstart', onTouchStart)
    el.addEventListener('touchmove', onTouchMove)
    el.addEventListener('touchend', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [element, onTouchStart, onTouchMove, onTouchEnd])

  return { isSwipe, swipeDirection, touchStart, touchEnd }
}

// Viewport height hook (handles mobile browser address bar)
export const useViewportHeight = () => {
  const [viewportHeight, setViewportHeight] = useState(0)

  useEffect(() => {
    const updateHeight = () => {
      // Use visualViewport if available (better for mobile)
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
      window.addEventListener('orientationchange', updateHeight)
      return () => {
        window.removeEventListener('resize', updateHeight)
        window.removeEventListener('orientationchange', updateHeight)
      }
    }
  }, [])

  return viewportHeight
}

// Safe area insets hook (for notched devices)
export const useSafeAreaInsets = () => {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  })

  useEffect(() => {
    const updateInsets = () => {
      const computedStyle = getComputedStyle(document.documentElement)
      
      setInsets({
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10),
      })
    }

    // Set CSS custom properties for safe area insets
    const style = document.createElement('style')
    style.textContent = `
      :root {
        --sat: env(safe-area-inset-top);
        --sar: env(safe-area-inset-right);
        --sab: env(safe-area-inset-bottom);
        --sal: env(safe-area-inset-left);
      }
    `
    document.head.appendChild(style)

    updateInsets()
    window.addEventListener('resize', updateInsets)
    window.addEventListener('orientationchange', updateInsets)

    return () => {
      document.head.removeChild(style)
      window.removeEventListener('resize', updateInsets)
      window.removeEventListener('orientationchange', updateInsets)
    }
  }, [])

  return insets
}

// Network status hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<string>('unknown')
  const [effectiveType, setEffectiveType] = useState<string>('4g')

  useEffect(() => {
    const updateNetworkStatus = () => {
      setIsOnline(navigator.onLine)
      
      // @ts-ignore - NetworkInformation API
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      
      if (connection) {
        setConnectionType(connection.type || 'unknown')
        setEffectiveType(connection.effectiveType || '4g')
      }
    }

    updateNetworkStatus()

    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)

    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus)
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus)
      }
    }
  }, [])

  return { isOnline, connectionType, effectiveType }
}

// PWA install prompt hook
export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isInWebAppiOS = (window.navigator as any).standalone === true
      setIsInstalled(isStandalone || isInWebAppiOS)
    }

    checkInstalled()

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

  return { isInstallable, isInstalled, promptInstall }
}

// Haptic feedback hook
export const useHapticFeedback = () => {
  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }, [])

  const lightImpact = useCallback(() => {
    vibrate(10)
  }, [vibrate])

  const mediumImpact = useCallback(() => {
    vibrate(20)
  }, [vibrate])

  const heavyImpact = useCallback(() => {
    vibrate(30)
  }, [vibrate])

  const selectionChanged = useCallback(() => {
    vibrate([10, 10, 10])
  }, [vibrate])

  const notificationSuccess = useCallback(() => {
    vibrate([10, 50, 10])
  }, [vibrate])

  const notificationWarning = useCallback(() => {
    vibrate([20, 50, 20])
  }, [vibrate])

  const notificationError = useCallback(() => {
    vibrate([50, 50, 50])
  }, [vibrate])

  return {
    vibrate,
    lightImpact,
    mediumImpact,
    heavyImpact,
    selectionChanged,
    notificationSuccess,
    notificationWarning,
    notificationError,
  }
}

// Responsive breakpoint hook
export const useResponsiveValue = <T>(values: T[] | Record<string, T>): T => {
  return useBreakpointValue(values) as T
}

// Screen orientation hook
export const useScreenOrientation = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

  useEffect(() => {
    const updateOrientation = () => {
      if (screen.orientation) {
        setOrientation(screen.orientation.angle === 0 || screen.orientation.angle === 180 ? 'portrait' : 'landscape')
      } else {
        setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
      }
    }

    updateOrientation()

    if (screen.orientation) {
      screen.orientation.addEventListener('change', updateOrientation)
      return () => screen.orientation.removeEventListener('change', updateOrientation)
    } else {
      window.addEventListener('orientationchange', updateOrientation)
      window.addEventListener('resize', updateOrientation)
      return () => {
        window.removeEventListener('orientationchange', updateOrientation)
        window.removeEventListener('resize', updateOrientation)
      }
    }
  }, [])

  return orientation
}

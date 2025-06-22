'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// Performance optimization hook
export const usePerformanceOptimization = () => {
  const router = useRouter()
  const [isOptimized, setIsOptimized] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const prefetchedRoutes = useRef<Set<string>>(new Set())

  // Intelligent prefetching based on user behavior
  const prefetchRoute = useCallback((route: string) => {
    if (prefetchedRoutes.current.has(route)) return
    
    try {
      router.prefetch(route)
      prefetchedRoutes.current.add(route)
    } catch (error) {
      console.warn('Failed to prefetch route:', route, error)
    }
  }, [router])

  // Preload critical resources
  const preloadResource = useCallback((href: string, as: string = 'script') => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = href
    link.as = as
    document.head.appendChild(link)
  }, [])

  // Optimize images with lazy loading
  const optimizeImages = useCallback(() => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement
              if (img.dataset.src) {
                img.src = img.dataset.src
                img.removeAttribute('data-src')
                observerRef.current?.unobserve(img)
              }
            }
          })
        },
        { threshold: 0.1, rootMargin: '50px' }
      )
    }

    // Observe all images with data-src
    const lazyImages = document.querySelectorAll('img[data-src]')
    lazyImages.forEach((img) => observerRef.current?.observe(img))
  }, [])

  // Memory cleanup
  const cleanupMemory = useCallback(() => {
    // Clear unused caches
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          if (name.includes('old') || name.includes('temp')) {
            caches.delete(name)
          }
        })
      })
    }

    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc()
    }
  }, [])

  // Bundle size optimization
  const optimizeBundles = useCallback(() => {
    // Dynamic imports for heavy libraries
    const loadHeavyLibraries = async () => {
      // Only load when needed
      if (window.location.pathname.includes('/charts')) {
        await import('recharts')
      }
      if (window.location.pathname.includes('/trading')) {
        await import('lightweight-charts')
      }
    }

    loadHeavyLibraries()
  }, [])

  // Performance monitoring
  const monitorPerformance = useCallback(() => {
    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          // Log performance issues
          if (entry.entryType === 'largest-contentful-paint' && entry.startTime > 2500) {
            console.warn('LCP is slow:', entry.startTime)
          }
          if (entry.entryType === 'first-input' && (entry as any).processingStart - entry.startTime > 100) {
            console.warn('FID is slow:', (entry as any).processingStart - entry.startTime)
          }
        })
      })

      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] })
      return () => observer.disconnect()
    }
  }, [])

  // Initialize optimizations
  useEffect(() => {
    if (isOptimized) return

    const initOptimizations = async () => {
      // Preload critical resources
      preloadResource('/fonts/inter.woff2', 'font')
      preloadResource('/api/tokens', 'fetch')

      // Optimize images
      optimizeImages()

      // Monitor performance
      const cleanup = monitorPerformance()

      // Optimize bundles
      optimizeBundles()

      // Prefetch likely routes
      const currentPath = window.location.pathname
      if (currentPath === '/') {
        prefetchRoute('/swap')
        prefetchRoute('/pools')
      } else if (currentPath === '/swap') {
        prefetchRoute('/pools')
        prefetchRoute('/portfolio')
      }

      setIsOptimized(true)

      return cleanup
    }

    const cleanup = initOptimizations()

    // Cleanup on unmount
    return () => {
      if (cleanup instanceof Function) cleanup()
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [isOptimized, optimizeImages, monitorPerformance, optimizeBundles, prefetchRoute, preloadResource])

  // Periodic cleanup
  useEffect(() => {
    const interval = setInterval(cleanupMemory, 5 * 60 * 1000) // Every 5 minutes
    return () => clearInterval(interval)
  }, [cleanupMemory])

  return {
    prefetchRoute,
    preloadResource,
    optimizeImages,
    cleanupMemory,
    isOptimized,
  }
}

// Hook for intelligent component loading
export const useIntelligentLoading = () => {
  const [loadedComponents, setLoadedComponents] = useState<Set<string>>(new Set())
  const loadingRef = useRef<Map<string, Promise<any>>>(new Map())

  const loadComponent = useCallback(async (componentName: string, importFn: () => Promise<any>) => {
    if (loadedComponents.has(componentName)) {
      return
    }

    // Prevent duplicate loading
    if (loadingRef.current.has(componentName)) {
      return loadingRef.current.get(componentName)
    }

    const loadPromise = importFn().then((module) => {
      setLoadedComponents(prev => new Set(prev).add(componentName))
      loadingRef.current.delete(componentName)
      return module
    }).catch((error) => {
      console.error(`Failed to load component ${componentName}:`, error)
      loadingRef.current.delete(componentName)
      throw error
    })

    loadingRef.current.set(componentName, loadPromise)
    return loadPromise
  }, [loadedComponents])

  const preloadComponent = useCallback((componentName: string, importFn: () => Promise<any>) => {
    // Use requestIdleCallback for non-critical preloading
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        loadComponent(componentName, importFn)
      })
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        loadComponent(componentName, importFn)
      }, 100)
    }
  }, [loadComponent])

  return {
    loadComponent,
    preloadComponent,
    loadedComponents: Array.from(loadedComponents),
  }
}

// Hook for performance budgets
export const usePerformanceBudget = () => {
  const [violations, setViolations] = useState<string[]>([])

  useEffect(() => {
    const checkBudgets = () => {
      const newViolations: string[] = []

      // Check bundle size
      if ('performance' in window) {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        const totalSize = resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0)
        
        if (totalSize > 1024 * 1024) { // 1MB
          newViolations.push(`Bundle size exceeded: ${(totalSize / 1024 / 1024).toFixed(2)}MB`)
        }
      }

      // Check memory usage
      if ('memory' in performance) {
        const memory = (performance as any).memory
        if (memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB
          newViolations.push(`Memory usage high: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`)
        }
      }

      setViolations(newViolations)
    }

    // Check budgets periodically
    const interval = setInterval(checkBudgets, 30000) // Every 30 seconds
    checkBudgets() // Initial check

    return () => clearInterval(interval)
  }, [])

  return violations
}

// Hook for adaptive loading based on network conditions
export const useAdaptiveLoading = () => {
  const [networkInfo, setNetworkInfo] = useState({
    effectiveType: '4g',
    downlink: 10,
    saveData: false,
  })

  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      
      const updateNetworkInfo = () => {
        setNetworkInfo({
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          saveData: connection.saveData || false,
        })
      }

      updateNetworkInfo()
      connection.addEventListener('change', updateNetworkInfo)

      return () => {
        connection.removeEventListener('change', updateNetworkInfo)
      }
    }
  }, [])

  const shouldLoadHeavyContent = useCallback(() => {
    // Don't load heavy content on slow networks or when data saver is on
    if (networkInfo.saveData) return false
    if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') return false
    if (networkInfo.downlink < 1) return false
    
    return true
  }, [networkInfo])

  const getImageQuality = useCallback(() => {
    if (networkInfo.saveData || networkInfo.effectiveType === 'slow-2g') return 'low'
    if (networkInfo.effectiveType === '2g' || networkInfo.downlink < 2) return 'medium'
    return 'high'
  }, [networkInfo])

  return {
    networkInfo,
    shouldLoadHeavyContent,
    getImageQuality,
  }
}

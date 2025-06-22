import { useCallback, useEffect, useRef, useState } from 'react'

// Core Web Vitals monitoring
export interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
}

// Performance observer hook
export const usePerformanceObserver = () => {
  const [metrics, setMetrics] = useState<WebVitalsMetric[]>([])
  const observerRef = useRef<PerformanceObserver | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()

      entries.forEach((entry) => {
        // Log performance entries for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('Performance entry:', entry)
        }
      })
    })

    // Observe various performance metrics
    try {
      observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'layout-shift'] })
      observerRef.current = observer
    } catch (error) {
      console.warn('Performance observer not supported:', error)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  const reportMetric = useCallback((metric: WebVitalsMetric) => {
    setMetrics(prev => [...prev, metric])

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      // Example: send to Google Analytics, Vercel Analytics, etc.
      if (typeof gtag !== 'undefined') {
        gtag('event', metric.name, {
          event_category: 'Web Vitals',
          value: Math.round(metric.value),
          event_label: metric.id,
          non_interaction: true,
        })
      }
    }
  }, [])

  return { metrics, reportMetric }
}

// Image loading optimization hook
export const useImageOptimization = () => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map())

  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (loadedImages.has(src)) {
        resolve()
        return
      }

      if (imageCache.current.has(src)) {
        const img = imageCache.current.get(src)!
        if (img.complete) {
          setLoadedImages(prev => new Set(prev).add(src))
          resolve()
        }
        return
      }

      const img = new Image()
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(src))
        imageCache.current.set(src, img)
        resolve()
      }
      img.onerror = reject
      img.src = src
    })
  }, [loadedImages])

  const preloadImages = useCallback((sources: string[]) => {
    return Promise.allSettled(sources.map(preloadImage))
  }, [preloadImage])

  return { preloadImage, preloadImages, loadedImages }
}

// Resource hints hook
export const useResourceHints = () => {
  const addedHints = useRef<Set<string>>(new Set())

  const addPreconnect = useCallback((href: string) => {
    if (typeof document === 'undefined' || addedHints.current.has(`preconnect-${href}`)) {
      return
    }

    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = href
    document.head.appendChild(link)
    addedHints.current.add(`preconnect-${href}`)
  }, [])

  const addPrefetch = useCallback((href: string) => {
    if (typeof document === 'undefined' || addedHints.current.has(`prefetch-${href}`)) {
      return
    }

    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = href
    document.head.appendChild(link)
    addedHints.current.add(`prefetch-${href}`)
  }, [])

  const addPreload = useCallback((href: string, as: string) => {
    if (typeof document === 'undefined' || addedHints.current.has(`preload-${href}`)) {
      return
    }

    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = href
    link.as = as
    document.head.appendChild(link)
    addedHints.current.add(`preload-${href}`)
  }, [])

  return { addPreconnect, addPrefetch, addPreload }
}

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [entries, setEntries] = useState<IntersectionObserverEntry[]>([])
  const observer = useRef<IntersectionObserver | null>(null)
  const elements = useRef<Set<Element>>(new Set())

  const observe = useCallback((element: Element) => {
    if (!observer.current) {
      observer.current = new IntersectionObserver((observedEntries) => {
        setEntries(observedEntries)
      }, {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      })
    }

    observer.current.observe(element)
    elements.current.add(element)
  }, [options])

  const unobserve = useCallback((element: Element) => {
    if (observer.current) {
      observer.current.unobserve(element)
      elements.current.delete(element)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [])

  return { entries, observe, unobserve }
}

// Memory usage monitoring
export const useMemoryMonitor = () => {
  const [memoryInfo, setMemoryInfo] = useState<any>(null)

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        setMemoryInfo((performance as any).memory)
      }
    }

    updateMemoryInfo()
    const interval = setInterval(updateMemoryInfo, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return memoryInfo
}

// Bundle size analyzer
export const useBundleAnalyzer = () => {
  const [bundleInfo, setBundleInfo] = useState<{
    totalSize: number
    chunks: Array<{ name: string; size: number }>
  } | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // In development, we can analyze the bundle
      const analyzeBundle = async () => {
        try {
          // This would integrate with webpack-bundle-analyzer or similar
          const response = await fetch('/_next/static/chunks/webpack.js')
          const text = await response.text()

          setBundleInfo({
            totalSize: text.length,
            chunks: [
              { name: 'webpack', size: text.length }
            ]
          })
        } catch (error) {
          console.warn('Bundle analysis failed:', error)
        }
      }

      analyzeBundle()
    }
  }, [])

  return bundleInfo
}

// Performance budget monitoring
export const usePerformanceBudget = (budgets: {
  [key: string]: number
}) => {
  const [violations, setViolations] = useState<string[]>([])

  useEffect(() => {
    const checkBudgets = () => {
      const newViolations: string[] = []

      // Check bundle size budget
      if (budgets.bundleSize && typeof window !== 'undefined') {
        const scripts = Array.from(document.querySelectorAll('script[src]'))
        const totalSize = scripts.reduce((acc, script) => {
          // Estimate script size (this is approximate)
          return acc + (script.getAttribute('src')?.length || 0) * 100
        }, 0)

        if (totalSize > budgets.bundleSize) {
          newViolations.push(`Bundle size exceeded: ${totalSize} > ${budgets.bundleSize}`)
        }
      }

      // Check memory budget
      if (budgets.memory && 'memory' in performance) {
        const memory = (performance as any).memory
        if (memory.usedJSHeapSize > budgets.memory) {
          newViolations.push(`Memory usage exceeded: ${memory.usedJSHeapSize} > ${budgets.memory}`)
        }
      }

      setViolations(newViolations)
    }

    checkBudgets()
    const interval = setInterval(checkBudgets, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [budgets])

  return violations
}

// Critical resource loading
export const useCriticalResources = () => {
  const [criticalLoaded, setCriticalLoaded] = useState(false)
  const [nonCriticalLoaded, setNonCriticalLoaded] = useState(false)

  const loadCriticalResources = useCallback(async () => {
    // Load critical CSS, fonts, etc.
    const criticalPromises = [
      // Load critical fonts
      new Promise(resolve => {
        const font = new FontFace('Inter', 'url(/fonts/inter-var.woff2)', {
          display: 'swap',
          weight: '100 900',
        })
        font.load().then(() => {
          document.fonts.add(font)
          resolve(font)
        })
      }),
    ]

    try {
      await Promise.all(criticalPromises)
      setCriticalLoaded(true)
    } catch (error) {
      console.error('Failed to load critical resources:', error)
    }
  }, [])

  const loadNonCriticalResources = useCallback(async () => {
    // Load non-critical resources after critical ones
    if (!criticalLoaded) return

    const nonCriticalPromises = [
      // Load analytics scripts
      import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
        onCLS(console.log)
        onINP(console.log)
        onFCP(console.log)
        onLCP(console.log)
        onTTFB(console.log)
      }),
    ]

    try {
      await Promise.all(nonCriticalPromises)
      setNonCriticalLoaded(true)
    } catch (error) {
      console.error('Failed to load non-critical resources:', error)
    }
  }, [criticalLoaded])

  useEffect(() => {
    loadCriticalResources()
  }, [loadCriticalResources])

  useEffect(() => {
    if (criticalLoaded) {
      // Load non-critical resources after a delay
      const timer = setTimeout(loadNonCriticalResources, 1000)
      return () => clearTimeout(timer)
    }
  }, [criticalLoaded, loadNonCriticalResources])

  return { criticalLoaded, nonCriticalLoaded }
}

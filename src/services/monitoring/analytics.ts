'use client'

// Analytics and monitoring service
export interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  userId?: string
  timestamp?: number
}

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: number
  tags?: Record<string, string>
}

export interface ErrorReport {
  message: string
  stack?: string
  url: string
  userAgent: string
  userId?: string
  timestamp: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  context?: Record<string, any>
}

class AnalyticsService {
  private isInitialized = false
  private userId: string | null = null
  private sessionId: string
  private queue: AnalyticsEvent[] = []

  constructor() {
    this.sessionId = this.generateSessionId()
    this.init()
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private async init() {
    if (typeof window === 'undefined') return

    try {
      // Initialize Google Analytics 4
      if (process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) {
        await this.initGoogleAnalytics()
      }

      // Initialize custom analytics
      await this.initCustomAnalytics()

      this.isInitialized = true
      this.flushQueue()
    } catch (error) {
      console.error('Failed to initialize analytics:', error)
    }
  }

  private async initGoogleAnalytics() {
    const GA_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
    if (!GA_ID) return

    // Load Google Analytics script
    const script = document.createElement('script')
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
    script.async = true
    document.head.appendChild(script)

    // Initialize gtag
    window.dataLayer = window.dataLayer || []
    function gtag(...args: any[]) {
      window.dataLayer.push(args)
    }

    gtag('js', new Date())
    gtag('config', GA_ID, {
      page_title: document.title,
      page_location: window.location.href,
    })

    // Make gtag available globally
    ;(window as any).gtag = gtag
  }

  private async initCustomAnalytics() {
    // Initialize custom analytics endpoint
    this.track('session_start', {
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    })
  }

  setUserId(userId: string) {
    this.userId = userId

    // Update Google Analytics user ID
    if ((window as any).gtag) {
      (window as any).gtag('config', process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID, {
        user_id: userId,
      })
    }
  }

  track(eventName: string, properties?: Record<string, any>) {
    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        url: window.location.href,
        referrer: document.referrer,
        timestamp: Date.now(),
      },
      userId: this.userId || undefined,
      timestamp: Date.now(),
    }

    if (!this.isInitialized) {
      this.queue.push(event)
      return
    }

    this.sendEvent(event)
  }

  private async sendEvent(event: AnalyticsEvent) {
    try {
      // Send to Google Analytics
      if ((window as any).gtag) {
        (window as any).gtag('event', event.name, {
          event_category: event.properties?.category || 'general',
          event_label: event.properties?.label,
          value: event.properties?.value,
          user_id: this.userId,
          ...event.properties,
        })
      }

      // Send to custom analytics endpoint
      if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        })
      }
    } catch (error) {
      console.error('Failed to send analytics event:', error)
    }
  }

  private flushQueue() {
    while (this.queue.length > 0) {
      const event = this.queue.shift()
      if (event) {
        this.sendEvent(event)
      }
    }
  }

  // DeFi-specific tracking methods
  trackSwap(data: {
    fromToken: string
    toToken: string
    fromAmount: string
    toAmount: string
    slippage: number
    gasPrice: string
    protocol: string
  }) {
    this.track('swap_executed', {
      category: 'defi',
      ...data,
    })
  }

  trackWalletConnection(data: {
    walletType: string
    chainId: number
    address: string
  }) {
    this.track('wallet_connected', {
      category: 'wallet',
      wallet_type: data.walletType,
      chain_id: data.chainId,
      // Don't log full address for privacy
      address_prefix: data.address.substring(0, 6),
    })
  }

  trackPoolInteraction(data: {
    action: 'add_liquidity' | 'remove_liquidity' | 'stake' | 'unstake'
    poolId: string
    tokens: string[]
    amounts: string[]
  }) {
    this.track('pool_interaction', {
      category: 'defi',
      action: data.action,
      pool_id: data.poolId,
      token_count: data.tokens.length,
    })
  }

  trackPageView(path: string) {
    this.track('page_view', {
      category: 'navigation',
      page: path,
    })
  }

  trackError(error: Error, context?: Record<string, any>) {
    this.track('error_occurred', {
      category: 'error',
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    })
  }
}

// Performance monitoring service
class PerformanceService {
  private metrics: PerformanceMetric[] = []
  private observer: PerformanceObserver | null = null

  constructor() {
    this.init()
  }

  private init() {
    if (typeof window === 'undefined') return

    // Monitor Core Web Vitals
    this.initWebVitalsMonitoring()

    // Monitor custom metrics
    this.initCustomMetrics()

    // Send metrics periodically
    setInterval(() => {
      this.sendMetrics()
    }, 30000) // Every 30 seconds
  }

  private initWebVitalsMonitoring() {
    if (!('PerformanceObserver' in window)) return

    // LCP (Largest Contentful Paint)
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.entryType === 'largest-contentful-paint') {
          this.recordMetric('lcp', entry.startTime, 'ms')
        }
      })
    })

    try {
      this.observer.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch (error) {
      console.warn('LCP observer not supported')
    }

    // FID (First Input Delay)
    const fidObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const fid = entry.processingStart - entry.startTime
        this.recordMetric('fid', fid, 'ms')
      })
    })

    try {
      fidObserver.observe({ entryTypes: ['first-input'] })
    } catch (error) {
      console.warn('FID observer not supported')
    }

    // CLS (Cumulative Layout Shift)
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value
          this.recordMetric('cls', clsValue, 'score')
        }
      })
    })

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    } catch (error) {
      console.warn('CLS observer not supported')
    }
  }

  private initCustomMetrics() {
    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        this.recordMetric('memory_used', memory.usedJSHeapSize / 1024 / 1024, 'MB')
        this.recordMetric('memory_total', memory.totalJSHeapSize / 1024 / 1024, 'MB')
      }, 10000) // Every 10 seconds
    }

    // Monitor network requests
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming
          this.recordMetric('resource_load_time', resource.duration, 'ms', {
            resource_type: resource.initiatorType,
            resource_name: resource.name.split('/').pop() || 'unknown',
          })
        }
      })
    })

    try {
      resourceObserver.observe({ entryTypes: ['resource'] })
    } catch (error) {
      console.warn('Resource observer not supported')
    }
  }

  recordMetric(name: string, value: number, unit: string, tags?: Record<string, string>) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    }

    this.metrics.push(metric)

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }
  }

  private async sendMetrics() {
    if (this.metrics.length === 0) return

    try {
      if (process.env.NEXT_PUBLIC_METRICS_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_METRICS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            metrics: this.metrics,
            sessionId: analytics.sessionId,
            timestamp: Date.now(),
          }),
        })

        // Clear sent metrics
        this.metrics = []
      }
    } catch (error) {
      console.error('Failed to send performance metrics:', error)
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }
}

// Error tracking service
class ErrorTrackingService {
  private errors: ErrorReport[] = []

  constructor() {
    this.init()
  }

  private init() {
    if (typeof window === 'undefined') return

    // Global error handler
    window.addEventListener('error', (event) => {
      this.reportError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        severity: 'high',
        context: {
          lineno: event.lineno,
          colno: event.colno,
          type: 'javascript_error',
        },
      })
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        severity: 'medium',
        context: {
          type: 'unhandled_promise_rejection',
          reason: event.reason,
        },
      })
    })
  }

  reportError(error: ErrorReport) {
    this.errors.push(error)

    // Send to error tracking service
    this.sendError(error)

    // Keep only last 50 errors
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50)
    }
  }

  private async sendError(error: ErrorReport) {
    try {
      // Send to Sentry or similar service
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        // Sentry integration would go here
      }

      // Send to custom error endpoint
      if (process.env.NEXT_PUBLIC_ERROR_ENDPOINT) {
        try {
          await fetch(process.env.NEXT_PUBLIC_ERROR_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...error,
              timestamp: Date.now(),
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            }),
          })
        } catch (fetchError) {
          console.warn('Failed to send error to custom endpoint:', fetchError)
        }
      }

      // Also track in analytics
      analytics.trackError(new Error(error.message), error.context)
    } catch (err) {
      console.error('Failed to send error report:', err)
    }
  }

  getErrors(): ErrorReport[] {
    return [...this.errors]
  }
}

// Create singleton instances
export const analytics = new AnalyticsService()
export const performance = new PerformanceService()
export const errorTracking = new ErrorTrackingService()

// Convenience functions
export const trackEvent = (name: string, properties?: Record<string, any>) => {
  analytics.track(name, properties)
}

export const trackPageView = (path: string) => {
  analytics.trackPageView(path)
}

export const trackSwap = (data: Parameters<typeof analytics.trackSwap>[0]) => {
  analytics.trackSwap(data)
}

export const trackWalletConnection = (data: Parameters<typeof analytics.trackWalletConnection>[0]) => {
  analytics.trackWalletConnection(data)
}

export const recordMetric = (name: string, value: number, unit: string, tags?: Record<string, string>) => {
  performance.recordMetric(name, value, unit, tags)
}

export const reportError = (error: ErrorReport) => {
  errorTracking.reportError(error)
}

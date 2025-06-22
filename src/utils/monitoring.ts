// Production Monitoring and Analytics Utilities

interface PerformanceMetrics {
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  fcp?: number // First Contentful Paint
  ttfb?: number // Time to First Byte
  tti?: number // Time to Interactive
}

interface UserMetrics {
  userId?: string
  sessionId: string
  timestamp: number
  userAgent: string
  viewport: {
    width: number
    height: number
  }
  connection?: {
    effectiveType: string
    downlink: number
    rtt: number
  }
}

interface ErrorMetrics {
  message: string
  stack?: string
  componentStack?: string
  errorBoundary?: string
  userId?: string
  sessionId: string
  timestamp: number
  url: string
  userAgent: string
}

interface BusinessMetrics {
  event: string
  properties: Record<string, any>
  userId?: string
  sessionId: string
  timestamp: number
}

class MonitoringService {
  private sessionId: string
  private userId?: string
  private isProduction: boolean

  constructor() {
    this.sessionId = this.generateSessionId()
    this.isProduction = process.env.NODE_ENV === 'production'
    this.initializeWebVitals()
    this.initializeErrorTracking()
    this.initializeUserTracking()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeWebVitals() {
    if (typeof window === 'undefined') return

    // Web Vitals monitoring
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(this.sendPerformanceMetric.bind(this))
      onINP(this.sendPerformanceMetric.bind(this))
      onFCP(this.sendPerformanceMetric.bind(this))
      onLCP(this.sendPerformanceMetric.bind(this))
      onTTFB(this.sendPerformanceMetric.bind(this))
    }).catch(() => {
      // Silently fail if web-vitals is not available
    })

    // Custom performance metrics
    if ('PerformanceObserver' in window) {
      // Navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            this.sendCustomMetric('navigation', {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              firstByte: navEntry.responseStart - navEntry.requestStart,
            })
          }
        }
      })
      navObserver.observe({ entryTypes: ['navigation'] })

      // Resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming
            if (resourceEntry.duration > 1000) { // Only track slow resources
              this.sendCustomMetric('slow_resource', {
                name: resourceEntry.name,
                duration: resourceEntry.duration,
                size: resourceEntry.transferSize,
              })
            }
          }
        }
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
    }
  }

  private initializeErrorTracking() {
    if (typeof window === 'undefined') return

    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno,
      })
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
      })
    })
  }

  private initializeUserTracking() {
    if (typeof window === 'undefined') return

    // Track page views
    this.trackPageView()

    // Track user interactions
    document.addEventListener('click', this.trackUserInteraction.bind(this), { passive: true })
    document.addEventListener('scroll', this.throttle(this.trackScroll.bind(this), 1000), { passive: true })

    // Track session duration
    this.trackSessionStart()
    window.addEventListener('beforeunload', this.trackSessionEnd.bind(this))
  }

  private sendPerformanceMetric(metric: any) {
    const performanceData: PerformanceMetrics & UserMetrics = {
      [metric.name.toLowerCase()]: metric.value,
      ...this.getUserMetrics(),
    }

    this.sendToEndpoint('/api/analytics/performance', performanceData)
  }

  private sendCustomMetric(name: string, data: any) {
    const customData = {
      metric: name,
      data,
      ...this.getUserMetrics(),
    }

    this.sendToEndpoint('/api/analytics/custom', customData)
  }

  private getUserMetrics(): UserMetrics {
    return {
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt,
      } : undefined,
    }
  }

  public setUserId(userId: string) {
    this.userId = userId
  }

  public trackError(error: Partial<ErrorMetrics>) {
    const errorData: ErrorMetrics = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      componentStack: error.componentStack,
      errorBoundary: error.errorBoundary,
      ...this.getUserMetrics(),
      url: window.location.href,
    }

    this.sendToEndpoint('/api/analytics/errors', errorData)
  }

  public trackEvent(event: string, properties: Record<string, any> = {}) {
    const eventData: BusinessMetrics = {
      event,
      properties,
      ...this.getUserMetrics(),
    }

    this.sendToEndpoint('/api/analytics/events', eventData)
  }

  public trackPageView(page?: string) {
    this.trackEvent('page_view', {
      page: page || window.location.pathname,
      referrer: document.referrer,
      title: document.title,
    })
  }

  private trackUserInteraction(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      this.trackEvent('button_click', {
        element: target.tagName,
        text: target.textContent?.slice(0, 50),
        className: target.className,
      })
    }
  }

  private trackScroll() {
    const scrollPercent = Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    )

    if (scrollPercent > 0 && scrollPercent % 25 === 0) {
      this.trackEvent('scroll_depth', { percent: scrollPercent })
    }
  }

  private trackSessionStart() {
    this.trackEvent('session_start', {
      timestamp: Date.now(),
    })
  }

  private trackSessionEnd() {
    this.trackEvent('session_end', {
      duration: Date.now() - parseInt(this.sessionId.split('_')[1]),
    })
  }

  private throttle(func: Function, limit: number) {
    let inThrottle: boolean
    return function(this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  private async sendToEndpoint(endpoint: string, data: any) {
    if (!this.isProduction) {
      console.log(`[Monitoring] ${endpoint}:`, data)
      return
    }

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        keepalive: true,
      })
    } catch (error) {
      // Silently fail to avoid affecting user experience
      console.warn('Failed to send analytics data:', error)
    }
  }
}

// Singleton instance
export const monitoring = new MonitoringService()

// React hook for component-level tracking
export const useMonitoring = () => {
  const trackComponentMount = (componentName: string) => {
    monitoring.trackEvent('component_mount', { component: componentName })
  }

  const trackComponentError = (componentName: string, error: Error) => {
    monitoring.trackError({
      message: error.message,
      stack: error.stack,
      componentStack: componentName,
    })
  }

  const trackUserAction = (action: string, properties?: Record<string, any>) => {
    monitoring.trackEvent(`user_${action}`, properties)
  }

  return {
    trackComponentMount,
    trackComponentError,
    trackUserAction,
    trackEvent: monitoring.trackEvent.bind(monitoring),
    setUserId: monitoring.setUserId.bind(monitoring),
  }
}

// Performance monitoring utilities
export const performanceUtils = {
  measureFunction: <T extends (...args: any[]) => any>(
    fn: T,
    name: string
  ): T => {
    return ((...args: any[]) => {
      const start = performance.now()
      const result = fn(...args)
      const end = performance.now()

      monitoring.trackEvent('function_performance', {
        function: name,
        duration: end - start,
      })

      return result
    }) as T
  },

  measureAsyncFunction: <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    name: string
  ): T => {
    return (async (...args: any[]) => {
      const start = performance.now()
      const result = await fn(...args)
      const end = performance.now()

      monitoring.trackEvent('async_function_performance', {
        function: name,
        duration: end - start,
      })

      return result
    }) as T
  },
}

export default monitoring

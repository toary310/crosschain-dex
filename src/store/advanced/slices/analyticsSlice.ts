import { StateCreator } from 'zustand'
import { AnalyticsState, Store } from '../types'

// Global gtag function declaration
declare global {
  function gtag(...args: any[]): void
}

const defaultAnalyticsState: AnalyticsState = {
  pageViews: {},
  events: [],
  performance: {
    loadTime: 0,
    renderTime: 0,
    interactionTime: 0,
    errors: [],
  },
  userJourney: [],
}

export const createAnalyticsSlice: StateCreator<
  Store,
  [['zustand/immer', never], ['zustand/persist', unknown], ['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  Pick<Store,
    'analytics' |
    'trackPageView' |
    'trackEvent' |
    'trackError' |
    'updatePerformance' |
    'getPageViews' |
    'getRecentEvents' |
    'getPerformanceMetrics'
  >
> = (set, get) => ({
  analytics: defaultAnalyticsState,

  trackPageView: (page: string) =>
    set((state: Store) => {
      state.analytics.pageViews[page] = (state.analytics.pageViews[page] || 0) + 1

      // Add to user journey
      const lastJourney = state.analytics.userJourney[state.analytics.userJourney.length - 1]
      const now = Date.now()

      if (lastJourney) {
        lastJourney.duration = now - lastJourney.timestamp
      }

      state.analytics.userJourney.push({
        page,
        timestamp: now,
        duration: 0,
        actions: [],
      })

      // Limit journey to 50 entries
      if (state.analytics.userJourney.length > 50) {
        state.analytics.userJourney = state.analytics.userJourney.slice(-50)
      }

      // Send to external analytics if enabled
      if (state.user.privacy.analytics && typeof window !== 'undefined') {
        // Google Analytics, Mixpanel, etc.
        if (typeof gtag !== 'undefined') {
          gtag('config', 'GA_MEASUREMENT_ID', {
            page_title: page,
            page_location: window.location.href,
          })
        }
      }
    }),

  trackEvent: (name: string, properties: Record<string, any> = {}) =>
    set((state: Store) => {
      const event = {
        name,
        properties,
        timestamp: Date.now(),
      }

      state.analytics.events.unshift(event)

      // Limit events to 1000
      if (state.analytics.events.length > 1000) {
        state.analytics.events = state.analytics.events.slice(0, 1000)
      }

      // Add to current journey
      const currentJourney = state.analytics.userJourney[state.analytics.userJourney.length - 1]
      if (currentJourney) {
        currentJourney.actions.push({
          type: name,
          target: (properties as any).target || 'unknown',
          timestamp: Date.now(),
        })
      }

      // Send to external analytics if enabled
      if (state.user.privacy.analytics && typeof window !== 'undefined') {
        if (typeof gtag !== 'undefined') {
          gtag('event', name, properties)
        }

        // Custom analytics endpoint
        if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
          fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event: name,
              properties,
              timestamp: event.timestamp,
              userId: state.connection.address,
              sessionId: sessionStorage.getItem('sessionId'),
            }),
          }).catch(() => {
            // Ignore analytics errors
          })
        }
      }
    }),

  trackError: (error: Error) =>
    set((state: Store) => {
      const errorInfo = {
        message: error.message,
        stack: error.stack || '',
        timestamp: Date.now(),
      }

      state.analytics.performance.errors.unshift(errorInfo)

      // Limit errors to 100
      if (state.analytics.performance.errors.length > 100) {
        state.analytics.performance.errors = state.analytics.performance.errors.slice(0, 100)
      }

      // Send to error tracking if enabled
      if (state.user.privacy.crashReports && typeof window !== 'undefined') {
        try {
          // Sentry, Bugsnag, etc.
          if (typeof window !== 'undefined' && (window as any).Sentry) {
            (window as any).Sentry.captureException(error)
          }

          // Custom error endpoint
          if (process.env.NEXT_PUBLIC_ERROR_ENDPOINT) {
            fetch(process.env.NEXT_PUBLIC_ERROR_ENDPOINT, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                error: errorInfo,
                userId: state.connection.address,
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: Date.now(),
              }),
            }).catch((fetchError) => {
              console.warn('Failed to send error report:', fetchError)
            })
          }
        } catch (reportingError) {
          console.warn('Error in error reporting:', reportingError)
        }
      }
    }),

  updatePerformance: (metrics: Partial<AnalyticsState['performance']>) =>
    set((state: Store) => {
      Object.assign(state.analytics.performance, metrics)

      // Send performance data if enabled
      if (state.user.privacy.performanceData && typeof window !== 'undefined') {
        // Web Vitals, custom metrics, etc.
        if (process.env.NEXT_PUBLIC_PERFORMANCE_ENDPOINT) {
          fetch(process.env.NEXT_PUBLIC_PERFORMANCE_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              metrics,
              timestamp: Date.now(),
              userId: state.connection.address,
              url: window.location.href,
            }),
          }).catch(() => {
            // Ignore performance reporting errors
          })
        }
      }
    }),

  getPageViews: () => get().analytics.pageViews,
  getRecentEvents: () => get().analytics.events.slice(0, 50),
  getPerformanceMetrics: () => get().analytics.performance,
})

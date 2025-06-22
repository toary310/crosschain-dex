// Global type definitions for ChainBridge DEX

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean
      request?: (args: { method: string; params?: any[] }) => Promise<any>
      on?: (event: string, handler: (...args: any[]) => void) => void
      removeListener?: (event: string, handler: (...args: any[]) => void) => void
    }
    
    // Analytics
    gtag?: (...args: any[]) => void
    dataLayer?: any[]
    
    // Error tracking
    Sentry?: {
      captureException: (error: Error) => void
      captureMessage: (message: string) => void
    }
    
    // Performance monitoring
    webVitals?: any
    
    // Development tools
    __NEXT_REDUX_STORE__?: any
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: any
  }

  // Environment variables
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      NEXT_PUBLIC_ENVIRONMENT: 'development' | 'staging' | 'production'
      NEXT_PUBLIC_APP_NAME: string
      NEXT_PUBLIC_APP_URL: string
      NEXT_PUBLIC_APP_DESCRIPTION: string
      NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: string
      
      // RPC URLs
      NEXT_PUBLIC_ETHEREUM_RPC_URL?: string
      NEXT_PUBLIC_POLYGON_RPC_URL?: string
      NEXT_PUBLIC_ARBITRUM_RPC_URL?: string
      NEXT_PUBLIC_OPTIMISM_RPC_URL?: string
      NEXT_PUBLIC_AVALANCHE_RPC_URL?: string
      NEXT_PUBLIC_BASE_RPC_URL?: string
      NEXT_PUBLIC_BSC_RPC_URL?: string
      
      // API Keys
      NEXT_PUBLIC_1INCH_API_KEY?: string
      NEXT_PUBLIC_0X_API_KEY?: string
      NEXT_PUBLIC_PARASWAP_API_KEY?: string
      NEXT_PUBLIC_COINGECKO_API_KEY?: string
      
      // Analytics & Monitoring
      NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?: string
      NEXT_PUBLIC_MIXPANEL_TOKEN?: string
      NEXT_PUBLIC_SENTRY_DSN?: string
      NEXT_PUBLIC_ANALYTICS_ENDPOINT?: string
      NEXT_PUBLIC_METRICS_ENDPOINT?: string
      NEXT_PUBLIC_ERROR_ENDPOINT?: string
    }
  }

  // Navigator extensions
  interface Navigator {
    connection?: {
      effectiveType: '2g' | '3g' | '4g' | 'slow-2g'
      downlink: number
      rtt: number
      saveData: boolean
    }
  }

  // Performance extensions
  interface Performance {
    memory?: {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
  }
}

// Module declarations for packages without types
declare module 'web-vitals' {
  export interface Metric {
    name: string
    value: number
    rating: 'good' | 'needs-improvement' | 'poor'
    delta: number
    id: string
  }

  export function getCLS(onReport: (metric: Metric) => void): void
  export function getFID(onReport: (metric: Metric) => void): void
  export function getFCP(onReport: (metric: Metric) => void): void
  export function getLCP(onReport: (metric: Metric) => void): void
  export function getTTFB(onReport: (metric: Metric) => void): void
}

declare module '@rainbow-me/rainbowkit' {
  export interface Theme {
    blurs: {
      modalOverlay: string
    }
    colors: {
      accentColor: string
      accentColorForeground: string
      actionButtonBorder: string
      actionButtonBorderMobile: string
      actionButtonSecondaryBackground: string
      closeButton: string
      closeButtonBackground: string
      connectButtonBackground: string
      connectButtonBackgroundError: string
      connectButtonInnerBackground: string
      connectButtonText: string
      connectButtonTextError: string
      connectionIndicator: string
      downloadBottomCardBackground: string
      downloadTopCardBackground: string
      error: string
      generalBorder: string
      generalBorderDim: string
      menuItemBackground: string
      modalBackdrop: string
      modalBackground: string
      modalBorder: string
      modalText: string
      modalTextDim: string
      modalTextSecondary: string
      profileAction: string
      profileActionHover: string
      profileForeground: string
      selectedOptionBorder: string
      standby: string
    }
    fonts: {
      body: string
    }
    radii: {
      actionButton: string
      connectButton: string
      menuButton: string
      modal: string
      modalMobile: string
    }
    shadows: {
      connectButton: string
      dialog: string
      profileDetailsAction: string
      selectedOption: string
      selectedWallet: string
      walletLogo: string
    }
  }
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type NonEmptyArray<T> = [T, ...T[]]

export type Awaited<T> = T extends PromiseLike<infer U> ? U : T

// Chain and token types
export type ChainId = 1 | 10 | 56 | 137 | 250 | 42161 | 43114 | 8453

export type TokenSymbol = string

export type Address = `0x${string}`

// API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  timestamp: number
  requestId?: string
}

// Error types
export interface AppError extends Error {
  code?: string
  context?: Record<string, any>
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

// Event types
export interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  userId?: string
  timestamp?: number
}

// Component prop types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
  'data-testid'?: string
}

// Form types
export interface FormFieldProps {
  name: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  helperText?: string
}

// State types
export interface LoadingState {
  isLoading: boolean
  error: Error | null
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// Export empty object to make this a module
export {}

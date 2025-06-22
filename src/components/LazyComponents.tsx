import dynamic from 'next/dynamic'
import { ComponentType } from 'react'
import { Box, Spinner, Center, Text, VStack } from '@chakra-ui/react'

// Loading component for lazy-loaded components
const LoadingFallback = ({ name }: { name: string }) => (
  <Center h="200px">
    <VStack spacing={4}>
      <Spinner size="lg" color="primary.500" thickness="4px" />
      <Text fontSize="sm" color="gray.500">
        Loading {name}...
      </Text>
    </VStack>
  </Center>
)

// Error boundary for lazy components
const ErrorFallback = ({ name, error }: { name: string; error?: Error }) => (
  <Center h="200px">
    <VStack spacing={4}>
      <Text fontSize="lg" color="error.500">
        Failed to load {name}
      </Text>
      {error && (
        <Text fontSize="sm" color="gray.500">
          {error.message}
        </Text>
      )}
    </VStack>
  </Center>
)

// Higher-order component for lazy loading with error handling
const withLazyLoading = <P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  name: string
) => {
  return dynamic(importFn, {
    loading: () => <LoadingFallback name={name} />,
    ssr: false, // Disable SSR for heavy components
  })
}

// Lazy-loaded components for better performance

// Pool-related components (heavy)
export const LazyPoolCreationForm = withLazyLoading(
  () => import('./Pool/PoolCreationForm'),
  'Pool Creation Form'
)

export const LazyPoolDashboard = withLazyLoading(
  () => import('./Pool/PoolDashboard'),
  'Pool Dashboard'
)

// Chart components (heavy with D3/Recharts)
export const LazyTradingChart = withLazyLoading(
  () => import('./Charts/TradingChart'),
  'Trading Chart'
)

export const LazyAnalyticsCharts = withLazyLoading(
  () => import('./Charts/AnalyticsCharts'),
  'Analytics Charts'
)

export const LazyPortfolioCharts = withLazyLoading(
  () => import('./Charts/PortfolioCharts'),
  'Portfolio Charts'
)

// Advanced swap components
export const LazyEnhancedSwapForm = withLazyLoading(
  () => import('./Swap/EnhancedSwapForm'),
  'Enhanced Swap Form'
)

export const LazyAdvancedOrderForm = withLazyLoading(
  () => import('./Swap/AdvancedOrderForm'),
  'Advanced Order Form'
)

// Wallet and transaction components
export const LazyTransactionHistory = withLazyLoading(
  () => import('./Transaction/TransactionHistory'),
  'Transaction History'
)

export const LazyWalletManager = withLazyLoading(
  () => import('./Wallet/WalletManager'),
  'Wallet Manager'
)

// Settings and configuration
export const LazySettingsPanel = withLazyLoading(
  () => import('./Settings/SettingsPanel'),
  'Settings Panel'
)

export const LazyAdvancedSettings = withLazyLoading(
  () => import('./Settings/AdvancedSettings'),
  'Advanced Settings'
)

// Analytics and reporting
export const LazyReportsGenerator = withLazyLoading(
  () => import('./Reports/ReportsGenerator'),
  'Reports Generator'
)

export const LazyDataExporter = withLazyLoading(
  () => import('./Reports/DataExporter'),
  'Data Exporter'
)

// Admin components (rarely used)
export const LazyAdminPanel = withLazyLoading(
  () => import('./Admin/AdminPanel'),
  'Admin Panel'
)

export const LazySystemMonitor = withLazyLoading(
  () => import('./Admin/SystemMonitor'),
  'System Monitor'
)

// Utility function for preloading components
export const preloadComponent = (componentName: keyof typeof componentMap) => {
  const component = componentMap[componentName]
  if (component && 'preload' in component) {
    ;(component as any).preload()
  }
}

// Component map for easy access
const componentMap = {
  PoolCreationForm: LazyPoolCreationForm,
  PoolDashboard: LazyPoolDashboard,
  TradingChart: LazyTradingChart,
  AnalyticsCharts: LazyAnalyticsCharts,
  PortfolioCharts: LazyPortfolioCharts,
  EnhancedSwapForm: LazyEnhancedSwapForm,
  AdvancedOrderForm: LazyAdvancedOrderForm,
  TransactionHistory: LazyTransactionHistory,
  WalletManager: LazyWalletManager,
  SettingsPanel: LazySettingsPanel,
  AdvancedSettings: LazyAdvancedSettings,
  ReportsGenerator: LazyReportsGenerator,
  DataExporter: LazyDataExporter,
  AdminPanel: LazyAdminPanel,
  SystemMonitor: LazySystemMonitor,
} as const

// Hook for intelligent preloading based on user behavior
export const useIntelligentPreloading = () => {
  const preloadOnHover = (componentName: keyof typeof componentMap) => {
    return {
      onMouseEnter: () => preloadComponent(componentName),
      onFocus: () => preloadComponent(componentName),
    }
  }

  const preloadOnVisible = (componentName: keyof typeof componentMap) => {
    // Use Intersection Observer to preload when element becomes visible
    return (element: HTMLElement | null) => {
      if (!element) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              preloadComponent(componentName)
              observer.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.1 }
      )

      observer.observe(element)
      return () => observer.disconnect()
    }
  }

  return { preloadOnHover, preloadOnVisible, preloadComponent }
}

// Route-based preloading configuration
export const routePreloadConfig = {
  '/': ['EnhancedSwapForm'],
  '/swap': ['EnhancedSwapForm', 'AdvancedOrderForm'],
  '/pools': ['PoolCreationForm', 'PoolDashboard'],
  '/portfolio': ['PortfolioCharts', 'TransactionHistory'],
  '/analytics': ['AnalyticsCharts', 'TradingChart'],
  '/settings': ['SettingsPanel', 'AdvancedSettings'],
  '/admin': ['AdminPanel', 'SystemMonitor'],
} as const

// Preload components based on current route
export const preloadForRoute = (route: keyof typeof routePreloadConfig) => {
  const components = routePreloadConfig[route]
  if (components) {
    components.forEach(preloadComponent)
  }
}

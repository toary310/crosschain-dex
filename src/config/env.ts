// Environment variables configuration with type safety
export interface EnvironmentConfig {
  // App Configuration
  NODE_ENV: 'development' | 'production' | 'test'
  NEXT_PUBLIC_ENVIRONMENT: 'development' | 'staging' | 'production'
  NEXT_PUBLIC_APP_NAME: string
  NEXT_PUBLIC_APP_URL: string
  NEXT_PUBLIC_APP_DESCRIPTION: string

  // WalletConnect
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

// Validate and parse environment variables
function validateEnv(): EnvironmentConfig {
  const env = process.env

  // Required variables
  const required = {
    NODE_ENV: env.NODE_ENV as EnvironmentConfig['NODE_ENV'],
    NEXT_PUBLIC_ENVIRONMENT: (env.NEXT_PUBLIC_ENVIRONMENT || 'development') as EnvironmentConfig['NEXT_PUBLIC_ENVIRONMENT'],
    NEXT_PUBLIC_APP_NAME: env.NEXT_PUBLIC_APP_NAME || 'ChainBridge DEX',
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_APP_DESCRIPTION: env.NEXT_PUBLIC_APP_DESCRIPTION || 'Next-generation cross-chain decentralized exchange',
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  }

  // Validate required fields
  if (!required.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && required.NEXT_PUBLIC_ENVIRONMENT === 'production') {
    console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is required for production')
  }

  if (!['development', 'production', 'test'].includes(required.NODE_ENV)) {
    throw new Error(`Invalid NODE_ENV: ${required.NODE_ENV}`)
  }

  if (!['development', 'staging', 'production'].includes(required.NEXT_PUBLIC_ENVIRONMENT)) {
    throw new Error(`Invalid NEXT_PUBLIC_ENVIRONMENT: ${required.NEXT_PUBLIC_ENVIRONMENT}`)
  }

  // Optional variables
  const optional = {
    NEXT_PUBLIC_ETHEREUM_RPC_URL: env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
    NEXT_PUBLIC_POLYGON_RPC_URL: env.NEXT_PUBLIC_POLYGON_RPC_URL,
    NEXT_PUBLIC_ARBITRUM_RPC_URL: env.NEXT_PUBLIC_ARBITRUM_RPC_URL,
    NEXT_PUBLIC_OPTIMISM_RPC_URL: env.NEXT_PUBLIC_OPTIMISM_RPC_URL,
    NEXT_PUBLIC_AVALANCHE_RPC_URL: env.NEXT_PUBLIC_AVALANCHE_RPC_URL,
    NEXT_PUBLIC_BASE_RPC_URL: env.NEXT_PUBLIC_BASE_RPC_URL,
    NEXT_PUBLIC_BSC_RPC_URL: env.NEXT_PUBLIC_BSC_RPC_URL,
    NEXT_PUBLIC_1INCH_API_KEY: env.NEXT_PUBLIC_1INCH_API_KEY,
    NEXT_PUBLIC_0X_API_KEY: env.NEXT_PUBLIC_0X_API_KEY,
    NEXT_PUBLIC_PARASWAP_API_KEY: env.NEXT_PUBLIC_PARASWAP_API_KEY,
    NEXT_PUBLIC_COINGECKO_API_KEY: env.NEXT_PUBLIC_COINGECKO_API_KEY,
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
    NEXT_PUBLIC_MIXPANEL_TOKEN: env.NEXT_PUBLIC_MIXPANEL_TOKEN,
    NEXT_PUBLIC_SENTRY_DSN: env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_ANALYTICS_ENDPOINT: env.NEXT_PUBLIC_ANALYTICS_ENDPOINT,
    NEXT_PUBLIC_METRICS_ENDPOINT: env.NEXT_PUBLIC_METRICS_ENDPOINT,
    NEXT_PUBLIC_ERROR_ENDPOINT: env.NEXT_PUBLIC_ERROR_ENDPOINT,
  }

  return { ...required, ...optional }
}

// Export validated environment configuration
export const envConfig = validateEnv()

// Helper functions for environment checks
export const isDevelopment = envConfig.NODE_ENV === 'development'
export const isProduction = envConfig.NODE_ENV === 'production'
export const isTest = envConfig.NODE_ENV === 'test'

export const isDevEnvironment = envConfig.NEXT_PUBLIC_ENVIRONMENT === 'development'
export const isStagingEnvironment = envConfig.NEXT_PUBLIC_ENVIRONMENT === 'staging'
export const isProdEnvironment = envConfig.NEXT_PUBLIC_ENVIRONMENT === 'production'

// API availability checks
export const hasAnalytics = Boolean(envConfig.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID)
export const hasSentry = Boolean(envConfig.NEXT_PUBLIC_SENTRY_DSN)
export const has1inchAPI = Boolean(envConfig.NEXT_PUBLIC_1INCH_API_KEY)
export const has0xAPI = Boolean(envConfig.NEXT_PUBLIC_0X_API_KEY)
export const hasParaswapAPI = Boolean(envConfig.NEXT_PUBLIC_PARASWAP_API_KEY)
export const hasCoinGeckoAPI = Boolean(envConfig.NEXT_PUBLIC_COINGECKO_API_KEY)

// RPC URL helpers
export const getRpcUrl = (chainId: number): string | undefined => {
  const rpcMap: Record<number, string | undefined> = {
    1: envConfig.NEXT_PUBLIC_ETHEREUM_RPC_URL,
    137: envConfig.NEXT_PUBLIC_POLYGON_RPC_URL,
    42161: envConfig.NEXT_PUBLIC_ARBITRUM_RPC_URL,
    10: envConfig.NEXT_PUBLIC_OPTIMISM_RPC_URL,
    43114: envConfig.NEXT_PUBLIC_AVALANCHE_RPC_URL,
    8453: envConfig.NEXT_PUBLIC_BASE_RPC_URL,
    56: envConfig.NEXT_PUBLIC_BSC_RPC_URL,
  }

  return rpcMap[chainId]
}

// Validation helpers
export const validateApiKey = (apiKey: string | undefined, serviceName: string): boolean => {
  if (!apiKey) {
    if (isProduction) {
      console.warn(`${serviceName} API key is not configured`)
    }
    return false
  }

  if (apiKey.length < 10) {
    console.warn(`${serviceName} API key appears to be invalid (too short)`)
    return false
  }

  return true
}

// Environment info for debugging
export const getEnvironmentInfo = () => ({
  nodeEnv: envConfig.NODE_ENV,
  environment: envConfig.NEXT_PUBLIC_ENVIRONMENT,
  appName: envConfig.NEXT_PUBLIC_APP_NAME,
  appUrl: envConfig.NEXT_PUBLIC_APP_URL,
  hasWalletConnect: Boolean(envConfig.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID),
  hasAnalytics,
  hasSentry,
  apiKeys: {
    oneInch: has1inchAPI,
    zeroX: has0xAPI,
    paraswap: hasParaswapAPI,
    coinGecko: hasCoinGeckoAPI,
  },
  rpcUrls: {
    ethereum: Boolean(envConfig.NEXT_PUBLIC_ETHEREUM_RPC_URL),
    polygon: Boolean(envConfig.NEXT_PUBLIC_POLYGON_RPC_URL),
    arbitrum: Boolean(envConfig.NEXT_PUBLIC_ARBITRUM_RPC_URL),
    optimism: Boolean(envConfig.NEXT_PUBLIC_OPTIMISM_RPC_URL),
    avalanche: Boolean(envConfig.NEXT_PUBLIC_AVALANCHE_RPC_URL),
    base: Boolean(envConfig.NEXT_PUBLIC_BASE_RPC_URL),
    bsc: Boolean(envConfig.NEXT_PUBLIC_BSC_RPC_URL),
  },
})

// Type guard for environment variables
export const isValidEnvironment = (env: string): env is EnvironmentConfig['NEXT_PUBLIC_ENVIRONMENT'] => {
  return ['development', 'staging', 'production'].includes(env)
}

// Export types
export type { EnvironmentConfig }

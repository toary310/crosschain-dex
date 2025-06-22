import { isAddress } from 'viem'

// Security utilities for Web3 applications

/**
 * Validate Ethereum address
 */
export const validateAddress = (address: string): boolean => {
  if (!address) return false
  return isAddress(address)
}

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Validate token amount input
 */
export const validateAmount = (amount: string, decimals: number = 18): boolean => {
  if (!amount || amount === '0') return false
  
  // Check if it's a valid number
  const numAmount = parseFloat(amount)
  if (isNaN(numAmount) || numAmount <= 0) return false
  
  // Check decimal places
  const decimalPlaces = (amount.split('.')[1] || '').length
  if (decimalPlaces > decimals) return false
  
  return true
}

/**
 * Validate slippage tolerance (0.1% to 50%)
 */
export const validateSlippage = (slippage: number): boolean => {
  return slippage >= 0.1 && slippage <= 50
}

/**
 * Check if URL is safe for external links
 */
export const isSafeUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    const allowedProtocols = ['http:', 'https:']
    const blockedDomains = ['localhost', '127.0.0.1', '0.0.0.0']
    
    if (!allowedProtocols.includes(urlObj.protocol)) return false
    if (blockedDomains.some(domain => urlObj.hostname.includes(domain))) return false
    
    return true
  } catch {
    return false
  }
}

/**
 * Rate limiting utility
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs)
    
    if (validRequests.length >= this.maxRequests) {
      return false
    }
    
    // Add current request
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    return true
  }
  
  reset(identifier: string): void {
    this.requests.delete(identifier)
  }
}

export const rateLimiter = new RateLimiter()

/**
 * Content Security Policy headers
 */
export const getCSPHeaders = () => {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https: wss: ws:",
    "frame-src 'self' https://verify.walletconnect.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ')
  
  return {
    'Content-Security-Policy': csp,
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }
}

/**
 * Validate transaction parameters
 */
export interface TransactionValidation {
  isValid: boolean
  errors: string[]
}

export const validateTransaction = (params: {
  to?: string
  value?: string
  data?: string
  gasLimit?: string
  gasPrice?: string
}): TransactionValidation => {
  const errors: string[] = []
  
  // Validate recipient address
  if (params.to && !validateAddress(params.to)) {
    errors.push('Invalid recipient address')
  }
  
  // Validate value
  if (params.value && !validateAmount(params.value)) {
    errors.push('Invalid transaction value')
  }
  
  // Validate gas limit
  if (params.gasLimit) {
    const gasLimit = parseInt(params.gasLimit)
    if (isNaN(gasLimit) || gasLimit < 21000 || gasLimit > 10000000) {
      errors.push('Invalid gas limit')
    }
  }
  
  // Validate gas price
  if (params.gasPrice) {
    const gasPrice = parseFloat(params.gasPrice)
    if (isNaN(gasPrice) || gasPrice < 0) {
      errors.push('Invalid gas price')
    }
  }
  
  // Validate data (if present, should be hex)
  if (params.data && !/^0x[0-9a-fA-F]*$/.test(params.data)) {
    errors.push('Invalid transaction data')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Phishing protection - check against known malicious domains
 */
const KNOWN_PHISHING_DOMAINS = [
  // Add known phishing domains here
  'fake-metamask.com',
  'phishing-wallet.com',
]

export const checkPhishingDomain = (url: string): boolean => {
  try {
    const domain = new URL(url).hostname.toLowerCase()
    return KNOWN_PHISHING_DOMAINS.some(phishingDomain => 
      domain.includes(phishingDomain)
    )
  } catch {
    return false
  }
}

/**
 * Secure random string generation
 */
export const generateSecureRandom = (length: number = 32): string => {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Input validation for search queries
 */
export const validateSearchQuery = (query: string): boolean => {
  if (!query || query.length < 1 || query.length > 100) return false
  
  // Allow alphanumeric, spaces, and common symbols
  const allowedPattern = /^[a-zA-Z0-9\s\-_.]+$/
  return allowedPattern.test(query)
}

/**
 * Validate chain ID
 */
export const validateChainId = (chainId: number): boolean => {
  const supportedChains = [1, 137, 42161, 10, 56, 43114, 250, 8453] // Add supported chain IDs
  return supportedChains.includes(chainId)
}

/**
 * Security audit log
 */
export const auditLog = (action: string, details: Record<string, any>) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    details,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'server',
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Security Audit:', logEntry)
  }
  
  // In production, send to security monitoring service
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SECURITY_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_SECURITY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logEntry),
    }).catch(() => {
      // Silently fail if security logging fails
    })
  }
}

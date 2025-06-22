# ChainBridge DEX - API仕様書

## 📡 API概要

### ベースURL
```
Production: https://api.chainbridge-dex.com/v1
Staging: https://staging-api.chainbridge-dex.com/v1
Development: http://localhost:3000/api/v1
```

### 認証
```typescript
// API Key Authentication (Optional for public endpoints)
Headers: {
  'X-API-Key': 'your-api-key',
  'Content-Type': 'application/json'
}

// Wallet Signature Authentication (Required for user-specific endpoints)
Headers: {
  'X-Wallet-Address': '0x...',
  'X-Signature': 'signature',
  'X-Message': 'message',
  'Content-Type': 'application/json'
}
```

## 🔄 Swap API

### Get Quote
最適なスワップルートと価格を取得

```typescript
GET /swap/quote

Query Parameters:
{
  fromToken: string      // Token contract address
  toToken: string        // Token contract address  
  amount: string         // Amount in wei
  chainId: number        // Chain ID
  slippage?: number      // Slippage tolerance (default: 0.5)
  gasPrice?: string      // Gas price in wei
  protocols?: string[]   // Preferred protocols
}

Response:
{
  success: boolean
  data: {
    fromToken: TokenInfo
    toToken: TokenInfo
    fromAmount: string
    toAmount: string
    estimatedGas: string
    gasPrice: string
    protocols: Protocol[]
    route: RouteStep[]
    priceImpact: number
    minimumReceived: string
    validUntil: number
  }
  error?: string
}
```

### Execute Swap
スワップ取引を実行

```typescript
POST /swap/execute

Request Body:
{
  quoteId: string        // Quote ID from /quote
  userAddress: string    // User wallet address
  signature: string      // Transaction signature
  deadline?: number      // Transaction deadline
}

Response:
{
  success: boolean
  data: {
    transactionHash: string
    status: 'pending' | 'confirmed' | 'failed'
    estimatedConfirmationTime: number
  }
  error?: string
}
```

### Transaction Status
取引状況を確認

```typescript
GET /swap/transaction/{hash}

Response:
{
  success: boolean
  data: {
    hash: string
    status: 'pending' | 'confirmed' | 'failed'
    confirmations: number
    blockNumber?: number
    gasUsed?: string
    effectiveGasPrice?: string
    fromAmount: string
    toAmount: string
    actualSlippage: number
  }
  error?: string
}
```

## 🌉 Bridge API

### Get Bridge Quote
クロスチェーンブリッジの見積もり

```typescript
GET /bridge/quote

Query Parameters:
{
  fromChain: number      // Source chain ID
  toChain: number        // Destination chain ID
  token: string          // Token contract address
  amount: string         // Amount in wei
  recipient?: string     // Recipient address (default: sender)
}

Response:
{
  success: boolean
  data: {
    fromChain: ChainInfo
    toChain: ChainInfo
    token: TokenInfo
    amount: string
    estimatedOutput: string
    fee: string
    estimatedTime: number
    protocols: BridgeProtocol[]
    route: BridgeStep[]
  }
  error?: string
}
```

### Execute Bridge
ブリッジ取引を実行

```typescript
POST /bridge/execute

Request Body:
{
  quoteId: string
  userAddress: string
  signature: string
  recipient?: string
}

Response:
{
  success: boolean
  data: {
    sourceTransactionHash: string
    bridgeId: string
    status: 'initiated' | 'processing' | 'completed' | 'failed'
    estimatedCompletionTime: number
  }
  error?: string
}
```

### Bridge Status
ブリッジ状況を確認

```typescript
GET /bridge/status/{bridgeId}

Response:
{
  success: boolean
  data: {
    bridgeId: string
    status: 'initiated' | 'processing' | 'completed' | 'failed'
    sourceTransaction: {
      hash: string
      confirmations: number
      status: string
    }
    destinationTransaction?: {
      hash: string
      confirmations: number
      status: string
    }
    progress: number
    estimatedTimeRemaining: number
  }
  error?: string
}
```

## 💧 Pools API

### Get Pools
流動性プール一覧を取得

```typescript
GET /pools

Query Parameters:
{
  chainId?: number       // Filter by chain
  token?: string         // Filter by token
  protocol?: string      // Filter by protocol
  minTvl?: string       // Minimum TVL
  sortBy?: 'tvl' | 'apy' | 'volume'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

Response:
{
  success: boolean
  data: {
    pools: Pool[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
  error?: string
}
```

### Get Pool Details
特定プールの詳細情報

```typescript
GET /pools/{poolId}

Response:
{
  success: boolean
  data: {
    id: string
    protocol: string
    chainId: number
    tokens: TokenInfo[]
    reserves: string[]
    totalSupply: string
    tvl: string
    apy: number
    volume24h: string
    fees24h: string
    priceRange?: {
      min: number
      max: number
      current: number
    }
    userPosition?: {
      liquidity: string
      tokens: string[]
      uncollectedFees: string[]
      value: string
    }
  }
  error?: string
}
```

### Add Liquidity
流動性を追加

```typescript
POST /pools/{poolId}/add-liquidity

Request Body:
{
  amounts: string[]      // Token amounts
  minAmounts: string[]   // Minimum amounts (slippage protection)
  userAddress: string
  signature: string
  deadline?: number
}

Response:
{
  success: boolean
  data: {
    transactionHash: string
    liquidityTokens: string
    actualAmounts: string[]
  }
  error?: string
}
```

### Remove Liquidity
流動性を削除

```typescript
POST /pools/{poolId}/remove-liquidity

Request Body:
{
  liquidity: string      // LP tokens to burn
  minAmounts: string[]   // Minimum token amounts
  userAddress: string
  signature: string
  deadline?: number
}

Response:
{
  success: boolean
  data: {
    transactionHash: string
    amounts: string[]
    fees: string[]
  }
  error?: string
}
```

## 📊 Analytics API

### Get Market Data
市場データを取得

```typescript
GET /analytics/market

Query Parameters:
{
  timeframe?: '1h' | '24h' | '7d' | '30d'
  chainId?: number
}

Response:
{
  success: boolean
  data: {
    totalVolume: string
    totalTvl: string
    totalUsers: number
    totalTransactions: number
    topTokens: TokenMarketData[]
    topPools: PoolMarketData[]
    priceChanges: PriceChangeData[]
  }
  error?: string
}
```

### Get Token Prices
トークン価格を取得

```typescript
GET /analytics/prices

Query Parameters:
{
  tokens: string[]       // Token addresses
  chainId?: number
  currency?: string      // USD, EUR, etc.
}

Response:
{
  success: boolean
  data: {
    [tokenAddress: string]: {
      price: number
      change24h: number
      volume24h: string
      marketCap?: string
      lastUpdated: number
    }
  }
  error?: string
}
```

### Get Portfolio
ユーザーポートフォリオ

```typescript
GET /analytics/portfolio/{address}

Query Parameters:
{
  chainIds?: number[]
  includeNfts?: boolean
}

Response:
{
  success: boolean
  data: {
    totalValue: string
    totalChange24h: number
    tokens: TokenBalance[]
    pools: PoolPosition[]
    transactions: Transaction[]
    performance: {
      pnl: string
      pnlPercent: number
      bestPerformer: TokenPerformance
      worstPerformer: TokenPerformance
    }
  }
  error?: string
}
```

## 🔔 WebSocket API

### Connection
```typescript
// WebSocket URL
wss://ws.chainbridge-dex.com/v1

// Authentication
{
  "type": "auth",
  "data": {
    "address": "0x...",
    "signature": "signature",
    "message": "message"
  }
}
```

### Price Updates
```typescript
// Subscribe to price updates
{
  "type": "subscribe",
  "channel": "prices",
  "data": {
    "tokens": ["0x...", "0x..."],
    "chainId": 1
  }
}

// Price update message
{
  "type": "price_update",
  "data": {
    "token": "0x...",
    "price": 1234.56,
    "change24h": 5.67,
    "timestamp": 1640995200000
  }
}
```

### Transaction Updates
```typescript
// Subscribe to transaction updates
{
  "type": "subscribe",
  "channel": "transactions",
  "data": {
    "address": "0x..."
  }
}

// Transaction update message
{
  "type": "transaction_update",
  "data": {
    "hash": "0x...",
    "status": "confirmed",
    "confirmations": 12,
    "type": "swap" | "bridge" | "liquidity"
  }
}
```

## 📝 Data Types

### Common Types
```typescript
interface TokenInfo {
  address: string
  symbol: string
  name: string
  decimals: number
  logoUri?: string
  chainId: number
}

interface ChainInfo {
  id: number
  name: string
  symbol: string
  rpcUrl: string
  explorerUrl: string
}

interface Protocol {
  name: string
  percentage: number
  estimatedGas: string
}

interface RouteStep {
  protocol: string
  fromToken: string
  toToken: string
  fromAmount: string
  toAmount: string
  poolAddress?: string
}
```

### Pool Types
```typescript
interface Pool {
  id: string
  protocol: string
  chainId: number
  tokens: TokenInfo[]
  reserves: string[]
  totalSupply: string
  tvl: string
  apy: number
  volume24h: string
  fees24h: string
  type: 'v2' | 'v3' | 'stable' | 'weighted'
}

interface PoolPosition {
  poolId: string
  liquidity: string
  tokens: string[]
  value: string
  uncollectedFees: string[]
  apy: number
}
```

## ⚠️ Error Handling

### Error Response Format
```typescript
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

### Common Error Codes
```typescript
// Authentication Errors
'AUTH_REQUIRED'         // Authentication required
'INVALID_SIGNATURE'     // Invalid wallet signature
'EXPIRED_SIGNATURE'     // Signature expired

// Validation Errors
'INVALID_PARAMS'        // Invalid parameters
'INSUFFICIENT_BALANCE'  // Insufficient token balance
'SLIPPAGE_TOO_HIGH'    // Slippage exceeds limit

// Network Errors
'NETWORK_ERROR'         // Blockchain network error
'RPC_ERROR'            // RPC node error
'TIMEOUT'              // Request timeout

// Business Logic Errors
'POOL_NOT_FOUND'       // Pool does not exist
'INSUFFICIENT_LIQUIDITY' // Not enough liquidity
'PRICE_IMPACT_TOO_HIGH' // Price impact too high
```

## 🔄 Rate Limiting

```typescript
// Rate Limits
Public Endpoints: 100 requests/minute
Authenticated Endpoints: 1000 requests/minute
WebSocket Connections: 10 connections per IP

// Headers
'X-RateLimit-Limit': '100'
'X-RateLimit-Remaining': '95'
'X-RateLimit-Reset': '1640995200'
```

---

**Document Version**: 1.0.0  
**Last Updated**: 2024年12月  
**Next Review**: 2025年1月

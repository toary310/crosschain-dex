import { GetServerSideProps, GetStaticProps, GetStaticPaths } from 'next'
import { ParsedUrlQuery } from 'querystring'

// SSR optimization utilities
export interface SSRConfig {
  revalidate?: number
  cache?: boolean
  cacheMaxAge?: number
  fallback?: boolean | 'blocking'
}

// Enhanced getServerSideProps wrapper with caching
export const withSSROptimization = <P extends Record<string, any> = {}>(
  handler: GetServerSideProps<P>,
  config: SSRConfig = {}
): GetServerSideProps<P> => {
  return async (context) => {
    const { cache = true, cacheMaxAge = 60 } = config

    try {
      // Add performance timing
      const startTime = Date.now()
      
      // Execute the original handler
      const result = await handler(context)
      
      const endTime = Date.now()
      const duration = endTime - startTime

      // Log performance in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`SSR took ${duration}ms for ${context.resolvedUrl}`)
      }

      // Add cache headers if caching is enabled
      if (cache && 'props' in result) {
        context.res.setHeader(
          'Cache-Control',
          `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=86400`
        )
      }

      return result
    } catch (error) {
      console.error('SSR Error:', error)
      
      // Return error page or fallback
      return {
        notFound: true,
      }
    }
  }
}

// Enhanced getStaticProps wrapper with ISR
export const withISROptimization = <P extends Record<string, any> = {}>(
  handler: GetStaticProps<P>,
  config: SSRConfig = {}
): GetStaticProps<P> => {
  return async (context) => {
    const { revalidate = 3600 } = config // Default 1 hour

    try {
      const startTime = Date.now()
      
      const result = await handler(context)
      
      const endTime = Date.now()
      const duration = endTime - startTime

      if (process.env.NODE_ENV === 'development') {
        console.log(`ISR took ${duration}ms for ${context.params}`)
      }

      // Add revalidation
      if ('props' in result) {
        return {
          ...result,
          revalidate,
        }
      }

      return result
    } catch (error) {
      console.error('ISR Error:', error)
      
      return {
        notFound: true,
        revalidate: 60, // Retry after 1 minute
      }
    }
  }
}

// Dynamic route optimization
export const withDynamicRouteOptimization = (
  handler: GetStaticPaths,
  config: SSRConfig = {}
): GetStaticPaths => {
  return async (context) => {
    const { fallback = 'blocking' } = config

    try {
      const result = await handler(context)
      
      return {
        ...result,
        fallback,
      }
    } catch (error) {
      console.error('Dynamic route error:', error)
      
      return {
        paths: [],
        fallback: 'blocking',
      }
    }
  }
}

// Data fetching optimization
export class DataFetcher {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 300000 // 5 minutes default
  ): Promise<T> {
    const cached = this.cache.get(key)
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }

    try {
      const data = await fetcher()
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
      })
      
      return data
    } catch (error) {
      // Return cached data if available, even if expired
      if (cached) {
        console.warn(`Using stale cache for ${key}:`, error)
        return cached.data
      }
      
      throw error
    }
  }

  invalidate(key: string) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }
}

// Global data fetcher instance
export const dataFetcher = new DataFetcher()

// Pre-rendering optimization for static content
export const generateStaticParams = async (
  paths: string[],
  batchSize: number = 10
): Promise<Array<{ params: ParsedUrlQuery }>> => {
  const results: Array<{ params: ParsedUrlQuery }> = []
  
  // Process paths in batches to avoid overwhelming the server
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize)
    
    const batchResults = await Promise.allSettled(
      batch.map(async (path) => {
        // Extract params from path
        const segments = path.split('/').filter(Boolean)
        const params: ParsedUrlQuery = {}
        
        segments.forEach((segment, index) => {
          if (segment.startsWith('[') && segment.endsWith(']')) {
            const paramName = segment.slice(1, -1)
            params[paramName] = segments[index] || ''
          }
        })
        
        return { params }
      })
    )
    
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      }
    })
    
    // Add delay between batches to prevent rate limiting
    if (i + batchSize < paths.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  return results
}

// Edge function optimization
export const withEdgeOptimization = (handler: any) => {
  return async (request: Request) => {
    const url = new URL(request.url)
    
    // Add edge-specific optimizations
    const response = await handler(request)
    
    // Add edge cache headers
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    response.headers.set('CDN-Cache-Control', 'public, max-age=86400')
    
    return response
  }
}

// Streaming SSR optimization
export const createStreamingResponse = (
  renderStream: () => ReadableStream,
  options: {
    headers?: Record<string, string>
    status?: number
  } = {}
) => {
  const { headers = {}, status = 200 } = options
  
  return new Response(renderStream(), {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      ...headers,
    },
  })
}

// Critical CSS extraction
export const extractCriticalCSS = (html: string): string => {
  // This would integrate with a CSS extraction tool
  // For now, return a placeholder
  return `
    <style>
      /* Critical CSS would be extracted here */
      body { margin: 0; font-family: Inter, sans-serif; }
      .chakra-ui-light { background: #fff; color: #1a202c; }
      .chakra-ui-dark { background: #1a202c; color: #fff; }
    </style>
  `
}

// Resource preloading
export const generatePreloadLinks = (resources: Array<{
  href: string
  as: string
  type?: string
  crossorigin?: string
}>): string => {
  return resources
    .map(({ href, as, type, crossorigin }) => {
      const attrs = [
        'rel="preload"',
        `href="${href}"`,
        `as="${as}"`,
        type && `type="${type}"`,
        crossorigin && `crossorigin="${crossorigin}"`,
      ]
        .filter(Boolean)
        .join(' ')
      
      return `<link ${attrs}>`
    })
    .join('\n')
}

// Performance monitoring for SSR
export const measureSSRPerformance = (pageName: string) => {
  const startTime = Date.now()
  
  return {
    end: () => {
      const duration = Date.now() - startTime
      
      // Log to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Send to analytics
        console.log(`SSR Performance - ${pageName}: ${duration}ms`)
      }
      
      return duration
    },
  }
}

// Hydration optimization
export const optimizeHydration = () => {
  if (typeof window !== 'undefined') {
    // Defer non-critical hydration
    const deferredHydration = () => {
      // Hydrate non-critical components after main content
      requestIdleCallback(() => {
        // Trigger hydration of lazy components
        window.dispatchEvent(new CustomEvent('hydrate-deferred'))
      })
    }
    
    // Wait for main content to be interactive
    if (document.readyState === 'complete') {
      deferredHydration()
    } else {
      window.addEventListener('load', deferredHydration)
    }
  }
}

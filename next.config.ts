import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: [
      '@chakra-ui/react',
      '@chakra-ui/icons',
      'framer-motion',
      'react-icons',
      'recharts',
      'viem',
      'wagmi',
      '@tanstack/react-query',
      'zustand',
      'immer',
    ],
    // Enable memory optimization
    memoryBasedWorkersCount: true,
    // Enable CSS optimization
    optimizeCss: true,
  },

  // Server external packages
  serverExternalPackages: ['sharp', 'canvas'],

  // Turbopack configuration
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    // Enable React compiler optimizations
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: [
      'assets.coingecko.com',
      'raw.githubusercontent.com',
      'tokens.1inch.io',
      'wallet-asset.matic.network',
    ],
  },

  // Bundle optimization
  webpack: (config, { dev, isServer, webpack }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // Framework chunk (React, Next.js)
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'framework',
            priority: 40,
            enforce: true,
            reuseExistingChunk: true,
          },
          // Chakra UI chunk
          chakra: {
            test: /[\\/]node_modules[\\/]@chakra-ui[\\/]/,
            name: 'chakra',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Web3 libraries chunk
          web3: {
            test: /[\\/]node_modules[\\/](viem|wagmi|@wagmi|@rainbow-me)[\\/]/,
            name: 'web3',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Animation libraries chunk
          animations: {
            test: /[\\/]node_modules[\\/](framer-motion|motion)[\\/]/,
            name: 'animations',
            priority: 25,
            reuseExistingChunk: true,
          },
          // Charts and visualization
          charts: {
            test: /[\\/]node_modules[\\/](recharts|d3|chart\.js)[\\/]/,
            name: 'charts',
            priority: 25,
            reuseExistingChunk: true,
          },
          // State management
          state: {
            test: /[\\/]node_modules[\\/](zustand|@tanstack\/react-query|immer)[\\/]/,
            name: 'state',
            priority: 25,
            reuseExistingChunk: true,
          },
          // Vendor chunks
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          // Additional charts libraries
          chartsExtended: {
            test: /[\\/]node_modules[\\/](d3-|plotly\.js)[\\/]/,
            name: 'charts-extended',
            priority: 20,
            reuseExistingChunk: true,
          },
        },
      };
    }

    // Optimize imports
    config.resolve.alias = {
      ...config.resolve.alias,
      // Tree shake lodash
      'lodash': 'lodash-es',
    };

    return config;
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          // Performance headers
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=60'
          },
        ],
      },
    ];
  },

  // Redirects for SEO
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // Enable compression
  compress: true,

  // Enable static optimization
  trailingSlash: false,

  // Power optimizations
  poweredByHeader: false,

  // Enable React strict mode
  reactStrictMode: true,

  // SWC minification is enabled by default in Next.js 15

  // Output configuration
  output: 'standalone',

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

export default nextConfig;

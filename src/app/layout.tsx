import { PerformanceMonitor } from '@/components/Performance/PerformanceMonitor'
import { RootProvider } from '@/providers/RootProvider'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

// Enhanced SEO Metadata
export const metadata: Metadata = {
  title: {
    default: 'ChainBridge DEX - Next-Generation Cross-Chain Decentralized Exchange',
    template: '%s | ChainBridge DEX'
  },
  description: 'Trade tokens across multiple blockchains with the best rates. ChainBridge DEX offers seamless cross-chain swaps, liquidity pools, and advanced DeFi features.',
  keywords: [
    'DeFi', 'DEX', 'Decentralized Exchange', 'Cross-chain', 'Token Swap',
    'Liquidity Pool', 'Ethereum', 'Polygon', 'Arbitrum', 'Optimism',
    'Web3', 'Cryptocurrency', 'Blockchain', 'DeFi Protocol'
  ],
  authors: [{ name: 'ChainBridge Team' }],
  creator: 'ChainBridge DEX',
  publisher: 'ChainBridge DEX',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://chainbridge-dex.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'ChainBridge DEX - Next-Generation Cross-Chain DEX',
    description: 'Trade tokens across multiple blockchains with the best rates. Seamless cross-chain swaps and advanced DeFi features.',
    siteName: 'ChainBridge DEX',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ChainBridge DEX - Cross-Chain Trading Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChainBridge DEX - Cross-Chain Trading Platform',
    description: 'Trade tokens across multiple blockchains with the best rates.',
    images: ['/twitter-image.png'],
    creator: '@ChainBridgeDEX',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a202c' },
  ],
  colorScheme: 'light dark',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.coingecko.com" />

        {/* Performance Hints */}
        <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />

        {/* Security Headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <RootProvider>
          {children}
          <PerformanceMonitor />
        </RootProvider>

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}

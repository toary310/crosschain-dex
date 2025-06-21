import { RootProvider } from '@/providers/RootProvider'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'ChainBridge DEX - Cross-Chain Decentralized Exchange',
  description: 'Trade cryptocurrencies seamlessly across multiple blockchains with ChainBridge DEX. Support for Ethereum, Polygon, Arbitrum, and Optimism.',
  keywords: ['DeFi', 'DEX', 'Cross-chain', 'Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Cryptocurrency'],
  authors: [{ name: 'ChainBridge DEX Team' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <RootProvider>
          {children}
        </RootProvider>
      </body>
    </html>
  )
}

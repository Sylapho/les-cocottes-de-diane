import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import ShopFooter from '@/components/shop/shop-footer'
import ShopAnalytics from '@/components/analytics/shop-analytics'
import {
  defaultSeoDescription,
  defaultSeoTitle,
  getAbsoluteShopUrl,
  getShopBaseUrl,
  isProductionShopIndexable,
  siteName,
} from '@/lib/seo'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: getShopBaseUrl(),
  title: {
    default: defaultSeoTitle,
    template: `%s | ${siteName}`,
  },
  description: defaultSeoDescription,
  alternates: {
    canonical: '/',
  },
  robots: isProductionShopIndexable()
    ? {
        index: true,
        follow: true,
      }
    : {
        index: false,
        follow: false,
      },
  openGraph: {
    type: 'website',
    url: getAbsoluteShopUrl('/'),
    siteName,
    title: defaultSeoTitle,
    description: defaultSeoDescription,
    locale: 'fr_FR',
    images: [
      {
        url: getAbsoluteShopUrl('/logo.svg'),
        width: 512,
        height: 512,
        alt: siteName,
      },
    ],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-icon.png', type: 'image/png', sizes: '180x180' }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable}`}>
      <body className="flex min-h-screen flex-col bg-stone-50 font-sans text-stone-900 antialiased">
        {children}
        <ShopFooter />
        <ShopAnalytics />
      </body>
    </html>
  )
}

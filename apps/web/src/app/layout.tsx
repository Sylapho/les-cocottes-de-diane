import type { Metadata } from 'next'
import { IBM_Plex_Sans } from 'next/font/google'
import AppShell from '@/components/layout/app-shell'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-ibm-plex-sans',
})

export const metadata: Metadata = {
  title: 'Les cocottes de Diane',
  description: 'Gestion interne Click & Collect',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={ibmPlexSans.variable}>
      <body suppressHydrationWarning>
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  )
}

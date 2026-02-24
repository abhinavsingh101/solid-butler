import type { Metadata, Viewport } from 'next'
import { PwaRegister } from '@/app/ui/pwa-register'
import './globals.css'

export const metadata: Metadata = {
  title: 'The House Butler',
  description: 'Household chore planning and intelligence for two members',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'The House Butler',
  },
}

export const viewport: Viewport = {
  themeColor: '#09090b',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}

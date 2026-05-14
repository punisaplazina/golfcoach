import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GolfCoach',
  description: 'Golf instruktor — upravljanje časovima',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GolfCoach',
  },
}

export const viewport: Viewport = {
  themeColor: '#1D9E75',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr" className="h-full">
      <body className="min-h-full antialiased bg-gray-50 text-gray-900 font-sans">
        {children}
      </body>
    </html>
  )
}

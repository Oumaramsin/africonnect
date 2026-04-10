import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import BottomNavWrapper from '../components/BottomNavWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AfriConnect',
  description: 'La plateforme de services pour la diaspora africaine',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1D6B45" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className}`}
        style={{ background: 'linear-gradient(135deg, #0F4A30 0%, #1D6B45 50%, #D4870A 100%)' }}>

        {/* Wrapper centrage parfait */}
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '0',
        }}>
          {/* Shell app */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '430px',
            minHeight: '100vh',
            background: '#FAF7F2',
            boxShadow: '0 0 60px rgba(0,0,0,0.3)',
          }}>
           <main style={{ paddingBottom: '100px' }}>
              {children}
            </main>
            <BottomNavWrapper />
          </div>
        </div>

      </body>
    </html>
  )
}
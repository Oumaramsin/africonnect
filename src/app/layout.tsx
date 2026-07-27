import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import BottomNavWrapper from '../components/BottomNavWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dabari',
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
      <body className={inter.className} style={{
        background: 'linear-gradient(135deg, #0F4A30 0%, #1D6B45 50%, #D4870A 100%)',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '430px',
          minHeight: '100vh',
          background: '#F3F4F6', /* Ancienne couleur crème: #FAF7F2 */
          boxShadow: '0 0 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: "100px" }}>
            {children}
          </main>
          <div style={{ width: '100%', maxWidth: '430px' }}>
            <BottomNavWrapper />
          </div>
        </div>
      </body>
    </html>
  )
}

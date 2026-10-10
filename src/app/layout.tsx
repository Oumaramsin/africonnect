import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import BottomNavWrapper from '../components/BottomNavWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://dabari.app'),
  title: {
    default: 'Dabari - Plateforme Diaspora Africaine | Traiteurs & GP Sécurisé',
    template: '%s | Dabari',
  },
  description:
    'La plateforme de référence pour la diaspora africaine : commandez auprès des meilleurs traiteurs traditionnels et expédiez vos colis en toute sécurité avec nos voyageurs GP certifiés.',
  keywords: [
    'Dabari',
    'traiteur africain',
    'cuisine africaine traditionnelle',
    'transport colis gp',
    'voyageur gp',
    'diaspora africaine',
    'plats africains',
    'gp senegal',
    'gp cote d ivoire',
    'gp cameroun',
    'livraison plats africains',
    'sequestre securise colis',
  ],
  authors: [{ name: 'Dabari' }],
  creator: 'Dabari',
  publisher: 'Dabari',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://dabari.app',
    siteName: 'Dabari',
    title: 'Dabari - Plateforme Diaspora Africaine | Traiteurs & GP Sécurisé',
    description:
      'Traiteurs d\'exception et transport de colis GP de confiance pour la diaspora africaine. Paiement sous séquestre sécurisé.',
    images: [
      {
        url: '/icon.png',
        width: 512,
        height: 512,
        alt: 'Dabari - Plateforme Diaspora Africaine',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dabari - Plateforme Diaspora Africaine',
    description:
      'Traiteurs d\'exception et transport de colis GP de confiance pour la diaspora africaine.',
    images: ['/icon.png'],
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
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="scroll-smooth min-h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1D6B45" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <Script
          id="iframe-buster"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `if (window.top !== window.self) { window.top.location.href = window.self.location.href; }`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://dabari.app/#organization',
                  name: 'Dabari',
                  url: 'https://dabari.app',
                  logo: 'https://dabari.app/icon.png',
                  description:
                    'La plateforme de référence pour la diaspora africaine : commandez auprès des meilleurs traiteurs traditionnels et expédiez vos colis en toute sécurité avec nos voyageurs GP certifiés.',
                  contactPoint: {
                    '@type': 'ContactPoint',
                    contactType: 'customer service',
                    availableLanguage: ['French', 'English'],
                  },
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://dabari.app/#website',
                  url: 'https://dabari.app',
                  name: 'Dabari',
                  publisher: {
                    '@id': 'https://dabari.app/#organization',
                  },
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: 'https://dabari.app/traiteur?search={search_term_string}',
                    'query-input': 'required name=search_term_string',
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${inter.className} min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased overflow-x-clip max-w-full selection:bg-[#1D6B45]/20 selection:text-[#1D6B45]`}
      >
        {/* Navigation supérieure (Desktop & Mobile) */}
        <Navbar />

        {/* Zone de contenu principale plein écran responsive */}
        <main className="flex-1 w-full max-w-full overflow-x-clip pb-20 md:pb-0">
          {children}
        </main>

        {/* Pied de page moderne Desktop */}
        <Footer />

        {/* Navigation basse sur mobile uniquement */}
        <BottomNavWrapper />
      </body>
    </html>
  )
}

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import BottomNavWrapper from '../components/BottomNavWrapper'
import KeyboardViewportHelper from '../components/KeyboardViewportHelper'
import NetworkStatusBanner from '../components/NetworkStatusBanner'
import { serializeJsonLd, jsonLdGraph } from '@/lib/jsonLd'
import {
  CONTACT_EMAIL,
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  THEME_COLOR,
  absoluteUrl,
} from '@/lib/site'

const inter = Inter({ subsets: ['latin'] })

// Pas de maximumScale : bloquer le zoom gêne l'accessibilité (WCAG 1.4.4)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: THEME_COLOR,
}

// Valeurs par défaut du site. Les pages publiques définissent leurs propres canonical et Open Graph
// (src/lib/site.ts) : aucune URL ici, sinon toutes les pages hériteraient de celle de l'accueil.
// Icônes : fichiers src/app/icon.png et src/app/apple-icon.png ; image de partage :
// src/app/opengraph-image.tsx ; manifeste : src/app/manifest.ts.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
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
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
  openGraph: {
    type: 'website',
    locale: SITE_LOCALE,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description:
      'Traiteurs d\'exception et transport de colis GP de confiance pour la diaspora africaine. Paiement sous séquestre sécurisé.',
  },
  twitter: {
    card: 'summary_large_image',
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
}

const organizationId = `${SITE_URL}/#organization`

const siteJsonLd = jsonLdGraph(
  {
    '@type': 'Organization',
    '@id': organizationId,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/icon.png'),
    description: SITE_DESCRIPTION,
    email: CONTACT_EMAIL,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: CONTACT_EMAIL,
      availableLanguage: ['French'],
    },
  },
  {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: 'fr-FR',
    publisher: { '@id': organizationId },
  },
)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="scroll-smooth min-h-full">
      <head>
        <Script
          id="iframe-buster"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `if (window.top !== window.self) { window.top.location.href = window.self.location.href; }`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(siteJsonLd) }}
        />
      </head>
      <body
        className={`${inter.className} min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased overflow-x-clip max-w-full selection:bg-[#1D6B45]/20 selection:text-[#1D6B45]`}
      >
        {/* Bandeau hors ligne / connexion rétablie */}
        <NetworkStatusBanner />

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

        {/* Gestion automatique du scroll viewport lors de l'ouverture du clavier mobile */}
        <KeyboardViewportHelper />
      </body>
    </html>
  )
}

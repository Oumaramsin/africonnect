'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', icon: '🏠', label: 'Accueil' },
  { href: '/traiteur', icon: '🍽️', label: 'Traiteur' },
  { href: '/gp', icon: '✈️', label: 'GP Colis' },
  { href: '/commandes', icon: '📦', label: 'Commandes' },
  { href: '/profil', icon: '👤', label: 'Profil' },
]

export default function BottomNav() {
  const pathname = usePathname()

  // Cache la nav sur les pages auth
  const hideOn = ['/login', '/register', '/reset-password']
  if (hideOn.includes(pathname)) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-100 z-50">
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all"
            >
              <span className={`text-xl transition-transform ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-xs font-medium transition-colors ${
                isActive ? 'text-[#1D6B45]' : 'text-gray-400'
              }`}>
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-[#1D6B45]" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
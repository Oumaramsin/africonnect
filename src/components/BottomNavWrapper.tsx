'use client'

import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'

export default function BottomNavWrapper() {
  const pathname = usePathname()
  const hideOn = ['/login', '/register']
  if (hideOn.some(p => pathname.startsWith(p))) return null
  return <BottomNav />
}
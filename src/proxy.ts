import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { withProxyHeaders } from '@/lib/apiProxy'

export function proxy(req: NextRequest) {
  // Requêtes vers l'API (relayées par la réécriture /api de next.config.ts) : ajout de l'IP du
  // visiteur et du secret partagé qui authentifie ce proxy auprès de l'API
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next({ request: { headers: withProxyHeaders(req.headers) } })
  }
  return NextResponse.next()
}

export const config = {
  // Uniquement les appels à l'API relayés par la réécriture /api : les pages et fichiers statiques
  // n'ont pas besoin du proxy (aucun traitement inutile, pages statiques servies directement).
  matcher: [
    // Envois de fichiers exclus : le corps des requêtes traitées ici est limité (4 Mo sur Vercel)
    // alors qu'une image peut atteindre 10 Mo ; ils passent directement par la réécriture.
    '/api/((?!upload/).*)',
  ],
}

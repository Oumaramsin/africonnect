import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1D6B45]">
              Bonjour, {profile?.full_name} 👋
            </h1>
            <p className="text-gray-500 mt-1 text-sm">{"Que cherches-tu aujourd'hui ?"}</p>
          </div>
          <Link href="/profil">
            <div className="w-10 h-10 rounded-full bg-[#1D6B45] flex items-center justify-center text-white font-bold text-sm">
              {profile?.full_name?.charAt(0).toUpperCase() || '?'}
            </div>
          </Link>
        </div>


        {/* Services */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/traiteur">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md hover:border-[#1D6B45]/20 transition-all">
              <div className="text-3xl mb-3">🍲</div>
              <div className="font-semibold text-gray-800">Traiteur</div>
              <div className="text-sm text-gray-500 mt-1">Plats africains à domicile</div>
            </div>
          </Link>

          <Link href="/gp">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md hover:border-[#D4870A]/20 transition-all">
              <div className="text-3xl mb-3">✈️</div>
              <div className="font-semibold text-gray-800">GP Colis</div>
              <div className="text-sm text-gray-500 mt-1">Envoie un colis au pays</div>
            </div>
          </Link>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 opacity-50">
            <div className="text-3xl mb-3">🛒</div>
            <div className="font-semibold text-gray-800">Épicerie</div>
            <div className="text-sm text-gray-400 mt-1">Bientôt disponible</div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 opacity-50">
            <div className="text-3xl mb-3">💇</div>
            <div className="font-semibold text-gray-800">Coiffure</div>
            <div className="text-sm text-gray-400 mt-1">Bientôt disponible</div>
          </div>
        </div>

        {/* Commandes récentes */}
        <div className="mt-8 bg-white rounded-2xl p-6 border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">Mes commandes récentes</h2>
          <p className="text-gray-400 text-sm text-center py-4">
            Aucune commande pour l&apos;instant
          </p>
        </div>

            {/* Raccourci commandes */}
          <Link href="/commandes" className="mt-2 block">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-all flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">📦</div>
                <div>
                  <div className="font-semibold text-gray-800 text-sm">Mes commandes</div>
                  <div className="text-xs text-gray-400">Traiteur & GP Colis</div>
                </div>
              </div>
              <span className="text-[#1D6B45] text-sm font-medium">Voir →</span>
            </div>
          </Link>
        

      </div>
    </div>
  )
}
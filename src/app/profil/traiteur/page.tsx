'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type Dish = {
  id: string
  name: string
  description: string
  price: number
  cuisine_type: string
  is_available: boolean
}

type TraiteurProfile = {
  id: string
  name: string
  bio: string
  cuisine_type: string[]
  delivery_zones: string[]
  is_active: boolean
}

const CUISINES = ['senegalais', 'ivoirien', 'camerounais', 'congolais', 'malien', 'guineen', 'burkinabe']
const ZONES = ['Paris', 'Saint-Denis', 'Aubervilliers', 'Montreuil', 'Créteil', 'Vitry-sur-Seine', 'Lyon', 'Marseille']

export default function TraiteurEspacePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [traiteur, setTraiteur] = useState<TraiteurProfile | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [view, setView] = useState<'profil' | 'plats' | 'nouveau_plat' | 'setup'>('profil')

  const [setupData, setSetupData] = useState({
    name: '', bio: '', cuisine_type: [] as string[], delivery_zones: [] as string[]
  })
  const [savingSetup, setSavingSetup] = useState(false)
  const [newDish, setNewDish] = useState({
    name: '', description: '', price: '', cuisine_type: '', is_available: true
  })
  const [savingDish, setSavingDish] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadTraiteur() }, [])

  async function loadTraiteur() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data: t } = await supabase
      .from('traiteurs').select('*')
      .eq('user_id', session.user.id).single()

    if (t) {
      setTraiteur(t)
      setView('profil')
      const { data: d } = await supabase
        .from('dishes').select('*')
        .eq('traiteur_id', t.id)
        .order('created_at', { ascending: false })
      setDishes(d || [])
    } else {
      setView('setup')
    }
    setLoading(false)
  }

  async function handleSetup() {
    if (!setupData.name || !setupData.bio || setupData.cuisine_type.length === 0) {
      setError('Remplis tous les champs obligatoires'); return
    }
    setSavingSetup(true); setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase.from('traiteurs').insert({
      user_id: session.user.id,
      name: setupData.name, bio: setupData.bio,
      cuisine_type: setupData.cuisine_type,
      delivery_zones: setupData.delivery_zones,
      is_active: true,
    }).select().single()

    if (error) { setError(error.message); setSavingSetup(false); return }
    await supabase.from('profiles').update({ role: 'traiteur' }).eq('id', session.user.id)
    setTraiteur(data); setView('profil'); setSavingSetup(false)
  }

  async function handleAddDish() {
    if (!newDish.name || !newDish.price || !newDish.cuisine_type) {
      setError('Remplis tous les champs obligatoires'); return
    }
    setSavingDish(true); setError(null)

    const { data, error } = await supabase.from('dishes').insert({
      traiteur_id: traiteur!.id,
      name: newDish.name, description: newDish.description,
      price: parseFloat(newDish.price),
      cuisine_type: newDish.cuisine_type,
      is_available: newDish.is_available,
    }).select().single()

    if (error) { setError(error.message); setSavingDish(false); return }
    setDishes(prev => [data, ...prev])
    setNewDish({ name: '', description: '', price: '', cuisine_type: '', is_available: true })
    setSuccess('Plat ajouté avec succès !')
    setTimeout(() => setSuccess(null), 3000)
    setView('plats'); setSavingDish(false)
  }

  async function toggleDish(dishId: string, current: boolean) {
    await supabase.from('dishes').update({ is_available: !current }).eq('id', dishId)
    setDishes(prev => prev.map(d => d.id === dishId ? { ...d, is_available: !current } : d))
  }

  async function deleteDish(dishId: string) {
    await supabase.from('dishes').delete().eq('id', dishId)
    setDishes(prev => prev.filter(d => d.id !== dishId))
  }

  const toggleCuisine = (c: string) => setSetupData(prev => ({
    ...prev,
    cuisine_type: prev.cuisine_type.includes(c)
      ? prev.cuisine_type.filter(x => x !== c)
      : [...prev.cuisine_type, c]
  }))

  const toggleZone = (z: string) => setSetupData(prev => ({
    ...prev,
    delivery_zones: prev.delivery_zones.includes(z)
      ? prev.delivery_zones.filter(x => x !== z)
      : [...prev.delivery_zones, z]
  }))

  if (loading) return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
      <div className="text-[#1D6B45]">Chargement...</div>
    </div>
  )

  if (view === 'setup') return (
    <div className="min-h-screen bg-[#FAF7F2] pb-36">
      <div className="bg-[#1D6B45] px-4 pt-12 pb-6">
        <Link href="/profil" className="text-white/70 text-sm mb-4 inline-block">← Profil</Link>
        <h1 className="text-2xl font-bold text-white">Devenir Traiteur</h1>
        <p className="text-white/70 text-sm mt-1">Configure ton espace traiteur</p>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Ton profil traiteur</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de ton activité *</label>
              <input type="text" placeholder="Ex: Chez Mariama, Les Saveurs d'Abidjan..."
                value={setupData.name}
                onChange={e => setSetupData(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Présentation *</label>
              <textarea placeholder="Décris ton activité, ta spécialité, ton expérience..."
                rows={3} value={setupData.bio}
                onChange={e => setSetupData(p => ({ ...p, bio: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cuisines proposées *</label>
              <div className="flex flex-wrap gap-2">
                {CUISINES.map(c => (
                  <button key={c} type="button" onClick={() => toggleCuisine(c)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                      setupData.cuisine_type.includes(c)
                        ? 'bg-[#1D6B45] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zones de livraison</label>
              <div className="flex flex-wrap gap-2">
                {ZONES.map(z => (
                  <button key={z} type="button" onClick={() => toggleZone(z)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      setupData.delivery_zones.includes(z)
                        ? 'bg-[#1D6B45] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>{z}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <button onClick={handleSetup} disabled={savingSetup}
          className="w-full bg-[#1D6B45] text-white py-4 rounded-2xl font-semibold hover:bg-[#0F4A30] transition-colors disabled:opacity-60">
          {savingSetup ? 'Création...' : 'Créer mon espace traiteur'}
        </button>
      </div>
    </div>
  )

  if (view === 'nouveau_plat') return (
    <div className="min-h-screen bg-[#FAF7F2] pb-36">
      <div className="bg-[#1D6B45] px-4 pt-12 pb-6">
        <button onClick={() => setView('plats')} className="text-white/70 text-sm mb-4 inline-block">← Mes plats</button>
        <h1 className="text-2xl font-bold text-white">Ajouter un plat</h1>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du plat *</label>
            <input type="text" placeholder="Ex: Thiéboudienne, Ndolé au bœuf..."
              value={newDish.name}
              onChange={e => setNewDish(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea placeholder="Décris les ingrédients, la quantité, les allergènes..."
              rows={2} value={newDish.description}
              onChange={e => setNewDish(p => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix (€) *</label>
              <input type="number" step="0.5" min="1" placeholder="Ex: 15"
                value={newDish.price}
                onChange={e => setNewDish(p => ({ ...p, price: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine *</label>
              <select value={newDish.cuisine_type}
                onChange={e => setNewDish(p => ({ ...p, cuisine_type: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white">
                <option value="">Choisir</option>
                {CUISINES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={newDish.is_available}
              onChange={e => setNewDish(p => ({ ...p, is_available: e.target.checked }))}
              className="w-4 h-4 accent-[#1D6B45]" />
            <span className="text-sm text-gray-700">Disponible immédiatement</span>
          </label>
        </div>
        <div style={{ position: 'relative', zIndex: 50 }}>
            <button onClick={handleAddDish} disabled={savingDish}
                className="w-full bg-[#1D6B45] text-white py-4 rounded-2xl font-semibold hover:bg-[#0F4A30] transition-colors disabled:opacity-60">
                {savingDish ? 'Ajout...' : 'Ajouter le plat'}
            </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-10">
      <div className="bg-[#1D6B45] px-4 pt-12 pb-6">
        <Link href="/profil" className="text-white/70 text-sm mb-4 inline-block">← Profil</Link>
        <h1 className="text-2xl font-bold text-white">{traiteur?.name}</h1>
        <p className="text-white/70 text-sm mt-1">Espace traiteur</p>
        <div className="flex gap-2 mt-4">
          {(['profil', 'plats'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                view === v ? 'bg-white text-[#1D6B45]' : 'bg-white/20 text-white'
              }`}>
              {v === 'profil' ? '👤 Mon profil' : `🍽️ Mes plats (${dishes.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        {success && (
          <div className="bg-[#E8F5E9] border border-[#1D6B45]/20 text-[#1D6B45] rounded-xl px-4 py-3 mb-4 text-sm font-medium">
            ✓ {success}
          </div>
        )}

        {view === 'profil' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Informations</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400">Nom</p>
                  <p className="text-gray-800 font-medium">{traiteur?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Présentation</p>
                  <p className="text-gray-600 text-sm">{traiteur?.bio}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Cuisines</p>
                  <div className="flex flex-wrap gap-1">
                    {traiteur?.cuisine_type?.map(c => (
                      <span key={c} className="bg-[#E8F5E9] text-[#1D6B45] text-xs px-2 py-1 rounded-full capitalize">{c}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Zones de livraison</p>
                  <div className="flex flex-wrap gap-1">
                    {traiteur?.delivery_zones?.map(z => (
                      <span key={z} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">📍 {z}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">Statut</p>
                  <p className="text-xs text-gray-400 mt-0.5">Visible sur la plateforme</p>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  traiteur?.is_active ? 'bg-[#E8F5E9] text-[#1D6B45]' : 'bg-gray-100 text-gray-500'
                }`}>
                  {traiteur?.is_active ? '✓ Actif' : 'Inactif'}
                </div>
              </div>
            </div>

            <Link href={`/traiteur/${traiteur?.id}`}
              className="block bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">👁️</span>
                  <span className="text-sm font-medium text-gray-700">Voir ma page publique</span>
                </div>
                <span className="text-gray-400">→</span>
              </div>
            </Link>
          </div>
        )}

        {view === 'plats' && (
          <div className="space-y-4">
            <button onClick={() => setView('nouveau_plat')}
              className="w-full bg-[#1D6B45] text-white py-3 rounded-2xl font-medium hover:bg-[#0F4A30] transition-colors flex items-center justify-center gap-2">
              <span className="text-lg">+</span> Ajouter un plat
            </button>

            {dishes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">🍽️</div>
                <p>Aucun plat encore</p>
                <p className="text-sm mt-1">Ajoute ton premier plat !</p>
              </div>
            ) : (
              dishes.map(dish => (
                <div key={dish.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{dish.name}</h3>
                      {dish.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{dish.description}</p>
                      )}
                    </div>
                    <span className="font-bold text-[#1D6B45] ml-3">{Number(dish.price).toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-400 capitalize bg-gray-100 px-2 py-1 rounded-full">
                      {dish.cuisine_type}
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleDish(dish.id, dish.is_available)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                          dish.is_available
                            ? 'bg-[#E8F5E9] text-[#1D6B45]'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                        {dish.is_available ? '✓ Disponible' : 'Indisponible'}
                      </button>
                      <button onClick={() => deleteDish(dish.id)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5 transition-colors">
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
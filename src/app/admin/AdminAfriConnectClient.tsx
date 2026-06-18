'use client'

import { useState} from 'react'
import { createClient } from '@/lib/supabase'
import { ChefHat, Plane, Users, Smartphone, MapPin, User, Trash2, Lightbulb, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

type Profile = {
  id: string
  full_name: string
  phone: string | null
  whatsapp: string | null
  email: string | null
  role: string
}

type Traiteur = {
  id: string
  user_id: string
  name: string
  bio: string
  cuisine_type: string[]
  delivery_zones: string[]
  whatsapp: string | null
  is_active: boolean
  created_at: string
  profiles?: { full_name: string; phone: string | null; whatsapp: string | null } | null
}

type GpListing = {
  id: string
  gp_id: string
  departure_city: string
  departure_country: string
  arrival_city: string
  arrival_country: string
  departure_date: string
  available_kg: number
  price_per_kg: number
  description: string | null
  is_active: boolean
  created_at: string
  profiles?: { full_name: string; phone: string | null; whatsapp: string | null } | null
}

type Tab = 'traiteurs' | 'gp' | 'utilisateurs'

const CUISINES = ['senegalais', 'ivoirien', 'camerounais', 'congolais', 'malien', 'guineen', 'burkinabe', 'togolais', 'beninois']
const ZONES = ['Paris', 'Saint-Denis', 'Aubervilliers', 'Montreuil', 'Créteil', 'Vitry-sur-Seine', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse']

export default function AdminAfriConnectClient({
  traiteurs: initialTraiteurs,
  gpListings: initialGpListings,
  profiles: initialProfiles,
}: {
  traiteurs: Traiteur[]
  gpListings: GpListing[]
  profiles: Profile[]
}) {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('traiteurs')
  const [traiteurs, setTraiteurs] = useState(initialTraiteurs)
  const [gpListings, setGpListings] = useState(initialGpListings)
  const [profiles, setProfiles] = useState(initialProfiles)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'liste' | 'nouveau'>('liste')
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  // Formulaire traiteur
  const [traiteurForm, setTraiteurForm] = useState({
    user_id: '',
    name: '',
    bio: '',
    cuisine_type: [] as string[],
    delivery_zones: [] as string[],
    whatsapp: '',
    is_active: true,
  })

  // Formulaire GP
  const [gpForm, setGpForm] = useState({
    gp_id: '',
    departure_city: '',
    departure_country: '',
    arrival_city: '',
    arrival_country: '',
    departure_date: '',
    available_kg: '',
    price_per_kg: '',
    description: '',
    is_active: true,
  })

  // Formulaire utilisateur
  const [userForm, setUserForm] = useState({
    full_name: '',
    phone: '',
    email: '',
  })

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 5000)
  }

  const toggleCuisine = (c: string) => {
    setTraiteurForm(prev => ({
      ...prev,
      cuisine_type: prev.cuisine_type.includes(c)
        ? prev.cuisine_type.filter(x => x !== c)
        : [...prev.cuisine_type, c]
    }))
  }

  const toggleZone = (z: string) => {
    setTraiteurForm(prev => ({
      ...prev,
      delivery_zones: prev.delivery_zones.includes(z)
        ? prev.delivery_zones.filter(x => x !== z)
        : [...prev.delivery_zones, z]
    }))
  }

  // ── CRÉER UTILISATEUR ──
  const handleCreateUser = async () => {
    if (!userForm.full_name || (!userForm.phone && !userForm.email)) {
      setError('Nom et téléphone ou email requis')
      return
    }
    setLoading(true)
    setError(null)
    setTempPassword(null)

    const authEmail = userForm.email ||
      `${userForm.phone.replace(/\+/g, '').replace(/\s/g, '')}@africonnect.app`

    const pwd = Math.random().toString(36).slice(-8) + 'A1!'

    const res = await fetch('/api/admin-create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: authEmail,
        password: pwd,
        full_name: userForm.full_name,
        phone: userForm.phone || null,
      })
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }

    const newProfile: Profile = {
      id: data.id,
      full_name: userForm.full_name,
      phone: userForm.phone || null,
      whatsapp: userForm.phone || null,
      email: authEmail,
      role: 'client'
    }

    setProfiles(prev => [newProfile, ...prev])
    setTempPassword(pwd)
    showSuccess(`Utilisateur ${userForm.full_name} créé !`)
    setUserForm({ full_name: '', phone: '', email: '' })
    setLoading(false)
  }

  // ── CRÉER TRAITEUR ──
  const handleCreateTraiteur = async () => {
    if (!traiteurForm.user_id || !traiteurForm.name || !traiteurForm.bio) {
      setError('Utilisateur, nom et bio requis')
      return
    }
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('traiteurs')
      .insert({
        user_id: traiteurForm.user_id,
        name: traiteurForm.name,
        bio: traiteurForm.bio,
        cuisine_type: traiteurForm.cuisine_type,
        delivery_zones: traiteurForm.delivery_zones,
        whatsapp: traiteurForm.whatsapp || null,
        is_active: traiteurForm.is_active,
      })
      .select('*, profiles(full_name, phone, whatsapp)')
      .single()

    if (error) { setError(error.message); setLoading(false); return }

    await supabase.from('profiles').update({ role: 'traiteur' }).eq('id', traiteurForm.user_id)

    setTraiteurs(prev => [data, ...prev])
    setTraiteurForm({
      user_id: '', name: '', bio: '',
      cuisine_type: [], delivery_zones: [],
      whatsapp: '', is_active: true,
    })
    showSuccess('Traiteur créé et publié !')
    setView('liste')
    setLoading(false)
  }

  // ── TOGGLE TRAITEUR ──
  const handleToggleTraiteur = async (id: string, current: boolean) => {
    await supabase.from('traiteurs').update({ is_active: !current }).eq('id', id)
    setTraiteurs(prev => prev.map(t => t.id === id ? { ...t, is_active: !current } : t))
    showSuccess(current ? 'Traiteur désactivé' : 'Traiteur activé')
  }

  // ── SUPPRIMER TRAITEUR ──
  const handleDeleteTraiteur = async (id: string) => {
    if (!confirm('Supprimer ce traiteur ?')) return
    await supabase.from('traiteurs').delete().eq('id', id)
    setTraiteurs(prev => prev.filter(t => t.id !== id))
    showSuccess('Traiteur supprimé')
  }

  // ── CRÉER GP ──
  const handleCreateGp = async () => {
    if (!gpForm.gp_id || !gpForm.departure_city || !gpForm.arrival_city || !gpForm.departure_date) {
      setError('Utilisateur, villes et date requis')
      return
    }
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('gp_listings')
      .insert({
        gp_id: gpForm.gp_id,
        departure_city: gpForm.departure_city,
        departure_country: gpForm.departure_country,
        arrival_city: gpForm.arrival_city,
        arrival_country: gpForm.arrival_country,
        departure_date: gpForm.departure_date,
        available_kg: parseFloat(gpForm.available_kg) || 0,
        price_per_kg: parseFloat(gpForm.price_per_kg) || 0,
        description: gpForm.description || null,
        is_active: gpForm.is_active,
      })
      .select('*, profiles(full_name, phone, whatsapp)')
      .single()

    if (error) { setError(error.message); setLoading(false); return }

    await supabase.from('profiles').update({ role: 'gp' }).eq('id', gpForm.gp_id)

    setGpListings(prev => [data, ...prev])
    setGpForm({
      gp_id: '', departure_city: '', departure_country: '',
      arrival_city: '', arrival_country: '',
      departure_date: '', available_kg: '', price_per_kg: '',
      description: '', is_active: true,
    })
    showSuccess('Annonce GP créée et publiée !')
    setView('liste')
    setLoading(false)
  }

  // ── TOGGLE GP ──
  const handleToggleGp = async (id: string, current: boolean) => {
    await supabase.from('gp_listings').update({ is_active: !current }).eq('id', id)
    setGpListings(prev => prev.map(g => g.id === id ? { ...g, is_active: !current } : g))
    showSuccess(current ? 'Annonce désactivée' : 'Annonce activée')
  }

  // ── SUPPRIMER GP ──
  const handleDeleteGp = async (id: string) => {
    if (!confirm('Supprimer cette annonce GP ?')) return
    await supabase.from('gp_listings').delete().eq('id', id)
    setGpListings(prev => prev.filter(g => g.id !== id))
    showSuccess('Annonce GP supprimée')
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric'
  })

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
  const selectClass = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-24">

      {/* Header */}
      <div className="bg-[#1D6B45] px-4 pt-12 pb-6">
        <Link href="/dashboard" className="text-white/70 text-sm mb-4 inline-block">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center"><ShieldCheck size={28} className="inline mr-2" /> Admin AfriConnect</h1>
        <p className="text-white/70 text-sm mt-1">Gérer les traiteurs, GP et utilisateurs</p>

        {/* Stats */}
        <div className="flex gap-3 mt-4">
          <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
            <p className="text-white font-bold text-lg">{traiteurs.length}</p>
            <p className="text-white/70 text-xs">Traiteurs</p>
          </div>
          <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
            <p className="text-white font-bold text-lg">{gpListings.length}</p>
            <p className="text-white/70 text-xs">Annonces GP</p>
          </div>
          <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
            <p className="text-white font-bold text-lg">{profiles.length}</p>
            <p className="text-white/70 text-xs">Utilisateurs</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {(['traiteurs', 'gp', 'utilisateurs'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setView('liste'); setError(null); setTempPassword(null) }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                tab === t ? 'bg-white text-[#1D6B45]' : 'bg-white/20 text-white'
              }`}
            >
              {t === 'traiteurs' ? <><ChefHat size={16} className="inline mr-1" /> Traiteurs</> : t === 'gp' ? <><Plane size={16} className="inline mr-1" /> GP Colis</> : <><Users size={16} className="inline mr-1" /> Utilisateurs</>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto">

        {/* Messages */}
        {success && (
          <div className="bg-[#E8F5E9] border border-[#1D6B45]/20 text-[#1D6B45] rounded-xl px-4 py-3 mb-4 text-sm font-medium">
            ✓ {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Mot de passe temporaire */}
        {tempPassword && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm font-semibold text-yellow-800 mb-1">🔑 Mot de passe temporaire</p>
            <p className="text-lg font-mono font-bold text-yellow-900">{tempPassword}</p>
            <p className="text-xs text-yellow-600 mt-1">
              Communique ce mot de passe à l&apos;utilisateur. Il pourra le changer depuis son profil.
            </p>
          </div>
        )}

        {/* ── ONGLET UTILISATEURS ── */}
        {tab === 'utilisateurs' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Créer un nouvel utilisateur</h2>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div>
                <label className={labelClass}>Nom complet *</label>
                <input
                  type="text"
                  placeholder="Ex: Aminata Diallo"
                  value={userForm.full_name}
                  onChange={e => setUserForm(p => ({ ...p, full_name: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Numéro de téléphone</label>
                <input
                  type="tel"
                  placeholder="+33612345678"
                  value={userForm.phone}
                  onChange={e => setUserForm(p => ({ ...p, phone: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Email (optionnel)</label>
                <input
                  type="email"
                  placeholder="aminata@email.com"
                  value={userForm.email}
                  onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-700">
                  ℹ️ Un mot de passe temporaire sera généré automatiquement.
                  Si pas d&apos;email, un email fictif sera créé avec le numéro de téléphone.
                </p>
              </div>

              <button
                onClick={handleCreateUser}
                disabled={loading}
                className="w-full bg-[#1D6B45] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#0F4A30] transition-colors disabled:opacity-60"
              >
                {loading ? 'Création...' : 'Créer le compte'}
              </button>
            </div>

            {/* Liste utilisateurs */}
            <h2 className="font-semibold text-gray-800 mt-6">
              Tous les utilisateurs ({profiles.length})
            </h2>
            <div className="space-y-2">
              {profiles.map(profile => (
                <div key={profile.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{profile.full_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {profile.phone || profile.email || 'Pas de contact'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    profile.role === 'admin' ? 'bg-red-100 text-red-600' :
                    profile.role === 'traiteur' ? 'bg-purple-100 text-purple-600' :
                    profile.role === 'gp' ? 'bg-orange-100 text-orange-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {profile.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ONGLET TRAITEURS ── */}
        {tab === 'traiteurs' && (
          <>
            {view === 'liste' && (
              <>
                <button
                  onClick={() => setView('nouveau')}
                  className="w-full bg-[#1D6B45] text-white py-3 rounded-2xl font-semibold text-sm hover:bg-[#0F4A30] transition-colors mb-4"
                >
                  + Ajouter un traiteur
                </button>

                {traiteurs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="flex justify-center mb-3"><ChefHat size={48} className="text-[#D4870A]" /></div>
                    <p>Aucun traiteur enregistré</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {traiteurs.map(traiteur => (
                      <div key={traiteur.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-gray-800">{traiteur.name}</p>
                            <p className="text-sm font-medium text-gray-700 mt-0.5">
                              <User size={16} className="inline mr-1 text-[#1D6B45]" /> {traiteur.profiles?.full_name || 'Utilisateur'}
                            </p>
                            {traiteur.whatsapp && (
                              <p className="text-sm font-medium text-gray-700 flex items-center mt-1"><Smartphone size={16} className="inline mr-1 text-[#1D6B45]" /> {traiteur.whatsapp}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            traiteur.is_active
                              ? 'bg-[#E8F5E9] text-[#1D6B45]'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {traiteur.is_active ? '✓ Actif' : 'Inactif'}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{traiteur.bio}</p>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {traiteur.cuisine_type?.map(c => (
                            <span key={c} className="text-xs bg-[#E8F5E9] text-[#1D6B45] px-2 py-0.5 rounded-full capitalize">
                              {c}
                            </span>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleTraiteur(traiteur.id, traiteur.is_active)}
                            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                              traiteur.is_active
                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                : 'bg-[#E8F5E9] text-[#1D6B45] hover:bg-[#D4EDDA]'
                            }`}
                          >
                            {traiteur.is_active ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            onClick={() => handleDeleteTraiteur(traiteur.id)}
                            className="px-4 py-2 rounded-xl text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={16} className="mx-auto" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {view === 'nouveau' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={() => setView('liste')} className="text-gray-500 text-sm hover:text-gray-700">
                    ← Retour
                  </button>
                  <h2 className="font-semibold text-gray-800">Nouveau traiteur</h2>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
                  <p className="text-xs text-blue-700">
                    <Lightbulb size={16} className="inline mr-1" /> Si l&apos;utilisateur n&apos;existe pas encore, crée-le d&apos;abord dans l&apos;onglet <strong>Utilisateurs</strong>.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">

                  <div>
                    <label className={labelClass}>Utilisateur *</label>
                    <select
                      value={traiteurForm.user_id}
                      onChange={e => setTraiteurForm(p => ({ ...p, user_id: e.target.value }))}
                      className={selectClass}
                    >
                      <option value="">Sélectionner un utilisateur</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} {p.phone ? `— ${p.phone}` : ''} {p.email && !p.email.includes('@africonnect.app') ? `— ${p.email}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Nom du traiteur *</label>
                    <input
                      type="text"
                      placeholder="Ex: Chez Mariama, Les Saveurs d'Abidjan..."
                      value={traiteurForm.name}
                      onChange={e => setTraiteurForm(p => ({ ...p, name: e.target.value }))}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Bio / Description *</label>
                    <textarea
                      rows={3}
                      placeholder="Décris l'activité, la spécialité, l'expérience..."
                      value={traiteurForm.bio}
                      onChange={e => setTraiteurForm(p => ({ ...p, bio: e.target.value }))}
                      className={inputClass + ' resize-none'}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Numéro WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="+33612345678"
                      value={traiteurForm.whatsapp}
                      onChange={e => setTraiteurForm(p => ({ ...p, whatsapp: e.target.value }))}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Cuisines proposées</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {CUISINES.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCuisine(c)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
                            traiteurForm.cuisine_type.includes(c)
                              ? 'bg-[#1D6B45] text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Zones de livraison</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {ZONES.map(z => (
                        <button
                          key={z}
                          type="button"
                          onClick={() => toggleZone(z)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            traiteurForm.delivery_zones.includes(z)
                              ? 'bg-[#1D6B45] text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {z}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={traiteurForm.is_active}
                      onChange={e => setTraiteurForm(p => ({ ...p, is_active: e.target.checked }))}
                      className="w-4 h-4 accent-[#1D6B45]"
                    />
                    <span className="text-sm text-gray-700">Publier immédiatement</span>
                  </label>

                  <button
                    onClick={handleCreateTraiteur}
                    disabled={loading}
                    className="w-full bg-[#1D6B45] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#0F4A30] transition-colors disabled:opacity-60"
                  >
                    {loading ? 'Création...' : 'Créer et publier le traiteur'}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ── ONGLET GP ── */}
        {tab === 'gp' && (
          <>
            {view === 'liste' && (
              <>
                <button
                  onClick={() => setView('nouveau')}
                  className="w-full bg-[#D4870A] text-white py-3 rounded-2xl font-semibold text-sm hover:bg-[#B8740A] transition-colors mb-4"
                >
                  + Publier une annonce GP
                </button>

                {gpListings.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="flex justify-center mb-3"><Plane size={48} className="text-[#1D6B45]" /></div>
                    <p>Aucune annonce GP</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {gpListings.map(gp => (
                      <div key={gp.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-gray-800">
                              <Plane size={16} className="inline mr-1" /> {gp.departure_city} ({gp.departure_country}) → {gp.arrival_city} ({gp.arrival_country})
                            </p>
                            <p className="text-sm font-medium text-gray-700 mt-0.5">
                              <User size={16} className="inline mr-1 text-[#1D6B45]" /> {gp.profiles?.full_name || 'Utilisateur'}
                            </p>
                            {gp.profiles?.whatsapp && (
                              <p className="text-sm font-medium text-gray-700 flex items-center mt-1"><Smartphone size={16} className="inline mr-1 text-[#1D6B45]" /> {gp.profiles.whatsapp}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            gp.is_active
                              ? 'bg-[#FFF3E0] text-[#D4870A]'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {gp.is_active ? '✓ Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3 space-y-1 mb-3">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span>📅</span><span>Départ : {formatDate(gp.departure_date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span>⚖️</span><span>{gp.available_kg} kg disponibles</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span>💰</span><span>{gp.price_per_kg} €/kg</span>
                          </div>
                          {gp.description && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span>📝</span><span>{gp.description}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleGp(gp.id, gp.is_active)}
                            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                              gp.is_active
                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                : 'bg-[#FFF3E0] text-[#D4870A] hover:bg-[#FFE0B2]'
                            }`}
                          >
                            {gp.is_active ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            onClick={() => handleDeleteGp(gp.id)}
                            className="px-4 py-2 rounded-xl text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={16} className="mx-auto" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {view === 'nouveau' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={() => setView('liste')} className="text-gray-500 text-sm hover:text-gray-700">
                    ← Retour
                  </button>
                  <h2 className="font-semibold text-gray-800">Nouvelle annonce GP</h2>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
                  <p className="text-xs text-blue-700">
                    <Lightbulb size={16} className="inline mr-1" /> Si le GP n&apos;existe pas encore, crée-le d&apos;abord dans l&apos;onglet <strong>Utilisateurs</strong>.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">

                  <div>
                    <label className={labelClass}>GP (Utilisateur) *</label>
                    <select
                      value={gpForm.gp_id}
                      onChange={e => setGpForm(p => ({ ...p, gp_id: e.target.value }))}
                      className={selectClass}
                    >
                      <option value="">Sélectionner un utilisateur</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} {p.phone ? `— ${p.phone}` : ''} {p.email && !p.email.includes('@africonnect.app') ? `— ${p.email}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Ville de départ *</label>
                      <input
                        type="text"
                        placeholder="Ex: Paris"
                        value={gpForm.departure_city}
                        onChange={e => setGpForm(p => ({ ...p, departure_city: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Pays de départ *</label>
                      <input
                        type="text"
                        placeholder="Ex: France"
                        value={gpForm.departure_country}
                        onChange={e => setGpForm(p => ({ ...p, departure_country: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>{"Ville d'arrivée *"}</label>
                      <input
                        type="text"
                        placeholder="Ex: Dakar"
                        value={gpForm.arrival_city}
                        onChange={e => setGpForm(p => ({ ...p, arrival_city: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{"Pays d'arrivée *"}</label>
                      <input
                        type="text"
                        placeholder="Ex: Sénégal"
                        value={gpForm.arrival_country}
                        onChange={e => setGpForm(p => ({ ...p, arrival_country: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Date de départ *</label>
                    <input
                      type="date"
                      value={gpForm.departure_date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setGpForm(p => ({ ...p, departure_date: e.target.value }))}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Kg disponibles *</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="Ex: 20"
                        value={gpForm.available_kg}
                        onChange={e => setGpForm(p => ({ ...p, available_kg: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Prix par kg (€) *</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="Ex: 8"
                        value={gpForm.price_per_kg}
                        onChange={e => setGpForm(p => ({ ...p, price_per_kg: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Description</label>
                    <textarea
                      rows={3}
                      placeholder="Informations supplémentaires, restrictions..."
                      value={gpForm.description}
                      onChange={e => setGpForm(p => ({ ...p, description: e.target.value }))}
                      className={inputClass + ' resize-none'}
                    />
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gpForm.is_active}
                      onChange={e => setGpForm(p => ({ ...p, is_active: e.target.checked }))}
                      className="w-4 h-4 accent-[#1D6B45]"
                    />
                    <span className="text-sm text-gray-700">Publier immédiatement</span>
                  </label>

                  <button
                    onClick={handleCreateGp}
                    disabled={loading}
                    className="w-full bg-[#D4870A] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#B8740A] transition-colors disabled:opacity-60"
                  >
                    {loading ? 'Publication...' : "Publier l'annonce GP"}
                  </button>
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
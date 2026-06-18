'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Plane, PlaneTakeoff, Package, MapPin, Lock } from "lucide-react";

const schema = z.object({
  departure_city: z.string().min(2, 'Ville de départ requise'),
  departure_country: z.string().min(2, 'Pays requis'),
  arrival_city: z.string().min(2, 'Ville d\'arrivée requise'),
  arrival_country: z.string().min(2, 'Pays requis'),
  departure_date: z.string().min(1, 'Date requise'),
  available_kg: z.number().min(0.5, 'Minimum 0.5 kg').max(30, 'Maximum 30 kg'),
  price_per_kg: z.number().min(1, 'Tarif requis'),
  flight_type: z.enum(['direct', 'escale']),
  pickup_address: z.string().optional(),
  pickup_city: z.string().optional(),
  description: z.string().min(10, 'Description requise (minimum 10 caractères)'),
})

type FormData = z.infer<typeof schema>

const COUNTRIES_FR = [
  'France', 'Belgique', 'Suisse', 'Canada'
]

const COUNTRIES_AF = [
  'Sénégal', "Côte d'Ivoire", 'Cameroun', 'Congo',
  'Mali', 'Guinée', 'Burkina Faso', 'Gabon',
  'Madagascar', 'Maroc', 'Algérie', 'Tunisie',
]

const CITIES_FR = [
  'Paris', 'Lyon', 'Marseille', 'Bordeaux',
  'Toulouse', 'Lille', 'Bruxelles', 'Genève'
]

export default function NouvelleAnnoncePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [success, setSuccess] = useState(false)

   useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if(!session){
        router.push('/login')
      }else{
        setIsLoggedIn(true)
      }
    };
    load();
  })

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      departure_country: 'France',
      flight_type: 'direct',
      available_kg: 5,
      price_per_kg: 8,
    }
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { error } = await supabase
      .from('gp_listings')
      .insert({
        gp_id: session.user.id,
        departure_city: data.departure_city,
        departure_country: data.departure_country,
        arrival_city: data.arrival_city,
        arrival_country: data.arrival_country,
        departure_date: data.departure_date,
        available_kg: data.available_kg,
        price_per_kg: data.price_per_kg,
        flight_type: data.flight_type,
        pickup_address: data.pickup_address,
        pickup_city: data.pickup_city,
        description: data.description,
        is_active: true,
      })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
  }

  if (success) return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-4"><Plane size={64} className="text-[#1D6B45]" /></div>
        <h2 className="text-2xl font-bold text-[#1D6B45] mb-2">
          Annonce publiée !
        </h2>
        <p className="text-gray-500 mb-8">
          Ton annonce est en ligne. Les expéditeurs peuvent maintenant te contacter.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/gp"
            className="bg-[#1D6B45] text-white px-8 py-3 rounded-xl font-medium hover:bg-[#0F4A30] transition-colors">
            Voir les annonces
          </Link>
          <Link href="/dashboard"
            className="text-[#1D6B45] font-medium text-sm hover:underline">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-[#1D6B45] text-lg font-medium">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-36">

      {/* Header */}
      <div className="bg-[#1D6B45] px-4 pt-12 pb-6">
        <Link href="/gp" className="text-white/70 text-sm mb-4 inline-block">
          ← Retour
        </Link>
        <h1 className="text-2xl font-bold text-white">Publier une annonce</h1>
        <p className="text-white/70 text-sm mt-1">
          Tu voyages ? Propose tes kilos disponibles
        </p>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Route */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center"><PlaneTakeoff size={16} className="inline mr-1" /> Itinéraire</h2>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ville de départ</label>
                <select
                  {...register('departure_city')}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                >
                  <option value="">Choisir</option>
                  {CITIES_FR.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.departure_city && (
                  <p className="text-red-500 text-xs mt-1">{errors.departure_city.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Pays de départ</label>
                <select
                  {...register('departure_country')}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                >
                  {COUNTRIES_FR.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-center my-2">
              <span className="text-[#1D6B45] text-xl font-bold">↓</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ville d'arrivée</label>
                <input
                  {...register('arrival_city')}
                  type="text"
                  placeholder="Ex: Dakar"
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
                {errors.arrival_city && (
                  <p className="text-red-500 text-xs mt-1">{errors.arrival_city.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Pays d'arrivée</label>
                <select
                  {...register('arrival_country')}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                >
                  <option value="">Choisir</option>
                  {COUNTRIES_AF.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.arrival_country && (
                  <p className="text-red-500 text-xs mt-1">{errors.arrival_country.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Vol */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center"><Plane size={16} className="inline mr-1" /> Détails du vol</h2>

            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">Date de départ</label>
              <input
                {...register('departure_date')}
                type="date"
                min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
              />
              {errors.departure_date && (
                <p className="text-red-500 text-xs mt-1">{errors.departure_date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Type de vol</label>
              <div className="grid grid-cols-2 gap-3">
                {(['direct', 'escale'] as const).map(type => (
                  <label key={type} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-[#1D6B45] transition-colors">
                    <input
                      {...register('flight_type')}
                      type="radio"
                      value={type}
                      className="accent-[#1D6B45]"
                    />
                    <span className="text-sm text-gray-700 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Colis */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center"><Package size={16} className="inline mr-1" /> Capacité & tarif</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Kilos disponibles</label>
                <input
                  {...register('available_kg', { valueAsNumber: true })}
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="30"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
                {errors.available_kg && (
                  <p className="text-red-500 text-xs mt-1">{errors.available_kg.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Prix par kg (€)</label>
                <input
                  {...register('price_per_kg', { valueAsNumber: true })}
                  type="number"
                  step="0.5"
                  min="1"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
                {errors.price_per_kg && (
                  <p className="text-red-500 text-xs mt-1">{errors.price_per_kg.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Point de retrait */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-1 flex items-center"><MapPin size={16} className="inline mr-1" /> Point de remise</h2>
            <p className="text-xs text-gray-600 mb-4">
              Où les expéditeurs peuvent déposer leur colis
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Quartier / arrondissement
                </label>
                <input
                  {...register('pickup_city')}
                  type="text"
                  placeholder="Ex: Paris 10e, Aubervilliers..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Adresse précise
                  <span className="text-gray-600 ml-1">(optionnel — partagée après accord)</span>
                </label>
                <input
                  {...register('pickup_address')}
                  type="text"
                  placeholder="Ex: Gare du Nord, Paris"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-1">✍️ Présentation</h2>
            <p className="text-xs text-gray-600 mb-4">
              Décris-toi et tes conditions pour rassurer les expéditeurs
            </p>
            <textarea
              {...register('description')}
              placeholder="Ex: Voyageur régulier Paris-Dakar depuis 3 ans. Sérieux et ponctuel. Colis remis en main propre à destination. Pas de liquides ni produits périssables."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none"
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Info sécurité */}
          <div className="bg-[#FFF8E1] border border-[#D4870A]/20 rounded-2xl p-4">
            <p className="text-sm font-medium text-[#D4870A] mb-1"><Lock size={16} className="inline mr-2" /> Paiement sécurisé</p>
            <p className="text-xs text-gray-600">
              Le paiement des expéditeurs est bloqué jusqu'à confirmation de livraison. Tu es protégé à chaque trajet.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1D6B45] text-white py-4 rounded-2xl font-semibold text-base hover:bg-[#0F4A30] transition-colors disabled:opacity-60"
          >
            {loading ? 'Publication...' : 'Publier mon annonce'}
          </button>

        </form>
      </div>
    </div>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getGpListing, createGpRequest, getFlag, type GpListing } from '@/lib/api/gp'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'

const schema = z.object({
  weight_kg: z.number().min(0.1, 'Poids requis').max(30, 'Maximum 30kg'),
  content_desc: z.string().min(3, 'Description requise'),
  declared_value: z.number().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function GpDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [listing, setListing] = useState<GpListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { weight_kg: 1 }
  })

  const weightKg = watch('weight_kg')

  useEffect(() => {
    getGpListing(id as string)
      .then(setListing)
      .finally(() => setLoading(false))
  }, [id])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  const onSubmit = async (data: FormData) => {
    if (!listing) return
    setSubmitting(true)
    setError(null)

    try {
      await createGpRequest({
        listing_id: listing.id,
        gp_id: listing.gp_id,
        weight_kg: data.weight_kg,
        content_desc: data.content_desc,
        declared_value: data.declared_value,
        notes: data.notes,
        price_per_kg: listing.price_per_kg,
      })
      setSuccess(true)
    } catch (_e) {
      setError('Une erreur est survenue. Réessaie.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
      <div className="text-[#1D6B45]">Chargement...</div>
    </div>
  )

  if (!listing) return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
      <div className="text-gray-500">Annonce introuvable</div>
    </div>
  )

  if (success) return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">📦</div>
        <h2 className="text-2xl font-bold text-[#1D6B45] mb-2">
          Demande envoyée !
        </h2>
        <p className="text-gray-500 mb-2">
          Le GP a reçu ta demande et va te répondre très vite.
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Tu peux suivre la conversation dans ta messagerie.
        </p>
        <Link
          href="/dashboard"
          className="bg-[#1D6B45] text-white px-8 py-3 rounded-xl font-medium hover:bg-[#0F4A30] transition-colors"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )

  const estimatedTotal = (weightKg || 0) * listing.price_per_kg

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-32">

      {/* Header */}
      <div className="bg-[#1D6B45] px-4 pt-12 pb-8">
        <Link href="/gp" className="text-white/70 text-sm mb-4 inline-block">
          ← Retour
        </Link>

        {/* Route */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl font-bold text-white">
            {getFlag(listing.departure_country)} {listing.departure_city}
          </span>
          <span className="text-white/60 text-2xl">→</span>
          <span className="text-2xl font-bold text-white">
            {getFlag(listing.arrival_country)} {listing.arrival_city}
          </span>
        </div>

        <p className="text-white/70 text-sm">
          ✈️ {formatDate(listing.departure_date)}
        </p>

        {/* Stats */}
        <div className="flex gap-4 mt-4">
          <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
            <p className="text-white font-bold">{listing.available_kg} kg</p>
            <p className="text-white/60 text-xs">Disponible</p>
          </div>
          <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
            <p className="text-white font-bold">{listing.price_per_kg} €/kg</p>
            <p className="text-white/60 text-xs">Tarif</p>
          </div>
          <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
            <p className="text-white font-bold capitalize">{listing.flight_type}</p>
            <p className="text-white/60 text-xs">Vol</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">

        {/* Description GP */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">À propos du GP</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{listing.description}</p>

          {listing.review_count > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-yellow-500">★</span>
              <span className="font-semibold text-gray-800">{listing.rating}</span>
              <span className="text-gray-400 text-sm">({listing.review_count} avis)</span>
            </div>
          )}
        </div>

        {/* Info sécurité */}
        <div className="bg-[#FFF8E1] border border-[#D4870A]/20 rounded-2xl p-4">
          <h3 className="font-medium text-[#D4870A] mb-2">🔒 Paiement sécurisé</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Ton paiement est bloqué jusqu'à livraison confirmée</li>
            <li>• GP vérifié par AfriConnect</li>
            <li>• Support disponible en cas de litige</li>
          </ul>
        </div>

        {/* Formulaire demande */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-[#1D6B45] text-white py-4 rounded-2xl font-semibold hover:bg-[#0F4A30] transition-colors"
          >
            Envoyer un colis avec ce GP
          </button>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Détails du colis</h2>

              {/* Poids */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Poids (kg)
                </label>
                <input
                  {...register('weight_kg', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={listing.available_kg}
                  placeholder="Ex: 2.5"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
                {errors.weight_kg && (
                  <p className="text-red-500 text-xs mt-1">{errors.weight_kg.message}</p>
                )}
                <p className="text-gray-400 text-xs mt-1">
                  Maximum {listing.available_kg} kg disponible
                </p>
              </div>

              {/* Contenu */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contenu du colis
                </label>
                <input
                  {...register('content_desc')}
                  type="text"
                  placeholder="Ex: Vêtements, médicaments, documents..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
                {errors.content_desc && (
                  <p className="text-red-500 text-xs mt-1">{errors.content_desc.message}</p>
                )}
              </div>

              {/* Valeur déclarée */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valeur déclarée (€)
                  <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
                </label>
                <input
                  {...register('declared_value', { valueAsNumber: true })}
                  type="number"
                  placeholder="Ex: 50"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                  <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
                </label>
                <textarea
                  {...register('notes')}
                  placeholder="Instructions particulières pour le GP..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none"
                />
              </div>
            </div>

            {/* Estimation coût */}
            {estimatedTotal > 0 && (
              <div className="bg-[#E8F5E9] rounded-2xl p-4 flex justify-between items-center">
                <span className="text-[#1D6B45] font-medium">Coût estimé</span>
                <span className="text-[#1D6B45] font-bold text-lg">
                  {estimatedTotal.toFixed(2)} €
                </span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-4 rounded-2xl font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-2 flex-1 bg-[#1D6B45] text-white py-4 rounded-2xl font-semibold hover:bg-[#0F4A30] transition-colors disabled:opacity-60"
              >
                {submitting ? 'Envoi...' : 'Envoyer la demande'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  )
}
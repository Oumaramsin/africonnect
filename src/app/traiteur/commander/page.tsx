'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createOrder, type CartItem } from '@/lib/api/traiteur'
import Link from 'next/link'

const schema = z.object({
  delivery_type: z.enum(['delivery', 'pickup']),
  delivery_address: z.string().optional(),
  delivery_date: z.string().min(1, 'Date requise'),
  delivery_time: z.string().min(1, 'Heure requise'),
  notes: z.string().optional(),
}).refine(data => {
  if (data.delivery_type === 'delivery' && !data.delivery_address) {
    return false
  }
  return true
}, {
  message: 'Adresse de livraison requise',
  path: ['delivery_address']
})

type FormData = z.infer<typeof schema>

export default function CheckoutPage() {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { delivery_type: 'delivery' }
  })

  const deliveryType = watch('delivery_type')

  useEffect(() => {
    const stored = localStorage.getItem('africonnect_cart')
    if (stored) {
      setCart(JSON.parse(stored))
    } else {
      router.push('/traiteur')
    }
  }, [router])

  const total = cart.reduce((sum, i) => sum + i.dish.price * i.quantity, 0)
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0)

  const onSubmit = async (data: FormData) => {
    if (cart.length === 0) return
    setLoading(true)
    setError(null)

    try {
      await createOrder({
        traiteur_id: cart[0].traiteur_id,
        items: cart,
        delivery_address: data.delivery_address || 'Retrait sur place',
        delivery_date: `${data.delivery_date}T${data.delivery_time}`,
        delivery_type: data.delivery_type,
        notes: data.notes,
      })

      localStorage.removeItem('africonnect_cart')
      setSuccess(true)
      } catch (e: any) {
        setError(e?.message || 'Une erreur est survenue. Réessaie.')
      } finally {
        setLoading(false)
      }
    }

  // Page succès
  if (success) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-[#1D6B45] mb-2">
            Commande confirmée !
          </h2>
          <p className="text-gray-500 mb-8">
            Le traiteur a reçu ta commande et va la confirmer très vite.
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
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-32">

      {/* Header */}
      <div className="bg-[#1D6B45] px-4 pt-12 pb-6">
        <button
          onClick={() => router.back()}
          className="text-white/70 text-sm mb-4 inline-block"
        >
          ← Retour
        </button>
        <h1 className="text-2xl font-bold text-white">Ma commande</h1>
        <p className="text-white/70 text-sm mt-1">
          {cart[0]?.traiteur_name || 'Traiteur'}
        </p>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">

        {/* Récapitulatif panier */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">
            Récapitulatif · {totalItems} article{totalItems > 1 ? 's' : ''}
          </h2>
          <div className="space-y-3">
            {cart.map(item => (
              <div key={item.dish.id} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="bg-[#E8F5E9] text-[#1D6B45] text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                    {item.quantity}
                  </span>
                  <span className="text-gray-700 text-sm">{item.dish.name}</span>
                </div>
                <span className="text-gray-800 font-medium text-sm">
                  {(item.dish.price * item.quantity).toFixed(2)} €
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between items-center">
            <span className="font-semibold text-gray-800">Total</span>
            <span className="font-bold text-[#1D6B45] text-lg">{total.toFixed(2)} €</span>
          </div>
        </div>

        {/* Formulaire livraison */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Mode de livraison */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Mode de réception</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                deliveryType === 'delivery'
                  ? 'border-[#1D6B45] bg-[#E8F5E9]'
                  : 'border-gray-200'
              }`}>
                <input
                  {...register('delivery_type')}
                  type="radio"
                  value="delivery"
                  className="hidden"
                />
                <span className="text-2xl">🚗</span>
                <span className="text-sm font-medium text-gray-700">Livraison</span>
              </label>

              <label className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                deliveryType === 'pickup'
                  ? 'border-[#1D6B45] bg-[#E8F5E9]'
                  : 'border-gray-200'
              }`}>
                <input
                  {...register('delivery_type')}
                  type="radio"
                  value="pickup"
                  className="hidden"
                />
                <span className="text-2xl">🏠</span>
                <span className="text-sm font-medium text-gray-700">Retrait</span>
              </label>
            </div>
          </div>

          {/* Adresse (si livraison) */}
          {deliveryType === 'delivery' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Adresse de livraison</h2>
              <input
                {...register('delivery_address')}
                type="text"
                placeholder="12 rue de la Paix, 75001 Paris"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
              />
              {errors.delivery_address && (
                <p className="text-red-500 text-xs mt-1">{errors.delivery_address.message}</p>
              )}
            </div>
          )}

          {/* Date et heure */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Date et heure souhaitées</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <input
                  {...register('delivery_date')}
                  type="date"
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
                {errors.delivery_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.delivery_date.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Heure</label>
                <input
                  {...register('delivery_time')}
                  type="time"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
                {errors.delivery_time && (
                  <p className="text-red-500 text-xs mt-1">{errors.delivery_time.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">
              Notes pour le traiteur
              <span className="text-gray-400 font-normal text-sm ml-1">(optionnel)</span>
            </h2>
            <textarea
              {...register('notes')}
              placeholder="Allergies, préférences, instructions particulières..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Bouton commander */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1D6B45] text-white py-4 rounded-2xl font-semibold text-base hover:bg-[#0F4A30] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              'Envoi de la commande...'
            ) : (
              <>
                <span>Confirmer la commande</span>
                <span className="font-bold">{total.toFixed(2)} €</span>
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  )
}
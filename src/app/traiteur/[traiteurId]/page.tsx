'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTraiteur, type Traiteur, type Dish, type CartItem } from '@/lib/api/traiteur'
import Link from 'next/link'
import CommandeForm from './CommandeForm'

export default function TraiteurDetailPage() {
  const { traiteurId: id } = useParams()
  const router = useRouter()
  const [traiteur, setTraiteur] = useState<Traiteur | null>(null)
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])

  useEffect(() => {
    getTraiteur(id as string)
      .then(setTraiteur)
      .finally(() => setLoading(false))
  }, [id])

  const addToCart = (dish: Dish) => {
    setCart(prev => {
      const existing = prev.find(i => i.dish.id === dish.id)
      if (existing) {
        return prev.map(i => i.dish.id === dish.id
          ? { ...i, quantity: i.quantity + 1 }
          : i
        )
      }
      return [...prev, { dish, quantity: 1, traiteur_id: traiteur!.id, traiteur_name: traiteur!.name }]
    })
  }

  const removeFromCart = (dishId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.dish.id === dishId)
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.dish.id === dishId
          ? { ...i, quantity: i.quantity - 1 }
          : i
        )
      }
      return prev.filter(i => i.dish.id !== dishId)
    })
  }

  const getQty = (dishId: string) => cart.find(i => i.dish.id === dishId)?.quantity || 0
  const total = cart.reduce((sum, i) => sum + i.dish.price * i.quantity, 0)
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0)

  const goToCheckout = () => {
    localStorage.setItem('africonnect_cart', JSON.stringify(cart))
    router.push('/traiteur/commander')
  }

  if (loading) return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
      <div className="text-[#1D6B45] text-lg">Chargement...</div>
    </div>
  )

  if (!traiteur) return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
      <div className="text-gray-500">Traiteur introuvable</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-32">

      {/* Header */}
      <div className="bg-[#1D6B45] px-4 pt-12 pb-8">
        <Link href="/traiteur" className="text-white/70 text-sm mb-4 inline-block">
          ← Retour
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{traiteur.name}</h1>
            <p className="text-white/70 text-sm mt-1 max-w-xs">{traiteur.bio}</p>
          </div>
          <div className="bg-white/20 rounded-xl px-3 py-2 text-center">
            <div className="text-yellow-300 text-lg">★</div>
            <div className="text-white font-bold text-lg">{traiteur.rating}</div>
            <div className="text-white/60 text-xs">{traiteur.review_count} avis</div>
          </div>
         
        </div>

        {/* Zones de livraison */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {traiteur.delivery_zones?.map(zone => (
            <span key={zone} className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">
              📍 {zone}
            </span>
          ))}
        </div>

          

      </div>



      {/* Menu */}
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <h2 className="font-semibold text-gray-700 mb-4">
          Menu · {traiteur.dishes?.length || 0} plats
        </h2>

        <div className="space-y-3">
          {traiteur.dishes?.filter(d => d.is_available).map(dish => {
            const qty = getQty(dish.id)
            return (
              <div key={dish.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">

                {/* Emoji placeholder */}
                <div className="w-20 h-20 rounded-xl bg-[#FFF3E0] flex items-center justify-center text-3xl flex-shrink-0">
                  🍽️
                </div>

                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{dish.name}</h3>
                  <p className="text-gray-500 text-sm mt-1 line-clamp-2">{dish.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[#1D6B45] font-semibold">{dish.price.toFixed(2)} €</span>

                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(dish)}
                        className="bg-[#1D6B45] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#0F4A30] transition-colors"
                      >
                        + Ajouter
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => removeFromCart(dish.id)}
                          className="w-8 h-8 rounded-full border-2 border-[#1D6B45] text-[#1D6B45] font-bold flex items-center justify-center hover:bg-[#E8F5E9] transition-colors"
                        >
                          −
                        </button>
                        <span className="font-semibold text-gray-800 w-4 text-center">{qty}</span>
                        <button
                          onClick={() => addToCart(dish)}
                          className="w-8 h-8 rounded-full bg-[#1D6B45] text-white font-bold flex items-center justify-center hover:bg-[#0F4A30] transition-colors"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

       {/* Formulaire de commande */}
      <div className="px-4 max-w-2xl mx-auto mt-4">
        <CommandeForm
          traiteurId={traiteur.id}
          traiteurName={traiteur.name}
          whatsapp={traiteur.whatsapp}
        />
      </div>

    {/* Panier flottant */}
      {totalItems > 0 && (
        <div className="px-4 py-4">
          <button
            onClick={goToCheckout}
            className="w-full bg-[#1D6B45] text-white py-4 rounded-2xl flex items-center justify-between px-6 shadow-lg hover:bg-[#0F4A30] transition-colors"
          >
            <span className="bg-white/20 text-white text-sm font-bold px-2 py-1 rounded-lg">
              {totalItems}
            </span>
            <span className="font-semibold">Voir mon panier</span>
            <span className="font-bold">{total.toFixed(2)} €</span>
          </button>
        </div>
      )}
    </div>
  )
}
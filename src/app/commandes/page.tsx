'use client'

import { useEffect, useState } from 'react'
import { getMyOrders, cancelOrder } from '@/lib/api/traiteur'
import { getMyGpRequests, getFlag } from '@/lib/api/gp'
import Link from 'next/link'

type Tab = 'traiteur' | 'gp'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'En attente',    color: 'D97706', bg: 'FEF3C7' },
  confirmed:  { label: 'Confirmée',     color: '16A34A', bg: 'DCFCE7' },
  preparing:  { label: 'En préparation',color: '2563EB', bg: 'DBEAFE' },
  ready:      { label: 'Prête',         color: '7C3AED', bg: 'EDE9FE' },
  delivered:  { label: 'Livrée',        color: '16A34A', bg: 'DCFCE7' },
  cancelled:  { label: 'Annulée',       color: 'DC2626', bg: 'FEE2E2' },
  accepted:   { label: 'Acceptée',      color: '16A34A', bg: 'DCFCE7' },
  in_transit: { label: 'En transit',    color: '2563EB', bg: 'DBEAFE' },
  disputed:   { label: 'Litige',        color: 'DC2626', bg: 'FEE2E2' },
}

export default function CommandesPage() {
  const [tab, setTab] = useState<Tab>('traiteur')
  const [orders, setOrders] = useState<any[]>([])
  const [gpRequests, setGpRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      try {
        const [ordersData, gpData] = await Promise.all([
          getMyOrders(),
          getMyGpRequests()
        ])
        setOrders(ordersData || [])
        setGpRequests(gpData || [])
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const handleCancel = async (orderId: string) => {
    setCancelling(orderId)
    try {
      await cancelOrder(orderId)
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, status: 'cancelled' } : o
      ))
    } finally {
      setCancelling(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    })
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: '64748B', bg: 'F1F5F9' }
    return (
      <span style={{ color: `#${cfg.color}`, background: `#${cfg.bg}` }}
        className="text-xs font-semibold px-2 py-1 rounded-full">
        {cfg.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">

      {/* Header */}
      <div className="bg-[#1D6B45] px-4 pt-12 pb-6">
        <Link href="/dashboard" className="text-white/70 text-sm mb-4 inline-block">
          ← Accueil
        </Link>
        <h1 className="text-2xl font-bold text-white">Mes commandes</h1>
        <p className="text-white/70 text-sm mt-1">Suivi de tes commandes et colis</p>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setTab('traiteur')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              tab === 'traiteur'
                ? 'bg-white text-[#1D6B45]'
                : 'bg-white/20 text-white'
            }`}
          >
            🍽️ Traiteur
            {orders.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === 'traiteur' ? 'bg-[#1D6B45] text-white' : 'bg-white/30 text-white'
              }`}>
                {orders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('gp')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              tab === 'gp'
                ? 'bg-white text-[#1D6B45]'
                : 'bg-white/20 text-white'
            }`}
          >
            ✈️ GP Colis
            {gpRequests.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === 'gp' ? 'bg-[#1D6B45] text-white' : 'bg-white/30 text-white'
              }`}>
                {gpRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto">

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>

        ) : tab === 'traiteur' ? (
          orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🍽️</div>
              <p className="text-gray-500 font-medium">Aucune commande traiteur</p>
              <Link href="/traiteur"
                className="mt-4 inline-block bg-[#1D6B45] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#0F4A30] transition-colors">
                Commander un plat
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

                  {/* Header carte */}
                  <div className="px-5 py-4 flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {order.traiteurs?.name || 'Traiteur'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Commandé le {formatDate(order.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  {/* Items */}
                  <div className="px-5 pb-3 border-t border-gray-50">
                    <div className="pt-3 space-y-1.5">
                      {order.order_items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">
                            {item.quantity}× {item.dishes?.name}
                          </span>
                          <span className="text-gray-500">
                            {(item.quantity * item.unit_price).toFixed(2)} €
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer carte */}
                  <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
                    <div>
                      {order.delivery_date && (
                        <p className="text-xs text-gray-500">
                          📅 {formatDateTime(order.delivery_date)}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5">
                        {order.delivery_type === 'delivery' ? '🚗 Livraison' : '🏠 Retrait'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#1D6B45]">
                        {Number(order.total_amount).toFixed(2)} €
                      </span>
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          disabled={cancelling === order.id}
                          className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {cancelling === order.id ? '...' : 'Annuler'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )

        ) : (
          gpRequests.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">✈️</div>
              <p className="text-gray-500 font-medium">Aucune demande de colis</p>
              <Link href="/gp"
                className="mt-4 inline-block bg-[#1D6B45] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#0F4A30] transition-colors">
                Trouver un GP
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {gpRequests.map(req => (
                <div key={req.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

                  {/* Header */}
                  <div className="px-5 py-4 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-gray-800">
                        <span>
                          {getFlag(req.gp_listings?.departure_country)} {req.gp_listings?.departure_city}
                        </span>
                        <span className="text-[#1D6B45]">→</span>
                        <span>
                          {getFlag(req.gp_listings?.arrival_country)} {req.gp_listings?.arrival_city}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Demande du {formatDate(req.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>

                  {/* Détails colis */}
                  <div className="px-5 pb-3 border-t border-gray-50 pt-3">
                    <div className="flex gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Poids</p>
                        <p className="font-medium text-gray-700">{req.weight_kg} kg</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Contenu</p>
                        <p className="font-medium text-gray-700">{req.content_desc}</p>
                      </div>
                      {req.gp_listings?.departure_date && (
                        <div>
                          <p className="text-xs text-gray-400">Départ</p>
                          <p className="font-medium text-gray-700">
                            {formatDate(req.gp_listings.departure_date)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {req.weight_kg} kg × {req.gp_listings?.price_per_kg} €/kg
                    </p>
                    <span className="font-bold text-[#1D6B45]">
                      {Number(req.total_amount).toFixed(2)} €
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
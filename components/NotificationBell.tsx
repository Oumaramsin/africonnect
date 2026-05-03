'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Notification = {
  id: string
  type: string
  titre: string
  message: string
  is_read: boolean
  created_at: string
  data: {
    date_evenement?: string
    nb_personnes?: string
    adresse?: string
    type_evenement?: string
    notes?: string
  }
}

export default function NotificationBell() {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  const unread = notifications.filter(n => !n.is_read).length

 useEffect(() => {
  const load = async () => {
    await loadNotifications()
  }
  load()

  // Realtime — écoute les nouvelles notifications
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev])
      }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    setNotifications(data || [])
  }

  async function markAsRead(id: string) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    )
  }

  async function markAllAsRead() {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false)

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="relative">
      {/* Cloche */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl bg-white border border-gray-100 shadow-sm"
      >
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">

          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-800">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#1D6B45] hover:underline"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !n.is_read ? 'bg-[#E8F5E9]' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">
                      {n.type === 'nouvelle_commande' ? '🎉' : '🔔'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        {n.titre}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {n.message}
                      </p>
                      {n.data?.notes && (
                        <p className="text-xs text-gray-400 mt-1 italic">
                          {n.data.notes}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-[#1D6B45] mt-1 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overlay pour fermer */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}
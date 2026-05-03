'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

type Props = {
  traiteurId: string
  traiteurName: string
  whatsapp?: string | null
}

type FormState = {
  date_evenement: string
  nb_personnes: string
  adresse: string
  type_evenement: string
  notes: string
}

const TYPES = ['Mariage', 'Anniversaire', 'Baptême', 'Séminaire', 'Soirée privée', 'Autre']

export default function CommandeForm({ traiteurId, traiteurName, whatsapp }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    date_evenement: '',
    nb_personnes: '',
    adresse: '',
    type_evenement: '',
    notes: '',
  })

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
  if (!form.date_evenement || !form.nb_personnes || !form.adresse) {
    setError('Merci de remplir les champs obligatoires')
    return
  }

  setLoading(true)
  setError(null)

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    setError('Tu dois être connecté pour passer une commande')
    setLoading(false)
    return
  }

  // Insère la commande
  const { error: insertError } = await supabase.from('commandes_traiteur').insert({
    client_id: session.user.id,
    traiteur_id: traiteurId,
    date_evenement: form.date_evenement,
    nb_personnes: parseInt(form.nb_personnes),
    adresse: form.adresse,
    type_evenement: form.type_evenement || null,
    notes: form.notes || null,
    statut: 'en_attente',
  })

  if (insertError) {
    setError(insertError.message)
    setLoading(false)
    return
  }

  // Récupère le user_id du traiteur
  const { data: traiteurData } = await supabase
    .from('traiteurs')
    .select('user_id')
    .eq('id', traiteurId)
    .single()

  // Envoie la notification au traiteur
  if (traiteurData?.user_id) {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: traiteurData.user_id,
        type: 'nouvelle_commande',
        titre: '🎉 Nouvelle commande !',
        message: `Commande pour ${form.nb_personnes} personnes le ${form.date_evenement} à ${form.adresse}`,
        data: {
          date_evenement: form.date_evenement,
          nb_personnes: form.nb_personnes,
          adresse: form.adresse,
          type_evenement: form.type_evenement,
          notes: form.notes,
        }
      })
    })
  }

  setSuccess(true)
  setLoading(false)
}

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-[#1D6B45] text-white py-4 rounded-2xl font-semibold text-sm hover:bg-[#0F4A30] transition-colors"
      >
        Commander ce traiteur
      </button>
    )
  }

  if (success) {
  const waNumber = whatsapp
    ? whatsapp.replace(/\+/g, '').replace(/\s/g, '')
    : ''
  const waUrl = `https://wa.me/${waNumber}?text=Bonjour%2C%20je%20viens%20de%20passer%20une%20commande%20sur%20AfriConnect.`

  return (
    <div className="bg-[#E8F5E9] border border-[#1D6B45]/20 rounded-2xl p-6 text-center">
      <div className="text-4xl mb-3">✅</div>
      <h3 className="font-bold text-[#1D6B45] mb-1">Commande envoyée !</h3>
      <p className="text-sm text-gray-600 mb-4">
        {traiteurName} a bien reçu ta demande et te contactera rapidement.
      </p>
      {whatsapp && (
        <button
          onClick={() => window.open(waUrl, '_blank')}
          className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-3 rounded-xl font-medium text-sm hover:bg-[#1da851] transition-colors"
        >
          💬 Contacter sur WhatsApp
        </button>
      )}
    </div>
  )
}

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Passer une commande</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          &#x2715;
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {"Date de l'événement *"}
          </label>
          <input
            type="date"
            value={form.date_evenement}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => updateField('date_evenement', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de personnes *
          </label>
          <input
            type="number"
            min="1"
            value={form.nb_personnes}
            onChange={(e) => updateField('nb_personnes', e.target.value)}
            placeholder="Ex: 50"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {"Adresse de l'événement *"}
          </label>
          <input
            type="text"
            value={form.adresse}
            onChange={(e) => updateField('adresse', e.target.value)}
            placeholder="Ex: 12 rue des Lilas, Paris 75010"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {"Type d'événement"}
          </label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t: string) => (
              <button
                key={t}
                type="button"
                onClick={() => updateField('type_evenement', t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  form.type_evenement === t
                    ? 'bg-[#1D6B45] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes supplémentaires
          </label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Régimes alimentaires, allergies, plats souhaités..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#1D6B45] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#0F4A30] transition-colors disabled:opacity-60"
        >
          {loading ? 'Envoi en cours...' : 'Envoyer ma demande'}
        </button>

        {whatsapp && (
          <p className="text-xs text-center text-gray-400">
            Le traiteur sera notifié sur WhatsApp
          </p>
        )}

      </div>
    </div>
  )

  
}


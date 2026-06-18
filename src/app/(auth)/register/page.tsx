'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Mail, Smartphone } from "lucide-react";

type Method = 'email' | 'phone'

export default function RegisterPage() {
  const supabase = createClient()
  const [method, setMethod] = useState<Method>('email')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 8) {
      setError('Minimum 8 caractères')
      return
    }
    if (method === 'phone' && !phone.startsWith('+')) {
      setError('Le numéro doit commencer par + (ex: +33612345678)')
      return
    }

    setLoading(true)

    // On utilise toujours email pour Supabase Auth
    // Si inscription par téléphone, on génère un email fictif
    const authEmail = method === 'email'
      ? email
      : `${phone.replace(/\+/g, '').replace(/\s/g, '')}@africonnect.app`

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: authEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: method === 'phone' ? phone : null,
        }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Met à jour le profil avec le numéro de téléphone
    if (data.user && method === 'phone') {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        phone: phone,
        whatsapp: phone,
      })
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-[#1D6B45] mb-2">
          Compte créé !
        </h2>
        <p className="text-gray-500 mb-6">
          {method === 'email'
            ? `Un lien de confirmation a été envoyé à ${email}.`
            : `Ton compte a été créé avec le numéro ${phone}. Tu peux maintenant te connecter.`
          }
        </p>
        <Link
          href="/login"
          className="bg-[#1D6B45] text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-[#0F4A30] transition-colors inline-block"
        >
          Se connecter →
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1D6B45]">
            Afri<span className="text-[#D4870A]">Connect</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Crée ton compte gratuitement
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* Choix méthode */}
          <div className="flex gap-2 mb-6">
            {(['email', 'phone'] as Method[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMethod(m); setError(null) }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  method === m
                    ? 'bg-[#1D6B45] text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {m === 'email' ? <><Mail size={16} className="inline mr-1" /> Email</> : <><Smartphone size={16} className="inline mr-1" /> Téléphone</>}
              </button>
            ))}
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            Inscription
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aminata Diallo"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
              />
            </div>

            {method === 'email' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aminata@email.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro WhatsApp
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33612345678"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Format international — ex: +33612345678
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirme le mot de passe
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Répète ton mot de passe"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1D6B45] text-white py-3 rounded-xl font-medium text-sm hover:bg-[#0F4A30] transition-colors disabled:opacity-60"
            >
              {loading ? 'Création du compte...' : 'Créer mon compte'}
            </button>

          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {"Déjà un compte ? "}
            <Link href="/login" className="text-[#1D6B45] font-medium hover:underline">
              Se connecter
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type Method = 'email' | 'phone'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [method, setMethod] = useState<Method>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Si connexion par téléphone, on reconstitue l'email fictif
    const authEmail = method === 'email'
      ? email
      : `${phone.replace(/\+/g, '').replace(/\s/g, '')}@africonnect.app`

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    })

    if (signInError) {
      setError('Identifiants incorrects')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1D6B45]">
            Afri<span className="text-[#D4870A]">Connect</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Connecte-toi à ton compte
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
                {m === 'email' ? '✉️ Email' : '📱 Téléphone'}
              </button>
            ))}
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            Connexion
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

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
                  Numéro de téléphone
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
                placeholder="Ton mot de passe"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1D6B45] text-white py-3 rounded-xl font-medium text-sm hover:bg-[#0F4A30] transition-colors disabled:opacity-60"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {"Pas encore de compte ? "}
            <Link href="/register" className="text-[#1D6B45] font-medium hover:underline">
              {"S'inscrire gratuitement"}
            </Link>
            
          </p>
          <p className="text-center text-sm text-gray-500 mt-6">
            <Link href="/dashboard" className="text-[#1D6B45] font-bold hover:underline">
              {"Continuer en tant qu'invité"}
            </Link>
            
          </p>

        </div>
      </div>
    </div>
  )
}
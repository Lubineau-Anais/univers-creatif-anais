import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, LogIn } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Connexion() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (isAdmin) {
    navigate('/')
    return null
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect. Réessaie !')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <main className="flex-1 bg-candy flex items-center justify-center px-4 py-16">
      {/* Déco */}
      <div className="absolute top-24 left-10 w-16 h-16 bg-citron-400 rounded-2xl border-2 border-[#1A1040] shadow-pop rotate-12 opacity-60 pointer-events-none hidden md:block" />
      <div className="absolute top-40 right-10 w-10 h-10 bg-turquoise-400 rounded-xl border-2 border-[#1A1040] shadow-pop -rotate-6 opacity-60 pointer-events-none hidden md:block" />
      <div className="absolute bottom-20 left-20 w-8 h-8 bg-rose-400 rounded-lg border-2 border-[#1A1040] rotate-45 opacity-50 pointer-events-none hidden md:block" />

      <div className="bg-white rounded-3xl border-4 border-[#1A1040] shadow-pop w-full max-w-md p-8 relative">
        {/* Badge décoratif */}
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-rose-400 text-white px-4 py-1.5 rounded-full text-sm font-black border-2 border-[#1A1040] whitespace-nowrap">
          🔐 Zone secrète !
        </div>

        {/* Logo */}
        <div className="text-center mb-8 mt-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-400 rounded-2xl border-4 border-[#1A1040] shadow-pop mb-4">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-serif text-2xl font-black text-[#1A1040]">Espace Admin</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">l'univers créatif d'Anaïs ✦</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm mb-4 border-2 border-red-200 font-medium">
            😬 {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-black text-[#1A1040] mb-1.5">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border-2 border-[#1A1040] rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400 bg-candy"
              placeholder="admin@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-black text-[#1A1040] mb-1.5">Mot de passe</label>
            <input
              required
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border-2 border-[#1A1040] rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400 bg-candy"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-rose-400 text-white py-3.5 rounded-2xl font-black text-sm shadow-pop border-2 border-[#1A1040] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#1A1040] transition-all disabled:opacity-60 disabled:translate-y-0 mt-2"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Connexion en cours...' : '🚀 Se connecter'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6 font-medium">
          Réservé à la gestionnaire du site uniquement.
        </p>
      </div>
    </main>
  )
}

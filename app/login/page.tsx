'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Pogrešan email ili lozinka.')
      setLoading(false)
      return
    }

    // Full page reload so server picks up the new session cookies
    window.location.replace('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#1D9E75' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="2"/><path d="m12 2-1 10 1 2 1-2L12 2z"/><path d="M12 14v8"/>
            </svg>
          </div>
          <div>
            <div className="text-xl font-semibold tracking-tight">GolfCoach</div>
            <div className="text-xs text-gray-500">Instructor Management</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h1 className="text-base font-semibold mb-1">Prijavi se</h1>
          <p className="text-sm text-gray-500 mb-5">Unesite pristupne podatke</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Lozinka</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-60"
              style={{ background: '#1D9E75' }}
            >
              {loading ? 'Prijavljivanje...' : 'Prijavi se'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

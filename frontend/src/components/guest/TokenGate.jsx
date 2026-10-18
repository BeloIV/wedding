import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, ArrowLeft } from 'lucide-react'
import { useGuestToken } from '../../contexts/GuestTokenContext'

export default function TokenGate({ children }) {
  const { token, setToken, loading } = useGuestToken()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  if (loading) return (
    <div className="min-h-screen hero-gradient flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-rose border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (token) return children

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (code.trim().length !== 5) { setError('Kód musí mať 5 znakov.'); return }
    setSubmitting(true)
    setError('')
    try {
      await setToken(code.trim())
    } catch (err) {
      setError(err.response?.status === 429 ? 'Príliš veľa pokusov. Skúste to o chvíľu.' : 'Neplatný kód. Skontrolujte svoju pozvánku.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen hero-gradient grain-overlay flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-up">

        {/* Ornament */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <div style={{ width: '50px', height: '1px', background: 'linear-gradient(to right, transparent, #d4b5ae)' }} />
          <Heart className="w-3.5 h-3.5 text-rose/50" fill="currentColor" />
          <div style={{ width: '50px', height: '1px', background: 'linear-gradient(to left, transparent, #d4b5ae)' }} />
        </div>

        <div className="text-center mb-8">
          <h1 className="font-display text-wine mb-2 leading-tight"
            style={{ fontSize: '2.4rem', fontWeight: 500, letterSpacing: '-0.01em' }}>
            Váš kód
          </h1>
          <p className="text-muted text-sm font-sans leading-relaxed">
            Zadajte 5-znakový kód z vašej svadobnej pozvánky.
          </p>
        </div>

        {/* Code input card */}
        <div className="bg-white/70 rounded-2xl p-8 mb-5"
          style={{ border: '1px solid rgba(232,207,201,0.5)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 32px rgba(30,15,8,0.08)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
                maxLength={5}
                placeholder="· · · · ·"
                autoFocus
                className="w-full px-4 py-4 bg-parchment border border-blush/70 rounded-xl
                           text-center text-2xl font-mono tracking-[0.8em] uppercase text-wine
                           focus:outline-none focus:ring-2 focus:ring-rose/20 focus:border-rose/50
                           transition-all duration-200 placeholder-rose/20"
              />
              {error && (
                <p className="text-red-500/80 text-xs text-center mt-2 font-sans animate-fade-in">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || code.length !== 5}
              className="w-full py-3.5 rounded-xl font-sans font-medium text-sm tracking-[0.08em] uppercase
                         transition-all duration-300 disabled:opacity-40"
              style={{
                background: code.length === 5 && !submitting
                  ? 'linear-gradient(135deg, #1e0f08 0%, #2d1510 100%)'
                  : '#c8b8b0',
                color: '#faf5ee',
                boxShadow: code.length === 5 && !submitting ? '0 4px 20px rgba(20,10,4,0.2)' : 'none',
              }}
            >
              {submitting ? 'Overujem…' : 'Pokračovať'}
            </button>
          </form>
        </div>

        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center gap-2 text-muted/70 text-sm mx-auto hover:text-wine transition-colors font-sans w-full"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Späť na hlavnú stránku
        </button>
      </div>
    </div>
  )
}

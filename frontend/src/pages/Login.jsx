import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Heart, Lock, Mail } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]   = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/admin')
    } catch {
      setError('Nesprávny email alebo heslo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen grain-overlay flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(155deg, #1a1008 0%, #130c04 100%)' }}
    >
      {/* Ambient glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(184,112,106,0.1) 0%, transparent 70%)' }} />

      <div className="w-full max-w-sm relative animate-fade-up">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-5"
            style={{ background: 'rgba(184,112,106,0.15)', border: '1px solid rgba(184,112,106,0.25)' }}>
            <Heart className="w-5 h-5 text-rose/80" fill="currentColor" />
          </div>
          <h1 className="font-display text-white/85 mb-1.5 leading-tight"
            style={{ fontSize: '2rem', fontWeight: 500, letterSpacing: '-0.01em' }}>
            Admin Panel
          </h1>
          <p className="text-white/30 text-sm font-sans">Prihlásenie pre administrátorov</p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'rgba(250,245,238,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          }}
        >
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm font-sans"
              style={{ background: 'rgba(192,102,92,0.15)', border: '1px solid rgba(192,102,92,0.3)', color: '#e89490' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-sans font-medium uppercase tracking-[0.15em] mb-1.5"
                style={{ color: 'rgba(255,255,255,0.3)' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="admin@svadba.sk"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-sans transition-all duration-200
                             focus:outline-none focus:ring-1"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(250,245,238,0.85)',
                    '--tw-ring-color': 'rgba(184,112,106,0.5)',
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-sans font-medium uppercase tracking-[0.15em] mb-1.5"
                style={{ color: 'rgba(255,255,255,0.3)' }}>Heslo</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-sans transition-all duration-200 focus:outline-none focus:ring-1"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(250,245,238,0.85)',
                    '--tw-ring-color': 'rgba(184,112,106,0.5)',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-sans font-medium tracking-[0.08em] uppercase transition-all duration-300 mt-1 disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, rgba(184,112,106,0.9) 0%, rgba(144,82,74,0.9) 100%)',
                color: '#faf5ee',
                boxShadow: '0 4px 20px rgba(184,112,106,0.25)',
              }}
            >
              {loading ? 'Prihlasujem…' : 'Prihlásiť sa'}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-xs font-sans" style={{ color: 'rgba(255,255,255,0.2)' }}>
          <a href="/" className="hover:text-rose/60 transition-colors">← Späť na stránku hostí</a>
        </p>
      </div>
    </div>
  )
}

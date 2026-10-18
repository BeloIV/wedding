import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import api from '../../api/axios'
import { useGuestToken } from '../../contexts/GuestTokenContext'

function formatNames(names) {
  if (!names?.length) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} a ${names[1]}`
  return names.slice(0, -1).join(', ') + ' a ' + names[names.length - 1]
}

export default function InvitePage() {
  const { token } = useParams()
  const navigate  = useNavigate()
  const { setToken } = useGuestToken()
  const [invitation, setInvitation] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!token) { navigate('/'); return }
    api.get(`/api/public/invite/${token.toUpperCase()}/`)
      .then(res => { setInvitation(res.data); setToken(token.toUpperCase()) })
      .catch(() => setError(true))
  }, [token])

  if (error) return (
    <div className="min-h-screen hero-gradient grain-overlay flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <p className="text-muted text-sm mb-6 font-sans">Tento kód pozvania nebol nájdený.</p>
        <button onClick={() => navigate('/')} className="btn-secondary text-sm">Otvoriť stránku</button>
      </div>
    </div>
  )

  if (!invitation) return (
    <div className="min-h-screen hero-gradient flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-rose border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const greeting = formatNames(invitation.names || [])
  const multi = (invitation.names?.length || 0) > 1

  return (
    <div className="min-h-screen grain-overlay flex flex-col items-center justify-center px-6 text-center relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #1e0f08 0%, #2d1811 50%, #1a0d06 100%)' }}>

      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(184,112,106,0.12) 0%, transparent 70%)' }} />

      <div className="relative animate-fade-in max-w-lg w-full">

        {/* Top ornament */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <div style={{ width: '60px', height: '1px', background: 'linear-gradient(to right, transparent, rgba(184,112,106,0.5))' }} />
          <Heart className="w-4 h-4 text-rose/60" fill="currentColor" />
          <div style={{ width: '60px', height: '1px', background: 'linear-gradient(to left, transparent, rgba(184,112,106,0.5))' }} />
        </div>

        <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-sans mb-7">
          Svadobná pozvánka
        </p>

        {/* Greeting */}
        <div className="animate-fade-up delay-100">
          <h1
            className="font-display text-white/90 leading-tight mb-3"
            style={{ fontSize: 'clamp(2.8rem, 8vw, 5rem)', fontWeight: 500, letterSpacing: '-0.01em' }}
          >
            {greeting ? `Ahoj,` : 'Vitajte!'}
          </h1>
          {greeting && (
            <h2
              className="font-display italic text-champagne/80 leading-tight mb-8"
              style={{ fontSize: 'clamp(2.4rem, 7vw, 4.5rem)', fontWeight: 400 }}
            >
              {greeting}!
            </h2>
          )}
        </div>

        <div className="animate-fade-up delay-300">
          <p className="text-white/35 text-base font-sans leading-relaxed mb-12 max-w-sm mx-auto">
            {multi
              ? 'Tešíme sa na vás na našom veľkom dni.'
              : 'Tešíme sa na teba na našom veľkom dni.'}
          </p>
        </div>

        <div className="animate-fade-up delay-500">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-full text-sm font-sans font-medium tracking-[0.1em] uppercase transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background: 'rgba(232,213,168,0.12)',
              border: '1px solid rgba(232,213,168,0.25)',
              color: 'rgba(232,213,168,0.85)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Heart className="w-3.5 h-3.5" fill="currentColor" />
            Otvoriť pozvánku
          </button>
        </div>

        <p className="mt-10 text-[10px] text-white/15 tracking-[0.3em] uppercase font-sans">
          {token?.toUpperCase()}
        </p>
      </div>
    </div>
  )
}

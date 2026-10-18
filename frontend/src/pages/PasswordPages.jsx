import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Heart, Mail, Lock } from 'lucide-react'
import api from '../api/axios'

function Shell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen grain-overlay flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(155deg, #1a1008 0%, #130c04 100%)' }}>
      <div className="w-full max-w-sm relative animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-5"
            style={{ background: 'rgba(184,112,106,0.15)', border: '1px solid rgba(184,112,106,0.25)' }}>
            <Heart className="w-5 h-5 text-rose/80" fill="currentColor" />
          </div>
          <h1 className="font-display text-white/85 mb-1.5 leading-tight" style={{ fontSize: '1.8rem', fontWeight: 500 }}>{title}</h1>
          <p className="text-white/30 text-sm font-sans">{subtitle}</p>
        </div>
        <div className="rounded-2xl p-7" style={{ background: 'rgba(250,245,238,0.04)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
          {children}
        </div>
        <p className="text-center mt-5 text-xs font-sans" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <Link to="/login" className="hover:text-rose/60 transition-colors">← Späť na prihlásenie</Link>
        </p>
      </div>
    </div>
  )
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(250,245,238,0.85)',
}
const btnStyle = {
  background: 'linear-gradient(135deg, rgba(184,112,106,0.9) 0%, rgba(144,82,74,0.9) 100%)', color: '#faf5ee',
}
const Msg = ({ children, error }) => (
  <div className="mb-5 px-4 py-3 rounded-xl text-sm font-sans"
    style={error ? { background: 'rgba(192,102,92,0.15)', border: '1px solid rgba(192,102,92,0.3)', color: '#e89490' }
      : { background: 'rgba(120,180,140,0.12)', border: '1px solid rgba(120,180,140,0.3)', color: '#a8d8b8' }}>
    {children}
  </div>
)

/* /zabudnute-heslo – asks for the e-mail, always answers the same (no account enumeration) */
export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await api.post('/api/auth/password-reset/', { email })
      setSent(true)
    } catch (err) {
      setError(err.response?.status === 429 ? 'Príliš veľa pokusov. Skúste to o chvíľu.' : 'Nepodarilo sa odoslať. Skúste to znova.')
    } finally { setLoading(false) }
  }

  return (
    <Shell title="Nastavenie hesla" subtitle="Pošleme vám odkaz na e-mail">
      {sent ? (
        <Msg>Ak má tento e-mail admin účet, poslali sme naň odkaz na nastavenie hesla. Skontrolujte aj spam.</Msg>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Msg error>{error}</Msg>}
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="váš@email.sk"
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-sans focus:outline-none" style={inputStyle} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-sans font-medium tracking-[0.08em] uppercase disabled:opacity-40" style={btnStyle}>
            {loading ? 'Odosielam…' : 'Poslať odkaz'}
          </button>
        </form>
      )}
    </Shell>
  )
}

/* /nastavit-heslo?uid=…&token=… – link from the e-mail */
export function SetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const uid = params.get('uid') || ''
  const token = params.get('token') || ''

  const submit = async (e) => {
    e.preventDefault()
    if (pw !== pw2) { setError('Heslá sa nezhodujú.'); return }
    setLoading(true); setError('')
    try {
      await api.post('/api/auth/password-reset/confirm/', { uid, token, password: pw })
      setDone(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      const d = err.response?.data
      setError(err.response?.status === 429 ? 'Príliš veľa pokusov. Skúste to o chvíľu.'
        : d?.password?.join(' ') || d?.error || 'Nepodarilo sa nastaviť heslo.')
    } finally { setLoading(false) }
  }

  return (
    <Shell title="Nové heslo" subtitle="Zvoľte si heslo (aspoň 10 znakov)">
      {!uid || !token ? (
        <Msg error>Odkaz je neúplný. Vyžiadajte si nový na stránke <Link to="/zabudnute-heslo" className="underline">Zabudnuté heslo</Link>.</Msg>
      ) : done ? (
        <Msg>Heslo je nastavené. Presmerovávam na prihlásenie…</Msg>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Msg error>{error}</Msg>}
          {[[pw, setPw, 'Nové heslo'], [pw2, setPw2, 'Heslo znova']].map(([v, set, ph]) => (
            <div className="relative" key={ph}>
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
              <input type="password" required minLength={10} autoComplete="new-password" value={v} onChange={e => set(e.target.value)} placeholder={ph}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-sans focus:outline-none" style={inputStyle} />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-sans font-medium tracking-[0.08em] uppercase disabled:opacity-40" style={btnStyle}>
            {loading ? 'Ukladám…' : 'Nastaviť heslo'}
          </button>
        </form>
      )}
    </Shell>
  )
}

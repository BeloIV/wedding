import { useState, useEffect } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { Menu, X, Heart, KeyRound } from 'lucide-react'
import { useGuestToken } from '../../contexts/GuestTokenContext'
import api from '../../api/axios'

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1,3),16)/255
  let g = parseInt(hex.slice(3,5),16)/255
  let b = parseInt(hex.slice(5,7),16)/255
  const max = Math.max(r,g,b), min = Math.min(r,g,b)
  let h, s, l = (max+min)/2
  if (max === min) { h = s = 0 } else {
    const d = max - min
    s = l > 0.5 ? d/(2-max-min) : d/(max+min)
    switch(max){
      case r: h=((g-b)/d+(g<b?6:0))/6; break
      case g: h=((b-r)/d+2)/6; break
      default: h=((r-g)/d+4)/6
    }
  }
  return [h*360, s*100, l*100]
}

function hslToHex(h,s,l) {
  s /= 100; l /= 100
  const a = s * Math.min(l,1-l)
  const f = n => { const k=(n+h/30)%12; return l-a*Math.max(-1,Math.min(k-3,9-k,1)) }
  return '#'+[f(0),f(8),f(4)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('')
}

function applyTheme(colors) {
  const root = document.documentElement
  if (!colors || colors.length === 0) {
    root.style.removeProperty('--c-rose')
    root.style.removeProperty('--c-rose-dark')
    root.style.removeProperty('--c-rose-light')
    root.style.removeProperty('--c-wine')
    root.style.removeProperty('--c-blush')
    return
  }
  const primary = colors[0]
  const [h,s,l] = hexToHsl(primary)
  root.style.setProperty('--c-rose',       primary)
  root.style.setProperty('--c-rose-dark',  colors[1] || hslToHex(h, Math.min(s+10,100), Math.max(l-20,10)))
  root.style.setProperty('--c-rose-light', colors[2] || hslToHex(h, Math.max(s-20,0),   Math.min(l+20,90)))
  root.style.setProperty('--c-blush',      colors[3] || hslToHex(h, Math.max(s-30,0),   Math.min(l+30,95)))
  if (colors[4]) root.style.setProperty('--c-wine', colors[4])
}

const publicLinks = [
  { to: '/', label: 'Domov', end: true },
  { to: '/galeria', label: 'Galéria' },
  { to: '/program', label: 'Program' },
]
const tokenLinks = [
  { to: '/ucast', label: 'Účasť' },
  { to: '/wishlist', label: 'Priania' },
]

function formatNames(names) {
  if (!names || names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} a ${names[1]}`
  return names.slice(0, -1).join(', ') + ' a ' + names[names.length - 1]
}

function TokenModal({ onClose }) {
  const { setToken } = useGuestToken()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (code.trim().length !== 5) { setError('Kód musí mať 5 znakov.'); return }
    setLoading(true)
    setError('')
    try {
      await setToken(code.trim())
      onClose()
    } catch (err) {
      setError(err.response?.status === 429 ? 'Príliš veľa pokusov. Skúste to o chvíľu.' : 'Neplatný kód. Skontrolujte pozvánku.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-wine">Zadajte kód z pozvánky</h2>
          <button onClick={onClose} className="text-muted hover:text-wine"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-muted text-sm mb-6">
          5-znakový kód nájdete na vašej svadobnej pozvánke alebo v QR kóde.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={5}
            placeholder="napr. AB3K7"
            className="w-full px-4 py-3 border border-blush rounded-xl text-center text-2xl font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose bg-white"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length !== 5}
            className="w-full py-3 bg-rose text-white font-medium rounded-xl hover:bg-rose-dark transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? 'Overujem...' : 'Potvrdiť'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function GuestLayout() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [tokenModal, setTokenModal] = useState(false)
  const { invitation } = useGuestToken()

  useEffect(() => {
    api.get('/api/public/wedding-info/').then(r => {
      const colors = r.data?.dress_code_colors
      if (Array.isArray(colors) && colors.length > 0) applyTheme(colors)
    }).catch(() => {})
    return () => {
      const root = document.documentElement
      ;['--c-rose','--c-rose-dark','--c-rose-light','--c-wine','--c-blush'].forEach(v => root.style.removeProperty(v))
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const names = invitation?.names || []
  const greeting = formatNames(names)

  return (
    <div className="min-h-screen bg-cream">
      {/* Greeting banner */}
      {greeting && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-wine/95 text-white text-center py-1.5 text-xs tracking-wide">
          <Heart className="inline w-3 h-3 text-rose mr-1.5 mb-0.5" fill="currentColor" />
          Ahoj, <span className="font-medium">{greeting}</span>! Tešíme sa na vás.
        </div>
      )}

      {/* Navbar */}
      <header
        style={{ zIndex: 60, WebkitTransform: 'translateZ(0)' }}
        className={`fixed left-0 right-0 z-40 transition-all duration-300 ${greeting ? 'top-7' : 'top-0'} ${
          scrolled
            ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-blush'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-serif text-wine text-lg hover:text-rose transition-colors">
            <Heart className="w-4 h-4 text-rose" fill="currentColor" />
            <span>Naša Svadba</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {publicLinks.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `text-sm font-medium tracking-wide transition-colors duration-200 ${
                    isActive ? 'text-rose' : 'text-wine/70 hover:text-wine'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            {invitation
              ? tokenLinks.map(({ to, label }) => (
                  <NavLink key={to} to={to}
                    className={({ isActive }) =>
                      `text-sm font-medium tracking-wide transition-colors duration-200 ${
                        isActive ? 'text-rose' : 'text-wine/70 hover:text-wine'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                ))
              : (
                <button onClick={() => setTokenModal(true)}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-wine transition-colors border border-blush rounded-full px-3 py-1">
                  <KeyRound className="w-3.5 h-3.5" />
                  Zadať kód
                </button>
              )
            }
          </nav>

          <button className="md:hidden text-wine p-1" onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-blush px-6 py-4 space-y-1 shadow-lg relative z-10">
            {publicLinks.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block py-2 text-sm font-medium ${isActive ? 'text-rose' : 'text-wine/70'}`
                }
              >
                {label}
              </NavLink>
            ))}
            {invitation
              ? tokenLinks.map(({ to, label }) => (
                  <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `block py-2 text-sm font-medium ${isActive ? 'text-rose' : 'text-wine/70'}`
                    }
                  >
                    {label}
                  </NavLink>
                ))
              : (
                <button onClick={() => { setMobileOpen(false); setTokenModal(true) }}
                  className="flex items-center gap-2 py-2 text-sm text-muted">
                  <KeyRound className="w-4 h-4" />
                  Zadať kód z pozvánky
                </button>
              )
            }
          </div>
        )}
      </header>

      <main className={greeting ? 'pt-7' : ''}>
        <Outlet />
      </main>

      <footer className="bg-wine/5 border-t border-blush py-8 mt-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 text-muted text-sm">
            <Heart className="w-4 h-4 text-rose" fill="currentColor" />
            <span className="font-serif italic">S láskou</span>
            <Heart className="w-4 h-4 text-rose" fill="currentColor" />
          </div>
        </div>
      </footer>

      {tokenModal && <TokenModal onClose={() => setTokenModal(false)} />}
    </div>
  )
}

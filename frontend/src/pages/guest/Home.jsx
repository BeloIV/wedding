import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { MapPin, Clock, Shirt, Heart, ChevronDown, BedDouble, Info, Car } from 'lucide-react'
import api from '../../api/axios'
import { format, parseISO } from 'date-fns'
import { sk } from 'date-fns/locale'

function useCountdown(targetDate) {
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  useEffect(() => {
    if (!targetDate) return
    const target = new Date(targetDate)
    const tick = () => {
      const diff = target - new Date()
      if (diff <= 0) { setT({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return }
      setT({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return t
}

function CountdownUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-20 h-20 md:w-24 md:h-24 relative grain-overlay flex items-center justify-center rounded-xl"
        style={{ background: 'linear-gradient(145deg, #1e0f08 0%, #2d1510 100%)', boxShadow: '0 4px 24px rgba(20,10,4,0.35), inset 0 1px 0 rgba(255,255,255,0.07)' }}
      >
        <span className="font-display text-3xl md:text-4xl text-champagne font-semibold leading-none tracking-tight">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] uppercase tracking-[0.22em] text-muted font-sans font-medium">{label}</span>
    </div>
  )
}

/* Tap → device's default maps app; long-press (or right-click) → choose Google Maps / Waze / Apple Maps */
function defaultMapsUrl(q) {
  const ua = navigator.userAgent || ''
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (ios) return `https://maps.apple.com/?q=${q}`
  if (/Android/i.test(ua)) return `geo:0,0?q=${q}`
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

function MapChooser({ query, children, className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const btnRef = useRef(null)
  const [pos, setPos] = useState({ left: 8, top: 0 })
  const timer = useRef(null)
  const longPressed = useRef(false)
  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (ref.current?.contains(e.target) || e.target.closest?.('[data-map-menu]')) return
      setOpen(false)
    }
    const hide = () => setOpen(false)
    document.addEventListener('pointerdown', close)
    window.addEventListener('scroll', hide, { passive: true })
    return () => { document.removeEventListener('pointerdown', close); window.removeEventListener('scroll', hide) }
  }, [open])
  if (!query) return <span className={className}>{children}</span>
  const q = encodeURIComponent(query)
  const links = [
    ['Google Maps', `https://www.google.com/maps/search/?api=1&query=${q}`],
    ['Waze', `https://waze.com/ul?q=${q}&navigate=yes`],
    ['Apple Maps', `https://maps.apple.com/?q=${q}`],
  ]
  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      const W = 176, H = 150
      const left = Math.max(8, Math.min(window.innerWidth - W - 8, r.left + r.width / 2 - W / 2))
      const below = r.bottom + 8
      const top = below + H > window.innerHeight ? Math.max(8, r.top - H - 8) : below
      setPos({ left, top })
    }
    setOpen(true)
  }
  const startPress = () => {
    longPressed.current = false
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { longPressed.current = true; openMenu() }, 500)
  }
  const endPress = () => clearTimeout(timer.current)
  const onClick = () => {
    if (longPressed.current) { longPressed.current = false; return }
    const url = defaultMapsUrl(q)
    if (url.startsWith('geo:')) window.location.href = url
    else window.open(url, '_blank', 'noopener')
  }
  return (
    <span ref={ref} className="relative inline-block">
      <button type="button" ref={btnRef}
        onPointerDown={startPress} onPointerUp={endPress} onPointerLeave={endPress} onPointerCancel={endPress}
        onContextMenu={e => { e.preventDefault(); longPressed.current = true; openMenu() }}
        onClick={onClick}
        title="Klik = navigovať · pridržanie = vybrať aplikáciu"
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation' }}
        className={`${className} underline decoration-dotted underline-offset-4 hover:opacity-80 cursor-pointer`}>
        {children}
      </button>
      {open && createPortal(
        <span data-map-menu className="fixed z-[100] w-44 bg-white border border-blush rounded-xl shadow-lg overflow-hidden text-left"
          style={{ left: pos.left, top: pos.top }}>
          <span className="block px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-muted">Otvoriť v</span>
          {links.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-wine hover:bg-blush/40 transition-colors">{label}</a>
          ))}
        </span>,
        document.body
      )}
    </span>
  )
}

function InfoCard({ title, subtitle, lines, icon: Icon, mapQuery }) {
  return (
    <div className="card grain-overlay text-center group">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-full mb-5"
        style={{ background: 'color-mix(in srgb, var(--c-rose) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--c-rose) 20%, transparent)' }}>
        <Icon style={{ width: '1.1rem', height: '1.1rem', color: 'var(--c-rose)' }} />
      </div>
      <h3 className="font-serif text-xl text-wine mb-1 leading-snug">{title}</h3>
      {subtitle && (
        <p className="font-display italic mb-3 text-base" style={{ color: 'var(--c-rose)' }}>{subtitle}</p>
      )}
      {lines.map((line, i) => (
        <p key={i} className="text-muted text-sm leading-relaxed">
          {mapQuery
            ? <MapChooser query={mapQuery} className={i === 0 ? 'font-medium text-wine' : ''}>{line}</MapChooser>
            : line}
        </p>
      ))}
    </div>
  )
}

function DressCodeCard({ dressCode, colors, imageUrl }) {
  return (
    <div className="card grain-overlay text-center group col-span-full md:col-span-1">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-full mb-5"
        style={{ background: 'color-mix(in srgb, var(--c-rose) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--c-rose) 20%, transparent)' }}>
        <Shirt style={{ width: '1.1rem', height: '1.1rem', color: 'var(--c-rose)' }} />
      </div>
      <h3 className="font-serif text-xl text-wine mb-1 leading-snug">Dress Code</h3>
      {dressCode && (
        <p className="font-display italic mb-4 text-base" style={{ color: 'var(--c-rose)' }}>{dressCode}</p>
      )}
      {colors && colors.length > 0 && (
        <div className="flex items-center justify-center gap-2 mb-4">
          {colors.map((c, i) => (
            <div key={i} title={c}
              className="rounded-full border-2 border-white shadow-warm"
              style={{ width: '2rem', height: '2rem', background: c, boxShadow: `0 2px 8px ${c}55` }}
            />
          ))}
        </div>
      )}
      {imageUrl && (
        <div className="mt-2 rounded-xl overflow-hidden">
          <img src={imageUrl} alt="Dress code inšpirácia"
            className="w-full object-cover" style={{ maxHeight: '200px' }} />
        </div>
      )}
    </div>
  )
}

const URL_RE = /((?:https?:\/\/|www\.)[^\s<>]+[^\s<>.,;:!?)\]])/g
function linkify(text) {
  return text.split(URL_RE).map((part, i) => i % 2 === 1
    ? <a key={i} href={part.startsWith('www.') ? `https://${part}` : part} target="_blank" rel="noopener noreferrer"
        className="underline hover:opacity-80" style={{ color: 'var(--c-rose)' }}>{part}</a>
    : part)
}

export default function Home() {
  const [info, setInfo] = useState(null)
  const timeLeft = useCountdown(info?.wedding_date)

  useEffect(() => {
    api.get('/api/public/wedding-info/').then(r => setInfo(r.data)).catch(() => {})
  }, [])

  const formattedDate = info?.wedding_date
    ? format(parseISO(info.wedding_date), 'd. MMMM yyyy', { locale: sk })
    : ''

  const groomName = info?.groom_name || 'Ženích'
  const brideName = info?.bride_name || 'Nevesta'

  return (
    <>
      {/* ── Hero ──────────────────────────────────────── */}
      <section className="min-h-screen hero-gradient grain-overlay flex flex-col items-center justify-center px-6 text-center relative pt-20" style={{ isolation: 'isolate' }}>

        {/* Top ornament */}
        <div className="animate-fade-in mb-10">
          <div className="hr-ornament max-w-[200px] mx-auto text-rose/50">✦</div>
        </div>

        <p className="animate-fade-in delay-100 text-[10px] uppercase tracking-[0.35em] text-muted font-sans mb-8">
          Srdečne vás pozývame na svadbu
        </p>

        {/* Names */}
        <div className="animate-fade-up delay-200">
          <h1
            className="font-display font-semibold text-wine leading-[0.9] mb-0"
            style={{ fontSize: 'clamp(3.5rem, 10vw, 7rem)', letterSpacing: '-0.02em' }}
          >
            {brideName}
          </h1>
          <div className="flex items-center justify-center gap-5 my-5">
            <div style={{ width: '48px', height: '1px', background: 'linear-gradient(to right, transparent, #d4a89e)' }} />
            <Heart className="w-4 h-4 text-rose" fill="currentColor" />
            <div style={{ width: '48px', height: '1px', background: 'linear-gradient(to left, transparent, #d4a89e)' }} />
          </div>
          <h1
            className="font-display font-semibold text-wine leading-[0.9]"
            style={{ fontSize: 'clamp(3.5rem, 10vw, 7rem)', letterSpacing: '-0.02em' }}
          >
            {groomName}
          </h1>
        </div>

        {/* Date & venue */}
        <div className="animate-fade-up delay-400 mt-8 space-y-2">
          {formattedDate && (
            <p className="font-display italic text-wine/60 text-xl md:text-2xl">{formattedDate}</p>
          )}
          {info?.ceremony_venue && (
            <p className="flex items-center justify-center gap-1.5 text-muted text-sm tracking-wide">
              <MapPin className="w-3.5 h-3.5 text-rose/60 flex-shrink-0" />
              <MapChooser query={[info.ceremony_venue, info.ceremony_address].filter(Boolean).join(', ')}>
                {info.ceremony_venue}
              </MapChooser>
            </p>
          )}
        </div>

        {/* Countdown */}
        {info?.wedding_date && (
          <div className="animate-fade-up delay-500 flex gap-5 md:gap-7 mt-12 mb-14">
            <CountdownUnit value={timeLeft.days}    label="Dní" />
            <CountdownUnit value={timeLeft.hours}   label="Hodín" />
            <CountdownUnit value={timeLeft.minutes} label="Minút" />
            <CountdownUnit value={timeLeft.seconds} label="Sekúnd" />
          </div>
        )}

        {/* CTAs */}
        <div className="animate-fade-up delay-600 flex flex-col sm:flex-row gap-3">
          <Link to="/ucast" className="btn-primary">Potvrdiť účasť</Link>
          <Link to="/wishlist" className="btn-secondary">Zoznam prianí</Link>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted/40 animate-bounce">
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* ── Info Cards ────────────────────────────────── */}
      {info && (
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="divider-ornament">
              <Heart className="w-3.5 h-3.5 text-rose" fill="currentColor" />
            </div>
            <h2 className="section-title">Informácie o svadbe</h2>
            <p className="section-subtitle">Tešíme sa na vás</p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {info.ceremony_venue && (
                <InfoCard
                  title="Obrad"
                  subtitle={info.ceremony_time ? info.ceremony_time.slice(0, 5) : undefined}
                  icon={Clock}
                  lines={[info.ceremony_venue, info.ceremony_address].filter(Boolean)}
                  mapQuery={[info.ceremony_venue, info.ceremony_address].filter(Boolean).join(', ')}
                />
              )}
              {info.reception_venue && (
                <InfoCard
                  title="Hostina"
                  subtitle={info.reception_time ? info.reception_time.slice(0, 5) : undefined}
                  icon={MapPin}
                  lines={[info.reception_venue, info.reception_address].filter(Boolean)}
                  mapQuery={[info.reception_venue, info.reception_address].filter(Boolean).join(', ')}
                />
              )}
              {(info.dress_code || (info.dress_code_colors?.length > 0) || info.dress_code_image_url) && (
                <DressCodeCard
                  dressCode={info.dress_code}
                  colors={info.dress_code_colors}
                  imageUrl={info.dress_code_image_url}
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Additional info + Accommodation ──────────── */}
      {(info?.additional_info || info?.accommodation_info) && (
        <section className="py-20 px-6" style={{ background: 'color-mix(in srgb, var(--c-blush) 15%, transparent)' }}>
          <div className="max-w-4xl mx-auto">
            <div className="divider-ornament">
              <Heart className="w-3.5 h-3.5" fill="currentColor" style={{ color: 'var(--c-rose)' }} />
            </div>
            <h2 className="section-title">Užitočné informácie</h2>
            <p className="section-subtitle">Všetko čo potrebujete vedieť</p>

            <div className={`grid gap-5 ${info?.additional_info && info?.accommodation_info ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-xl mx-auto'}`}>
              {info?.accommodation_info && (
                <div className="card grain-overlay">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: 'color-mix(in srgb, var(--c-rose) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--c-rose) 20%, transparent)' }}>
                      <BedDouble style={{ width: '1rem', height: '1rem', color: 'var(--c-rose)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-lg text-wine mb-2">Ubytovanie</h3>
                      <p className="text-muted text-sm leading-relaxed whitespace-pre-line">{linkify(info.accommodation_info)}</p>
                    </div>
                  </div>
                </div>
              )}
              {info?.additional_info && (
                <div className="card grain-overlay">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: 'color-mix(in srgb, var(--c-rose) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--c-rose) 20%, transparent)' }}>
                      <Info style={{ width: '1rem', height: '1rem', color: 'var(--c-rose)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-lg text-wine mb-2">Doplnkové info</h3>
                      <p className="text-muted text-sm leading-relaxed whitespace-pre-line">{info.additional_info}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA strip ─────────────────────────────────── */}
      <section className="py-20 px-6 hero-gradient-dark grain-overlay relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
          <Heart className="w-96 h-96 text-white" fill="currentColor" />
        </div>
        <div className="relative max-w-xl mx-auto text-center">
          <Heart className="w-6 h-6 text-rose mx-auto mb-5" fill="currentColor" />
          <h2 className="font-display font-semibold text-4xl text-white/90 mb-3 leading-tight"
              style={{ letterSpacing: '-0.01em' }}>
            Potvrďte svoju účasť
          </h2>
          <p className="text-white/40 text-sm mb-10 font-sans leading-relaxed">
            Prosíme potvrdte čo najskôr, aby sme vedeli zabezpečiť všetko pre váš komfort.
          </p>
          <Link to="/ucast" className="btn-outline-white">Otvoriť formulár</Link>
        </div>
      </section>
    </>
  )
}

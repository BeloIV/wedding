import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Heart, CheckCircle, Gift } from 'lucide-react'
import api from '../../api/axios'
import { useGuestToken } from '../../contexts/GuestTokenContext'

const DIETARY_OPTIONS = [
  { value: 'none', label: 'Bez obmedzení' },
  { value: 'vegetarian', label: 'Vegetarián' },
  { value: 'vegan', label: 'Vegán' },
  { value: 'gluten_free', label: 'Bezlepková diéta' },
  { value: 'other', label: 'Iné' },
]

function emptyPerson(name = '', guestId = null) {
  return { guest_id: guestId, guest_name: name, email: '', attending: null, dietary: 'none', dietary_notes: '', message: '' }
}

function NoButton({ onDecline }) {
  const [escapes, setEscapes] = useState(0)
  const [style, setStyle] = useState({})
  const MAX = 3

  const escape = (e) => {
    e.preventDefault()
    if (escapes >= MAX) { onDecline(); return }
    const next = escapes + 1
    setEscapes(next)
    const dx = (Math.random() - 0.5) * 180
    const dy = (Math.random() - 0.5) * 80
    setStyle({ transform: `translate(${dx}px, ${dy}px)`, transition: 'transform 0.18s ease-out' })
  }

  return (
    <button
      type="button"
      style={style}
      onMouseEnter={escape}
      onClick={escape}
      className={`relative py-3 rounded-xl border-2 text-sm font-medium transition-colors duration-200 ${
        escapes >= MAX
          ? 'border-gray-400 bg-gray-100 text-gray-600'
          : 'border-blush text-muted hover:border-gray-300'
      }`}
    >
      Bohužiaľ nie {escapes > 0 && escapes < MAX ? '😅' : ''}
    </button>
  )
}

function PersonForm({ person, index, onChange, showRemove, onRemove }) {
  const set = (k, v) => onChange(index, { ...person, [k]: v })

  return (
    <div className="space-y-4 pb-6 border-b border-blush last:border-0 last:pb-0">
      {showRemove && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted uppercase tracking-wide font-medium">Osoba {index + 1}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Meno *</label>
        <input
          type="text"
          value={person.guest_name}
          onChange={e => set('guest_name', e.target.value)}
          placeholder="Meno a priezvisko"
          required
          readOnly={person.guest_id != null}
          className={`w-full px-4 py-3 border border-blush rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose transition-all ${person.guest_id != null ? 'bg-blush/20 text-muted' : 'bg-white'}`}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Email *</label>
        <input
          type="email"
          value={person.email}
          onChange={e => set('email', e.target.value)}
          placeholder="vas@email.sk"
          required
          className="w-full px-4 py-3 border border-blush rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose bg-white transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-3">Zúčastníte sa? *</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => set('attending', true)}
            className={`py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
              person.attending === true
                ? 'border-rose bg-rose text-white'
                : 'border-blush text-muted hover:border-rose/50'
            }`}
          >
            Áno, prídem! 🎉
          </button>
          <NoButton onDecline={() => set('attending', false)} />
        </div>
      </div>

      {person.attending === true && (
        <>
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Stravovanie</label>
            <select
              value={person.dietary}
              onChange={e => set('dietary', e.target.value)}
              className="w-full px-4 py-3 border border-blush rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose bg-white transition-all"
            >
              {DIETARY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {person.dietary === 'other' && (
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Upresniť stravovanie</label>
              <input
                type="text"
                value={person.dietary_notes}
                onChange={e => set('dietary_notes', e.target.value)}
                placeholder="Opíšte vaše obmedzenia..."
                className="w-full px-4 py-3 border border-blush rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose bg-white transition-all"
              />
            </div>
          )}
        </>
      )}

      <div>
        <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Správa (voliteľné)</label>
        <textarea
          value={person.message}
          onChange={e => set('message', e.target.value)}
          placeholder="Prianie alebo správa pre novomanželov..."
          rows={3}
          className="w-full px-4 py-3 border border-blush rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose bg-white transition-all resize-none"
        />
      </div>
    </div>
  )
}

export default function RSVPPage() {
  const { token, invitation } = useGuestToken()

  const initialPeople = () => {
    if (invitation?.guests?.length > 0) {
      return invitation.guests.map(g => emptyPerson(g.first_name + ' ' + g.last_name, g.id))
    }
    return [emptyPerson()]
  }

  const [people, setPeople] = useState(initialPeople)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const updatePerson = (i, updated) => {
    setPeople(prev => prev.map((p, idx) => idx === i ? updated : p))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (people.some(p => p.guest_id == null)) { setError('Táto pozvánka nemá priradených hostí. Kontaktujte novomanželov.'); return }
    for (const p of people) {
      if (p.attending === null) { setError('Prosím označte účasť pre každú osobu.'); return }
      if (!p.email) { setError('Email je povinný pre každú osobu.'); return }
    }
    setError('')
    setLoading(true)
    try {
      // one request per guest, sequentially; the server stores one answer per guest, so a retry is safe
      for (const p of people) {
        await api.post('/api/public/rsvp/', {
          guest_id: p.guest_id, email: p.email, attending: p.attending, dietary: p.dietary,
          dietary_notes: p.dietary_notes, message: p.message, invite_token: token || '',
        })
      }
      setSubmitted(true)
    } catch (err) {
      const d = err.response?.data
      const msg = err.response?.status === 429 ? 'Príliš veľa pokusov. Skúste to o chvíľu.'
        : d?.email?.[0] || d?.error || 'Nastala chyba. Skúste to znova.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const anyAttending = people.some(p => p.attending === true)

  if (submitted) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center px-6 pt-16">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-rose/10 rounded-full mb-6">
            <CheckCircle className="w-10 h-10 text-rose" />
          </div>
          <h2 className="font-serif text-4xl text-wine mb-4">
            {anyAttending ? 'Ďakujeme!' : 'Rozumieme'}
          </h2>
          <p className="text-muted leading-relaxed mb-8">
            {anyAttending
              ? 'Tešíme sa na vás! Vaša odpoveď bola zaznamenaná.'
              : 'Škoda, že nebudete môcť prísť. Budeme na vás myslieť.'}
          </p>
          {anyAttending && (
            <Link to="/wishlist" className="btn-secondary inline-flex items-center gap-2 mb-8">
              <Gift className="w-4 h-4" /> Pozrieť zoznam prianí
            </Link>
          )}
          <Heart className="w-8 h-8 text-rose mx-auto" fill="currentColor" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream pt-24 pb-16 px-6">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <div className="divider-ornament">
            <Heart className="w-4 h-4 text-rose" fill="currentColor" />
          </div>
          <h1 className="section-title">Účasť</h1>
          <p className="section-subtitle">Prosíme odpovedzte čo najskôr</p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {people.map((person, i) => (
              <PersonForm
                key={i}
                person={person}
                index={i}
                onChange={updatePerson}
                showRemove={people.length > 1}
                onRemove={() => setPeople(p => p.filter((_, idx) => idx !== i))}
              />
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-rose text-white font-medium rounded-xl hover:bg-rose-dark transition-colors duration-200 disabled:opacity-60 text-sm tracking-wide"
            >
              {loading ? 'Odosielam...' : people.length > 1 ? `Odoslať odpovede (${people.length})` : 'Odoslať odpoveď'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

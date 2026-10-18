import { useState, useEffect } from 'react'
import { Heart, Gift, ExternalLink, Lock, KeyRound } from 'lucide-react'
import api from '../../api/axios'
import { useGuestToken } from '../../contexts/GuestTokenContext'

function WishCard({ item, onReserve, hasToken, guestNames }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleReserve = async () => {
    setLoading(true)
    setError('')
    try {
      await onReserve(item.id)
    } catch (e) {
      setError(e.response?.data?.error || 'Chyba, skúste znova.')
    } finally {
      setLoading(false)
    }
  }

  const priorityColor = {
    high: 'text-rose bg-rose/10',
    medium: 'text-gold bg-gold/10',
    low: 'text-muted bg-muted/10',
  }[item.priority] || 'text-muted bg-muted/10'

  return (
    <div className={`card-hover flex flex-col ${item.reserved ? 'opacity-70' : ''}`}>
      <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-blush/30 flex items-center justify-center">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <Gift className="w-12 h-12 text-rose/30" />
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-serif text-lg text-wine leading-tight">{item.name}</h3>
          {item.category && (
            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor}`}>
              {item.category}
            </span>
          )}
        </div>
        {item.description && <p className="text-muted text-sm mb-3 leading-relaxed">{item.description}</p>}
        {item.price && (
          <p className="text-gold font-medium text-lg mb-3">{Number(item.price).toLocaleString('sk-SK')} €</p>
        )}
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-rose hover:underline mb-4">
            <ExternalLink className="w-3 h-3" />
            Zobraziť produkt
          </a>
        )}
      </div>

      <div className="mt-auto pt-3 border-t border-blush">
        {item.reserved ? (
          <div className="flex items-center gap-2 text-muted">
            <Lock className="w-4 h-4" />
            <span className="text-sm">Už rezervované</span>
          </div>
        ) : !hasToken ? (
          <div className="flex items-center gap-2 text-muted/60 text-xs py-1">
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            <span>Na rezerváciu zadajte kód z pozvánky</span>
          </div>
        ) : (
          <div>
            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
            <button
              onClick={handleReserve}
              disabled={loading}
              className="w-full py-2 border-2 border-rose text-rose text-sm font-medium rounded-lg hover:bg-rose hover:text-white transition-all duration-200 disabled:opacity-60"
            >
              {loading ? '...' : `Darujem ${guestNames ? `(${guestNames})` : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Wishlist() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const { token, invitation } = useGuestToken()

  useEffect(() => {
    api.get('/api/public/wishlist/')
      .then(r => setItems(r.data))
      .finally(() => setLoading(false))
  }, [])

  const onReserve = async (id) => {
    const res = await api.post(`/api/public/wishlist/${id}/reserve/`, { invite_token: token })
    setItems(prev => prev.map(i => i.id === id ? res.data : i))
  }

  const filtered = filter === 'available' ? items.filter(i => !i.reserved)
    : filter === 'reserved' ? items.filter(i => i.reserved)
    : items

  const names = invitation?.names
  const guestNames = names?.length > 0 ? names.join(' a ') : null

  return (
    <div className="min-h-screen bg-cream pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="divider-ornament">
            <Heart className="w-4 h-4 text-rose" fill="currentColor" />
          </div>
          <h1 className="section-title">Zoznam prianí</h1>
          <p className="section-subtitle">Ak chcete, môžete si vybrať darček</p>
        </div>

        {!token && (
          <div className="max-w-md mx-auto mb-8 px-4 py-3 bg-rose/5 border border-rose/20 rounded-xl text-sm text-muted text-center flex items-center justify-center gap-2">
            <KeyRound className="w-4 h-4 text-rose shrink-0" />
            Zadajte kód z pozvánky (tlačidlo v menu) na rezerváciu darčeka.
          </div>
        )}

        <div className="flex justify-center gap-2 mb-8">
          {[
            { key: 'all', label: 'Všetky' },
            { key: 'available', label: 'Dostupné' },
            { key: 'reserved', label: 'Rezervované' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === key ? 'bg-rose text-white shadow-sm' : 'bg-white text-muted border border-blush hover:border-rose/40'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {items.length > 0 && (
          <div className="flex justify-center gap-6 mb-8 text-sm text-muted">
            <span>{items.filter(i => !i.reserved).length} dostupných</span>
            <span className="text-blush">·</span>
            <span>{items.filter(i => i.reserved).length} rezervovaných</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-rose border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Gift className="w-12 h-12 text-rose/30 mx-auto mb-4" />
            <p className="text-muted">Žiadne položky</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map(item => (
              <WishCard key={item.id} item={item} onReserve={onReserve} hasToken={!!token} guestNames={guestNames} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

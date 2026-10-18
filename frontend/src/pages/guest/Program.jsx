import { useState, useEffect } from 'react'
import { Heart, Circle } from 'lucide-react'
import api from '../../api/axios'

const ICONS = {
  ring: '💍',
  church: '⛪',
  camera: '📸',
  champagne: '🥂',
  music: '🎵',
  cake: '🎂',
  dance: '💃',
  food: '🍽️',
  circle: '✦',
  heart: '❤️',
  flower: '🌸',
  car: '🚗',
}

export default function Program() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/public/program/')
      .then(r => setItems(r.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-cream pt-24 pb-16 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <div className="divider-ornament">
            <Heart className="w-4 h-4 text-rose" fill="currentColor" />
          </div>
          <h1 className="section-title">Program svadby</h1>
          <p className="section-subtitle">Plán nášho veľkého dňa</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-rose border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted">Program bude čoskoro zverejnený.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-blush" />

            <div className="space-y-8">
              {items.map((item, idx) => (
                <div key={item.id} className="relative flex gap-6 animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                  {/* Icon bubble */}
                  <div className="relative z-10 flex-shrink-0 w-16 h-16 bg-white border-2 border-blush rounded-full flex items-center justify-center text-2xl shadow-sm">
                    {ICONS[item.icon] || '✦'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-2 pt-2">
                    <p className="text-xs text-rose font-medium tracking-wider mb-1">
                      {item.time.slice(0, 5)}
                    </p>
                    <h3 className="font-serif text-xl text-wine mb-1">{item.title}</h3>
                    {item.description && (
                      <p className="text-muted text-sm leading-relaxed">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Heart, ImageIcon, X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import api from '../../api/axios'

function Lightbox({ photos, index, onClose }) {
  const [cur, setCur] = useState(index)
  const prev = () => setCur(i => (i > 0 ? i - 1 : photos.length - 1))
  const next = () => setCur(i => (i < photos.length - 1 ? i + 1 : 0))

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white p-2">
        <X className="w-6 h-6" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); prev() }} className="absolute left-4 text-white/70 hover:text-white p-2">
        <ChevronLeft className="w-8 h-8" />
      </button>
      <img
        src={photos[cur].image_full_url}
        alt={photos[cur].caption}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
        onClick={e => e.stopPropagation()}
      />
      {photos[cur].caption && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm">
          {photos[cur].caption}
        </p>
      )}
      <button onClick={(e) => { e.stopPropagation(); next() }} className="absolute right-4 text-white/70 hover:text-white p-2">
        <ChevronRight className="w-8 h-8" />
      </button>
    </div>
  )
}

export default function GalleryPage() {
  const [galleries, setGalleries] = useState([])
  const [selected, setSelected] = useState(null)
  const [photos, setPhotos] = useState([])
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/public/galleries/')
      .then(r => setGalleries(r.data))
      .finally(() => setLoading(false))
  }, [])

  const openGallery = async (gallery) => {
    const res = await api.get(`/api/public/galleries/${gallery.id}/`)
    setSelected(gallery)
    setPhotos(res.data.photos || [])
  }

  return (
    <div className="min-h-screen bg-cream pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="divider-ornament">
            <Heart className="w-4 h-4 text-rose" fill="currentColor" />
          </div>
          <h1 className="section-title">Galéria</h1>
          <p className="section-subtitle">Naše spoločné momenty</p>
        </div>

        {selected ? (
          <>
            <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-muted hover:text-wine mb-6 text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Späť na galérie
            </button>
            <h2 className="font-serif text-2xl text-wine mb-6">{selected.name}</h2>
            {photos.length === 0 ? (
              <div className="text-center py-20">
                <ImageIcon className="w-12 h-12 text-rose/30 mx-auto mb-4" />
                <p className="text-muted">Táto galéria je zatiaľ prázdna.</p>
              </div>
            ) : (
              <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
                {photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="break-inside-avoid cursor-pointer rounded-xl overflow-hidden hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxIdx(idx)}
                  >
                    <img src={photo.image_full_url} alt={photo.caption} className="w-full" />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-rose border-t-transparent rounded-full animate-spin" />
          </div>
        ) : galleries.length === 0 ? (
          <div className="text-center py-20">
            <ImageIcon className="w-12 h-12 text-rose/30 mx-auto mb-4" />
            <p className="text-muted">Zatiaľ žiadne galérie.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {galleries.map(gallery => (
              <div
                key={gallery.id}
                className="card-hover cursor-pointer"
                onClick={() => openGallery(gallery)}
              >
                <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-blush/30 flex items-center justify-center">
                  {gallery.cover_url ? (
                    <img src={gallery.cover_url} alt={gallery.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-rose/30" />
                  )}
                </div>
                <h3 className="font-serif text-xl text-wine mb-1">{gallery.name}</h3>
                {gallery.description && <p className="text-muted text-sm mb-2">{gallery.description}</p>}
                <p className="text-xs text-muted">{gallery.photo_count} fotografií</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightboxIdx !== null && (
        <Lightbox photos={photos} index={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </div>
  )
}

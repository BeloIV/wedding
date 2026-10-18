import { useState, useEffect, useRef } from 'react'
import { Plus, Upload, Trash2, X, ImageIcon, ArrowLeft } from 'lucide-react'
import api from '../../api/axios'

export default function GalleryAdmin() {
  const [galleries, setGalleries] = useState([])
  const [selected, setSelected] = useState(null)
  const [photos, setPhotos] = useState([])
  const [newGallery, setNewGallery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    api.get('/api/galleries/').then(r => setGalleries(r.data.results || r.data))
  }, [])

  const createGallery = async (e) => {
    e.preventDefault()
    if (!newGallery.trim()) return
    const res = await api.post('/api/galleries/', { name: newGallery })
    setGalleries(g => [res.data, ...g])
    setNewGallery('')
    setShowForm(false)
  }

  const openGallery = async (gallery) => {
    const res = await api.get(`/api/galleries/${gallery.id}/`)
    setSelected(gallery)
    setPhotos(res.data.photos || [])
  }

  const uploadPhotos = async (files) => {
    setUploading(true)
    for (const file of files) {
      const fd = new FormData()
      fd.append('gallery', selected.id)
      fd.append('image', file)
      try {
        const res = await api.post('/api/photos/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setPhotos(p => [res.data, ...p])
      } catch { }
    }
    setUploading(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    uploadPhotos(Array.from(e.dataTransfer.files))
  }

  const deletePhoto = async (id) => {
    await api.delete(`/api/photos/${id}/`)
    setPhotos(p => p.filter(x => x.id !== id))
  }

  const deleteGallery = async (id) => {
    if (!confirm('Odstrániť galériu aj so všetkými fotkami?')) return
    await api.delete(`/api/galleries/${id}/`)
    setGalleries(g => g.filter(x => x.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8301'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          {selected ? (
            <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-1 text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Galérie
            </button>
          ) : null}
          <h1 className="text-2xl font-bold text-gray-900">
            {selected ? selected.name : 'Galéria'}
          </h1>
        </div>
        {!selected && (
          <button onClick={() => setShowForm(v => !v)} className="admin-btn flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nová galéria
          </button>
        )}
      </div>

      {!selected ? (
        <>
          {showForm && (
            <div className="admin-card mb-4 border-indigo-100">
              <form onSubmit={createGallery} className="flex gap-3">
                <input
                  className="admin-input flex-1"
                  value={newGallery}
                  onChange={e => setNewGallery(e.target.value)}
                  placeholder="Názov galérie (napr. Prípravy, Obrad...)"
                  required
                />
                <button type="submit" className="admin-btn">Vytvoriť</button>
                <button type="button" onClick={() => setShowForm(false)} className="admin-btn-ghost">Zrušiť</button>
              </form>
            </div>
          )}

          {galleries.length === 0 ? (
            <div className="admin-card text-center py-12">
              <ImageIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">Žiadne galérie. Vytvor prvú!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {galleries.map(g => (
                <div key={g.id} className="admin-card cursor-pointer hover:border-indigo-200 transition-all group relative" onClick={() => openGallery(g)}>
                  <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-gray-100 flex items-center justify-center">
                    {g.cover_url ? (
                      <img src={g.cover_url} alt={g.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <h3 className="font-medium text-gray-900">{g.name}</h3>
                  <p className="text-sm text-gray-400">{g.photo_count} fotografií</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteGallery(g.id) }}
                    className="absolute top-3 right-3 admin-btn-danger p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Upload area */}
          <div
            className="border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center mb-6 cursor-pointer hover:border-indigo-400 transition-colors"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
            <p className="text-gray-600 font-medium">{uploading ? 'Nahrávam...' : 'Pretiahnite fotky sem alebo kliknite'}</p>
            <p className="text-gray-400 text-sm mt-1">JPG, PNG, WEBP</p>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={e => uploadPhotos(Array.from(e.target.files))}
            />
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Galéria je prázdna. Nahrajte prvé fotky.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {photos.map(photo => (
                <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={photo.image_full_url || `${API_URL}${photo.image}`}
                    alt={photo.caption}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

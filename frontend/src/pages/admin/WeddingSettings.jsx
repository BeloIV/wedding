import { useState, useEffect, useRef } from 'react'
import { Save, CheckCircle, Plus, X, Upload, Image as ImageIcon, Palette } from 'lucide-react'
import api from '../../api/axios'

const EMPTY = {
  groom_name: '', bride_name: '', wedding_date: '',
  ceremony_venue: '', ceremony_address: '', ceremony_time: '',
  reception_venue: '', reception_address: '', reception_time: '',
  dress_code: '', additional_info: '', accommodation_info: '',
  dress_code_colors: [],
}

const PALETTE_PRESETS = [
  { name: 'Ružová & Zlatá', colors: ['#C9846A', '#E8D5A8', '#F5ECD7', '#8B5E52'] },
  { name: 'Šalvia & Slonová kosť', colors: ['#7D9E8C', '#F5F0E8', '#B5C9BC', '#4A6E5A'] },
  { name: 'Levandľová', colors: ['#9B89C4', '#E8E4F0', '#C4BAE0', '#6B5A9E'] },
  { name: 'Modrá & Zlatá', colors: ['#5B7FA6', '#E8D5A8', '#A8C0D8', '#2C4A6E'] },
  { name: 'Terrakota', colors: ['#C17A5C', '#F0D5C0', '#E8B89A', '#7A3E28'] },
]

export default function WeddingSettings() {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dcImagePreview, setDcImagePreview] = useState(null)
  const [dcImageFile, setDcImageFile] = useState(null)
  const [dcImageCurrent, setDcImageCurrent] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    api.get('/api/wedding-info/').then(r => {
      const d = r.data
      setForm({
        groom_name: d.groom_name || '',
        bride_name: d.bride_name || '',
        wedding_date: d.wedding_date || '',
        ceremony_venue: d.ceremony_venue || '',
        ceremony_address: d.ceremony_address || '',
        ceremony_time: d.ceremony_time ? d.ceremony_time.slice(0, 5) : '',
        reception_venue: d.reception_venue || '',
        reception_address: d.reception_address || '',
        reception_time: d.reception_time ? d.reception_time.slice(0, 5) : '',
        dress_code: d.dress_code || '',
        additional_info: d.additional_info || '',
        accommodation_info: d.accommodation_info || '',
        dress_code_colors: d.dress_code_colors || [],
      })
      if (d.dress_code_image_url) setDcImageCurrent(d.dress_code_image_url)
    })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addColor = () => set('dress_code_colors', [...(form.dress_code_colors || []), '#C9846A'])
  const removeColor = (i) => set('dress_code_colors', form.dress_code_colors.filter((_, j) => j !== i))
  const updateColor = (i, v) => set('dress_code_colors', form.dress_code_colors.map((c, j) => j === i ? v : c))
  const applyPreset = (preset) => set('dress_code_colors', [...preset.colors])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setDcImageFile(file)
    setDcImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (dcImageFile) {
        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => {
          if (k === 'dress_code_colors') fd.append(k, JSON.stringify(v))
          else if (v !== null && v !== undefined) fd.append(k, v)
        })
        fd.append('dress_code_image', dcImageFile)
        await api.put('/api/wedding-info/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        await api.put('/api/wedding-info/', form)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { } finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nastavenia svadby</h1>
        <p className="text-gray-500 text-sm mt-0.5">Tieto informácie sa zobrazujú hosťom</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Couple */}
        <div className="admin-card">
          <h2 className="font-semibold text-gray-900 mb-4">Novomanželia</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Meno ženícha</label>
              <input className="admin-input" value={form.groom_name} onChange={e => set('groom_name', e.target.value)} placeholder="Meno Priezvisko" />
            </div>
            <div>
              <label className="admin-label">Meno nevesty</label>
              <input className="admin-input" value={form.bride_name} onChange={e => set('bride_name', e.target.value)} placeholder="Meno Priezvisko" />
            </div>
          </div>
          <div className="mt-4">
            <label className="admin-label">Dátum svadby</label>
            <input type="date" className="admin-input" value={form.wedding_date} onChange={e => set('wedding_date', e.target.value)} />
          </div>
        </div>

        {/* Ceremony */}
        <div className="admin-card">
          <h2 className="font-semibold text-gray-900 mb-4">Obrad</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="admin-label">Miesto obradu</label>
              <input className="admin-input" value={form.ceremony_venue} onChange={e => set('ceremony_venue', e.target.value)} placeholder="Kostol sv. Martina..." />
            </div>
            <div>
              <label className="admin-label">Čas</label>
              <input type="time" className="admin-input" value={form.ceremony_time} onChange={e => set('ceremony_time', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="admin-label">Adresa</label>
            <textarea className="admin-input resize-none" rows={2} value={form.ceremony_address} onChange={e => set('ceremony_address', e.target.value)} placeholder="Ulica, Mesto, PSČ" />
          </div>
        </div>

        {/* Hostina */}
        <div className="admin-card">
          <h2 className="font-semibold text-gray-900 mb-4">Hostina</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="admin-label">Miesto hostiny</label>
              <input className="admin-input" value={form.reception_venue} onChange={e => set('reception_venue', e.target.value)} placeholder="Hotel Grand..." />
            </div>
            <div>
              <label className="admin-label">Čas</label>
              <input type="time" className="admin-input" value={form.reception_time} onChange={e => set('reception_time', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="admin-label">Adresa</label>
            <textarea className="admin-input resize-none" rows={2} value={form.reception_address} onChange={e => set('reception_address', e.target.value)} placeholder="Ulica, Mesto, PSČ" />
          </div>
        </div>

        {/* Dress Code */}
        <div className="admin-card">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-stone-400" />
            <h2 className="font-semibold text-gray-900">Dress Code</h2>
          </div>
          <div className="space-y-5">
            <div>
              <label className="admin-label">Názov dress codu</label>
              <input className="admin-input" value={form.dress_code} onChange={e => set('dress_code', e.target.value)} placeholder="napr. Smart Casual, Formálne oblečenie..." />
            </div>

            {/* Color palette */}
            <div>
              <label className="admin-label">Farebná paleta</label>
              <p className="text-xs text-stone-400 mb-3">Farby sa zobrazia hosťom a nastavia farebnú tému stránky</p>

              {/* Presets */}
              <div className="flex flex-wrap gap-2 mb-3">
                {PALETTE_PRESETS.map(p => (
                  <button key={p.name} type="button" onClick={() => applyPreset(p)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200 hover:border-stone-300 text-xs text-stone-600 transition-colors bg-white">
                    <div className="flex gap-0.5">
                      {p.colors.map((c,i) => <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />)}
                    </div>
                    {p.name}
                  </button>
                ))}
              </div>

              {/* Current palette */}
              <div className="flex flex-wrap items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                {(form.dress_code_colors || []).map((c, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 group">
                    <div className="relative">
                      <input type="color" value={c} onChange={e => updateColor(i, e.target.value)}
                        className="w-10 h-10 rounded-full cursor-pointer border-2 border-white shadow-sm"
                        style={{ padding: '2px' }} />
                      <button type="button" onClick={() => removeColor(i)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">{c}</span>
                  </div>
                ))}
                {(form.dress_code_colors || []).length < 5 && (
                  <button type="button" onClick={addColor}
                    className="w-10 h-10 rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center text-stone-400 hover:border-stone-400 hover:text-stone-500 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                )}
                {(form.dress_code_colors || []).length === 0 && (
                  <span className="text-xs text-stone-400 italic">Žiadne farby — kliknite + alebo vyberte preset</span>
                )}
              </div>

              {/* Live preview */}
              {(form.dress_code_colors || []).length > 0 && (
                <div className="mt-3 p-3 rounded-xl border border-stone-100 bg-white">
                  <p className="text-xs text-stone-400 mb-2 uppercase tracking-wider">Náhľad</p>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      {form.dress_code_colors.map((c, i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white shadow"
                          style={{ background: c, boxShadow: `0 2px 8px ${c}55` }} />
                      ))}
                    </div>
                    <div className="text-sm font-medium" style={{ color: form.dress_code_colors[0] }}>
                      {form.dress_code || 'Dress Code'}
                    </div>
                    <button type="button" className="ml-auto px-3 py-1 rounded-full text-xs font-medium text-white"
                      style={{ background: form.dress_code_colors[0] }}>
                      Náhľad tlačidla
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Image upload */}
            <div>
              <label className="admin-label">Foto inšpirácia</label>
              <p className="text-xs text-stone-400 mb-2">Obrázok sa zobrazí hosťom ako ukážka dress codu</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {(dcImagePreview || dcImageCurrent) ? (
                <div className="relative rounded-xl overflow-hidden border border-stone-200">
                  <img src={dcImagePreview || dcImageCurrent} alt="Dress code" className="w-full object-cover max-h-48" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg text-xs font-medium text-stone-700">
                      <Upload className="w-3.5 h-3.5" /> Zmeniť
                    </button>
                    <button type="button" onClick={() => { setDcImagePreview(null); setDcImageCurrent(null); setDcImageFile(null) }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-500 rounded-lg text-xs font-medium text-white">
                      <X className="w-3.5 h-3.5" /> Odstrániť
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-stone-200 rounded-xl hover:border-stone-300 transition-colors text-stone-400 hover:text-stone-500">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-sm">Kliknite pre nahratie obrázka</span>
                  <span className="text-xs">JPG, PNG, WEBP</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Other */}
        <div className="admin-card">
          <h2 className="font-semibold text-gray-900 mb-4">Ostatné informácie</h2>
          <div className="space-y-4">
            <div>
              <label className="admin-label">Ubytovanie</label>
              <p className="text-xs text-stone-400 mb-1.5">Odporúčané hotely, ubytovne...</p>
              <textarea className="admin-input resize-none" rows={3} value={form.accommodation_info} onChange={e => set('accommodation_info', e.target.value)} placeholder="Hotel XY, 5 min od sály. Zľava 10% pri zmienke svadby..." />
            </div>
            <div>
              <label className="admin-label">Doplnkové informácie</label>
              <p className="text-xs text-stone-400 mb-1.5">Parkovanie, doprava, iné</p>
              <textarea className="admin-input resize-none" rows={3} value={form.additional_info} onChange={e => set('additional_info', e.target.value)} placeholder="Parkovanie je k dispozícii priamo pri sále..." />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="admin-btn flex items-center gap-2 w-full justify-center py-3 disabled:opacity-60"
        >
          {saved ? (
            <><CheckCircle className="w-4 h-4 text-green-400" /> Uložené!</>
          ) : (
            <><Save className="w-4 h-4" />{loading ? 'Ukladám...' : 'Uložiť nastavenia'}</>
          )}
        </button>
      </form>
    </div>
  )
}

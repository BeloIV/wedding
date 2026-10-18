import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Phone, Mail, Globe, Building2 } from 'lucide-react'
import api from '../../api/axios'

const CATEGORIES = [
  { value: 'venue', label: 'Miesto' },
  { value: 'catering', label: 'Catering' },
  { value: 'flowers', label: 'Kvety & Dekor' },
  { value: 'photography', label: 'Fotografia' },
  { value: 'videography', label: 'Video' },
  { value: 'music', label: 'Hudba & DJ' },
  { value: 'cake', label: 'Svadobná torta' },
  { value: 'attire', label: 'Oblečenie' },
  { value: 'hair_makeup', label: 'Vlasy & Make-up' },
  { value: 'transport', label: 'Doprava' },
  { value: 'other', label: 'Ostatné' },
]

const EMPTY = { name: '', category: 'other', contact_person: '', phone: '', email: '', website: '', contract_signed: false, notes: '' }

function VendorModal({ vendor, onClose, onSave }) {
  const [form, setForm] = useState(vendor?.id ? { ...vendor } : EMPTY)
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form }
      const res = vendor?.id
        ? await api.put(`/api/vendors/${vendor.id}/`, payload)
        : await api.post('/api/vendors/', payload)
      onSave(res.data, vendor?.id ? 'edit' : 'add')
    } catch { } finally { setLoading(false) }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">{vendor?.id ? 'Upraviť' : 'Nový dodávateľ'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Názov *</label>
              <input className="admin-input" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div>
              <label className="admin-label">Kategória</label>
              <select className="admin-select" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="admin-label">Kontaktná osoba</label>
            <input className="admin-input" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Telefón</label>
              <input className="admin-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="admin-label">Email</label>
              <input type="email" className="admin-input" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="admin-label">Web</label>
            <input className="admin-input" value={form.website} onChange={e => set('website', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.contract_signed} onChange={e => set('contract_signed', e.target.checked)} className="accent-indigo-600 w-4 h-4" />
            <span className="text-sm text-gray-700">Zmluva podpísaná</span>
          </label>
          <div>
            <label className="admin-label">Poznámky</label>
            <textarea className="admin-input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="admin-btn flex-1 disabled:opacity-60">
              {loading ? 'Ukladám...' : 'Uložiť'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Zrušiť</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Vendors() {
  const [vendors, setVendors] = useState([])
  const [modal, setModal] = useState(null)
  const [catFilter, setCatFilter] = useState('')

  useEffect(() => {
    api.get('/api/vendors/').then(r => setVendors(r.data.results || r.data))
  }, [])

  const handleSave = (vendor, mode) => {
    if (mode === 'add') setVendors(v => [vendor, ...v])
    else setVendors(v => v.map(x => x.id === vendor.id ? vendor : x))
    setModal(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('Odstrániť dodávateľa?')) return
    await api.delete(`/api/vendors/${id}/`)
    setVendors(v => v.filter(x => x.id !== id))
  }

  const filtered = catFilter ? vendors.filter(v => v.category === catFilter) : vendors

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dodávatelia</h1>
          <p className="text-gray-500 text-sm mt-0.5">Kontakty (fotograf, catering, DJ…). Sumy a platby vedieš vo Výdavkoch.</p>
        </div>
        <button onClick={() => setModal({})} className="admin-btn flex items-center gap-2">
          <Plus className="w-4 h-4" /> Pridať
        </button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setCatFilter('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!catFilter ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
          Všetko
        </button>
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setCatFilter(c.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${catFilter === c.value ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="admin-card text-center py-12">
          <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Žiadni dodávatelia.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(v => (
            <div key={v.id} className="admin-card relative group cursor-pointer" onClick={() => setModal(v)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{v.name}</h3>
                  <span className="badge badge-blue text-xs mt-1">
                    {CATEGORIES.find(c => c.value === v.category)?.label}
                  </span>
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setModal(v)} className="admin-btn-ghost p-1.5"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(v.id)} className="admin-btn-danger p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {v.contact_person && <p className="text-sm text-gray-600 mb-2">{v.contact_person}</p>}

              <div className="space-y-1 mb-3">
                {v.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone className="w-3.5 h-3.5" />
                    <a onClick={e => e.stopPropagation()} href={`tel:${v.phone}`} className="hover:text-gray-900">{v.phone}</a>
                  </div>
                )}
                {v.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail className="w-3.5 h-3.5" />
                    <a onClick={e => e.stopPropagation()} href={`mailto:${v.email}`} className="hover:text-gray-900 truncate">{v.email}</a>
                  </div>
                )}
                {v.website && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Globe className="w-3.5 h-3.5" />
                    <a onClick={e => e.stopPropagation()} href={v.website} target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 truncate">{v.website}</a>
                  </div>
                )}
              </div>

              {v.notes && <p className="text-xs text-gray-400 mb-2 line-clamp-2">{v.notes}</p>}

              <div className="flex gap-2">
                {v.contract_signed && <span className="badge badge-green">Zmluva podpísaná</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <VendorModal vendor={modal} onClose={() => setModal(null)} onSave={handleSave} />
      )}
    </div>
  )
}

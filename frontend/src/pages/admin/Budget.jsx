import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit2, Trash2, X, Wallet, Tag, Check } from 'lucide-react'
import api from '../../api/axios'

const PAYERS = [
  { value: 'couple', label: 'Manželia', color: '#b8706a' },
  { value: 'bride_family', label: 'Rodičia nevesty', color: '#7c9885' },
  { value: 'groom_family', label: 'Rodičia ženícha', color: '#6b7fa3' },
  { value: 'other', label: 'Iné', color: '#a8a29e' },
]
const payerOf = (v) => PAYERS.find(p => p.value === v) || PAYERS[3]
const eur = (n) => Number(n || 0).toLocaleString('sk-SK', { maximumFractionDigits: 0 }) + ' €'
const amountOf = (i) => Number(i.actual_amount ?? i.planned_amount ?? 0)

// normalized {payer: percent} for an item; falls back to legacy single paid_by
const splitOf = (i) => {
  const s = i.paid_split && Object.keys(i.paid_split).length
    ? i.paid_split
    : { [i.paid_by || 'couple']: 100 }
  const out = {}
  PAYERS.forEach(p => { if (s[p.value]) out[p.value] = Number(s[p.value]) })
  return Object.keys(out).length ? out : { couple: 100 }
}

const EMPTY = {
  name: '', category: '', planned_amount: '', actual_amount: '',
  paid_by: 'couple', paid: false, paid_date: '', supplier: null, notes: '',
}

const VENDOR_CATEGORIES = [
  ['venue', 'Miesto'], ['catering', 'Catering'], ['flowers', 'Kvety & Dekor'],
  ['photography', 'Fotografia'], ['videography', 'Video'], ['music', 'Hudba & DJ'],
  ['cake', 'Svadobná torta'], ['attire', 'Oblečenie'], ['hair_makeup', 'Vlasy & Make-up'],
  ['transport', 'Doprava'], ['other', 'Ostatné'],
]

function VendorQuickModal({ vendor, onClose, onCreated }) {
  const [form, setForm] = useState(vendor
    ? { name: vendor.name, category: vendor.category, contact_person: vendor.contact_person || '', phone: vendor.phone || '', email: vendor.email || '' }
    : { name: '', category: 'other', contact_person: '', phone: '', email: '' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = vendor
        ? await api.patch(`/api/vendors/${vendor.id}/`, form)
        : await api.post('/api/vendors/', form)
      onCreated(res.data)
    } catch { } finally { setLoading(false) }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">{vendor ? 'Upraviť dodávateľa' : 'Nový dodávateľ'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Názov *</label>
              <input className="admin-input" value={form.name} required autoFocus onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="admin-label">Kategória</label>
              <select className="admin-select" value={form.category} onChange={e => set('category', e.target.value)}>
                {VENDOR_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="admin-btn flex-1 disabled:opacity-60">
              {loading ? 'Ukladám...' : 'Pridať a vybrať'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Zrušiť</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ItemModal({ item, categories, vendors, onClose, onSave, onVendorCreated, onVendorUpdated }) {
  const [form, setForm] = useState(item?.id
    ? { ...EMPTY, ...item, paid_date: item.paid_date || '', supplier: item.supplier ?? null }
    : { ...EMPTY, category: categories[0]?.id ?? '' })
  const [split, setSplit] = useState(() => {
    const s = item?.id ? splitOf(item) : { couple: 100 }
    return Object.fromEntries(PAYERS.map(p => [p.value, s[p.value] || 0]))
  })
  const [vendorModal, setVendorModal] = useState(false)
  const [editVendor, setEditVendor] = useState(null)
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setPct = (k, v) => setSplit(s => ({ ...s, [k]: Math.max(0, Math.min(100, parseInt(v) || 0)) }))
  const splitTotal = Object.values(split).reduce((a, b) => a + b, 0)

  const submit = async (e) => {
    e.preventDefault()
    if (splitTotal !== 100) return
    setLoading(true)
    try {
      const paid_split = Object.fromEntries(Object.entries(split).filter(([, v]) => v > 0))
      const payload = {
        ...form,
        category: form.category || categories[0]?.id,
        actual_amount: form.actual_amount === '' ? null : form.actual_amount,
        planned_amount: form.planned_amount || 0,
        paid_date: form.paid_date || null,
        supplier: form.supplier || null,
        paid_split,
      }
      const res = item?.id
        ? await api.put(`/api/budget/items/${item.id}/`, payload)
        : await api.post('/api/budget/items/', payload)
      onSave(res.data, item?.id ? 'edit' : 'add')
    } catch { } finally { setLoading(false) }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">{item?.id ? 'Upraviť výdavok' : 'Nový výdavok'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="admin-label">Za čo *</label>
            <input className="admin-input" value={form.name} onChange={e => set('name', e.target.value)} required autoFocus placeholder="napr. Fotograf – celý deň" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Kategória</label>
              <select className="admin-select" value={form.category} onChange={e => set('category', e.target.value)}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="admin-label">Dodávateľ</label>
              <div className="flex gap-1.5">
                <select className="admin-select" value={form.supplier ?? ''} onChange={e => set('supplier', e.target.value ? parseInt(e.target.value) : null)}>
                  <option value="">—</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <button type="button" onClick={() => setVendorModal(true)} title="Nový dodávateľ"
                  className="admin-btn !px-2.5 flex-shrink-0"><Plus className="w-4 h-4" /></button>
                {form.supplier && (
                  <button type="button" onClick={() => setEditVendor(vendors.find(v => v.id === form.supplier) || null)} title="Upraviť dodávateľa"
                    className="admin-btn-ghost !px-2.5 flex-shrink-0 border border-gray-200"><Edit2 className="w-4 h-4" /></button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Plánovaná suma (€)</label>
              <input type="number" step="0.01" className="admin-input" value={form.planned_amount} onChange={e => set('planned_amount', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="admin-label">Skutočná suma (€)</label>
              <input type="number" step="0.01" className="admin-input" value={form.actual_amount ?? ''} onChange={e => set('actual_amount', e.target.value)} placeholder="—" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="admin-label !mb-0">Kto platí (%)</label>
              <span className={`text-xs font-medium ${splitTotal === 100 ? 'text-emerald-600' : 'text-red-500'}`}>
                spolu {splitTotal} %
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PAYERS.map(p => (
                <div key={p.value} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <span className="text-xs text-gray-600 flex-1">{p.label}</span>
                  <input type="number" min={0} max={100} className="admin-input !w-16 !py-1 text-sm text-right"
                    value={split[p.value] || 0} onChange={e => setPct(p.value, e.target.value)} />
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mt-2">
              {[['Manželia 100', { couple: 100 }], ['50/50 rodičia', { bride_family: 50, groom_family: 50 }], ['3× rovnako', { couple: 34, bride_family: 33, groom_family: 33 }]].map(([label, preset]) => (
                <button key={label} type="button" onClick={() => setSplit(Object.fromEntries(PAYERS.map(p => [p.value, preset[p.value] || 0])))}
                  className="text-[11px] px-2 py-0.5 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50">{label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Dátum úhrady</label>
              <input type="date" className="admin-input" value={form.paid_date} onChange={e => set('paid_date', e.target.value)} />
            </div>
            <label className="flex items-end gap-2 cursor-pointer pb-2">
              <input type="checkbox" checked={form.paid} onChange={e => set('paid', e.target.checked)} className="accent-wine w-4 h-4" />
              <span className="text-sm text-gray-700">Zaplatené</span>
            </label>
          </div>
          <div>
            <label className="admin-label">Poznámka</label>
            <textarea className="admin-input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading || splitTotal !== 100} className="admin-btn flex-1 disabled:opacity-60">
              {loading ? 'Ukladám...' : splitTotal !== 100 ? 'Rozdelenie musí byť 100 %' : 'Uložiť'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Zrušiť</button>
          </div>
        </form>
      </div>

      {editVendor && (
        <VendorQuickModal
          vendor={editVendor}
          onClose={() => setEditVendor(null)}
          onCreated={(v) => { onVendorUpdated(v); setEditVendor(null) }}
        />
      )}
      {vendorModal && (
        <VendorQuickModal
          onClose={() => setVendorModal(false)}
          onCreated={(v) => { onVendorCreated(v); set('supplier', v.id); setVendorModal(false) }}
        />
      )}
    </div>
  )
}

function CategoryModal({ categories, onClose, onChanged }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#b8706a')

  const add = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await api.post('/api/budget/categories/', { name, color })
    setName('')
    onChanged()
  }
  const del = async (id) => {
    if (!confirm('Odstrániť kategóriu aj s jej výdavkami?')) return
    await api.delete(`/api/budget/categories/${id}/`)
    onChanged()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Kategórie</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-1.5 mb-4 max-h-60 overflow-y-auto">
          {categories.map(c => (
            <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50">
              <span className="w-3 h-3 rounded-full" style={{ background: c.color }} />
              <span className="text-sm text-gray-700 flex-1">{c.name}</span>
              <button onClick={() => del(c.id)} className="admin-btn-danger p-1"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
        <form onSubmit={add} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="admin-label">Nová kategória</label>
            <input className="admin-input" value={name} onChange={e => setName(e.target.value)} placeholder="napr. Catering" />
          </div>
          <input type="color" className="w-10 h-9 border border-gray-200 rounded-lg cursor-pointer p-0.5" value={color} onChange={e => setColor(e.target.value)} />
          <button type="submit" className="admin-btn">Pridať</button>
        </form>
      </div>
    </div>
  )
}

function PayerBar({ items }) {
  const totals = PAYERS.map(p => ({
    ...p,
    sum: items.reduce((s, i) => {
      const sp = splitOf(i)
      return s + amountOf(i) * (sp[p.value] || 0) / 100
    }, 0),
  }))
  const grand = totals.reduce((s, t) => s + t.sum, 0)
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 mb-3">
        {grand > 0 && totals.map(t => t.sum > 0 && (
          <div key={t.value} style={{ width: `${t.sum / grand * 100}%`, background: t.color }} title={`${t.label}: ${eur(t.sum)}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {totals.map(t => (
          <div key={t.value} className="text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
              <span className="text-gray-500 text-xs">{t.label}</span>
            </div>
            <div className="font-semibold text-gray-900 mt-0.5">{eur(t.sum)}</div>
            <div className="text-xs text-gray-400">{grand > 0 ? Math.round(t.sum / grand * 100) : 0} %</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Budget() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [vendors, setVendors] = useState([])
  const [modal, setModal] = useState(null)
  const [catModal, setCatModal] = useState(false)
  const [fCat, setFCat] = useState('')
  const [fPayer, setFPayer] = useState('')
  const [fPaid, setFPaid] = useState('')

  const load = () => {
    api.get('/api/budget/items/').then(r => setItems(r.data.results || r.data))
    api.get('/api/budget/categories/').then(r => setCategories(r.data.results || r.data))
    api.get('/api/vendors/').then(r => setVendors(r.data.results || r.data))
  }
  useEffect(() => { load() }, [])

  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])

  const saveItem = (it, mode) => {
    setItems(xs => mode === 'add' ? [it, ...xs] : xs.map(x => x.id === it.id ? it : x))
    setModal(null)
  }
  const delItem = async (id) => {
    if (!confirm('Odstrániť výdavok?')) return
    await api.delete(`/api/budget/items/${id}/`)
    setItems(xs => xs.filter(x => x.id !== id))
  }
  const togglePaid = async (it) => {
    const res = await api.patch(`/api/budget/items/${it.id}/`, { paid: !it.paid })
    setItems(xs => xs.map(x => x.id === it.id ? res.data : x))
  }

  const totalPlanned = items.reduce((s, i) => s + Number(i.planned_amount || 0), 0)
  const totalActual = items.reduce((s, i) => s + amountOf(i), 0)
  const totalPaid = items.filter(i => i.paid).reduce((s, i) => s + amountOf(i), 0)

  const filtered = items.filter(i => {
    if (fCat && String(i.category) !== String(fCat)) return false
    if (fPayer && !splitOf(i)[fPayer]) return false
    if (fPaid === 'paid' && !i.paid) return false
    if (fPaid === 'unpaid' && i.paid) return false
    return true
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900">Výdavky</h1>
        <div className="flex gap-2">
          <button onClick={() => setCatModal(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
            <Tag className="w-4 h-4" /> Kategórie
          </button>
          <button onClick={() => setModal({})} disabled={categories.length === 0} className="admin-btn flex items-center gap-2 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Nový výdavok
          </button>
        </div>
      </div>
      <p className="text-gray-500 text-sm mb-6">Za čo sa platí a kto to platí. Kontakty na dodávateľov sú v sekcii Dodávatelia.</p>

      {/* Overview */}
      <div className="admin-card mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {[
            ['Plán spolu', eur(totalPlanned), 'text-gray-900'],
            ['Reálne náklady', eur(totalActual), totalActual > totalPlanned ? 'text-red-600' : 'text-gray-900'],
            ['Zaplatené', eur(totalPaid), 'text-emerald-600'],
            ['Zostáva zaplatiť', eur(totalActual - totalPaid), 'text-amber-600'],
          ].map(([label, val, cls]) => (
            <div key={label}>
              <div className="text-xs text-gray-400 uppercase tracking-wide">{label}</div>
              <div className={`text-xl font-bold mt-0.5 ${cls}`}>{val}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-4 h-4 text-stone-400" />
          <span className="text-sm font-medium text-gray-700">Kto koľko platí</span>
        </div>
        <PayerBar items={items} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select className="admin-select !w-auto text-sm !py-1.5" value={fCat} onChange={e => setFCat(e.target.value)}>
          <option value="">Všetky kategórie</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="admin-select !w-auto text-sm !py-1.5" value={fPayer} onChange={e => setFPayer(e.target.value)}>
          <option value="">Všetci platitelia</option>
          {PAYERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {['', 'paid', 'unpaid'].map(v => (
          <button key={v || 'all'} onClick={() => setFPaid(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${fPaid === v ? 'bg-wine text-parchment' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {v === '' ? 'Všetky' : v === 'paid' ? 'Zaplatené' : 'Nezaplatené'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Za čo', 'Kategória', 'Plán', 'Skutočnosť', 'Kto platí', 'Zapl.', 'Dodávateľ', ''].map((h, idx) => (
                  <th key={idx} className={`px-4 py-3 font-medium text-gray-600 ${idx > 1 && idx < 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                  <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  {items.length === 0 ? 'Zatiaľ žiadne výdavky' : 'Nič nevyhovuje filtru'}
                </td></tr>
              ) : filtered.map(i => {
                const cat = catMap[i.category]
                const sp = splitOf(i)
                const spKeys = Object.keys(sp)
                return (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                    <td className="px-4 py-3">
                      {cat && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                          <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />{cat.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{eur(i.planned_amount)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{i.actual_amount != null ? eur(i.actual_amount) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {spKeys.map(k => {
                          const p = payerOf(k)
                          return (
                            <span key={k} className="inline-flex items-center gap-1.5 text-xs">
                              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                              {p.label}{spKeys.length > 1 && ` ${sp[k]}%`}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => togglePaid(i)}
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${i.paid ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-emerald-400'}`}>
                        {i.paid && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{i.supplier_name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setModal(i)} className="admin-btn-ghost p-1.5"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => delItem(i.id)} className="admin-btn-danger p-1.5"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {categories.length === 0 && (
        <p className="text-sm text-gray-400 mt-4">Najprv pridaj aspoň jednu kategóriu cez tlačidlo „Kategórie".</p>
      )}

      {modal !== null && (
        <ItemModal item={modal} categories={categories} vendors={vendors}
          onClose={() => setModal(null)} onSave={saveItem}
          onVendorCreated={v => setVendors(vs => [...vs, v])}
          onVendorUpdated={v => { setVendors(vs => vs.map(x => x.id === v.id ? v : x)); load?.() }} />
      )}
      {catModal && (
        <CategoryModal categories={categories} onClose={() => setCatModal(false)}
          onChanged={() => { load(); }} />
      )}
    </div>
  )
}

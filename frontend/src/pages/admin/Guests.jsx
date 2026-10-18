import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, Users, Link2, QrCode, Copy, Check } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import api from '../../api/axios'

const RSVP_LABELS = { pending: 'Čaká sa', confirmed: 'Potvrdený', declined: 'Odmietnutý' }
const RSVP_BADGE = { pending: 'badge-yellow', confirmed: 'badge-green', declined: 'badge-red' }
const DIETARY = [
  { value: 'none', label: 'Bez obmedzení' },
  { value: 'vegetarian', label: 'Vegetarián' },
  { value: 'vegan', label: 'Vegán' },
  { value: 'gluten_free', label: 'Bezlepkovo' },
  { value: 'other', label: 'Iné' },
]
const SIDES = [
  { value: 'both', label: 'Obaja' },
  { value: 'bride', label: 'Nevesta' },
  { value: 'groom', label: 'Ženích' },
]
const EMPTY = {
  first_name: '', last_name: '', email: '', phone: '',
  rsvp_status: 'pending', dietary: 'none', dietary_notes: '',
  table_number: '', invited_side: 'both', couple_role: '', notes: '', invitation: null,
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handle} className="p-1 text-gray-400 hover:text-indigo-600 transition-colors" title="Kopírovať">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function QRModal({ token, onClose }) {
  const url = `${window.location.origin}/invite/${token}`
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box max-w-xs text-center" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">QR kód — {token}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex justify-center mb-4 p-4 bg-white border border-gray-100 rounded-xl">
          <QRCodeSVG value={url} size={200} />
        </div>
        <p className="text-xs text-gray-400 break-all mb-3">{url}</p>
        <div className="flex gap-2 justify-center">
          <CopyBtn text={url} />
          <span className="text-xs text-gray-400 self-center">Kopírovať link</span>
        </div>
      </div>
    </div>
  )
}

function InviteGroupModal({ guests, invitations, onClose, onAssign }) {
  const [selected, setSelected] = useState([])
  const [invId, setInvId] = useState('')
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (selected.length === 0) return
    setLoading(true)
    try {
      const inv = await api.post('/api/invitations/', { label })
      await Promise.all(selected.map(gid =>
        api.patch(`/api/guests/${gid}/`, { invitation: inv.data.id })
      ))
      onAssign()
      onClose()
    } catch { } finally { setLoading(false) }
  }

  const handleAssignExisting = async () => {
    if (!invId || selected.length === 0) return
    setLoading(true)
    try {
      await Promise.all(selected.map(gid =>
        api.patch(`/api/guests/${gid}/`, { invitation: parseInt(invId) })
      ))
      onAssign()
      onClose()
    } catch { } finally { setLoading(false) }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Správa pozvánkových skupín</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="mb-4">
          <label className="admin-label">Vybrať hostí (max 7)</label>
          <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-50">
            {guests.map(g => (
              <label key={g.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(g.id)}
                  disabled={!selected.includes(g.id) && selected.length >= 7}
                  onChange={e => setSelected(prev =>
                    e.target.checked ? [...prev, g.id] : prev.filter(x => x !== g.id)
                  )}
                  className="accent-indigo-600"
                />
                <span className="text-sm text-gray-700">{g.first_name} {g.last_name}</span>
                {g.invitation_token && (
                  <span className="ml-auto text-xs font-mono text-gray-400">{g.invitation_token}</span>
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-indigo-50 rounded-xl">
            <p className="text-sm font-medium text-indigo-900 mb-3">Vytvoriť novú skupinu</p>
            <input
              className="admin-input mb-2"
              placeholder="Popis skupiny (voliteľné, napr. Rodina Novákov)"
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
            <button
              onClick={handleCreate}
              disabled={loading || selected.length === 0}
              className="admin-btn w-full disabled:opacity-50"
            >
              {loading ? 'Vytvárám...' : `Vytvoriť skupinu pre ${selected.length} hostí`}
            </button>
          </div>

          {invitations.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-700 mb-3">Pridať do existujúcej skupiny</p>
              <select className="admin-select mb-2" value={invId} onChange={e => setInvId(e.target.value)}>
                <option value="">— Vybrať skupinu —</option>
                {invitations.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.token} {inv.label ? `— ${inv.label}` : ''} ({inv.guest_count} hostí)
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssignExisting}
                disabled={loading || !invId || selected.length === 0}
                className="admin-btn w-full disabled:opacity-50"
              >
                Pridať vybraných
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GuestModal({ guest, invitations, onClose, onSave }) {
  const [form, setForm] = useState(guest?.id ? { ...EMPTY, ...guest, table_number: guest.table_number ?? '', invitation: guest.invitation ?? null } : EMPTY)
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form, table_number: form.table_number || null }
      if (guest?.id) {
        const res = await api.put(`/api/guests/${guest.id}/`, payload)
        onSave(res.data, 'edit')
      } else {
        const res = await api.post('/api/guests/', payload)
        onSave(res.data, 'add')
      }
    } catch { } finally { setLoading(false) }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{guest?.id ? 'Upraviť hosťa' : 'Pridať hosťa'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Meno *</label>
              <input className="admin-input" value={form.first_name} onChange={e => set('first_name', e.target.value)} required placeholder="Meno" />
            </div>
            <div>
              <label className="admin-label">Priezvisko *</label>
              <input className="admin-input" value={form.last_name} onChange={e => set('last_name', e.target.value)} required placeholder="Priezvisko" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Email</label>
              <input type="email" className="admin-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.sk" />
            </div>
            <div>
              <label className="admin-label">Telefón</label>
              <input className="admin-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+421 900 000 000" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="admin-label">RSVP</label>
              <select className="admin-select" value={form.rsvp_status} onChange={e => set('rsvp_status', e.target.value)}>
                <option value="pending">Čaká sa</option>
                <option value="confirmed">Potvrdený</option>
                <option value="declined">Odmietnutý</option>
              </select>
            </div>
            <div>
              <label className="admin-label">Stravovanie</label>
              <select className="admin-select" value={form.dietary} onChange={e => set('dietary', e.target.value)}>
                {DIETARY.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="admin-label">Strana</label>
              <select className="admin-select" value={form.invited_side} onChange={e => set('invited_side', e.target.value)}>
                {SIDES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="admin-label">Kto je to v páre?</label>
            <div className="flex gap-2">
              {[['', 'Nikto (bežný hosť)'], ['groom', 'Ženích'], ['bride', 'Nevesta']].map(([v, l]) => (
                <button key={v || 'none'} type="button" onClick={() => set('couple_role', v)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${form.couple_role === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
            {form.couple_role && (
              <p className="text-xs text-gray-400 mt-1.5">
                Ženích a nevesta sú automaticky administrátori{form.email ? ` (účet na ${form.email})` : ' – doplň e-mail hosťa, aby dostal prístup'}. Meno sa prenesie do nastavení svadby.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Stôl č.</label>
              <input type="number" className="admin-input" value={form.table_number} onChange={e => set('table_number', e.target.value)} placeholder="—" />
            </div>
          </div>
          <div>
            <label className="admin-label">Pozvánková skupina</label>
            <select className="admin-select" value={form.invitation ?? ''} onChange={e => set('invitation', e.target.value ? parseInt(e.target.value) : null)}>
              <option value="">— Bez skupiny —</option>
              {invitations.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.token}{inv.label ? ` — ${inv.label}` : ''} ({inv.guest_count} hostí)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-label">Poznámky</label>
            <textarea className="admin-input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Interné poznámky..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="admin-btn flex-1 disabled:opacity-60">
              {loading ? 'Ukladám...' : guest?.id ? 'Uložiť zmeny' : 'Pridať hosťa'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
              Zrušiť
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Guests() {
  const [guests, setGuests] = useState([])
  const [invitations, setInvitations] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState('')
  const [qrToken, setQrToken] = useState(null)
  const [groupModal, setGroupModal] = useState(false)

  const loadAll = () => {
    api.get('/api/guests/').then(r => setGuests(r.data.results || r.data))
    api.get('/api/invitations/').then(r => setInvitations(r.data.results || r.data))
  }

  useEffect(() => { loadAll() }, [])

  const handleSave = (guest, mode) => {
    if (mode === 'add') setGuests(g => [guest, ...g])
    else setGuests(g => g.map(x => x.id === guest.id ? guest : x))
    setModal(null)
    const acc = guest.admin_account
    if (acc) {
      const who = acc.who === 'groom' ? 'Ženích' : 'Nevesta'
      setNotice(acc.no_email ? `${who} nastavený/á. Bez e-mailu nemá admin účet – doplň ho v detaile hosťa.`
        : acc.created ? (acc.mail_sent ? `${who}: admin účet vytvorený, odkaz na nastavenie hesla odoslaný na ${acc.email}.`
            : `${who}: admin účet vytvorený (${acc.email}), ale e-mail sa nepodarilo odoslať – použi „Zabudnuté heslo“ na prihlásení.`)
        : `${who} nastavený/á, ${acc.email} je administrátor.`)
    }
    // only one groom and one bride: refresh so the previous holder loses the badge
    api.get('/api/guests/').then(r => setGuests(r.data.results || r.data))
    api.get('/api/invitations/').then(r => setInvitations(r.data.results || r.data))
  }

  const handleDelete = async (id) => {
    if (!confirm('Naozaj odstrániť tohto hosťa?')) return
    await api.delete(`/api/guests/${id}/`)
    setGuests(g => g.filter(x => x.id !== id))
  }

  const deleteInvitation = async (id) => {
    if (!confirm('Odstrániť skupinu? Hostia ostanú, len stratia token.')) return
    await api.delete(`/api/invitations/${id}/`)
    loadAll()
  }

  const invMap = Object.fromEntries(invitations.map(inv => [inv.id, inv]))

  const filtered = guests.filter(g => {
    const name = `${g.first_name} ${g.last_name}`.toLowerCase()
    if (search && !name.includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && g.rsvp_status !== statusFilter) return false
    return true
  })

  const inviteUrl = (token) => `${window.location.origin}/invite/${token}`

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hostia</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {guests.length} celkovo · {guests.filter(g => g.rsvp_status === 'confirmed').length} potvrdených
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setGroupModal(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
            <Link2 className="w-4 h-4" /> Pozvánkové skupiny
          </button>
          <button onClick={() => setModal({})} className="admin-btn flex items-center gap-2">
            <Plus className="w-4 h-4" /> Pridať hosťa
          </button>
        </div>
      </div>
      {notice && (
        <div className="mb-4 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-800 flex items-start gap-2">
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice('')} className="text-indigo-400 hover:text-indigo-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Invitation groups summary */}
      {invitations.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {invitations.map(inv => (
            <div key={inv.id} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-xs">
              <span className="font-mono font-bold text-indigo-700">{inv.token}</span>
              {inv.label && <span className="text-indigo-500">— {inv.label}</span>}
              <span className="text-indigo-400">({inv.guest_names?.join(', ') || inv.guest_count + ' hostí'})</span>
              <button onClick={() => setQrToken(inv.token)} className="text-indigo-400 hover:text-indigo-700" title="QR kód">
                <QrCode className="w-3.5 h-3.5" />
              </button>
              <CopyBtn text={inviteUrl(inv.token)} />
              <button onClick={() => deleteInvitation(inv.id)} className="text-indigo-300 hover:text-red-500 ml-1" title="Odstrániť skupinu">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            placeholder="Hľadať hosťa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {['all', 'pending', 'confirmed', 'declined'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {s === 'all' ? 'Všetci' : RSVP_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Meno</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kontakt</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">RSVP</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Stravovanie</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pozvánka</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Stôl</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Žiadni hostia
                  </td>
                </tr>
              ) : filtered.map(g => {
                const inv = g.invitation ? invMap[g.invitation] : null
                return (
                  <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {g.first_name} {g.last_name}
                      {g.couple_role && (
                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${g.couple_role === 'groom' ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}`}>
                          {g.couple_role === 'groom' ? 'Ženích' : 'Nevesta'}
                        </span>
                      )}
                      {g.invited_side !== 'both' && (
                        <span className="ml-2 text-xs text-gray-400">({g.invited_side === 'bride' ? 'N' : 'Ž'})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <div>{g.email}</div>
                      {g.phone && <div className="text-xs">{g.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${RSVP_BADGE[g.rsvp_status]}`}>{RSVP_LABELS[g.rsvp_status]}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {DIETARY.find(d => d.value === g.dietary)?.label || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {inv ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs font-bold text-indigo-600">{inv.token}</span>
                          <button onClick={() => setQrToken(inv.token)} className="text-gray-300 hover:text-indigo-500 transition-colors" title="QR kód">
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          <CopyBtn text={inviteUrl(inv.token)} />
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{g.table_number || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModal(g)} className="admin-btn-ghost p-1.5"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(g.id)} className="admin-btn-danger p-1.5"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && (
        <GuestModal guest={modal} invitations={invitations} onClose={() => setModal(null)} onSave={handleSave} />
      )}
      {qrToken && <QRModal token={qrToken} onClose={() => setQrToken(null)} />}
      {groupModal && (
        <InviteGroupModal
          guests={guests}
          invitations={invitations}
          onClose={() => setGroupModal(false)}
          onAssign={loadAll}
        />
      )}
    </div>
  )
}

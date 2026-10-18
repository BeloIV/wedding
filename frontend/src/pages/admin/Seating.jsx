import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Plus, X, Search, Users, Printer, Trash2, ZoomIn, ZoomOut,
  Armchair, AlertTriangle, RotateCw, UserPlus, ChevronRight,
} from 'lucide-react'
import api from '../../api/axios'

const RSVP_BADGE = { pending: 'badge-yellow', confirmed: 'badge-green', declined: 'badge-red' }

/* debounce helper for position/size saves */
function useDebouncedSave(delay = 400) {
  const timers = useRef({})
  return useCallback((id, payload) => {
    clearTimeout(timers.current[id])
    timers.current[id] = setTimeout(() => {
      api.patch(`/api/tables/${id}/`, payload).catch(() => {})
    }, delay)
  }, [delay])
}

function TableModal({ table, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: table?.name || '',
    capacity: table?.capacity ?? 8,
    shape: table?.shape || 'round',
  })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const base = { ...form, capacity: parseInt(form.capacity) || 1 }
      if (table?.id && (base.capacity !== table.capacity || form.shape !== table.shape)) base.seat_layout = null
      if (!table?.id) {
        base.pos_x = 40 + Math.random() * 120
        base.pos_y = 40 + Math.random() * 120
        base.width = form.shape === 'rect' ? 200 : 130
        base.height = form.shape === 'rect' ? 90 : 130
      }
      const res = table?.id
        ? await api.patch(`/api/tables/${table.id}/`, base)
        : await api.post('/api/tables/', base)
      onSaved(res.data, table?.id ? 'edit' : 'add')
    } catch { } finally { setLoading(false) }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{table?.id ? 'Upraviť stôl' : 'Pridať stôl'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="admin-label">Názov *</label>
            <input className="admin-input" value={form.name} required autoFocus
              onChange={e => set('name', e.target.value)} placeholder="napr. Stôl 1 / Rodina" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Počet miest</label>
              <input type="number" min={1} className="admin-input" value={form.capacity}
                onChange={e => set('capacity', e.target.value)} />
            </div>
            <div>
              <label className="admin-label">Tvar</label>
              <select className="admin-select" value={form.shape} onChange={e => set('shape', e.target.value)}>
                <option value="round">Okrúhly</option>
                <option value="rect">Obdĺžnikový</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="admin-btn flex-1 disabled:opacity-60">
              {loading ? 'Ukladám...' : table?.id ? 'Uložiť' : 'Pridať'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Zrušiť</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* who sits in which seat — pinned guests (g.seat set) keep their index,
   the rest fill the first free seats in order. */
function computeOcc(guests, capacity) {
  const total = Math.max(capacity, guests.length)
  const occ = new Array(total).fill(null)
  // pinned guests first so nobody takes a seat that is pinned to someone else
  const pinned = guests.filter(g => g.seat != null).sort((a, b) => a.seat - b.seat)
  const loose = guests.filter(g => g.seat == null)
  const later = []
  pinned.forEach(g => {
    const i = Math.min(g.seat, total - 1)
    if (occ[i]) later.push(g)
    else occ[i] = { g, name: g.first_name }
  })
  ;[...later, ...loose].forEach(g => {
    const j = occ.indexOf(null)
    if (j >= 0) occ[j] = { g, name: g.first_name }
  })
  return { occ, total }
}

/* visible "held" chip that follows the cursor while dragging a guest */
function setDragGhost(e, text) {
  const el = document.createElement('div')
  el.textContent = text
  Object.assign(el.style, {
    position: 'fixed', top: '-1000px', left: '-1000px', padding: '6px 14px', borderRadius: '9999px',
    background: '#4a1d2a', color: '#fff', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap',
    boxShadow: '0 8px 20px rgba(30,15,8,0.35)', border: '2px solid #fff', fontFamily: 'inherit',
  })
  document.body.appendChild(el)
  e.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2)
  setTimeout(() => el.remove(), 0)
}

/* Rect tables: seat = { side: top|bottom|left|right, t: 0..1 along that edge } */
function defaultLayout(total) {
  const perRow = Math.ceil(total / 2)
  return Array.from({ length: total }, (_, i) => {
    const row = i < perRow ? 0 : 1
    const idx = i - row * perRow
    const count = row === 0 ? perRow : (total - perRow)
    return { side: row === 0 ? 'top' : 'bottom', t: (idx + 1) / (count + 1) }
  })
}
/* Round tables: seat = { a: angle in degrees, 0 = right, -90 = top } */
function defaultRoundLayout(total) {
  return Array.from({ length: total }, (_, i) => ({ a: -90 + (i / total) * 360 }))
}
const defaultLayoutFor = (shape, total) => (shape === 'rect' ? defaultLayout(total) : defaultRoundLayout(total))

function seatXY(s, w, h) {
  if (s.side === 'top') return { x: s.t * w, y: -9 }
  if (s.side === 'bottom') return { x: s.t * w, y: h + 9 }
  if (s.side === 'left') return { x: -9, y: s.t * h }
  return { x: w + 9, y: s.t * h }
}
/* name "place card" sits on the table, just inside the edge, in front of its chair dot */
const LABEL_STYLE = {
  top: { left: 0, top: 18, transform: 'translate(-50%, -50%)' },
  bottom: { left: 0, top: -18, transform: 'translate(-50%, -50%)' },
  left: { left: 12, top: 0, transform: 'translate(0, -50%)' },
  right: { left: -12, top: 0, transform: 'translate(-100%, -50%)' },
}

/* ── A table rendered on the floor plan ──────────────────── */
function FloorTable({ table, guests, zoom, selected, onSelect, onMove, onResize, onRotate, onDropGuest, onDropSeat, editing, onLayout, onRemoveSeat }) {
  const [overSeat, setOverSeat] = useState(null)
  const used = guests.length
  const over = used > table.capacity
  const isRect = table.shape === 'rect'
  const drag = useRef(null)

  const startMove = (e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    onSelect(table.id)
    drag.current = { type: 'move', sx: e.clientX, sy: e.clientY, ox: table.pos_x, oy: table.pos_y }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
  }
  const startResize = (e) => {
    e.stopPropagation()
    drag.current = { type: 'resize', sx: e.clientX, sy: e.clientY, ow: table.width, oh: table.height }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
  }
  const startRotate = (e) => {
    e.stopPropagation()
    drag.current = { type: 'rotate', or: table.rotation, cx: e.clientX, cy: e.clientY }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    if (d.type === 'move') {
      onMove(table.id, d.ox + (e.clientX - d.sx) / zoom, d.oy + (e.clientY - d.sy) / zoom)
    } else if (d.type === 'resize') {
      const w = Math.max(70, d.ow + (e.clientX - d.sx) / zoom)
      const h = isRect ? Math.max(60, d.oh + (e.clientY - d.sy) / zoom) : w
      onResize(table.id, w, h)
    } else if (d.type === 'rotate') {
      onRotate(table.id, Math.round((d.or + (e.clientX - d.cx) / 2) / 5) * 5)
    }
  }
  const endDrag = () => {
    drag.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', endDrag)
  }

  // who sits in which seat — pinned guests (g.seat set) keep their index,
  // the rest fill the first free seats in order. +1 takes the next free seat.
  const w = table.width, h = table.height
  const { occ, total } = computeOcc(guests, table.capacity)

  const layoutArr = table.seat_layout || defaultLayoutFor(table.shape, total)
  const seats = Array.from({ length: total }, (_, i) => {
    const o = occ[i]
    const gid = o ? o.g.id : null
    if (isRect) {
      const l = layoutArr[i] || { side: 'bottom', t: 0.5 }
      return { i, ...seatXY(l, w, h), name: o?.name || null, gid, side: l.side }
    }
    const deg = layoutArr[i]?.a ?? -90 + (i / total) * 360
    const a = (deg * Math.PI) / 180
    const r = Math.max(w, h) / 2 + 9
    return {
      i, x: w / 2 + r * Math.cos(a), y: h / 2 + r * Math.sin(a),
      name: o?.name || null, gid, side: 'round', inx: -Math.cos(a), iny: -Math.sin(a),
    }
  })

  // first time we enter seat editing, freeze the default layout so it can be edited
  useEffect(() => {
    if (editing && !table.seat_layout) onLayout(table.id, layoutArr)
  }, [editing]) // eslint-disable-line

  const seatDrag = useRef(null)
  const startSeatDrag = (e, i) => {
    e.stopPropagation(); e.preventDefault()
    const s0 = seats[i]
    seatDrag.current = { i, sx: e.clientX, sy: e.clientY, x0: s0.x, y0: s0.y, th: table.rotation * Math.PI / 180, layout: layoutArr }
    window.addEventListener('pointermove', onSeatMove)
    window.addEventListener('pointerup', endSeatDrag)
  }
  const onSeatMove = (e) => {
    const d = seatDrag.current
    if (!d) return
    const dx = (e.clientX - d.sx) / zoom, dy = (e.clientY - d.sy) / zoom
    const nx = d.x0 + dx * Math.cos(d.th) + dy * Math.sin(d.th)
    const ny = d.y0 - dx * Math.sin(d.th) + dy * Math.cos(d.th)
    if (!isRect) {
      const deg = (Math.atan2(ny - h / 2, nx - w / 2) * 180) / Math.PI
      onLayout(table.id, d.layout.map((l, idx) => idx === d.i ? { a: Math.round(deg * 10) / 10 } : l))
      return
    }
    const best = [
      { side: 'top', dist: Math.abs(ny + 9), t: nx / w },
      { side: 'bottom', dist: Math.abs(ny - h - 9), t: nx / w },
      { side: 'left', dist: Math.abs(nx + 9), t: ny / h },
      { side: 'right', dist: Math.abs(nx - w - 9), t: ny / h },
    ].sort((p, q) => p.dist - q.dist)[0]
    const t = Math.max(0.04, Math.min(0.96, best.t))
    onLayout(table.id, d.layout.map((l, idx) => idx === d.i ? { side: best.side, t } : l))
  }
  const endSeatDrag = () => {
    seatDrag.current = null
    window.removeEventListener('pointermove', onSeatMove)
    window.removeEventListener('pointerup', endSeatDrag)
  }
  const addSeatAt = (e, side) => {
    e.stopPropagation()
    const horiz = side === 'top' || side === 'bottom'
    const t = Math.max(0.04, Math.min(0.96, (horiz ? e.nativeEvent.offsetX : e.nativeEvent.offsetY) / (horiz ? w : h)))
    onLayout(table.id, [...layoutArr, { side, t }])
  }
  const addSeatOnRing = (e) => {
    e.stopPropagation()
    const half = RING / 2
    const deg = (Math.atan2(e.nativeEvent.offsetY - half, e.nativeEvent.offsetX - half) * 180) / Math.PI
    onLayout(table.id, [...layoutArr, { a: Math.round(deg * 10) / 10 }])
  }
  const EDGE = 22
  const RING = Math.max(w, h) + 2 * EDGE + 14

  return (
    <div
      className="absolute select-none"
      style={{ left: table.pos_x, top: table.pos_y, width: table.width, height: table.height, transform: `rotate(${table.rotation}deg)` }}
    >
      {editing && !isRect && (
        // clickable ring around a round table: click = add a seat at that angle
        <div onPointerDown={e => e.stopPropagation()} onClick={addSeatOnRing}
          title="Klikni = pridať miesto"
          className="absolute rounded-full bg-wine/10 hover:bg-wine/20 border border-dashed border-wine/40 cursor-copy z-0"
          style={{ width: RING, height: RING, left: w / 2 - RING / 2, top: h / 2 - RING / 2 }} />
      )}
      {editing && isRect && [
        ['top', { left: 0, top: -EDGE, width: w, height: EDGE }],
        ['bottom', { left: 0, top: h, width: w, height: EDGE }],
        ['left', { left: -EDGE, top: 0, width: EDGE, height: h }],
        ['right', { left: w, top: 0, width: EDGE, height: h }],
      ].map(([side, st]) => (
        <div key={side} onPointerDown={e => e.stopPropagation()} onClick={e => addSeatAt(e, side)}
          title="Klikni = pridať miesto"
          className="absolute rounded bg-wine/10 hover:bg-wine/25 border border-dashed border-wine/40 cursor-copy z-0"
          style={st} />
      ))}
      {seats.map((s) => (
        <div key={s.i} className="absolute z-[5]" style={{ left: s.x, top: s.y, transform: `rotate(${-table.rotation}deg)` }}>
          <div
            draggable={!editing && s.gid != null}
            onPointerDown={e => { if (editing) startSeatDrag(e, s.i); else if (s.gid != null) e.stopPropagation() }}
            onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData('guest', String(s.gid)); e.dataTransfer.effectAllowed = 'move'; const gg = guests.find(g => g.id === s.gid); setDragGhost(e, gg ? `${gg.first_name} ${gg.last_name}` : s.name) }}
            onDragOver={e => { e.preventDefault(); setOverSeat(s.i) }}
            onDragLeave={() => setOverSeat(null)}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); setOverSeat(null); const id = e.dataTransfer.getData('guest'); if (id) onDropSeat(parseInt(id), table.id, s.i) }}
            title={s.name ? `${s.name} – chyť a presuň na iné miesto` : `Voľné miesto ${s.i + 1}`}
            className={`-ml-3 -mt-3 w-6 h-6 flex items-center justify-center ${editing ? 'cursor-move' : s.gid != null ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            <span
              className={`block rounded-full border transition-all pointer-events-none
                ${overSeat === s.i ? 'w-4 h-4 ring-2 ring-wine/50' : 'w-3 h-3'}
                ${editing ? 'ring-2 ring-wine/60' : ''}
                ${s.name ? 'bg-wine border-wine' : 'bg-white border-stone-300'}`}
            />
            {editing && (
              <button type="button"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onRemoveSeat(table.id, s.i) }}
                title="Zrušiť miesto"
                className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] leading-none flex items-center justify-center shadow">×</button>
            )}
          </div>
          {s.name && (
            <span
              draggable={s.gid != null}
              onPointerDown={e => { if (s.gid != null) e.stopPropagation() }}
              onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData('guest', String(s.gid)); e.dataTransfer.effectAllowed = 'move'; const gg = guests.find(g => g.id === s.gid); setDragGhost(e, gg ? `${gg.first_name} ${gg.last_name}` : s.name) }}
              onDragOver={e => { e.preventDefault(); setOverSeat(s.i) }}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); setOverSeat(null); const id = e.dataTransfer.getData('guest'); if (id) onDropSeat(parseInt(id), table.id, s.i) }}
              className={`absolute text-[11px] leading-none font-medium text-wine whitespace-nowrap bg-white border border-stone-300 shadow-sm px-2 py-1 rounded-full max-w-[76px] truncate ${s.gid != null ? 'cursor-grab' : ''} ${editing ? 'pointer-events-none' : ''}`}
              style={s.side === 'round'
                ? { left: s.inx * 24, top: s.iny * 24, transform: 'translate(-50%, -50%)' }
                : LABEL_STYLE[s.side]}
            >
              {s.name}
            </span>
          )}
        </div>
      ))}
      <div
        onPointerDown={startMove}
        onDragOver={e => { e.preventDefault() }}
        onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('guest'); if (id) onDropGuest(parseInt(id), table.id) }}
        className={`relative w-full h-full flex flex-col items-center justify-center text-center cursor-move transition-shadow
          ${isRect ? 'rounded-xl' : 'rounded-full'}
          ${selected ? 'ring-2 ring-wine shadow-lg z-10' : 'ring-1 ring-stone-300'}
          ${over ? 'bg-red-50' : 'bg-white'}`}
        style={{ boxShadow: '0 2px 10px rgba(30,15,8,0.10)' }}
      >
        <span className="font-semibold text-gray-800 text-sm px-2 leading-tight truncate max-w-full">{table.name}</span>
        <span className={`text-xs mt-0.5 flex items-center gap-0.5 ${over ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
          {over && <AlertTriangle className="w-3 h-3" />}{used}/{table.capacity}
        </span>
      </div>

      {selected && (
        <>
          {/* resize handle */}
          <div onPointerDown={startResize}
            className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-wine rounded-full cursor-nwse-resize border-2 border-white" />
          {/* rotate handle (rect only) */}
          {isRect && (
            <div onPointerDown={startRotate}
              className="absolute left-1/2 -translate-x-1/2 -top-7 w-5 h-5 bg-white border border-stone-300 rounded-full flex items-center justify-center cursor-grab shadow-sm">
              <RotateCw className="w-3 h-3 text-stone-500" />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function GuestRow({ guest, draggable, onDragStart, action, onAction, seatLabel }) {
  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart(e, guest) : undefined}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-sm bg-white border-stone-200
        ${draggable ? 'cursor-grab active:cursor-grabbing hover:border-wine/40' : ''}`}
    >
      {seatLabel && <span className="text-[10px] font-mono text-wine bg-wine/10 rounded px-1 py-0.5 flex-shrink-0">{seatLabel}</span>}
      <span className="truncate flex-1 text-gray-700">{guest.first_name} {guest.last_name}</span>
      {guest.rsvp_status !== 'confirmed' && (
        <span className={`badge ${RSVP_BADGE[guest.rsvp_status]} !px-1.5 !py-0`}>
          {guest.rsvp_status === 'pending' ? '?' : '✕'}
        </span>
      )}
      {action && (
        <button onClick={() => onAction(guest)} className="admin-btn-ghost !p-1" title={action}>
          {action === 'add' ? <Plus className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  )
}

export default function Seating() {
  const [guests, setGuests] = useState([])
  const [tables, setTables] = useState([])
  const [modal, setModal] = useState(null)
  const [selId, setSelId] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [search, setSearch] = useState('')
  const [quick, setQuick] = useState('')
  const [editId, setEditId] = useState(null)
  const save = useDebouncedSave()

  const load = () => {
    api.get('/api/guests/').then(r => setGuests(r.data.results || r.data))
    api.get('/api/tables/').then(r => setTables(r.data.results || r.data))
  }
  useEffect(() => { load() }, [])

  const byTable = useMemo(() => {
    const m = { pool: [] }
    tables.forEach(t => { m[t.id] = [] })
    guests.forEach(g => {
      if (g.table_number && m[g.table_number]) m[g.table_number].push(g)
      else m.pool.push(g)
    })
    return m
  }, [guests, tables])

  const patchTableLocal = (id, patch) => setTables(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t))

  const onMove = (id, x, y) => { patchTableLocal(id, { pos_x: x, pos_y: y }); save(id, { pos_x: x, pos_y: y }) }
  const onResize = (id, width, height) => { patchTableLocal(id, { width, height }); save(id, { width, height }) }
  const onRotate = (id, rotation) => { patchTableLocal(id, { rotation }); save(id, { rotation }) }

  const onLayout = (id, layout) => {
    const capacity = Math.max(1, layout.length)
    patchTableLocal(id, { seat_layout: layout, capacity }); save(id, { seat_layout: layout, capacity })
  }
  const onRemoveSeat = (id, idx) => {
    const t = tables.find(x => x.id === id)
    if (!t) return
    const { total } = computeOcc(byTable[id] || [], t.capacity)
    const layout = (t.seat_layout || defaultLayoutFor(t.shape, total)).filter((_, i) => i !== idx)
    if (layout.length === 0) return
    onLayout(id, layout)
    // pinned guests: free the removed seat, shift later ones down
    const changes = (byTable[id] || []).filter(g => g.seat != null && g.seat >= idx)
      .map(g => ({ id: g.id, seat: g.seat === idx ? null : g.seat - 1 }))
    if (changes.length) {
      setGuests(gs => gs.map(g => { const c = changes.find(x => x.id === g.id); return c ? { ...g, seat: c.seat } : g }))
      changes.forEach(c => api.patch(`/api/guests/${c.id}/`, { seat: c.seat }).catch(() => load()))
    }
  }

  const assign = async (guestId, tableId, seat) => {
    const target = tableId === 'pool' ? null : tableId
    const dragged = guests.find(g => g.id === guestId)
    const payload = { table_number: target, seat: target == null || seat == null ? null : seat }

    // if dropping onto an occupied seat, displace that guest (swap seats if same table)
    let displaced = null
    if (target != null && seat != null) {
      displaced = guests.find(g => g.id !== guestId && g.table_number === target && g.seat === seat)
    }
    const dispSeat = displaced
      ? (dragged && dragged.table_number === target ? (dragged.seat ?? null) : null)
      : null

    setGuests(gs => gs.map(g => {
      if (g.id === guestId) return { ...g, ...payload }
      if (displaced && g.id === displaced.id) return { ...g, seat: dispSeat }
      return g
    }))
    try {
      if (displaced) await api.patch(`/api/guests/${displaced.id}/`, { seat: dispSeat })
      await api.patch(`/api/guests/${guestId}/`, payload)
    } catch { load() }
  }

  // Reorder within / into a table by seat index. The guest currently sitting there
  // (if any) takes the dragged guest's old seat (swap) or goes unpinned.
  const moveToSeat = async (guestId, tableId, idx) => {
    const tGuests = byTable[tableId] || []
    const { occ } = computeOcc(tGuests, tables.find(t => t.id === tableId)?.capacity || 0)
    const dragged = guests.find(g => g.id === guestId)
    if (!dragged) return
    const prev = dragged.table_number === tableId
      ? occ.findIndex(o => o && o.g.id === guestId) : -1
    const other = occ[idx]?.g
    if (other && other.id === guestId) return
    const otherSeat = other ? (prev >= 0 ? prev : null) : undefined
    setGuests(gs => gs.map(g => {
      if (g.id === guestId) return { ...g, table_number: tableId, seat: idx }
      if (other && g.id === other.id) return { ...g, seat: otherSeat }
      return g
    }))
    try {
      if (other) await api.patch(`/api/guests/${other.id}/`, { seat: otherSeat })
      await api.patch(`/api/guests/${guestId}/`, { table_number: tableId, seat: idx })
    } catch { load() }
  }

  const onDragStart = (e, guest) => { e.dataTransfer.setData('guest', String(guest.id)); e.dataTransfer.effectAllowed = 'move'; setDragGhost(e, `${guest.first_name} ${guest.last_name}`) }

  const handleSaved = (table, mode) => {
    setTables(ts => mode === 'add' ? [...ts, table] : ts.map(t => t.id === table.id ? table : t))
    setModal(null)
    if (mode === 'add') setSelId(table.id)
  }

  const deleteTable = async (t) => {
    if (!confirm(`Odstrániť "${t.name}"? Hostia sa vrátia medzi neusadených.`)) return
    await api.delete(`/api/tables/${t.id}/`)
    setTables(ts => ts.filter(x => x.id !== t.id))
    setGuests(gs => gs.map(g => g.table_number === t.id ? { ...g, table_number: null } : g))
    setSelId(null)
  }

  const quickAdd = async () => {
    const parts = quick.trim().split(/\s+/)
    if (!parts[0] || !selId) return
    const res = await api.post('/api/guests/', {
      first_name: parts[0], last_name: parts.slice(1).join(' '), table_number: selId,
    })
    setGuests(gs => [...gs, res.data])
    setQuick('')
  }

  const sel = tables.find(t => t.id === selId)
  const poolFiltered = byTable.pool
    .filter(g => `${g.first_name} ${g.last_name}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.last_name.localeCompare(b.last_name, 'sk'))

  const seated = guests.filter(g => g.table_number).length
  const total = guests.length

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zasadací poriadok</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {seated}/{total} usadených · {tables.length} stolov · ťahaj stoly aj hostí myšou
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center border border-gray-200 rounded-lg">
            <button onClick={() => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(2)))} className="p-2 hover:bg-gray-50"><ZoomOut className="w-4 h-4" /></button>
            <span className="text-xs text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)))} className="p-2 hover:bg-gray-50"><ZoomIn className="w-4 h-4" /></button>
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
            <Printer className="w-4 h-4" /> Tlačiť
          </button>
          <button onClick={() => setModal({})} className="admin-btn flex items-center gap-2">
            <Plus className="w-4 h-4" /> Pridať stôl
          </button>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* Floor plan */}
        <div
          onPointerDown={() => setSelId(null)}
          className="flex-1 admin-card p-0 overflow-auto relative bg-[#faf7f2]"
          style={{ height: 'calc(100vh - 11rem)' }}
        >
          <div
            className="relative"
            style={{
              width: 1600, height: 1100,
              transform: `scale(${zoom})`, transformOrigin: '0 0',
              backgroundImage: 'radial-gradient(circle, #e7ddd0 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          >
            {tables.map(t => (
              <FloorTable
                key={t.id} table={t} guests={byTable[t.id] || []} zoom={zoom}
                selected={t.id === selId}
                onSelect={setSelId} onMove={onMove} onResize={onResize} onRotate={onRotate}
                onDropGuest={assign} onDropSeat={moveToSeat}
                editing={t.id === selId && t.id === editId} onLayout={onLayout} onRemoveSeat={onRemoveSeat}
              />
            ))}
            {tables.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
                <Armchair className="w-10 h-10 mb-2 opacity-30" />
                Pridaj prvý stôl
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-72 flex-shrink-0 space-y-4 print:hidden">
          {sel ? (
            <div className="admin-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Armchair className="w-4 h-4 text-stone-400" />
                <h2 className="font-semibold text-gray-800 text-sm flex-1 truncate">{sel.name}</h2>
                <button onClick={() => setModal(sel)} className="admin-btn-ghost !p-1 text-xs">Upraviť</button>
                <button onClick={() => deleteTable(sel)} className="admin-btn-danger !p-1"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                {(byTable[sel.id] || []).length} / {sel.capacity} miest · {sel.shape === 'rect' ? 'obdĺžnik' : 'kruh'}
              </p>
              <div className="space-y-1.5 mb-3">
                {(byTable[sel.id] || []).length === 0
                  ? <p className="text-xs text-gray-400">Zatiaľ nikto. Pridaj nižšie alebo pretiahni z „Neusadení".</p>
                  : [...(byTable[sel.id] || [])]
                      .sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99))
                      .map(g => (
                        <GuestRow key={g.id} guest={g} action="remove" onAction={gg => assign(gg.id, 'pool')}
                          seatLabel={g.seat != null ? `#${g.seat + 1}` : null} />
                      ))}
                {(
                  <div className="pt-1">
                    <button onClick={() => setEditId(editId === sel.id ? null : sel.id)}
                      className={editId === sel.id ? 'admin-btn w-full' : 'w-full px-3 py-1.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50'}>
                      {editId === sel.id ? 'Hotovo' : 'Upraviť miesta pri stole'}
                    </button>
                    {editId === sel.id && (
                      <p className="text-[11px] text-gray-500 mt-1.5">{sel.shape === 'rect'
                        ? 'Klikni na okraj stola = pridať miesto · ťahaj guľôčku = presunúť (aj na inú stranu) · červené × = zrušiť.'
                        : 'Klikni na kruh okolo stola = pridať miesto · ťahaj guľôčku po kruhu = presunúť · červené × = zrušiť.'}</p>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-gray-400">Hostí presúvaj priamo pri stole: chyť meno pri guľôčke a pusť na iné miesto.</p>
              </div>
              <div className="flex gap-1.5">
                <input className="admin-input !py-1.5 text-sm" placeholder="Meno Priezvisko"
                  value={quick} onChange={e => setQuick(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && quickAdd()} />
                <button onClick={quickAdd} className="admin-btn !px-2.5"><UserPlus className="w-4 h-4" /></button>
              </div>
            </div>
          ) : (
            <div className="admin-card p-4 text-sm text-gray-400 flex items-center gap-2">
              <ChevronRight className="w-4 h-4" /> Klikni na stôl pre detail
            </div>
          )}

          {/* Unassigned */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={e => { const id = e.dataTransfer.getData('guest'); if (id) assign(parseInt(id), 'pool') }}
            className="admin-card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-stone-400" />
              <h2 className="font-semibold text-gray-800 text-sm">Neusadení</h2>
              <span className="badge badge-gray ml-auto">{byTable.pool.length}</span>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input className="admin-input !pl-8 !py-1.5 text-sm" placeholder="Hľadať..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="space-y-1.5 max-h-[calc(100vh-26rem)] overflow-y-auto pr-1">
              {poolFiltered.length === 0
                ? <p className="text-xs text-gray-400 text-center py-4">
                    {byTable.pool.length === 0 ? 'Všetci sú usadení 🎉' : 'Nič sa nenašlo'}
                  </p>
                : poolFiltered.map(g => (
                  <GuestRow key={g.id} guest={g} draggable onDragStart={onDragStart}
                    action={sel ? 'add' : null} onAction={gg => assign(gg.id, sel.id)} />
                ))}
            </div>
            {sel && <p className="text-[11px] text-gray-400 mt-2">＋ posadí k stolu „{sel.name}"</p>}
          </div>
        </div>
      </div>

      {modal !== null && (
        <TableModal table={modal} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
    </div>
  )
}

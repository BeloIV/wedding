import { useState, useEffect } from 'react'
import { Plus, Trash2, CheckSquare, Square, Filter, ChevronRight, Pencil, ChevronsUpDown } from 'lucide-react'
import api from '../../api/axios'

const PRIORITY_LABELS = { low: 'Nízka', medium: 'Stredná', high: 'Vysoká' }
const PRIORITY_DOT = { high: 'bg-red-400', medium: 'bg-yellow-400', low: 'bg-gray-300' }
const CATEGORIES = [
  { value: '', label: 'Všetky' },
  { value: 'venue', label: 'Miesto' },
  { value: 'catering', label: 'Catering' },
  { value: 'flowers', label: 'Kvety & Dekor' },
  { value: 'music', label: 'Hudba' },
  { value: 'photography', label: 'Fotografia' },
  { value: 'attire', label: 'Oblečenie' },
  { value: 'invitations', label: 'Pozývky' },
  { value: 'travel', label: 'Cestovanie' },
  { value: 'legal', label: 'Papierovanie' },
  { value: 'other', label: 'Ostatné' },
]

const EMPTY = { title: '', category: 'other', priority: 'medium', due_date: '', description: '', notes: '' }

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '—'

function dueState(task) {
  if (!task.due_date || task.completed) return null
  const days = Math.ceil((new Date(task.due_date + 'T00:00:00') - new Date().setHours(0, 0, 0, 0)) / 86400000)
  if (days < 0) return { text: `po termíne o ${-days} d`, cls: 'text-red-500' }
  if (days === 0) return { text: 'dnes', cls: 'text-amber-600' }
  if (days <= 7) return { text: `o ${days} d`, cls: 'text-amber-600' }
  return { text: `o ${days} d`, cls: 'text-gray-400' }
}

function TaskDetail({ task, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const start = () => {
    setForm({ title: task.title, description: task.description || '', notes: task.notes || '',
      category: task.category, priority: task.priority, due_date: task.due_date || '' })
    setEditing(true)
  }
  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(task, { ...form, due_date: form.due_date || null })
      setEditing(false)
    } finally { setSaving(false) }
  }
  const due = dueState(task)

  if (editing) return (
    <form onSubmit={save} className="space-y-3 pt-1">
      <div>
        <label className="admin-label">Názov *</label>
        <input className="admin-input" value={form.title} onChange={e => set('title', e.target.value)} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="admin-label">Kategória</label>
          <select className="admin-select" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="admin-label">Priorita</label>
          <select className="admin-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="high">Vysoká</option><option value="medium">Stredná</option><option value="low">Nízka</option>
          </select>
        </div>
        <div>
          <label className="admin-label">Deadline</label>
          <input type="date" className="admin-input" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="admin-label">Popis</label>
        <textarea className="admin-input resize-none" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div>
        <label className="admin-label">Poznámky</label>
        <textarea className="admin-input resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="admin-btn disabled:opacity-60">{saving ? 'Ukladám...' : 'Uložiť'}</button>
        <button type="button" onClick={() => setEditing(false)} className="admin-btn-ghost">Zrušiť</button>
      </div>
    </form>
  )

  return (
    <div className="space-y-3 pt-1 text-sm">
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
        <div><dt className="text-gray-400">Kategória</dt><dd className="text-gray-700">{CATEGORIES.find(c => c.value === task.category)?.label}</dd></div>
        <div><dt className="text-gray-400">Priorita</dt>
          <dd className="text-gray-700 flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]}`} />{PRIORITY_LABELS[task.priority]}</dd></div>
        <div><dt className="text-gray-400">Deadline</dt>
          <dd className="text-gray-700">{fmtDate(task.due_date)} {due && <span className={due.cls}>({due.text})</span>}</dd></div>
        <div><dt className="text-gray-400">{task.completed ? 'Dokončené' : 'Vytvorené'}</dt>
          <dd className="text-gray-700">{fmtDate(task.completed ? task.completed_at : task.created_at)}</dd></div>
      </dl>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">Popis</p>
        <p className="text-gray-700 whitespace-pre-line">{task.description || <span className="text-gray-300">—</span>}</p>
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">Poznámky</p>
        <p className="text-gray-700 whitespace-pre-line">{task.notes || <span className="text-gray-300">—</span>}</p>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={start} className="admin-btn-ghost flex items-center gap-1.5 text-xs border border-gray-200"><Pencil className="w-3.5 h-3.5" /> Upraviť</button>
        <button onClick={() => onDelete(task.id)} className="admin-btn-danger flex items-center gap-1.5 text-xs px-2.5 py-1.5"><Trash2 className="w-3.5 h-3.5" /> Zmazať</button>
      </div>
    </div>
  )
}

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)
  const [catFilter, setCatFilter] = useState('')
  const [showDone, setShowDone] = useState(false)
  // several tasks can be open at the same time
  const [open, setOpen] = useState(() => new Set())
  const toggleOpen = (id) => setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  useEffect(() => {
    api.get('/api/tasks/').then(r => setTasks(r.data.results || r.data))
  }, [])

  const addTask = async (e) => {
    e.preventDefault()
    const payload = { ...form, due_date: form.due_date || null }
    const res = await api.post('/api/tasks/', payload)
    setTasks(t => [res.data, ...t])
    setForm(EMPTY)
    setShowForm(false)
  }

  const toggleDone = async (task) => {
    const res = await api.patch(`/api/tasks/${task.id}/`, { completed: !task.completed })
    setTasks(t => t.map(x => x.id === task.id ? res.data : x))
  }

  const saveTask = async (task, patch) => {
    const res = await api.patch(`/api/tasks/${task.id}/`, patch)
    setTasks(t => t.map(x => x.id === task.id ? res.data : x))
  }

  const deleteTask = async (id) => {
    if (!confirm('Zmazať úlohu?')) return
    await api.delete(`/api/tasks/${id}/`)
    setTasks(t => t.filter(x => x.id !== id))
    setOpen(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  const filtered = tasks.filter(t => {
    if (catFilter && t.category !== catFilter) return false
    if (!showDone && t.completed) return false
    return true
  })

  const done = tasks.filter(t => t.completed).length
  const pct = tasks.length > 0 ? Math.round(done / tasks.length * 100) : 0

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Úlohy</h1>
          <p className="text-gray-500 text-sm mt-0.5">{done} / {tasks.length} dokončených</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="admin-btn flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nová úloha
        </button>
      </div>

      {/* Progress */}
      <div className="admin-card mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Postup</span>
          <span className="font-semibold text-gray-900">{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="admin-card mb-4 border-indigo-100">
          <form onSubmit={addTask} className="space-y-3">
            <div>
              <label className="admin-label">Názov *</label>
              <input className="admin-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Čo treba urobiť?" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="admin-label">Kategória</label>
                <select className="admin-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="admin-label">Priorita</label>
                <select className="admin-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="high">Vysoká</option>
                  <option value="medium">Stredná</option>
                  <option value="low">Nízka</option>
                </select>
              </div>
              <div>
                <label className="admin-label">Deadline</label>
                <input type="date" className="admin-input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="admin-label">Popis</label>
              <textarea className="admin-input resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="admin-btn">Pridať úlohu</button>
              <button type="button" onClick={() => setShowForm(false)} className="admin-btn-ghost">Zrušiť</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCatFilter(c.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              catFilter === c.value ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {c.label}
          </button>
        ))}
        <button
          onClick={() => setOpen(prev => prev.size >= filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(t => t.id)))}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-500 flex items-center gap-1"
        >
          <ChevronsUpDown className="w-3 h-3" />
          {open.size >= filtered.length && filtered.length > 0 ? 'Zbaliť všetko' : 'Rozbaliť všetko'}
        </button>
        <button
          onClick={() => setShowDone(v => !v)}
          className={` px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
            showDone ? 'bg-gray-200 text-gray-700' : 'bg-white border border-gray-200 text-gray-500'
          }`}
        >
          <Filter className="w-3 h-3" />
          {showDone ? 'Skryť hotové' : 'Zobraziť hotové'}
        </button>
      </div>

      {/* Task list */}
      <div className="space-y-1">
        {filtered.length === 0 ? (
          <div className="admin-card text-center py-10">
            <CheckSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Žiadne úlohy</p>
          </div>
        ) : filtered.map(task => {
          const isOpen = open.has(task.id)
          const due = dueState(task)
          return (
            <div
              key={task.id}
              className={`bg-white border rounded-xl transition-all duration-200 ${
                task.completed ? 'border-gray-100 opacity-60' : isOpen ? 'border-indigo-200 shadow-sm' : 'border-gray-100 hover:border-indigo-100 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none" onClick={() => toggleOpen(task.id)}>
                <button onClick={e => { e.stopPropagation(); toggleDone(task) }} className="flex-shrink-0 text-gray-400 hover:text-indigo-600 transition-colors" title={task.completed ? 'Vrátiť späť' : 'Hotovo'}>
                  {task.completed
                    ? <CheckSquare className="w-5 h-5 text-green-500" />
                    : <Square className="w-5 h-5" />}
                </button>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority]}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {task.title}
                  </p>
                  {!isOpen && task.description && <p className="text-xs text-gray-400 truncate">{task.description}</p>}
                </div>
                <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
                  {CATEGORIES.find(c => c.value === task.category)?.label}
                </span>
                {task.due_date && (
                  <span className={`text-xs shrink-0 ${due?.cls || 'text-gray-400'}`}>{fmtDate(task.due_date)}</span>
                )}
                <ChevronRight className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              </div>
              {isOpen && (
                <div className="px-4 pb-4 pl-[3.25rem] border-t border-gray-50">
                  <TaskDetail task={task} onSave={saveTask} onDelete={deleteTask} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

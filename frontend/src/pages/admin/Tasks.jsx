import { useState, useEffect } from 'react'
import { Plus, Trash2, CheckSquare, Square, Filter } from 'lucide-react'
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

const EMPTY = { title: '', category: 'other', priority: 'medium', due_date: '', description: '' }

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)
  const [catFilter, setCatFilter] = useState('')
  const [showDone, setShowDone] = useState(false)

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

  const deleteTask = async (id) => {
    await api.delete(`/api/tasks/${id}/`)
    setTasks(t => t.filter(x => x.id !== id))
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
          onClick={() => setShowDone(v => !v)}
          className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
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
        ) : filtered.map(task => (
          <div
            key={task.id}
            className={`flex items-center gap-3 px-4 py-3 bg-white border rounded-xl transition-all duration-200 group ${
              task.completed ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-indigo-100 hover:shadow-sm'
            }`}
          >
            <button onClick={() => toggleDone(task)} className="flex-shrink-0 text-gray-400 hover:text-indigo-600 transition-colors">
              {task.completed
                ? <CheckSquare className="w-5 h-5 text-green-500" />
                : <Square className="w-5 h-5" />}
            </button>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority]}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {task.title}
              </p>
              {task.description && <p className="text-xs text-gray-400 truncate">{task.description}</p>}
            </div>
            <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
              {CATEGORIES.find(c => c.value === task.category)?.label}
            </span>
            {task.due_date && (
              <span className="text-xs text-gray-400 shrink-0">{task.due_date}</span>
            )}
            <button
              onClick={() => deleteTask(task.id)}
              className="opacity-0 group-hover:opacity-100 admin-btn-danger p-1.5 transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

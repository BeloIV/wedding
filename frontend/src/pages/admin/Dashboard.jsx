import { useState, useEffect } from 'react'
import { Users, CheckSquare, DollarSign, Heart, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import api from '../../api/axios'

function StatCard({ icon: Icon, label, value, sub, accent = '#b8706a' }) {
  return (
    <div className="admin-card flex items-start gap-4 group hover:-translate-y-0.5 transition-transform duration-200">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${accent}14`, border: `1px solid ${accent}28` }}
      >
        <Icon className="w-4.5 h-4.5" style={{ width: '1.1rem', height: '1.1rem', color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold text-wine leading-none mb-1">{value}</p>
        <p className="text-sm text-stone-500 font-sans">{label}</p>
        {sub && <p className="text-xs text-stone-400 mt-0.5 font-sans">{sub}</p>}
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-wine tracking-tight">{title}</h1>
      {subtitle && <p className="text-stone-400 text-sm mt-1 font-sans">{subtitle}</p>}
    </div>
  )
}

function ProgressBar({ pct, color }) {
  return (
    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

export default function Dashboard() {
  const [guests,  setGuests]  = useState([])
  const [tasks,   setTasks]   = useState([])
  const [budget,  setBudget]  = useState([])
  const [info,    setInfo]    = useState(null)
  const [rsvp,    setRsvp]    = useState([])

  useEffect(() => {
    Promise.all([
      api.get('/api/guests/'),
      api.get('/api/tasks/'),
      api.get('/api/budget/categories/'),
      api.get('/api/wedding-info/'),
      api.get('/api/rsvp-responses/'),
    ]).then(([g, t, b, i, r]) => {
      setGuests(g.data.results || g.data)
      setTasks(t.data.results || t.data)
      setBudget(b.data.results || b.data)
      setInfo(i.data)
      setRsvp(r.data.results || r.data)
    }).catch(() => {})
  }, [])

  const confirmed      = guests.filter(g => g.rsvp_status === 'confirmed').length
  const declined       = guests.filter(g => g.rsvp_status === 'declined').length
  const pending        = guests.filter(g => g.rsvp_status === 'pending').length
  const completedTasks = tasks.filter(t => t.completed).length
  const totalPlanned   = budget.reduce((s, c) => s + (c.total_planned || 0), 0)
  const totalActual    = budget.reduce((s, c) => s + (c.total_actual  || 0), 0)
  const daysLeft       = info?.wedding_date
    ? Math.max(0, Math.ceil((new Date(info.wedding_date) - new Date()) / 86400000))
    : null
  const highPrio       = tasks.filter(t => !t.completed && t.priority === 'high')

  return (
    <div className="p-7 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-wine tracking-tight">
            Vitaj, {info?.groom_name || info?.bride_name || 'Admin'} 👋
          </h1>
          <p className="text-stone-400 text-sm mt-1 font-sans">
            {info?.wedding_date
              ? `Do svadby zostáva ${daysLeft} dní`
              : 'Nastav dátum svadby v Nastaveniach'}
          </p>
        </div>
        {daysLeft !== null && (
          <div
            className="hidden sm:flex items-center gap-3 px-5 py-3 rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #1e0f08 0%, #2d1510 100%)', boxShadow: '0 4px 20px rgba(20,10,4,0.2)' }}
          >
            <Clock className="w-5 h-5 text-rose/70" />
            <div>
              <p className="text-2xl font-semibold text-champagne leading-none">{daysLeft}</p>
              <p className="text-xs text-white/30 font-sans mt-0.5 tracking-wide">dní</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard icon={Users}      label="Celkovo hostí"  value={guests.length} accent="#4f7db8" />
        <StatCard icon={Heart}      label="Potvrdení"      value={confirmed}     accent="#b8706a"
          sub={`${pending} čaká · ${declined} odmietlo`} />
        <StatCard icon={CheckSquare} label="Úlohy hotové"  value={`${completedTasks}/${tasks.length}`} accent="#5a9e72" />
        <StatCard icon={DollarSign}  label="Minuté"
          value={`${Math.round(totalActual).toLocaleString('sk-SK')} €`}
          sub={`plán: ${Math.round(totalPlanned).toLocaleString('sk-SK')} €`}
          accent="#a8844a" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">

        {/* RSVP Breakdown */}
        <div className="admin-card">
          <h2 className="text-sm font-semibold text-wine mb-5 flex items-center gap-2 uppercase tracking-[0.08em]">
            <Users className="w-3.5 h-3.5 text-rose/60" />
            RSVP prehľad
          </h2>
          {guests.length === 0 ? (
            <p className="text-stone-400 text-sm">Žiadni hostia zatiaľ.</p>
          ) : (
            <div className="space-y-4">
              {[
                { label: 'Potvrdení',   count: confirmed, color: '#5a9e72', pct: guests.length ? confirmed / guests.length * 100 : 0 },
                { label: 'Čaká sa',     count: pending,   color: '#d4a840', pct: guests.length ? pending   / guests.length * 100 : 0 },
                { label: 'Odmietnutí',  count: declined,  color: '#c0665c', pct: guests.length ? declined  / guests.length * 100 : 0 },
              ].map(({ label, count, color, pct }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-stone-500 font-sans">{label}</span>
                    <span className="font-semibold text-wine tabular-nums">{count}</span>
                  </div>
                  <ProgressBar pct={pct} color={color} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* High priority tasks */}
        <div className="admin-card">
          <h2 className="text-sm font-semibold text-wine mb-5 flex items-center gap-2 uppercase tracking-[0.08em]">
            <AlertCircle className="w-3.5 h-3.5 text-rose/60" />
            Prioritné úlohy
          </h2>
          {tasks.length === 0 ? (
            <p className="text-stone-400 text-sm">Žiadne úlohy zatiaľ.</p>
          ) : highPrio.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <CheckSquare className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-emerald-600 text-sm font-medium">Všetky hotové!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {highPrio.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-stone-50 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose flex-shrink-0" />
                  <span className="text-sm text-stone-700 truncate font-sans flex-1">{t.title}</span>
                  {t.due_date && (
                    <span className="text-xs text-stone-400 flex-shrink-0 font-sans">{t.due_date}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent RSVP responses */}
        <div className="admin-card">
          <h2 className="text-sm font-semibold text-wine mb-5 flex items-center gap-2 uppercase tracking-[0.08em]">
            <TrendingUp className="w-3.5 h-3.5 text-rose/60" />
            Posledné odpovede
          </h2>
          {rsvp.length === 0 ? (
            <p className="text-stone-400 text-sm">Žiadne odpovede zatiaľ.</p>
          ) : (
            <div className="space-y-1">
              {rsvp.slice(0, 6).map(r => (
                <div key={r.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-stone-50 transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.attending ? 'bg-emerald-400' : 'bg-stone-300'}`} />
                  <span className="text-sm text-stone-700 truncate font-sans flex-1">{r.guest_name}</span>
                  <span className={`text-xs font-medium flex-shrink-0 font-sans ${r.attending ? 'text-emerald-600' : 'text-stone-400'}`}>
                    {r.attending ? 'Príde' : 'Nepríde'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

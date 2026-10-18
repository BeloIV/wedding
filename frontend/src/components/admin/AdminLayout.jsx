import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, Users, DollarSign, CheckSquare,
  Building2, ImageIcon, Mail, Settings, LogOut, Heart, Armchair,
} from 'lucide-react'

const navItems = [
  { to: '/admin',               icon: LayoutDashboard, label: 'Dashboard',    end: true },
  { to: '/admin/hostia',        icon: Users,           label: 'Hostia' },
  { to: '/admin/zasadanie',     icon: Armchair,        label: 'Zasadací poriadok' },
  { to: '/admin/budget',        icon: DollarSign,      label: 'Výdavky' },
  { to: '/admin/ulohy',         icon: CheckSquare,     label: 'Úlohy' },
  { to: '/admin/dodavatelia',   icon: Building2,       label: 'Dodávatelia' },
  { to: '/admin/galeria',       icon: ImageIcon,       label: 'Galéria' },
  { to: '/admin/rsvp',          icon: Mail,            label: 'Odpovede' },
  { to: '/admin/nastavenia',    icon: Settings,        label: 'Nastavenia' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f7f3ed' }}>

      {/* Sidebar */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1a1008 0%, #130c04 100%)',
          boxShadow: '2px 0 24px rgba(0,0,0,0.18)',
        }}
      >
        {/* Logo */}
        <div className="px-5 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(184,112,106,0.18)', border: '1px solid rgba(184,112,106,0.3)' }}>
              <Heart className="w-3.5 h-3.5 text-rose" fill="currentColor" />
            </div>
            <span className="font-serif text-white/90 text-base font-medium tracking-wide">Svadba</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'text-champagne font-medium'
                    : 'text-white/35 hover:text-white/70 hover:bg-white/5'
                }`
              }
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(90deg, rgba(184,112,106,0.18) 0%, rgba(184,112,106,0.06) 100%)',
                borderLeft: '2px solid rgba(184,112,106,0.7)',
                paddingLeft: '10px',
              } : {}}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="font-sans tracking-wide">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-2 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-3 py-1.5 mb-1">
            <p className="text-xs text-white/25 truncate font-sans">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-white/30 hover:text-red-400/80 hover:bg-white/5 transition-all duration-150 font-sans"
          >
            <LogOut className="w-4 h-4" />
            Odhlásiť sa
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

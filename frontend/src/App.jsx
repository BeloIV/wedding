import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { GuestTokenProvider } from './contexts/GuestTokenContext'
import PrivateRoute from './components/PrivateRoute'

import GuestLayout from './components/guest/GuestLayout'
import AdminLayout from './components/admin/AdminLayout'

import Login from './pages/Login'
import { ForgotPassword, SetPassword } from './pages/PasswordPages'

import Home from './pages/guest/Home'
import InvitePage from './pages/guest/Invite'
import RSVPPage from './pages/guest/RSVP'
import TokenGate from './components/guest/TokenGate'
import Wishlist from './pages/guest/Wishlist'
import GalleryPage from './pages/guest/GalleryPage'
import Program from './pages/guest/Program'

import Dashboard from './pages/admin/Dashboard'
import Guests from './pages/admin/Guests'
import Budget from './pages/admin/Budget'
import Tasks from './pages/admin/Tasks'
import Vendors from './pages/admin/Vendors'
import GalleryAdmin from './pages/admin/GalleryAdmin'
import WeddingSettings from './pages/admin/WeddingSettings'
import RSVPAdmin from './pages/admin/RSVPAdmin'
import Seating from './pages/admin/Seating'

export default function App() {
  return (
    <BrowserRouter>
      <GuestTokenProvider>
      <AuthProvider>
        <Routes>
          {/* Login */}
          <Route path="/login" element={<Login />} />
          <Route path="/zabudnute-heslo" element={<ForgotPassword />} />
          <Route path="/nastavit-heslo" element={<SetPassword />} />

          {/* Invite landing */}
          <Route path="/invite/:token" element={<InvitePage />} />

          {/* Guest portal */}
          <Route element={<GuestLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/ucast" element={<TokenGate><RSVPPage /></TokenGate>} />
            <Route path="/wishlist" element={<TokenGate><Wishlist /></TokenGate>} />
            <Route path="/galeria" element={<GalleryPage />} />
            <Route path="/program" element={<Program />} />
          </Route>

          {/* Admin panel */}
          <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="hostia" element={<Guests />} />
            <Route path="zasadanie" element={<Seating />} />
            <Route path="budget" element={<Budget />} />
            <Route path="ulohy" element={<Tasks />} />
            <Route path="dodavatelia" element={<Vendors />} />
            <Route path="galeria" element={<GalleryAdmin />} />
            <Route path="rsvp" element={<RSVPAdmin />} />
            <Route path="nastavenia" element={<WeddingSettings />} />
          </Route>
        </Routes>
      </AuthProvider>
      </GuestTokenProvider>
    </BrowserRouter>
  )
}

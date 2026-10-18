import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const GuestTokenContext = createContext(null)

export function GuestTokenProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem('invite_token') || '')
  const [invitation, setInvitation] = useState(null)
  // a stored code is verified on load; until then guarded pages must not render
  const [loading, setLoading] = useState(() => !!localStorage.getItem('invite_token'))

  const fetchInvitation = async (t) => (await api.get(`/api/public/invite/${t.toUpperCase()}/`)).data

  // restore a saved code; drop it only if the server says it is invalid (not on a network blip)
  const loadInvitation = async (t) => {
    if (!t) { setInvitation(null); setLoading(false); return }
    setLoading(true)
    try {
      setInvitation(await fetchInvitation(t))
    } catch (err) {
      if (err.response?.status === 404) {
        localStorage.removeItem('invite_token')
        setTokenState('')
      }
      setInvitation(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadInvitation(token) }, [])

  // verifies the code first; rejects (with the axios error) when it is wrong, so callers can show a message
  const setToken = async (t) => {
    const upper = t.trim().toUpperCase()
    const inv = await fetchInvitation(upper)
    localStorage.setItem('invite_token', upper)
    setInvitation(inv)
    setTokenState(upper)
  }

  const clearToken = () => {
    localStorage.removeItem('invite_token')
    setTokenState('')
    setInvitation(null)
  }

  return (
    <GuestTokenContext.Provider value={{ token, invitation, loading, setToken, clearToken }}>
      {children}
    </GuestTokenContext.Provider>
  )
}

export const useGuestToken = () => useContext(GuestTokenContext)

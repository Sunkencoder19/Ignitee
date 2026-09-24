import { createContext, startTransition, useCallback, useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as authService from '@/services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Read the saved session up front so a refresh on /student doesn't bounce to /login.
  const [user, setUser] = useState(() => authService.getSession())
  const navigate = useNavigate()

  const login = useCallback(async (role, userId, pin) => {
    const session = await authService.login(role, userId, pin)
    setUser(session)
    return session
  }, [])

  // Clearing the user and leaving the page must land in the same render.
  // Router navigations are transitions, so a plain setUser(null) would render
  // first and RequireRole would bounce to /login with "Please log in first."
  const logout = useCallback(() => {
    authService.logout()
    startTransition(() => {
      setUser(null)
      navigate('/login', { replace: true })
    })
  }, [navigate])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Kept next to the provider so the context object never leaves this file.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

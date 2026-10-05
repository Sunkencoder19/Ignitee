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


export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

// Guards a whole area. Anyone not logged in with the matching role goes to
// /login, which remembers where they were headed and tells them why.
export default function RequireRole({ role, children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (user?.role === role) return children

  let reason = 'Please log in first.'
  if (user)
    reason = role === 'teacher' ? 'That area is for teachers.' : 'That area is for students.'

  return <Navigate to="/login" replace state={{ from: location.pathname, reason }} />
}

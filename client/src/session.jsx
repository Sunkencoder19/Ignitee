// Who is logged in, and (for a student) their progress.
// Any page can read it with:  const { user, progress } = useSession()

import { createContext, useContext, useEffect, useState } from 'react'
import * as api from './api'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [user, setUser] = useState(() => api.getSession())
  const [progress, setProgress] = useState(null)

  // A student's progress is loaded as soon as they log in (or refresh).
  useEffect(() => {
    setProgress(null)
    if (user?.role === 'student') api.getProgress(user.id).then(setProgress)
  }, [user])

  async function login(role, userId, pin) {
    const session = await api.login(role, userId, pin)
    setUser(session)
    return session
  }

  function logout() {
    api.logout()
    setUser(null)
  }

  // Both return the student's new progress, so a page can compare before and after.
  async function completeLesson(lessonId) {
    const next = await api.completeLesson(user.id, lessonId)
    setProgress(next)
    return next
  }

  async function submitQuiz(quizId, answers) {
    const next = await api.submitQuiz(user.id, quizId, answers)
    setProgress(next)
    return next
  }

  function resetDemo() {
    api.resetDemo()
    if (user?.role === 'student') api.getProgress(user.id).then(setProgress)
  }

  const value = { user, progress, login, logout, completeLesson, submitQuiz, resetDemo }
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  return useContext(SessionContext)
}

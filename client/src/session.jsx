// Who is logged in, and (for a student) their progress.
// Any page can read it with:  const { user, progress } = useSession()
//
// When the app opens with a saved login, it asks the server (getMe) whether
// that login still works. Until the answer comes back, `checking` is true and
// the layouts show "Loading..." instead of sending you to the login page.

import { createContext, useContext, useEffect, useState } from 'react'
import * as api from './api'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(() => api.hasSavedLogin())
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    if (!api.hasSavedLogin()) return
    api
      .getMe()
      .then(setUser)
      .catch(() => api.logout()) // expired or no longer valid: just log out
      .finally(() => setChecking(false))
  }, [])

  // A student's progress is loaded as soon as they log in.
  // DEMO until phase 4: progress still comes from the browser, not the server.
  useEffect(() => {
    setProgress(null)
    if (user?.role === 'student') api.getProgress(user.id).then(setProgress)
  }, [user])

  async function teacherSignup(name, email, password) {
    const next = await api.teacherSignup(name, email, password)
    setUser(next)
    return next
  }

  async function teacherLogin(email, password) {
    const next = await api.teacherLogin(email, password)
    setUser(next)
    return next
  }

  async function studentLogin(classCode, studentId, pin) {
    const next = await api.studentLogin(classCode, studentId, pin)
    setUser(next)
    return next
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

  const value = {
    user,
    checking,
    progress,
    teacherSignup,
    teacherLogin,
    studentLogin,
    logout,
    completeLesson,
    submitQuiz,
  }
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  return useContext(SessionContext)
}

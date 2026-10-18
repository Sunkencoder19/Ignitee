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

  // A student's progress (points, streak, badges, history) comes from the
  // server as soon as they log in. If it fails, `progress` stays null and
  // `progressError` says why, so the layout can offer "Try again".
  const [progressError, setProgressError] = useState(null)

  async function loadProgress() {
    setProgressError(null)
    try {
      setProgress(await api.getProgress())
    } catch (err) {
      setProgressError(err.message)
    }
  }

  useEffect(() => {
    setProgress(null)
    if (user?.role === 'student') loadProgress()
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

  // The server records the lesson and replies with the points earned and the
  // student's new progress, which updates the header straight away.
  async function finishLesson(lessonId) {
    const result = await api.finishLesson(lessonId)
    setProgress(result.progress)
    return result
  }

  // The server scores the quiz from its own records of each answer.
  async function finishQuiz(attemptId) {
    const result = await api.finishQuiz(attemptId)
    setProgress(result.progress)
    return result
  }

  const value = {
    user,
    checking,
    progress,
    progressError,
    reloadProgress: loadProgress,
    teacherSignup,
    teacherLogin,
    studentLogin,
    logout,
    finishLesson,
    finishQuiz,
  }
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  return useContext(SessionContext)
}

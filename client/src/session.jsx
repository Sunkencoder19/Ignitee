// Who is logged in, (for a student) their progress, and which language the
// app is shown in. Any page can read it with:  const { user, progress } = useSession()
//
// Language: a logged-in student sees their own choice, saved on their account
// so it follows them to any phone. Teachers see English. The login screens
// show the last language chosen on this device.
//
// When the app opens with a saved login, it asks the server (getMe) whether
// that login still works. Until the answer comes back, `checking` is true and
// the layouts show "Loading..." instead of sending you to the login page.

import { createContext, useContext, useEffect, useState } from 'react'
import * as api from './api'
import { LanguageProvider } from './i18n/t'

const DEVICE_LANGUAGE_KEY = 'ignite:language'

function savedDeviceLanguage() {
  try {
    const value = localStorage.getItem(DEVICE_LANGUAGE_KEY)
    return ['en', 'hi', 'mr'].includes(value) ? value : 'en'
  } catch {
    return 'en'
  }
}

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(() => api.hasSavedLogin())
  const [progress, setProgress] = useState(null)
  const [deviceLanguage, setDeviceLanguage] = useState(savedDeviceLanguage)

  const language = user?.role === 'teacher' ? 'en' : user?.role === 'student' ? (user.language ?? deviceLanguage) : deviceLanguage

  // Tell the browser (fonts, screen readers) and api.js (error messages).
  useEffect(() => {
    document.documentElement.lang = language
    api.setErrorLanguage(language)
  }, [language])

  // Change the language. The device remembers it for the login screen; for a
  // logged-in student it is also saved on their account.
  async function setLanguage(code) {
    try {
      localStorage.setItem(DEVICE_LANGUAGE_KEY, code)
    } catch {
      // Not remembered on this device; it still changes now.
    }
    setDeviceLanguage(code)
    if (user?.role !== 'student') return
    const before = user.language
    setUser({ ...user, language: code }) // change the screen straight away
    try {
      await api.setStudentLanguage(code)
    } catch {
      setUser((current) => ({ ...current, language: before })) // not saved: go back
    }
  }

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

  // Sends the login screen's language: the server only saves it if this child
  // has never chosen one, so a shared phone never overwrites anyone's choice.
  async function studentLogin(classCode, studentId, pin) {
    const next = await api.studentLogin(classCode, studentId, pin, deviceLanguage)
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
    language,
    setLanguage,
    reloadProgress: loadProgress,
    teacherSignup,
    teacherLogin,
    studentLogin,
    logout,
    finishLesson,
    finishQuiz,
  }
  return (
    <SessionContext.Provider value={value}>
      <LanguageProvider value={language}>{children}</LanguageProvider>
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}

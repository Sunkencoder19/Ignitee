// Who is logged in, (for a student) their progress, and which language the
// app is shown in. Any page can read it with:  const { user, progress } = useSession()
//
// A teacher and a student can be logged in at the same time, for example in two
// browser tabs (each keeps its own saved login; see api.js). `user` is the one for
// the part of the app on screen: /teacher/... gives the teacher, /student/... the
// student. `teacherUser` and `studentUser` are both always there, for the pages
// that sit outside either part (landing, login, sign up).
//
// Language: a logged-in student sees their own choice, saved on their account
// so it follows them to any phone (they change it on their Profile page). Teachers
// see English. The login screens show the last language chosen on this device.
//
// When the app opens with a saved login, it asks the server (getMe) whether
// that login still works. Until the answer comes back, `checking` is true and
// the layouts show "Loading..." instead of sending you to the login page.

import { createContext, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
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

const ROLES = ['teacher', 'student']
const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const { pathname } = useLocation()
  const area = pathname === '/teacher' || pathname.startsWith('/teacher/') ? 'teacher' : pathname === '/student' || pathname.startsWith('/student/') ? 'student' : null

  const [users, setUsers] = useState({ teacher: null, student: null })
  const [checking, setChecking] = useState(() => ROLES.some((role) => api.hasSavedLogin(role)))
  const [progress, setProgress] = useState(null)
  const [deviceLanguage, setDeviceLanguage] = useState(savedDeviceLanguage)

  const user = area ? users[area] : null
  const studentUser = users.student

  const language = area === 'teacher' ? 'en' : area === 'student' ? (studentUser?.language ?? deviceLanguage) : deviceLanguage

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
    if (!studentUser) return
    const before = studentUser.language
    setUsers((current) => ({ ...current, student: { ...current.student, language: code } })) // change the screen straight away
    try {
      await api.setStudentLanguage(code)
    } catch {
      setUsers((current) => ({ ...current, student: { ...current.student, language: before } })) // not saved: go back
    }
  }

  // On opening, check each saved login with the server.
  useEffect(() => {
    const saved = ROLES.filter((role) => api.hasSavedLogin(role))
    if (saved.length === 0) return
    Promise.all(
      saved.map((role) =>
        api
          .getMe(role)
          .then((found) => setUsers((current) => ({ ...current, [role]: found })))
          .catch(() => api.logout(role)) // expired or no longer valid: just log out
      )
    ).finally(() => setChecking(false))
  }, [])

  // A student's progress (points, coins, streak, badges, history) comes from the
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
    if (studentUser) loadProgress()
  }, [studentUser?.id])

  async function teacherSignup(name, email, password) {
    const next = await api.teacherSignup(name, email, password)
    setUsers((current) => ({ ...current, teacher: next }))
    return next
  }

  async function teacherLogin(email, password) {
    const next = await api.teacherLogin(email, password)
    setUsers((current) => ({ ...current, teacher: next }))
    return next
  }

  // Sends the login screen's language: the server only saves it if this child
  // has never chosen one, so a shared phone never overwrites anyone's choice.
  async function studentLogin(classCode, studentId, pin) {
    const next = await api.studentLogin(classCode, studentId, pin, deviceLanguage)
    setUsers((current) => ({ ...current, student: next }))
    return next
  }

  // Logs out of the part of the app on screen (the other stays logged in).
  function logout() {
    if (!area) return
    api.logout(area)
    setUsers((current) => ({ ...current, [area]: null }))
    if (area === 'student') setProgress(null)
  }

  // The server records the lesson and replies with the points earned, the stars
  // and the student's new progress, which updates the header straight away.
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
    teacherUser: users.teacher,
    studentUser,
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

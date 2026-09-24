import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react'
import { initialProgressState, progressReducer } from '@/context/progressReducer'
import { useAuth } from '@/context/AuthContext'
import useBadgeCheck from '@/hooks/useBadgeCheck'
import { todayISO } from '@/lib/format'
import { getBadges, getChapters } from '@/services/contentService'
import { getProgress, resetDemoData, saveProgress } from '@/services/progressService'

// The single source of truth for the logged-in student's points, streak,
// badges, lessons and quiz attempts. Screens read from here and report what
// happened (a lesson finished, a quiz submitted); the reducer applies the rules.

const ProgressContext = createContext(null)

export function ProgressProvider({ children }) {
  const { user } = useAuth()
  const studentId = user?.role === 'student' ? user.id : null
  const [state, dispatch] = useReducer(progressReducer, initialProgressState)
  const [reloadKey, setReloadKey] = useState(0)

  // The one place the clock is read. Every action is stamped with today's
  // local date here, so the reducer and the lib rules stay pure.
  const send = useCallback((type, payload = {}) => {
    dispatch({ type, now: todayISO(), ...payload })
  }, [])

  // ---- load ----
  useEffect(() => {
    if (!studentId) {
      send('RESET')
      return
    }

    let ignore = false
    send('HYDRATING', { studentId })
    Promise.all([getProgress(studentId), getChapters(), getBadges()]).then(
      ([progress, chapters, badges]) => {
        if (!ignore) send('HYDRATED', { studentId, progress, chapters, badges })
      },
      (error) => {
        if (!ignore) send('HYDRATE_FAILED', { studentId, error: error.message })
      }
    )
    return () => {
      ignore = true
    }
  }, [studentId, reloadKey, send])

  // ---- save ----
  // `dirty` is only set by LESSON_COMPLETED, QUIZ_SUBMITTED and BADGE_UNLOCKED.
  // HYDRATED and RESET clear it, so loading or resetting never writes storage.
  useEffect(() => {
    if (state.dirty && state.studentId && state.progress) {
      saveProgress(state.studentId, state.progress)
    }
  }, [state.dirty, state.studentId, state.progress])

  useBadgeCheck(state, send)

  // ---- actions ----
  const completeLesson = useCallback((lessonId) => send('LESSON_COMPLETED', { lessonId }), [send])

  const submitQuiz = useCallback(
    ({ quizId, questionCount, answers }) =>
      send('QUIZ_SUBMITTED', { quizId, questionCount, answers }),
    [send]
  )

  const dismissToast = useCallback(() => send('TOAST_DISMISSED'), [send])
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  // Clears storage for every student, then drops this student's in-memory
  // state and loads the seed again, so the header and pages reset too.
  const resetDemo = useCallback(async () => {
    await resetDemoData()
    send('RESET')
    setReloadKey((k) => k + 1)
  }, [send])

  const value = useMemo(
    () => ({
      status: state.status,
      error: state.error,
      progress: state.progress,
      chapters: state.chapters,
      badges: state.badges,
      lastEvent: state.lastEvent,
      toasts: state.toasts,
      completeLesson,
      submitQuiz,
      dismissToast,
      reload,
      resetDemo,
    }),
    [state, completeLesson, submitQuiz, dismissToast, reload, resetDemo]
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

// Kept next to the provider so the context object never leaves this file.
// eslint-disable-next-line react-refresh/only-export-components
export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>')
  return ctx
}

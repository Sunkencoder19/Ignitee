import { answerPoints, applyStreak, POINTS, quizAttemptPoints, scoreQuiz } from '@/lib/scoring'

// Pure: no clock, no storage, no React. Every action carries `now` (a local
// 'YYYY-MM-DD') from the caller, so the same actions always give the same
// state, and a test can replay a week of activity by passing different dates.

export const initialProgressState = {
  status: 'idle', // idle | loading | ready | error
  studentId: null,
  progress: null,
  chapters: [],
  badges: [],
  lastEvent: null, // what the last lesson/quiz earned, for finish and result screens
  eventCount: 0,
  toasts: [], // badge ids waiting to be shown, oldest first
  dirty: false, // true only after LESSON_COMPLETED, QUIZ_SUBMITTED or BADGE_UNLOCKED
  error: null,
}

// Old saves (and seed data) predate these fields. A seed student's best
// streak is at least the streak they have now; their older streak points
// were never dated, so their streak log starts empty.
function withDefaults(progress) {
  return {
    firstTryRun: 0,
    firstTryBest: 0,
    streakLog: [],
    ...progress,
    bestStreak: Math.max(progress.bestStreak ?? 0, progress.streak ?? 0),
  }
}

export function progressReducer(state, action) {
  if (!action.now) throw new Error(`${action.type} was dispatched without "now"`)

  switch (action.type) {
    case 'HYDRATING':
      return { ...initialProgressState, status: 'loading', studentId: action.studentId }

    case 'HYDRATED':
      // A slow load for a student who has since logged out is ignored.
      if (action.studentId !== state.studentId) return state
      return {
        ...initialProgressState,
        status: 'ready',
        studentId: action.studentId,
        progress: withDefaults(action.progress),
        chapters: action.chapters,
        badges: action.badges,
      }

    case 'HYDRATE_FAILED':
      if (action.studentId !== state.studentId) return state
      return { ...state, status: 'error', error: action.error }

    case 'LESSON_COMPLETED': {
      if (state.status !== 'ready') return state
      const current = state.progress
      // Lesson points only the first time; replaying a lesson is practice.
      const firstTime = !current.completedLessons.some((l) => l.lessonId === action.lessonId)
      const afterLesson = firstTime
        ? {
            ...current,
            completedLessons: [
              ...current.completedLessons,
              { lessonId: action.lessonId, completedAt: action.now },
            ],
            points: current.points + POINTS.lessonComplete,
          }
        : current
      const { progress, streakPoints } = applyStreak(afterLesson, action.now)
      const eventCount = state.eventCount + 1

      return {
        ...state,
        progress,
        dirty: true,
        eventCount,
        lastEvent: {
          id: eventCount,
          type: action.type,
          lessonId: action.lessonId,
          lessonPoints: firstTime ? POINTS.lessonComplete : 0,
          streakPoints,
          streakDay: progress.streak,
        },
      }
    }

    case 'QUIZ_SUBMITTED': {
      if (state.status !== 'ready') return state
      const current = state.progress
      const { quizId, questionCount, answers } = action
      const outcomes = answers.map((a) => a.outcome)
      const previousAttempts = current.quizAttempts.filter((a) => a.quizId === quizId)
      const { score, stars } = scoreQuiz(outcomes)
      const { total } = quizAttemptPoints({ outcomes, previousAttempts, questionCount })

      // Sharp Mind: a run of first-try answers that carries across quizzes.
      let run = current.firstTryRun
      let best = current.firstTryBest
      for (const outcome of outcomes) {
        run = outcome === 'first' ? run + 1 : 0
        best = Math.max(best, run)
      }

      const afterQuiz = {
        ...current,
        quizAttempts: [
          ...current.quizAttempts,
          {
            quizId,
            score,
            stars,
            points: total,
            answerPoints: answerPoints(outcomes),
            answers,
            date: action.now,
          },
        ],
        points: current.points + total,
        firstTryRun: run,
        firstTryBest: best,
      }
      const { progress, streakPoints } = applyStreak(afterQuiz, action.now)
      const eventCount = state.eventCount + 1

      return {
        ...state,
        progress,
        dirty: true,
        eventCount,
        lastEvent: {
          id: eventCount,
          type: action.type,
          quizId,
          attemptNumber: previousAttempts.length + 1,
          quizPoints: total,
          streakPoints,
          streakDay: progress.streak,
        },
      }
    }

    case 'BADGE_UNLOCKED': {
      if (state.status !== 'ready') return state
      // The includes() check is the second guard against a badge twice
      // (newlyEarnedBadges is the first).
      const fresh = action.badgeIds.filter((id) => !state.progress.badges.includes(id))
      if (fresh.length === 0) return state
      return {
        ...state,
        progress: { ...state.progress, badges: [...state.progress.badges, ...fresh] },
        toasts: [...state.toasts, ...fresh],
        dirty: true,
      }
    }

    case 'TOAST_DISMISSED':
      return { ...state, toasts: state.toasts.slice(1) }

    case 'RESET':
      return initialProgressState

    default:
      return state
  }
}

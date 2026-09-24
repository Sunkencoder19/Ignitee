import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import StudentLayout from '@/components/layout/StudentLayout'
import Spinner from '@/components/ui/Spinner'
import LoginPage from '@/features/auth/LoginPage'
import RequireRole from '@/features/auth/RequireRole'
import PlaceholderPage from '@/features/dev/PlaceholderPage'
import LandingPage from '@/features/landing/LandingPage'
import ChapterMap from '@/features/learn/ChapterMap'
import ChapterPage from '@/features/learn/ChapterPage'
import LessonPlayer from '@/features/learn/LessonPlayer'
import NotFoundPage from '@/features/not-found/NotFoundPage'
import QuizPage from '@/features/quiz/QuizPage'
import ResultScreen from '@/features/quiz/ResultScreen'

// Teachers are a handful of users on desktops; kids on cheap phones
// shouldn't download the teacher area (and later, its charts) at all.
const TeacherLayout = lazy(() => import('@/components/layout/TeacherLayout'))

// Only exists in `npm run dev`; the production build drops it entirely.
const UiKitPage = import.meta.env.DEV ? lazy(() => import('@/features/dev/UiKitPage')) : null

function PageSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Spinner size="lg" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/student"
          element={
            <RequireRole role="student">
              <StudentLayout />
            </RequireRole>
          }
        >
          <Route index element={<PlaceholderPage title="Student dashboard" checkpoint={7} />} />
          <Route path="learn" element={<ChapterMap />} />
          <Route path="learn/:chapterId" element={<ChapterPage />} />
          <Route path="learn/:chapterId/:lessonId" element={<LessonPlayer />} />
          <Route path="quiz/:quizId" element={<QuizPage />} />
          <Route path="quiz/:quizId/result" element={<ResultScreen />} />
          <Route
            path="leaderboard"
            element={<PlaceholderPage title="Leaderboard" checkpoint={7} />}
          />
          <Route path="profile" element={<PlaceholderPage title="Profile" checkpoint={7} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route
          path="/teacher"
          element={
            <RequireRole role="teacher">
              <TeacherLayout />
            </RequireRole>
          }
        >
          <Route index element={<PlaceholderPage title="Class overview" checkpoint={8} />} />
          <Route
            path="students"
            element={<PlaceholderPage title="Student table" checkpoint={8} />}
          />
          <Route
            path="students/:studentId"
            element={<PlaceholderPage title="Student detail" checkpoint={8} />}
          />
          <Route
            path="assessments"
            element={<PlaceholderPage title="Assessments" checkpoint={8} />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {UiKitPage && <Route path="/dev/ui" element={<UiKitPage />} />}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

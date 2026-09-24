import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import StudentLayout from '@/components/layout/StudentLayout'
import Spinner from '@/components/ui/Spinner'
import LoginPage from '@/features/auth/LoginPage'
import RequireRole from '@/features/auth/RequireRole'
import LandingPage from '@/features/landing/LandingPage'
import LeaderboardPage from '@/features/leaderboard/LeaderboardPage'
import ChapterMap from '@/features/learn/ChapterMap'
import ChapterPage from '@/features/learn/ChapterPage'
import LessonPlayer from '@/features/learn/LessonPlayer'
import NotFoundPage from '@/features/not-found/NotFoundPage'
import ProfilePage from '@/features/profile/ProfilePage'
import QuizPage from '@/features/quiz/QuizPage'
import ResultScreen from '@/features/quiz/ResultScreen'
import StudentDashboard from '@/features/student-dashboard/StudentDashboard'

// Teachers are a handful of users on desktops; kids on cheap phones
// shouldn't download the teacher area (and later, its charts) at all.
const TeacherLayout = lazy(() => import('@/components/layout/TeacherLayout'))
const Overview = lazy(() => import('@/features/teacher-dashboard/Overview'))
const ClassTable = lazy(() => import('@/features/teacher-dashboard/ClassTable'))
const StudentDetail = lazy(() => import('@/features/teacher-dashboard/StudentDetail'))
const Assessments = lazy(() => import('@/features/teacher-dashboard/Assessments'))

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
          <Route index element={<StudentDashboard />} />
          <Route path="learn" element={<ChapterMap />} />
          <Route path="learn/:chapterId" element={<ChapterPage />} />
          <Route path="learn/:chapterId/:lessonId" element={<LessonPlayer />} />
          <Route path="quiz/:quizId" element={<QuizPage />} />
          <Route path="quiz/:quizId/result" element={<ResultScreen />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
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
          <Route index element={<Overview />} />
          <Route path="students" element={<ClassTable />} />
          <Route path="students/:studentId" element={<StudentDetail />} />
          <Route path="assessments" element={<Assessments />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {UiKitPage && <Route path="/dev/ui" element={<UiKitPage />} />}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

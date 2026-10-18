// App entry. Every URL in the app is listed here.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { StudentLayout, TeacherLayout } from './layouts'
import { SessionProvider } from './session'

import Landing from './pages/Landing'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

import Home from './pages/student/Home'
import Learn from './pages/student/Learn'
import Chapter from './pages/student/Chapter'
import Lesson from './pages/student/Lesson'
import Quiz from './pages/student/Quiz'
import Result from './pages/student/Result'
import Leaderboard from './pages/student/Leaderboard'

import Overview from './pages/teacher/Overview'
import Students from './pages/teacher/Students'
import Student from './pages/teacher/Student'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<Home />} />
            <Route path="learn" element={<Learn />} />
            <Route path="learn/:chapterId" element={<Chapter />} />
            <Route path="learn/:chapterId/:lessonId" element={<Lesson />} />
            <Route path="quiz/:quizId" element={<Quiz />} />
            <Route path="quiz/:quizId/result" element={<Result />} />
            <Route path="leaderboard" element={<Leaderboard />} />
          </Route>

          <Route path="/teacher" element={<TeacherLayout />}>
            <Route index element={<Overview />} />
            <Route path="students" element={<Students />} />
            <Route path="students/:studentId" element={<Student />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>
)

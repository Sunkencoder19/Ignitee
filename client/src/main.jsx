// App entry. Every URL in the app is listed here.

import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { StudentLayout, TeacherLayout } from './layouts'
import { SessionProvider } from './session'

import Landing from './pages/Landing'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Signup from './pages/Signup'

import Home from './pages/student/Home'
import Learn from './pages/student/Learn'
import Chapter from './pages/student/Chapter'
import Lesson from './pages/student/Lesson'
import Quiz from './pages/student/Quiz'
import Result from './pages/student/Result'
import Leaderboard from './pages/student/Leaderboard'

import Classes from './pages/teacher/Classes'
import Class from './pages/teacher/Class'
import Content from './pages/teacher/Content'
import ChapterEditor from './pages/teacher/ChapterEditor'
import QuizEditor from './pages/teacher/QuizEditor'
import Preview from './pages/teacher/Preview'

// If any page throws an error, show this instead of a blank screen.
// (React only lets a class component catch errors.)
class CrashScreen extends Component {
  state = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  startOver() {
    localStorage.clear()
    window.location.href = '/'
  }

  render() {
    if (!this.state.crashed) return this.props.children
    return (
      <div className="mx-auto max-w-md px-4 py-24">
        <h1 className="text-3xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-muted">Saved data in this browser may be out of date. Clear it and start again.</p>
        <button onClick={this.startOver} className="btn btn-primary mt-6">
          Clear and start again
        </button>
      </div>
    )
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <CrashScreen>
      <SessionProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<Home />} />
            <Route path="learn" element={<Learn />} />
            <Route path="learn/:chapterId" element={<Chapter />} />
            <Route path="learn/:chapterId/:lessonId" element={<Lesson />} />
            <Route path="quiz/:quizId" element={<Quiz />} />
            <Route path="results/:attemptId" element={<Result />} />
            <Route path="leaderboard" element={<Leaderboard />} />
          </Route>

          <Route path="/teacher" element={<TeacherLayout />}>
            <Route index element={<Classes />} />
            <Route path="classes/:classId" element={<Class />} />
            <Route path="content" element={<Content />} />
            <Route path="content/:chapterId" element={<ChapterEditor />} />
            <Route path="content/:chapterId/quiz" element={<QuizEditor />} />
            <Route path="preview/:chapterId/lesson/:lessonId" element={<Preview />} />
            <Route path="preview/:chapterId/quiz" element={<Preview />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </SessionProvider>
      </CrashScreen>
    </BrowserRouter>
  </StrictMode>
)

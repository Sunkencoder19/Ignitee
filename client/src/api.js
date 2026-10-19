// The ONLY file that reads or writes data.
//
// Every function talks to the IGNITE server (server/) through request(),
// which adds the login token and turns server errors into readable messages.
// The comment above each function says which endpoint it calls.

import { useEffect, useRef, useState } from 'react'

// ---------- talking to the server ----------

const TOKEN_KEY = 'ignite:token'

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Private browsing: you stay logged in until the tab closes.
  }
}

// Sends one request to /api/... and returns the JSON reply.
// If the server says no, it throws an Error whose message the page can show.
async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch {
    throw new Error('Can’t reach the IGNITE server. Check your connection and try again.')
  }

  const data = await res.json().catch(() => ({}))
  if (res.status === 401) setToken(null) // the saved login no longer works
  if (!res.ok) {
    // The Vite proxy answers 500/502/504 with no JSON when the server isn't running.
    const error = new Error(data.error ?? 'Can’t reach the IGNITE server. Check that it is running and try again.')
    error.problems = data.problems ?? [] // every problem the server found, for editors to list
    throw error
  }
  return data
}

// ---------- login ----------

// Is there a saved login? (Checked with getMe() when the app opens.)
export function hasSavedLogin() {
  return Boolean(getToken())
}

// GET /api/auth/me
export async function getMe() {
  const { user } = await request('GET', '/auth/me')
  return user
}

// POST /api/auth/teacher/signup  { name, email, password }
export async function teacherSignup(name, email, password) {
  const { token, user } = await request('POST', '/auth/teacher/signup', { name, email, password })
  setToken(token)
  return user
}

// POST /api/auth/teacher/login  { email, password }
export async function teacherLogin(email, password) {
  const { token, user } = await request('POST', '/auth/teacher/login', { email, password })
  setToken(token)
  return user
}

// GET /api/auth/class/:code  ->  { className, students: [{ id, name }] }
export function findClass(code) {
  return request('GET', `/auth/class/${encodeURIComponent(code.trim())}`)
}

// POST /api/auth/student/login  { classCode, studentId, pin }
export async function studentLogin(classCode, studentId, pin) {
  const { token, user } = await request('POST', '/auth/student/login', { classCode, studentId, pin })
  setToken(token)
  return user
}

export function logout() {
  setToken(null)
}

// ---------- classes and students (teacher) ----------

// GET /api/classes  ->  [{ id, name, code, studentCount }]
export function getClasses() {
  return request('GET', '/classes')
}

// POST /api/classes  { name }
export function createClass(name) {
  return request('POST', '/classes', { name })
}

// GET /api/classes/:id  ->  { id, name, code, students: [{ id, name }] }
export function getTeacherClass(classId) {
  return request('GET', `/classes/${classId}`)
}

// PATCH /api/classes/:id  { name }
export function renameClass(classId, name) {
  return request('PATCH', `/classes/${classId}`, { name })
}

// DELETE /api/classes/:id  { confirmName }   (also removes its students and their quiz history;
// the server only does it if confirmName is the class name)
export function deleteClass(classId, confirmName) {
  return request('DELETE', `/classes/${classId}`, { confirmName })
}

// POST /api/classes/:id/students  { name }  ->  { student, pin }   (the PIN is only sent this once)
export function addStudent(classId, name) {
  return request('POST', `/classes/${classId}/students`, { name })
}

// PATCH /api/students/:id  { name }
export function renameStudent(studentId, name) {
  return request('PATCH', `/students/${studentId}`, { name })
}

// DELETE /api/students/:id
export function removeStudent(studentId) {
  return request('DELETE', `/students/${studentId}`)
}

// POST /api/students/:id/reset-pin  ->  { student, pin }   (also lifts a wrong-PIN lock)
export function resetPin(studentId) {
  return request('POST', `/students/${studentId}/reset-pin`)
}

// ---------- content: chapters, lessons, quizzes (teacher) ----------

// GET /api/chapters  ->  [{ id, title, status, classes, lessonCount, questionCount }] in order
export function getContent() {
  return request('GET', '/chapters')
}

// POST /api/chapters  { title }   a new draft chapter at the end
export function createChapter(title) {
  return request('POST', '/chapters', { title })
}

// POST /api/chapters/starter   adds the 4 starter chapters as drafts (only when there are none)
export function addStarterChapters() {
  return request('POST', '/chapters/starter')
}

// PUT /api/chapters/order  { chapterIds }
export function saveChapterOrder(chapterIds) {
  return request('PUT', '/chapters/order', { chapterIds })
}

// GET /api/topics  ->  every topic this teacher has used
export function getTopics() {
  return request('GET', '/topics')
}

// GET /api/chapters/:id  ->  { id, title, status, classIds, lessons, quiz }   (with answers)
export function getChapterForEditing(chapterId) {
  return request('GET', `/chapters/${chapterId}`)
}

// PATCH /api/chapters/:id  { title?, classIds?, status? }
export function updateChapter(chapterId, changes) {
  return request('PATCH', `/chapters/${chapterId}`, changes)
}

// DELETE /api/chapters/:id   (refused once students have started it)
export function deleteChapter(chapterId) {
  return request('DELETE', `/chapters/${chapterId}`)
}

// POST /api/chapters/:id/lessons  { title, steps }
export function addLesson(chapterId, lesson) {
  return request('POST', `/chapters/${chapterId}/lessons`, lesson)
}

// PUT /api/chapters/:id/lesson-order  { lessonIds }
export function saveLessonOrder(chapterId, lessonIds) {
  return request('PUT', `/chapters/${chapterId}/lesson-order`, { lessonIds })
}

// PATCH /api/lessons/:id  { title, steps }
export function updateLesson(lessonId, lesson) {
  return request('PATCH', `/lessons/${lessonId}`, lesson)
}

// DELETE /api/lessons/:id
export function deleteLesson(lessonId) {
  return request('DELETE', `/lessons/${lessonId}`)
}

// PUT /api/chapters/:id/quiz  { questions }
export function saveQuiz(chapterId, questions) {
  return request('PUT', `/chapters/${chapterId}/quiz`, { questions })
}

// DELETE /api/chapters/:id/quiz
export function deleteQuiz(chapterId) {
  return request('DELETE', `/chapters/${chapterId}/quiz`)
}

// ---------- reports (teacher) ----------
// Accuracy uses each student's latest finished try at each quiz. Numbers that
// can't be worked out yet (no answers) come back as null, never NaN.

// GET /api/reports/classes/:id  ->  { class, summary, needsAttention, chapters, topics, students, lessonsPerDay }
export function getClassReport(classId) {
  return request('GET', `/reports/classes/${classId}`)
}

// GET /api/reports/students/:id  ->  { student, class, points, reasons, chapters, topics, weakestTopics, badges, recentAttempts, ... }
export function getStudentReport(studentId) {
  return request('GET', `/reports/students/${studentId}`)
}

// ---------- student: lessons, quizzes, progress ----------
// Students never receive answers, hints or explanations up front: every
// answer is sent to the server, which says whether it is right.

// GET /api/student/chapters  ->  [{ id, number, title, state, stars, lessons: [{ id, title, done }], quiz }]
export function getStudentChapters() {
  return request('GET', '/student/chapters')
}

// GET /api/student/progress  ->  { lessons, attempts, points, streak, bestStreak, lastActive, badges }
export function getProgress() {
  return request('GET', '/student/progress')
}

// GET /api/student/lessons/:id  ->  { id, title, chapterId, steps }   (questions without answers)
export function getStudentLesson(lessonId) {
  return request('GET', `/student/lessons/${lessonId}`)
}

// POST /api/student/lessons/:id/check  { questionId, given, tries }
//   ->  { result: 'correct' }  |  { result: 'retry', hint }  |  { result: 'revealed', answer, explanation }
export function checkLessonAnswer(lessonId, questionId, given, tries) {
  return request('POST', `/student/lessons/${lessonId}/check`, { questionId, given, tries })
}

// POST /api/student/lessons/:id/finish  ->  { firstTime, pointsEarned, newBadges, progress }
export function finishLesson(lessonId) {
  return request('POST', `/student/lessons/${lessonId}/finish`)
}

// POST /api/student/quizzes/:id/attempts  ->  { attemptId, chapterTitle, questions }   (no answers)
export function startQuiz(quizId) {
  return request('POST', `/student/quizzes/${quizId}/attempts`)
}

// POST /api/student/attempts/:id/answers  { questionId, given }
//   ->  same replies as checkLessonAnswer, plus `settled`. The server counts the tries.
export function answerQuizQuestion(attemptId, questionId, given) {
  return request('POST', `/student/attempts/${attemptId}/answers`, { questionId, given })
}

// POST /api/student/attempts/:id/finish   (sends nothing: the server works out the score)
//   ->  { score, stars, quizPoints, pointsEarned, newBadges, openedChapter, review, progress, ... }
export function finishQuiz(attemptId) {
  return request('POST', `/student/attempts/${attemptId}/finish`)
}

// GET /api/student/attempts/:id  ->  a finished attempt with its review
export function getQuizResult(attemptId) {
  return request('GET', `/student/attempts/${attemptId}`)
}

// GET /api/student/leaderboard  ->  [{ id, firstName, points, rank, isMe }]
export function getLeaderboard() {
  return request('GET', '/student/leaderboard')
}

// ---------- helper for pages ----------

// Loads data when a page opens (and again when `deps` change).
//   const { data, error, reload } = useData(() => getStudentLesson(lessonId), [lessonId])
// While loading, data and error are both null.
// reload() fetches again after a change (say, a new student was added) but
// keeps showing the current data until the new data arrives.
export function useData(load, deps) {
  const [state, setState] = useState({ data: null, error: null })
  const latestLoad = useRef(load)
  latestLoad.current = load

  useEffect(() => {
    let current = true
    setState({ data: null, error: null })
    load().then(
      (data) => current && setState({ data, error: null }),
      (error) => current && setState({ data: null, error: error.message })
    )
    return () => {
      current = false
    }
  }, deps)

  async function reload() {
    try {
      const data = await latestLoad.current()
      setState({ data, error: null })
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.message }))
    }
  }

  return { ...state, reload }
}

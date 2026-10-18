// The ONLY file that reads or writes data.
//
// Every function talks to the IGNITE server (server/) through request(),
// which adds the login token and turns server errors into readable messages.
// The comment above each function says which endpoint it calls.
//
// DEMO (until phases 3-6): the functions under "demo data" still read the JSON
// files in ./data and save progress in localStorage. They are replaced phase by
// phase and deleted in phase 6.

import { useEffect, useState } from 'react'
import chapters from './data/chapters.json'
import lessons from './data/lessons.json'
import seedProgress from './data/progress.json'
import quizzes from './data/quizzes.json'
import students from './data/students.json'
import { addDays, answerPoints, scoreQuiz, today } from './game'

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
    throw new Error(data.error ?? 'Can’t reach the IGNITE server. Check that it is running and try again.')
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

// ---------- demo data (replaced in later phases) ----------

const PROGRESS_KEY = 'ignite:progress:'

// Pretend network: a short delay, and a copy so pages can't change the JSON.
function respond(data) {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), 200))
}

function fail(message) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), 200))
}

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private browsing or full storage: it still works until the tab closes.
  }
}

// ---------- content ----------

// GET /api/chapters
export function getChapters() {
  return respond(chapters)
}

// GET /api/chapters/:id
export function getChapter(chapterId) {
  const chapter = chapters.find((c) => c.id === chapterId)
  if (!chapter) return fail('We could not find that chapter.')
  const chapterLessons = chapter.lessonIds.map((id) => lessons.find((l) => l.id === id))
  const quiz = quizzes.find((q) => q.id === chapter.quizId) ?? null
  return respond({ chapter, lessons: chapterLessons, quiz })
}

// GET /api/lessons/:id
export function getLesson(lessonId) {
  const lesson = lessons.find((l) => l.id === lessonId)
  return lesson ? respond(lesson) : fail('We could not find that lesson.')
}

// GET /api/quizzes/:id
export function getQuiz(quizId) {
  const quiz = quizzes.find((q) => q.id === quizId)
  return quiz ? respond(quiz) : fail('We could not find that quiz.')
}

// ---------- progress ----------

// The seed file stores "days ago" instead of dates, so the demo data looks
// the same whatever day you open it.
function seedFor(studentId) {
  const seed = seedProgress.find((p) => p.studentId === studentId)
  if (!seed) return { studentId, lessons: [], attempts: [] }
  return {
    studentId,
    lessons: seed.lessons.map((l) => ({ lessonId: l.lessonId, date: addDays(today(), -l.daysAgo) })),
    attempts: seed.attempts.map(({ daysAgo, ...a }) => ({ ...a, date: addDays(today(), -daysAgo) })),
  }
}

// Saved progress is only used if it has the current shape. Anything else
// (for example, saved by an older version of the app) is ignored.
function loadProgress(studentId) {
  const saved = readStorage(PROGRESS_KEY + studentId)
  const valid = Array.isArray(saved?.lessons) && Array.isArray(saved?.attempts)
  return valid ? saved : seedFor(studentId)
}

// GET /api/students/:id/progress
export function getProgress(studentId) {
  return respond(loadProgress(studentId))
}

// POST /api/students/:id/lessons  { lessonId }
// Finishing a lesson again changes nothing; only the first time counts.
export function completeLesson(studentId, lessonId) {
  const progress = loadProgress(studentId)
  if (!progress.lessons.some((l) => l.lessonId === lessonId)) {
    progress.lessons.push({ lessonId, date: today() })
    writeStorage(PROGRESS_KEY + studentId, progress)
  }
  return respond(progress)
}

// POST /api/students/:id/attempts  { quizId, answers }
// answers: [{ questionId, outcome: 'first' | 'hint' | 'missed', given }]
export function submitQuiz(studentId, quizId, answers) {
  const progress = loadProgress(studentId)
  const outcomes = answers.map((a) => a.outcome)
  const { score, stars } = scoreQuiz(outcomes)
  progress.attempts.push({
    quizId,
    score,
    stars,
    answerPoints: answerPoints(outcomes),
    answers,
    date: today(),
  })
  writeStorage(PROGRESS_KEY + studentId, progress)
  return respond(progress)
}

// ---------- class (teacher pages and leaderboard) ----------

// GET /api/classes/:classId   (classId '4A', '4B' or 'all')
// Returns [{ student, progress }]. The real server should send students
// only first names and points for the leaderboard.
export function getClass(classId) {
  const rows = students
    .filter((s) => classId === 'all' || s.classId === classId)
    .map(({ pin, ...student }) => ({ student, progress: loadProgress(student.id) }))
  return respond(rows)
}

// ---------- helper for pages ----------

// Loads data when a page opens (and again when `deps` change).
//   const { data, error } = useData(() => getQuiz(quizId), [quizId])
// While loading, data and error are both null.
export function useData(load, deps) {
  const [state, setState] = useState({ data: null, error: null })

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

  return state
}

// The ONLY file that reads or writes data.
//
// Today it uses the JSON files in ./data and saves progress in the browser's
// localStorage. Every function returns a Promise, exactly like a real network
// call, so when the backend in /server is ready each function body becomes a
// fetch() and no page has to change. The comment above each function names
// the endpoint it should turn into.

import { useEffect, useState } from 'react'
import chapters from './data/chapters.json'
import lessons from './data/lessons.json'
import seedProgress from './data/progress.json'
import quizzes from './data/quizzes.json'
import students from './data/students.json'
import teachers from './data/teachers.json'
import { addDays, answerPoints, scoreQuiz, today } from './game'

const SESSION_KEY = 'ignite:session'
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

// ---------- login ----------

function usersFor(role) {
  return role === 'teacher' ? teachers : students
}

function displayName(user, role) {
  return role === 'teacher' ? `${user.title} ${user.name}` : user.name
}

// GET /api/users?role=student
// The demo PIN is included so the login page can show it. A real server must not do this.
export function getLoginNames(role) {
  const names = usersFor(role)
    .map((u) => ({ id: u.id, name: displayName(u, role), classId: u.classId, pin: u.pin }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return respond(names)
}

// POST /api/login  { role, userId, pin }
export function login(role, userId, pin) {
  const user = usersFor(role).find((u) => u.id === userId)
  if (!user || user.pin !== pin) return fail("That PIN doesn't match. Try again.")
  const session = {
    id: user.id,
    role,
    name: displayName(user, role),
    firstName: user.name.split(' ')[0],
    classId: user.classId,
  }
  writeStorage(SESSION_KEY, session)
  return respond(session)
}

// Read once on page load, so a refresh keeps you logged in.
export function getSession() {
  return readStorage(SESSION_KEY)
}

// POST /api/logout
export function logout() {
  localStorage.removeItem(SESSION_KEY)
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

function loadProgress(studentId) {
  return readStorage(PROGRESS_KEY + studentId) ?? seedFor(studentId)
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

// Demo only: forget every saved change and go back to the seed data.
export function resetDemo() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(PROGRESS_KEY))
    .forEach((key) => localStorage.removeItem(key))
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

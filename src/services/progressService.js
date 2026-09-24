import seedProgress from '@/data/progress.json'
import { request } from '@/services/api'

const STORAGE_PREFIX = 'ignite:progress:'

// localStorage can throw (private browsing, storage full, disabled cookies),
// so every read/write is wrapped rather than trusted.
function readStored(studentId) {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + studentId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStored(studentId, progress) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + studentId, JSON.stringify(progress))
  } catch {
    // Demo still works for this session even if nothing persists.
  }
}

function emptyProgress(studentId) {
  return {
    studentId,
    completedLessons: [],
    quizAttempts: [],
    points: 0,
    badges: [],
    streak: 0,
    lastActive: null,
  }
}

function loadProgress(studentId) {
  const stored = readStored(studentId)
  if (stored) return stored

  const seed = seedProgress.find((p) => p.studentId === studentId)
  const initial = seed ? structuredClone(seed) : emptyProgress(studentId)
  writeStored(studentId, initial)
  return initial
}

export function getProgress(studentId) {
  return request(loadProgress(studentId))
}

// Synchronous, no artificial delay. classService reads several students'
// progress at once and wraps the combined result in a single request(),
// so each one going through its own delay would be wasted time.
export function peekProgress(studentId) {
  return loadProgress(studentId)
}

export function saveLessonComplete(studentId, lessonId) {
  const progress = loadProgress(studentId)
  if (!progress.completedLessons.includes(lessonId)) {
    progress.completedLessons.push(lessonId)
  }
  progress.lastActive = new Date().toISOString().slice(0, 10)
  writeStored(studentId, progress)
  return request(progress)
}

export function saveQuizAttempt(studentId, attempt) {
  const progress = loadProgress(studentId)
  progress.quizAttempts.push(attempt)
  progress.lastActive = new Date().toISOString().slice(0, 10)
  writeStored(studentId, progress)
  return request(progress)
}

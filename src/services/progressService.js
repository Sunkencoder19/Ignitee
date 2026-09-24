import seedProgress from '@/data/progress.json'
import { request } from '@/services/api'
import { isoDaysAgo, todayISO } from '@/lib/format'

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

// Seed dates are stored as "days ago" so the demo looks the same on any day:
// someone active yesterday is always active yesterday.
function hydrateSeed(seed) {
  return {
    studentId: seed.studentId,
    completedLessons: seed.completedLessons.map((l) => ({
      lessonId: l.lessonId,
      completedAt: isoDaysAgo(l.daysAgo),
    })),
    quizAttempts: seed.quizAttempts.map(({ daysAgo, ...attempt }) => ({
      ...attempt,
      date: isoDaysAgo(daysAgo),
    })),
    points: seed.points,
    badges: [...seed.badges],
    streak: seed.streak,
    lastActive: isoDaysAgo(seed.lastActiveDaysAgo),
  }
}

// Seed data is only written to storage once a student actually changes
// something. Writing it on first read would freeze the dates to that day.
function loadProgress(studentId) {
  const stored = readStored(studentId)
  if (stored) return stored

  const seed = seedProgress.find((p) => p.studentId === studentId)
  return seed ? hydrateSeed(seed) : emptyProgress(studentId)
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
  const alreadyDone = progress.completedLessons.some((l) => l.lessonId === lessonId)
  if (!alreadyDone) {
    const completedAt = todayISO()
    progress.completedLessons.push({ lessonId, completedAt })
    progress.lastActive = completedAt
  }
  writeStored(studentId, progress)
  return request(progress)
}

export function saveQuizAttempt(studentId, attempt) {
  const progress = loadProgress(studentId)
  progress.quizAttempts.push(attempt)
  progress.lastActive = todayISO()
  writeStored(studentId, progress)
  return request(progress)
}

// Wipes every student's saved progress so the next read falls back to the
// seed. Handy before a demo, or after a tester has clicked through everything.
export function resetDemoData() {
  try {
    const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(STORAGE_PREFIX))
    keys.forEach((k) => window.localStorage.removeItem(k))
  } catch {
    // Nothing stored, or storage is blocked; either way the seed is what loads.
  }
  return request(null)
}

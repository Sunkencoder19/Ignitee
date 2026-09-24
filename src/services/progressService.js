import seedProgress from '@/data/progress.json'
import { request } from '@/services/api'
import { isoDaysAgo } from '@/lib/format'

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
    firstTryRun: 0,
    firstTryBest: 0,
    bestStreak: 0,
    streakLog: [],
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
    firstTryRun: 0,
    firstTryBest: 0,
    bestStreak: seed.streak,
    streakLog: [],
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

// The rules (points, streak, badges) live in ProgressContext's reducer and
// lib/. This only stores the result. ProgressContext calls it after a lesson,
// a quiz or a badge, never on load, so untouched seed data stays relative to today.
// TODO(fattesing): with a backend this becomes PUT /students/:id/progress.
export function saveProgress(studentId, progress) {
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

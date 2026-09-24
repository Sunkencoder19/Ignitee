import badges from '@/data/badges.json'
import chapters from '@/data/chapters.json'
import students from '@/data/students.json'
import {
  assessmentStats,
  chapterAverages,
  classSummary,
  lessonsPerDay,
  studentSummary,
} from '@/lib/classStats'
import { todayISO } from '@/lib/format'
import { peekProgress } from '@/services/progressService'
import { request } from '@/services/api'

// Teacher-side reads. Each student's progress is whatever they've saved on
// this device, falling back to the seed, so a lesson Ishita finishes shows up
// here after a refresh. The numbers themselves come from lib/classStats.js.
// TODO(fattesing): progress lives in this browser's localStorage, so the
// teacher only sees work done on the same device until there's a backend.

// classId is '4A', '4B' or 'all'.
function rowsFor(classId) {
  return students
    .filter((s) => classId === 'all' || s.classId === classId)
    .map((student) => ({ student, progress: peekProgress(student.id) }))
}

export function getClassSummary(classId) {
  const today = todayISO()
  const rows = rowsFor(classId)
  return request({
    today,
    ...classSummary(rows, chapters, today),
    chapterAverages: chapterAverages(rows, chapters),
    lessonsPerDay: lessonsPerDay(rows, today, 14),
  })
}

export function getStudents(classId) {
  const today = todayISO()
  return request(
    rowsFor(classId).map((r) => studentSummary(r.student, r.progress, chapters, today))
  )
}

export function getStudentDetail(studentId) {
  const student = students.find((s) => s.id === studentId)
  if (!student) return Promise.reject(new Error(`No student found for id "${studentId}"`))

  const today = todayISO()
  const progress = peekProgress(studentId)
  const titleOf = (quizId) => chapters.find((c) => c.quizId === quizId)?.title ?? quizId

  return request({
    ...studentSummary(student, progress, chapters, today),
    badges: badges.filter((b) => progress.badges.includes(b.id)),
    recentAttempts: [...progress.quizAttempts]
      .reverse()
      .slice(0, 5)
      .map((a) => ({ ...a, chapterTitle: titleOf(a.quizId) })),
  })
}

export function getAssessments(classId) {
  return request(assessmentStats(rowsFor(classId), chapters))
}

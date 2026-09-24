import chapters from '@/data/chapters.json'
import lessons from '@/data/lessons.json'
import quizzes from '@/data/quizzes.json'
import { request } from '@/services/api'

export function getChapters() {
  return request(chapters)
}

export function getLesson(lessonId) {
  const lesson = lessons.find((l) => l.id === lessonId)
  if (!lesson) return Promise.reject(new Error(`No lesson found for id "${lessonId}"`))
  return request(lesson)
}

export function getQuiz(quizId) {
  const quiz = quizzes.find((q) => q.id === quizId)
  if (!quiz) return Promise.reject(new Error(`No quiz found for id "${quizId}"`))
  return request(quiz)
}

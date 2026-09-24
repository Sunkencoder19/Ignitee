import badges from '@/data/badges.json'
import chapters from '@/data/chapters.json'
import lessons from '@/data/lessons.json'
import quizzes from '@/data/quizzes.json'
import { request } from '@/services/api'

export function getChapters() {
  return request(chapters)
}

export function getBadges() {
  return request(badges)
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

// ChapterPage needs the chapter, its lessons and its quiz together. One call
// instead of the page fetching each lesson separately.
export function getChapterDetail(chapterId) {
  const chapter = chapters.find((c) => c.id === chapterId)
  if (!chapter) return Promise.reject(new Error(`No chapter found for id "${chapterId}"`))

  const chapterLessons = chapter.lessonIds
    .map((id) => lessons.find((l) => l.id === id))
    .filter(Boolean)
  const quiz = chapter.quizId ? quizzes.find((q) => q.id === chapter.quizId) : null

  return request({ chapter, lessons: chapterLessons, quiz })
}

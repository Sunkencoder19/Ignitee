// Pure functions, no React: turn raw chapters + progress into what the map
// and chapter page need to render. Easy to unit test later.

export function getBestQuizStars(quizId, progress) {
  const attempts = (progress?.quizAttempts ?? []).filter((a) => a.quizId === quizId)
  if (attempts.length === 0) return 0
  return Math.max(...attempts.map((a) => a.stars))
}

// Walks chapters in order. A chapter with content is 'done' once its quiz
// has 1+ star, 'current' if it's the first one not yet done, and 'locked'
// otherwise. A chapter with no content (ch5-14) is always 'locked'.
// Only one chapter can be 'current': accessibility cascades from the
// previous chapter's stars, so the frontier is always a single chapter.
export function getChapterMapEntries(chapters, progress) {
  let previousDone = true
  let previousTitle = null

  return chapters.map((chapter) => {
    const stars = chapter.quizId ? getBestQuizStars(chapter.quizId, progress) : 0
    const hasContent = !chapter.locked

    let state = 'locked'
    let lockedReason = 'Coming soon'
    if (hasContent) {
      if (previousDone && stars >= 1) {
        state = 'done'
      } else if (previousDone) {
        state = 'current'
      } else {
        lockedReason = previousTitle ? `Finish ${previousTitle} first` : 'Coming soon'
      }
    }

    // Only a chapter with content advances the frontier; a locked chapter
    // (no content) can't be "done", so nothing after it should look reachable.
    previousDone = previousDone && hasContent && stars >= 1
    previousTitle = chapter.title

    return { chapter, state, stars, lockedReason }
  })
}

export function getLessonStates(chapter, progress) {
  const doneIds = new Set((progress?.completedLessons ?? []).map((l) => l.lessonId))
  let nextFound = false

  return chapter.lessonIds.map((lessonId) => {
    if (doneIds.has(lessonId)) return { lessonId, state: 'done' }
    if (!nextFound) {
      nextFound = true
      return { lessonId, state: 'next' }
    }
    return { lessonId, state: 'not-started' }
  })
}

export function isQuizUnlocked(chapter, progress) {
  const doneIds = new Set((progress?.completedLessons ?? []).map((l) => l.lessonId))
  return chapter.lessonIds.every((id) => doneIds.has(id))
}

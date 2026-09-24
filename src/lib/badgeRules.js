// The seven badges from CLAUDE.md, one plain function each. Keys match the
// `rule` field in data/badges.json. Each takes the student's progress and the
// chapter list and answers "has this child earned it?" No clock, no React.

function bestStars(progress, quizId) {
  const stars = progress.quizAttempts.filter((a) => a.quizId === quizId).map((a) => a.stars)
  return stars.length ? Math.max(...stars) : 0
}

// "Finish a chapter" means what the chapter map calls done:
// every lesson finished and the quiz passed with at least 1 star.
function chapterFinished(progress, chapters, chapterId) {
  const chapter = chapters.find((c) => c.id === chapterId)
  if (!chapter?.quizId) return false
  const done = new Set(progress.completedLessons.map((l) => l.lessonId))
  return chapter.lessonIds.every((id) => done.has(id)) && bestStars(progress, chapter.quizId) >= 1
}

export const BADGE_RULES = {
  firstLesson: (progress) => progress.completedLessons.length > 0,

  finishChapter1: (progress, chapters) => chapterFinished(progress, chapters, 'ch1'),

  chapter3ThreeStars: (progress) => bestStars(progress, 'ch3-quiz') === 3,

  finishChapter4: (progress, chapters) => chapterFinished(progress, chapters, 'ch4'),

  fiveDayStreak: (progress) => progress.streak >= 5,

  // Any retake that beat every earlier attempt on the same quiz.
  quizRetryImproved: (progress) =>
    progress.quizAttempts.some((attempt, i) => {
      const earlier = progress.quizAttempts.slice(0, i).filter((a) => a.quizId === attempt.quizId)
      return earlier.length > 0 && attempt.score > Math.max(...earlier.map((a) => a.score))
    }),

  // Quiz answers only (lesson activities are practice). A hint or a miss
  // resets the run; firstTryBest remembers the longest run ever reached.
  tenFirstTryStreak: (progress) => (progress.firstTryBest ?? 0) >= 10,
}

// Badges whose rule now passes but that the child doesn't have yet.
// The already-have check is what stops a badge being awarded twice.
export function newlyEarnedBadges(badges, progress, chapters) {
  return badges
    .filter((badge) => !progress.badges.includes(badge.id))
    .filter((badge) => BADGE_RULES[badge.rule]?.(progress, chapters))
    .map((badge) => badge.id)
}

// Student home: what to do next, and how you are doing.

import { Link } from 'react-router-dom'
import { getChapters, getLesson, useData } from '../../api'
import {
  activeDays,
  addDays,
  badges,
  bestStreak,
  chapterStates,
  currentStreak,
  nextStep,
  today,
  totalPoints,
} from '../../game'
import { useSession } from '../../session'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Home() {
  const { user, progress } = useSession()
  const { data: chapters, error } = useData(() => getChapters(), [])

  const step = chapters ? nextStep(chapters, progress) : null
  const { data: lesson } = useData(
    () => (step?.kind === 'lesson' ? getLesson(step.lessonId) : Promise.resolve(null)),
    [step?.lessonId]
  )

  if (error) return <p className="text-warn">{error}</p>
  if (!chapters) return <p className="text-muted">Loading...</p>

  const isNew = progress.lessons.length === 0
  const lessonsTotal = chapters.reduce((sum, c) => sum + c.lessonIds.length, 0)
  const chaptersDone = chapterStates(chapters, progress).filter((c) => c.state === 'done').length
  const openChapters = chapters.filter((c) => !c.locked).length

  // The last 7 days, oldest first, and whether the student learned on each.
  const days = new Set(activeDays(progress))
  const week = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6))

  // The big card at the top: one clear thing to do next.
  let next = {
    title: 'You have finished every open chapter',
    detail: 'New chapters are coming soon. You can retake any quiz to get more stars.',
    to: '/student/learn',
    button: 'See all chapters',
  }
  if (step?.kind === 'lesson') {
    next = {
      title: lesson?.title ?? 'Your next lesson',
      detail: `Chapter ${step.chapter.number}: ${step.chapter.title}`,
      to: `/student/learn/${step.chapter.id}/${step.lessonId}`,
      button: isNew ? 'Start your first lesson' : 'Continue',
    }
  }
  if (step?.kind === 'quiz') {
    next = {
      title: `${step.chapter.title} quiz`,
      detail: 'You finished every lesson in this chapter. Time for the quiz.',
      to: `/student/quiz/${step.chapter.quizId}`,
      button: 'Start the quiz',
    }
  }

  const badgeList = badges(progress, chapters)
  const earnedCount = badgeList.filter((b) => b.earned).length

  const stats = [
    { label: 'Points', value: totalPoints(progress) },
    { label: 'Day streak', value: currentStreak(progress, today()) },
    { label: 'Best streak', value: bestStreak(progress) },
    { label: 'Lessons done', value: `${progress.lessons.length} of ${lessonsTotal}` },
    { label: 'Chapters done', value: `${chaptersDone} of ${openChapters}` },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold tracking-tight">
        {isNew ? `Hi ${user.firstName}! Let's start.` : `Hi ${user.firstName}!`}
      </h1>

      <section className="card border-accent p-6 md:p-8">
        <p className="text-sm font-bold text-accent">Up next</p>
        <h2 className="mt-1 text-2xl font-extrabold md:text-3xl">{next.title}</h2>
        <p className="mt-2 text-lg text-muted">{next.detail}</p>
        <Link to={next.to} className="btn btn-primary mt-6 w-full text-lg sm:w-auto">
          {next.button}
        </Link>
      </section>

      <section>
        <h2 className="text-lg font-extrabold">Your progress</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-sm text-muted">{s.label}</dt>
              <dd className="text-2xl font-extrabold">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="text-lg font-extrabold">This week</h2>
        <p className="text-sm text-muted">A filled day means you learned something that day.</p>
        <ol className="mt-3 grid max-w-md grid-cols-7 gap-2 text-center">
          {week.map((date) => {
            const [y, m, d] = date.split('-').map(Number)
            const name = WEEKDAYS[new Date(y, m - 1, d).getDay()]
            const learned = days.has(date)
            return (
              <li key={date}>
                <span
                  className={`block h-10 rounded-xl ${learned ? 'bg-accent' : 'border border-line bg-surface'}`}
                  aria-label={`${name}: ${learned ? 'learned' : 'no learning'}`}
                />
                <span className={`mt-1 block text-xs ${date === today() ? 'font-extrabold' : 'text-muted'}`}>
                  {date === today() ? 'Today' : name}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-extrabold">Badges</h2>
        <p className="text-sm text-muted">
          You have {earnedCount} of {badgeList.length}.
        </p>
        <ul className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
          {badgeList.map((b) => (
            <li key={b.name} className="flex items-center gap-4 px-4 py-3 not-last:border-b not-last:border-line">
              <span className="min-w-0 flex-1">
                <span className={`block font-bold ${b.earned ? '' : 'text-muted'}`}>{b.name}</span>
                <span className="block text-sm text-muted">{b.howTo}</span>
              </span>
              <span className={`text-sm font-bold ${b.earned ? 'text-good' : 'text-muted'}`}>
                {b.earned ? 'Earned' : 'Not yet'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

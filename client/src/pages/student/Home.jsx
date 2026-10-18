// Student home: what to do next, and how you are doing.
// Points, streak and badges come from the server (in `progress`); the
// chapters list says which chapter is open and which lessons are done.

import { Link } from 'react-router-dom'
import { getStudentChapters, useData } from '../../api'
import { activeDays, addDays, today } from '../../game'
import { useSession } from '../../session'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Home() {
  const { user, progress } = useSession()
  const { data: chapters, error, reload } = useData(() => getStudentChapters(), [])

  if (error) {
    return (
      <div>
        <p className="text-lg font-semibold">{error}</p>
        <button onClick={reload} className="btn btn-primary mt-4">
          Try again
        </button>
      </div>
    )
  }
  if (!chapters) return <p className="text-muted">Loading...</p>

  if (chapters.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Hi {user.firstName}!</h1>
        <section className="card p-6 md:p-8">
          <h2 className="text-2xl font-semibold">No chapters yet</h2>
          <p className="mt-2 text-lg text-muted">
            Your teacher hasn’t shared any chapters with {user.className} yet. Check again soon.
          </p>
        </section>
      </div>
    )
  }

  const isNew = progress.lessons.length === 0
  const lessonsTotal = chapters.reduce((sum, c) => sum + c.lessons.length, 0)
  const lessonsDone = chapters.reduce((sum, c) => sum + c.lessons.filter((l) => l.done).length, 0)
  const chaptersDone = chapters.filter((c) => c.state === 'done').length

  // The big card at the top: one clear thing to do next, in the open chapter.
  const open = chapters.find((c) => c.state === 'open')
  const nextLesson = open?.lessons.find((l) => !l.done)
  let next = {
    title: 'You have finished every chapter',
    detail: 'New chapters will appear when your teacher adds them. You can retake any quiz to get more stars.',
    to: '/student/learn',
    button: 'See all chapters',
  }
  if (open && nextLesson) {
    next = {
      title: nextLesson.title,
      detail: `Chapter ${open.number}: ${open.title}`,
      to: `/student/learn/${open.id}/${nextLesson.id}`,
      button: isNew ? 'Start your first lesson' : 'Continue',
    }
  } else if (open?.quiz) {
    next = {
      title: `${open.title} quiz`,
      detail: 'You finished every lesson in this chapter. Time for the quiz.',
      to: `/student/quiz/${open.quiz.id}`,
      button: 'Start the quiz',
    }
  }

  // The last 7 days, oldest first, and whether the student learned on each.
  const days = new Set(activeDays(progress))
  const week = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6))
  const earnedCount = progress.badges.filter((b) => b.earned).length

  const stats = [
    { label: 'Points', value: progress.points },
    { label: 'Day streak', value: progress.streak },
    { label: 'Best streak', value: progress.bestStreak },
    { label: 'Lessons done', value: `${lessonsDone} of ${lessonsTotal}` },
    { label: 'Chapters done', value: `${chaptersDone} of ${chapters.length}` },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">
        {isNew ? `Hi ${user.firstName}! Let's start.` : `Hi ${user.firstName}!`}
      </h1>

      <section className="card relative overflow-hidden p-6 shadow-float md:p-8">
        <span aria-hidden="true" className="gradient-band absolute inset-x-0 top-0 h-1.5" />
        <p className="font-semibold text-accent">Up next</p>
        <h2 className="mt-1 text-2xl font-semibold md:text-3xl">{next.title}</h2>
        <p className="mt-2 text-lg text-muted">{next.detail}</p>
        <Link to={next.to} className="btn btn-primary mt-6 w-full text-lg sm:w-auto">
          {next.button}
        </Link>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Your progress</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-muted">{s.label}</dt>
              <dd className="text-2xl font-semibold">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="text-lg font-semibold">This week</h2>
        <p className="text-muted">A filled day means you learned something that day.</p>
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
                <span className={`mt-1 block ${date === today() ? 'font-semibold text-accent' : 'text-muted'}`}>
                  {name}
                  {date === today() && <span className="sr-only"> (today)</span>}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Badges</h2>
        <p className="text-muted">
          You have {earnedCount} of {progress.badges.length}.
        </p>
        <ul className="mt-3 overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-line">
          {progress.badges.map((b) => (
            <li key={b.name} className="flex items-center gap-4 px-4 py-3 not-last:border-b not-last:border-line">
              <span className="min-w-0 flex-1">
                <span className={`block font-semibold ${b.earned ? '' : 'text-muted'}`}>{b.name}</span>
                <span className="block text-muted">{b.howTo}</span>
              </span>
              <span className={`font-semibold ${b.earned ? 'text-good' : 'text-muted'}`}>
                {b.earned ? 'Earned' : 'Not yet'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

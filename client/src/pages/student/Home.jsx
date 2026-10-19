// Student home: what to do next, and how you are doing.
// Points, streak and badges come from the server (in `progress`); the
// chapters list says which chapter is open and which lessons are done.

import { Link } from 'react-router-dom'
import { getStudentChapters, useData } from '../../api'
import { activeDays, addDays, today } from '../../game'
import LanguagePicker from '../../i18n/LanguagePicker'
import { useT } from '../../i18n/t'
import { useSession } from '../../session'

export default function Home() {
  const { user, progress } = useSession()
  const t = useT()
  // Refetched when the language changes, so chapter titles switch too.
  const { data: chapters, error, reload } = useData(() => getStudentChapters(), [user.language])

  if (error) {
    return (
      <div>
        <p className="text-lg font-semibold">{error}</p>
        <button onClick={reload} className="btn btn-primary mt-4">
          {t('common.tryAgain')}
        </button>
      </div>
    )
  }
  if (!chapters) return <p className="text-muted">{t('common.loading')}</p>

  if (chapters.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">{t('home.hello', { name: user.firstName })}</h1>
        <section className="card p-6 md:p-8">
          <h2 className="text-2xl font-semibold">{t('home.noChaptersTitle')}</h2>
          <p className="mt-2 text-lg text-muted">{t('home.noChaptersText', { className: user.className })}</p>
        </section>
        <LanguageSection />
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
    title: t('home.allDoneTitle'),
    detail: t('home.allDoneText'),
    to: '/student/learn',
    button: t('home.seeAllChapters'),
  }
  if (open && nextLesson) {
    next = {
      title: nextLesson.title,
      detail: t('home.chapterLine', { number: open.number, title: open.title }),
      to: `/student/learn/${open.id}/${nextLesson.id}`,
      button: isNew ? t('home.startFirstLesson') : t('home.continue'),
    }
  } else if (open?.quiz) {
    next = {
      title: t('home.quizTitle', { title: open.title }),
      detail: t('home.quizReady'),
      to: `/student/quiz/${open.quiz.id}`,
      button: t('home.startQuiz'),
    }
  }

  // The last 7 days, oldest first, and whether the student learned on each.
  const days = new Set(activeDays(progress))
  const week = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6))
  const earnedCount = progress.badges.filter((b) => b.earned).length

  const stats = [
    { label: t('home.statPoints'), value: progress.points },
    { label: t('home.statStreak'), value: progress.streak },
    { label: t('home.statBestStreak'), value: progress.bestStreak },
    { label: t('home.statLessons'), value: t('home.xOfY', { done: lessonsDone, total: lessonsTotal }) },
    { label: t('home.statChapters'), value: t('home.xOfY', { done: chaptersDone, total: chapters.length }) },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">
        {isNew ? t('home.helloNew', { name: user.firstName }) : t('home.hello', { name: user.firstName })}
      </h1>

      <section className="card relative overflow-hidden p-6 shadow-float md:p-8">
        <span aria-hidden="true" className="gradient-band absolute inset-x-0 top-0 h-1.5" />
        <p className="font-semibold text-accent">{t('home.upNext')}</p>
        <h2 className="mt-1 text-2xl font-semibold md:text-3xl">{next.title}</h2>
        <p className="mt-2 text-lg text-muted">{next.detail}</p>
        <Link to={next.to} className="btn btn-primary mt-6 w-full text-lg sm:w-auto">
          {next.button}
        </Link>
      </section>

      <section>
        <h2 className="text-lg font-semibold">{t('home.progressTitle')}</h2>
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
        <h2 className="text-lg font-semibold">{t('home.weekTitle')}</h2>
        <p className="text-muted">{t('home.weekHelp')}</p>
        <ol className="mt-3 grid max-w-md grid-cols-7 gap-2 text-center">
          {week.map((date) => {
            const [y, m, d] = date.split('-').map(Number)
            const name = t(`weekdays.${new Date(y, m - 1, d).getDay()}`)
            const learned = days.has(date)
            return (
              <li key={date}>
                <span
                  className={`block h-10 rounded-xl ${learned ? 'bg-accent' : 'border border-line bg-surface'}`}
                  aria-label={t(learned ? 'home.dayLearned' : 'home.dayNotLearned', { day: name })}
                />
                <span className={`mt-1 block ${date === today() ? 'font-semibold text-accent' : 'text-muted'}`}>
                  {name}
                  {date === today() && <span className="sr-only"> {t('home.today')}</span>}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-semibold">{t('home.badgesTitle')}</h2>
        <p className="text-muted">{t('home.badgesCount', { earned: earnedCount, total: progress.badges.length })}</p>
        <ul className="mt-3 overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-line">
          {progress.badges.map((b) => (
            <li key={b.id} className="flex items-center gap-4 px-4 py-3 not-last:border-b not-last:border-line">
              <span className="min-w-0 flex-1">
                <span className={`block font-semibold ${b.earned ? '' : 'text-muted'}`}>{t(`badges.${b.id}.name`)}</span>
                <span className="block text-muted">{t(`badges.${b.id}.howTo`)}</span>
              </span>
              <span className={`font-semibold ${b.earned ? 'text-good' : 'text-muted'}`}>
                {b.earned ? t('home.earned') : t('home.notYet')}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <LanguageSection />
    </div>
  )
}

// The language picker, at the bottom of Home. The choice is saved on the
// student's account, so it follows them to any phone they log in on.
function LanguageSection() {
  const t = useT()
  return (
    <section>
      <h2 className="text-lg font-semibold">{t('home.languageTitle')}</h2>
      <div className="mt-3">
        <LanguagePicker />
      </div>
    </section>
  )
}

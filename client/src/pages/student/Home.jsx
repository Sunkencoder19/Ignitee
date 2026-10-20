// Student home: the buddy says hello, one big thing to do next, the daily
// challenge, and how the week is going. Points, coins and the streak come from
// the server (in `progress`); the worlds list says which world is open and which
// levels are done.

import { Link } from 'react-router-dom'
import { getDaily, getStudentChapters, useData } from '../../api'
import Buddy from '../../Buddy'
import { activeDays, addDays, today } from '../../game'
import { useT } from '../../i18n/t'
import { Flame, Stars } from '../../Rewards'
import { useSession } from '../../session'

export default function Home() {
  const { user, progress } = useSession()
  const t = useT()
  // Refetched when the language changes, so titles switch too.
  const { data: chapters, error, reload } = useData(() => getStudentChapters(), [user.language])
  const { data: daily } = useData(() => getDaily().catch(() => null), [user.language])

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

  const isNew = progress.lessons.length === 0
  const hello = (
    <div className="card flex items-center gap-4 p-4">
      <Buddy mascot={progress.mascot} size={112} label={t('home.buddyLabel')} className="float shrink-0" />
      <div className="min-w-0">
        <h1 className="text-3xl leading-tight">{isNew ? t('home.helloNew', { name: user.firstName }) : t('home.hello', { name: user.firstName })}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-muted">
          <Flame size={22} />
          {progress.streak > 0 ? t('home.streakLine', { count: progress.streak }) : t('home.streakStart')}
        </p>
      </div>
    </div>
  )

  if (chapters.length === 0) {
    return (
      <div className="space-y-6">
        {hello}
        <section className="card p-6">
          <h2 className="text-2xl">{t('home.noChaptersTitle')}</h2>
          <p className="mt-2 text-lg text-muted">{t('home.noChaptersText', { className: user.className })}</p>
        </section>
      </div>
    )
  }

  const lessonsTotal = chapters.reduce((sum, c) => sum + c.lessons.length, 0)
  const lessonsDone = chapters.reduce((sum, c) => sum + c.lessons.filter((l) => l.done).length, 0)
  const worldsDone = chapters.filter((c) => c.state === 'done').length
  const starsEarned = chapters.reduce((sum, c) => sum + c.worldStars, 0)
  const starsTotal = chapters.reduce((sum, c) => sum + c.worldMax, 0)

  // The big card: one clear thing to do next, in the open world.
  const open = chapters.find((c) => c.state === 'open')
  const nextLesson = open?.lessons.find((l) => !l.done)
  let next = { title: t('home.allDoneTitle'), detail: t('home.allDoneText'), to: '/student/learn', button: t('home.seeAllChapters') }
  if (open && nextLesson) {
    next = {
      title: nextLesson.title,
      detail: t('home.chapterLine', { subject: t(`subjects.${open.subject}`), number: open.number, title: open.title }),
      to: `/student/learn/${open.id}/${nextLesson.id}`,
      button: isNew ? t('home.startFirstLesson') : t('home.continue'),
    }
  } else if (open?.quiz) {
    next = { title: t('home.quizTitle', { title: open.title }), detail: t('home.quizReady'), to: `/student/quiz/${open.quiz.id}`, button: t('home.startQuiz') }
  }

  // The last 7 days, oldest first, and whether the student learned on each.
  const days = new Set(activeDays(progress))
  const week = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6))

  const tiles = [
    { label: t('home.statLessons'), value: t('home.xOfY', { done: lessonsDone, total: lessonsTotal }), colour: '#2f6fed' },
    { label: t('home.statChapters'), value: t('home.xOfY', { done: worldsDone, total: chapters.length }), colour: '#0f7a4d' },
    { label: t('home.statBestStreak'), value: progress.bestStreak, colour: '#b45400' },
    { label: t('home.statStars'), value: t('home.xOfY', { done: starsEarned, total: starsTotal }), colour: '#7b3fe0' },
  ]

  return (
    <div className="space-y-6">
      {hello}

      <section className="card relative overflow-hidden p-6">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#6c3df0] via-[#ec4899] to-[#ff8a00]" />
        <p className="font-bold text-accent">{t('home.upNext')}</p>
        <h2 className="mt-1 text-2xl leading-snug md:text-3xl">{next.title}</h2>
        <p className="mt-1 text-lg text-muted">{next.detail}</p>
        <Link to={next.to} className="btn btn-primary mt-5 w-full text-xl">
          {next.button}
        </Link>
      </section>

      <Link
        to="/student/daily"
        className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-[#ffd84d] to-[#ff9f1a] p-5 text-[#1d2358] shadow-[0_5px_0_#d97a00] active:translate-y-0.5"
      >
        <span aria-hidden="true" className="hidden size-16 shrink-0 place-items-center rounded-2xl bg-white/70 min-[430px]:grid">
          <Stars earned={3} size={18} className="flex-wrap justify-center" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-2xl leading-tight">{t('daily.title')}</span>
          <span className="block text-lg font-semibold">
            {!daily || !daily.available ? t('daily.noneYet') : daily.done ? t('daily.doneLine', { points: daily.points }) : t('daily.readyLine')}
          </span>
        </span>
        {daily?.available && !daily.done && (
          <span className="shrink-0 rounded-full bg-[#1d2358] px-4 py-2 text-lg font-bold text-white">{t('daily.play')}</span>
        )}
      </Link>

      <section>
        <h2 className="text-xl">{t('home.weekTitle')}</h2>
        <ol className="mt-3 grid grid-cols-7 gap-2 text-center">
          {week.map((date) => {
            const [y, m, d] = date.split('-').map(Number)
            const name = t(`weekdays.${new Date(y, m - 1, d).getDay()}`)
            const learned = days.has(date)
            return (
              <li key={date}>
                <span
                  className={`grid h-12 place-items-center rounded-2xl ${learned ? 'bg-accent-soft ring-2 ring-accent' : 'bg-surface ring-1 ring-line'}`}
                  aria-label={t(learned ? 'home.dayLearned' : 'home.dayNotLearned', { day: name })}
                >
                  {learned && <Flame size={26} />}
                </span>
                <span className={`mt-1 block ${date === today() ? 'font-bold text-accent' : 'text-muted'}`}>
                  {name}
                  {date === today() && <span className="sr-only"> {t('home.today')}</span>}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <section>
        <h2 className="text-xl">{t('home.progressTitle')}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-2xl p-4 text-white shadow-[0_4px_0_rgb(0_0_0/0.25)]" style={{ background: tile.colour }}>
              <dt className="font-semibold">{tile.label}</dt>
              <dd className="font-display text-3xl">{tile.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}

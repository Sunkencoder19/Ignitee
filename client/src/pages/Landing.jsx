// Landing page: what IGNITE is, one real question to try, and plain
// descriptions of how it works. It uses no student data: the only example is
// the sample question, and the points and badges below are read straight
// from the real rules in shared/game.js, so they can't go out of date.
// Every sentence comes from i18n/*.json, in the language picked on this device.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { POINTS, badges } from '../game'
import LanguagePicker from '../i18n/LanguagePicker'
import { useT } from '../i18n/t'
import Question from '../Question'
import { useSession } from '../session'
import ThemeToggle from '../ThemeToggle'

// The seven badges, from the real badge rules (names come from i18n by id).
const BADGE_IDS = badges({ lessons: [], attempts: [] }, []).map((b) => b.id)

export default function Landing() {
  const { user } = useSession()
  const t = useT()
  const [tried, setTried] = useState(false)

  const home = user ? `/${user.role}` : '/login'
  const studentLink = user?.role === 'student' ? '/student' : '/login'
  const teacherLink = user?.role === 'teacher' ? '/teacher' : '/login'

  // A question from Chapter 1, checked right here (it carries its own answer),
  // built in the language on screen so its answer is in that language too.
  const sample = {
    id: 'sample',
    type: 'mcq',
    prompt: t('landing.sample.prompt'),
    options: ['circle', 'square', 'triangle', 'rectangle'].map((key) => t(`landing.sample.${key}`)),
    answer: t('landing.sample.triangle'),
    hint: t('landing.sample.hint'),
    explanation: t('landing.sample.explanation'),
  }

  const exampleChapters = [
    { number: 1, state: t('landing.exampleDone'), open: false },
    { number: 2, state: t('landing.exampleOpen'), open: true },
    { number: 3, state: t('landing.exampleLocked'), open: false },
  ]
  const steps = [
    { word: t('landing.readWord'), text: t('landing.readText') },
    { word: t('landing.tryWord'), text: t('landing.tryText') },
    { word: t('landing.quizWord'), text: t('landing.quizText') },
  ]
  const pointRules = [
    { points: POINTS.lesson, text: t('landing.pointsLesson') },
    { points: POINTS.firstTry, text: t('landing.pointsFirstTry') },
    { points: POINTS.afterHint, text: t('landing.pointsHint') },
    { points: POINTS.activeDay, text: t('landing.pointsDay') },
  ]
  const reportParts = [
    { title: t('landing.reportAccuracy'), text: t('landing.reportAccuracyText') },
    { title: t('landing.reportStruggling'), text: t('landing.reportStrugglingText') },
    { title: t('landing.reportAttention'), text: t('landing.reportAttentionText') },
    { title: t('landing.reportContent'), text: t('landing.reportContentText') },
  ]

  return (
    <div className="min-h-dvh overflow-x-hidden">
      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <span className="text-xl font-bold tracking-tight">IGNITE</span>
        <nav className="flex items-center gap-2 sm:gap-6">
          <ThemeToggle />
          <a href="#teachers" className="hidden text-sm font-medium text-muted hover:text-ink sm:inline">
            {t('landing.forTeachers')}
          </a>
          <Link to={home} className="btn btn-secondary min-h-10 px-5 text-sm">
            {user ? t('landing.myHome') : t('landing.logIn')}
          </Link>
        </nav>
      </header>

      <main>
        {/* ---------- hero: text left, a question to try on a gradient band right ---------- */}
        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 pt-10 md:grid-cols-[1.1fr_1fr] md:pt-16">
          <div className="rise">
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-[3.5rem]">
              {t('landing.headline1')}
              <br className="hidden sm:block" /> {t('landing.headline2')}
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">{t('landing.subtext')}</p>
            <Link to={studentLink} state={{ role: 'student' }} className="btn btn-primary mt-8 px-7 text-lg">
              {t('landing.startLearning')}
            </Link>
            <div className="mt-6">
              <LanguagePicker />
            </div>
          </div>

          <div className="rise-late relative">
            {/* The angled colour band sits behind the cards and runs off the right edge. */}
            <div aria-hidden="true" className="gradient-band absolute -inset-y-10 -left-6 right-[-50vw] -skew-y-6 rounded-l-[2.5rem]" />

            <div className="relative grid gap-4">
              <div className="card p-6 shadow-float md:p-7">
                <p className="mb-3 font-medium text-muted">{t('landing.tryOne')}</p>
                {/* key: a new language starts the question fresh, in that language */}
                <Question key={sample.prompt} question={sample} onDone={() => setTried(true)} />
                {tried && (
                  <p className="mt-4 text-muted">
                    {t('landing.tried')}{' '}
                    <Link to={studentLink} state={{ role: 'student' }} className="font-semibold text-accent underline">
                      {t('landing.startFirst')}
                    </Link>
                  </p>
                )}
              </div>

              <div className="card p-5 shadow-float lg:ml-16">
                <p className="font-medium text-muted">{t('landing.exampleTitle')}</p>
                <ol className="mt-3 space-y-2">
                  {exampleChapters.map((c) => (
                    <li key={c.number} className="flex items-center justify-between gap-4 rounded-xl bg-bg px-3 py-2">
                      <span className="font-medium">{t('landing.exampleChapter', { number: c.number })}</span>
                      <span className={c.open ? 'font-semibold text-accent' : 'text-muted'}>{c.state}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- how a lesson works: three steps on one connected line ---------- */}
        <section className="mx-auto max-w-6xl px-4 py-24">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">{t('landing.lessonTitle')}</h2>
          <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            <span aria-hidden="true" className="absolute left-0 right-0 top-[1.15rem] hidden h-px bg-line md:block" />
            {steps.map((step) => (
              <li key={step.word} className="relative">
                <span className="relative inline-block bg-bg pr-4 text-2xl font-semibold text-accent">{step.word}</span>
                <p className="mt-4 max-w-xs text-lg leading-relaxed text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- points, badges, leaderboard: a three-cell grid ---------- */}
        <section className="mx-auto max-w-6xl px-4 pb-24">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">{t('landing.rewardsTitle')}</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-[1fr_1.2fr] md:grid-rows-[auto_auto]">
            <div className="gradient-band rounded-2xl p-6 text-[#0b1f3a] shadow-card md:p-8">
              <h3 className="text-xl font-semibold">{t('landing.pointsTitle')}</h3>
              <ul className="mt-5 space-y-3">
                {pointRules.map((rule) => (
                  <li key={rule.text} className="flex items-baseline gap-3">
                    <span className="w-12 shrink-0 text-2xl font-semibold tabular-nums">{rule.points}</span>
                    <span className="font-medium">{rule.text}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 font-medium">{t('landing.pointsRetake')}</p>
            </div>

            <div className="card p-6 md:row-span-2 md:p-8">
              <h3 className="text-xl font-semibold">{t('landing.badgesTitle')}</h3>
              <ul className="mt-4 space-y-3">
                {BADGE_IDS.map((id) => (
                  <li key={id}>
                    <span className="font-semibold">{t(`badges.${id}.name`)}</span>
                    <span className="text-muted">. {t(`badges.${id}.howTo`)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-6">
              <h3 className="text-xl font-semibold">{t('landing.leaderboardTitle')}</h3>
              <p className="mt-2 text-muted">{t('landing.leaderboardText')}</p>
            </div>
          </div>
        </section>

        {/* ---------- for teachers: words left, what the reports cover right ---------- */}
        <section id="teachers" className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 md:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t('landing.teachersTitle')}</h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">{t('landing.teachersText')}</p>
              <Link to={teacherLink} state={{ role: 'teacher' }} className="btn btn-secondary mt-8">
                {t('landing.teacherView')}
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {reportParts.map((part) => (
                <li key={part.title} className="card">
                  <h3 className="font-semibold">{part.title}</h3>
                  <p className="mt-1 text-muted">{part.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4 py-10 text-sm text-muted">
        <span className="font-semibold text-ink">IGNITE</span>
        <span>{t('landing.footer')}</span>
      </footer>
    </div>
  )
}

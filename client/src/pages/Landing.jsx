// Landing page: what IGNITE is, one real question to try, and plain
// descriptions of how it works. It uses no student data: the only example is
// the sample question, and the points and badges below are read straight
// from the real rules in shared/game.js, so they can't go out of date.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { POINTS, badges } from '../game'
import Question from '../Question'
import { useSession } from '../session'

// One question from Chapter 1, checked right here (it carries its own answer).
const SAMPLE = {
  id: 'sample',
  type: 'mcq',
  prompt: 'A slice of pizza looks most like which shape?',
  options: ['Circle', 'Square', 'Triangle', 'Rectangle'],
  answer: 'Triangle',
  hint: 'Count its pointy corners.',
  explanation: 'A pizza slice has 3 corners and 3 sides, like a triangle.',
}

const STEPS = [
  { word: 'Read', text: 'A short idea in simple words, with an example from everyday life.' },
  { word: 'Try', text: 'Answer a question. A wrong answer shows a hint, then you try again.' },
  { word: 'Quiz', text: 'Pass the chapter quiz to earn stars and open the next chapter.' },
]

// How the chapter list looks to a student, with generic chapter names.
const EXAMPLE_CHAPTERS = [
  { name: 'Chapter 1', state: 'Done' },
  { name: 'Chapter 2', state: 'Open now' },
  { name: 'Chapter 3', state: 'Opens after Chapter 2' },
]

const POINT_RULES = [
  { points: POINTS.lesson, text: 'for each lesson, the first time' },
  { points: POINTS.firstTry, text: 'for a quiz answer right first time' },
  { points: POINTS.afterHint, text: 'for a quiz answer right after the hint' },
  { points: POINTS.activeDay, text: 'for each day you learn something' },
]

// The seven badges with how to earn each, from the real badge rules.
const BADGES = badges({ lessons: [], attempts: [] }, [])

const REPORT_PARTS = [
  { title: 'Accuracy by topic and chapter', text: 'From each student’s latest try at each quiz.' },
  { title: 'Who is struggling', text: 'Below 60% on a topic or chapter, once there are 3 answers to go on.' },
  { title: 'Who needs attention', text: 'A low quiz score, or no learning for 3 days or more.' },
  { title: 'Your own content', text: 'Write chapters, lessons and quizzes, preview them, then publish.' },
]

export default function Landing() {
  const { user } = useSession()
  const [tried, setTried] = useState(false)

  const home = user ? `/${user.role}` : '/login'
  const studentLink = user?.role === 'student' ? '/student' : '/login'
  const teacherLink = user?.role === 'teacher' ? '/teacher' : '/login'

  return (
    <div className="min-h-dvh overflow-x-hidden">
      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <span className="text-xl font-bold tracking-tight">IGNITE</span>
        <nav className="flex items-center gap-6">
          <a href="#teachers" className="hidden text-sm font-medium text-muted hover:text-ink sm:inline">
            For teachers
          </a>
          <Link to={home} className="btn btn-secondary min-h-10 px-5 text-sm">
            {user ? 'My home' : 'Log in'}
          </Link>
        </nav>
      </header>

      <main>
        {/* ---------- hero: text left, a question to try on a gradient band right ---------- */}
        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 pt-10 md:grid-cols-[1.1fr_1fr] md:pt-16">
          <div className="rise">
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-[3.5rem]">
              Class 4 maths,
              <br className="hidden sm:block" /> a few minutes a day.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
              Short lessons and friendly quizzes from the NCERT Maths Mela book. Made for any phone.
            </p>
            <Link to={studentLink} state={{ role: 'student' }} className="btn btn-primary mt-8 px-7 text-lg">
              Start learning
            </Link>
          </div>

          <div className="rise-late relative">
            {/* The angled colour band sits behind the cards and runs off the right edge. */}
            <div aria-hidden="true" className="gradient-band absolute -inset-y-10 -left-6 right-[-50vw] -skew-y-6 rounded-l-[2.5rem]" />

            <div className="relative grid gap-4">
              <div className="card p-6 shadow-float md:p-7">
                <p className="mb-3 font-medium text-muted">Try one now</p>
                <Question question={SAMPLE} onDone={() => setTried(true)} />
                {tried && (
                  <p className="mt-4 text-muted">
                    That is how every lesson works.{' '}
                    <Link to={studentLink} state={{ role: 'student' }} className="font-semibold text-accent underline">
                      Start the first one
                    </Link>
                  </p>
                )}
              </div>

              <div className="card p-5 shadow-float lg:ml-16">
                <p className="font-medium text-muted">Example: how chapters open</p>
                <ol className="mt-3 space-y-2">
                  {EXAMPLE_CHAPTERS.map((c) => (
                    <li key={c.name} className="flex items-center justify-between gap-4 rounded-xl bg-bg px-3 py-2">
                      <span className="font-medium">{c.name}</span>
                      <span className={c.state === 'Open now' ? 'font-semibold text-accent' : 'text-muted'}>{c.state}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- how a lesson works: three steps on one connected line ---------- */}
        <section className="mx-auto max-w-6xl px-4 py-24">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">Every lesson works the same way.</h2>
          <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            <span aria-hidden="true" className="absolute left-0 right-0 top-[1.15rem] hidden h-px bg-line md:block" />
            {STEPS.map((step) => (
              <li key={step.word} className="relative">
                <span className="relative inline-block bg-bg pr-4 text-2xl font-semibold text-accent">{step.word}</span>
                <p className="mt-4 max-w-xs text-lg leading-relaxed text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- points, badges, leaderboard: a three-cell grid ---------- */}
        <section className="mx-auto max-w-6xl px-4 pb-24">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">Points, badges and a class leaderboard.</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-[1fr_1.2fr] md:grid-rows-[auto_auto]">
            <div className="gradient-band rounded-2xl p-6 text-[#0b1f3a] shadow-card md:p-8">
              <h3 className="text-xl font-semibold">How points add up</h3>
              <ul className="mt-5 space-y-3">
                {POINT_RULES.map((rule) => (
                  <li key={rule.text} className="flex items-baseline gap-3">
                    <span className="w-12 shrink-0 text-2xl font-semibold tabular-nums">{rule.points}</span>
                    <span className="font-medium">{rule.text}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 font-medium">Retaking a quiz only earns points for beating your best score.</p>
            </div>

            <div className="card p-6 md:row-span-2 md:p-8">
              <h3 className="text-xl font-semibold">Seven badges to collect</h3>
              <ul className="mt-4 space-y-3">
                {BADGES.map((b) => (
                  <li key={b.name}>
                    <span className="font-semibold">{b.name}</span>
                    <span className="text-muted">. {b.howTo}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-6">
              <h3 className="text-xl font-semibold">A leaderboard for each class</h3>
              <p className="mt-2 text-muted">
                Children see only their own class, with first names and points. Nothing else about anyone is shown.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- for teachers: words left, what the reports cover right ---------- */}
        <section id="teachers" className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 md:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">See who needs help before the next class.</h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">
                Every answer is checked by the server, so the reports show what children really know.
              </p>
              <Link to={teacherLink} state={{ role: 'teacher' }} className="btn btn-secondary mt-8">
                Open the teacher view
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {REPORT_PARTS.map((part) => (
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
        <span>Maths practice for CBSE Class 4, based on NCERT Maths Mela.</span>
      </footer>
    </div>
  )
}

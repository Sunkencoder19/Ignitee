// Landing page: what IGNITE is, a real question to try, and a look at the
// real app. Every preview on this page is built from the demo data with
// the same rules the app uses, so nothing here is a fake screenshot.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getDemoChapters, getDemoClass, useData } from '../api'
import { activeDays, addDays, badges, chapterResults, chapterStates, currentStreak, today, totalPoints } from '../game'
import Question from '../Question'
import { useSession } from '../session'

// A real question from Chapter 1, so visitors can feel how a lesson works.
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

export default function Landing() {
  const { user } = useSession()
  const [tried, setTried] = useState(false)
  // Demo class 4A, used for the previews further down.
  const { data } = useData(() => Promise.all([getDemoClass('4A'), getDemoChapters()]), [])

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
        {/* ---------- hero: text left, real app on a gradient band right ---------- */}
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
            <div
              aria-hidden="true"
              className="gradient-band absolute -inset-y-10 -left-6 right-[-50vw] -skew-y-6 rounded-l-[2.5rem]"
            />

            <div className="relative grid gap-4 lg:block lg:min-h-136">
              <ChapterPreview data={data} />
              <div className="card p-6 shadow-float md:p-7 lg:absolute lg:bottom-0 lg:right-0 lg:w-[80%]">
                <p className="mb-3 text-sm font-medium text-muted">Try one now</p>
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
            </div>
          </div>
        </section>

        {/* ---------- how a lesson works: three steps on one connected line ---------- */}
        <section className="mx-auto max-w-6xl px-4 py-24">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
            Every lesson works the same way.
          </h2>
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
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
            Points, badges and a class leaderboard.
          </h2>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Children earn points for every lesson and quiz. Retakes only count when they beat their best score.
          </p>
          <RewardsGrid data={data} />
        </section>

        {/* ---------- for teachers: real class preview left, words right ---------- */}
        <section id="teachers" className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 md:grid-cols-[1.1fr_1fr]">
            <ClassPreview data={data} />
            <div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">See who needs help before the next class.</h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">
                Quiz results for each chapter, lessons finished each day, and the students who have not practised for a
                few days.
              </p>
              <Link to={teacherLink} state={{ role: 'teacher' }} className="btn btn-secondary mt-8">
                Open the teacher view
              </Link>
            </div>
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

// ---------- previews (real data from demo class 4A) ----------

// Diya's chapter list, as she sees it on the Chapters page.
function ChapterPreview({ data }) {
  const rows = data ? chapterStates(data[1], data[0].find((r) => r.student.id === 's2').progress).slice(0, 4) : []
  const label = { done: 'Done', open: 'Open now', locked: 'Locked', soon: 'Coming soon' }

  return (
    <div className="card p-5 shadow-float lg:w-[72%]">
      <p className="text-sm font-medium text-muted">Diya&apos;s chapters</p>
      <ol className="mt-3 min-h-46 space-y-2">
        {rows.map(({ chapter, state, stars }) => (
          <li key={chapter.id} className="flex items-center justify-between gap-4 rounded-xl bg-bg px-3 py-2 text-sm">
            <span className="font-medium">
              {chapter.number}. {chapter.title}
            </span>
            <span className={state === 'open' ? 'font-semibold text-accent' : 'text-muted'}>
              {state === 'done' ? `${stars} of 3 stars` : label[state]}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function RewardsGrid({ data }) {
  const rows = data?.[0] ?? []
  const chapters = data?.[1] ?? []
  const aarav = rows.find((r) => r.student.id === 's1')?.progress
  const ranked = rows
    .map((r) => ({ id: r.student.id, name: r.student.name.split(' ')[0], points: totalPoints(r.progress) }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
  const days = aarav ? new Set(activeDays(aarav)) : new Set()
  const week = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6))

  return (
    <div className="mt-12 grid gap-5 md:grid-cols-[1.2fr_1fr] md:grid-rows-2">
      <div className="card p-6 md:row-span-2 md:p-8">
        <h3 className="text-xl font-semibold">Class 4A leaderboard</h3>
        <p className="text-sm text-muted">First names only, ranked by points.</p>
        <ol className="mt-6 min-h-64 space-y-2">
          {ranked.map((r, i) => (
            <li key={r.id} className={`flex items-center gap-4 rounded-xl px-4 py-3 ${i === 0 ? 'bg-accent-soft' : 'bg-bg'}`}>
              <span className="w-5 font-semibold text-muted">{i + 1}</span>
              <span className="flex-1 font-medium">{r.name}</span>
              <span className="font-semibold tabular-nums">{r.points} points</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="card p-6">
        <h3 className="text-xl font-semibold">Seven badges to collect</h3>
        <ul className="mt-4 min-h-30 space-y-2 text-sm">
          {aarav &&
            badges(aarav, chapters)
              .slice(0, 4)
              .map((b) => (
                <li key={b.name} className="flex justify-between gap-4">
                  <span>
                    <span className="font-medium">{b.name}</span>
                    <span className="text-muted">. {b.howTo}</span>
                  </span>
                  <span className={b.earned ? 'font-semibold text-good' : 'text-muted'}>{b.earned ? 'Earned' : 'Not yet'}</span>
                </li>
              ))}
        </ul>
      </div>

      <div className="gradient-band rounded-2xl p-6 text-[#0b1f3a] shadow-card">
        <h3 className="text-xl font-semibold">A streak for every day of learning</h3>
        <p className="mt-1 text-sm font-medium">
          Aarav has learned {aarav ? currentStreak(aarav, today()) : 0} days in a row.
        </p>
        <ol className="mt-5 grid grid-cols-7 gap-2">
          {week.map((date) => (
            <li
              key={date}
              className={`h-10 rounded-xl ${days.has(date) ? 'bg-white/90' : 'bg-white/30'}`}
              aria-label={days.has(date) ? 'Learned' : 'No learning'}
            />
          ))}
        </ol>
      </div>
    </div>
  )
}

// Class 4A quiz averages, as the teacher sees them on the Overview page.
function ClassPreview({ data }) {
  const results = data ? chapterResults(data[0], data[1]) : []

  return (
    <div className="card p-6 shadow-float md:p-8">
      <p className="text-sm font-medium text-muted">Class 4A, quiz results by chapter</p>
      <ul className="mt-6 min-h-56 space-y-5">
        {results.map((r) => (
          <li key={r.chapter.id}>
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {r.chapter.number}. {r.chapter.title}
              </span>
              <span className="font-semibold tabular-nums">{r.average === null ? 'Not taken' : `${r.average}%`}</span>
            </div>
            {r.average !== null && (
              <div className="gradient-band mt-2 h-2 rounded-full" style={{ width: `${r.average}%` }} />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

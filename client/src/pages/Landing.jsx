// Landing page: what IGNITE is, a real question to try, and a way in for
// students and teachers.

import { useState } from 'react'
import { Link } from 'react-router-dom'
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
  { word: 'Try', text: 'Answer a question. Get it wrong and you see a hint, then try again.' },
  { word: 'Quiz', text: 'Finish the chapter quiz to earn stars and open the next chapter.' },
]

export default function Landing() {
  const { user } = useSession()
  const [tried, setTried] = useState(false)

  // Already logged in: buttons go straight to your own home page.
  const studentLink = user?.role === 'student' ? '/student' : '/login'
  const teacherLink = user?.role === 'teacher' ? '/teacher' : '/login'

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="text-xl font-extrabold tracking-tight">IGNITE</span>
        <Link to={user ? `/${user.role}` : '/login'} className="btn btn-secondary min-h-10 text-sm">
          {user ? 'My home' : 'Log in'}
        </Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-8 md:grid-cols-2 md:pt-16">
          <div>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-balance md:text-5xl lg:text-6xl">
              Class 4 maths, a few minutes a day.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
              Short lessons and friendly quizzes from the NCERT Maths Mela book. Made for any phone.
            </p>
            <Link to={studentLink} state={{ role: 'student' }} className="btn btn-primary mt-8 text-lg">
              Start learning
            </Link>
          </div>

          <div className="card p-6 shadow-[0_12px_40px_-16px_rgb(24_24_27/0.18)] md:p-8">
            <p className="mb-4 text-sm font-bold text-muted">Try one now</p>
            <Question question={SAMPLE} onDone={() => setTried(true)} />
            {tried && (
              <p className="mt-4 text-muted">
                That is how every lesson works.{' '}
                <Link to={studentLink} state={{ role: 'student' }} className="font-bold text-accent underline">
                  Start the first one
                </Link>
              </p>
            )}
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <h2 className="text-3xl font-extrabold tracking-tight">How a lesson works</h2>
            <div className="mt-10 space-y-8">
              {STEPS.map((step) => (
                <div key={step.word} className="grid gap-1 md:grid-cols-[10rem_1fr] md:gap-8">
                  <h3 className="text-2xl font-extrabold text-accent">{step.word}</h3>
                  <p className="max-w-xl text-lg text-muted">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-20 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">For teachers</h2>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
                See every student&apos;s quiz scores and lessons, and who has not practised for a few
                days, so you know who needs help before the next class.
              </p>
            </div>
            <Link to={teacherLink} state={{ role: 'teacher' }} className="btn btn-secondary text-lg">
              Open the teacher view
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">
        IGNITE. Maths practice for CBSE Class 4.
      </footer>
    </div>
  )
}

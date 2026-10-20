// Landing page: what IGNITE is, for small children first (and their teachers and
// parents). It is playful on purpose, like the student side: buddies, bright
// colours, one question to try, and plain short sentences. It is about learning in
// general, not one subject or class. It uses no student data. Every sentence comes
// from i18n/*.json, in the language picked on this device.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import Buddy from '../Buddy'
import { SUBJECTS } from '../game'
import LanguagePicker from '../i18n/LanguagePicker'
import { useT } from '../i18n/t'
import Question from '../Question'
import { Coin, Flame, Stars } from '../Rewards'
import { useSession } from '../session'
import ThemeToggle from '../ThemeToggle'

// A few buddies, dressed differently, to say hello.
const BUDDIES = [
  { buddy: 'fox', hat: 'party', face: null, neck: 'bow', background: 'sky' },
  { buddy: 'panda', hat: 'cap', face: 'round', neck: null, background: 'sunset' },
  { buddy: 'monkey', hat: 'chef', face: null, neck: 'scarf', background: 'forest' },
  { buddy: 'owl', hat: 'wizard', face: 'stars', neck: null, background: 'space' },
]

export default function Landing() {
  const { studentUser, teacherUser } = useSession()
  const user = studentUser ?? teacherUser
  const t = useT()
  const [tried, setTried] = useState(false)

  const home = user ? `/${user.role}` : '/login'
  const studentLink = studentUser ? '/student' : '/login'
  const teacherLink = teacherUser ? '/teacher' : '/login'

  // A question to try right here (it carries its own answer), built in the
  // language on screen so its answer is in that language too.
  const sample = {
    id: 'sample',
    type: 'mcq',
    prompt: t('landing.sample.prompt'),
    options: ['cow', 'dog', 'lion', 'fish'].map((key) => t(`landing.sample.${key}`)),
    answer: t('landing.sample.cow'),
    hint: t('landing.sample.hint'),
    explanation: t('landing.sample.explanation'),
  }

  const steps = [
    { word: t('landing.learnWord'), text: t('landing.learnText'), colour: '#2f6fed' },
    { word: t('landing.playWord'), text: t('landing.playText'), colour: '#b45400' },
    { word: t('landing.winWord'), text: t('landing.winText'), colour: '#0f7a4d' },
  ]
  const rewards = [
    { title: t('landing.starsTitle'), text: t('landing.starsText'), art: <Stars earned={3} size={34} /> },
    { title: t('landing.coinsTitle'), text: t('landing.coinsText'), art: <Coin size={48} /> },
    { title: t('landing.buddyTitle'), text: t('landing.buddyText'), art: <Buddy mascot={BUDDIES[1]} size={64} bare /> },
    { title: t('landing.dailyTitle'), text: t('landing.dailyText'), art: <Flame size={48} /> },
  ]
  const features = [
    { title: t('landing.featureSubjects'), text: t('landing.featureSubjectsText') },
    { title: t('landing.featureActivities'), text: t('landing.featureActivitiesText') },
    { title: t('landing.featureLanguages'), text: t('landing.featureLanguagesText') },
    { title: t('landing.featureReports'), text: t('landing.featureReportsText') },
  ]

  return (
    <div className="kid min-h-dvh overflow-x-hidden">
      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <span className="font-display text-3xl text-accent">IGNITE</span>
        <nav className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <a href="#teachers" className="hidden min-h-12 items-center font-semibold text-muted hover:text-ink sm:inline-flex">
            {t('landing.forTeachers')}
          </a>
          <Link to={home} className="btn btn-secondary min-h-12 px-5">
            {user ? t('landing.myHome') : t('landing.logIn')}
          </Link>
        </nav>
      </header>

      <main>
        {/* ---------- hero: a big hello, buddies, and a question to try ---------- */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 md:grid-cols-[1.1fr_1fr] md:pt-12">
          <div className="rise">
            <h1 className="text-5xl leading-[1.05] md:text-6xl lg:text-7xl">
              {t('landing.headline1')}
              <br />
              <span className="text-accent">{t('landing.headline2')}</span>
            </h1>
            <p className="mt-5 max-w-lg text-xl leading-relaxed text-muted">{t('landing.subtext')}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to={studentLink} state={{ role: 'student' }} className="btn btn-primary px-8 text-xl">
                {t('landing.startLearning')}
              </Link>
              <Link to={teacherLink} state={{ role: 'teacher' }} className="btn btn-secondary px-6">
                {t('landing.imTeacher')}
              </Link>
            </div>
            <div className="mt-6">
              <LanguagePicker />
            </div>
          </div>

          <div className="rise-late">
            <div className="flex justify-center gap-2 sm:gap-4">
              {BUDDIES.map((mascot, i) => (
                <div key={i} className="float" style={{ animationDelay: `${i * 450}ms` }}>
                  <Buddy mascot={mascot} size={72} />
                </div>
              ))}
            </div>
            <div className="card mt-5 p-6">
              <p className="mb-3 text-lg font-bold text-accent">{t('landing.tryOne')}</p>
              {/* key: a new language starts the question fresh, in that language */}
              <Question key={sample.prompt} question={sample} onDone={() => setTried(true)} />
              {tried && (
                <p className="mt-4 text-lg font-semibold">
                  {t('landing.tried')}{' '}
                  <Link to={studentLink} state={{ role: 'student' }} className="text-accent underline">
                    {t('landing.startFirst')}
                  </Link>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ---------- learn anything: the subjects ---------- */}
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="text-4xl md:text-5xl">{t('landing.subjectsTitle')}</h2>
          <p className="mt-2 max-w-xl text-xl text-muted">{t('landing.subjectsText')}</p>
          <ul className="mt-6 flex flex-wrap gap-3">
            {SUBJECTS.map((subject) => (
              <li key={subject.id} className="rounded-full px-6 py-3 font-display text-2xl text-white shadow-[0_5px_0_rgb(0_0_0/0.22)]" style={{ background: subject.colour }}>
                {t(`subjects.${subject.id}`)}
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- how it works ---------- */}
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="text-4xl md:text-5xl">{t('landing.howTitle')}</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.word} className="card flex items-start gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-full font-display text-3xl text-white" style={{ background: step.colour }}>
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-2xl">{step.word}</h3>
                  <p className="mt-1 text-lg text-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- stars, coins, buddy, daily challenge ---------- */}
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="text-4xl md:text-5xl">{t('landing.rewardsTitle')}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rewards.map((r) => (
              <li key={r.title} className="card flex flex-col items-center text-center">
                <span className="grid h-16 place-items-center">{r.art}</span>
                <h3 className="mt-2 text-2xl">{r.title}</h3>
                <p className="mt-1 text-lg text-muted">{r.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- for teachers ---------- */}
        <section id="teachers" className="border-y-2 border-line bg-surface/70">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="text-4xl md:text-5xl">{t('landing.teachersTitle')}</h2>
              <p className="mt-4 max-w-md text-xl leading-relaxed text-muted">{t('landing.teachersText')}</p>
              <Link to={teacherLink} state={{ role: 'teacher' }} className="btn btn-secondary mt-7">
                {t('landing.teacherView')}
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {features.map((f) => (
                <li key={f.title} className="card">
                  <h3 className="text-xl">{f.title}</h3>
                  <p className="mt-1 text-lg text-muted">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4 py-10 text-base text-muted">
        <span className="font-display text-xl text-ink">IGNITE</span>
        <span>{t('landing.footer')}</span>
      </footer>
    </div>
  )
}

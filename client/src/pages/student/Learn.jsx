// The worlds: every chapter the teacher has published for this class. A chapter is
// a world, and worlds are grouped by subject. Finishing a world's quiz (1 star or
// more) opens the next world IN THE SAME SUBJECT.

import { Link } from 'react-router-dom'
import { getStudentChapters, useData } from '../../api'
import { SUBJECTS, subjectColour } from '../../game'
import { useT } from '../../i18n/t'
import { Stars } from '../../Rewards'

function Lock() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2.5" fill="currentColor" fillOpacity="0.15" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export default function Learn() {
  const t = useT()
  const { data: worlds, error, reload } = useData(() => getStudentChapters(), [])

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
  if (!worlds) return <p className="text-muted">{t('common.loading')}</p>

  // Worlds grouped by subject, in the order the subjects are listed.
  const groups = SUBJECTS.map((subject) => ({ subject, worlds: worlds.filter((w) => w.subject === subject.id) })).filter((g) => g.worlds.length > 0)

  return (
    <div>
      <h1 className="text-4xl">{t('learn.title')}</h1>
      <p className="mt-1 text-lg text-muted">{worlds.length === 0 ? t('learn.empty') : t('learn.help')}</p>

      {groups.map(({ subject, worlds: inSubject }) => (
      <section key={subject.id} className="mt-6">
        {groups.length > 1 && (
          <h2 className="inline-block rounded-full px-5 py-1 text-2xl text-white" style={{ background: subject.colour }}>
            {t(`subjects.${subject.id}`)}
          </h2>
        )}
      <ol className="mt-4 space-y-4">
        {inSubject.map((world) => {
          const colour = subjectColour(world.subject)
          const locked = world.state === 'locked'
          const levels = world.lessons.length + (world.quiz ? 1 : 0)
          const levelsDone = world.lessons.filter((l) => l.done).length + (world.stars > 0 ? 1 : 0)
          const body = (
            <>
              <span
                className={`relative grid size-16 shrink-0 place-items-center rounded-full font-display text-3xl text-white ${world.state === 'open' ? 'pulse-ring' : ''}`}
                style={{ background: locked ? 'var(--color-muted)' : colour }}
              >
                {locked ? <Lock /> : world.number}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-2xl leading-tight">{world.title}</span>
                {locked ? (
                  <span className="block text-lg text-muted">{t('learn.locked', { number: world.number - 1 })}</span>
                ) : (
                  <>
                    <span className="mt-1 flex items-center gap-2">
                      <span className="h-3 flex-1 overflow-hidden rounded-full bg-line" role="presentation">
                        <span className="block h-full rounded-full" style={{ width: `${levels ? (levelsDone / levels) * 100 : 0}%`, background: colour }} />
                      </span>
                      <span className="text-base font-semibold text-muted">{t('learn.levelsOf', { done: levelsDone, total: levels })}</span>
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <Stars earned={world.stars} size={22} />
                      <span className="text-base font-semibold text-muted">{t('learn.starsOf', { earned: world.worldStars, total: world.worldMax })}</span>
                    </span>
                  </>
                )}
              </span>
            </>
          )
          return (
            <li key={world.id}>
              {locked ? (
                <div className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-line bg-surface/50 p-4 text-muted">{body}</div>
              ) : (
                <Link to={`/student/learn/${world.id}`} className="card flex items-center gap-4 p-4 active:translate-y-0.5" style={world.state === 'open' ? { outline: `3px solid ${colour}` } : undefined}>
                  {body}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
      </section>
      ))}
    </div>
  )
}

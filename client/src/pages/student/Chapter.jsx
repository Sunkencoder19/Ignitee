// One world as a map: its levels (the lessons) on a winding path, then the chapter
// quiz at the end as a trophy. Each finished level shows the stars it earned; your
// buddy stands next to the level to play next. The quiz opens once every level is done.

import { Link, useParams } from 'react-router-dom'
import { getStudentChapters, useData } from '../../api'
import Buddy from '../../Buddy'
import { useT } from '../../i18n/t'
import { subjectColour } from '../../game'
import { Stars } from '../../Rewards'
import { useSession } from '../../session'

const WIDTH = 320 // the map is drawn on a 320px wide canvas, centred on the screen
const STEP = 138 // distance between two levels going down the page
const TOP = 52
const XS = [160, 238, 160, 82] // the path swings left and right through these

export default function Chapter() {
  const { chapterId } = useParams()
  const t = useT()
  const { progress } = useSession()
  const { data: worlds, error, reload } = useData(() => getStudentChapters(), [chapterId])

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

  const index = worlds.findIndex((c) => c.id === chapterId)
  const world = worlds[index]
  if (!world) return <BackToWorlds message={t('chapter.notFound')} />
  if (world.state === 'locked') return <BackToWorlds message={t('chapter.notOpen', { title: world.title })} />

  const colour = subjectColour(world.subject)
  const nextLesson = world.lessons.find((l) => !l.done)
  const quizOpen = Boolean(world.quiz?.open)

  // Every stop on the map, in order: the levels, then the quiz.
  const stops = [
    ...world.lessons.map((lesson, i) => ({
      key: lesson.id,
      to: `/student/learn/${world.id}/${lesson.id}`,
      title: lesson.title,
      number: i + 1,
      done: lesson.done,
      stars: lesson.stars,
      next: lesson === nextLesson,
      kind: 'level',
    })),
    ...(world.quiz
      ? [{ key: 'quiz', to: quizOpen ? `/student/quiz/${world.quiz.id}` : null, title: t('chapter.quizTitle'), done: world.stars > 0, stars: world.stars, next: !nextLesson, locked: !quizOpen, kind: 'quiz' }]
      : []),
  ]
  const points = stops.map((stop, i) => ({ x: XS[i % XS.length], y: TOP + i * STEP }))
  const height = TOP + (stops.length - 1) * STEP + 130

  return (
    <div className="mx-auto" style={{ maxWidth: WIDTH + 24 }}>
      <Link to="/student/learn" className="inline-flex min-h-12 items-center text-lg font-bold text-muted hover:text-ink">
        {t('common.backToChapters')}
      </Link>
      <div className="card mt-1 p-4 text-center" style={{ borderTop: `8px solid ${colour}` }}>
        <p className="font-bold" style={{ color: colour }}>
          {t(`subjects.${world.subject}`)}: {t('chapter.world', { number: world.number })}
        </p>
        <h1 className="text-3xl leading-tight">{world.title}</h1>
        <p className="mt-1 flex items-center justify-center gap-2 text-lg font-semibold text-muted">
          <Stars earned={Math.round((world.worldStars / Math.max(1, world.worldMax)) * 3)} size={26} />
          {t('learn.starsOf', { earned: world.worldStars, total: world.worldMax })}
        </p>
      </div>

      <div className="relative mx-auto mt-4" style={{ width: WIDTH, height }}>
        <svg width={WIDTH} height={height} className="absolute inset-0" aria-hidden="true" focusable="false">
          {points.slice(1).map((to, i) => {
            const from = points[i]
            return (
              <path
                key={i}
                d={`M${from.x} ${from.y} C${from.x} ${from.y + 70} ${to.x} ${to.y - 70} ${to.x} ${to.y}`}
                fill="none"
                stroke={stops[i].done ? colour : 'var(--color-line)'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={stops[i].done ? undefined : '2 18'}
              />
            )
          })}
        </svg>

        {stops.map((stop, i) => {
          const { x, y } = points[i]
          const size = stop.kind === 'quiz' ? 96 : 80
          const label = stop.locked
            ? t('chapter.nodeLocked', { title: stop.title })
            : stop.done
              ? t('chapter.nodeDone', { title: stop.title, stars: stop.stars })
              : t(stop.next ? 'chapter.nodeNext' : 'chapter.nodeOpen', { title: stop.title })
          const node = (
            <span
              className={`grid place-items-center rounded-full font-display text-4xl text-white shadow-[0_6px_0_rgb(0_0_0/0.28)] ${stop.next ? 'pulse-ring' : ''}`}
              style={{ width: size, height: size, background: stop.locked ? 'var(--color-muted)' : stop.kind === 'quiz' ? '#b45400' : colour }}
            >
              {stop.kind === 'quiz' ? <Trophy /> : stop.number}
            </span>
          )
          return (
            <div key={stop.key}>
              <div className="absolute flex flex-col items-center text-center" style={{ left: x - 78, top: y - size / 2, width: 156 }}>
                {stop.to ? (
                  <Link to={stop.to} aria-label={label} className="rounded-full active:translate-y-1">
                    {node}
                  </Link>
                ) : (
                  <span role="img" aria-label={label} className="opacity-70">
                    {node}
                  </span>
                )}
                <div className="mt-2">
                  {stop.done && <Stars earned={stop.stars} size={22} />}
                  <p className="font-display text-lg leading-tight">{stop.title}</p>
                  {stop.locked && <p className="text-base text-muted">{t('chapter.quizLocked')}</p>}
                </div>
              </div>
              {stop.next && !stop.locked && (
                <div className="wiggle absolute" style={{ left: x > 160 ? x - 150 : x + 76, top: y - 34, width: 64 }}>
                  <Buddy mascot={progress.mascot} size={64} bare />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Trophy() {
  return (
    <svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true" focusable="false" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="#ffc83d" stroke="#fff" strokeWidth="1.6" />
      <path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5" stroke="#fff" strokeWidth="1.6" />
      <path d="M12 14v3.5M8.5 20h7M10 17.5h4" stroke="#fff" strokeWidth="1.8" />
    </svg>
  )
}

function BackToWorlds({ message }) {
  const t = useT()
  return (
    <div>
      <p className="text-lg font-semibold">{message}</p>
      <Link to="/student/learn" className="btn btn-secondary mt-4">
        {t('common.backToChapters')}
      </Link>
    </div>
  )
}

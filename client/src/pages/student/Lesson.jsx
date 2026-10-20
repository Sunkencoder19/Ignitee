// A level: a few steps, shown one at a time:
//   explain  - the idea in simple words
//   example  - the idea in everyday life
//   activity - something to try, sometimes with a question
// Activity answers are checked by the server (the lesson arrives without
// answers) and count towards the level's stars. After the last step the server
// records the level and says how many stars and points it earned.

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { checkLessonAnswer, getStudentChapters, getStudentLesson, useData } from '../../api'
import Buddy from '../../Buddy'
import { useT } from '../../i18n/t'
import Question from '../../Question'
import Speak from '../../Speak'
import { Coin, Confetti, Stars } from '../../Rewards'
import { useSession } from '../../session'

// The colour of each kind of step (white text on all of them is easy to read).
const STEP_COLOUR = { explain: '#2f6fed', example: '#0f7a4d', activity: '#b45400' }

// key={lessonId}: going to the next level only changes the URL, so this
// makes React start the page fresh (step 1, nothing answered).
export default function Lesson() {
  const { lessonId } = useParams()
  return <LessonSteps key={lessonId} />
}

function LessonSteps() {
  const { chapterId, lessonId } = useParams()
  const { finishLesson } = useSession()
  const t = useT()
  const { data: lesson, error } = useData(() => getStudentLesson(lessonId), [lessonId])

  const [stepIndex, setStepIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [finished, setFinished] = useState(null) // the server's reply once the level is recorded

  if (error) {
    return (
      <div>
        <p className="text-lg font-semibold">{error}</p>
        <Link to={`/student/learn/${chapterId}`} className="btn btn-secondary mt-4">
          {t('common.backToChapter')}
        </Link>
      </div>
    )
  }
  if (!lesson) return <p className="text-muted">{t('common.loading')}</p>

  if (finished) return <FinishScreen lesson={lesson} result={finished} />

  const step = lesson.steps[stepIndex]
  const isLast = stepIndex === lesson.steps.length - 1
  const mustAnswer = step.type === 'activity' && step.question && !answered

  async function goNext() {
    if (!isLast) {
      setStepIndex(stepIndex + 1)
      setAnswered(false)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      setFinished(await finishLesson(lesson.id))
    } catch (err) {
      setSaveError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to={`/student/learn/${lesson.chapterId}`} aria-label={t('lesson.close')} className="grid size-12 shrink-0 place-items-center rounded-full bg-surface text-2xl font-bold text-muted shadow-[0_3px_0_var(--color-line)]">
          <span aria-hidden="true">&times;</span>
        </Link>
        <div
          className="h-4 flex-1 overflow-hidden rounded-full bg-surface ring-1 ring-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={lesson.steps.length}
          aria-valuenow={stepIndex + 1}
          aria-label={t('lesson.stepOf', { step: stepIndex + 1, total: lesson.steps.length })}
        >
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${((stepIndex + 1) / lesson.steps.length) * 100}%` }} />
        </div>
        <span className="text-lg font-bold text-muted">
          {stepIndex + 1}/{lesson.steps.length}
        </span>
      </div>

      <h1 className="mt-4 text-3xl leading-tight">{lesson.title}</h1>

      <section className="card mt-4 p-5 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-block rounded-full px-4 py-1 text-base font-bold text-white" style={{ background: STEP_COLOUR[step.type] }}>
            {t(`lesson.step.${step.type}`)}
          </span>
          <Speak text={step.text} />
        </div>
        <p className="mt-3 text-xl leading-relaxed">{step.text}</p>

        {step.question && (
          <div className="mt-6 border-t-2 border-dashed border-line pt-6">
            <Question
              key={step.question.id}
              question={step.question}
              check={(given) => checkLessonAnswer(lesson.id, step.question.id, given)}
              onDone={() => setAnswered(true)}
            />
          </div>
        )}
      </section>

      {saveError && (
        <p role="alert" className="mt-4 font-semibold text-warn">
          {t('lesson.saveFailed', { error: saveError })}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        {stepIndex > 0 && (
          <button
            onClick={() => {
              setStepIndex(stepIndex - 1)
              setAnswered(false)
            }}
            className="btn btn-secondary"
          >
            {t('lesson.back')}
          </button>
        )}
        {!mustAnswer && (
          <button onClick={goNext} disabled={saving} className="btn btn-primary flex-1 text-xl">
            {saving ? t('lesson.saving') : isLast ? t('lesson.finish') : t('lesson.next')}
          </button>
        )}
      </div>
    </div>
  )
}

// Stars, points and coins earned, any new badge, and one button to the next thing to do.
function FinishScreen({ lesson, result }) {
  const t = useT()
  const { progress } = useSession()
  const { data: worlds } = useData(() => getStudentChapters(), [])
  const world = worlds?.find((c) => c.id === lesson.chapterId)
  const index = world ? world.lessons.findIndex((l) => l.id === lesson.id) : -1
  const nextLesson = world?.lessons[index + 1]

  let main = { to: `/student/learn/${lesson.chapterId}`, label: t('common.backToChapter') }
  if (nextLesson) main = { to: `/student/learn/${world.id}/${nextLesson.id}`, label: t('lesson.nextLesson') }
  else if (world?.quiz?.open) main = { to: `/student/quiz/${world.quiz.id}`, label: t('lesson.takeQuiz') }

  return (
    <div className="card relative mx-auto max-w-xl overflow-hidden p-6 text-center">
      <Confetti />
      <Buddy mascot={progress.mascot} size={150} label={t('home.buddyLabel')} className="float mx-auto" />
      <h1 className="mt-2 text-4xl">{t('lesson.finishedTitle')}</h1>
      <p className="mt-1 text-lg text-muted">{lesson.title}</p>
      <div className="mt-4 flex justify-center">
        <Stars earned={result.stars} size={64} animate />
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <span className="pill text-xl">{t('common.plusPoints', { count: result.pointsEarned })}</span>
        <span className="pill text-xl">
          <Coin size={26} />
          {t('common.plusCoins', { count: result.coinsEarned })}
        </span>
      </div>
      {!result.firstTime && <p className="mt-3 text-muted">{t('lesson.alreadyDone')}</p>}
      {result.newBadges.length > 0 && (
        <p className="mt-4 rounded-2xl bg-good-soft p-3 text-lg font-bold text-good">
          {t('common.newBadge', { names: result.newBadges.map((id) => t(`badges.${id}.name`)).join(', ') })}
        </p>
      )}
      {worlds ? (
        <Link to={main.to} className="btn btn-primary mt-6 w-full text-xl">
          {main.label}
        </Link>
      ) : (
        <p className="mt-6 text-muted">{t('common.loading')}</p>
      )}
    </div>
  )
}

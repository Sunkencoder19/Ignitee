// A lesson is a few steps, shown one at a time:
//   explain  - the idea in simple words
//   example  - the idea in everyday life
//   activity - something to try, sometimes with a question
// Activity answers are checked by the server (the lesson arrives without
// answers). After the last step the server records the lesson and says how
// many points it earned.

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { checkLessonAnswer, getStudentChapters, getStudentLesson, useData } from '../../api'
import Question from '../../Question'
import { useSession } from '../../session'

const STEP_NAMES = { explain: 'Learn', example: 'Example', activity: 'Try it' }

// key={lessonId}: going to the next lesson only changes the URL, so this
// makes React start the page fresh (step 1, nothing answered).
export default function Lesson() {
  const { lessonId } = useParams()
  return <LessonSteps key={lessonId} />
}

function LessonSteps() {
  const { chapterId, lessonId } = useParams()
  const { finishLesson } = useSession()
  const { data: lesson, error } = useData(() => getStudentLesson(lessonId), [lessonId])

  const [stepIndex, setStepIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [finished, setFinished] = useState(null) // the server's reply once the lesson is recorded

  if (error) {
    return (
      <div>
        <p className="text-lg font-semibold">{error}</p>
        <Link to={`/student/learn/${chapterId}`} className="btn btn-secondary mt-4">
          Back to the chapter
        </Link>
      </div>
    )
  }
  if (!lesson) return <p className="text-muted">Loading...</p>

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
      <div className="flex items-center justify-between text-muted">
        <Link to={`/student/learn/${lesson.chapterId}`} className="inline-flex min-h-12 items-center font-semibold hover:text-ink">
          Close lesson
        </Link>
        <span>
          Step {stepIndex + 1} of {lesson.steps.length}
        </span>
      </div>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{lesson.title}</h1>

      <section className="card mt-4 p-6 md:p-8">
        <p className="font-semibold text-accent">{STEP_NAMES[step.type]}</p>
        <p className="mt-2 text-lg leading-relaxed">{step.text}</p>

        {step.question && (
          <div className="mt-6 border-t border-line pt-6">
            <Question
              key={step.question.id}
              question={step.question}
              check={(given, tries) => checkLessonAnswer(lesson.id, step.question.id, given, tries)}
              onDone={() => setAnswered(true)}
            />
          </div>
        )}
      </section>

      {saveError && (
        <p role="alert" className="mt-4 font-semibold text-warn">
          {saveError} Press Finish lesson to try again.
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
            Back
          </button>
        )}
        {!mustAnswer && (
          <button onClick={goNext} disabled={saving} className="btn btn-primary flex-1 text-lg">
            {saving ? 'Saving...' : isLast ? 'Finish lesson' : 'Next'}
          </button>
        )}
      </div>
    </div>
  )
}

// Points earned, any new badge, and one button to the next thing to do.
function FinishScreen({ lesson, result }) {
  const { data: chapters } = useData(() => getStudentChapters(), [])
  const chapter = chapters?.find((c) => c.id === lesson.chapterId)
  const index = chapter ? chapter.lessons.findIndex((l) => l.id === lesson.id) : -1
  const nextLesson = chapter?.lessons[index + 1]

  let main = { to: `/student/learn/${lesson.chapterId}`, label: 'Back to the chapter' }
  if (nextLesson) main = { to: `/student/learn/${chapter.id}/${nextLesson.id}`, label: 'Next lesson' }
  else if (chapter?.quiz?.open) main = { to: `/student/quiz/${chapter.quiz.id}`, label: 'Take the chapter quiz' }

  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <h1 className="text-3xl font-semibold">You finished it!</h1>
      <p className="mt-2 text-lg text-muted">{lesson.title}</p>
      <p className="mt-6 text-4xl font-semibold text-accent">+{result.pointsEarned} points</p>
      {!result.firstTime && <p className="mt-2 text-muted">You had already done this lesson, so no new points. Good practice!</p>}
      {result.newBadges.length > 0 && (
        <p className="mt-4 rounded-xl bg-good-soft p-3 font-semibold text-good">New badge: {result.newBadges.join(', ')}</p>
      )}
      {chapters ? (
        <Link to={main.to} className="btn btn-primary mt-8 w-full text-lg">
          {main.label}
        </Link>
      ) : (
        <p className="mt-8 text-muted">Loading...</p>
      )}
    </div>
  )
}

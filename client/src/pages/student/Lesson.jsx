// A lesson is a few steps, shown one at a time:
//   explain  - the idea in simple words
//   example  - the idea in everyday life
//   activity - a question to answer before moving on
// After the last step the lesson is saved and the student sees their points.

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getChapter, getChapters, useData } from '../../api'
import { chapterStates, quizOpen, totalPoints } from '../../game'
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
  const { progress, completeLesson } = useSession()
  const { data, error } = useData(() => Promise.all([getChapter(chapterId), getChapters()]), [chapterId])

  const [stepIndex, setStepIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [saving, setSaving] = useState(false)
  const [finished, setFinished] = useState(null) // { pointsEarned, progress } once saved

  if (error) return <Back to="/student/learn" message={error} />
  if (!data) return <p className="text-muted">Loading...</p>

  const [{ chapter, lessons }, chapters] = data
  const lesson = lessons.find((l) => l.id === lessonId)
  const state = chapterStates(chapters, progress).find((c) => c.chapter.id === chapter.id).state
  if (!lesson) return <Back to={`/student/learn/${chapter.id}`} message="We could not find that lesson." />
  if (state === 'locked' || state === 'soon') {
    return <Back to="/student/learn" message={`${chapter.title} isn't open yet.`} />
  }

  // ---- finished screen ----
  if (finished) {
    const index = lessons.indexOf(lesson)
    const next = lessons[index + 1]
    let main = { to: `/student/learn/${chapter.id}`, label: 'Back to the chapter' }
    if (next) main = { to: `/student/learn/${chapter.id}/${next.id}`, label: 'Next lesson' }
    else if (quizOpen(chapter, finished.progress)) main = { to: `/student/quiz/${chapter.quizId}`, label: 'Take the chapter quiz' }

    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <h1 className="text-3xl font-extrabold">You finished it!</h1>
        <p className="mt-2 text-lg text-muted">{lesson.title}</p>
        <p className="mt-6 text-4xl font-extrabold text-accent">+{finished.pointsEarned} points</p>
        {finished.pointsEarned === 0 && (
          <p className="mt-2 text-muted">You had already done this lesson, so no new points. Good practice!</p>
        )}
        <Link to={main.to} className="btn btn-primary mt-8 w-full text-lg">
          {main.label}
        </Link>
      </div>
    )
  }

  // ---- one step ----
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
    const before = totalPoints(progress)
    const after = await completeLesson(lesson.id)
    setFinished({ pointsEarned: totalPoints(after) - before, progress: after })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between text-sm text-muted">
        <Link to={`/student/learn/${chapter.id}`} className="font-bold hover:text-ink">
          Close lesson
        </Link>
        <span>
          Step {stepIndex + 1} of {lesson.steps.length}
        </span>
      </div>

      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{lesson.title}</h1>

      <section className="card mt-4 p-6 md:p-8">
        <p className="text-sm font-bold text-accent">{STEP_NAMES[step.type]}</p>
        <p className="mt-2 text-xl leading-relaxed">{step.text}</p>

        {step.type === 'activity' && step.question && (
          <div className="mt-6 border-t border-line pt-6">
            <Question key={step.question.id} question={step.question} onDone={() => setAnswered(true)} />
          </div>
        )}
      </section>

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
            {isLast ? 'Finish lesson' : 'Next'}
          </button>
        )}
      </div>
    </div>
  )
}

function Back({ to, message }) {
  return (
    <div>
      <p className="text-lg font-bold">{message}</p>
      <Link to={to} className="btn btn-secondary mt-4">
        Go back
      </Link>
    </div>
  )
}

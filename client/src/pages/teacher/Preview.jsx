// "Preview as student": plays a saved lesson or quiz the way a student sees it,
// with the same answer box (two tries, hint, then the answer). Nothing is
// recorded and no points are given.
//   /teacher/preview/:chapterId/lesson/:lessonId
//   /teacher/preview/:chapterId/quiz
// Order questions are shuffled here, just as the server will shuffle them for students.

import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getChapterForEditing, useData } from '../../api'
import { POINTS, answerPoints, inLanguage, localizeQuestion, scoreQuiz } from '../../game'
import { LanguageProvider } from '../../i18n/t'
import Question from '../../Question'
import { LanguageTabs } from '../../QuestionForm'

const STEP_NAMES = { explain: 'Learn', example: 'Example', activity: 'Try it' }

// Mixes up the order items so the preview doesn't show them already solved.
function shuffled(items) {
  for (let tries = 0; tries < 10; tries++) {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    if (copy.join('\n') !== items.join('\n')) return copy
  }
  return items
}

// The answer box shows `options` for mcq and order questions.
// The chapter as a student in `lang` would see it, using the same rules as the
// server (shared/game.js): each field in that language, or English if missing.
function inPreviewLanguage(chapter, lang) {
  return {
    ...chapter,
    title: inLanguage(chapter, 'title', lang),
    lessons: chapter.lessons.map((l) => ({
      ...l,
      title: inLanguage(l, 'title', lang),
      steps: l.steps.map((s) => ({
        ...s,
        text: inLanguage(s, 'text', lang),
        ...(s.question ? { question: localizeQuestion(s.question, lang) } : {}),
      })),
    })),
    quiz: chapter.quiz ? { ...chapter.quiz, questions: chapter.quiz.questions.map((q) => localizeQuestion(q, lang)) } : null,
  }
}

function forStudent(question) {
  return question.type === 'order' ? { ...question, options: shuffled(question.answer) } : question
}

export default function Preview() {
  const { chapterId, lessonId } = useParams()
  const { data: chapter, error } = useData(() => getChapterForEditing(chapterId), [chapterId])
  const backTo = lessonId ? `/teacher/content/${chapterId}` : `/teacher/content/${chapterId}/quiz`
  const [lang, setLang] = useState('en') // the language to preview in

  const languageSwitch = (
    <div className="mb-6">
      <p className="mb-2 font-semibold">Preview in</p>
      <LanguageTabs lang={lang} onChange={setLang} />
    </div>
  )

  const banner = (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-accent-soft px-4 py-2 ring-1 ring-accent">
      <p className="font-semibold">Preview as a student. Nothing is saved.</p>
      <Link to={backTo} className="inline-flex min-h-12 items-center font-semibold text-accent underline">
        Back to the editor
      </Link>
    </div>
  )

  if (error) return <div className="mx-auto max-w-2xl">{banner}<p className="text-warn">{error}</p></div>
  if (!chapter) return <p className="text-muted">Loading the preview...</p>

  // Everything below is shown as a student in `lang` would see it. key={lang}
  // starts the preview again when the language changes.
  const shown = inPreviewLanguage(chapter, lang)

  if (lessonId) {
    const lesson = shown.lessons.find((l) => l.id === lessonId)
    if (!lesson) return <div className="mx-auto max-w-2xl">{banner}<p className="text-lg font-semibold">That lesson no longer exists.</p></div>
    return (
      <div className="mx-auto max-w-2xl">
        {banner}
        {languageSwitch}
        <LanguageProvider value={lang}>
          <div lang={lang}>
            <LessonPreview key={`${lesson.id}-${lang}`} lesson={lesson} />
          </div>
        </LanguageProvider>
      </div>
    )
  }

  if (!shown.quiz) return <div className="mx-auto max-w-2xl">{banner}<p className="text-lg font-semibold">This chapter has no quiz yet.</p></div>
  return (
    <div className="mx-auto max-w-2xl">
      {banner}
      {languageSwitch}
      <LanguageProvider value={lang}>
        <div lang={lang}>
          <QuizPreview key={lang} chapter={shown} />
        </div>
      </LanguageProvider>
    </div>
  )
}

function LessonPreview({ lesson }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [finished, setFinished] = useState(false)
  const steps = useMemo(() => lesson.steps.map((s) => (s.question ? { ...s, question: forStudent(s.question) } : s)), [lesson])

  if (finished) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-3xl font-semibold">End of the lesson</h1>
        <p className="mt-2 text-lg text-muted">
          A student who finishes {lesson.title} for the first time earns {POINTS.lesson} points.
        </p>
        <button
          onClick={() => {
            setStepIndex(0)
            setAnswered(false)
            setFinished(false)
          }}
          className="btn btn-primary mt-8 w-full text-lg"
        >
          Start again
        </button>
      </div>
    )
  }

  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1
  const mustAnswer = step.type === 'activity' && step.question && !answered

  return (
    <div>
      <p className="text-muted">
        Step {stepIndex + 1} of {steps.length}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{lesson.title}</h1>
      <section className="card mt-4 p-6 md:p-8">
        <p className="font-semibold text-accent">{STEP_NAMES[step.type]}</p>
        <p className="mt-2 text-lg leading-relaxed">{step.text}</p>
        {step.question && (
          <div className="mt-6 border-t border-line pt-6">
            <Question key={stepIndex} question={step.question} onDone={() => setAnswered(true)} />
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
          <button
            onClick={() => {
              if (isLast) return setFinished(true)
              setStepIndex(stepIndex + 1)
              setAnswered(false)
            }}
            className="btn btn-primary flex-1 text-lg"
          >
            {isLast ? 'Finish lesson' : 'Next'}
          </button>
        )}
      </div>
    </div>
  )
}

function QuizPreview({ chapter }) {
  const [round, setRound] = useState(0) // bumping it starts the quiz again, freshly shuffled
  const questions = useMemo(() => chapter.quiz.questions.map(forStudent), [chapter, round])
  const [index, setIndex] = useState(0)
  const [outcomes, setOutcomes] = useState([])
  const [finished, setFinished] = useState(false)

  function restart() {
    setRound(round + 1)
    setIndex(0)
    setOutcomes([])
    setFinished(false)
  }

  if (finished) {
    const { score, stars } = scoreQuiz(outcomes)
    return (
      <div className="card p-8 text-center">
        <p className="text-muted">{chapter.title} quiz</p>
        <p className="mt-4 text-6xl font-semibold">{score}%</p>
        <p className="mt-2 text-xl font-semibold">{stars === 1 ? '1 star' : `${stars} stars`}</p>
        <p className="mt-4 text-muted">
          On a first try a student would earn {answerPoints(outcomes)} points for these answers.
          {stars >= 1 ? ' This passes, so the next chapter would open.' : ' This is below 50%, so the next chapter stays locked.'}
        </p>
        <button onClick={restart} className="btn btn-primary mt-8 w-full text-lg">
          Start again
        </button>
      </div>
    )
  }

  const question = questions[index]
  const answered = outcomes.length > index
  const isLast = index === questions.length - 1

  return (
    <div>
      <p className="text-muted">
        Question {index + 1} of {questions.length}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{chapter.title} quiz</h1>
      <section className="card mt-4 p-6 md:p-8">
        <Question key={`${round}-${index}`} question={question} onDone={({ outcome }) => setOutcomes([...outcomes, outcome])} />
      </section>
      {answered && (
        <button onClick={() => (isLast ? setFinished(true) : setIndex(index + 1))} className="btn btn-primary mt-6 w-full text-lg">
          {isLast ? 'See the score' : 'Next question'}
        </button>
      )}
    </div>
  )
}

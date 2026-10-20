// Editing one chapter: its title, which classes see it, publishing, its
// lessons (each a few steps), and a link to its quiz.
//
// Lessons are edited in place: "Edit" swaps the lesson's row for a form.
// "Preview as student" always shows the SAVED version, so it is offered on
// saved lessons, not inside the form.

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  addLesson,
  deleteChapter,
  deleteLesson,
  getChapterForEditing,
  getClasses,
  saveLessonOrder,
  updateChapter,
  updateLesson,
  useData,
} from '../../api'
import { LIMITS, SUBJECTS, lessonProblems } from '../../game'
import QuestionForm, { LanguageTabs, blankQuestion } from '../../QuestionForm'

const STEP_TYPES = [
  { value: 'explain', label: 'Explain', help: 'The idea, in simple words.' },
  { value: 'example', label: 'Example', help: 'The idea in everyday life.' },
  { value: 'activity', label: 'Activity', help: 'Something to try, with an optional question.' },
]

export default function ChapterEditor() {
  const { chapterId } = useParams()
  const navigate = useNavigate()
  const { data, error, reload } = useData(() => Promise.all([getChapterForEditing(chapterId), getClasses()]), [chapterId])
  const [editing, setEditing] = useState(null) // a lesson id, 'new', or null
  const [actionError, setActionError] = useState(null) // { message, problems }
  const [tickedIds, setTickedIds] = useState(null) // class ticks shown straight away, before the server answers

  if (error && !data) {
    return (
      <div>
        <p className="text-lg font-semibold">{error}</p>
        <Link to="/teacher/content" className="btn btn-secondary mt-4">
          Back to content
        </Link>
      </div>
    )
  }
  if (!data) return <p className="text-muted">Loading the chapter...</p>

  const [chapter, classes] = data
  const published = chapter.status === 'published'
  const shownClassIds = tickedIds ?? chapter.classIds

  // Ticks the box at once, then saves. If the server says no, the box goes back.
  async function changeClasses(next) {
    setTickedIds(next)
    await act(() => updateChapter(chapter.id, { classIds: next }))
    setTickedIds(null)
  }

  // Runs a change, then reloads; shows the server's reasons if it says no.
  async function act(change) {
    setActionError(null)
    try {
      await change()
      await reload()
    } catch (err) {
      setActionError({ message: err.message, problems: err.problems })
    }
  }

  async function moveLesson(index, by) {
    const ids = chapter.lessons.map((l) => l.id)
    ;[ids[index], ids[index + by]] = [ids[index + by], ids[index]]
    await act(() => saveLessonOrder(chapter.id, ids))
  }

  async function handleDeleteLesson(lesson) {
    if (!window.confirm(`Delete the lesson "${lesson.title}"?`)) return
    await act(() => deleteLesson(lesson.id))
  }

  async function handleDeleteChapter() {
    if (!window.confirm(`Delete "${chapter.title}" with all its lessons and its quiz? This can’t be undone.`)) return
    try {
      await deleteChapter(chapter.id)
      navigate('/teacher/content', { replace: true })
    } catch (err) {
      setActionError({ message: err.message })
    }
  }

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <Link to="/teacher/content" className="inline-flex min-h-12 items-center font-semibold text-muted hover:text-ink">
          Content
        </Link>
        <TitleEditor chapter={chapter} onSave={(changes) => updateChapter(chapter.id, changes).then(reload)} />
      </div>

      {actionError && (
        <div role="alert" className="rounded-2xl bg-warn-soft p-4 text-warn">
          <p className="font-semibold">{actionError.message}</p>
          {actionError.problems?.length > 1 && (
            <ul className="mt-2 list-inside list-disc">
              {actionError.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ---------- publishing and classes ---------- */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              {published ? <span className="text-good">Published</span> : 'Draft'}
            </h2>
            <p className="text-muted">
              {published
                ? 'Students in the ticked classes can see this chapter.'
                : 'Only you can see this chapter. Publish it when its lessons and quiz are ready.'}
            </p>
          </div>
          <button
            onClick={() => act(() => updateChapter(chapter.id, { status: published ? 'draft' : 'published' }))}
            className={`btn ${published ? 'btn-secondary' : 'btn-primary'}`}
          >
            {published ? 'Unpublish' : 'Publish'}
          </button>
        </div>

        <fieldset className="mt-5 border-t border-line pt-4">
          <legend className="sr-only">Classes that see this chapter</legend>
          <p className="font-semibold">Show to these classes</p>
          {classes.length === 0 ? (
            <p className="mt-1 text-muted">
              You have no classes yet.{' '}
              <Link to="/teacher" className="font-semibold text-accent underline">
                Create a class
              </Link>{' '}
              first.
            </p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-x-6">
              {classes.map((cls) => {
                const ticked = shownClassIds.includes(cls.id)
                const next = ticked ? shownClassIds.filter((id) => id !== cls.id) : [...shownClassIds, cls.id]
                return (
                  <label key={cls.id} className="inline-flex min-h-12 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={ticked}
                      onChange={() => changeClasses(next)}
                      className="size-5 accent-[var(--color-accent)]"
                    />
                    {cls.name}
                  </label>
                )
              })}
            </div>
          )}
        </fieldset>
      </section>

      {/* ---------- lessons ---------- */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">Lessons</h2>
          <p className="text-muted">Students do them in this order.</p>
        </div>

        {chapter.lessons.length === 0 && editing !== 'new' && (
          <p className="mt-3 text-muted">No lessons yet. A chapter needs at least one before it can be published.</p>
        )}

        <ol className="mt-4 space-y-3">
          {chapter.lessons.map((lesson, i) =>
            editing === lesson.id ? (
              <li key={lesson.id}>
                <LessonForm
                  initial={lesson}
                  onSave={async (next) => {
                    await updateLesson(lesson.id, next)
                    setEditing(null)
                    await reload()
                  }}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={lesson.id} className="card flex flex-wrap items-center gap-x-3 gap-y-1 p-4">
                <span className="w-6 font-semibold text-muted">{i + 1}</span>
                <div className="min-w-48 flex-1">
                  <p className="font-semibold">{lesson.title}</p>
                  <p className="text-sm text-muted">
                    {lesson.steps.length === 1 ? '1 step' : `${lesson.steps.length} steps`}
                    {lesson.steps.some((s) => s.question) ? ', with a question' : ''}
                  </p>
                </div>
                <Link
                  to={`/teacher/preview/${chapter.id}/lesson/${lesson.id}`}
                  aria-label={`Preview ${lesson.title} as a student`}
                  className="inline-flex min-h-12 items-center px-2 font-semibold text-accent"
                >
                  Preview as student
                </Link>
                <button onClick={() => setEditing(lesson.id)} disabled={editing !== null} aria-label={`Edit ${lesson.title}`} className="inline-flex min-h-12 items-center px-2 font-semibold text-muted hover:text-ink disabled:opacity-30">
                  Edit
                </button>
                <button onClick={() => moveLesson(i, -1)} disabled={i === 0} aria-label={`Move ${lesson.title} up`} className="inline-flex min-h-12 items-center px-2 font-semibold text-muted hover:text-ink disabled:opacity-30">
                  Up
                </button>
                <button
                  onClick={() => moveLesson(i, 1)}
                  disabled={i === chapter.lessons.length - 1}
                  aria-label={`Move ${lesson.title} down`}
                  className="inline-flex min-h-12 items-center px-2 font-semibold text-muted hover:text-ink disabled:opacity-30"
                >
                  Down
                </button>
                <button onClick={() => handleDeleteLesson(lesson)} aria-label={`Delete ${lesson.title}`} className="inline-flex min-h-12 items-center px-2 font-semibold text-warn">
                  Delete
                </button>
              </li>
            )
          )}
          {editing === 'new' && (
            <li>
              <LessonForm
                initial={{ title: '', steps: [{ type: 'explain', text: '' }] }}
                onSave={async (lesson) => {
                  await addLesson(chapter.id, lesson)
                  setEditing(null)
                  await reload()
                }}
                onCancel={() => setEditing(null)}
              />
            </li>
          )}
        </ol>

        {editing === null && (
          <button onClick={() => setEditing('new')} className="btn btn-secondary mt-4">
            Add a lesson
          </button>
        )}
      </section>

      {/* ---------- quiz ---------- */}
      <section className="card flex flex-wrap items-center gap-4 p-5">
        <div className="min-w-48 flex-1">
          <h2 className="text-xl font-semibold">Chapter quiz</h2>
          <p className="text-muted">
            {chapter.quiz
              ? `${chapter.quiz.questions.length} ${chapter.quiz.questions.length === 1 ? 'question' : 'questions'}. Students take it after the last lesson.`
              : 'No quiz yet. A chapter needs one before it can be published.'}
          </p>
        </div>
        {chapter.quiz && (
          <Link
            to={`/teacher/preview/${chapter.id}/quiz`}
            aria-label="Preview the quiz as a student"
            className="inline-flex min-h-12 items-center px-2 font-semibold text-accent"
          >
            Preview as student
          </Link>
        )}
        <Link to={`/teacher/content/${chapter.id}/quiz`} className="btn btn-primary">
          {chapter.quiz ? 'Edit quiz' : 'Write the quiz'}
        </Link>
      </section>

      <section className="border-t border-line pt-8">
        <h2 className="text-lg font-semibold">Delete this chapter</h2>
        <p className="mt-1 text-muted">Only possible before any student has started it. After that, unpublish it instead.</p>
        <button onClick={handleDeleteChapter} className="btn btn-secondary mt-4 text-warn">
          Delete chapter
        </button>
      </section>
    </div>
  )
}

// The chapter title, plus optional Hindi and Marathi titles for students.
function TitleEditor({ chapter, onSave }) {
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState({})
  const [error, setError] = useState(null)

  function start() {
    setValues({ title: chapter.title, subject: chapter.subject, hi: chapter.hi?.title ?? '', mr: chapter.mr?.title ?? '' })
    setError(null)
    setEditing(true)
  }

  if (!editing) {
    const translated = [chapter.hi?.title && 'Hindi', chapter.mr?.title && 'Marathi'].filter(Boolean)
    return (
      <div>
        <div className="flex flex-wrap items-center gap-x-4">
          <h1 className="text-3xl font-semibold tracking-tight">{chapter.title}</h1>
          <button onClick={start} className="inline-flex min-h-12 items-center font-semibold text-muted hover:text-ink">
            Rename
          </button>
        </div>
        <p className="text-sm text-muted">
          {SUBJECTS.find((s) => s.id === chapter.subject)?.name ?? chapter.subject}.{' '}
          {translated.length ? `Title also in ${translated.join(' and ')}.` : 'No Hindi or Marathi title yet (students see the English).'}
        </p>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      // An empty translated title removes it, so students see the English.
      // (the `auto` stamps go back unchanged, so the server can tell which translations it wrote itself)
      await onSave({ title: values.title, subject: values.subject, hi: { title: values.hi, auto: chapter.hi?.auto }, mr: { title: values.mr, auto: chapter.mr?.auto } })
      setEditing(false)
    } catch (err) {
      setError(err.message)
    }
  }

  const field = (key, label, lang) => (
    <div>
      <label htmlFor={`chapter-title-${key}`} className="label">
        {label}
      </label>
      <input
        id={`chapter-title-${key}`}
        lang={lang}
        value={values[key]}
        onChange={(e) => setValues({ ...values, [key]: e.target.value })}
        maxLength={80}
        className="field"
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="mt-2 max-w-xl space-y-4">
      <div>
        <label htmlFor="chapter-subject-edit" className="label">
          Subject
        </label>
        <select id="chapter-subject-edit" value={values.subject} onChange={(e) => setValues({ ...values, subject: e.target.value })} className="field sm:max-w-xs">
          {SUBJECTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {field('title', 'Chapter title', 'en')}
      <p className="text-sm text-muted">Hindi and Marathi titles are filled in automatically. Fix them here if you like; yours are never overwritten.</p>
      {field('hi', 'Title in Hindi', 'hi')}
      {field('mr', 'Title in Marathi', 'mr')}
      <div className="flex gap-3">
        <button type="submit" disabled={!values.title.trim()} className="btn btn-primary">
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary">
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="font-semibold text-warn">
          {error}
        </p>
      )}
    </form>
  )
}

// The lesson form: a title and its steps. Nothing is sent until "Save lesson";
// it checks first with lessonProblems (the same check the server runs).
function LessonForm({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial.title)
  const [steps, setSteps] = useState(initial.steps)
  // Lesson title translations: { hi: { title }, mr: { title } }
  const [titles, setTitles] = useState({ hi: initial.hi, mr: initial.mr })
  const [lang, setLang] = useState('en') // which language is being edited
  const [checked, setChecked] = useState(false) // true after the first Save, to show problems
  const [serverError, setServerError] = useState(null)
  const [busy, setBusy] = useState(false)

  const lesson = { title, steps, hi: titles.hi, mr: titles.mr }
  const problems = checked ? lessonProblems(lesson) : []

  function setStep(i, changes) {
    setSteps(steps.map((s, j) => (j === i ? { ...s, ...changes } : s)))
  }

  function changeStepType(i, type) {
    // Only activity steps can have a question, so other types drop it.
    const { question, ...rest } = steps[i]
    setSteps(steps.map((s, j) => (j === i ? (type === 'activity' ? { ...steps[i], type } : { ...rest, type }) : s)))
  }

  function moveStep(i, by) {
    const next = [...steps]
    ;[next[i], next[i + by]] = [next[i + by], next[i]]
    setSteps(next)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setChecked(true)
    setServerError(null)
    if (lessonProblems(lesson).length) return
    setBusy(true)
    try {
      await onSave(lesson)
    } catch (err) {
      setServerError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-6 p-5 ring-2 ring-accent">
      <LanguageTabs lang={lang} onChange={setLang} />

      {lang === 'en' ? (
        <>
      <div>
        <label htmlFor="lesson-title" className="label">
          Lesson title
        </label>
        <input id="lesson-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.title} className="field" />
      </div>

      <ol className="space-y-5">
        {steps.map((step, i) => (
          <li key={i} className="rounded-2xl bg-bg p-4">
            <div className="flex flex-wrap items-center gap-x-2">
              <p className="mr-auto font-semibold">Step {i + 1}</p>
              <button type="button" onClick={() => moveStep(i, -1)} disabled={i === 0} className="inline-flex min-h-12 items-center px-2 font-semibold text-muted disabled:opacity-30">
                Up
              </button>
              <button
                type="button"
                onClick={() => moveStep(i, 1)}
                disabled={i === steps.length - 1}
                className="inline-flex min-h-12 items-center px-2 font-semibold text-muted disabled:opacity-30"
              >
                Down
              </button>
              <button
                type="button"
                onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                disabled={steps.length === 1}
                className="inline-flex min-h-12 items-center px-2 font-semibold text-warn disabled:opacity-30"
              >
                Remove step
              </button>
            </div>

            <div className="mt-2 grid gap-4 sm:grid-cols-[12rem_1fr]">
              <div>
                <label htmlFor={`step-${i}-type`} className="label">
                  Type
                </label>
                <select id={`step-${i}-type`} value={step.type} onChange={(e) => changeStepType(i, e.target.value)} className="field">
                  {STEP_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-muted">{STEP_TYPES.find((t) => t.value === step.type)?.help}</p>
              </div>
              <div>
                <label htmlFor={`step-${i}-text`} className="label">
                  Text
                </label>
                <textarea
                  id={`step-${i}-text`}
                  value={step.text}
                  onChange={(e) => setStep(i, { text: e.target.value })}
                  maxLength={LIMITS.stepText}
                  rows={3}
                  className="field py-3"
                />
              </div>
            </div>

            {step.type === 'activity' &&
              (step.question ? (
                <div className="mt-4 rounded-2xl bg-surface p-4 ring-1 ring-line">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold">Question</p>
                    <button type="button" onClick={() => setStep(i, { question: undefined })} className="inline-flex min-h-12 items-center px-2 font-semibold text-warn">
                      Remove question
                    </button>
                  </div>
                  <QuestionForm question={step.question} onChange={(question) => setStep(i, { question })} idPrefix={`step-${i}-q`} showProblems={checked} />
                </div>
              ) : (
                <button type="button" onClick={() => setStep(i, { question: blankQuestion() })} className="mt-3 inline-flex min-h-12 items-center font-semibold text-accent">
                  Add a question to this step
                </button>
              ))}
          </li>
        ))}
      </ol>

      {steps.length < LIMITS.maxSteps && (
        <button type="button" onClick={() => setSteps([...steps, { type: 'explain', text: '' }])} className="btn btn-secondary">
          Add a step
        </button>
      )}

        </>
      ) : (
        <TranslatedLesson
          lang={lang}
          title={title}
          steps={steps}
          titleTranslation={titles[lang]?.title ?? ''}
          onTitle={(value) => setTitles({ ...titles, [lang]: { ...titles[lang], title: value } })}
          setStep={setStep}
          checked={checked}
        />
      )}

      {(problems.length > 0 || serverError) && (
        <div role="alert" className="rounded-xl bg-warn-soft p-4 text-warn">
          <p className="font-semibold">{serverError ?? 'Fix these before saving:'}</p>
          {problems.length > 0 && (
            <ul className="mt-1 list-inside list-disc">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex gap-3 border-t border-line pt-5">
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? 'Saving...' : 'Save lesson'}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  )
}

// The Hindi or Marathi view of the lesson form: the title and each step's
// text, with the English beside each box, and each step's question.
function TranslatedLesson({ lang, title, steps, titleTranslation, onTitle, setStep, checked }) {
  const word = lang === 'hi' ? 'Hindi' : 'Marathi'
  return (
    <div className="space-y-5">
      <p className="text-muted">
        {word} is filled in automatically when you save the English. Check it here and fix anything you like; what you write is never overwritten.
      </p>
      <div>
        <label htmlFor={`lesson-title-${lang}`} className="label">
          Lesson title in {word}
        </label>
        <p className="-mt-1 mb-2 text-sm text-muted">English: {title || '(empty)'}</p>
        <input id={`lesson-title-${lang}`} lang={lang} value={titleTranslation} onChange={(e) => onTitle(e.target.value)} maxLength={LIMITS.title} className="field" />
      </div>
      <ol className="space-y-5">
        {steps.map((step, i) => (
          <li key={i} className="rounded-2xl bg-bg p-4">
            <label htmlFor={`step-${i}-${lang}`} className="label">
              Step {i + 1} in {word}
            </label>
            <p className="-mt-1 mb-2 text-sm text-muted">English: {step.text || '(empty)'}</p>
            <textarea
              id={`step-${i}-${lang}`}
              lang={lang}
              value={step[lang]?.text ?? ''}
              onChange={(e) => setStep(i, { [lang]: { ...step[lang], text: e.target.value } })}
              maxLength={LIMITS.stepText}
              rows={3}
              className="field py-3"
            />
            {step.question && (
              <div className="mt-4 rounded-2xl bg-surface p-4 ring-1 ring-line">
                <p className="mb-2 font-semibold">Question</p>
                <QuestionForm
                  question={step.question}
                  onChange={(question) => setStep(i, { question })}
                  idPrefix={`step-${i}-q`}
                  showProblems={checked}
                  lang={lang}
                />
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

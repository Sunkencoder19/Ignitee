// The teacher's chapters, in the order students see them. Up/Down change the
// order (saved straight away); a chapter's title opens its editor.
// A teacher can add ready-made sample chapters (in several subjects) at any time.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addStarterChapters, createChapter, getContent, saveChapterOrder, useData } from '../../api'
import { SUBJECTS, subjectColour } from '../../game'

export default function Content() {
  const { data: chapters, error, reload } = useData(() => getContent(), [])
  const [moveError, setMoveError] = useState(null)

  if (error && !chapters) return <p className="text-warn">{error}</p>
  if (!chapters) return <p className="text-muted">Loading your chapters...</p>

  if (chapters.length === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight">Content</h1>
        <section className="card relative mt-8 overflow-hidden p-6 shadow-float md:p-8">
          <span aria-hidden="true" className="gradient-band absolute inset-x-0 top-0 h-1.5" />
          <h2 className="text-2xl font-semibold">Create your first chapter</h2>
          <p className="mt-2 text-muted">
            A chapter has a few short lessons and a quiz at the end. Students only see it once you publish it for their class.
          </p>
          <CreateChapterForm />
          <StarterButton onAdded={reload} />
        </section>
      </div>
    )
  }

  async function move(index, by) {
    const ids = chapters.map((c) => c.id)
    ;[ids[index], ids[index + by]] = [ids[index + by], ids[index]]
    setMoveError(null)
    try {
      await saveChapterOrder(ids)
      reload()
    } catch (err) {
      setMoveError(err.message)
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Content</h1>
        <p className="mt-1 text-muted">Students see published chapters in this order. Within a subject, each opens once they pass the one before.</p>
      </div>

      {moveError && (
        <p role="alert" className="font-semibold text-warn">
          {moveError}
        </p>
      )}

      <ol className="overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-line">
        {chapters.map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 not-last:border-b not-last:border-line">
            <span className="w-6 text-lg font-semibold text-muted">{i + 1}</span>
            <div className="min-w-48 flex-1">
              <Link to={`/teacher/content/${c.id}`} className="font-semibold text-accent hover:underline">
                {c.title}
              </Link>
              <span className="ml-2 rounded-full px-2 py-0.5 text-sm font-semibold text-white" style={{ background: subjectColour(c.subject) }}>
                {SUBJECTS.find((s) => s.id === c.subject)?.name ?? c.subject}
              </span>
              <p className="text-sm text-muted">
                {c.lessonCount === 1 ? '1 lesson' : `${c.lessonCount} lessons`},{' '}
                {c.questionCount === 0 ? 'no quiz yet' : `quiz of ${c.questionCount}`}
                {'. '}
                {c.classes.length ? `Shown to ${c.classes.map((cls) => cls.name).join(', ')}.` : 'No class ticked.'}
              </p>
            </div>
            <span className={`font-semibold ${c.status === 'published' ? 'text-good' : 'text-muted'}`}>
              {c.status === 'published' ? 'Published' : 'Draft'}
            </span>
            <span className="flex">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Move ${c.title} up`}
                className="inline-flex min-h-12 items-center px-2 font-semibold text-muted hover:text-ink disabled:opacity-30"
              >
                Up
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === chapters.length - 1}
                aria-label={`Move ${c.title} down`}
                className="inline-flex min-h-12 items-center px-2 font-semibold text-muted hover:text-ink disabled:opacity-30"
              >
                Down
              </button>
            </span>
          </li>
        ))}
      </ol>

      <section className="max-w-xl">
        <h2 className="text-lg font-semibold">Add a chapter</h2>
        <CreateChapterForm />
        <StarterButton onAdded={reload} />
      </section>
    </div>
  )
}

// Title + button. After creating, goes straight to the new chapter's editor.
function CreateChapterForm() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('maths')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const chapter = await createChapter(title, subject)
      navigate(`/teacher/content/${chapter.id}`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <label htmlFor="chapter-subject" className="label">
        Subject
      </label>
      <select id="chapter-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="field mb-4 sm:max-w-xs">
        {SUBJECTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <label htmlFor="chapter-title" className="label">
        Chapter title
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="chapter-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="For example, Animals and Their Sounds"
          maxLength={80}
          className="field"
        />
        <button type="submit" disabled={!title.trim() || busy} className="btn btn-primary shrink-0">
          {busy ? 'Creating...' : 'Create chapter'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 font-semibold text-warn">
          {error}
        </p>
      )}
    </form>
  )
}

function StarterButton({ onAdded }) {
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    setBusy(true)
    setError(null)
    try {
      await addStarterChapters()
      onAdded()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="mt-8 border-t border-line pt-6">
      <h3 className="font-semibold">Or start from ready-made sample chapters</h3>
      <p className="mt-1 text-muted">
        Chapters in several subjects (Maths, English, Environment and General knowledge) with lessons, activities and a quiz each, in English, Hindi and Marathi. They are
        added as drafts so you can check and change them before publishing. Ones you already have are not added again.
      </p>
      <button onClick={handleClick} disabled={busy} className="btn btn-secondary mt-4">
        {busy ? 'Adding...' : 'Add the sample chapters'}
      </button>
      {error && (
        <p role="alert" className="mt-2 font-semibold text-warn">
          {error}
        </p>
      )}
    </div>
  )
}

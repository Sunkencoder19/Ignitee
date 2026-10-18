// One class: its code, its students, and everything a teacher can do to them.
// A new or reset PIN is shown once, in a box at the top, because the server
// only keeps a scrambled (hashed) copy and can't show it again later.

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  addStudent,
  deleteClass,
  getTeacherClass,
  removeStudent,
  renameClass,
  renameStudent,
  resetPin,
  useData,
} from '../../api'

export default function Class() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { data: cls, error, reload } = useData(() => getTeacherClass(classId), [classId])
  const [shownPin, setShownPin] = useState(null) // { name, pin, reason }
  const [renamingClass, setRenamingClass] = useState(false)

  if (error && !cls) {
    return (
      <div>
        <p className="text-lg font-semibold">{error}</p>
        <Link to="/teacher" className="btn btn-secondary mt-4">
          Back to your classes
        </Link>
      </div>
    )
  }
  if (!cls) return <p className="text-muted">Loading the class...</p>

  async function handleDeleteClass() {
    const sure = window.confirm(
      `Delete ${cls.name}? This also removes its ${cls.students.length} students and all their progress. It can’t be undone.`
    )
    if (!sure) return
    try {
      await deleteClass(cls.id)
      navigate('/teacher', { replace: true })
    } catch (err) {
      window.alert(err.message)
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link to="/teacher" className="inline-flex min-h-12 items-center font-semibold text-muted hover:text-ink">
          Your classes
        </Link>
        {renamingClass ? (
          <RenameForm
            label="Class name"
            initial={cls.name}
            onSave={async (name) => {
              await renameClass(cls.id, name)
              setRenamingClass(false)
              reload()
            }}
            onCancel={() => setRenamingClass(false)}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-x-4">
            <h1 className="text-3xl font-semibold tracking-tight">{cls.name}</h1>
            <button onClick={() => setRenamingClass(true)} className="inline-flex min-h-12 items-center font-semibold text-muted hover:text-ink">
              Rename
            </button>
          </div>
        )}
      </div>

      <section className="card p-5">
        <p className="text-muted">Class code</p>
        <p className="font-mono text-3xl font-semibold tracking-[0.2em]">{cls.code}</p>
        <p className="mt-2 text-muted">
          Students log in with this code, then pick their name and type their PIN.
        </p>
      </section>

      {shownPin && (
        <section role="status" className="rounded-2xl bg-accent-soft p-5 ring-2 ring-accent">
          <p className="font-semibold">
            {shownPin.reason === 'new' ? `${shownPin.name} has been added.` : `${shownPin.name} has a new PIN.`}
          </p>
          <p className="mt-2">
            PIN: <span className="font-mono text-3xl font-semibold tracking-[0.3em]">{shownPin.pin}</span>
          </p>
          <p className="mt-2 text-muted">
            Write it down and give it to {shownPin.name.split(' ')[0]} now. You won’t be able to see it again; if it gets lost,
            reset it.
          </p>
          <button onClick={() => setShownPin(null)} className="btn btn-secondary mt-4">
            I’ve written it down
          </button>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold">
          Students <span className="font-normal text-muted">({cls.students.length})</span>
        </h2>
        <AddStudentForm
          onAdded={(student, pin) => {
            setShownPin({ name: student.name, pin, reason: 'new' })
            reload()
          }}
          classId={cls.id}
        />

        {cls.students.length === 0 ? (
          <p className="mt-6 text-muted">No students yet. Add the first one above.</p>
        ) : (
          <ul className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-line">
            {cls.students.map((s) => (
              <StudentRow
                key={s.id}
                student={s}
                onChanged={reload}
                onNewPin={(pin) => setShownPin({ name: s.name, pin, reason: 'reset' })}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-line pt-8">
        <h2 className="text-lg font-semibold">Delete this class</h2>
        <p className="mt-1 text-muted">Removes the class, all its students and all their progress.</p>
        <button onClick={handleDeleteClass} className="btn btn-secondary mt-4 text-warn">
          Delete {cls.name}
        </button>
      </section>
    </div>
  )
}

function AddStudentForm({ classId, onAdded }) {
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { student, pin } = await addStudent(classId, name)
      setName('')
      onAdded(student, pin)
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <label htmlFor="student-name" className="label">
        Add a student
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="student-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First and last name"
          maxLength={40}
          className="field"
        />
        <button type="submit" disabled={!name.trim() || busy} className="btn btn-primary shrink-0">
          {busy ? 'Adding...' : 'Add student'}
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

function StudentRow({ student, onChanged, onNewPin }) {
  const [renaming, setRenaming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleReset() {
    if (!window.confirm(`Give ${student.name} a new PIN? The old one will stop working.`)) return
    setBusy(true)
    try {
      const { pin } = await resetPin(student.id)
      onNewPin(pin)
    } catch (err) {
      window.alert(err.message)
    }
    setBusy(false)
  }

  async function handleRemove() {
    if (!window.confirm(`Remove ${student.name}? Their progress is deleted too. This can’t be undone.`)) return
    setBusy(true)
    try {
      await removeStudent(student.id)
      onChanged()
    } catch (err) {
      window.alert(err.message)
      setBusy(false)
    }
  }

  if (renaming) {
    return (
      <li className="px-4 py-3 not-last:border-b not-last:border-line">
        <RenameForm
          label={`New name for ${student.name}`}
          initial={student.name}
          onSave={async (name) => {
            await renameStudent(student.id, name)
            setRenaming(false)
            onChanged()
          }}
          onCancel={() => setRenaming(false)}
        />
      </li>
    )
  }

  return (
    <li className="flex flex-wrap items-center gap-x-2 px-4 py-2 not-last:border-b not-last:border-line">
      <span className="min-w-40 flex-1 font-semibold">{student.name}</span>
      <button disabled={busy} onClick={() => setRenaming(true)} className="inline-flex min-h-12 items-center px-2 font-semibold text-muted hover:text-ink">
        Rename
      </button>
      <button disabled={busy} onClick={handleReset} className="inline-flex min-h-12 items-center px-2 font-semibold text-muted hover:text-ink">
        Reset PIN
      </button>
      <button disabled={busy} onClick={handleRemove} className="inline-flex min-h-12 items-center px-2 font-semibold text-warn">
        Remove
      </button>
    </li>
  )
}

// A text box with Save and Cancel, used for renaming the class or a student.
function RenameForm({ label, initial, onSave, onCancel }) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSave(value)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <label className="label">
        {label}
        <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={40} autoFocus className="field mt-2 font-normal" />
      </label>
      <div className="flex gap-3">
        <button type="submit" disabled={!value.trim() || busy} className="btn btn-primary">
          Save
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
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

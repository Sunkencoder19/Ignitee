// Teacher home: their classes, and a form to create one.
// A new teacher sees one big "Create your first class" card instead of an empty list.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createClass, getClasses, useData } from '../../api'
import { useSession } from '../../session'

export default function Classes() {
  const { user } = useSession()
  const { data: classes, error } = useData(() => getClasses(), [])

  if (error) return <p className="text-warn">{error}</p>
  if (!classes) return <p className="text-muted">Loading your classes...</p>

  if (classes.length === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome, {user.firstName}</h1>
        <section className="card relative mt-8 overflow-hidden p-6 shadow-float md:p-8">
          <span aria-hidden="true" className="gradient-band absolute inset-x-0 top-0 h-1.5" />
          <h2 className="text-2xl font-semibold">Create your first class</h2>
          <p className="mt-2 text-muted">
            Each class gets a short code. Your students type it, pick their name and enter their PIN to log in.
          </p>
          <CreateClassForm buttonLabel="Create class" />
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">Your classes</h1>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => (
          <li key={c.id}>
            <Link to={`/teacher/classes/${c.id}`} className="card block p-5 hover:ring-accent">
              <span className="block text-xl font-semibold">{c.name}</span>
              <span className="mt-1 block text-muted">
                {c.studentCount === 1 ? '1 student' : `${c.studentCount} students`}
              </span>
              <span className="mt-4 block text-sm text-muted">Class code</span>
              <span className="block font-mono text-xl font-semibold tracking-widest">{c.code}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="max-w-xl">
        <h2 className="text-lg font-semibold">Add another class</h2>
        <CreateClassForm buttonLabel="Add class" />
      </section>
    </div>
  )
}

// Name + button. After creating, goes straight to the new class to add students.
function CreateClassForm({ buttonLabel }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const created = await createClass(name)
      navigate(`/teacher/classes/${created.id}`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <label htmlFor="class-name" className="label">
        Class name
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="class-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="For example, Class 4A"
          maxLength={40}
          className="field"
        />
        <button type="submit" disabled={!name.trim() || busy} className="btn btn-primary shrink-0">
          {busy ? 'Creating...' : buttonLabel}
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

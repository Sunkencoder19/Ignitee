// Login for both roles.
//   Student: type the class code, pick your name from the list, type your 4-digit PIN.
//   Teacher: email and password (new teachers go to /signup).
// Children use this page too, so text is 16px or more and every button is 48px tall.

import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { findClass } from '../api'
import { useSession } from '../session'
import ThemeToggle from '../ThemeToggle'

export default function Login() {
  const { user, checking } = useSession()
  const location = useLocation()
  const [role, setRole] = useState(location.state?.role ?? 'student')

  // Already logged in: go straight home.
  if (checking) return null
  if (user) return <Navigate to={`/${user.role}`} replace />

  return (
    <div className="relative flex min-h-dvh flex-col items-center px-4 py-10">
      <div className="absolute right-2 top-2">
        <ThemeToggle />
      </div>
      <Link to="/" className="inline-flex min-h-12 items-center text-2xl font-semibold tracking-tight">
        IGNITE
      </Link>

      <div className="card relative mt-6 w-full max-w-md overflow-hidden p-6 shadow-float md:p-8">
        <span aria-hidden="true" className="gradient-band absolute inset-x-0 top-0 h-1.5" />
        <h1 className="text-2xl font-semibold">Log in</h1>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-full bg-bg p-1" role="radiogroup" aria-label="I am a">
          {['student', 'teacher'].map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              onClick={() => setRole(r)}
              className={`min-h-12 rounded-full font-semibold ${role === r ? 'bg-surface shadow-card' : 'text-muted'}`}
            >
              {r === 'student' ? "I'm a student" : "I'm a teacher"}
            </button>
          ))}
        </div>

        {/* key: switching role starts that form fresh */}
        {role === 'student' ? <StudentForm key="student" /> : <TeacherForm key="teacher" />}
      </div>

      {role === 'teacher' && (
        <p className="mt-6 text-muted">
          New teacher?{' '}
          <Link to="/signup" className="inline-flex min-h-12 items-center font-semibold text-accent underline">
            Create an account
          </Link>
        </p>
      )}
    </div>
  )
}

function StudentForm() {
  const { studentLogin } = useSession()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [found, setFound] = useState(null) // { className, students } once the code is right
  const [studentId, setStudentId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Step 1: find the class from its code.
  async function handleFind(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      setFound(await findClass(code))
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  // Step 2: name and PIN.
  async function handleLogin(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await studentLogin(code, studentId, pin)
      navigate('/student', { replace: true })
    } catch (err) {
      setError(err.message)
      setPin('')
      setBusy(false)
    }
  }

  if (!found) {
    return (
      <form onSubmit={handleFind}>
        <label htmlFor="code" className="label mt-6">
          Class code
        </label>
        <input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck="false"
          aria-describedby="code-help"
          className="field text-center text-xl tracking-[0.3em]"
        />
        <p id="code-help" className="mt-2 text-muted">
          Your teacher gives you this code.
        </p>
        {error && (
          <p role="alert" className="mt-2 font-semibold text-warn">
            {error}
          </p>
        )}
        <button type="submit" disabled={code.trim().length < 4 || busy} className="btn btn-primary mt-6 w-full text-lg">
          {busy ? 'Looking...' : 'Find my class'}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleLogin}>
      <div className="mt-6 flex items-center justify-between gap-4">
        <p>
          Class <strong>{found.className}</strong>
        </p>
        <button
          type="button"
          onClick={() => {
            setFound(null)
            setStudentId('')
            setPin('')
            setError(null)
          }}
          className="inline-flex min-h-12 items-center px-2 font-semibold text-muted hover:text-ink"
        >
          Change
        </button>
      </div>

      {found.students.length === 0 ? (
        <p className="mt-4 text-muted">There are no students in this class yet. Ask your teacher to add you.</p>
      ) : (
        <>
          <label htmlFor="name" className="label mt-4">
            Your name
          </label>
          <select id="name" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="field">
            <option value="" disabled>
              Pick your name
            </option>
            {found.students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <label htmlFor="pin" className="label mt-5">
            Your 4-digit PIN
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="field text-center text-2xl tracking-[0.5em]"
          />
          {error && (
            <p role="alert" className="mt-2 font-semibold text-warn">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!studentId || pin.length !== 4 || busy}
            className="btn btn-primary mt-6 w-full text-lg"
          >
            {busy ? 'Logging in...' : 'Log in'}
          </button>
        </>
      )}
    </form>
  )
}

function TeacherForm() {
  const { teacherLogin } = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await teacherLogin(email, password)
      navigate('/teacher', { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email" className="label mt-6">
        Email
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="field"
      />
      <label htmlFor="password" className="label mt-5">
        Password
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="field"
      />
      {error && (
        <p role="alert" className="mt-2 font-semibold text-warn">
          {error}
        </p>
      )}
      <button type="submit" disabled={!email || !password || busy} className="btn btn-primary mt-6 w-full text-lg">
        {busy ? 'Logging in...' : 'Log in'}
      </button>
    </form>
  )
}

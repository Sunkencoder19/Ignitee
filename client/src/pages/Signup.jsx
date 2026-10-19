// Teacher sign-up: name, email and a password of at least 8 characters.
// After signing up the teacher goes straight to their home page.

import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useSession } from '../session'
import ThemeToggle from '../ThemeToggle'

export default function Signup() {
  const { user, checking, teacherSignup } = useSession()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (checking) return null
  if (user) return <Navigate to={`/${user.role}`} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await teacherSignup(name, email, password)
      navigate('/teacher', { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center px-4 py-10">
      <div className="absolute right-2 top-2">
        <ThemeToggle />
      </div>
      <Link to="/" className="inline-flex min-h-12 items-center text-2xl font-semibold tracking-tight">
        IGNITE
      </Link>

      <form onSubmit={handleSubmit} className="card relative mt-6 w-full max-w-md overflow-hidden p-6 shadow-float md:p-8">
        <span aria-hidden="true" className="gradient-band absolute inset-x-0 top-0 h-1.5" />
        <h1 className="text-2xl font-semibold">Create a teacher account</h1>
        <p className="mt-1 text-muted">Then add your classes and your students.</p>

        <label htmlFor="name" className="label mt-6">
          Your name
        </label>
        <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="field" />

        <label htmlFor="email" className="label mt-5">
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="password-help"
          className="field"
        />
        <p id="password-help" className="mt-2 text-muted">
          At least 8 characters.
        </p>

        {error && (
          <p role="alert" className="mt-2 font-semibold text-warn">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!name.trim() || !email || password.length < 8 || busy}
          className="btn btn-primary mt-6 w-full text-lg"
        >
          {busy ? 'Creating your account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-muted">
        Already have an account?{' '}
        <Link to="/login" state={{ role: 'teacher' }} className="inline-flex min-h-12 items-center font-semibold text-accent underline">
          Log in
        </Link>
      </p>
    </div>
  )
}

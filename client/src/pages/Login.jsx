// Login: pick student or teacher, pick your name, type your 4-digit PIN.
// This is demo login; the PIN check moves to the server with the backend.

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getLoginNames, useData } from '../api'
import { useSession } from '../session'

export default function Login() {
  const { login, resetDemo } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  const [role, setRole] = useState(location.state?.role ?? 'student')
  const [userId, setUserId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  const { data: names } = useData(() => getLoginNames(role), [role])
  const picked = names?.find((n) => n.id === userId)

  function changeRole(next) {
    setRole(next)
    setUserId('')
    setPin('')
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const session = await login(role, userId, pin)
      navigate(`/${session.role}`, { replace: true })
    } catch (err) {
      setError(err.message)
      setPin('')
      setBusy(false)
    }
  }

  function handleReset() {
    if (!window.confirm('Reset all saved progress back to the demo starting point?')) return
    resetDemo()
    setResetDone(true)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10">
      <Link to="/" className="text-2xl font-extrabold tracking-tight">
        IGNITE
      </Link>

      <form onSubmit={handleSubmit} className="card mt-8 w-full max-w-md p-6 md:p-8">
        <h1 className="text-2xl font-extrabold">Log in</h1>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-bg p-1" role="radiogroup" aria-label="I am a">
          {['student', 'teacher'].map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              onClick={() => changeRole(r)}
              className={`min-h-12 rounded-lg font-bold ${role === r ? 'bg-surface shadow-sm' : 'text-muted'}`}
            >
              {r === 'student' ? "I'm a student" : "I'm a teacher"}
            </button>
          ))}
        </div>

        <label htmlFor="name" className="label mt-6">
          Your name
        </label>
        <select
          id="name"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          disabled={!names}
          className="field"
        >
          <option value="" disabled>
            {names ? 'Pick your name' : 'Loading names...'}
          </option>
          {names?.map((n) => (
            <option key={n.id} value={n.id}>
              {role === 'teacher' ? `${n.name} (Class ${n.classId})` : n.name}
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
          aria-describedby="pin-help"
          className="field text-center text-2xl tracking-[0.5em]"
        />
        <p id="pin-help" className="mt-2 text-sm text-muted">
          {picked ? `Demo PIN for ${picked.name}: ${picked.pin}` : 'Pick a name to see its demo PIN.'}
        </p>
        {error && (
          <p role="alert" className="mt-2 font-bold text-warn">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!userId || pin.length !== 4 || busy}
          className="btn btn-primary mt-6 w-full text-lg"
        >
          {busy ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Demo only, no real accounts.{' '}
        <button onClick={handleReset} className="font-bold text-ink underline">
          Reset demo data
        </button>
        {resetDone && ' Done.'}
      </p>
    </div>
  )
}

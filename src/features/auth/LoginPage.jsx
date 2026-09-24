import { useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Backpack,
  ChevronRight,
  CircleCheck,
  GraduationCap,
  Info,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Wordmark from '@/components/ui/Wordmark'
import { useAuth } from '@/context/AuthContext'
import { useProgress } from '@/context/ProgressContext'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import useFetch from '@/hooks/useFetch'
import { getTint } from '@/lib/tints'
import { getLoginOptions } from '@/services/authService'

const ROLES = {
  student: {
    label: "I'm a student",
    blurb: 'Learn maths and earn stars',
    icon: Backpack,
    tint: 'ember',
    heading: 'Find your name',
    submit: "Let's go",
  },
  teacher: {
    label: "I'm a teacher",
    blurb: 'See how your class is doing',
    icon: GraduationCap,
    tint: 'sky',
    heading: 'Teacher login',
    submit: 'Log in',
  },
}

const FIELD =
  'mt-2 w-full min-h-[56px] rounded-2xl bg-paper px-4 text-ink-900 ring-2 ring-inset ring-ink-900/15 focus:outline-none focus:ring-ember-500'

function roleFromPath(path) {
  if (path?.startsWith('/teacher')) return 'teacher'
  if (path?.startsWith('/student')) return 'student'
  return null
}

export default function LoginPage() {
  useDocumentTitle('Log in')

  // ---- state ----
  const { user, login } = useAuth()
  const { resetDemo } = useProgress()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from
  const reason = location.state?.reason

  const [role, setRole] = useState(() => roleFromPath(from))
  const [userId, setUserId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const pinRef = useRef(null)
  const nameId = useId()
  const pinId = useId()
  const errorId = useId()

  const {
    data: options,
    loading: optionsLoading,
    error: optionsError,
  } = useFetch(() => (role ? getLoginOptions(role) : Promise.resolve([])), [role])
  const selected = options?.find((o) => o.id === userId)
  const roleInfo = role ? ROLES[role] : null

  // ---- handlers ----
  function pickRole(next) {
    setRole(next)
    setUserId('')
    setPin('')
    setError(null)
  }

  function handlePinChange(e) {
    setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!userId || pin.length !== 4) return

    setSubmitting(true)
    setError(null)
    try {
      const session = await login(role, userId, pin)
      const home = `/${session.role}`
      navigate(from?.startsWith(home) ? from : home, { replace: true })
    } catch (err) {
      setError(err.message)
      setPin('')
      setSubmitting(false)
      pinRef.current?.focus()
    }
  }

  async function handleReset() {
    if (!window.confirm('Reset all saved progress back to the demo starting point?')) return
    // Through the context, not the service: it clears storage and also drops
    // the in-memory progress of whoever is logged in, so nothing stale lingers.
    await resetDemo()
    setResetDone(true)
  }

  // ---- render ----
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col items-center px-4 pb-6 pt-10">
        <Link to="/" aria-label="IGNITE home" className="rounded-lg">
          <Wordmark size="lg" />
        </Link>
        <p className="mt-2 text-lg">Maths for Class 4</p>

        <Card className="mt-8 w-full max-w-md">
          {(reason || user) && (
            <div className="mb-5 flex gap-2 rounded-xl bg-sky-500/10 p-3 text-ink-900">
              <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
              <p>
                {reason && <span>{reason} </span>}
                {user && (
                  <>
                    You&apos;re logged in as {user.firstName}.{' '}
                    <Link to={`/${user.role}`} className="font-semibold underline">
                      Back to my home
                    </Link>
                  </>
                )}
              </p>
            </div>
          )}

          {!roleInfo ? (
            <>
              <h1 className="text-2xl">Who are you?</h1>
              <div className="mt-5 grid gap-3">
                {Object.entries(ROLES).map(([key, r]) => {
                  const tint = getTint(r.tint)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => pickRole(key)}
                      className="flex min-h-[88px] items-center gap-4 rounded-2xl bg-paper p-4 text-left ring-2 ring-inset ring-ink-900/10 transition hover:ring-ember-500/60 focus-visible:outline-none focus-visible:ring-ember-500 active:scale-[0.98]"
                    >
                      <span
                        className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${tint.soft}`}
                      >
                        <r.icon aria-hidden="true" className={`h-7 w-7 ${tint.text}`} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-heading text-xl font-bold text-ink-900">
                          {r.label}
                        </span>
                        <span className="block">{r.blurb}</span>
                      </span>
                      <ChevronRight aria-hidden="true" className="ml-auto h-6 w-6 shrink-0" />
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <button
                type="button"
                onClick={() => pickRole(null)}
                className="-ml-2 inline-flex min-h-tap items-center gap-1 rounded-xl px-2 font-semibold text-ink-600 hover:text-ink-900"
              >
                <ArrowLeft aria-hidden="true" className="h-5 w-5" />
                Change
              </button>
              <h1 className="mt-1 text-2xl">{roleInfo.heading}</h1>

              <label htmlFor={nameId} className="mt-5 block font-semibold text-ink-900">
                Your name
              </label>
              <select
                id={nameId}
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value)
                  setError(null)
                }}
                disabled={optionsLoading}
                className={`${FIELD} text-lg`}
              >
                <option value="" disabled>
                  {optionsLoading ? 'Loading names...' : 'Pick your name'}
                </option>
                {options?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {role === 'teacher' ? `${o.name} (Class ${o.classId})` : o.name}
                  </option>
                ))}
              </select>
              {optionsError && (
                <p className="mt-2 font-semibold text-berry-600">
                  Couldn&apos;t load names. Refresh to try again.
                </p>
              )}
              {selected && (
                <p className="mt-2 text-sm">
                  Demo PIN: <strong className="text-ink-900">{selected.demoPin}</strong>
                </p>
              )}

              {/* PIN, not password: kids forget passwords */}
              <label htmlFor={pinId} className="mt-5 block font-semibold text-ink-900">
                Your 4-digit PIN
              </label>
              <input
                ref={pinRef}
                id={pinId}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={handlePinChange}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={`${FIELD} text-center font-heading text-3xl tracking-[0.5em] aria-[invalid=true]:ring-berry-600`}
              />
              {error && (
                <p id={errorId} role="alert" className="mt-2 font-semibold text-berry-600">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                fullWidth
                className="mt-6"
                iconRight={ArrowRight}
                loading={submitting}
                disabled={!userId || pin.length !== 4}
              >
                {roleInfo.submit}
              </Button>
            </form>
          )}
        </Card>
      </main>

      <footer className="px-4 pb-6 text-center text-sm">
        <span>Demo only, no real accounts. </span>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex min-h-tap items-center rounded-lg px-2 font-semibold text-ink-900 underline"
        >
          Reset demo data
        </button>
        {resetDone && (
          <p role="status" className="inline-flex items-center gap-1 font-semibold text-ink-900">
            <CircleCheck aria-hidden="true" className="h-4 w-4 text-leaf-600" />
            Demo data reset.
          </p>
        )}
      </footer>
    </div>
  )
}

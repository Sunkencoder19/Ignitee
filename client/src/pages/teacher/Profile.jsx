// The teacher's profile: who is logged in, and the colour setting (Auto follows the
// device; the sun/moon button in the header switches between Light and Dark).
// Teacher screens are in English.

import { useSession } from '../../session'
import { ThemeChoice } from '../../ThemeToggle'

export default function Profile() {
  const { user, logout } = useSession()

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>

      <section className="card p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-muted">Name</dt>
            <dd className="text-lg font-semibold">{user.name}</dd>
          </div>
          <div>
            <dt className="text-muted">Email</dt>
            <dd className="text-lg font-semibold break-all">{user.email}</dd>
          </div>
        </dl>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-semibold">Colours</h2>
        <p className="mt-1 text-muted">Auto follows this device: dark at night if your device does. The sun and moon button at the top switches between Light and Dark.</p>
        <div className="mt-3">
          <ThemeChoice />
        </div>
      </section>

      <button onClick={logout} className="btn btn-secondary">
        Log out
      </button>
    </div>
  )
}

// Teacher home. PHASE 1 PLACEHOLDER: shows who is logged in.
// Phase 2 turns this into the list of classes with "Create your first class".

import { useSession } from '../../session'

export default function Classes() {
  const { user } = useSession()

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome, {user.firstName}</h1>
      <p className="mt-2 text-muted">
        You are logged in as {user.name} ({user.email}).
      </p>
      <section className="card mt-8 p-6">
        <h2 className="text-xl font-semibold">Your classes</h2>
        <p className="mt-1 text-muted">Creating classes and adding students comes in the next phase.</p>
      </section>
    </div>
  )
}

// Any URL that doesn't match a page.

import { Link } from 'react-router-dom'
import { useSession } from '../session'

export default function NotFound() {
  const { user } = useSession()

  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <h1 className="text-3xl font-semibold">We can&apos;t find that page</h1>
      <p className="mt-2 text-muted">The link might be old or have a typo.</p>
      <Link to={user ? `/${user.role}` : '/'} className="btn btn-primary mt-6">
        Go home
      </Link>
    </div>
  )
}

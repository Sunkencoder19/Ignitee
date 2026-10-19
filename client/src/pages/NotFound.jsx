// Any URL that doesn't match a page.

import { Link } from 'react-router-dom'
import { useT } from '../i18n/t'
import { useSession } from '../session'

export default function NotFound() {
  const { user } = useSession()
  const t = useT()

  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <h1 className="text-3xl font-semibold">{t('notFound.title')}</h1>
      <p className="mt-2 text-muted">{t('notFound.text')}</p>
      <Link to={user ? `/${user.role}` : '/'} className="btn btn-primary mt-6">
        {t('notFound.goHome')}
      </Link>
    </div>
  )
}

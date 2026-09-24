import { Link } from 'react-router-dom'
import { Compass, House } from 'lucide-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { useAuth } from '@/context/AuthContext'
import useDocumentTitle from '@/hooks/useDocumentTitle'

export default function NotFoundPage() {
  useDocumentTitle('Page not found')
  const { user } = useAuth()
  const home = user ? `/${user.role}` : '/'

  return (
    <div className="grid min-h-[60dvh] place-items-center px-4 py-10">
      <EmptyState
        icon={Compass}
        title="We can't find that page"
        message="The link might be old or have a typo."
        action={
          <Button as={Link} to={home} icon={House}>
            Go home
          </Button>
        }
        className="w-full max-w-md"
      />
    </div>
  )
}

import { Link } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'

// Shown when a child opens something locked straight from the URL:
// a chapter, lesson, quiz or result they haven't reached yet.
export default function LockedNotice({ title, message, backTo, backLabel }) {
  return (
    <EmptyState
      icon={Lock}
      title={title}
      message={message}
      action={
        <Button as={Link} to={backTo} icon={ArrowLeft}>
          {backLabel}
        </Button>
      }
    />
  )
}

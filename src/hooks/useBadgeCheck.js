import { useEffect } from 'react'
import { newlyEarnedBadges } from '@/lib/badgeRules'

// Runs the badge rules after each progress change that came from the child
// doing something (a lesson or a quiz). It never runs after a load: lastEvent
// is empty then, so seed students don't get toasts for old achievements.
// Several badges at once go out in one BADGE_UNLOCKED and queue as toasts.
export default function useBadgeCheck(state, send) {
  const { status, progress, chapters, badges, lastEvent } = state

  useEffect(() => {
    if (status !== 'ready' || !lastEvent) return
    const badgeIds = newlyEarnedBadges(badges, progress, chapters)
    if (badgeIds.length > 0) send('BADGE_UNLOCKED', { badgeIds })
  }, [status, progress, chapters, badges, lastEvent, send])
}

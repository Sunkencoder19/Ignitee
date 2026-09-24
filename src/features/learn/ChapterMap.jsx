import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Lock, RotateCcw, Star, TriangleAlert } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import { useProgress } from '@/context/ProgressContext'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import useFetch from '@/hooks/useFetch'
import { getChapterMapEntries } from '@/lib/chapterProgress'
import { getTint } from '@/lib/tints'
import { getChapters } from '@/services/contentService'

// Snake pattern: centre, right, centre, left, repeat. Uses flex alignment
// (not transforms), so it never pushes a node past the container edge.
const LANES = ['justify-center', 'justify-end', 'justify-center', 'justify-start']

// ---- ChapterNode ----
// Kept in this file, not its own component: only the map uses it.
function ChapterNode({ entry, index }) {
  const { chapter, state, stars, lockedReason } = entry
  const tint = getTint(chapter.tint)
  const lane = LANES[index % LANES.length]

  const circle = (
    <span
      className={[
        'grid h-20 w-20 shrink-0 place-items-center rounded-full font-heading text-2xl font-bold shadow-soft',
        state === 'done' ? `${tint.solid} text-white` : '',
        state === 'current' ? `${tint.soft} ${tint.text} ring-4 ring-offset-2 ${tint.ring}` : '',
        state === 'locked' ? 'bg-ink-900/5 text-ink-600' : '',
        state === 'current' ? 'animate-pulse' : '',
      ].join(' ')}
    >
      {state === 'done' && <Check aria-hidden="true" className="h-9 w-9" />}
      {state === 'current' && chapter.number}
      {state === 'locked' && <Lock aria-hidden="true" className="h-7 w-7" />}
    </span>
  )

  const label = (
    <div className="w-28 text-center">
      <p
        className={`font-heading text-sm font-semibold leading-tight ${state === 'locked' ? 'text-ink-600' : 'text-ink-900'}`}
      >
        {chapter.title}
      </p>
      {state !== 'locked' && (
        <div className="mt-1 flex justify-center gap-0.5">
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              aria-hidden="true"
              className={`h-4 w-4 ${n <= stars ? 'fill-sun-400 text-sun-400' : 'text-ink-900/15'}`}
            />
          ))}
        </div>
      )}
      {/* Always visible, not just on hover/focus, so it works on a touch screen too */}
      {state === 'locked' && <p className="mt-1 text-xs">{lockedReason}</p>}
    </div>
  )

  const content = (
    <div className="flex flex-col items-center gap-2">
      {circle}
      {label}
    </div>
  )

  if (state === 'locked') {
    return (
      <li className={`flex ${lane} px-2`}>
        <div aria-disabled="true" className="cursor-not-allowed opacity-90">
          {content}
        </div>
      </li>
    )
  }

  return (
    <li className={`flex ${lane} px-2`}>
      <Link
        to={`/student/learn/${chapter.id}`}
        className="rounded-2xl transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember-500/40 active:scale-95"
      >
        {content}
      </Link>
    </li>
  )
}

// ---- ChapterMap ----
export default function ChapterMap() {
  useDocumentTitle('Chapter map')
  const { progress, status: progressStatus, error: progressError, reload } = useProgress()
  const [retryKey, setRetryKey] = useState(0)

  const { data: chapters, loading, error } = useFetch(() => getChapters(), [retryKey])
  const busy = loading || progressStatus === 'idle' || progressStatus === 'loading'
  const failed = error ?? (progressStatus === 'error' ? new Error(progressError) : null)
  function retry() {
    setRetryKey((k) => k + 1)
    if (progressStatus === 'error') reload()
  }

  // ---- render ----
  if (busy) {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <Spinner size="lg" label="Loading chapter map" />
      </div>
    )
  }

  if (failed) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn't load the chapter map"
        message={failed.message}
        action={
          <Button icon={RotateCcw} onClick={retry}>
            Try again
          </Button>
        }
      />
    )
  }

  if (chapters.length === 0) {
    return <EmptyState title="No chapters yet" message="Check back soon." />
  }

  const entries = getChapterMapEntries(chapters, progress)

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-center text-3xl">Chapter map</h1>
      <p className="mt-1 text-center">Follow the path. Finish a quiz to unlock the next one.</p>

      <Card padding="sm" className="mt-4 flex items-center gap-2 text-sm">
        <span className="h-3 w-3 rounded-full bg-ember-500" aria-hidden="true" />
        Done
        <span
          className="ml-3 h-3 w-3 rounded-full bg-ember-500/10 ring-2 ring-ember-500"
          aria-hidden="true"
        />
        Up next
        <span className="ml-3 h-3 w-3 rounded-full bg-ink-900/10" aria-hidden="true" />
        Locked
      </Card>

      <ol className="relative mt-8 flex flex-col gap-8 pb-4">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-1/2 w-0 -translate-x-1/2 border-l-2 border-dashed border-ink-900/15"
        />
        {entries.map((entry, index) => (
          <ChapterNode key={entry.chapter.id} entry={entry} index={index} />
        ))}
      </ol>
    </div>
  )
}

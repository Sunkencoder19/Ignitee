import { useParams } from 'react-router-dom'
import Card from '@/components/ui/Card'
import useDocumentTitle from '@/hooks/useDocumentTitle'

// Stand-in for screens that arrive in later checkpoints, so every route in
// the table already resolves and shows its URL params.
// TODO(fattesing): delete once checkpoint 8 replaces the last placeholder.
export default function PlaceholderPage({ title, checkpoint, children }) {
  useDocumentTitle(title)
  const params = Object.entries(useParams())

  return (
    <Card className="mx-auto max-w-xl">
      <p className="font-heading text-sm font-semibold uppercase tracking-widest text-ember-700">
        Coming in checkpoint {checkpoint}
      </p>
      <h1 className="mt-1 text-3xl">{title}</h1>
      {params.length > 0 && (
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {params.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="font-semibold text-ink-900">{key}</dt>
              <dd className="font-mono">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children && <div className="mt-6">{children}</div>}
    </Card>
  )
}

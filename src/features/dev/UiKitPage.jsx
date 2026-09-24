import { useState } from 'react'
import { ArrowRight, BookOpen, Check, Play, Rocket, Shapes, Star, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import ProgressBar from '@/components/ui/ProgressBar'
import Spinner from '@/components/ui/Spinner'
import { TINTS } from '@/lib/tints'

// Checkpoint 1 test page: every shared UI piece in every palette colour.
// TODO(fattesing): drop this or hide it behind /dev once real screens exist.

const SWATCHES = [
  { token: 'ember-500', hex: '#F97316', className: 'bg-ember-500' },
  { token: 'ember-700', hex: '#C2410C', className: 'bg-ember-700' },
  { token: 'ink-900', hex: '#1E1B4B', className: 'bg-ink-900' },
  { token: 'ink-600', hex: '#4B4A6B', className: 'bg-ink-600' },
  { token: 'cream-50', hex: '#FFF8EE', className: 'bg-cream-50 ring-1 ring-ink-900/10' },
  { token: 'paper', hex: '#FFFFFF', className: 'bg-paper ring-1 ring-ink-900/10' },
  { token: 'sun-400', hex: '#FACC15', className: 'bg-sun-400' },
  { token: 'leaf-600', hex: '#16A34A', className: 'bg-leaf-600' },
  { token: 'sky-500', hex: '#0EA5E9', className: 'bg-sky-500' },
  { token: 'berry-600', hex: '#E11D48', className: 'bg-berry-600' },
]

const SAMPLE_CHAPTERS = [
  { title: 'Shapes Around Us', tint: 'ember', done: 4, total: 4 },
  { title: 'Hide and Seek', tint: 'sky', done: 2, total: 3 },
  { title: 'Pattern Around Us', tint: 'leaf', done: 1, total: 4 },
  { title: 'Thousands Around Us', tint: 'sun', done: 0, total: 3 },
  { title: 'Sharing and Measuring', tint: 'berry', done: 0, total: 3 },
  { title: 'Measuring Length', tint: 'ink', done: 0, total: 3 },
]

function Section({ title, children }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl">{title}</h2>
      {children}
    </section>
  )
}

export default function UiKitPage() {
  // ---- state ----
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(3)

  // ---- handlers ----
  function fakeSave() {
    setSaving(true)
    setTimeout(() => setSaving(false), 1200)
  }

  function bumpProgress() {
    setProgress((p) => (p >= 8 ? 0 : p + 1))
  }

  // ---- render ----
  return (
    <main className="mx-auto max-w-5xl space-y-12 px-4 py-8 md:px-8">
      <header>
        <p className="font-heading text-sm font-semibold uppercase tracking-widest text-ember-700">
          Checkpoint 1
        </p>
        <h1 className="text-4xl md:text-5xl">IGNITE UI kit</h1>
        <p className="mt-2 max-w-prose text-lg">
          Every shared piece in the palette. Headings are Baloo 2, body is Nunito.
        </p>
      </header>

      <Section title="Palette">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {SWATCHES.map((s) => (
            <div key={s.token} className="rounded-2xl bg-paper p-3 shadow-soft">
              <div className={`h-14 rounded-xl ${s.className}`} />
              <p className="mt-2 font-heading font-semibold text-ink-900">{s.token}</p>
              <p className="text-sm">{s.hex}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <Card className="space-y-2">
          <h1 className="text-4xl">Heading one</h1>
          <h2 className="text-3xl">Heading two</h2>
          <h3 className="text-2xl">Heading three</h3>
          <p className="text-lg">
            Body at 18px for student screens. Short sentences, one idea at a time.
          </p>
          <p>Body at 16px for teacher screens and small print.</p>
        </Card>
      </Section>

      <Section title="Buttons">
        <Card className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Button icon={Play}>Start lesson</Button>
            <Button variant="secondary" icon={BookOpen}>
              Open chapter
            </Button>
            <Button variant="ghost">Skip</Button>
            <Button variant="success" icon={Check}>
              Correct
            </Button>
            <Button variant="danger" icon={Trash2}>
              Log out
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" iconRight={ArrowRight}>
              Next
            </Button>
            <Button size="lg" variant="secondary">
              Big secondary
            </Button>
            <Button loading={saving} onClick={fakeSave} icon={Rocket}>
              {saving ? 'Saving' : 'Tap to load'}
            </Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="max-w-sm">
            <Button size="lg" fullWidth iconRight={ArrowRight}>
              Full width, one main action
            </Button>
          </div>
        </Card>
      </Section>

      <Section title="Cards and chapter tints">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_CHAPTERS.map((ch, i) => (
            <Card key={ch.title} tint={ch.tint} interactive>
              <div className="flex items-start gap-3">
                <span
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl font-heading text-xl font-bold ${TINTS[ch.tint].soft} ${TINTS[ch.tint].text}`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg">{ch.title}</h3>
                  <p className="text-sm">
                    {ch.done} of {ch.total} lessons
                  </p>
                </div>
              </div>
              <ProgressBar className="mt-4" value={ch.done} max={ch.total} tint={ch.tint} />
            </Card>
          ))}
        </div>
        <Card padding="sm" className="flex items-center gap-3">
          <Star aria-hidden="true" className="h-6 w-6 fill-sun-400 text-sun-400" />
          <span className="whitespace-nowrap font-heading text-lg font-semibold text-ink-900">
            120 points
          </span>
          <span className="text-sm">(plain card, small padding, no tint)</span>
        </Card>
      </Section>

      <Section title="Progress bars">
        <Card className="space-y-5">
          <ProgressBar label="Lesson steps" value={progress} max={8} showValue size="lg" />
          <ProgressBar label="Chapter 2" value={2} max={3} tint="sky" showValue />
          <ProgressBar label="Quiz accuracy" value={90} tint="leaf" showValue size="sm" />
          <Button variant="secondary" onClick={bumpProgress}>
            Step forward
          </Button>
        </Card>
      </Section>

      <Section title="Empty state">
        <EmptyState
          icon={Shapes}
          title="No lessons yet"
          message="Pick a chapter and start your first lesson. It takes five minutes."
          action={<Button icon={Play}>Start your first lesson</Button>}
        />
      </Section>

      <Section title="Spinners">
        <Card className="flex items-center gap-8">
          <Spinner size="sm" />
          <Spinner />
          <Spinner size="lg" />
        </Card>
      </Section>
    </main>
  )
}

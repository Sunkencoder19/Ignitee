import { Link } from 'react-router-dom'
import { Award, BookOpen, GraduationCap, LineChart, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Wordmark from '@/components/ui/Wordmark'
import { useAuth } from '@/context/AuthContext'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import { getTint } from '@/lib/tints'

const TILES = [
  {
    icon: BookOpen,
    tint: 'ember',
    title: 'Learn',
    body: 'Short lessons that explain, show an example, then let you try it.',
  },
  {
    icon: Award,
    tint: 'sun',
    title: 'Earn badges',
    body: 'Finish lessons and quizzes to collect points, streaks and badges.',
  },
  {
    icon: LineChart,
    tint: 'sky',
    title: 'Track progress',
    body: 'See stars per chapter and how far you have come.',
  },
]

// ---- render ----
export default function LandingPage() {
  useDocumentTitle(null)
  const { user } = useAuth()

  // Already signed in: skip the login card and go straight to their home.
  const studentTo = user?.role === 'student' ? '/student' : '/login'
  const teacherTo = user?.role === 'teacher' ? '/teacher' : '/login'
  const studentState = user ? undefined : { from: '/student' }
  const teacherState = user ? undefined : { from: '/teacher' }

  return (
    <div className="min-h-dvh bg-cream-50">
      <main className="mx-auto max-w-3xl px-4 py-14 text-center md:py-20">
        <Wordmark size="lg" className="justify-center" />
        <h1 className="mt-6 text-3xl md:text-4xl">
          Maths for Class 4, made for a small screen and a slow connection.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg">
          Short lessons, friendly quizzes and stars to collect, built around the NCERT{' '}
          <em>Maths Mela</em> book.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            as={Link}
            to={studentTo}
            state={studentState}
            size="lg"
            icon={Sparkles}
            className="w-full sm:w-auto"
          >
            Start learning
          </Button>
          <Button
            as={Link}
            to={teacherTo}
            state={teacherState}
            size="lg"
            variant="secondary"
            icon={GraduationCap}
            className="w-full sm:w-auto"
          >
            I&apos;m a teacher
          </Button>
        </div>

        <div className="mt-14 grid gap-4 text-left sm:grid-cols-3">
          {TILES.map((tile) => {
            const tint = getTint(tile.tint)
            return (
              <Card key={tile.title} tint={tile.tint}>
                <span className={`grid h-12 w-12 place-items-center rounded-xl ${tint.soft}`}>
                  <tile.icon aria-hidden="true" className={`h-6 w-6 ${tint.text}`} />
                </span>
                <h2 className="mt-4 text-xl">{tile.title}</h2>
                <p className="mt-1">{tile.body}</p>
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}

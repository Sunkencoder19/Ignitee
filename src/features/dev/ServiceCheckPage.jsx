import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import * as contentService from '@/services/contentService'
import * as progressService from '@/services/progressService'
import * as classService from '@/services/classService'

// Checkpoint 2 test page: proves the service layer returns real data with a
// loading delay, before any route or screen calls it for real.
// TODO(fattesing): delete this once checkpoint 3 wires up routing.

export default function ServiceCheckPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    const startedAt = performance.now()

    async function run() {
      const chapters = await contentService.getChapters()
      console.log('getChapters ->', chapters)

      const lesson = await contentService.getLesson('ch1-l1')
      console.log('getLesson(ch1-l1) ->', lesson)

      const quiz = await contentService.getQuiz('ch2-quiz')
      console.log('getQuiz(ch2-quiz) ->', quiz)

      const newStudentProgress = await progressService.getProgress('s6')
      console.log('getProgress(s6, zero-progress student) ->', newStudentProgress)

      const activeStudentProgress = await progressService.getProgress('s1')
      console.log('getProgress(s1, strong student) ->', activeStudentProgress)

      const students = await classService.getStudents()
      console.log('getStudents ->', students)

      const detail = await classService.getStudentDetail('s12')
      console.log('getStudentDetail(s12, struggling student) ->', detail)

      const summary = await classService.getClassSummary()
      console.log('getClassSummary ->', summary)

      if (!ignore) {
        console.log(`All services resolved in ${Math.round(performance.now() - startedAt)}ms`)
        setLoading(false)
      }
    }

    run()
    return () => {
      ignore = true
    }
  }, [])

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl">Service check</h1>
      <p className="mt-2">Open the console to see each service call and its delay.</p>
      <Card className="mt-6 flex items-center gap-3">
        {loading ? (
          <>
            <Spinner size="sm" />
            <span>Loading from services...</span>
          </>
        ) : (
          <span>Done. Check the console for the logged results.</span>
        )}
      </Card>
    </main>
  )
}

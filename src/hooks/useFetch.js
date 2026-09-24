import { useEffect, useState } from 'react'

// Runs a service call and tracks { data, loading, error }. The ignore flag
// drops a stale response if deps change (or the page unmounts) mid-request.
export default function useFetch(serviceFn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  useEffect(() => {
    let ignore = false
    setState((prev) => ({ ...prev, loading: true, error: null }))

    serviceFn().then(
      (data) => {
        if (!ignore) setState({ data, loading: false, error: null })
      },
      (error) => {
        if (!ignore) setState({ data: null, loading: false, error })
      }
    )

    return () => {
      ignore = true
    }
    // Callers pass deps the same way they would to useEffect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}

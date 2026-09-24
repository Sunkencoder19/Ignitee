import { useEffect, useRef } from 'react'

// On a 360px phone the Next button appears below the fold once a question is
// answered. When `active` turns true, bring the element into view so the
// child isn't left wondering what to tap. Respects reduced motion.
export default function useScrollIntoView(active) {
  const ref = useRef(null)

  useEffect(() => {
    if (!active || !ref.current) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ref.current.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }, [active])

  return ref
}

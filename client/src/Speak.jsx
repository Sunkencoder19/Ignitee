// A "Listen" button that reads some text aloud, for children who cannot read yet
// (or are still learning). It uses the voice built into the phone or computer
// (the Web Speech API), so nothing is downloaded or sent anywhere. Which voices
// exist depends on the device: English is nearly everywhere, Hindi and Marathi on
// most Android phones. If the device has no speech at all the button is not shown.

import { useEffect, useState } from 'react'
import { useLanguage, useT } from './i18n/t'

const VOICE = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' }
const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

export default function Speak({ text, className = '' }) {
  const t = useT()
  const language = useLanguage()
  const [speaking, setSpeaking] = useState(false)

  // Stop talking if the page changes while it is reading.
  useEffect(() => () => supported() && window.speechSynthesis.cancel(), [])

  if (!supported() || !String(text ?? '').trim()) return null

  function toggle() {
    const synth = window.speechSynthesis
    if (speaking) {
      synth.cancel()
      setSpeaking(false)
      return
    }
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(String(text))
    utterance.lang = VOICE[language] ?? 'en-IN'
    utterance.rate = 0.9 // a little slower is easier for small children
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    setSpeaking(true)
    synth.speak(utterance)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t(speaking ? 'speak.stop' : 'speak.listen')}
      aria-pressed={speaking}
      className={`inline-grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent ${className}`}
    >
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5z" fill="currentColor" fillOpacity="0.2" />
        {speaking ? <path d="M15.5 9l4 6M19.5 9l-4 6" /> : <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />}
      </svg>
    </button>
  )
}

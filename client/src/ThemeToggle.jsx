// The light/dark switch shown in every header. One tap moves through:
//   Auto -> Light -> Dark -> Auto ...
// "Auto" (the default) follows the phone or computer's own setting, even if
// it changes while the page is open. The choice is remembered in this browser.
//
// How it works: the page's <html> element gets data-theme="light" or "dark",
// and index.css swaps the colours on that. index.html sets it once before the
// page draws (so there is no flash); this file keeps it up to date.

import { useEffect, useState } from 'react'
import { useT } from './i18n/t'

const KEY = 'ignite:theme' // the same key the script in index.html reads
const CHOICES = ['device', 'light', 'dark']
// Words come from i18n/*.json (theme.*), so the switch speaks the student's language.
const LABELS = { device: 'theme.auto', light: 'theme.light', dark: 'theme.dark' }
const SPOKEN = { device: 'theme.autoSpoken', light: 'theme.light', dark: 'theme.dark' }
const deviceQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

function savedChoice() {
  try {
    const value = localStorage.getItem(KEY)
    return CHOICES.includes(value) ? value : 'device'
  } catch {
    return 'device' // private browsing: just follow the device
  }
}

function apply(choice) {
  const dark = choice === 'dark' || (choice === 'device' && deviceQuery().matches)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
}

export default function ThemeToggle() {
  const [choice, setChoice] = useState(savedChoice)
  const t = useT()

  // Apply the choice, and while it is "Device setting", follow the device live.
  useEffect(() => {
    apply(choice)
    if (choice !== 'device') return
    const query = deviceQuery()
    const follow = () => apply('device')
    query.addEventListener('change', follow)
    return () => query.removeEventListener('change', follow)
  }, [choice])

  function next() {
    const upcoming = CHOICES[(CHOICES.indexOf(choice) + 1) % CHOICES.length]
    try {
      localStorage.setItem(KEY, upcoming)
    } catch {
      // Not saved; it still works until the page closes.
    }
    setChoice(upcoming)
  }

  return (
    <button
      type="button"
      onClick={next}
      aria-label={t('theme.spoken', { name: t(SPOKEN[choice]) })}
      className="inline-flex min-h-12 items-center whitespace-nowrap px-2 font-semibold text-muted hover:text-ink"
    >
      {t('theme.button', { name: t(LABELS[choice]) })}
    </button>
  )
}

// Light and dark mode.
//
//   <ThemeToggle />   a sun/moon button for the header: one tap switches between light and dark
//   <ThemeChoice />   the full choice, Auto / Light / Dark, shown on the Profile page
//
// "Auto" (the default) follows the phone or computer's own setting, even if it
// changes while the page is open. The choice is remembered in this browser.
//
// How it works: the page's <html> element gets data-theme="light" or "dark",
// and index.css swaps the colours on that. index.html sets it once before the
// page draws (so there is no flash); this file keeps it up to date. Both
// components share one saved choice, so changing it in one updates the other.

import { useSyncExternalStore } from 'react'
import { useT } from './i18n/t'

const KEY = 'ignite:theme' // the same key the script in index.html reads
const CHOICES = ['device', 'light', 'dark']
const deviceQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

function saved() {
  try {
    const value = localStorage.getItem(KEY)
    return CHOICES.includes(value) ? value : 'device'
  } catch {
    return 'device' // private browsing: just follow the device
  }
}

let choice = saved()
const listeners = new Set()
const isDark = () => choice === 'dark' || (choice === 'device' && deviceQuery().matches)

function apply() {
  document.documentElement.setAttribute('data-theme', isDark() ? 'dark' : 'light')
  listeners.forEach((listener) => listener())
}

function setChoice(next) {
  choice = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // Not saved; it still works until the page closes.
  }
  apply()
}

// While the choice is Auto, follow the device live.
deviceQuery().addEventListener('change', () => {
  if (choice === 'device') apply()
})

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// A string that changes whenever the choice or what it resolves to changes.
const snapshot = () => `${choice}:${isDark() ? 'dark' : 'light'}`

function useTheme() {
  const [current, resolved] = useSyncExternalStore(subscribe, snapshot).split(':')
  return { choice: current, dark: resolved === 'dark' }
}

export function ThemeToggle() {
  const { dark } = useTheme()
  const t = useT()
  return (
    <button
      type="button"
      onClick={() => setChoice(dark ? 'light' : 'dark')}
      aria-label={t(dark ? 'theme.toLight' : 'theme.toDark')}
      className="inline-grid size-12 place-items-center rounded-full text-ink hover:bg-accent-soft"
    >
      {dark ? (
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.2" fill="#ffc83d" stroke="#e08a00" />
          <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false" strokeLinejoin="round">
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="#8b6cf6" stroke="#4b27c9" strokeWidth="1.6" />
        </svg>
      )}
    </button>
  )
}

export function ThemeChoice() {
  const { choice: current } = useTheme()
  const t = useT()
  const names = { device: 'theme.auto', light: 'theme.light', dark: 'theme.dark' }
  return (
    <div role="radiogroup" aria-label={t('profile.theme')} className="inline-flex flex-wrap gap-1 rounded-full bg-bg p-1 ring-1 ring-line">
      {CHOICES.map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={current === value}
          onClick={() => setChoice(value)}
          className={`min-h-12 rounded-full px-4 font-semibold ${current === value ? 'bg-accent text-on-accent shadow-card' : 'text-muted hover:text-ink'}`}
        >
          {t(names[value])}
        </button>
      ))}
    </div>
  )
}

// Existing pages import the default: the header switch.
export default ThemeToggle

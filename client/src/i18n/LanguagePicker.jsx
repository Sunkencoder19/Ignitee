// English / हिन्दी / मराठी, on the login page and the student Home page.
// Each button is written in its own language, so a child can always find theirs.
// A logged-in student's choice is saved on their account (it follows them to
// any phone); before login it is remembered on this device for the login screen.

import { useSession } from '../session'
import { LANGUAGE_NAMES, useLanguage, useT } from './t'

export default function LanguagePicker() {
  const t = useT()
  const language = useLanguage()
  const { setLanguage } = useSession()

  return (
    <div role="radiogroup" aria-label={t('language.label')} className="inline-flex flex-wrap gap-1 rounded-full bg-bg p-1 ring-1 ring-line">
      {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
        <button
          key={code}
          type="button"
          role="radio"
          lang={code}
          aria-checked={language === code}
          onClick={() => setLanguage(code)}
          className={`min-h-12 rounded-full px-4 font-semibold ${language === code ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'}`}
        >
          {name}
        </button>
      ))}
    </div>
  )
}

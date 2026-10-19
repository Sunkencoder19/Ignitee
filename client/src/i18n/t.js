// Words on screen in English, Hindi or Marathi, with no library.
//
// Every student-facing sentence lives in en.json, hi.json and mr.json under a
// key such as "home.upNext". In a page:
//   const t = useT()
//   t('home.hello', { name: 'Asha' })      -> "Hi Asha!"   ({name} is filled in)
//   t('chapter.lessons', { count: 3 })      -> "3 lessons"  (uses "one" or "other")
// A sentence missing from hi.json or mr.json falls back to English, and a key
// missing everywhere shows the key itself, so nothing is ever blank.
//
// Which language? The app decides (session.jsx) and passes it down with
// <LanguageProvider>: a logged-in student's own choice (saved on their account),
// English for teachers, and the device's last choice on the login screens.

import { createContext, useContext } from 'react'
import en from './en.json'
import hi from './hi.json'
import mr from './mr.json'

const BOOKS = { en, hi, mr }

// Each language's name written in that language, for the picker.
export const LANGUAGE_NAMES = { en: 'English', hi: 'हिन्दी', mr: 'मराठी' }

function lookup(book, key) {
  return key.split('.').reduce((value, part) => (value == null ? undefined : value[part]), book)
}

export function hasTranslation(key) {
  return lookup(en, key) !== undefined
}

export function translate(lang, key, vars = {}) {
  let text = lookup(BOOKS[lang] ?? en, key) ?? lookup(en, key) ?? key
  // { "one": "1 lesson", "other": "{count} lessons" }
  if (text && typeof text === 'object') {
    const english = lookup(en, key)
    text = (vars.count === 1 ? text.one : text.other) ?? (vars.count === 1 ? english?.one : english?.other) ?? key
  }
  return String(text).replace(/\{(\w+)\}/g, (match, name) => (vars[name] ?? match))
}

const LanguageContext = createContext('en')
export const LanguageProvider = LanguageContext.Provider

export function useLanguage() {
  return useContext(LanguageContext)
}

export function useT() {
  const lang = useLanguage()
  return (key, vars) => translate(lang, key, vars)
}

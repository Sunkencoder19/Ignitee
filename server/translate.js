// Automatic Hindi and Marathi for teacher content.
//
// When a teacher saves English text, anything that has no Hindi or Marathi yet
// is translated by the free MyMemory service (api.mymemory.translated.net) and
// saved next to the English. Teachers can still correct any translation in the
// Hindi and Marathi tabs, and students see English wherever a translation is missing.
//
// Machine translation is good enough for sentences but often WRONG for single words
// ("Cow" can come back as nonsense), and a wrong word is worse than an English one for
// a small child. So lists of words (options, pairs, sort groups and items) are only
// translated automatically when every text in them is a phrase of two or more words
// (numbers are simply copied). Single words are left for the teacher to translate in
// the Hindi and Marathi tabs, and students see English until then. Any translation
// that comes back in Latin letters instead of Devanagari is thrown away too.
//
// Three rules keep it safe:
//   1. A translation a teacher typed or edited is never overwritten.
//   2. A translation made here is remembered with a "stamp" (a short fingerprint
//      of the English and of the translation). If the English changes later and
//      the translation was not edited by hand, it is translated again, so a
//      student never reads the answer to an old version of the question.
//   3. If the service is down, over its daily limit or slow, the save still
//      works: the field stays empty and students see English.
//
// Every translated text is also kept in the database (collection `translations`),
// so the same sentence is never sent twice. Only question and lesson text is sent
// out: never anything about students.
//
// Settings in server/.env (all optional):
//   TRANSLATE=off          turn automatic translation off
//   TRANSLATE_EMAIL=you@x  MyMemory allows far more text per day when it knows an email

import crypto from 'node:crypto'
import mongoose from 'mongoose'
import { LIMITS, translatableLists } from '../shared/game.js'

const { Schema, model } = mongoose

const cacheSchema = new Schema({ key: { type: String, unique: true }, text: String }, { timestamps: { createdAt: true, updatedAt: false } })
const Cached = model('Translation', cacheSchema, 'translations')

const hash = (text) => crypto.createHash('sha1').update(String(text)).digest('hex').slice(0, 10)
const hasLetters = (text) => /\p{L}/u.test(text)
const LANGS = ['hi', 'mr']

// MyMemory takes at most about 500 bytes a request, so long texts go sentence by sentence.
function chunks(text, max = 400) {
  const sentences = text.split(/(?<=[.!?।])\s+/)
  const out = []
  let current = ''
  for (const sentence of sentences) {
    if (current && (current + ' ' + sentence).length > max) {
      out.push(current)
      current = sentence
    } else {
      current = current ? `${current} ${sentence}` : sentence
    }
  }
  if (current) out.push(current)
  return out.flatMap((part) => {
    if (part.length <= max) return [part]
    const words = part.split(' ')
    const pieces = []
    let piece = ''
    for (const word of words) {
      if (piece && (piece + ' ' + word).length > max) {
        pieces.push(piece)
        piece = word
      } else piece = piece ? `${piece} ${word}` : word
    }
    return piece ? [...pieces, piece] : pieces
  })
}

async function askService(text, lang) {
  const params = new URLSearchParams({ q: text, langpair: `en|${lang}` })
  if (process.env.TRANSLATE_EMAIL) params.set('de', process.env.TRANSLATE_EMAIL)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?${params}`, { signal: controller.signal })
    const data = await res.json()
    const out = data?.responseData?.translatedText
    // Over the daily limit the service answers with a warning sentence instead of a translation.
    if (Number(data?.responseStatus) !== 200 || typeof out !== 'string' || /MYMEMORY WARNING/i.test(out)) return null
    return out.trim() || null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// One English text into `lang`, or null if it could not be done now.
async function translateText(text, lang, budget) {
  const english = String(text ?? '').trim()
  if (!english) return null
  if (!hasLetters(english)) return english // "12" or "3 + 4" read the same in every language
  const key = `${lang}|${english}`
  const known = await Cached.findOne({ key })
  if (known) return known.text
  if (Date.now() > budget.until) return null
  const parts = []
  for (const part of chunks(english)) {
    const out = await askService(part, lang)
    if (!out) return null
    parts.push(out)
  }
  const result = parts.join(' ')
  // Hindi and Marathi are written in Devanagari. An answer in Latin letters ("kutte") is
  // a bad translation, so it is not used or remembered.
  if (!/\p{Script=Devanagari}/u.test(result) && /[A-Za-z]/.test(result)) return null
  await Cached.updateOne({ key }, { $set: { text: result } }, { upsert: true })
  return result
}

// Runs async jobs a few at a time (the service is not built for a flood).
async function runAll(jobs, at = 4) {
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(at, jobs.length) }, async () => {
      while (next < jobs.length) await jobs[next++]()
    })
  )
}

const enabled = () => process.env.TRANSLATE !== 'off'

// ---------- one field ----------

// Fills t[field] with the translation of `english`, following the three rules above.
// `max` is the longest the field may be; a longer translation is left out.
async function fillField(t, field, english, lang, max, budget) {
  const current = t[field] ?? ''
  const stamp = t.auto?.[field]
  if (current) {
    if (!stamp) return // typed by a teacher
    const [seen, made] = stamp.split(':')
    if (hash(current) !== made) {
      delete t.auto[field] // edited by hand since: it is theirs now
      return
    }
    if (hash(english) === seen) return // still matches the English
  }
  const out = await translateText(english, lang, budget)
  if (!out || out.length > max) return
  t[field] = out
  t.auto = { ...(t.auto ?? {}), [field]: `${hash(english)}:${hash(out)}` }
}

// The same for a whole list (options or order items): all or nothing, one for one.
async function fillList(t, field, english, lang, budget, { distinct }) {
  const current = Array.isArray(t[field]) ? t[field] : []
  const stamp = t.auto?.[field]
  const complete = current.length === english.length && current.every((x) => String(x).trim())
  if (complete) {
    if (!stamp) return
    const [seen, made] = stamp.split(':')
    if (hash(JSON.stringify(current)) !== made) {
      delete t.auto[field]
      return
    }
    if (hash(JSON.stringify(english)) === seen) return
  } else if (current.some((x) => String(x).trim())) {
    return // a teacher started translating by hand: leave it for them to finish
  }
  // Single words are not translated automatically (see the top of this file).
  if (english.some((item) => hasLetters(item) && String(item).trim().split(/\s+/).length < 2)) return
  const out = await Promise.all(english.map((item) => translateText(item, lang, budget)))
  if (out.some((x) => !x || x.length > LIMITS.option)) return
  if (distinct && new Set(out.map((x) => x.toLowerCase())).size !== out.length) return
  t[field] = out
  t.auto = { ...(t.auto ?? {}), [field]: `${hash(JSON.stringify(english))}:${hash(JSON.stringify(out))}` }
}

function slot(owner, lang) {
  owner[lang] = owner[lang] && typeof owner[lang] === 'object' ? owner[lang] : {}
  return owner[lang]
}

// Takes the empty translation objects away again, so nothing is stored for a failed language.
function tidy(owner) {
  for (const lang of LANGS) {
    const t = owner[lang]
    if (!t) continue
    if (t.auto && Object.keys(t.auto).length === 0) delete t.auto
    if (Object.keys(t).length === 0) delete owner[lang]
  }
}

// ---------- what gets translated ----------
// All of these change the plain objects they are given (already cleaned and
// validated by content.js) and return when done.

function questionJobs(q, budget, jobs) {
  for (const lang of LANGS) {
    const t = slot(q, lang)
    for (const [field, max] of [['prompt', LIMITS.prompt], ['hint', LIMITS.hint], ['explanation', LIMITS.explanation]]) {
      if (q[field]) jobs.push(() => fillField(t, field, q[field], lang, max, budget))
    }
    // options, order items, both sides of pairs, the groups and items of a sort
    for (const { field, english } of translatableLists(q)) {
      jobs.push(() => fillList(t, field, english, lang, budget, { distinct: q.type !== 'order' }))
    }
  }
}

export async function translateQuestions(questions) {
  if (!enabled()) return
  const budget = { until: Date.now() + 25000 }
  const jobs = []
  for (const q of questions) questionJobs(q, budget, jobs)
  await runAll(jobs)
  for (const q of questions) tidy(q)
}

export async function translateLesson(lesson) {
  if (!enabled()) return
  const budget = { until: Date.now() + 25000 }
  const jobs = []
  for (const lang of LANGS) {
    const t = slot(lesson, lang)
    jobs.push(() => fillField(t, 'title', lesson.title, lang, LIMITS.title, budget))
  }
  for (const step of lesson.steps) {
    for (const lang of LANGS) {
      const t = slot(step, lang)
      jobs.push(() => fillField(t, 'text', step.text, lang, LIMITS.stepText, budget))
    }
    if (step.question) questionJobs(step.question, budget, jobs)
  }
  await runAll(jobs)
  tidy(lesson)
  for (const step of lesson.steps) {
    tidy(step)
    if (step.question) tidy(step.question)
  }
}

// A chapter: `owner` is { title, hi?, mr? } as plain data.
export async function translateTitle(owner) {
  if (!enabled()) return
  const budget = { until: Date.now() + 15000 }
  await runAll(LANGS.map((lang) => () => fillField(slot(owner, lang), 'title', owner.title, lang, LIMITS.title, budget)))
  tidy(owner)
}

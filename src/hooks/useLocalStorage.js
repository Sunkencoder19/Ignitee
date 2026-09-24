import { useCallback, useState } from 'react'

// State that survives a refresh. Every storage call is wrapped: private
// browsing or a full disk just means the value lasts for this visit only.
// If `key` changes (say, a different teacher logs in on the same device),
// the value for the new key is read, not carried over from the old one.

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export default function useLocalStorage(key, initialValue) {
  const [stored, setStored] = useState(() => ({ key, value: read(key, initialValue) }))
  const value = stored.key === key ? stored.value : read(key, initialValue)

  const setValue = useCallback(
    (next) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Not saved; still works until the page closes.
      }
      setStored({ key, value: next })
    },
    [key]
  )

  return [value, setValue]
}

// The only file that changes when a real backend arrives. Every service
// function routes its data through here instead of returning it directly,
// so loading and error states are real even though the data is local JSON.

const DEFAULT_DELAY_MS = 250

/**
 * Resolves `data` after an artificial delay, like a real network request.
 * Pass `errorRate` (0-1) to make a call fail sometimes, for testing error
 * states. `data` is deep-cloned so callers can't mutate the seed JSON.
 */
export function request(data, { delay = DEFAULT_DELAY_MS, errorRate = 0 } = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (errorRate > 0 && Math.random() < errorRate) {
        reject(new Error('Could not reach the server. Check your connection and try again.'))
        return
      }
      resolve(structuredClone(data))
    }, delay)
  })
}

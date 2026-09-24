import students from '@/data/students.json'
import teachers from '@/data/teachers.json'
import { request } from '@/services/api'

// Demo auth only: PINs live in the seed JSON and are checked in the browser.
// A real backend replaces this whole file.

const SESSION_KEY = 'ignite:session'

function usersFor(role) {
  return role === 'teacher' ? teachers : students
}

function displayName(user, role) {
  return role === 'teacher' ? `${user.title} ${user.name}` : user.name
}

// demoPin is only returned so the login card can show it during the review.
export function getLoginOptions(role) {
  const options = usersFor(role)
    .map((u) => ({ id: u.id, name: displayName(u, role), classId: u.classId, demoPin: u.pin }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return request(options)
}

export function login(role, userId, pin) {
  const user = usersFor(role).find((u) => u.id === userId)
  if (!user || user.pin !== pin) {
    return request(null).then(() => {
      throw new Error("That PIN doesn't match. Try again.")
    })
  }

  const session = {
    id: user.id,
    role,
    name: displayName(user, role),
    firstName: user.name.split(' ')[0],
    avatar: user.avatar ?? null,
    classId: user.classId,
  }
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Still logged in for this tab, just not after a refresh.
  }
  return request(session)
}

export function getSession() {
  try {
    const session = JSON.parse(window.localStorage.getItem(SESSION_KEY))
    return session?.id && session?.role ? session : null
  } catch {
    return null
  }
}

export function logout() {
  try {
    window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // Nothing to clear.
  }
}

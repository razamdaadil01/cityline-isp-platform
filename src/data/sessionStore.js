// Demo-grade, in-memory session layer — NOT production authentication.
// There is no backend, no password hashing, and no session expiry: login()
// does a plaintext comparison against userStore.js's seed data, and the
// "logged in" state lives only in this module's in-memory _currentUserId
// (the same module-level pub/sub pattern every other store in this app
// uses) — it resets on every page refresh and is trivially bypassable from
// devtools. This is good enough to make role-based UI gating actually
// reflect who's using the app in a given browser tab; it is not, and must
// never be mistaken for, real security.

import { useState, useEffect } from 'react'
import { getUsers } from './userStore'

let _currentUserId = null
const _listeners = []

function notify() { _listeners.forEach(fn => fn(_currentUserId)) }

export function login(email, password) {
  const user = getUsers().find(u => u.email === email && u.password === password)
  if (!user) return false
  _currentUserId = user.id
  notify()
  return true
}

export function logout() {
  _currentUserId = null
  notify()
}

export function getCurrentUser() {
  return getUsers().find(u => u.id === _currentUserId) ?? null
}

export function subscribeSession(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

// Reactive session check — mirrors rolesStore.js's usePermission() pattern,
// re-rendering the caller whenever login()/logout() changes who's signed in.
export function useSession() {
  const [, forceRerender] = useState(0)
  useEffect(() => subscribeSession(() => forceRerender(n => n + 1)), [])
  return getCurrentUser()
}

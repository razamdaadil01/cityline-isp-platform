// Demo-grade, in-memory session layer — NOT production authentication.
// There is no backend and no session expiry: login() hashes the entered
// password with userStore.js's hashPassword() (a demo-grade, non-reversible
// transformation, NOT real cryptographic hashing — see that file's
// top-of-file comment) and compares hashes, so a plaintext password is
// never compared or stored anywhere in this app anymore — but the "logged
// in" state still lives only in this module's in-memory _currentUserId
// (the same module-level pub/sub pattern every other store in this app
// uses), resets on every page refresh, and is trivially bypassable from
// devtools. This is good enough to make role-based UI gating actually
// reflect who's using the app in a given browser tab; it is not, and must
// never be mistaken for, real security.

import { useState, useEffect } from 'react'
import { getUsers, hashPassword } from './userStore'

let _currentUserId = null
const _listeners = []

function notify() { _listeners.forEach(fn => fn(_currentUserId)) }

export function login(email, password) {
  const hashed = hashPassword(password)
  const user = getUsers().find(u => u.email === email && u.password === hashed)
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

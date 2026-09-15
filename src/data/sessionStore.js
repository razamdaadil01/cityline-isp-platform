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

// ── Auth gate paused per client request ─────────────────────────────────
// The app defaults to Admin access with no login required: _currentUserId
// below is bootstrapped to the Super Admin seed user (u1, admin@cityline.in)
// at module load instead of starting null, so getCurrentUser() always
// resolves without anyone visiting /login. All the session/role
// infrastructure (login/logout, subscribeSession, useSession, permission
// checks) is untouched and still fully functional.
// To re-enable: change `_currentUserId` below back to `null` and restore
// the <RequireAuth /> wrapper route in App.jsx (see its own matching
// comment block for exactly what to revert).
let _currentUserId = 'u1'
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

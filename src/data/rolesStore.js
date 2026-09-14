// Roles & Permissions store — module-level pub/sub pattern (mirrors
// productStore.js). Extracted from RolesSettings.jsx, which previously held
// this as local component state (`useState(INITIAL_ROLES)`) with no export
// — nothing else in the app could read a role's permissions because there
// was nothing to import. This is the same data, moved so other modules can
// actually gate on it.

import { useState, useEffect } from 'react'
import { getUsers } from './userStore'

export const MODULES = [
  'Dashboard', 'Customers', 'Sales', 'Billing', 'Support',
  'Network', 'Inventory', 'Projects', 'Reports', 'Settings', 'Resellers', 'Audit Log',
]

export const ACTIONS = ['View', 'Create', 'Edit', 'Delete']

// Build a full permissions object (every module × action) at a single
// default value — used both by the seed below and by Settings.jsx's Roles
// tab (its Add Role / Reset flows).
export function buildPerms(defaultVal = false) {
  return Object.fromEntries(
    MODULES.map((m) => [m, Object.fromEntries(ACTIONS.map((a) => [a, defaultVal]))])
  )
}

// The 6 roles Settings.jsx's Roles & Permissions tab has always shown
// (Super Admin, Admin, Billing Manager, Support Agent, Field Engineer,
// Read Only). This seed briefly carried 3 extra roles (Network Engineer,
// Reseller, and a differently-named "Field Technician") inherited from
// RolesSettings.jsx's own broader role set — invisible in the app until
// that tab started reading straight from this store and surfaced them.
// Trimmed back to the original 6 here; add roles going forward via the
// tab's own Add Role flow instead of editing this array directly.
const SEED = [
  {
    id: 1,
    name: 'Super Admin',
    description: 'Full system access with no restrictions',
    usersCount: 2,
    color: 'navy',
    permissions: buildPerms(true),
  },
  {
    id: 2,
    name: 'Admin',
    description: 'Full access except system-level settings and audit log',
    usersCount: 5,
    color: 'blue',
    permissions: (() => {
      const p = buildPerms(true)
      p['Settings']['Delete'] = false
      p['Audit Log']['Create'] = false
      p['Audit Log']['Edit'] = false
      p['Audit Log']['Delete'] = false
      return p
    })(),
  },
  {
    id: 3,
    name: 'Billing Manager',
    description: 'Manage invoices, payments, and billing reports',
    usersCount: 3,
    color: 'green',
    permissions: (() => {
      const p = buildPerms(false)
      p['Dashboard']['View'] = true
      p['Billing']['View'] = true
      p['Billing']['Create'] = true
      p['Billing']['Edit'] = true
      p['Billing']['Delete'] = true
      p['Customers']['View'] = true
      p['Reports']['View'] = true
      return p
    })(),
  },
  {
    id: 4,
    name: 'Support Agent',
    description: 'Handle customer support tickets and inquiries',
    usersCount: 8,
    color: 'cyan',
    permissions: (() => {
      const p = buildPerms(false)
      p['Dashboard']['View'] = true
      p['Support']['View'] = true
      p['Support']['Create'] = true
      p['Support']['Edit'] = true
      p['Customers']['View'] = true
      p['Customers']['Edit'] = true
      return p
    })(),
  },
  {
    id: 5,
    name: 'Field Engineer',
    description: 'On-site installations, repairs, and inventory updates',
    usersCount: 12,
    color: 'orange',
    permissions: (() => {
      const p = buildPerms(false)
      p['Dashboard']['View'] = true
      p['Network']['View'] = true
      p['Network']['Edit'] = true
      p['Inventory']['View'] = true
      p['Inventory']['Edit'] = true
      p['Customers']['View'] = true
      return p
    })(),
  },
  {
    id: 6,
    name: 'Read Only',
    description: 'View-only access across all modules',
    usersCount: 3,
    color: 'gray',
    permissions: (() => {
      const p = buildPerms(false)
      MODULES.forEach((m) => { p[m]['View'] = true })
      return p
    })(),
  },
]

let _roles = [...SEED]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._roles])) }

export function getRoles() { return _roles }
export function getRole(id) { return _roles.find(r => r.id === id) ?? null }

export function subscribeRoles(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

// Create or update — same convention as productStore.js's saveProduct():
// callers pass an `id` to update an existing role, omit it to create a new
// one. Role ids in this seed are small sequential integers rather than a
// PRD-###-style prefix, so new roles keep using Date.now() (matching
// RolesSettings.jsx's pre-refactor behavior exactly — no id-scheme change).
export function saveRole(role) {
  if (role.id && _roles.find(r => r.id === role.id)) {
    _roles = _roles.map(r => r.id === role.id ? { ...r, ...role } : r)
  } else {
    const id = Date.now()
    _roles = [..._roles, { usersCount: 0, color: 'blue', ...role, id }]
  }
  notify()
}

export function deleteRole(id) {
  _roles = _roles.filter(r => r.id !== id)
  notify()
}

export function hasPermission(role, module, action) {
  return !!role?.permissions?.[module]?.[action]
}

// ── Current user / role resolution ──────────────────────────────────────
// There is no auth/session system anywhere in this app and no role-switch
// UI — the sidebar always shows the same static 'Admin User' identity, so
// "the current user's role" is hardcoded to the role named exactly 'Admin'
// in this store's *live* data: _roles.find(...) below re-reads the actual
// array on every call, never a snapshot taken once and cached, so editing
// 'Admin' in Settings.jsx's Roles & Permissions tab is reflected the next
// time anything calls usePermission() — no extra wiring needed since
// nothing here holds onto a stale copy.
// Falls back to the 'Super Admin' role if 'Admin' is ever renamed or
// deleted, so a broken lookup can never silently lock the app out of
// itself. getCurrentUser() (userStore.js's own first seeded user, still
// exported for anything that wants the display identity rather than the
// role) is deliberately NOT part of this resolution any more — routing
// through its role slug ('super_admin') previously resolved gating to the
// Super Admin role, not Admin, so editing the Admin role's permissions had
// no visible effect anywhere usePermission() gates UI.
export function getCurrentUserRole() {
  return _roles.find(r => r.name === 'Admin') ?? _roles.find(r => r.name === 'Super Admin') ?? null
}

export function getCurrentUser() {
  return getUsers()[0] ?? null
}

// Reactive permission check for gating UI — re-renders the caller whenever
// roles change (e.g. an admin edits the current user's role live in
// Settings.jsx's Roles & Permissions tab) so a gated button never needs a
// page reload to show or hide itself.
export function usePermission(module, action) {
  const [, forceRerender] = useState(0)
  useEffect(() => subscribeRoles(() => forceRerender(n => n + 1)), [])
  return hasPermission(getCurrentUserRole(), module, action)
}

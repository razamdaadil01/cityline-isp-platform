// Roles & Permissions store — module-level pub/sub pattern (mirrors
// productStore.js). Extracted from RolesSettings.jsx, which previously held
// this as local component state (`useState(INITIAL_ROLES)`) with no export
// — nothing else in the app could read a role's permissions because there
// was nothing to import. This is the same data, moved so other modules can
// actually gate on it.

import { useState, useEffect } from 'react'
import { getCurrentUser as getSessionUser } from './sessionStore'

// 'Technicians' gates TechnicianDashboard.jsx (/technicians) — added here
// rather than reusing an existing module so it can be granted/revoked
// independently. Because this array is read by every role's buildPerms()
// call in SEED below at module-load time, adding it here is enough on its
// own: Super Admin/Admin (buildPerms(true) base) get it automatically,
// Read Only (its own forEach grants View on every module) gets View
// automatically, and Billing Manager/Support Agent/Field Engineer
// (buildPerms(false) base, only specific modules explicitly granted) stay
// without access by default — a manager-level tool a Field Engineer isn't
// meant to see their own aggregated data through by default, consistent
// with everyone else's data on this dashboard also not being self-service.
export const MODULES = [
  'Dashboard', 'Customers', 'Sales', 'Billing', 'Support', 'Technicians',
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

// ── Micro-permissions ────────────────────────────────────────────────────
// A second, separate permission structure alongside the View/Create/Edit/
// Delete matrix above, for named permissions that don't map to generic CRUD
// (e.g. Support's "My tickets only" or "Send technician"). Keyed by module,
// then by a short camelCase key -> boolean — one level deeper than
// buildPerms()'s own module->action->bool shape, and intentionally separate
// from `permissions` rather than folded into it, since these are additive:
// existing CRUD-based modules (Inventory, Projects, Technicians, ...) have
// no entry here and keep using only the matrix above, completely untouched.
//
// Only modules listed here get a granular checklist in Settings.jsx's Roles
// & Permissions tab; adding a third module's micro-permissions later is
// just adding one more entry to this object — nothing else in this file,
// or in Settings.jsx's rendering, needs to change to pick it up.
export const MODULE_MICRO_PERMISSIONS = {
  Support: [
    { key: 'viewTicket',               label: 'View ticket' },
    { key: 'editTicketDetails',        label: 'Edit ticket details' },
    { key: 'addComment',               label: 'Add comment' },
    { key: 'addCustomerComments',      label: 'Add customer comments' },
    { key: 'sendTechnician',           label: 'Send technician' },
    { key: 'addHardware',              label: 'Add hardware' },
    { key: 'assignStaffAndDepartment', label: 'Assign staff and department' },
    { key: 'myTicketsOnly',            label: 'My tickets only' },
    { key: 'assignTickets',            label: 'Assign tickets' },
  ],
  Sales: [
    { key: 'leadCreate',       label: 'Lead Create' },
    { key: 'viewLead',         label: 'View Lead' },
    { key: 'myLeadOnly',       label: 'My Lead only' },
    { key: 'editLead',         label: 'Edit Lead' },
    { key: 'moveLead',         label: 'Move Lead' },
    { key: 'addManualPayment', label: 'Add manual payment' },
    { key: 'doEkyc',           label: 'Do eKYC' },
    { key: 'viewEkyc',         label: 'View eKYC' },
    { key: 'packageView',      label: 'Package view' },
    { key: 'addComments',      label: 'Add comments' },
  ],
}

export const MICRO_PERMISSION_MODULES = Object.keys(MODULE_MICRO_PERMISSIONS)

// One module's micro-permissions at a single default value.
export function buildModuleMicroPerms(module, defaultVal = false) {
  const perms = MODULE_MICRO_PERMISSIONS[module] ?? []
  return Object.fromEntries(perms.map((p) => [p.key, defaultVal]))
}

// Every MODULE_MICRO_PERMISSIONS module's permissions at a single default
// value — the microPermissions counterpart to buildPerms() above, used the
// same way (seed below, and Settings.jsx's Add Role / Reset flows).
export function buildMicroPerms(defaultVal = false) {
  return Object.fromEntries(
    MICRO_PERMISSION_MODULES.map((m) => [m, buildModuleMicroPerms(m, defaultVal)])
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
    microPermissions: buildMicroPerms(true),
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
    // Support/Sales aren't system-level, so Admin's broad access carries
    // through to the granular checklist the same way it does everywhere
    // else in `permissions` above.
    microPermissions: buildMicroPerms(true),
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
    // No Support/Sales module access at all above, so nothing granted here
    // either — same signal, one level deeper.
    microPermissions: buildMicroPerms(false),
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
    // Support-relevant day-to-day actions granted; supervisory actions
    // (assigning staff/departments, assigning tickets to others, touching
    // hardware records) and all of Sales stay off by default.
    microPermissions: (() => {
      const p = buildMicroPerms(false)
      p['Support']['viewTicket'] = true
      p['Support']['editTicketDetails'] = true
      p['Support']['addComment'] = true
      p['Support']['addCustomerComments'] = true
      p['Support']['sendTechnician'] = true
      p['Support']['myTicketsOnly'] = true
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
    // No Support/Sales module access above either.
    microPermissions: buildMicroPerms(false),
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
    // Mirrors the module-level "View only, everywhere" signal: just the
    // view-shaped granular permissions, nothing that creates/changes data.
    microPermissions: (() => {
      const p = buildMicroPerms(false)
      p['Support']['viewTicket'] = true
      p['Sales']['viewLead'] = true
      p['Sales']['viewEkyc'] = true
      p['Sales']['packageView'] = true
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

// Not called from any page yet (enforcement is a separate, later task) —
// exported now so Settings.jsx's checklist and any future
// usePermission()-style hook can read a role's granular grants the same
// way hasPermission() reads the CRUD matrix above.
export function hasMicroPermission(role, module, key) {
  return !!role?.microPermissions?.[module]?.[key]
}

// ── Current user / role resolution ──────────────────────────────────────
// Bridges userStore.js's role slugs (its own `role` field values, unrelated
// to this store's ids/names for historical reasons) to this store's role
// names, so a logged-in user's slug can resolve to an actual role record.
const SLUG_TO_ROLE_NAME = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  billing: 'Billing Manager',
  support: 'Support Agent',
  engineer: 'Field Engineer',
  readonly: 'Read Only',
}

// Resolves through sessionStore.js's demo-grade session (see that file's
// top-of-file comment) instead of any hardcoded role: nobody logged in, or
// their role slug/name doesn't resolve to a live role, means no permissions
// — a safe default, not a broken lookup. _roles.find() re-reads the actual
// live array on every call, never a snapshot taken once and cached, so
// editing a role's permissions in Settings.jsx's Roles & Permissions tab is
// reflected the next time anything calls usePermission() for whoever is
// currently logged in.
export function getCurrentUserRole() {
  const user = getSessionUser()
  if (!user) return null
  return _roles.find(r => r.name === SLUG_TO_ROLE_NAME[user.role]) ?? null
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

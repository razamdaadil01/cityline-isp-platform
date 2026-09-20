// POP Work Order store — module-level pub/sub pattern, same isNew/generated-
// id create-or-update convention as popStore.js's savePOP(). A POP Work
// Order is conceptually a Support Ticket scoped to a POP site rather than a
// customer — this store deliberately reuses ticketsStore.js's own
// established shapes wherever they transfer directly: an SLA window
// computed at creation from priority (slaDateFor, mirrors
// ticketsStore.js's slaDeadlineFor), an 'On Track'/'Due Soon'/'Breached'/
// 'Met' status derived from that deadline (slaStatusOf, mirrors
// ticketsStore.js's own slaStatusOf), and a plain activityLog entries array
// (mirrors ticketsStore.js's appendActivity).
//
// Phase 1 scope (per the client's PRD): only the Cleaning and Preventive/
// Breakdown Maintenance categories are implemented. Installation, Power
// Issue, Inspection, and Other are explicitly out of scope for this pass —
// WORK_ORDER_CATEGORIES intentionally lists only the two in scope so the
// Category dropdown can't create a Work Order this store/UI doesn't know
// how to render category-specific fields for.

import { logAudit } from './auditLogStore'
import { markPOPCleaned, markEquipmentMaintained } from './popStore'

export const WORK_ORDER_CATEGORIES = ['Cleaning', 'Preventive Maintenance', 'Breakdown-Fault']
export const WORK_ORDER_PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
export const WORK_ORDER_STATUSES = ['Open', 'Assigned', 'In-Progress', 'On-Hold', 'Resolved', 'Closed']
export const CLOSED_WORK_ORDER_STATUSES = ['Resolved', 'Closed']
export const FAULT_TYPES = ['Power', 'Fiber cut', 'Hardware failure', 'Connectivity']

// Cleaning checklist — fixed set of booleans per the PRD, keyed for stable
// storage/lookup rather than an array of label strings.
export const CLEANING_CHECKLIST_ITEMS = [
  { key: 'rackCleaning', label: 'Rack cleaning' },
  { key: 'dustRemoval', label: 'Dust removal' },
  { key: 'cableDressing', label: 'Cable dressing' },
  { key: 'splitterCheck', label: 'Splitter check' },
]
function emptyCleaningChecklist() {
  return Object.fromEntries(CLEANING_CHECKLIST_ITEMS.map(c => [c.key, false]))
}

const H = 3600000 // 1 hour in ms

// ── SLA rule ────────────────────────────────────────────────────────────
// Simple priority-only window, same "hours from creation" shape as
// ticketsStore.js's slaDeadlineFor(createdAt, priority): Critical = 4h,
// High = 24h, Medium = 3 days (72h), Low = 7 days (168h). Category doesn't
// further adjust the window in this Phase 1 pass — the PRD's "from priority
// + category" ask is satisfied by both being inputs to the record, but a
// single priority-keyed table is the simplest rule that covers every
// in-scope case without inventing category-specific numbers the PRD never
// actually specified; easy to extend to a priority×category table later if
// a real difference (e.g. Cleaning tolerating a longer window than a
// Breakdown-Fault at the same priority) turns out to matter.
const SLA_HOURS_BY_PRIORITY = { Critical: 4, High: 24, Medium: 72, Low: 168 }

function slaDateFor(createdAt, priority) {
  const hours = SLA_HOURS_BY_PRIORITY[priority] ?? SLA_HOURS_BY_PRIORITY.Medium
  return new Date(new Date(createdAt).getTime() + hours * H).toISOString()
}
export const computeSlaDate = slaDateFor

// 'On Track' | 'Due Soon' | 'Breached' — 'Due Soon' = within 20% of the SLA
// window remaining. Exact mirror of ticketsStore.js's slaStatusOf.
export function slaStatusOf(wo) {
  if (CLOSED_WORK_ORDER_STATUSES.includes(wo.status)) return 'Met'
  const deadline = new Date(wo.slaDate).getTime()
  const remaining = deadline - Date.now()
  if (remaining <= 0) return 'Breached'
  const windowMs = (SLA_HOURS_BY_PRIORITY[wo.priority] ?? SLA_HOURS_BY_PRIORITY.Medium) * H
  if (remaining < windowMs * 0.2) return 'Due Soon'
  return 'On Track'
}

function appendActivity(wo, action, actor) {
  return [...(wo.activityLog ?? []), { time: new Date().toISOString(), actor, action }]
}

// ── Seed data ────────────────────────────────────────────────────────────
// One resolved Cleaning Work Order (POP-002, Andheri) whose Last Cleaning
// Date matches popStore.js's own seeded literal on that POP (see its
// comment) — kept as parallel literals rather than one seed driving the
// other via a cross-module savePOP() call, so app boot never fires a
// spurious "Updated POP" audit-log entry. One in-progress Preventive
// Maintenance Work Order (POP-003, Bandra) so the list/detail pages have a
// live, non-terminal example too.
//
// createdAt (and the derived assignedAt/resolvedAt/scheduledDateTime) are
// computed relative to NOW rather than hardcoded calendar dates — same
// reasoning as ticketsStore.js's own SEED (`NOW - 76 * H`, etc.): a
// hardcoded past date would make the in-progress Work Order's SLA status
// drift into "Breached" the longer this codebase sits before actually being
// run, which isn't a sensible thing for seed/demo data to do.
const NOW = Date.now()

const SEED = [
  {
    id: 'WO-POP-2026-0001',
    popId: 'POP-002',
    category: 'Cleaning',
    priority: 'Low',
    assignedTechnicianIds: ['u3'], // Arjun Kumar — POP-002's own Default In-charge Technician
    scheduledDateTime: new Date(NOW - 31 * 24 * H).toISOString().slice(0, 16),
    description: 'Routine monthly rack cleaning and dust removal at Andheri POP.',
    status: 'Resolved',
    cleaningChecklist: { rackCleaning: true, dustRemoval: true, cableDressing: true, splitterCheck: false },
    equipmentInvolved: null, faultType: null,
    hardwareNeed: [],
    resolutionNotes: 'Rack, cabling and splitter tray cleaned. Splitter check deferred — combs not scheduled to be replaced this visit.',
    rootCause: '',
    hardwareUsed: [],
    technicianSignOff: true,
    requireSupervisorApproval: false, supervisorApproval: false,
    createdAt: new Date(NOW - 31 * 24 * H).toISOString(),
    assignedAt: new Date(NOW - 31 * 24 * H).toISOString(),
    resolvedAt: new Date(NOW - 31 * 24 * H + 2.3 * H).toISOString(),
    timeTaken: 2.3,
  },
  {
    id: 'WO-POP-2026-0002',
    popId: 'POP-003',
    category: 'Preventive Maintenance',
    priority: 'Medium',
    assignedTechnicianIds: ['u12'], // Prakash Yadav — POP-003's own Default In-charge Technician
    scheduledDateTime: new Date(NOW + 2 * 24 * H).toISOString().slice(0, 16),
    description: 'Quarterly preventive check on the Distribution Switch and OLT power supply at Bandra POP.',
    status: 'In-Progress',
    cleaningChecklist: null,
    equipmentInvolved: 'DIST-02', faultType: 'Power',
    hardwareNeed: [],
    resolutionNotes: '', rootCause: '', hardwareUsed: [], technicianSignOff: false,
    requireSupervisorApproval: true, supervisorApproval: false,
    createdAt: new Date(NOW - 30 * H).toISOString(),
    assignedAt: new Date(NOW - 30 * H).toISOString(),
    resolvedAt: null,
    timeTaken: null,
  },
].map(wo => ({ ...wo, slaDate: slaDateFor(wo.createdAt, wo.priority), activityLog: [{ time: wo.createdAt, actor: 'System', action: 'Work Order created' }] }))

let _workOrders = [...SEED]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._workOrders])) }

// New ids are WO-POP-<year>-#### — same PREFIX-YYYY-#### shape as
// projectStore.js's generateHDDProjectId()/generateSiteProjectId().
let _nextSeq = SEED.length + 1
export function generateWorkOrderId() {
  const year = new Date().getFullYear()
  return `WO-POP-${year}-${String(_nextSeq++).padStart(4, '0')}`
}
// Non-consuming — safe to call on every render while the Add Work Order
// form is open, same convention as popStore.js's previewPOPId().
export function previewWorkOrderId() {
  const year = new Date().getFullYear()
  return `WO-POP-${year}-${String(_nextSeq).padStart(4, '0')}`
}

export function getWorkOrders() { return _workOrders }
export function getWorkOrder(id) { return _workOrders.find(w => w.id === id) ?? null }
export function getWorkOrdersForPOP(popId) { return _workOrders.filter(w => w.popId === popId) }

// Every Work Order that named this specific equipment item (a Maintenance
// Work Order's own equipmentInvolved field — Cleaning Work Orders are
// POP-wide and never carry one, see saveWorkOrder()'s own note) — backs the
// POP Inventory view's "Linked Work Orders" column/modal per equipment row.
export function getWorkOrdersForEquipment(popId, equipmentId) {
  if (!equipmentId) return []
  return _workOrders.filter(w => w.popId === popId && w.equipmentInvolved === equipmentId)
}

export function subscribeWorkOrders(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

// Create or update. Callers pass an `id` to update an existing Work Order;
// omitting it (new Work Order) assigns a new generateWorkOrderId() id, same
// isNew/generated-id convention as popStore.js's savePOP(). Two business
// rules are enforced here (not just in the form) since they're hard rules,
// not just UI guidance:
//   - Closing (status 'Closed') is refused (returns null) if this Work
//     Order's own requireSupervisorApproval toggle is on but
//     supervisorApproval hasn't been given yet.
//   - timeTaken is auto-computed (hours, 1 decimal) the moment status first
//     reaches 'Resolved', from assignedAt (stamped the moment status first
//     leaves 'Open') to now — never recomputed on a later save, so editing
//     an already-resolved Work Order's other fields doesn't silently drift
//     its recorded resolution time.
// The Cleaning -> Resolved -> stamp Last Cleaning Date and Maintenance ->
// Resolved -> stamp Last Maintenance Date business rules live here too, via
// popStore.js's own markPOPCleaned()/markEquipmentMaintained() (both merge
// onto the existing POP/equipment record via savePOP() without touching
// other fields — same partial-update behavior savePOP()'s isNew===false
// branch already gives every other caller).
export function saveWorkOrder(wo) {
  const isNew = !(wo.id && _workOrders.find(w => w.id === wo.id))
  const prev = isNew ? null : _workOrders.find(w => w.id === wo.id)

  if (wo.status === 'Closed' && (wo.requireSupervisorApproval ?? prev?.requireSupervisorApproval) && !wo.supervisorApproval) {
    return null
  }

  const now = new Date().toISOString()
  const prevStatus = prev?.status ?? null
  const assignedAt = prev?.assignedAt ?? (wo.status && wo.status !== 'Open' ? now : null)
  const justResolved = wo.status === 'Resolved' && prevStatus !== 'Resolved'
  const timeTaken = justResolved
    ? Math.round(((Date.now() - new Date(assignedAt ?? prev?.createdAt ?? now).getTime()) / H) * 10) / 10
    : (prev?.timeTaken ?? wo.timeTaken ?? null)
  const resolvedAt = justResolved ? now : (prev?.resolvedAt ?? null)

  let saved
  if (!isNew) {
    saved = {
      ...prev, ...wo, assignedAt, timeTaken, resolvedAt, updatedAt: now,
      activityLog: prevStatus !== wo.status ? appendActivity(prev, `Status changed to ${wo.status}`, 'Admin User') : prev.activityLog,
    }
    _workOrders = _workOrders.map(w => w.id === wo.id ? saved : w)
  } else {
    const id = generateWorkOrderId()
    saved = {
      assignedTechnicianIds: [], hardwareNeed: [],
      cleaningChecklist: wo.category === 'Cleaning' ? emptyCleaningChecklist() : null,
      equipmentInvolved: null, faultType: null,
      resolutionNotes: '', rootCause: '', hardwareUsed: [], technicianSignOff: false,
      requireSupervisorApproval: false, supervisorApproval: false,
      ...wo, id, status: wo.status || WORK_ORDER_STATUSES[0],
      assignedAt, timeTaken, resolvedAt,
      createdAt: now, updatedAt: now,
      slaDate: slaDateFor(now, wo.priority),
      activityLog: [{ time: now, actor: 'Admin User', action: 'Work Order created' }],
    }
    _workOrders = [saved, ..._workOrders]
  }
  notify()

  // Business rule: a Cleaning Work Order marked Resolved stamps Last
  // Cleaning Date on its POP and every one of its equipment rows; a
  // Preventive/Breakdown-Fault Maintenance Work Order marked Resolved
  // stamps Last Maintenance Date on the one equipment row it names (if
  // any). Both only fire on the save that actually transitions status to
  // Resolved (justResolved), not on every subsequent edit of an
  // already-resolved record.
  if (justResolved && saved.category === 'Cleaning') {
    markPOPCleaned(saved.popId, now.slice(0, 10))
  }
  if (justResolved && saved.category !== 'Cleaning' && saved.equipmentInvolved) {
    markEquipmentMaintained(saved.popId, saved.equipmentInvolved, now.slice(0, 10))
  }

  logAudit({
    action: isNew ? 'Create' : 'Edit', module: 'Network',
    details: `${isNew ? 'Created' : 'Updated'} Work Order ${saved.id} (${saved.category}) for POP ${saved.popId}`,
  })
  return saved
}

export function deleteWorkOrder(id) {
  const wo = getWorkOrder(id)
  _workOrders = _workOrders.filter(w => w.id !== id)
  notify()
  if (wo) logAudit({ action: 'Delete', module: 'Network', details: `Deleted Work Order ${wo.id} for POP ${wo.popId}` })
}

// Open (not Resolved/Closed) Work Orders currently assigned to a
// technician — same "how busy is this person right now" idea as
// ticketsStore.js's technicianWorkload(), scoped to Work Orders. Backs the
// Technician Assignment picker's availability indicator (see
// POPWorkOrderDetail.jsx) without pulling in the full installations/
// recoveries computation TechnicianDashboard.jsx itself uses — that's a
// much heavier cross-store rollup built for a dedicated monitoring
// dashboard, not proportionate for a lightweight picker hint here.
export function technicianOpenWorkOrderCount(technicianId) {
  return _workOrders.filter(w => w.assignedTechnicianIds?.includes(technicianId) && !CLOSED_WORK_ORDER_STATUSES.includes(w.status)).length
}

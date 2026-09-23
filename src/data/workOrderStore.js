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
// All 7 PRD categories are implemented: Cleaning, Preventive Maintenance,
// Breakdown-Fault, Installation, Power Issue, Inspection, and Other. Each
// carries its own category-specific field set (see POPWorkOrderDetail.jsx)
// while sharing the same SLA, status lifecycle, hardware-need, and
// resolution flow as the original Phase 1 categories.

import { logAudit } from './auditLogStore'
import { markPOPCleaned, markEquipmentMaintained, getPOP } from './popStore'
import { saveAssignment } from './assignmentStore'
import { getProduct } from './productStore'
import { getUsers } from './userStore'
import { getProductAvailability } from './inventoryLedger'
import { raiseStockTransferRequestIfNeeded } from './stockTransferRequestStore'
import { addNotification } from './notificationStore'

export const WORK_ORDER_CATEGORIES = ['Cleaning', 'Preventive Maintenance', 'Breakdown-Fault', 'Installation', 'Power Issue', 'Inspection', 'Other']
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

// Inspection checklist — five site-health items that map a general POP
// inspection to a structured yes/no outcome, same keyed-boolean shape as
// CLEANING_CHECKLIST_ITEMS. inspectionFindings (free-text) supplements the
// checklist for anything that doesn't fit a checkbox.
export const INSPECTION_CHECKLIST_ITEMS = [
  { key: 'exteriorCleanliness', label: 'Exterior & site cleanliness' },
  { key: 'equipmentOperational', label: 'All equipment operational' },
  { key: 'cableIntegrity', label: 'Cable routing & integrity' },
  { key: 'powerSupplyCheck', label: 'Power supply & backup check' },
  { key: 'securityIntact', label: 'Physical security intact' },
]
function emptyInspectionChecklist() {
  return Object.fromEntries(INSPECTION_CHECKLIST_ITEMS.map(c => [c.key, false]))
}

// Power Issue select options — standard site-power states for both battery
// backup and generator, aligned with ISP field practice.
export const BATTERY_BACKUP_STATUSES = ['Active', 'Degraded', 'Failed', 'Not Present']
export const GENERATOR_STATUSES = ['Running', 'Standby', 'Fault', 'Not Present']

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
    // No hardware was used resolving this Cleaning Work Order (hardwareUsed
    // is empty above), so nothing to have deducted — same "parallel
    // literal, not driven by a live saveWorkOrder() call" reasoning as this
    // seed's other resolution fields.
    hardwareDeducted: false, inventoryAssignmentId: null, hardwareDeductionError: null,
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
    hardwareDeducted: false, inventoryAssignmentId: null, hardwareDeductionError: null,
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

// ── Hardware auto-deduction from central Inventory stock (PRD Phase 2) ────
// Reuses assignmentStore.js's real saveAssignment() — the exact mechanism
// Assign to Engineer/Assign to User already rely on to reduce available
// stock. There is no separate "decrement a number" path anywhere in this
// app for quantity-tracked hardware: inventoryLedger.js's computeLedger()
// derives every product's available balance by netting gross purchase
// receipts against every non-'Returned' Assignment record's hardwareLines
// (see that file's own "Assignments: deductions" block) — an Assignment is
// the one real write path that actually reduces what Inventory Overview,
// Product Detail's Movement History, etc. report as available. So rather
// than inventing a second deduction mechanism, a Work Order's confirmed
// Hardware Used lines are booked as a real Assignment record here, exactly
// like Assign to Engineer/Assign to User already do.
//
// POPs have no "store" concept of their own, and the PRD frames this as
// deducting from "central Inventory stock" rather than any one branch, so
// every POP Work Order's deduction is booked against STR-001 — storeStore.js's
// own seeded 'Main Warehouse' — regardless of which POP it belongs to.
const CENTRAL_STORE = { id: 'STR-001', name: 'Main Warehouse', branchCode: 'CNPL-001' }

// Deducts only the *confirmed* hardwareUsed quantities — never the
// originally-requested hardwareNeed quantities, which can be larger; the
// Resolution form's hardwareUsed rows already are "confirm actual qty
// used" (POPWorkOrderDetail.jsx), so they're exactly what should leave
// stock. requiredQty on the resulting Assignment line (a documentation
// field only — saveAssignment() validates against assignedQty, not it) is
// still carried through from the matching Hardware Need row so the
// Assignments list shows what was originally requested alongside what was
// actually taken.
//
// The Work Order's first assigned technician stands in for
// saveAssignment()'s required engineer — a real userStore.js id/name pair.
// It sits in a different id namespace than installationsStore.js's own
// FIELD_ENGINEERS roster the Assign-to-Engineer flow normally issues
// against, but nothing in saveAssignment()'s own save path validates
// engineerId against that roster (only that flow's own UI/branch-roster
// helpers do), so this is safe.
//
// saveAssignment() re-validates against real current stock itself and
// throws if a line would take a balance negative. That's caught here
// rather than left to abort the whole Work Order resolution — the
// physical work is already done by the time a Work Order is being
// resolved, so a stock-record shortfall should surface as a flagged
// discrepancy (the returned `error`, stored as hardwareDeductionError on
// the Work Order) rather than block the resolution outright.
function deductHardwareUsed(wo) {
  const lines = (wo.hardwareUsed ?? []).filter(u => u.productId && (Number(u.quantity) || 0) > 0)
  if (lines.length === 0) return { assignmentId: null, error: null }

  const technicianId = wo.assignedTechnicianIds?.[0] ?? null
  const technician = technicianId ? getUsers().find(u => u.id === technicianId) : null

  try {
    const assignment = saveAssignment({
      engineerId: technicianId ?? 'unassigned',
      engineerName: technician?.name ?? 'Unassigned Technician',
      branchCode: CENTRAL_STORE.branchCode,
      workOrderId: wo.id,
      workOrderLabel: `${wo.id} (POP ${wo.popId} — ${wo.category})`,
      storeId: CENTRAL_STORE.id,
      storeName: CENTRAL_STORE.name,
      hardwareLines: lines.map(u => ({
        productId: u.productId,
        productName: getProduct(u.productId)?.name ?? u.productId,
        requiredQty: Number((wo.hardwareNeed ?? []).find(n => n.productId === u.productId)?.quantity ?? u.quantity) || 0,
        assignedQty: Number(u.quantity) || 0,
        serials: [], macs: [],
        remark: `Consumed resolving POP Work Order ${wo.id}`,
      })),
      remarks: `Auto-deducted from central stock on resolution of POP Work Order ${wo.id}.`,
    })
    return { assignmentId: assignment.id, error: null }
  } catch (err) {
    return { assignmentId: null, error: err.message }
  }
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
// branch already gives every other caller). Hardware auto-deduction (see
// deductHardwareUsed() above) fires the same way, gated by
// hardwareDeducted rather than justResolved alone — see that gate's own
// comment below.
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
  } else {
    const id = generateWorkOrderId()
    saved = {
      assignedTechnicianIds: [], hardwareNeed: [],
      cleaningChecklist: wo.category === 'Cleaning' ? emptyCleaningChecklist() : null,
      equipmentInvolved: null, faultType: null,
      // Installation
      newEquipmentDetails: '', projectReference: null,
      // Power Issue
      batteryBackupStatus: '', downtimeStartTime: '', generatorStatus: '',
      // Inspection
      inspectionChecklist: wo.category === 'Inspection' ? emptyInspectionChecklist() : null,
      inspectionFindings: '',
      resolutionNotes: '', rootCause: '', hardwareUsed: [], technicianSignOff: false,
      requireSupervisorApproval: false, supervisorApproval: false,
      hardwareDeducted: false, inventoryAssignmentId: null, hardwareDeductionError: null,
      ...wo, id, status: wo.status || WORK_ORDER_STATUSES[0],
      assignedAt, timeTaken, resolvedAt,
      createdAt: now, updatedAt: now,
      slaDate: slaDateFor(now, wo.priority),
      activityLog: [{ time: now, actor: 'Admin User', action: 'Work Order created' }],
    }
  }

  // Guard against double-deduction: gated on hardwareDeducted — a
  // persisted flag on the record itself, not just justResolved's own
  // prevStatus check. Status here is a plain dropdown with no reopen
  // workflow guarding it, so an admin can walk a Work Order Resolved ->
  // Closed -> Resolved again by hand; justResolved alone would be true
  // again on that second transition and deduct a second time.
  // hardwareDeducted is set true (see below) the first time this ever
  // fires and stays true forever after, so a later re-resolution is
  // correctly recognized as not-the-first and skipped.
  const firstTimeResolved = justResolved && !prev?.hardwareDeducted
  if (firstTimeResolved) {
    const deduction = deductHardwareUsed(saved)
    saved = { ...saved, hardwareDeducted: true, inventoryAssignmentId: deduction.assignmentId, hardwareDeductionError: deduction.error }
    logAudit({
      action: 'Edit', module: 'Network',
      details: deduction.error
        ? `Work Order ${saved.id}: hardware deduction from central stock failed — ${deduction.error}`
        : deduction.assignmentId
          ? `Work Order ${saved.id}: deducted confirmed Hardware Used from central stock (${deduction.assignmentId})`
          : `Work Order ${saved.id}: resolved with no Hardware Used to deduct.`,
    })
  }

  _workOrders = isNew ? [saved, ..._workOrders] : _workOrders.map(w => w.id === wo.id ? saved : w)
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

  // Business rule (PRD Phase 2): a Hardware Need line whose requested
  // quantity exceeds what's actually available at central stock
  // auto-raises a Stock Transfer Request — same shortfall check
  // POPWorkOrderDetail.jsx's own inline warning already computes. Runs on
  // every save (not gated to Resolved/justResolved — a shortfall is real
  // the moment it's requested, not just once the Work Order is done), and
  // is itself idempotent (raiseStockTransferRequestIfNeeded skips a
  // product/Work Order pair that already has an open request), so saving
  // the same Work Order repeatedly never raises duplicates.
  ;(saved.hardwareNeed ?? []).forEach(line => {
    if (!line.productId) return
    const requestedQty = Number(line.quantity) || 0
    const availableQty = getProductAvailability(line.productId)
    if (requestedQty > availableQty) {
      raiseStockTransferRequestIfNeeded({
        popId: saved.popId, popName: getPOP(saved.popId)?.name ?? saved.popId,
        workOrderId: saved.id,
        productId: line.productId, productName: getProduct(line.productId)?.name ?? line.productId,
        requestedQty, availableQty,
      })
    }
  })

  // Alert trigger (PRD Phase 2, "Work Order assigned -> notify the
  // assigned Technician(s)"): fires for whichever technician id(s) are
  // newly present in assignedTechnicianIds that weren't there on the prior
  // save — covers both a brand-new Work Order created with technicians
  // already picked and a later addition of technicians to an existing one.
  // Unlike the other 5 alert triggers (all standing conditions recomputed
  // fresh by popAlertsStore.js's getPOPAlerts()), this one is a genuine
  // EVENT — it happens once, at the exact moment of assignment — so it's
  // pushed directly to the real shared notificationStore.js bell here
  // rather than being something to keep recomputing as "currently true".
  const newlyAssignedIds = (saved.assignedTechnicianIds ?? []).filter(tid => !(prev?.assignedTechnicianIds ?? []).includes(tid))
  if (newlyAssignedIds.length > 0) {
    const users = getUsers()
    const names = newlyAssignedIds.map(tid => users.find(u => u.id === tid)?.name ?? tid)
    const pop = getPOP(saved.popId)
    addNotification({
      type: 'wo_assigned',
      title: 'Work Order Assigned',
      description: `Work Order ${saved.id} (${saved.category}) for ${pop?.name ?? saved.popId} assigned to ${names.join(', ')}. (Notify: Technician — Field Engineer)`,
      meta: saved.id,
      reference: saved.id,
      color: 'blue',
    })
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

// User Assignment (Engineer → Customer handoff) store — module-level pub/sub
// pattern (mirrors assignmentStore.js). Records hardware an engineer already
// holds (issued to them via assignmentStore.js's Assign to Engineer flow)
// being handed off to an end customer/user against a Work Order reference.
//
// This is a SEPARATE store from assignmentStore.js rather than an extension
// of it — a UserAssignment isn't "issuing from store stock against a Work
// Order's requirement" (assignmentStore.js's whole shape), it's "moving
// stock an engineer already holds on to someone else." Sharing one store
// would mean overloading ASSIGNMENT_STATUSES, hardwareLines/wireLines'
// {requiredQty, assignedQty} shape (there's no "required" here — the
// engineer hands off whatever the user actually needs), and
// getAssignableWorkOrders' single-Work-Order-source assumption with a
// second, genuinely different workflow. Keeping them separate keeps both
// files legible; they're linked only via getAssignments() below (read-only,
// one-directional).
//
// Architecture note on why this file does NOT import inventoryLedger.js:
// same reasoning as assignmentStore.js's own file-level note — inventoryLedger.js
// needs to import THIS file to layer handoffs on top of units/movements, so
// this file importing it back would be circular. saveUserAssignment()'s own
// validation instead re-derives each engineer's current gross holdings
// directly from assignmentStore.js's getAssignments(), netted against this
// store's own prior handoffs — mathematically identical to what
// inventoryLedger.js's getEngineerHeldQty()/getUnits() report, computed via
// an independent path that keeps the dependency graph acyclic.

import { getAssignments } from './assignmentStore'
import { getInstallations } from './installationsStore'
import { getTickets } from './ticketsStore'
import { getOutages } from './outagesStore'
import { logAudit } from './auditLogStore'

export const USER_ASSIGNMENT_STATUSES = ['Handed Off', 'Reversed']

// 'new' (default) hands off held product(s) with no unit coming back —
// today's only behavior until this field was added. 'replace' hands off a
// new unit AND captures the faulty/old unit coming back from the customer
// (see `returnedItem` below). 'disconnection' hands off nothing — it only
// captures the unit being taken back. CreateUserAssignment.jsx's UI is the
// only writer of this field today.
export const ASSIGNMENT_TYPES = ['new', 'replace', 'disconnection']

// Seeded so the Assignment List demonstrates its 'Assigned to User' line
// status (see Assignments.jsx's lineStatus()) alongside 'Assigned to
// Engineer' — matches the exact shape saveUserAssignment() itself produces,
// same "seed then let the ledger derive live state from it" pattern every
// other store here uses. Each hands off the one ONT serial issued in the
// matching assignmentStore.js record (ASG-000001/ASG-000005/ASG-000006) to
// that Work Order's own customer, once its Installation is 'Completed' —
// nothing invented that isn't already real elsewhere.
const SEED = [
  {
    id: 'USRA-000001', assignmentNumber: 'USR-2026-000001',
    engineerId: 'eng-001', engineerName: 'Arjun Kumar',
    workOrderType: 'Installation', workOrderId: 'INS-005', workOrderLabel: 'INS-005',
    customerName: 'Preeti Agarwal', customerId: null,
    assignmentType: 'new', returnedItem: null,
    items: [{ productId: 'PRD-001', productName: 'ONT Device', serials: ['ZTE-ONT-2026-0001'], macs: [], qty: 1 }],
    remarks: 'Installation completed — ONT handed off to customer.',
    status: 'Handed Off', assignedBy: 'Arjun Kumar', assignedAt: '2026-06-03T12:00:00.000Z',
  },
  {
    id: 'USRA-000002', assignmentNumber: 'USR-2026-000002',
    engineerId: 'eng-002', engineerName: 'Preethi Nair',
    workOrderType: 'Installation', workOrderId: 'INS-015', workOrderLabel: 'INS-015',
    customerName: 'Kavita Rao', customerId: null,
    assignmentType: 'new', returnedItem: null,
    items: [{ productId: 'PRD-001', productName: 'ONT Device', serials: ['ZTE-ONT-2026-0002'], macs: [], qty: 1 }],
    remarks: 'Installation completed — ONT handed off to customer.',
    status: 'Handed Off', assignedBy: 'Preethi Nair', assignedAt: '2026-08-05T12:00:00.000Z',
  },
  {
    id: 'USRA-000003', assignmentNumber: 'USR-2026-000003',
    engineerId: 'eng-001', engineerName: 'Arjun Kumar',
    workOrderType: 'Installation', workOrderId: 'INS-016', workOrderLabel: 'INS-016',
    customerName: 'Manoj Deshmukh', customerId: null,
    assignmentType: 'new', returnedItem: null,
    items: [{ productId: 'PRD-001', productName: 'ONT Device', serials: ['ZTE-ONT-2026-0003'], macs: [], qty: 1 }],
    remarks: 'Installation completed — ONT handed off to customer.',
    status: 'Handed Off', assignedBy: 'Arjun Kumar', assignedAt: '2026-08-07T12:00:00.000Z',
  },
]

let _userAssignments = [...SEED]
let _nextSeq = SEED.length + 1
let _nextInternalSeq = SEED.length + 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._userAssignments])) }

export function getUserAssignments() { return _userAssignments }
export function getUserAssignment(id) { return _userAssignments.find(a => a.id === id) ?? null }

export function subscribeUserAssignments(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

function nextUserAssignmentNumber() {
  const year = new Date().getFullYear()
  return `USR-${year}-${String(_nextSeq++).padStart(6, '0')}`
}

// ── Step 2 reference lookup ──────────────────────────────────────────────
// Normalizes each supported Work Order Type's own module into a common
// { id, label, customerName, customerId, searchText } shape, reusing each
// module's own getX() rather than duplicating its data. 'Network' and
// 'Project' have no backing module anywhere in the app (grep confirms no
// networkStore.js/projectStore.js, no workOrderType concept elsewhere
// either) — they resolve to an empty list rather than fabricating records;
// Step 2's UI shows an explicit "not available" state for those instead of
// a picker. 'Incident' maps to outagesStore.js's Outages — the closest
// existing concept to a network incident; outages are area-wide, so
// customerName/customerId are always null for these rows.
//
// `customerId` is the "User Id" CreateUserAssignment.jsx displays read-only
// once a reference is picked. Neither source module has a field literally
// named customerId on every record, so it's approximated from the closest
// real identifier each already carries: Installations only get a
// `customerId` once their linked Lead has converted to a real Customer
// record (see installationsStore.js's updateInstallationStatus — most
// seeded Installations have no Lead behind them and so have no customerId
// yet); Tickets carry a stable `accountNumber` from creation, used here as
// the user-facing identifier. Neither is a perfect "the" customer ID, but
// both are the closest existing field to one — flagged for review rather
// than inventing a new customer-lookup module.
export function getWorkOrderTypeRecords(type) {
  if (type === 'Installation') {
    return getInstallations().map(i => ({
      id: i.id, label: i.id, customerName: i.customerName, customerId: i.customerId ?? null,
      searchText: `${i.id} ${i.customerName} ${i.address ?? ''}`.toLowerCase(),
    }))
  }
  if (type === 'Ticket') {
    return getTickets().map(t => ({
      id: t.id, label: t.id, customerName: t.customerName, customerId: t.accountNumber ?? null,
      searchText: `${t.id} ${t.customerName} ${t.subject ?? ''}`.toLowerCase(),
    }))
  }
  if (type === 'Incident') {
    return getOutages().map(o => ({
      id: o.id, label: o.id, customerName: null, customerId: null,
      searchText: `${o.id} ${o.title ?? ''} ${(o.affectedAreas ?? []).join(' ')}`.toLowerCase(),
    }))
  }
  return [] // 'Network' / 'Project' — no data source exists yet
}

// ── Engineer holdings — independent snapshot, see file-level note ───────

function grossHeldByEngineer() {
  const qtyByKey = {} // `${engineerId}|${productId}` -> cumulative assignedQty (quantity-tracked only)
  const heldValuesByEngineer = {} // engineerId -> Set of serial/mac values currently on their assignments
  const metersByDrumKey = {} // `${engineerId}|${productId}|${drumNumber}` -> cumulative assignedMeters
  getAssignments()
    .filter(a => a.status !== 'Returned')
    .forEach(a => {
      a.hardwareLines.forEach(l => {
        const lineValues = [...l.serials, ...l.macs]
        if (lineValues.length) {
          const set = heldValuesByEngineer[a.engineerId] ?? (heldValuesByEngineer[a.engineerId] = new Set())
          lineValues.forEach(v => set.add(v))
        } else if (l.assignedQty > 0) {
          const key = `${a.engineerId}|${l.productId}`
          qtyByKey[key] = (qtyByKey[key] ?? 0) + l.assignedQty
        }
      })
      a.wireLines.forEach(l => {
        if (l.assignedMeters > 0 && l.drumNumber) {
          const key = `${a.engineerId}|${l.productId}|${l.drumNumber}`
          metersByDrumKey[key] = (metersByDrumKey[key] ?? 0) + (Number(l.assignedMeters) || 0)
        }
      })
    })
  return { qtyByKey, heldValuesByEngineer, metersByDrumKey }
}

// `excludeId` on all three helpers below — and on the exported
// getEngineerHeld*() functions that call them — lets updateUserAssignment()
// (and its validation) leave one specific assignment's own prior handoff
// out of the "already handed off" tally, so editing that assignment sees
// its own items as still-available-to-pick instead of double-counting them
// against themselves. Mirrors inventoryLedger.js's computeLedger()
// `excludeUserAssignmentId` on the read side (see that file's note); kept
// as a separate parameter here rather than merged into one shared helper,
// consistent with this file's existing independent-validation-path
// architecture.
function alreadyHandedOffValues(excludeId = null) {
  const set = new Set()
  _userAssignments.forEach(ua => {
    if (ua.id === excludeId) return
    ua.items.forEach(it => { it.serials.forEach(s => set.add(s)); it.macs.forEach(m => set.add(m)) })
  })
  return set
}

function alreadyHandedOffQty(engineerId, productId, excludeId = null) {
  let sum = 0
  _userAssignments.forEach(ua => {
    if (ua.engineerId !== engineerId || ua.id === excludeId) return
    ua.items.forEach(it => {
      if (it.productId === productId && !it.serials.length && !it.macs.length && !it.drumNumber) sum += Number(it.qty) || 0
    })
  })
  return sum
}

function alreadyHandedOffMeters(engineerId, productId, drumNumber, excludeId = null) {
  let sum = 0
  _userAssignments.forEach(ua => {
    if (ua.engineerId !== engineerId || ua.id === excludeId) return
    ua.items.forEach(it => {
      if (it.productId === productId && it.drumNumber === drumNumber) sum += Number(it.qty) || 0
    })
  })
  return sum
}

// Serial/MAC values currently held (assigned, not yet handed off to a user)
// by a specific engineer — this store's own validation-time check;
// CreateUserAssignment.jsx's Step 3 UI reads the equivalent live figure
// through inventoryLedger.js's getUnits()/getEngineerHeldQty() instead (see
// that file's own note on why the two paths are computed independently).
export function getEngineerHeldValues(engineerId, excludeId = null) {
  const { heldValuesByEngineer } = grossHeldByEngineer()
  const handedOff = alreadyHandedOffValues(excludeId)
  return [...(heldValuesByEngineer[engineerId] ?? [])].filter(v => !handedOff.has(v))
}

export function getEngineerHeldQtyLocal(engineerId, productId, excludeId = null) {
  const { qtyByKey } = grossHeldByEngineer()
  const gross = qtyByKey[`${engineerId}|${productId}`] ?? 0
  return Math.max(0, gross - alreadyHandedOffQty(engineerId, productId, excludeId))
}

// Wire's equivalent of getEngineerHeldQtyLocal above — this store's own
// validation-time check for a specific held drum; CreateUserAssignment.jsx's
// Wire tab reads the equivalent live figure through inventoryLedger.js's
// getEngineerHeldDrums() instead (same independent-paths reasoning as
// getEngineerHeldValues()/getEngineerHeldQtyLocal() above).
export function getEngineerHeldMetersLocal(engineerId, productId, drumNumber, excludeId = null) {
  const { metersByDrumKey } = grossHeldByEngineer()
  const gross = metersByDrumKey[`${engineerId}|${productId}|${drumNumber}`] ?? 0
  return Math.max(0, gross - alreadyHandedOffMeters(engineerId, productId, drumNumber, excludeId))
}

// ── Save / Update ────────────────────────────────────────────────────────
// data: { engineerId, engineerName, workOrderType, workOrderId, workOrderLabel,
//         customerName, customerId, assignmentType,
//         items: [{ productId, productName, serials, macs, qty, drumNumber }],
//         returnedItem: { productId, productName, identifier, remark } | null,
//         remarks }
// An item is one of three shapes: serial/MAC-tracked hardware (serials/macs
// populated), quantity-tracked hardware (qty only), or wire (qty holds
// meters, drumNumber identifies which held drum they're drawn from).
// Throws if any item would take an engineer's held balance negative — the
// wizard's own live "held" counters are meant to prevent this
// interactively, but the store re-validates independently rather than
// trusting the caller, the same discipline assignmentStore.js's
// saveAssignment() already established for issuing from store stock.
//
// assignmentType is stored as-is on the record (New/Replace/Disconnection)
// but doesn't currently change any validation or shape below — Select
// Items' "at least one handed-off item" requirement applies the same way
// regardless of type, same as CreateUserAssignment.jsx's page layout no
// longer branches on it either. `returnedItem` (an optional unit coming
// back from the customer, captured as plain data with no stock validation)
// is accepted if the caller provides one, but nothing in this file requires
// it yet — CreateUserAssignment.jsx doesn't currently collect it; wiring up
// its own capture fields for Replace/Disconnection is a separate change.
//
// Shared by saveUserAssignment() and updateUserAssignment() below.
// `excludeId` is only ever the assignment's own id, passed by
// updateUserAssignment() so its own already-recorded items don't count
// against themselves as "already handed off" — see the excludeId note on
// getEngineerHeldValues()/getEngineerHeldQtyLocal()/getEngineerHeldMetersLocal()
// above.
function validateItems(data, seq, excludeId = null) {
  const assignmentType = ASSIGNMENT_TYPES.includes(data.assignmentType) ? data.assignmentType : 'new'
  const heldValues = new Set(getEngineerHeldValues(data.engineerId, excludeId))

  const items = (data.items || [])
    .filter(it => (it.serials?.length) || (it.macs?.length) || (Number(it.qty) || 0) > 0)
    .map((it, idx) => {
      const id = `USRI-${seq}-${idx}`
      const serials = it.serials ?? []
      const macs = it.macs ?? []
      if (serials.length || macs.length) {
        const values = [...serials, ...macs]
        values.forEach(v => {
          if (!heldValues.has(v)) throw new Error(`${v} is not currently assigned to ${data.engineerName}.`)
        })
        return { id, productId: it.productId, productName: it.productName, serials, macs, qty: values.length, drumNumber: null }
      }
      const qty = Number(it.qty) || 0
      if (it.drumNumber) {
        const available = getEngineerHeldMetersLocal(data.engineerId, it.productId, it.drumNumber, excludeId)
        if (qty > available) throw new Error(`${data.engineerName} only has ${available}m of ${it.productName} left on drum ${it.drumNumber} to hand off.`)
        return { id, productId: it.productId, productName: it.productName, serials: [], macs: [], qty, drumNumber: it.drumNumber }
      }
      const available = getEngineerHeldQtyLocal(data.engineerId, it.productId, excludeId)
      if (qty > available) throw new Error(`${data.engineerName} only has ${available} of ${it.productName} left to hand off.`)
      return { id, productId: it.productId, productName: it.productName, serials: [], macs: [], qty, drumNumber: null }
    })

  if (items.length === 0) {
    throw new Error('Select at least one item to hand off.')
  }

  const returnedItem = data.returnedItem?.productId && (data.returnedItem?.identifier || '').trim()
    ? {
        productId: data.returnedItem.productId, productName: data.returnedItem.productName ?? data.returnedItem.productId,
        identifier: data.returnedItem.identifier.trim(), remark: data.returnedItem.remark || '',
      }
    : null

  return { assignmentType, items, returnedItem }
}

export function saveUserAssignment(data, actor = 'Admin User') {
  const seq = _nextInternalSeq++
  const { assignmentType, items, returnedItem } = validateItems(data, seq)

  const assignment = {
    id: `USRA-${String(seq).padStart(6, '0')}`,
    assignmentNumber: nextUserAssignmentNumber(),
    engineerId: data.engineerId, engineerName: data.engineerName,
    workOrderType: data.workOrderType, workOrderId: data.workOrderId, workOrderLabel: data.workOrderLabel,
    customerName: data.customerName ?? null, customerId: data.customerId ?? null,
    assignmentType,
    items,
    returnedItem,
    remarks: data.remarks || '',
    status: 'Handed Off',
    assignedBy: actor, assignedAt: new Date().toISOString(),
  }
  _userAssignments = [assignment, ..._userAssignments]
  notify()

  const itemCount = items.reduce((s, it) => s + (it.serials.length + it.macs.length || it.qty), 0)
  logAudit({
    action: 'Create', module: 'Inventory',
    details: `Handed off ${itemCount} item(s) from ${data.engineerName} to ${data.customerName ?? assignment.workOrderLabel}`,
  })

  return assignment
}

// Edits an existing handoff in place — same `data` shape and validation as
// saveUserAssignment(), with the assignment's own prior items excluded from
// the "already handed off" tally (see validateItems()'s note) so its own
// picks are still available to keep, drop, or change. Keeps the original
// id/assignmentNumber/status/assignedBy/assignedAt — those describe when
// and by whom the handoff was first recorded, which editing its contents
// doesn't rewrite; the audit log entry below is the record of the edit
// itself. Throws the same way saveUserAssignment() does if `id` doesn't
// match an existing assignment.
export function updateUserAssignment(id, data, actor = 'Admin User') {
  const existing = _userAssignments.find(a => a.id === id)
  if (!existing) throw new Error('Assignment not found.')

  const { assignmentType, items, returnedItem } = validateItems(data, _nextInternalSeq++, id)

  const updated = {
    ...existing,
    engineerId: data.engineerId, engineerName: data.engineerName,
    workOrderType: data.workOrderType, workOrderId: data.workOrderId, workOrderLabel: data.workOrderLabel,
    customerName: data.customerName ?? null, customerId: data.customerId ?? null,
    assignmentType,
    items,
    returnedItem,
    remarks: data.remarks || '',
  }
  _userAssignments = _userAssignments.map(a => a.id === id ? updated : a)
  notify()

  logAudit({
    action: 'Update', module: 'Inventory',
    details: `Edited handoff ${existing.assignmentNumber} (${data.engineerName} → ${data.customerName ?? updated.workOrderLabel})`,
  })

  return updated
}

// ── Reverse one handed-off item back to the engineer's holdings ─────────
// Reverses a single handoff item — the inverse of the handoff itself: its
// serial/MAC unit(s), quantity, or drum meters move back to "held by the
// engineer" simply by removing the item from this assignment's own `items`
// array — the exact same "the line is gone, so whatever it claimed reverts
// automatically" mechanism assignmentStore.js's returnAssignmentLine() and
// storeTransferStore.js's reverseStoreTransferLine() both use.
// inventoryLedger.js's computeLedger() layers this store's handoffs on top
// of assignmentStore.js's own 'Assigned to Engineer' units/qty/meters (see
// its "User Assignments" block); once a handoff item is gone, the unit it
// named simply never gets relabeled 'Assigned to User' for this
// computation, so it reads back as still 'Assigned to Engineer' — no
// separate ledger write needed. If removing this item empties the
// assignment entirely, the assignment's own `status` flips to 'Reversed' —
// never left dangling as 'Handed Off' with an empty item list.
// `itemId` is the item's own `id` (e.g. 'USRI-1-0').
export function reverseUserAssignmentItem(assignmentId, itemId) {
  const assignment = _userAssignments.find(a => a.id === assignmentId)
  if (!assignment) throw new Error('User assignment not found.')
  if (assignment.status === 'Reversed') throw new Error('This handoff has already been reversed.')

  const item = assignment.items.find(it => it.id === itemId)
  if (!item) throw new Error('Line not found on this handoff.')

  const items = assignment.items.filter(it => it.id !== itemId)
  const nowEmpty = items.length === 0

  const updated = { ...assignment, items, status: nowEmpty ? 'Reversed' : assignment.status }
  _userAssignments = _userAssignments.map(a => a.id === assignmentId ? updated : a)
  notify()

  const qtyLabel = item.drumNumber
    ? `${item.qty}m of ${item.productName} (Drum ${item.drumNumber})`
    : `${item.serials.length || item.macs.length ? item.serials.length + item.macs.length : item.qty} of ${item.productName}`
  logAudit({
    action: 'Update', module: 'Inventory',
    details: `Reversed ${qtyLabel} — moved back from ${assignment.customerName ?? assignment.workOrderLabel} to ${assignment.engineerName}${nowEmpty ? ' — handoff fully reversed' : ''}`,
  })

  return updated
}

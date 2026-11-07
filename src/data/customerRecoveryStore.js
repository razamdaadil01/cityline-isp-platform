// Hardware Recovery store for core ISP customers (RES-/ENT- — see
// customersData.js's CUSTOMER_STATUSES). Phase 3 of the Customer
// Disconnection flow: mirrors intercomRecoveryStore.js's shape (same
// HRWO-YYYY-NNNNNN numbering, same status vocabulary) so the two modules
// stay operationally consistent, but is a wholly separate, independent
// store — no state or records are shared with the Intercom module, and
// nothing here imports from or is imported by intercomRecoveryStore.js.
//
// Unlike the Intercom version, this store starts with just one seed record
// (below) rather than a full demo set: there's no existing demo data for
// core-customer hardware recovery (Phase 3 is a brand-new flow), so beyond
// that single example — paired with customersData.js's 'Pending
// Disconnection' customer RES-2026-0030 — work orders only appear once
// CustomerDetail.jsx's "Schedule Hardware Recovery" action (Terminate flow,
// 'Pending Disconnection' status) creates one.

import { getUserAssignments, resolveRecovery } from './userAssignmentStore'
import { getAssignments, getAssignment, returnAssignmentLine, removeUnitFromAssignmentLine } from './assignmentStore'
import { saveAdjustment } from './inventoryAdjustmentStore'
import { logAudit } from './auditLogStore'

// Core customers don't have an Intercom-style "Converted to Internet" path
// — this list only reflects the one path Phase 1/2 actually create a
// disconnection through (CustomerDetail.jsx's Terminate action).
export const RECOVERY_REASONS = ['Service Terminated']

export const RECOVERY_STATUS_CFG = {
  pending:          { variant: 'orange', label: 'Pending'          },
  inprogress:       { variant: 'blue',   label: 'In Progress'      },
  completed:        { variant: 'green',  label: 'Completed'        },
  missing_hardware: { variant: 'red',    label: 'Missing Hardware' },
  damaged_hardware: { variant: 'red',    label: 'Damaged Hardware' },
  partial_recovery: { variant: 'yellow', label: 'Partial Recovery' },
}

// Statuses that mean a recovery work order is resolved one way or another —
// used by customersData.js's updateCustomer() (Phase 5 gate) to decide
// whether a customer may move from 'Pending Disconnection' to
// 'Disconnected'. Phase 4 (billing/settlement) will add its own gate on
// top of this one, not replace it.
export const RECOVERY_TERMINAL_STATUSES = ['completed', 'missing_hardware', 'damaged_hardware', 'partial_recovery']

// Scheduled but not yet actioned — same shape addRecovery() in
// CustomerDetail.jsx produces, and 'pending' is this store's equivalent of
// "scheduled": a work order only exists here once a technician/date/time
// slot has been assigned (there's no separate not-yet-scheduled state), and
// 'pending' just means that visit hasn't happened yet.
let _recoveries = [
  {
    id: 'HRWO-2026-000001',
    customerId: 'RES-2026-0030',
    customer: 'Ramesh Iyengar',
    phone: '9445012378',
    reason: 'Service Terminated',
    hardwareToRecover: 'ONU/ONT (ZTEGCB3A0030), Wi-Fi Router (TPL2024WR0030)',
    technician: 'Suresh Iyer',
    scheduledDate: '22-09-2026',
    timeSlot: 'Morning 9-12',
    accessInstructions: 'Security desk will escort to Flat 4B.',
    createdDate: '16-09-2026',
    notes: '',
    status: 'pending',
  },
]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._recoveries])) }

export function getRecoveries() { return [..._recoveries] }

export function getRecovery(id) { return _recoveries.find(o => o.id === id) ?? null }

export function getRecoveryByCustomerId(customerId) {
  return _recoveries.find(o => o.customerId === customerId) ?? null
}

export function addRecovery(order) {
  _recoveries = [order, ..._recoveries]
  notify()
  return order
}

// Internal: perform stock reconciliation when a recovery transitions to a
// terminal status. Called at most once per recovery — the stockReconciled
// guard in updateRecovery() ensures idempotency. Does NOT modify _recoveries
// itself; the caller stamps stockReconciled: true after this returns cleanly.
//
// completed / damaged_hardware: each recovered unit's engineer assignment
// line is removed via returnAssignmentLine() / removeUnitFromAssignmentLine(),
// which is the same mechanism ordinary "Back to Store" returns use —
// inventoryLedger.js re-computes every unit's status from the current
// non-Returned assignment lines, so a removed line automatically makes the
// unit 'Available' again with no separate ledger write needed. For damaged,
// an additional repair-type adjustment is logged so the unit shows as
// 'Sent for Repair' (not available for assignment) until serviced.
//
// missing_hardware / partial_recovery: engineer assignment lines are left
// intact, keeping affected units as 'Assigned to Engineer' in the ledger —
// they appear as outstanding in Stock Verification. recoveryOutcome on the
// user assignment records the financial/billing outcome for Phase 4.
function reconcileRecoveryStock(recovery, terminalStatus) {
  const recoveryId = recovery.id

  const outcome =
    terminalStatus === 'completed'        ? 'returned' :
    terminalStatus === 'damaged_hardware' ? 'damaged'  :
    terminalStatus === 'missing_hardware' ? 'missing'  : 'partial'

  // Close customer-side handoff tracking — marks linked user assignments
  // 'Reversed' and stamps recoveryOutcome for Phase 4 billing to read.
  resolveRecovery(recoveryId, outcome)

  if (terminalStatus !== 'completed' && terminalStatus !== 'damaged_hardware') {
    logAudit({
      action: 'Update', module: 'Inventory',
      details: `Recovery ${recoveryId} (${recovery.customer}) closed as '${outcome}' — hardware not returned to stock`,
    })
    return
  }

  const linkedUserAssignments = getUserAssignments().filter(
    ua => ua.recoveryWorkOrderId === recoveryId
  )
  const assignments = getAssignments() // snapshot before any mutations
  const movedItems = []

  for (const ua of linkedUserAssignments) {
    for (const item of ua.items) {
      const allValues = [...item.serials, ...item.macs]

      if (allValues.length > 0) {
        // Serial/MAC-tracked: find engineer assignment lines holding these values
        const matchedValues = new Set()
        for (const asg of assignments) {
          if (asg.status === 'Returned') continue
          for (const line of [...asg.hardwareLines]) {
            // Re-read current state — earlier iterations may have removed lines
            const curAsg = getAssignment(asg.id)
            if (!curAsg || curAsg.status === 'Returned') break
            const curLine = curAsg.hardwareLines.find(l => l.id === line.id)
            if (!curLine) continue

            const lineValues = [...curLine.serials, ...curLine.macs]
            const toReturn = allValues.filter(v => lineValues.includes(v))
            if (toReturn.length === 0) continue

            if (toReturn.length === lineValues.length) {
              returnAssignmentLine(asg.id, 'hardware', line.id)
            } else {
              for (const v of toReturn) {
                removeUnitFromAssignmentLine(asg.id, line.id, v)
              }
            }

            if (terminalStatus === 'damaged_hardware') {
              saveAdjustment({
                type: 'repair',
                productId: item.productId,
                productName: item.productName,
                storeId: asg.storeId,
                storeName: asg.storeName,
                qty: toReturn.length,
                units: toReturn.map(v => ({
                  value: v,
                  kind: item.serials.includes(v) ? 'serial' : 'mac',
                })),
                issueDescription: `Damaged — recovered from customer ${recovery.customer} (Recovery ${recovery.id})`,
              })
            }

            toReturn.forEach(v => matchedValues.add(v))
            movedItems.push(`${item.productName} × ${toReturn.length}`)
          }
        }

        // Serials/MACs not backed by any engineer assignment ("ghost serials"
        // — handed to the customer outside the engineer-assignment flow or
        // from a pre-import record). The inventoryLedger Reversed filter
        // handles their unit status; we still record them in the audit log.
        const ghostCount = allValues.filter(v => !matchedValues.has(v)).length
        if (ghostCount > 0) {
          movedItems.push(`${item.productName} × ${ghostCount}`)
        }

      } else if (item.qty > 0 && !item.drumNumber) {
        // Quantity-tracked hardware: return matching engineer lines by product
        const engineerAssignments = assignments.filter(
          a => a.engineerId === ua.engineerId && a.status !== 'Returned'
        )
        let qtyToReturn = item.qty
        for (const asg of engineerAssignments) {
          if (qtyToReturn <= 0) break
          for (const line of [...asg.hardwareLines]) {
            if (qtyToReturn <= 0) break
            if (line.productId !== item.productId) continue
            if (line.serials.length || line.macs.length) continue
            const curAsg = getAssignment(asg.id)
            if (!curAsg || curAsg.status === 'Returned') break
            const curLine = curAsg.hardwareLines.find(l => l.id === line.id)
            if (!curLine) continue
            returnAssignmentLine(asg.id, 'hardware', line.id)
            qtyToReturn -= curLine.assignedQty
            movedItems.push(`${item.productName} × ${curLine.assignedQty}`)
          }
        }
      }
      // Wire remains at the customer premises — not recovered via this flow
    }
  }

  logAudit({
    action: 'Update', module: 'Inventory',
    details: `Recovery ${recoveryId} (${recovery.customer}) — ${outcome}: ${
      movedItems.length
        ? movedItems.join(', ') + ' returned to stock'
        : 'no inventory items to reconcile'
    }`,
  })
}

export function updateRecovery(id, patch) {
  const existing = getRecovery(id)
  _recoveries = _recoveries.map(o => o.id === id ? { ...o, ...patch } : o)
  notify()
  const updated = getRecovery(id)

  // Trigger stock reconciliation exactly once when a terminal status is set.
  // existing.stockReconciled guards against double-posting if updateRecovery
  // is called again with the same (or a different) terminal status.
  if (
    patch.status &&
    RECOVERY_TERMINAL_STATUSES.includes(patch.status) &&
    existing &&
    !existing.stockReconciled
  ) {
    reconcileRecoveryStock(updated, patch.status)
    _recoveries = _recoveries.map(o => o.id === id ? { ...o, stockReconciled: true } : o)
    notify()
  }

  return getRecovery(id)
}

export function subscribeRecoveries(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i > -1) _listeners.splice(i, 1)
  }
}

export function nextRecoveryId() {
  const year = new Date().getFullYear()
  const nums = _recoveries
    .map(o => o.id.match(/^HRWO-(\d{4})-(\d+)$/))
    .filter(Boolean)
    .map(m => Number(m[2]))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `HRWO-${year}-${String(next).padStart(6, '0')}`
}

// Phase 5 gate — see RECOVERY_TERMINAL_STATUSES above.
export function isRecoveryResolvedForCustomer(customerId) {
  const r = getRecoveryByCustomerId(customerId)
  return !!r && RECOVERY_TERMINAL_STATUSES.includes(r.status)
}

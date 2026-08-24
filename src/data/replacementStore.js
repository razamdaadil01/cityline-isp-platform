// Replacement store — module-level pub/sub pattern (mirrors
// assignmentStore.js). Records a manual "this serial/MAC unit was swapped
// out in the field against a Support ticket" event. inventoryLedger.js
// layers these on top of its purchase/assignment-derived unit state, the
// same one-directional relationship assignmentStore.js already established
// (this store never imports inventoryLedger.js back). The link to the
// ticket is one-directional — a ticketNumber string snapshot, nothing is
// ever written back onto ticketsStore.js's own records.

import { logAudit } from './auditLogStore'

let _replacements = []
let _nextSeq = 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._replacements])) }

export function getReplacements() { return _replacements }

export function subscribeReplacements(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

// `unit` is the ledger's own unit row (identifies the physical item via
// productId + value); `ticketNumber` must already be a real, existing
// ticket id — the caller (InventoryOverview's Mark as Replaced form) is
// responsible for only ever passing one resolved from ticketsStore.js's own
// getTickets(), never free-typed text.
export function saveReplacement({ unit, ticketNumber, remarks }, actor = 'Admin User') {
  const replacement = {
    id: `RPL-${String(_nextSeq++).padStart(6, '0')}`,
    productId: unit.productId, value: unit.value, kind: unit.kind,
    ticketNumber, remarks: remarks?.trim() || null,
    replacedAt: new Date().toISOString(), replacedBy: actor,
  }
  _replacements = [replacement, ..._replacements]
  notify()
  logAudit({
    action: 'Edit', module: 'Inventory',
    details: `${unit.value} marked as Replaced against ticket ${ticketNumber}`,
  })
  return replacement
}

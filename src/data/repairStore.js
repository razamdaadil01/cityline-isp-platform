// Repair store — module-level pub/sub pattern (mirrors replacementStore.js).
// Tracks a serial/MAC-tracked unit sent back to its originating vendor for
// repair/service, for Vendor Detail's "Repairing Pending" tab. Same
// one-directional relationship as replacementStore.js: inventoryLedger.js
// layers these on top of its purchase/assignment-derived unit state, but
// this store never imports inventoryLedger.js back.
//
// saveRepair() below is the real write path — Assignments.jsx's "Send for
// Repair" action (Assign to Engineer's row menu) is the first real caller,
// following the exact same shape saveReplacement() (replacementStore.js)
// already established for "Mark as Replaced".

import { logAudit } from './auditLogStore'

export const REPAIR_STATUSES = ['Sent for Repair', 'In Service', 'Returned']

// value/productId reference real serials on PUR-000003 (VEN-001 / ZTE India
// Ltd's ONT Device receipt, purchaseStore.js) — that link is what lets
// Vendor Detail's serial click open the exact same getUnitTrail() history
// popup Inventory Overview itself uses for a unit.
const SEED = [
  {
    id: 'RPR-000001', productId: 'PRD-001', productName: 'ONT Device',
    value: 'ZTE-ONT-2026-0001', kind: 'serial',
    vendorId: 'VEN-001', vendorName: 'ZTE India Ltd',
    status: 'Sent for Repair', expectedDeliveryDate: '2026-09-05',
    sentAt: '2026-08-15T10:00:00.000Z', sentBy: 'Admin User',
    remarks: 'Reported dead-on-arrival by field engineer; sent back for warranty repair.',
    isWarrantyClaim: true, cost: null,
  },
  {
    id: 'RPR-000002', productId: 'PRD-001', productName: 'ONT Device',
    value: 'ZTE-ONT-2026-0002', kind: 'serial',
    vendorId: 'VEN-001', vendorName: 'ZTE India Ltd',
    status: 'In Service', expectedDeliveryDate: '2026-08-30',
    sentAt: '2026-08-10T10:00:00.000Z', sentBy: 'Admin User',
    remarks: 'Intermittent optical signal loss — vendor has acknowledged and begun diagnostics.',
    isWarrantyClaim: false, cost: 850,
  },
]

let _repairs = [...SEED]
let _nextSeq = SEED.length + 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._repairs])) }

export function getRepairs() { return _repairs }
export function getRepairsByVendor(vendorId) { return _repairs.filter(r => r.vendorId === vendorId) }

export function subscribeRepairs(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

// `value`/`kind` identify the physical unit the same way replacementStore.js's
// saveReplacement() does (a serial or MAC string, plus which one it is) —
// the caller (Assignments.jsx's "Send for Repair" action) resolves these
// from the assignment line's own serials/macs array, never free-typed.
// Always starts life as 'Sent for Repair' — 'In Service'/'Returned' are
// later, separate transitions this function doesn't make (no UI drives
// those yet either).
//
// `isWarrantyClaim`/`cost` — the caller computes isWarrantyClaim itself via
// inventoryLedger.js's isUnitWithinWarranty() (same pattern
// assetRepairStore.js's raiseRepairRequest() uses for isAssetWithinWarranty())
// and passes it straight through rather than this store re-deriving it, since
// deriving it here would need the unit object this store deliberately never
// reads (see file-level note above: this store never imports
// inventoryLedger.js back). cost is the entered Estimated Cost when it's a
// paid repair, or null when isWarrantyClaim is true — genuinely free, not
// just an unset field.
export function saveRepair({ productId, productName, value, kind, vendorId, vendorName, expectedDeliveryDate, remarks, isWarrantyClaim = false, cost = null }, actor = 'Admin User') {
  const repair = {
    id: `RPR-${String(_nextSeq++).padStart(6, '0')}`,
    productId, productName, value, kind,
    vendorId, vendorName,
    status: 'Sent for Repair', expectedDeliveryDate,
    sentAt: new Date().toISOString(), sentBy: actor,
    remarks: (remarks || '').trim(),
    isWarrantyClaim, cost: isWarrantyClaim ? null : cost,
  }
  _repairs = [repair, ..._repairs]
  notify()
  logAudit({
    action: 'Create', module: 'Inventory',
    details: `${value} (${productName}) sent for repair to ${vendorName}${isWarrantyClaim ? ' (warranty claim)' : ''}`,
  })
  return repair
}

// Vendor Management's list-level "In Repair" KPI card — count of units
// actually sitting with a vendor right now (status 'Sent for Repair')
// across every vendor's own Repairing Pending tab, not just one. 'In
// Service' (vendor has acknowledged and started work) and 'Returned' both
// mean the unit is no longer just sitting there awaiting action, so neither
// counts here — only the exact 'Sent for Repair' status does.
export function getInRepairCount() {
  return _repairs.filter(r => r.status === 'Sent for Repair').length
}

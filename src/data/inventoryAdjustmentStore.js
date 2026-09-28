// Repair/scrap adjustments from the Send for Repair/Scrap modal.
// Covers both qty-tracked products (batch quantity) and serial/MAC-tracked
// products (individual units identified by value+kind). inventoryLedger.js
// layers these on top of its computed state:
//   - qty-tracked: deducts from balanceByKey
//   - serialized: mutates each unit's status to 'Sent for Repair' or 'Scrapped'
// The store never imports inventoryLedger.js back (same one-directional
// relationship repairStore.js and scrapStore.js already follow).

import { logAudit } from './auditLogStore'

let _adjustments = []
let _nextSeq = 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._adjustments])) }

export function getAdjustments() { return _adjustments }

export function subscribeAdjustments(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

// `units` — [{value, kind}] for serial/MAC-tracked products (one entry per
// physical unit selected); null/omitted for qty-tracked products.
// `qty` — number of units (units.length for serialized, explicit for qty-based).
export function saveAdjustment({
  type, productId, productName, storeId, storeName, qty,
  units,
  issueDescription,
  scrapReason, remarks,
}, actor = 'Admin User') {
  const adj = {
    id: `ADJ-${String(_nextSeq++).padStart(6, '0')}`,
    type, productId, productName, storeId, storeName,
    qty: Number(qty),
    units: units ?? null,
    issueDescription: type === 'repair' ? (issueDescription || '').trim() : null,
    scrapReason: type === 'scrap' ? scrapReason : null,
    remarks: type === 'scrap' ? (remarks || '').trim() : null,
    createdAt: new Date().toISOString(),
    createdBy: actor,
  }
  _adjustments = [adj, ..._adjustments]
  notify()
  const serialList = adj.units?.length ? ` [${adj.units.map(u => u.value).join(', ')}]` : ''
  logAudit({
    action: type === 'repair' ? 'Sent for Repair' : 'Sent to Scrap',
    module: 'Inventory',
    details: type === 'repair'
      ? `${productName} × ${qty} at ${storeName}${adj.issueDescription ? ` — ${adj.issueDescription}` : ''}${serialList}`
      : `${productName} × ${qty} at ${storeName} — ${scrapReason}${adj.remarks ? ` (${adj.remarks})` : ''}${serialList}`,
  })
  return adj
}

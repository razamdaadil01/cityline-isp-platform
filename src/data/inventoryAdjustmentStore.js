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
//
// Warranty fields (repair only) — UI-only for now, saved as-is for a later
// backend mapping; they don't feed into any stock logic here.
// `warrantyStatus` — 'In Warranty' | 'Out of Warranty'.
// `chargeType` — 'Chargeable' | 'Non-chargeable', only meaningful In Warranty.
// `repairAt` — 'Vendor' | 'In-house' (always 'In-house' when Out of Warranty).
// `vendorId`/`vendorName` — set when repairAt is 'Vendor'.
// `engineerId`/`engineerName` — set when repairAt is 'In-house'.
// `inHouseReason` — optional, only kept when repairAt is 'In-house'.
export function saveAdjustment({
  type, productId, productName, storeId, storeName, qty,
  units,
  issueDescription,
  scrapReason, remarks,
  warrantyStatus, chargeType, repairAt, vendorId, vendorName, engineerId, engineerName, inHouseReason,
}, actor = 'Admin User') {
  const isRepair = type === 'repair'
  const effectiveRepairAt = isRepair ? (repairAt || null) : null
  const adj = {
    id: `ADJ-${String(_nextSeq++).padStart(6, '0')}`,
    type, productId, productName, storeId, storeName,
    qty: Number(qty),
    units: units ?? null,
    issueDescription: isRepair ? (issueDescription || '').trim() : null,
    scrapReason: type === 'scrap' ? scrapReason : null,
    remarks: type === 'scrap' ? (remarks || '').trim() : null,
    warrantyStatus: isRepair ? (warrantyStatus || null) : null,
    chargeType: isRepair && warrantyStatus === 'In Warranty' ? (chargeType || null) : null,
    repairAt: effectiveRepairAt,
    vendorId: effectiveRepairAt === 'Vendor' ? (vendorId || null) : null,
    vendorName: effectiveRepairAt === 'Vendor' ? (vendorName || null) : null,
    engineerId: effectiveRepairAt === 'In-house' ? (engineerId || null) : null,
    engineerName: effectiveRepairAt === 'In-house' ? (engineerName || null) : null,
    inHouseReason: effectiveRepairAt === 'In-house' ? ((inHouseReason || '').trim() || null) : null,
    createdAt: new Date().toISOString(),
    createdBy: actor,
  }
  _adjustments = [adj, ..._adjustments]
  notify()
  const serialList = adj.units?.length ? ` [${adj.units.map(u => u.value).join(', ')}]` : ''
  let details
  if (isRepair) {
    const warrantyParts = [adj.warrantyStatus, adj.chargeType].filter(Boolean).join(', ')
    const repairAtLabel = adj.repairAt === 'Vendor'
      ? `Vendor — ${adj.vendorName || 'unnamed vendor'}`
      : adj.repairAt === 'In-house'
        ? `In-house — ${adj.engineerName || 'unassigned engineer'}${adj.inHouseReason ? ` (${adj.inHouseReason})` : ''}`
        : null
    details = `${productName} × ${qty} at ${storeName}`
      + (warrantyParts ? ` — ${warrantyParts}` : '')
      + (repairAtLabel ? ` — ${repairAtLabel}` : '')
      + (adj.issueDescription ? ` — ${adj.issueDescription}` : '')
      + serialList
  } else {
    details = `${productName} × ${qty} at ${storeName} — ${scrapReason}${adj.remarks ? ` (${adj.remarks})` : ''}${serialList}`
  }
  logAudit({
    action: isRepair ? 'Sent for Repair' : 'Sent to Scrap',
    module: 'Inventory',
    details,
  })
  return adj
}

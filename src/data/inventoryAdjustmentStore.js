// Qty-based repair/scrap adjustments — records a batch quantity sent for
// repair or scrapped from a store, for products that are tracked by qty
// rather than individual serial/MAC (though the modal accepts any product).
// inventoryLedger.js layers these on top of its computed balanceByKey so
// Available Qty on Inventory Overview decreases immediately. The store never
// imports inventoryLedger.js back (same one-directional relationship
// repairStore.js and scrapStore.js already follow).

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

export function saveAdjustment({
  type, productId, productName, storeId, storeName, qty,
  repairType, vendorName, issueDescription, expectedReturnDate,
  scrapReason, remarks,
}, actor = 'Admin User') {
  const adj = {
    id: `ADJ-${String(_nextSeq++).padStart(6, '0')}`,
    type, productId, productName, storeId, storeName,
    qty: Number(qty),
    repairType: type === 'repair' ? repairType : null,
    vendorName: type === 'repair' && repairType === 'Vendor' ? (vendorName || '').trim() : null,
    issueDescription: type === 'repair' ? (issueDescription || '').trim() : null,
    expectedReturnDate: type === 'repair' ? (expectedReturnDate || null) : null,
    scrapReason: type === 'scrap' ? scrapReason : null,
    remarks: type === 'scrap' ? (remarks || '').trim() : null,
    createdAt: new Date().toISOString(),
    createdBy: actor,
  }
  _adjustments = [adj, ..._adjustments]
  notify()
  logAudit({
    action: type === 'repair' ? 'Sent for Repair' : 'Sent to Scrap',
    module: 'Inventory',
    details: type === 'repair'
      ? `${productName} × ${qty} at ${storeName} — ${repairType === 'Vendor' ? `vendor repair (${adj.vendorName})` : 'in-house repair'}${adj.issueDescription ? ` — ${adj.issueDescription}` : ''}`
      : `${productName} × ${qty} at ${storeName} — ${scrapReason}${adj.remarks ? ` (${adj.remarks})` : ''}`,
  })
  return adj
}

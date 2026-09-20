// POP Stock Transfer Request store — module-level pub/sub pattern (mirrors
// storeTransferStore.js/assignmentStore.js). PRD Phase 2 business rule:
// "Agar requested hardware POP-level stock me available nahi -> auto-raise
// Stock Transfer Request to central Inventory/Store Manager."
//
// This is deliberately its own store rather than folded into
// storeTransferStore.js's own Store Transfer record, even though both are
// "move stock" concepts — a Stock Transfer Request is an APPROVAL-gated
// ask ('Pending' -> 'Approved'/'Rejected' -> 'Fulfilled') raised
// automatically by a shortfall, initiated by a POP Work Order rather than
// an admin, and its "destination" is a POP (popStore.js), which has no
// storeId of its own to plug into storeFromId/storeToId. Store Transfer's
// own STORE_TRANSFER_STATUSES ('Completed'/'Sent'/'Reversed') model an
// already-decided shipment's physical Send -> Receive lifecycle between two
// real Stores — a different shape for a different thing, not a case of
// "reuse the existing model" fitting.
//
// What genuinely IS reused, per the PRD's own "reuse whatever real
// stock-movement mechanism already exists" instruction: fulfillStockTransferRequest()
// below calls storeTransferStore.js's real saveStoreTransfer()/
// receiveStoreTransfer() — the exact mechanism StoreTransfer.jsx itself
// uses — to actually replenish central stock from whichever other store
// currently holds the requested product, rather than inventing a second
// stock-movement math. (assignmentStore.js's saveAssignment() — the
// hardware-DEDUCTION mechanism workOrderStore.js's own Work Order
// resolution already calls against this same central store — is
// deliberately NOT reused here for fulfillment: calling it a second time
// at fulfillment would double-deduct the same quantity once the Work Order
// later resolves and deducts its confirmed Hardware Used again.)

import { logAudit } from './auditLogStore'
import { getStores } from './storeStore'
import { getProductAvailability } from './inventoryLedger'
import { saveStoreTransfer, receiveStoreTransfer } from './storeTransferStore'

export const STOCK_TRANSFER_REQUEST_STATUSES = ['Pending', 'Approved', 'Rejected', 'Fulfilled']

// Every POP Work Order's shortfall is raised against this one central
// store — same CENTRAL_STORE convention workOrderStore.js's own
// deductHardwareUsed() already established (STR-001, storeStore.js's
// seeded 'Main Warehouse') for the exact same "POPs have no store of their
// own, PRD frames this as central stock" reason.
const CENTRAL_STORE = { id: 'STR-001', name: 'Main Warehouse' }

let _nextSeq = 1

let _requests = []
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._requests])) }

export function getStockTransferRequests() { return _requests }
export function getStockTransferRequest(id) { return _requests.find(r => r.id === id) ?? null }
export function getStockTransferRequestsForWorkOrder(workOrderId) {
  return _requests.filter(r => r.workOrderId === workOrderId)
}

export function subscribeStockTransferRequests(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

// Called from workOrderStore.js's saveWorkOrder() whenever a Work Order is
// saved with a Hardware Need line whose requested quantity exceeds what's
// actually available at central stock — the exact same shortfall check
// POPWorkOrderDetail.jsx's own inline warning already computes
// (getProductAvailability(productId) < requested). Idempotent: skips
// raising a new request if an OPEN one (Pending or Approved — not yet
// Rejected/Fulfilled) already exists for this exact (workOrderId,
// productId) pair, so re-saving the same Work Order/editing an unrelated
// field never spams duplicate requests for the same shortfall. A request
// already Rejected or Fulfilled no longer counts as open, so a fresh
// shortfall on the same line (e.g. the requested quantity was raised again
// after a rejection) correctly raises a new one.
export function raiseStockTransferRequestIfNeeded({ popId, popName, workOrderId, productId, productName, requestedQty, availableQty }) {
  const alreadyOpen = _requests.some(r =>
    r.workOrderId === workOrderId && r.productId === productId && ['Pending', 'Approved'].includes(r.status)
  )
  if (alreadyOpen) return null

  const seq = _nextSeq++
  const year = new Date().getFullYear()
  const request = {
    id: `PSR-${String(seq).padStart(6, '0')}`,
    requestNumber: `PSR-${year}-${String(seq).padStart(6, '0')}`,
    popId, popName,
    workOrderId,
    productId, productName,
    requestedQty, availableQty,
    sourceStoreId: CENTRAL_STORE.id, sourceStoreName: CENTRAL_STORE.name,
    status: 'Pending',
    requestedAt: new Date().toISOString(),
    decidedAt: null, decidedBy: null,
    fulfilledAt: null, storeTransferId: null, notes: '',
  }
  _requests = [request, ..._requests]
  notify()
  logAudit({
    action: 'Create', module: 'Inventory',
    details: `Auto-raised Stock Transfer Request ${request.requestNumber} — ${productName} x${requestedQty} (${availableQty} available) for Work Order ${workOrderId}, POP ${popName}`,
  })
  return request
}

export function approveStockTransferRequest(id, actor = 'Admin User') {
  const r = getStockTransferRequest(id)
  if (!r) throw new Error('Request not found.')
  if (r.status !== 'Pending') throw new Error('Only a Pending request can be approved.')
  const updated = { ...r, status: 'Approved', decidedAt: new Date().toISOString(), decidedBy: actor }
  _requests = _requests.map(x => x.id === id ? updated : x)
  notify()
  logAudit({ action: 'Update', module: 'Inventory', details: `Approved Stock Transfer Request ${r.requestNumber}` })
  return updated
}

export function rejectStockTransferRequest(id, reason, actor = 'Admin User') {
  const r = getStockTransferRequest(id)
  if (!r) throw new Error('Request not found.')
  if (r.status !== 'Pending') throw new Error('Only a Pending request can be rejected.')
  const updated = { ...r, status: 'Rejected', decidedAt: new Date().toISOString(), decidedBy: actor, notes: reason?.trim() || '' }
  _requests = _requests.map(x => x.id === id ? updated : x)
  notify()
  logAudit({ action: 'Update', module: 'Inventory', details: `Rejected Stock Transfer Request ${r.requestNumber}${reason ? ' — ' + reason : ''}` })
  return updated
}

// The one action that actually moves real stock — reuses
// storeTransferStore.js's own saveStoreTransfer()/receiveStoreTransfer()
// (see this file's own top note for why, and why NOT assignmentStore.js's
// saveAssignment()). Finds whichever other active store currently holds
// the most of the requested product, moves enough to cover the shortfall
// still outstanding at central stock (re-checked live, in case a Purchase
// receipt already closed some or all of the gap since the request was
// raised), and immediately receives it — a Store Manager fulfilling a POP
// request is one administrative action here, not a multi-day physical
// shipment, so there's no separate pending leg the PRD never asked for.
export function fulfillStockTransferRequest(id, actor = 'Admin User') {
  const r = getStockTransferRequest(id)
  if (!r) throw new Error('Request not found.')
  if (r.status !== 'Approved') throw new Error('Only an Approved request can be fulfilled.')

  const shortfall = Math.max(0, r.requestedQty - getProductAvailability(r.productId, r.sourceStoreId))
  if (shortfall <= 0) {
    const updated = { ...r, status: 'Fulfilled', fulfilledAt: new Date().toISOString(), storeTransferId: null }
    _requests = _requests.map(x => x.id === id ? updated : x)
    notify()
    logAudit({ action: 'Update', module: 'Inventory', details: `Fulfilled Stock Transfer Request ${r.requestNumber} — central stock already sufficient, no transfer needed` })
    return updated
  }

  const bestSource = getStores()
    .filter(s => s.id !== r.sourceStoreId && s.status === 'active')
    .map(store => ({ store, available: getProductAvailability(r.productId, store.id) }))
    .filter(x => x.available > 0)
    .sort((a, b) => b.available - a.available)[0]

  if (!bestSource) {
    throw new Error(`No other store currently holds any ${r.productName} to fulfill this request from.`)
  }

  const moveQty = Math.min(shortfall, bestSource.available)
  const transfer = saveStoreTransfer({
    storeFromId: bestSource.store.id, storeFromName: bestSource.store.storeName,
    storeToId: r.sourceStoreId, storeToName: r.sourceStoreName,
    items: [{
      productId: r.productId, productName: r.productName,
      serials: [], macs: [], qty: moveQty, drumNumber: null,
      remark: `Fulfilling ${r.requestNumber} for Work Order ${r.workOrderId}`,
    }],
    reason: `Stock Transfer Request ${r.requestNumber} — POP ${r.popName}, Work Order ${r.workOrderId}`,
  }, actor)
  receiveStoreTransfer(transfer.id, { receivedBy: actor })

  const updated = { ...r, status: 'Fulfilled', fulfilledAt: new Date().toISOString(), storeTransferId: transfer.id }
  _requests = _requests.map(x => x.id === id ? updated : x)
  notify()
  logAudit({
    action: 'Update', module: 'Inventory',
    details: `Fulfilled Stock Transfer Request ${r.requestNumber} — moved ${moveQty} × ${r.productName} from ${bestSource.store.storeName} to ${r.sourceStoreName} (${transfer.transferNumber})`,
  })
  return updated
}

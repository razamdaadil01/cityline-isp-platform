// Store Transfer store — module-level pub/sub pattern (mirrors
// assignmentStore.js/userAssignmentStore.js). Records serial/MAC-tracked
// units and quantity-tracked stock moved directly between two stores, with
// no engineer or Work Order involved — distinct from Assign to Engineer
// (store → engineer) and Assign to User (engineer → customer). Transfers
// are instantaneous in v1: no in-transit state, status is always
// 'Completed' the moment a transfer is saved.
//
// Architecture note on validation depth — this is intentionally lighter
// than assignmentStore.js's/userAssignmentStore.js's own save-time
// re-validation, and that's a deliberate tradeoff, not an oversight:
// "is this unit still really available at Store X right now" is the output
// of inventoryLedger.js's ENTIRE purchases → assignments → user
// assignments → replacements pipeline, not a single upstream store the way
// assignmentStore.js only needs purchaseStore.js's raw receipts, or
// userAssignmentStore.js only needs assignmentStore.js's raw assignments.
// Re-deriving that whole pipeline independently here (the only way to avoid
// importing inventoryLedger.js back, which would be circular — see its own
// file-level note) would mean duplicating computeLedger() almost entirely,
// a maintenance trap where every future ledger change needs mirroring
// twice. Instead this store only guards its own internal self-consistency
// (no serial/MAC transferred twice across different transfer records,
// storeFrom/storeTo actually differ) and trusts the caller for point-in-time
// availability — the same trust boundary already implicit in every other
// wizard here, since CreateStoreTransfer.jsx's picker is itself built
// straight from inventoryLedger.js's live getUnits()/getProductAvailability().
// inventoryLedger.js's own layering of transfers additionally re-checks
// unit.status === 'Available' before applying one, as a last defensive line.

import { logAudit } from './auditLogStore'

export const STORE_TRANSFER_STATUSES = ['Completed']

let _storeTransfers = []
let _nextSeq = 1
let _nextInternalSeq = 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._storeTransfers])) }

export function getStoreTransfers() { return _storeTransfers }
export function getStoreTransfer(id) { return _storeTransfers.find(t => t.id === id) ?? null }

export function subscribeStoreTransfers(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

function nextTransferNumber() {
  const year = new Date().getFullYear()
  return `TRF-${year}-${String(_nextSeq++).padStart(6, '0')}`
}

function alreadyTransferredValues() {
  const set = new Set()
  _storeTransfers.forEach(t => t.items.forEach(it => { it.serials.forEach(s => set.add(s)); it.macs.forEach(m => set.add(m)) }))
  return set
}

// data: { storeFromId, storeFromName, storeToId, storeToName,
//         items: [{ productId, productName, serials, macs, qty }] }
export function saveStoreTransfer(data, actor = 'Admin User') {
  if (!data.storeFromId || !data.storeToId) {
    throw new Error('Select both a Store From and a Store To.')
  }
  if (data.storeFromId === data.storeToId) {
    throw new Error('Store From and Store To must be different stores.')
  }

  const alreadyTransferred = alreadyTransferredValues()
  const items = (data.items || [])
    .filter(it => (it.serials?.length) || (it.macs?.length) || (Number(it.qty) || 0) > 0)
    .map(it => {
      const serials = it.serials ?? []
      const macs = it.macs ?? []
      const values = [...serials, ...macs]
      values.forEach(v => {
        if (alreadyTransferred.has(v)) throw new Error(`${v} has already been transferred in another record.`)
      })
      return {
        productId: it.productId, productName: it.productName,
        serials, macs, qty: values.length || Number(it.qty) || 0,
      }
    })

  if (items.length === 0) {
    throw new Error('Select at least one item to transfer.')
  }

  const transfer = {
    id: `STF-${String(_nextInternalSeq++).padStart(6, '0')}`,
    transferNumber: nextTransferNumber(),
    date: new Date().toISOString(),
    storeFromId: data.storeFromId, storeFromName: data.storeFromName,
    storeToId: data.storeToId, storeToName: data.storeToName,
    items,
    assignedBy: actor,
    status: 'Completed',
  }
  _storeTransfers = [transfer, ..._storeTransfers]
  notify()

  const itemCount = items.reduce((s, it) => s + it.qty, 0)
  logAudit({
    action: 'Create', module: 'Inventory',
    details: `Transferred ${itemCount} item(s) from ${data.storeFromName} to ${data.storeToName} (${transfer.transferNumber})`,
  })

  return transfer
}

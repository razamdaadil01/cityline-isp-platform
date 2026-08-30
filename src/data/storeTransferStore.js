// Store Transfer store — module-level pub/sub pattern (mirrors
// assignmentStore.js/userAssignmentStore.js). Records serial/MAC-tracked
// units, quantity-tracked stock, and wire drum meters moved directly
// between two stores, with no engineer or Work Order involved — distinct
// from Assign to Engineer (store → engineer) and Assign to User
// (engineer → customer). Transfers are instantaneous in v1: no in-transit
// state, status is 'Completed' the moment a transfer is saved, and moves to
// 'Reversed' only once every one of its lines has been reversed (see
// reverseStoreTransferLine below) — there is still no in-between/approval
// state.
//
// Architecture note on validation depth — this is intentionally lighter
// than assignmentStore.js's/userAssignmentStore.js's own save-time
// re-validation, and that's a deliberate tradeoff, not an oversight:
// "is this unit still really available at Store X right now" is the output
// of inventoryLedger.js's ENTIRE purchases → assignments → user
// assignments → replacements → transfers pipeline, not a single upstream
// store the way assignmentStore.js only needs purchaseStore.js's raw
// receipts, or userAssignmentStore.js only needs assignmentStore.js's raw
// assignments. Re-deriving that whole pipeline independently here (the only
// way to avoid importing inventoryLedger.js back, which would be circular —
// see its own file-level note) would mean duplicating computeLedger()
// almost entirely, a maintenance trap where every future ledger change
// needs mirroring twice. Instead this store only guards its own internal
// self-consistency (no serial/MAC transferred twice across different
// transfer records, storeFrom/storeTo actually differ) and trusts the
// caller for point-in-time availability — the same trust boundary already
// implicit in every other wizard here, since CreateStoreTransfer.jsx's
// picker is itself built straight from inventoryLedger.js's live
// getUnits()/getProductAvailability()/getDrums(). inventoryLedger.js's own
// layering of transfers additionally re-checks unit.status === 'Available'
// before applying one, as a last defensive line.

import { logAudit } from './auditLogStore'

export const STORE_TRANSFER_STATUSES = ['Completed', 'Reversed']

// ── Seed data — so the Store Transfer list isn't empty on first load, and
// so the Serial/MAC/Drum + Qty columns have a real example of all three
// tracking types to display. Every line below moves stock that's actually
// available at its Store From once purchaseStore.js's Confirmed receipts
// and assignmentStore.js's own seeded deductions are netted out — checked
// by hand against those two files' SEEDs:
//   Main Warehouse (STR-001): Wall Mount Bracket 50 received − 2 already
//     assigned (ASG-000002/000003) = 48 available; Patch Cord 80 − 10
//     (ASG-000004) = 70 available (untouched here).
//   Andheri Store (STR-002): ONT Device serials 0001-0003 are already
//     'Assigned to User' (ASG-000001/5/6 + USRA-000001/2/3) — only
//     0004-0008 are still 'Available'; Wall Mount Bracket 10 − 1
//     (ASG-000001) = 9 available (untouched here); WiFi Router 10
//     available (untouched by any assignment); Drop Wire drum DR-00871
//     500m − 30m (ASG-000001) = 470m remaining.
// None of the serials/drum used below (0004, 0005, DR-00871) are
// referenced by any other seeded record (replacementStore.js/repairStore.js
// have none), and no serial is reused across two of these transfers — the
// same dedup guard saveStoreTransfer() enforces at save time. Bandra Store
// (STR-003) has no purchases of its own in the seed data, so it only ever
// appears as a Store To below, never a Store From.
const SEED = [
  {
    id: 'STF-000001', transferNumber: 'TRF-2026-000001',
    date: '2026-08-18T10:00:00.000Z',
    storeFromId: 'STR-001', storeFromName: 'Main Warehouse',
    storeToId: 'STR-002', storeToName: 'Andheri Store',
    items: [
      { id: 'STFI-1-0', productId: 'PRD-003', productName: 'Wall Mount Bracket', serials: [], macs: [], qty: 5, drumNumber: null, remark: '' },
    ],
    reason: 'Rebalancing stock ahead of installation drive',
    assignedBy: 'Admin User',
    status: 'Completed',
  },
  {
    id: 'STF-000002', transferNumber: 'TRF-2026-000002',
    date: '2026-08-19T11:30:00.000Z',
    storeFromId: 'STR-002', storeFromName: 'Andheri Store',
    storeToId: 'STR-003', storeToName: 'Bandra Store',
    items: [
      { id: 'STFI-2-0', productId: 'PRD-001', productName: 'ONT Device', serials: ['ZTE-ONT-2026-0004'], macs: [], qty: 1, drumNumber: null, remark: 'For Bandra branch launch stock' },
    ],
    reason: '',
    assignedBy: 'Admin User',
    status: 'Completed',
  },
  {
    id: 'STF-000003', transferNumber: 'TRF-2026-000003',
    date: '2026-08-20T09:15:00.000Z',
    storeFromId: 'STR-002', storeFromName: 'Andheri Store',
    storeToId: 'STR-001', storeToName: 'Main Warehouse',
    items: [
      { id: 'STFI-3-0', productId: 'PRD-010', productName: 'Drop Wire', serials: [], macs: [], qty: 100, drumNumber: 'DR-00871', remark: '' },
    ],
    reason: '',
    assignedBy: 'Admin User',
    status: 'Completed',
  },
  {
    id: 'STF-000004', transferNumber: 'TRF-2026-000004',
    date: '2026-08-24T14:00:00.000Z',
    storeFromId: 'STR-002', storeFromName: 'Andheri Store',
    storeToId: 'STR-003', storeToName: 'Bandra Store',
    items: [
      { id: 'STFI-4-0', productId: 'PRD-002', productName: 'WiFi Router', serials: [], macs: [], qty: 3, drumNumber: null, remark: '' },
    ],
    reason: 'Bandra Store opening — initial stock allocation',
    assignedBy: 'Admin User',
    status: 'Completed',
  },
  {
    id: 'STF-000005', transferNumber: 'TRF-2026-000005',
    date: '2026-08-26T16:45:00.000Z',
    storeFromId: 'STR-002', storeFromName: 'Andheri Store',
    storeToId: 'STR-001', storeToName: 'Main Warehouse',
    items: [
      { id: 'STFI-5-0', productId: 'PRD-001', productName: 'ONT Device', serials: ['ZTE-ONT-2026-0005'], macs: [], qty: 1, drumNumber: null, remark: '' },
    ],
    reason: '',
    assignedBy: 'Admin User',
    status: 'Completed',
  },
]

let _storeTransfers = [...SEED]
let _nextSeq = SEED.length + 1
let _nextInternalSeq = SEED.length + 1
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

// `excludeId` — updateStoreTransfer()'s own edit-mode pass, leaving one
// specific transfer's own already-recorded serials/macs out of the "already
// transferred elsewhere" tally, so editing it sees its own picks as still
// available to keep, drop, or change — same idea as assignmentStore.js's
// alreadyAssignedValues(excludeId).
function alreadyTransferredValues(excludeId = null) {
  const set = new Set()
  _storeTransfers.forEach(t => {
    if (t.id === excludeId) return
    t.items.forEach(it => { it.serials.forEach(s => set.add(s)); it.macs.forEach(m => set.add(m)) })
  })
  return set
}

// Shared by saveStoreTransfer()/updateStoreTransfer() below. `seq` seeds
// each item's own STFI-* id (freshly minted on every save/update — nothing
// keys off an item id surviving an edit today, same as
// assignmentStore.js's own hardwareLine/wireLine ids). `excludeId`, only
// ever the transfer's own id from updateStoreTransfer(), keeps its own
// prior items out of the dedup tally (see alreadyTransferredValues above).
function validateAndBuildItems(data, seq, excludeId = null) {
  if (!data.storeFromId || !data.storeToId) {
    throw new Error('Select both a Store From and a Store To.')
  }
  if (data.storeFromId === data.storeToId) {
    throw new Error('Store From and Store To must be different stores.')
  }

  const alreadyTransferred = alreadyTransferredValues(excludeId)
  const items = (data.items || [])
    .filter(it => (it.serials?.length) || (it.macs?.length) || (Number(it.qty) || 0) > 0)
    .map((it, idx) => {
      const serials = it.serials ?? []
      const macs = it.macs ?? []
      const values = [...serials, ...macs]
      values.forEach(v => {
        if (alreadyTransferred.has(v)) throw new Error(`${v} has already been transferred in another record.`)
      })
      return {
        id: `STFI-${seq}-${idx}`,
        productId: it.productId, productName: it.productName,
        serials, macs, qty: values.length || Number(it.qty) || 0,
        // Wire lines only — which held drum at Store From this line's
        // meters were cut from; null for hardware/quantity lines.
        drumNumber: it.drumNumber || null,
        remark: it.remark?.trim() || '',
      }
    })

  if (items.length === 0) {
    throw new Error('Select at least one item to transfer.')
  }

  return items
}

// data: { storeFromId, storeFromName, storeToId, storeToName,
//         items: [{ productId, productName, serials, macs, qty, drumNumber, remark }],
//         reason }
// `reason` is an optional free-text "Reason for Transfer", captured once per
// transfer (not per line) — same idea as the whole-assignment `remarks` on
// assignmentStore.js/userAssignmentStore.js's own records.
export function saveStoreTransfer(data, actor = 'Admin User') {
  const seq = _nextInternalSeq++
  const items = validateAndBuildItems(data, seq)

  const transfer = {
    id: `STF-${String(seq).padStart(6, '0')}`,
    transferNumber: nextTransferNumber(),
    date: new Date().toISOString(),
    storeFromId: data.storeFromId, storeFromName: data.storeFromName,
    storeToId: data.storeToId, storeToName: data.storeToName,
    items,
    reason: (data.reason || '').trim(),
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

// Edits an existing transfer in place — same `data` shape and validation as
// saveStoreTransfer(), with the transfer's own prior items excluded from the
// dedup tally (see validateAndBuildItems()'s note). Keeps the original
// id/transferNumber/date/assignedBy — those describe when and by whom the
// transfer was first made, which editing its contents doesn't rewrite; the
// audit log entry below is the record of the edit itself. A transfer that's
// already fully 'Reversed' can't be edited back to life through this path —
// start a new transfer instead.
export function updateStoreTransfer(id, data) {
  const existing = _storeTransfers.find(t => t.id === id)
  if (!existing) throw new Error('Transfer not found.')
  if (existing.status === 'Reversed') throw new Error('This transfer has already been reversed and can no longer be edited.')

  const seq = _nextInternalSeq++
  const items = validateAndBuildItems(data, seq, id)

  const updated = {
    ...existing,
    storeFromId: data.storeFromId, storeFromName: data.storeFromName,
    storeToId: data.storeToId, storeToName: data.storeToName,
    items,
    reason: (data.reason || '').trim(),
  }
  _storeTransfers = _storeTransfers.map(t => t.id === id ? updated : t)
  notify()

  logAudit({
    action: 'Update', module: 'Inventory',
    details: `Edited transfer ${existing.transferNumber} (${data.storeFromName} → ${data.storeToName})`,
  })

  return updated
}

// ── Reverse one line back to Store From ─────────────────────────────────
// Reverses a single transferred item — its serial/MAC unit(s), quantity, or
// drum meters move back to Store From simply by removing the item from this
// transfer's own `items` array, the exact same "the line is gone, so
// whatever it claimed reverts automatically" mechanism
// assignmentStore.js's returnAssignmentLine() uses: inventoryLedger.js's
// computeLedger() derives every unit's storeId, balance deduction, and
// drum's remaining meters purely from CURRENT non-reversed transfers' item
// contents (see its own Store Transfers block), so once an item is gone,
// whatever it moved reverts to sitting at Store From with no separate
// ledger write needed — including freeing its serial/MAC values back up for
// a future transfer (alreadyTransferredValues() only ever looks at
// `_storeTransfers` directly). If removing this item empties the transfer
// entirely, the transfer's own `status` flips to 'Reversed' — never left
// dangling as 'Completed' with an empty item list. `itemId` is the item's
// own `id` (e.g. 'STFI-1-0').
export function reverseStoreTransferLine(transferId, itemId, actor = 'Admin User') {
  const transfer = _storeTransfers.find(t => t.id === transferId)
  if (!transfer) throw new Error('Transfer not found.')
  if (transfer.status === 'Reversed') throw new Error('This transfer has already been reversed.')

  const item = transfer.items.find(it => it.id === itemId)
  if (!item) throw new Error('Line not found on this transfer.')

  const items = transfer.items.filter(it => it.id !== itemId)
  const nowEmpty = items.length === 0

  const updated = { ...transfer, items, status: nowEmpty ? 'Reversed' : transfer.status }
  _storeTransfers = _storeTransfers.map(t => t.id === transferId ? updated : t)
  notify()

  const qtyLabel = item.drumNumber
    ? `${item.qty}m of ${item.productName} (Drum ${item.drumNumber})`
    : `${item.qty} of ${item.productName}`
  logAudit({
    action: 'Update', module: 'Inventory',
    details: `Reversed ${qtyLabel} — moved back from ${transfer.storeToName} to ${transfer.storeFromName} (${transfer.transferNumber})${nowEmpty ? ' — transfer fully reversed' : ''}`,
  })

  return updated
}

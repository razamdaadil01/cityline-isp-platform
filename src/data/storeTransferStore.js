// Store Transfer store — module-level pub/sub pattern (mirrors
// assignmentStore.js/userAssignmentStore.js). Records serial/MAC-tracked
// units, quantity-tracked stock, and wire drum meters moved directly
// between two stores, with no engineer or Work Order involved — distinct
// from Assign to Engineer (store → engineer) and Assign to User
// (engineer → customer).
//
// A transfer is instantaneous ('Completed' the moment it's saved) only
// when Store From and Store To share the same city — see storeStore.js's
// own city field, compared via sameCity() below. A cross-city transfer
// instead lands on 'Sent': the source side has already left (see
// inventoryLedger.js's own Store Transfers block for exactly what that
// does/doesn't move immediately), but the destination side doesn't apply
// until receiveStoreTransfer() below is called — modeling the real gap
// between a courier picking up goods and someone physically signing for
// them on arrival, including uploading a photo/scan of that signed challan
// as proof (see receiveStoreTransfer()'s own note). Either way, a transfer
// moves to 'Reversed' only once every one of its lines has been reversed
// (see reverseStoreTransferLine below) — there is still no
// approval/rejection state, and a 'Sent' transfer reverses exactly the
// same way a 'Completed' one does (see that function's own note).
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
import { createDeliveryChallanForTransfer } from './deliveryChallanStore'
import { getStore } from './storeStore'

export const STORE_TRANSFER_STATUSES = ['Completed', 'Sent', 'Reversed']

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
//     'Assigned to User' (ASG-000001/5/6 + USRA-000001/2/3), 0006 is
//     'Assigned to Engineer' (ASG-000010) — only 0004, 0005, 0007 are used
//     below (0008 stays free); Wall Mount Bracket 10 − 1 (ASG-000001) = 9
//     available (untouched here); WiFi Router 10 available (untouched by
//     any assignment); Drop Wire drum DR-00871 500m − 30m (ASG-000001) =
//     470m remaining.
// None of the serials/drum used below (0004, 0005, 0007, DR-00871) are
// referenced by any other seeded record (replacementStore.js/repairStore.js
// have none), and no serial is reused across two of these transfers — the
// same dedup guard saveStoreTransfer() enforces at save time. Bandra Store
// (STR-003) and Noida Store (STR-004) have no purchases of their own in the
// seed data, so they only ever appear as a Store To below, never a Store
// From. STF-000006 (Andheri → Noida, both real Mumbai/Noida cities per
// storeStore.js) is the one cross-city, still-'Sent' line — everything else
// here is same-city and 'Completed', matching how saveStoreTransfer()
// itself would route each of these today.
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
  {
    // Cross-city, still in transit — Andheri Store (Mumbai) → Noida Store
    // (Noida), a different city per storeStore.js, so saveStoreTransfer()
    // would route this as 'Sent' rather than 'Completed' today. Seeded
    // directly at 'Sent' (rather than via saveStoreTransfer()) so the Store
    // Transfer list has a real example on first load to exercise the
    // "Receive Transfer" action against: inventoryLedger.js's Store
    // Transfers block (see that file) reads this same `status` generically,
    // so ZTE-ONT-2026-0007 already shows as deducted from Andheri Store and
    // sitting at unit.status 'In Transit' — not yet 'Available' at Noida —
    // exactly as it would for a freshly-saved cross-city transfer.
    // receivedAt/receivedBy stay null until someone calls
    // receiveStoreTransfer() on this record.
    id: 'STF-000006', transferNumber: 'TRF-2026-000006',
    date: '2026-09-11T09:30:00.000Z',
    storeFromId: 'STR-002', storeFromName: 'Andheri Store',
    storeToId: 'STR-004', storeToName: 'Noida Store',
    items: [
      { id: 'STFI-6-0', productId: 'PRD-001', productName: 'ONT Device', serials: ['ZTE-ONT-2026-0007'], macs: [], qty: 1, drumNumber: null, remark: 'Noida branch launch stock' },
    ],
    reason: 'Noida Store opening — initial stock allocation',
    assignedBy: 'Admin User',
    status: 'Sent',
    sentAt: '2026-09-11T09:30:00.000Z',
    receivedAt: null,
    receivedBy: null,
  },
]

// sentAt/receivedAt/receivedBy/signedChallanUpload default onto every seed
// transfer here (same "defaults spread first" pattern used throughout this
// app's other seed reconciliations, e.g. assetStore.js) rather than
// repeating all four on every SEED literal above — every one of the 5
// seeded transfers already reads as historically 'Completed' regardless of
// what the new same-city/cross-city split would decide for it today (some
// span what are now different cities — see storeStore.js's own city
// field), which is fine: they represent transfers that already fully
// happened, receive step included, before this feature existed.
let _storeTransfers = SEED.map(t => ({ sentAt: null, receivedAt: null, receivedBy: null, signedChallanUpload: null, ...t }))
let _nextSeq = SEED.length + 1
let _nextInternalSeq = SEED.length + 1
const _listeners = []

// The 5 seeded transfers above were never routed through saveStoreTransfer()
// (they're literal records, not the result of calling it), so they'd
// otherwise have no linked Delivery Challan despite saveStoreTransfer()
// always generating one — reconciled here at module load, same "seed then
// reconcile" pattern purchaseStore.js uses to backfill its own seeded POs'
// receipt status.
SEED.forEach(t => createDeliveryChallanForTransfer(t))

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
//
// Same-city vs. cross-city routing — a literal, case-insensitive compare of
// each store's own `city` field (storeStore.js). Two stores that both have
// no city set compare equal (both ''), so transfers stay instant by default
// until stores are actually given real cities — never a surprise downgrade
// to a 'Sent' state for existing data.
function sameCity(storeFromId, storeToId) {
  const from = (getStore(storeFromId)?.city || '').trim().toLowerCase()
  const to = (getStore(storeToId)?.city || '').trim().toLowerCase()
  return from === to
}

export function saveStoreTransfer(data, actor = 'Admin User') {
  const seq = _nextInternalSeq++
  const items = validateAndBuildItems(data, seq)

  const isSameCity = sameCity(data.storeFromId, data.storeToId)
  const date = new Date().toISOString()

  const transfer = {
    id: `STF-${String(seq).padStart(6, '0')}`,
    transferNumber: nextTransferNumber(),
    date,
    storeFromId: data.storeFromId, storeFromName: data.storeFromName,
    storeToId: data.storeToId, storeToName: data.storeToName,
    items,
    reason: (data.reason || '').trim(),
    assignedBy: actor,
    status: isSameCity ? 'Completed' : 'Sent',
    sentAt: isSameCity ? null : date,
    receivedAt: null,
    receivedBy: null,
    signedChallanUpload: null,
  }
  _storeTransfers = [transfer, ..._storeTransfers]
  notify()

  // GST Rule 55 (India) requires a Delivery Challan to accompany a
  // non-sale movement of goods like this — auto-generated here as a direct
  // side effect of saving the transfer (whether it lands 'Completed' or
  // 'Sent'; the challan is paper evidence the shipment left Store From,
  // which is true the moment it's saved either way), so no separate user
  // action creates the record itself (see deliveryChallanStore.js for the
  // document's own shape and its own note on why editing/reversing this
  // transfer later doesn't regenerate it). The signed copy of THIS same
  // document, uploaded once the receiver actually signs for it, is a
  // separate artifact entirely (see receiveStoreTransfer()'s own
  // signedChallanUpload note below).
  createDeliveryChallanForTransfer(transfer)

  const itemCount = items.reduce((s, it) => s + it.qty, 0)
  logAudit({
    action: 'Create', module: 'Inventory',
    details: `${isSameCity ? 'Transferred' : 'Sent'} ${itemCount} item(s) from ${data.storeFromName} to ${data.storeToName} (${transfer.transferNumber})`,
  })

  return transfer
}

// ── Receive a Sent transfer at Store To ─────────────────────────────────
// Confirms a cross-city shipment has physically arrived — flips status
// 'Sent' → 'Completed'. inventoryLedger.js's Store Transfers block (see
// that file) had been withholding the destination-side stock effect
// (unit.storeId move / destination drum / balance credit) while status was
// 'Sent'; once it's 'Completed' that effect applies exactly as it already
// does for a same-city transfer. A same-city transfer never becomes 'Sent'
// in the first place (see sameCity()/saveStoreTransfer() above), so this is
// only ever meaningful for a cross-city one.
//
// `signedChallanFile`, when provided, is already the converted
// { name, size, type, preview } object — the FileReader.readAsDataURL()
// conversion itself happens in the UI layer (StoreTransfer.jsx's Receive
// Transfer modal), the exact same split SalesNewLead.jsx's
// ProfilePictureUpload already uses (its own onChange handler does the
// conversion; the caller just holds/passes along the resulting plain
// object) — this store, like every other one in this app, stays
// synchronous throughout, never awaiting a FileReader callback itself.
// Stored directly on this Store Transfer record (signedChallanUpload),
// never on deliveryChallanStore.js's own record — that store is an
// immutable point-in-time snapshot of what was DISPATCHED (see its own
// file-level note) and is deliberately never written to again after
// creation; the signed, physically-received copy is a distinct artifact
// that belongs with the transfer's own receipt event instead.
export function receiveStoreTransfer(transferId, { receivedBy = 'Admin User', signedChallanFile = null } = {}) {
  const transfer = _storeTransfers.find(t => t.id === transferId)
  if (!transfer) throw new Error('Transfer not found.')
  if (transfer.status !== 'Sent') throw new Error('Only a transfer that has been Sent can be received.')

  const updated = {
    ...transfer,
    status: 'Completed',
    receivedAt: new Date().toISOString(),
    receivedBy,
    signedChallanUpload: signedChallanFile
      ? { name: signedChallanFile.name, size: signedChallanFile.size, type: signedChallanFile.type, preview: signedChallanFile.preview }
      : transfer.signedChallanUpload,
  }
  _storeTransfers = _storeTransfers.map(t => t.id === transferId ? updated : t)
  notify()

  logAudit({
    action: 'Update', module: 'Inventory',
    details: `Received transfer ${transfer.transferNumber} at ${transfer.storeToName}${signedChallanFile ? ' — signed challan uploaded' : ''}`,
  })

  return updated
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

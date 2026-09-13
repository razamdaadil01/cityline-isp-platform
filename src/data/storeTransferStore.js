// Store Transfer store — module-level pub/sub pattern (mirrors
// assignmentStore.js/userAssignmentStore.js). Records serial/MAC-tracked
// units, quantity-tracked stock, and wire drum meters moved directly
// between two stores, with no engineer or Work Order involved — distinct
// from Assign to Engineer (store → engineer) and Assign to User
// (engineer → customer).
//
// Every transfer — same-city or cross-city alike — goes through the same
// Send → Receive lifecycle: saving one always lands it on 'Sent' with a
// sentAt timestamp. The source side has already left (see
// inventoryLedger.js's own Store Transfers block for exactly what that
// does/doesn't move immediately), but the destination side doesn't apply
// until receiveStoreTransfer() below is called — modeling the real gap
// between a courier picking up goods and someone physically signing for
// them on arrival, including uploading a photo/scan of that signed challan
// as proof (see receiveStoreTransfer()'s own note). There is no more
// instant/"Completed on save" path — receiveStoreTransfer() is the only
// way any transfer reaches 'Completed', regardless of distance; storeStore.js's
// own `city` field is still carried for display and for the Delivery
// Challan's placeOfSupply, it just no longer decides the status path here.
// Either way, a transfer moves to 'Reversed' only once every one of its
// lines has been reversed (see reverseStoreTransferLine below) — there is
// still no approval/rejection state, and a 'Sent' transfer reverses exactly
// the same way a 'Completed' one does (see that function's own note).
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
// None of the serials/drum used below (0004, 0005, 0007, 0008, DR-00871)
// are referenced by any other seeded record (replacementStore.js/
// repairStore.js have none), and no serial is reused across two of these
// transfers — the same dedup guard saveStoreTransfer() enforces at save
// time (a reversed line's own serial/drum is fair game for reuse, since
// alreadyTransferredValues() only ever scans `items`, never
// `reversedItems` — see reverseStoreTransferLine()'s own note). Bandra
// Store (STR-003) and Noida Store (STR-004) have no purchases of their own
// in the seed data, so they only ever appear as a Store To below, never a
// Store From. STF-000001..005 are historical records seeded directly as
// already 'Completed' — they pre-date this feature's Send → Receive split
// entirely (see this file's own file-level note). STF-000006..000008
// instead demonstrate the current, universal lifecycle every transfer now
// goes through regardless of city: one cross-city 'Sent' still awaiting
// receipt (STF-000006), one same-city 'Sent' still awaiting receipt
// (STF-000007), and one cross-city already-'Completed' transfer
// (STF-000008) — so every same-city/cross-city × Sent/Completed
// combination has a real example on first load. STF-000009 rounds this
// out with a fully-'Reversed' transfer, its one line already sitting in
// reversedItems rather than items, so StoreTransfer.jsx's "Reversed" row
// styling has a stable seed example too (see that record's own note).
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
    // (Noida). Seeded directly at 'Sent' (rather than via
    // saveStoreTransfer()) so the Store Transfer list has a real example
    // on first load to exercise the "Receive Transfer" action against:
    // inventoryLedger.js's Store Transfers block (see that file) reads
    // this same `status` generically, so ZTE-ONT-2026-0007 already shows
    // as deducted from Andheri Store and sitting at unit.status
    // 'In Transit' — not yet 'Available' at Noida — exactly as it would
    // for any freshly-saved transfer today, cross-city or not (see this
    // file's own file-level note). receivedAt/receivedBy stay null until
    // someone calls receiveStoreTransfer() on this record.
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
  {
    // Same-city, still in transit — Main Warehouse (Mumbai) → Bandra Store
    // (Mumbai), the exact same city, yet still lands on 'Sent' just like
    // STF-000006's cross-city one: saveStoreTransfer() no longer branches
    // on city at all (see this file's own file-level note), so a same-city
    // transfer now waits on receiveStoreTransfer() too. Wall Mount Bracket
    // has 43 left at Main Warehouse after STF-000001 already moved 5 of
    // the original 48 available (see the hand-checked math above), so this
    // 4-unit line is comfortably within bounds.
    id: 'STF-000007', transferNumber: 'TRF-2026-000007',
    date: '2026-09-12T10:00:00.000Z',
    storeFromId: 'STR-001', storeFromName: 'Main Warehouse',
    storeToId: 'STR-003', storeToName: 'Bandra Store',
    items: [
      { id: 'STFI-7-0', productId: 'PRD-003', productName: 'Wall Mount Bracket', serials: [], macs: [], qty: 4, drumNumber: null, remark: '' },
    ],
    reason: 'Bandra Store restock',
    assignedBy: 'Admin User',
    status: 'Sent',
    sentAt: '2026-09-12T10:00:00.000Z',
    receivedAt: null,
    receivedBy: null,
  },
  {
    // Cross-city, already received — Andheri Store (Mumbai) → Noida Store
    // (Noida), the same store pair as STF-000006 but carried all the way
    // through receiveStoreTransfer() (receivedAt/receivedBy set, matching
    // what that function actually writes), so a fully-relocated cross-city
    // serial has a real example too: ZTE-ONT-2026-0008 is Andheri Store's
    // one still-free ONT Device serial per the hand-checked math above,
    // now sitting 'Available' at Noida Store instead of Andheri.
    id: 'STF-000008', transferNumber: 'TRF-2026-000008',
    date: '2026-09-13T08:00:00.000Z',
    storeFromId: 'STR-002', storeFromName: 'Andheri Store',
    storeToId: 'STR-004', storeToName: 'Noida Store',
    items: [
      { id: 'STFI-8-0', productId: 'PRD-001', productName: 'ONT Device', serials: ['ZTE-ONT-2026-0008'], macs: [], qty: 1, drumNumber: null, remark: 'Noida branch launch stock' },
    ],
    reason: 'Noida Store opening — initial stock allocation',
    assignedBy: 'Admin User',
    status: 'Completed',
    sentAt: '2026-09-13T08:00:00.000Z',
    receivedAt: '2026-09-13T15:30:00.000Z',
    receivedBy: 'Rohit Verma',
  },
  {
    // Fully reversed — Andheri Store → Main Warehouse, recalled while
    // still 'Sent' (never received). Seeded directly in this state (items
    // empty, its one line already sitting in reversedItems) so
    // StoreTransfer.jsx's flattenRows() has a stable, no-live-action
    // example of a fully-reversed transfer's "Reversed" row on first load,
    // instead of that row only ever existing after a user actually
    // reverses something mid-session. Drop Wire drum DR-00871 has 370m
    // left at Andheri Store after STF-000003 already cut 100m from its
    // original 470m (see the hand-checked math above) — this 15m line was
    // picked from the same drum, then recalled before ever leaving Andheri
    // for good, comfortably within what's left.
    //
    // items: [] + reversedItems holding the one line is exactly
    // reverseStoreTransferLine()'s own shape once a transfer's last (or
    // only) line is reversed (see that function) — status 'Reversed' at
    // the transfer level, the line itself carrying its own reversedAt.
    // Being structurally absent from items, inventoryLedger.js's Store
    // Transfers block never processes this line at all — no forEach ever
    // sees it, so DR-00871's 370m stays exactly where STF-000003 left it,
    // completely untouched by this record either way; no ledger change is
    // needed for this to hold, only this shape. (The Delivery Challan
    // reconciled below for this record — see createDeliveryChallanForTransfer()
    // — reads transfer.items at seed time same as any other record, so it
    // shows no line items for this one; a real reversed-in-app challan
    // would already have been generated with its line intact back when
    // the transfer was first saved, since createDeliveryChallanForTransfer()
    // only ever runs once, before any reversal — this is a seed-only
    // quirk of constructing the record already-reversed rather than
    // walking it through saveStoreTransfer() then reverseStoreTransferLine().)
    id: 'STF-000009', transferNumber: 'TRF-2026-000009',
    date: '2026-09-13T12:00:00.000Z',
    storeFromId: 'STR-002', storeFromName: 'Andheri Store',
    storeToId: 'STR-001', storeToName: 'Main Warehouse',
    items: [],
    reversedItems: [
      { id: 'STFI-9-0', productId: 'PRD-010', productName: 'Drop Wire', serials: [], macs: [], qty: 15, drumNumber: 'DR-00871', remark: '', reversedAt: '2026-09-13T12:30:00.000Z' },
    ],
    reason: 'Main Warehouse stock request',
    assignedBy: 'Admin User',
    status: 'Reversed',
    sentAt: '2026-09-13T12:00:00.000Z',
    receivedAt: null,
    receivedBy: null,
  },
]

// sentAt/receivedAt/receivedBy/signedChallanUpload/reversedItems default
// onto every seed transfer here (same "defaults spread first" pattern used
// throughout this app's other seed reconciliations, e.g. assetStore.js)
// rather than repeating all five on every SEED literal above —
// STF-000001..005 read as historically 'Completed' with no sentAt/
// receivedAt of their own (they pre-date this feature's Send → Receive
// split entirely, so there's nothing meaningful to backfill), while
// STF-000006..000008 set their own literal sentAt/receivedAt/receivedBy to
// actually exercise the lifecycle. None of the seeded transfers have ever
// had a line reversed, so reversedItems: [] is correct for all of them.
let _storeTransfers = SEED.map(t => ({ sentAt: null, receivedAt: null, receivedBy: null, signedChallanUpload: null, reversedItems: [], ...t }))
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
// Every transfer lands on 'Sent' here, unconditionally — no same-city vs.
// cross-city branch (removed; see this file's own file-level note). Only
// receiveStoreTransfer() below can move a transfer to 'Completed'.
export function saveStoreTransfer(data, actor = 'Admin User') {
  const seq = _nextInternalSeq++
  const items = validateAndBuildItems(data, seq)

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
    status: 'Sent',
    sentAt: date,
    receivedAt: null,
    receivedBy: null,
    signedChallanUpload: null,
  }
  _storeTransfers = [transfer, ..._storeTransfers]
  notify()

  // GST Rule 55 (India) requires a Delivery Challan to accompany a
  // non-sale movement of goods like this — auto-generated here as a direct
  // side effect of saving the transfer (the challan is paper evidence the
  // shipment left Store From, which is true the moment it's saved), so no
  // separate user action creates the record itself (see
  // deliveryChallanStore.js for the document's own shape and its own note
  // on why editing/reversing this transfer later doesn't regenerate it).
  // The signed copy of THIS same document, uploaded once the receiver
  // actually signs for it, is a separate artifact entirely (see
  // receiveStoreTransfer()'s own signedChallanUpload note below).
  createDeliveryChallanForTransfer(transfer)

  const itemCount = items.reduce((s, it) => s + it.qty, 0)
  logAudit({
    action: 'Create', module: 'Inventory',
    details: `Sent ${itemCount} item(s) from ${data.storeFromName} to ${data.storeToName} (${transfer.transferNumber})`,
  })

  return transfer
}

// ── Receive a Sent transfer at Store To ─────────────────────────────────
// Confirms a shipment has physically arrived — flips status 'Sent' →
// 'Completed'. This is now the ONLY way any transfer reaches 'Completed'
// (see saveStoreTransfer() above — every transfer lands on 'Sent',
// same-city or cross-city alike). inventoryLedger.js's Store Transfers
// block (see that file) had been withholding the destination-side stock
// effect (unit.storeId move / destination drum / balance credit) while
// status was 'Sent'; once it's 'Completed' that effect applies.
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
//
// The removed item isn't discarded — it's appended (with a `reversedAt`
// timestamp) onto a separate `reversedItems` array on the transfer record,
// so StoreTransfer.jsx's list can still show it as a read-only "Reversed"
// row instead of the line silently vanishing (a transfer with only one
// line would otherwise disappear from the list entirely once reversed,
// with no visible trace it ever existed). `items` keeps meaning exactly
// what it means everywhere else in this file — currently-active lines
// only — so alreadyTransferredValues()/updateStoreTransfer()/
// inventoryLedger.js's Store Transfers block all keep working completely
// unchanged: a reversed line is structurally absent from `items`, exactly
// as before this `reversedItems` array was added.
//
// The exact same item-removal mechanism covers two conceptually different
// cases uniformly, without needing separate code paths for the ledger
// itself (see the file-level note above) — only the audit trail's wording
// needs to tell them apart, since "moved back" is only true for one of
// them:
//   - Still 'Sent' (not yet received): the item never actually reached
//     Store To — inventoryLedger.js's Store Transfers block was only
//     holding it at an intermediate 'In Transit' status, storeId still
//     Store From's. Removing it is a RECALL, not a return — logged as
//     such below rather than implying an arrival that never happened.
//   - Already 'Completed' (received): the item genuinely was 'Available'
//     at Store To before this call — removing it really does send it back
//     from there, which is what the original "moved back from X to Y"
//     wording (still used below for this case) describes correctly.
export function reverseStoreTransferLine(transferId, itemId, actor = 'Admin User') {
  const transfer = _storeTransfers.find(t => t.id === transferId)
  if (!transfer) throw new Error('Transfer not found.')
  if (transfer.status === 'Reversed') throw new Error('This transfer has already been reversed.')

  const item = transfer.items.find(it => it.id === itemId)
  if (!item) throw new Error('Line not found on this transfer.')

  const wasSent = transfer.status === 'Sent'
  const items = transfer.items.filter(it => it.id !== itemId)
  const nowEmpty = items.length === 0
  // Older records seeded before this array existed default to [] here,
  // same "defaults spread first" reconciliation this file already applies
  // to sentAt/receivedAt/receivedBy/signedChallanUpload on load.
  const reversedItems = [...(transfer.reversedItems ?? []), { ...item, reversedAt: new Date().toISOString() }]

  const updated = { ...transfer, items, reversedItems, status: nowEmpty ? 'Reversed' : transfer.status }
  _storeTransfers = _storeTransfers.map(t => t.id === transferId ? updated : t)
  notify()

  const qtyLabel = item.drumNumber
    ? `${item.qty}m of ${item.productName} (Drum ${item.drumNumber})`
    : `${item.qty} of ${item.productName}`
  const actionLabel = wasSent
    ? `Recalled ${qtyLabel} — never reached ${transfer.storeToName} (${transfer.transferNumber})`
    : `Reversed ${qtyLabel} — moved back from ${transfer.storeToName} to ${transfer.storeFromName} (${transfer.transferNumber})`
  logAudit({
    action: 'Update', module: 'Inventory',
    details: `${actionLabel}${nowEmpty ? ' — transfer fully reversed' : ''}`,
  })

  return updated
}

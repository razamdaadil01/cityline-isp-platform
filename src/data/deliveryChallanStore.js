// Delivery Challan store — module-level pub/sub pattern (mirrors
// storeTransferStore.js/assignmentStore.js). A Delivery Challan is the
// document that (per GST Rule 55, India) must accompany a non-sale
// movement of goods — here, every Store Transfer. This module only
// generates and stores a formatted, point-in-time SNAPSHOT of one
// transfer's own already-decided contents; it never itself moves stock —
// storeTransferStore.js/inventoryLedger.js already own that entirely, and
// nothing here reads back from either of them.
//
// Informational only — the field set below follows the commonly-required
// Rule 55 set, not verified legal/tax advice; see DeliveryChallanView.jsx's
// own on-document disclaimer. No CGST/SGST/IGST breakdown is captured — a
// direct store-to-store transfer is treated here as a non-taxable internal
// stock movement. If a future requirement determines a transfer type needs
// tax charged, that's a deliberate, separate addition — this module never
// tries to infer it.
//
// One-directional dependency only (storeStore.js/productStore.js are read
// from here; nothing imports this module back from either) — same
// discipline assignmentStore.js/userAssignmentStore.js/storeTransferStore.js
// already document for why they don't import inventoryLedger.js.
//
// Point-in-time snapshot, not a live view: createDeliveryChallanForTransfer()
// is called exactly once, from storeTransferStore.js's saveStoreTransfer(),
// at the moment a transfer is first created. Editing that transfer later
// (updateStoreTransfer()) or reversing one of its lines
// (reverseStoreTransferLine()) does NOT regenerate or amend the challan —
// same as a real paper challan already handed to a transporter doesn't
// retroactively rewrite itself when the underlying record changes. A
// revision/cancellation workflow for that case is a deliberate follow-up,
// not something this module infers on its own.

import { getStore } from './storeStore'
import { getProduct } from './productStore'

let _challans = []
let _nextSeq = 1
let _nextInternalSeq = 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._challans])) }

export function getDeliveryChallans() { return _challans }
export function getDeliveryChallan(id) { return _challans.find(c => c.id === id) ?? null }

// The lookup StoreTransfer.jsx's own list/menu actually needs — "does this
// transfer have a challan, and what's its id" — since callers only ever
// know the transfer, not the challan's own id.
export function getDeliveryChallanByTransferId(transferId) {
  return _challans.find(c => c.transferId === transferId) ?? null
}

export function subscribeDeliveryChallans(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

// Challan numbering mirrors storeTransferStore.js's own TRF-YYYY-NNNNNN
// convention (DC-2026-000001 is 14 chars, comfortably under GST's 16-char
// document-number ceiling).
function nextChallanNumber() {
  const year = new Date().getFullYear()
  return `DC-${year}-${String(_nextSeq++).padStart(6, '0')}`
}

// Store record → the Consignor/Consignee block a Delivery Challan needs.
// storeStore.js's own Store record (see that file) carries no `address`
// field and no link to a companyEntities.js entity at all — unlike a
// Purchase/PO, which stores its own companyEntityId directly (see
// PurchaseInvoiceView.jsx's `getCompanyEntity(purchase.companyEntityId)`),
// a Store here isn't tied to any one legal entity (Andheri Store alone
// receives stock billed under BOTH seeded entities — see
// purchaseStore.js's PUR-000001..006). So `gstin`/`address` are left null
// rather than guessed or borrowed from an arbitrary entity — the
// document view shows them as blank when so, exactly like InfoRow-style
// blanks elsewhere in this app (PODetail.jsx's own InfoRow). `contactName`/
// `contactPhone` come from the store's own first seeded contact, when one
// exists — genuinely available data, unlike the two fields above.
function storeParty(storeId, storeNameFallback) {
  const store = getStore(storeId)
  const contact = store?.contacts?.[0] ?? null
  return {
    storeId,
    storeName: store?.storeName ?? storeNameFallback ?? storeId,
    branchCode: store?.branchCode ?? null,
    contactName: contact?.name ?? null,
    contactPhone: contact?.phone ?? null,
    address: null,
    gstin: null,
  }
}

// Serial/MAC/Drum identifier for one transfer item — same combined-pair
// display already used by StoreTransfer.jsx's own serialMacDrumLabel() (see
// that file), reused here as the challan line's secondary reference under
// "Description of Goods" rather than duplicating the transferred value with
// no unit-level detail at all.
function lineIdentifier(it) {
  if (it.drumNumber) return `Drum: ${it.drumNumber}`
  if (it.serials.length && it.macs.length) return it.serials.map((s, i) => `${s} / MAC:${it.macs[i] ?? '—'}`).join(', ')
  if (it.serials.length) return it.serials.join(', ')
  if (it.macs.length) return it.macs.join(', ')
  return ''
}

// Actual moved quantity for one transfer item, same de-duplication logic
// StoreTransfer.jsx's own qtyValue() applies (Math.max rather than combined
// length, so a dual-tracked unit isn't counted twice) — `it.qty` on a
// transfer item is stored as serials.length + macs.length (see
// storeTransferStore.js's validateAndBuildItems), which would otherwise
// double-count a dual-tracked line.
function lineQuantity(it) {
  if (it.drumNumber) return it.qty
  if (it.serials.length || it.macs.length) return Math.max(it.serials.length, it.macs.length)
  return it.qty
}

// HSN code and unit come from the live product record when available.
// productStore.js has no hsn/hsnCode field on any seeded product today (the
// only existing HSN column in this app — InvoicePDF.jsx's service-package
// line items — reads from a separate billing/plan catalog, not this
// physical-inventory productStore.js) — so `hsnCode` is left null per item
// rather than fabricated; DeliveryChallanView.jsx renders that as a blank
// cell instead of blocking generation. `unit` reads productStore.js's own
// `unitType` (e.g. 'Piece'/'Meter'), falling back to 'Nos' only when the
// product itself can no longer be resolved (e.g. later deleted).
function buildChallanItems(transferItems) {
  return transferItems.map(it => {
    const product = getProduct(it.productId)
    return {
      productId: it.productId,
      productName: it.productName,
      identifier: lineIdentifier(it),
      hsnCode: product?.hsnCode ?? null,
      quantity: lineQuantity(it),
      unit: product?.unitType ?? (it.drumNumber ? 'Meter' : 'Nos'),
    }
  })
}

// Called exactly once, from storeTransferStore.js's saveStoreTransfer(),
// immediately after a transfer is created — never exported for direct use
// elsewhere, so a Delivery Challan can't accidentally be generated for a
// transfer that doesn't (yet, or ever) exist. `transfer` is the just-saved
// Store Transfer record in full (its own shape — see storeTransferStore.js).
export function createDeliveryChallanForTransfer(transfer) {
  const seq = _nextInternalSeq++
  const challan = {
    id: `DCH-${String(seq).padStart(6, '0')}`,
    challanNumber: nextChallanNumber(),
    challanDate: transfer.date,
    transferId: transfer.id,
    transferNumber: transfer.transferNumber,
    consignor: storeParty(transfer.storeFromId, transfer.storeFromName),
    consignee: storeParty(transfer.storeToId, transfer.storeToName),
    // Derived from the Consignee's own address when available — see
    // storeParty()'s note on why that's null for every store today, so
    // this is always blank in practice until a store carries a real
    // address. Left as its own field (rather than just aliasing
    // consignee.address) so a future address source only needs to fill
    // this one line, not touch every caller that reads it.
    placeOfSupply: null,
    items: buildChallanItems(transfer.items),
    reason: transfer.reason || '',
    issuedBy: transfer.assignedBy,
    createdAt: new Date().toISOString(),
  }
  _challans = [challan, ..._challans]
  notify()
  return challan
}

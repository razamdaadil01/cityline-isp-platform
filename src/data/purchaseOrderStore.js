// Purchase Order store — module-level pub/sub pattern (mirrors
// feasibilityStore.js/productStore.js). Builds on top of Phase 1's
// product/vendor/store/settings stores rather than redefining their shapes.

import { getVendor } from './vendorStore'
import { getStore } from './storeStore'
import { getInventorySettings, formatPoNumber } from './inventorySettingsStore'
import { createPurchaseOrderApproval, subscribeApprovals, getApproval } from './approvalsStore'
import { logAudit } from './auditLogStore'
import { addNotification } from './notificationStore'

export const PO_STATUSES = [
  'Draft', 'Approval Request', 'Correction Required', 'Sent',
  'Partially Received', 'Fully Received', 'Closed', 'Cancelled',
]

// 'Standard' is every PO raised directly from the Inventory module (Create
// PO wizard) — the only kind that existed before Asset Management Phase 2.
// 'Asset Purchase' is raised from Add Asset's "Save & Raise PO" action
// (see assetStore.js/AddAsset.jsx) and carries exactly one line item, the
// asset being purchased. Both kinds flow through the exact same
// savePurchaseOrder()/approval/GRN pipeline below — poType is read-only
// metadata for filtering (e.g. the Asset Management module's own "PO
// Approval" tab), never a branch in this store's own logic.
export const PO_TYPES = ['Standard', 'Asset Purchase']

// Display-only relabeling for the Purchase Orders list's "Purchase Type"
// column — same pattern as PO_STATUS_LABELS/getPoStatusLabel below, so the
// stored/compared value stays 'Standard'/'Asset Purchase' everywhere (the
// note above already documents why) while the UI reads "Product"/"Asset",
// matching the wording of the Add Purchase Order choice screen that
// actually sets this field (PurchaseOrderTypeModal.jsx).
export const PO_TYPE_LABELS = {
  'Standard': 'Product',
  'Asset Purchase': 'Asset',
}
export function getPoTypeLabel(poType) {
  return PO_TYPE_LABELS[poType] ?? poType
}

// Display-only relabeling — the stored/compared value stays 'Approval
// Request' everywhere (so nothing that reads po.status directly needs to
// change), but the UI shows the more descriptive "Sent for Approval" per
// the desired flow's wording. Every status badge/label render site should
// go through getPoStatusLabel() rather than printing po.status directly.
export const PO_STATUS_LABELS = {
  'Approval Request': 'Sent for Approval',
  'Sent': 'Sent to Vendor',
}
export function getPoStatusLabel(status) {
  return PO_STATUS_LABELS[status] ?? status
}

// ── PO number sequence — per companyEntityId, mirrors companyEntities.js's
// getNextInvoiceNumber() (reads + advances a persisted counter) but splits
// preview from consumption: Create PO's Step 1 needs to show the number
// that *would* be assigned without burning it until the PO is actually
// saved (Draft or Sent), since the wizard can be abandoned mid-flow. ────────

let _sequenceByEntity = {}

// Non-consuming — safe to call on every render while the wizard is open.
export function previewNextPoNumber(companyEntityId) {
  if (companyEntityId == null) return ''
  const settings = getInventorySettings(companyEntityId)
  const nextSeq = (_sequenceByEntity[companyEntityId] ?? 0) + 1
  return formatPoNumber(settings.poNumberFormat, nextSeq)
}

// Consuming — only called once, from savePurchaseOrder(), the first time a
// PO is actually persisted.
function consumeNextPoNumber(companyEntityId) {
  const settings = getInventorySettings(companyEntityId)
  const nextSeq = (_sequenceByEntity[companyEntityId] ?? 0) + 1
  _sequenceByEntity = { ..._sequenceByEntity, [companyEntityId]: nextSeq }
  return formatPoNumber(settings.poNumberFormat, nextSeq)
}

// ── Seed data ────────────────────────────────────────────────────────────

function lineAmount(qty, price, gstPercent) {
  return Math.round(qty * price * (1 + gstPercent / 100))
}

function summarize(items, { discount = 0, otherCharges = 0 } = {}) {
  const subtotal = items.reduce((sum, it) => sum + it.qty * it.price, 0)
  const gstAmount = items.reduce((sum, it) => sum + Math.round(it.qty * it.price * it.gstPercent / 100), 0)
  const taxableAmount = subtotal - discount
  const grandTotal = taxableAmount + gstAmount + otherCharges
  return { subtotal, discount, taxableAmount, gstAmount, otherCharges, grandTotal }
}

function makeItem(i, { productId, productName, sku, unit, qty, price, gstPercent, type = 'hardware' }) {
  return { id: `POI-${i}`, type, productId, productName, sku, unit, qty, price, gstPercent, amount: lineAmount(qty, price, gstPercent) }
}

const SEED = [
  {
    id: 'PO-000001', poNumber: 'CITY/PO/2026/00001', companyEntityId: 1,
    vendorId: 'VEN-001', storeId: 'STR-001',
    orderDate: '2026-08-01', estimatedDeliveryDate: '2026-08-15', gstPercent: 18,
    items: [
      makeItem(1, { productId: 'PRD-001', productName: 'ONT Device', sku: '', unit: 'Piece', qty: 10, price: 1800, gstPercent: 18 }),
      makeItem(2, { productId: 'PRD-002', productName: 'WiFi Router', sku: '', unit: 'Piece', qty: 5, price: 1500, gstPercent: 18 }),
    ],
    notes: '', terms: 'Payment due within agreed terms. Goods must match PO specification.',
    status: 'Draft', createdBy: 'Admin User', createdAt: '2026-08-01T09:15:00.000Z', approvalId: null,
  },
  {
    id: 'PO-000002', poNumber: 'CITY/PO/2026/00002', companyEntityId: 1,
    vendorId: 'VEN-002', storeId: 'STR-002',
    orderDate: '2026-07-28', estimatedDeliveryDate: '2026-08-10', gstPercent: 18,
    items: [
      makeItem(3, { productId: 'PRD-007', productName: 'Optical Splitter 1x8', sku: '', unit: 'Piece', qty: 20, price: 650, gstPercent: 18 }),
      makeItem(4, { productId: 'PRD-008', productName: 'SFP Module 1G', sku: '', unit: 'Piece', qty: 10, price: 900, gstPercent: 18 }),
    ],
    notes: 'Please ship in two batches — 10 units each.', terms: 'Payment due within agreed terms. Goods must match PO specification.',
    status: 'Sent', createdBy: 'Neha Gupta', createdAt: '2026-07-28T11:40:00.000Z', approvalId: null,
  },
  {
    id: 'PO-000003', poNumber: 'CITY/PO/2026/00003', companyEntityId: 1,
    vendorId: 'VEN-003', storeId: 'STR-001',
    orderDate: '2026-07-15', estimatedDeliveryDate: '2026-07-30', gstPercent: 18,
    items: [
      makeItem(5, { productId: 'PRD-006', productName: 'Patch Cord (LC-LC, 5m)', sku: '', unit: 'Piece', qty: 100, price: 90, gstPercent: 18 }),
      makeItem(6, { productId: 'PRD-003', productName: 'Wall Mount Bracket', sku: '', unit: 'Piece', qty: 50, price: 150, gstPercent: 18 }),
    ],
    notes: '', terms: 'Payment due within agreed terms. Goods must match PO specification.',
    status: 'Partially Received', createdBy: 'Rajesh Patel', createdAt: '2026-07-15T10:05:00.000Z', approvalId: null,
  },
  {
    id: 'PO-000004', poNumber: 'CLF/PO/2026/00001', companyEntityId: 2,
    vendorId: 'VEN-001', storeId: 'STR-003',
    orderDate: '2026-06-20', estimatedDeliveryDate: '2026-07-02', gstPercent: 18,
    items: [
      makeItem(7, { productId: 'PRD-004', productName: 'POE Switch', sku: '', unit: 'Piece', qty: 8, price: 2200, gstPercent: 18 }),
    ],
    notes: '', terms: 'Payment due within agreed terms. Goods must match PO specification.',
    status: 'Fully Received', createdBy: 'Admin User', createdAt: '2026-06-20T14:20:00.000Z', approvalId: null,
  },
  {
    id: 'PO-000005', poNumber: 'CITY/PO/2026/00005', companyEntityId: 1,
    vendorId: 'VEN-002', storeId: 'STR-002',
    orderDate: '2026-08-10', estimatedDeliveryDate: '2026-08-22', gstPercent: 18,
    items: [
      makeItem(8, { productId: 'PRD-005', productName: 'Drop Wire (per m)', sku: '', unit: 'Piece', qty: 500, price: 12, gstPercent: 18 }),
    ],
    notes: '', terms: 'Payment due within agreed terms. Goods must match PO specification.',
    // Linked to the seeded 'Purchase Order' approval APR-2026-000011 in
    // approvalsStore.js (already Approved) — demonstrates the approval-sync
    // path end to end without needing a live decision first. Status is
    // 'Sent', not 'Approved' — an Approved decision converges straight onto
    // the same 'Sent' status the no-approval-required path reaches.
    status: 'Sent', createdBy: 'Admin User', createdAt: '2026-08-10T08:30:00.000Z', approvalId: 'APR-2026-000011',
  },
  {
    id: 'PO-000006', poNumber: 'CITY/PO/2026/00006', companyEntityId: 1,
    vendorId: 'VEN-003', storeId: 'STR-002',
    orderDate: '2026-08-25', estimatedDeliveryDate: '2026-09-08', gstPercent: 18,
    items: [
      makeItem(9, { productId: 'PRD-004', productName: 'POE Switch', sku: '', unit: 'Piece', qty: 6, price: 2200, gstPercent: 18 }),
      makeItem(10, { productId: 'PRD-002', productName: 'WiFi Router', sku: '', unit: 'Piece', qty: 15, price: 1500, gstPercent: 18 }),
    ],
    notes: '', terms: 'Payment due within agreed terms. Goods must match PO specification.',
    // Linked to the seeded 'Purchase Order' approval APR-2026-000012, still
    // Pending — an Approval Request PO awaiting a live decision, so both
    // this list and /approvals show a real Pending case without needing to
    // raise one first.
    status: 'Approval Request', createdBy: 'Anita Sharma', createdAt: '2026-08-25T10:20:00.000Z', approvalId: 'APR-2026-000012',
  },
  {
    id: 'PO-000007', poNumber: 'CLF/PO/2026/00002', companyEntityId: 2,
    vendorId: 'VEN-002', storeId: 'STR-003',
    orderDate: '2026-08-18', estimatedDeliveryDate: '2026-09-01', gstPercent: 18,
    items: [
      makeItem(11, { productId: 'PRD-007', productName: 'Optical Splitter 1x8', sku: '', unit: 'Piece', qty: 30, price: 650, gstPercent: 18 }),
      makeItem(12, { productId: 'PRD-008', productName: 'SFP Module 1G', sku: '', unit: 'Piece', qty: 15, price: 900, gstPercent: 18 }),
    ],
    notes: '', terms: 'Payment due within agreed terms. Goods must match PO specification.',
    // Linked to the seeded 'Purchase Order' approval APR-2026-000013,
    // already sent back — status 'Correction Required' (not 'Rejected'),
    // matching syncPOStatusFromApproval()'s own status mapping for a
    // Purchase-Order-type approval sent back via sendForCorrection().
    status: 'Correction Required', createdBy: 'Salim Khan', createdAt: '2026-08-18T09:45:00.000Z', approvalId: 'APR-2026-000013',
  },
  {
    id: 'PO-000008', poNumber: 'CITY/PO/2026/00007', companyEntityId: 1,
    vendorId: 'VEN-001', storeId: 'STR-002',
    orderDate: '2026-05-10', estimatedDeliveryDate: '2026-05-25', gstPercent: 18,
    items: [
      makeItem(13, { productId: 'PRD-001', productName: 'ONT Device', sku: '', unit: 'Piece', qty: 12, price: 1800, gstPercent: 18 }),
      makeItem(14, { productId: 'PRD-006', productName: 'Patch Cord (LC-LC, 5m)', sku: '', unit: 'Piece', qty: 60, price: 90, gstPercent: 18 }),
    ],
    notes: '', terms: 'Payment due within agreed terms. Goods must match PO specification.',
    // 'Closed' — a terminal status distinct from 'Fully Received' in
    // PO_STATUSES; no live flow in this app transitions a PO into it yet
    // (same as 'Cancelled'), so this is seeded directly, dated well in the
    // past to read as an order closed out some time ago.
    status: 'Closed', createdBy: 'Pooja Mehta', createdAt: '2026-05-10T11:00:00.000Z', approvalId: null,
  },
  // 'Sent' (displayed as "Sent to Vendor") with no Purchase/GRN raised
  // against it yet — deliberately left fully unreceived, same as
  // PO-000002/PO-000003/PO-000005 above, so it shows up in New Purchase's
  // own "Select PO" step (CreatePurchase.jsx's RECEIVABLE_PO_STATUSES
  // includes 'Sent') ready for a fresh receive. ONT Device is now
  // trackedBySerial: true, trackedByMac: true (productStore.js) — PO Qty 5
  // gives room to test both manual per-unit entry and the Serial+MAC CSV
  // import across several units in one go.
  {
    id: 'PO-000009', poNumber: 'CITY/PO/2026/00008', companyEntityId: 1,
    vendorId: 'VEN-001', storeId: 'STR-003',
    orderDate: '2026-08-27', estimatedDeliveryDate: '2026-09-10', gstPercent: 18,
    items: [
      makeItem(15, { productId: 'PRD-001', productName: 'ONT Device', sku: '', unit: 'Piece', qty: 5, price: 1800, gstPercent: 18 }),
    ],
    notes: '', terms: 'Payment due within agreed terms. Goods must match PO specification.',
    status: 'Sent', createdBy: 'Ravi Patel', createdAt: '2026-08-27T11:15:00.000Z', approvalId: null,
  },
  // ── Asset Purchase seeds — poType: 'Asset Purchase' (see PO_TYPES above)
  // so the Purchase Orders list's "Purchase Type" column shows both badge
  // variants on load rather than only ever seeing "Product" until a live
  // Add Asset "Save & Raise PO" is run. Line items mirror the shape
  // AddAsset.jsx's raisePurchaseOrderForAsset() builds for a real
  // asset-originated PO (productId: '', qty 1, a descriptive productName)
  // rather than a catalog product — no linked asset record exists for
  // these since they're seeded directly, not raised through the wizard.
  {
    id: 'PO-000010', poNumber: 'CITY/PO/2026/00009', companyEntityId: 1, poType: 'Asset Purchase',
    vendorId: 'VEN-001', storeId: 'STR-002',
    orderDate: '2026-08-29', estimatedDeliveryDate: '2026-09-12', gstPercent: 18,
    // Item id follows AddAsset.jsx's raisePurchaseOrderForAsset() convention
    // exactly (`POI-asset-${asset.id}`) so CreatePurchase.jsx's
    // linkedAssetForPOItem() finds the seeded AST-2026-000013 (assetStore.js)
    // as this line's linked asset, same as it would for a live-raised one.
    items: [
      makeItem('asset-AST-2026-000013', { productId: '', productName: 'Field & Splicing Tools — Splicing Machine (Fusion Splicer Unit C)', sku: '', unit: 'Piece', qty: 1, price: 38136, gstPercent: 18 }),
    ],
    notes: 'Auto-generated from Asset Management for a seeded asset.', terms: 'Payment due within agreed terms. Goods must match PO specification.',
    status: 'Sent', createdBy: 'Rajesh Patel', createdAt: '2026-08-29T10:30:00.000Z', approvalId: null,
  },
  {
    id: 'PO-000011', poNumber: 'CITY/PO/2026/00010', companyEntityId: 1, poType: 'Asset Purchase',
    vendorId: 'VEN-003', storeId: 'STR-003',
    orderDate: '2026-08-05', estimatedDeliveryDate: '2026-08-20', gstPercent: 18,
    items: [
      makeItem(17, { productId: '', productName: 'IT Asset — Laptop', sku: '', unit: 'Piece', qty: 1, price: 15678, gstPercent: 18 }),
    ],
    notes: 'Auto-generated from Asset Management for a seeded asset.', terms: 'Payment due within agreed terms. Goods must match PO specification.',
    status: 'Fully Received', createdBy: 'Pooja Mehta', createdAt: '2026-08-05T09:00:00.000Z', approvalId: null,
  },
].map(po => ({ ...po, poType: po.poType ?? 'Standard', ...summarize(po.items) }))

// Seed sequence counters so the *next* live-created PO continues after the
// seeded numbers instead of colliding with them — entity 1 has seeded POs
// through 00010 (the original eight Product POs through 00008, plus two
// seeded Asset Purchase POs at 00009/00010 above), entity 2 through 00002.
_sequenceByEntity = { 1: 10, 2: 2 }

let _pos = [...SEED]
let _nextInternalSeq = _pos.length + 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._pos])) }

export function getPurchaseOrders() { return _pos }
export function getPurchaseOrder(id) { return _pos.find(p => p.id === id) ?? null }

export function subscribePurchaseOrders(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

// Recomputes the commercial summary from a draft's items — exported so the
// Create PO wizard can render a live-recalculating summary using the exact
// same math the store persists with.
export function computePoSummary(items, { discount = 0, otherCharges = 0 } = {}) {
  return summarize(items, { discount, otherCharges })
}

export function computeLineAmount(qty, price, gstPercent) {
  return lineAmount(Number(qty) || 0, Number(price) || 0, Number(gstPercent) || 0)
}

// Creates or updates a PO. `action` drives the resulting status:
//  - 'draft' → status 'Draft', no approval flow.
//  - 'send'  → checks inventorySettingsStore.poApprovalRequired for the PO's
//              companyEntityId: if on, status becomes 'Approval Request' and
//              a linked Approvals record is created (po.approvalId set); if
//              off, status becomes 'Sent' directly.
// `editingId` re-saves an existing PO (e.g. a Draft/Correction Required PO
// being edited) instead of creating a new one — the poNumber is only
// generated once, on first creation.
export function savePurchaseOrder(data, { editingId = null, action = 'draft' } = {}) {
  const existing = editingId ? _pos.find(p => p.id === editingId) : null
  const isNew = !existing
  const summary = summarize(data.items, { discount: data.discount ?? 0, otherCharges: data.otherCharges ?? 0 })

  let po = existing
    ? { ...existing, ...data, ...summary }
    : {
        id: `PO-${String(_nextInternalSeq++).padStart(6, '0')}`,
        poNumber: consumeNextPoNumber(data.companyEntityId),
        createdAt: new Date().toISOString(),
        createdBy: 'Admin User',
        approvalId: null,
        status: 'Draft',
        poType: 'Standard',
        ...data,
        ...summary,
      }

  if (action === 'draft') {
    po = { ...po, status: 'Draft' }
  } else if (action === 'send') {
    const settings = getInventorySettings(po.companyEntityId)
    if (settings.poApprovalRequired) {
      const vendor = getVendor(po.vendorId)
      const store = getStore(po.storeId)
      const approval = createPurchaseOrderApproval({
        poId: po.id, poNumber: po.poNumber,
        vendorName: vendor?.companyName ?? '—', storeName: store?.storeName ?? '—',
        amount: po.grandTotal,
        items: po.items.map(it => ({ name: it.productName, quantity: it.qty, unitPrice: it.price })),
      })
      po = { ...po, status: 'Approval Request', approvalId: approval.id }
    } else {
      po = { ...po, status: 'Sent' }
    }
  }

  _pos = existing ? _pos.map(p => p.id === po.id ? po : p) : [po, ..._pos]
  notify()

  // "Created" fires once, the first time this PO is ever persisted (Draft
  // or sent straight through) — "Sent" only fires when it actually reached
  // Sent status directly (no approval gate), matching what really happened
  // rather than the action name alone: a PO routed to Approval Request
  // hasn't been sent to the vendor yet.
  if (isNew) {
    logAudit({ action: 'Create', module: 'Inventory', details: `Created Purchase Order ${po.poNumber}` })
  }
  if (action === 'send' && po.status === 'Sent') {
    const vendor = getVendor(po.vendorId)
    logAudit({ action: 'Edit', module: 'Inventory', details: `Sent PO ${po.poNumber} to ${vendor?.companyName ?? 'vendor'}` })
  }

  return po
}

// Syncs a PO's status from its linked approval's decision — an 'Approved'
// decision converges the PO onto the same 'Sent' status the no-approval-
// required path reaches directly (savePurchaseOrder's 'send' action above),
// rather than a dead-end 'Approved' status that never progressed further.
// Both 'Correction Required' (Send for Correction) and a plain 'Rejected'
// decision (still reachable via the Approvals list page's generic Reject
// action) map to the PO's own 'Correction Required' status — the PO
// creator needs to fix and resend, not treat the order as dead, regardless
// of which action was used to send it back. The approval's own
// decisionComment stays the single source of truth for *why* — PODetail
// reads it straight off the linked approval record rather than duplicating
// it here.
export function syncPOStatusFromApproval(approvalId, approvalStatus) {
  const po = _pos.find(p => p.approvalId === approvalId)
  if (!po || po.status !== 'Approval Request') return
  const mapped = approvalStatus === 'Approved' ? 'Sent' : (approvalStatus === 'Rejected' || approvalStatus === 'Correction Required') ? 'Correction Required' : null
  if (!mapped) return
  _pos = _pos.map(p => p.id === po.id ? { ...p, status: mapped } : p)
  notify()
  logAudit({
    action: 'Edit', module: 'Inventory',
    details: mapped === 'Sent' ? `Purchase Order ${po.poNumber} approved and sent to vendor` : `Purchase Order ${po.poNumber} sent back for correction`,
  })

  // Notify the PO's original creator when it comes back for correction —
  // first real caller of notificationStore.js's addNotification(), same
  // "first live write path" moment logAudit() had in Phase 6.
  if (mapped === 'Correction Required') {
    const approval = getApproval(approvalId)
    const comment = approval?.decisionComment?.trim()
    const excerpt = comment ? (comment.length > 80 ? `${comment.slice(0, 80)}…` : comment) : 'No comment provided.'
    addNotification({
      type: 'po_correction',
      title: 'PO Correction Requested',
      description: `Purchase Order ${po.poNumber} needs correction: ${excerpt}`,
      meta: `For ${po.createdBy ?? 'the PO creator'}`,
      reference: po.poNumber,
      color: 'red',
    })
  }
}

// Recomputes a PO's receipt status from its cumulative received quantity
// per line — called by purchaseStore.js after a Purchase tied to this PO is
// confirmed. `receivedByProductId` is a plain { [productId]: cumulativeQty }
// map that the caller derives by summing receivedQty across every
// 'Confirmed' Purchase linked to this PO (a PO can be received across
// several partial Purchases) — purchaseOrderStore.js deliberately doesn't
// import purchaseStore.js itself to avoid a circular dependency between the
// two stores, so it only ever sees the already-aggregated numbers.
// Matches PO lines to received quantities by productId rather than a line
// id, since a PO's items don't carry duplicate productIds in practice.
export function recalculatePOReceiptStatus(poId, receivedByProductId) {
  const po = _pos.find(p => p.id === poId)
  if (!po) return
  // Only POs actually out for receipt progress this way — leave anything
  // else (Draft, Approval Request, Cancelled, etc.) untouched. 'Approved' is
  // deliberately not listed — syncPOStatusFromApproval() no longer produces
  // it (an approved PO converges straight to 'Sent'), so it's not a
  // reachable po.status value here any more.
  if (!['Sent', 'Partially Received'].includes(po.status)) return
  const fullyReceived = po.items.every(it => (receivedByProductId[it.productId] ?? 0) >= it.qty)
  const anyReceived = po.items.some(it => (receivedByProductId[it.productId] ?? 0) > 0)
  const newStatus = fullyReceived ? 'Fully Received' : anyReceived ? 'Partially Received' : po.status
  if (newStatus === po.status) return
  _pos = _pos.map(p => p.id === poId ? { ...p, status: newStatus } : p)
  notify()
}

// Auto-wire the sync above to approvalsStore's own pub/sub — this is what
// actually keeps a PO's status current whenever a decision is persisted via
// approveApproval()/rejectApproval() (ApprovalDecisionModal's save path in
// Approvals.jsx / ApprovalDetail.jsx), without either of those needing to
// know purchaseOrderStore exists.
subscribeApprovals(approvals => {
  approvals.forEach(a => {
    if (a.type === 'Purchase Order' && a.status !== 'Pending') {
      syncPOStatusFromApproval(a.id, a.status)
    }
  })
})

// Purchase Order store — module-level pub/sub pattern (mirrors
// feasibilityStore.js/productStore.js). Builds on top of Phase 1's
// product/vendor/store/settings stores rather than redefining their shapes.

import { getVendor } from './vendorStore'
import { getStore } from './storeStore'
import { getInventorySettings, formatPoNumber } from './inventorySettingsStore'
import { createPurchaseOrderApproval, subscribeApprovals } from './approvalsStore'

export const PO_STATUSES = [
  'Draft', 'Approval Request', 'Correction Required', 'Approved', 'Sent',
  'Partially Received', 'Fully Received', 'Closed', 'Cancelled',
]

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
    // path end to end without needing a live decision first.
    status: 'Approved', createdBy: 'Admin User', createdAt: '2026-08-10T08:30:00.000Z', approvalId: 'APR-2026-000011',
  },
].map(po => ({ ...po, ...summarize(po.items) }))

// Seed sequence counters so the *next* live-created PO continues after the
// seeded numbers instead of colliding with them — entity 1 has seeded POs
// through 00005 (three POs plus the 00005 approval-demo PO), entity 2
// through 00001.
_sequenceByEntity = { 1: 5, 2: 1 }

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
  return po
}

// Syncs a PO's status from its linked approval's decision — 'Approved'
// keeps the approval's own wording, while a 'Rejected' approval decision
// reads as 'Correction Required' in PO vocabulary (the PO creator needs to
// fix and resend, not treat the order as dead). The approval's own
// decisionComment stays the single source of truth for *why* — PODetail
// reads it straight off the linked approval record rather than duplicating
// it here.
export function syncPOStatusFromApproval(approvalId, approvalStatus) {
  const po = _pos.find(p => p.approvalId === approvalId)
  if (!po || po.status !== 'Approval Request') return
  const mapped = approvalStatus === 'Approved' ? 'Approved' : approvalStatus === 'Rejected' ? 'Correction Required' : null
  if (!mapped) return
  _pos = _pos.map(p => p.id === po.id ? { ...p, status: mapped } : p)
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

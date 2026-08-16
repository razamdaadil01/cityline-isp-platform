// Purchase (Goods Receipt) store — module-level pub/sub pattern (mirrors
// purchaseOrderStore.js). Builds on top of Phase 1/2's product/vendor/store/
// purchase-order stores rather than redefining their shapes. A Purchase
// records what was actually received against a PO (or, for "Outside PO"
// receipts, with no PO at all) and is the source of truth Phase 4's real
// stock ledger will read from later.

import { recalculatePOReceiptStatus } from './purchaseOrderStore'

export const PURCHASE_STATUSES = ['Draft', 'Received', 'Confirmed', 'Cancelled']

// ── Amount math ──────────────────────────────────────────────────────────
// Mirrors purchaseOrderStore.js's base-amount-then-GST-on-top convention:
// poAmount/receivedValue/extraItemValue are pre-tax; gstAmount is the tax on
// everything actually received; totalPurchaseValue = the three added up.
// - shortQty/extraQty are always derived from poQty vs receivedQty, never
//   entered directly (BR from the phase brief).
// - "Received Value" only covers the portion of receivedQty that's within
//   the PO's ordered qty (baseQty = min(receivedQty, poQty)); anything past
//   that — including the entirety of an Outside-PO item, since poQty is 0
//   for those — falls into "Extra Item Value" instead.

function itemDerived(it) {
  const poQty = Number(it.poQty) || 0
  const receivedQty = Number(it.receivedQty) || 0
  const price = Number(it.price) || 0
  const gstPercent = Number(it.gstPercent) || 0
  const shortQty = Math.max(poQty - receivedQty, 0)
  const extraQty = Math.max(receivedQty - poQty, 0)
  const baseQty = Math.min(receivedQty, poQty)
  const amount = Math.round(receivedQty * price * (1 + gstPercent / 100))
  return { shortQty, extraQty, baseQty, amount }
}

// Exported so both the Create Purchase wizard (live recalculation as
// Received Qty/price/GST change) and the store's own save path compute
// short/extra/amount with the exact same logic.
export function computeItemFields(it) {
  const { shortQty, extraQty, amount } = itemDerived(it)
  return { ...it, shortQty, extraQty, amount }
}

function summarizePurchase(items) {
  let poAmount = 0, receivedValue = 0, extraItemValue = 0, gstAmount = 0
  items.forEach(it => {
    const { baseQty, extraQty } = itemDerived(it)
    const poQty = Number(it.poQty) || 0
    const receivedQty = Number(it.receivedQty) || 0
    const price = Number(it.price) || 0
    const gstPercent = Number(it.gstPercent) || 0
    poAmount += poQty * price
    receivedValue += baseQty * price
    extraItemValue += extraQty * price
    gstAmount += Math.round(receivedQty * price * gstPercent / 100)
  })
  const totalPurchaseValue = receivedValue + extraItemValue + gstAmount
  return { poAmount, receivedValue, extraItemValue, gstAmount, totalPurchaseValue }
}

// Exported so Create Purchase's Step 3 renders a live-recalculating
// commercial summary using this exact same math.
export function computePurchaseSummary(items) {
  return summarizePurchase(items)
}

// ── Purchase number sequence — simple, global, no per-entity format
// (unlike PO numbering) — v1 doesn't need company-configurable numbering
// here per the phase brief. ──────────────────────────────────────────────

let _nextSeq = 1
function nextPurchaseNumber() {
  const year = new Date().getFullYear()
  return `PUR-${year}-${String(_nextSeq++).padStart(6, '0')}`
}

// ── Seed data ────────────────────────────────────────────────────────────

function makeItem(i, fields) {
  const base = {
    id: `PURI-${i}`, source: 'po', type: 'hardware', productId: '', productName: '', sku: '', unit: '',
    poQty: 0, receivedQty: 0, price: 0, gstPercent: 18,
    serials: [], macs: [], drumNumber: '', reason: '',
    ...fields,
  }
  return computeItemFields(base)
}

const SEED = [
  {
    id: 'PUR-000001', purchaseNumber: 'PUR-2026-000001',
    poId: 'PO-000003', poNumber: 'CITY/PO/2026/00003',
    vendorId: 'VEN-003', vendorName: 'TP-Link India Pvt Ltd',
    storeId: 'STR-001', storeName: 'Main Warehouse', companyEntityId: 1,
    purchaseDate: '2026-07-20',
    items: [
      makeItem(1, { productId: 'PRD-006', productName: 'Patch Cord (LC-LC, 5m)', unit: 'Piece', poQty: 100, receivedQty: 80, price: 90, gstPercent: 18 }),
      makeItem(2, { productId: 'PRD-003', productName: 'Wall Mount Bracket', unit: 'Piece', poQty: 50, receivedQty: 50, price: 150, gstPercent: 18 }),
    ],
    remarks: 'Patch cord shipment short by 20 units — vendor to follow up on the balance.',
    status: 'Confirmed', createdBy: 'Rajesh Patel', createdAt: '2026-07-20T10:00:00.000Z',
  },
  {
    id: 'PUR-000002', purchaseNumber: 'PUR-2026-000002',
    poId: 'PO-000002', poNumber: 'CITY/PO/2026/00002',
    vendorId: 'VEN-002', vendorName: 'Sterlite Technologies',
    storeId: 'STR-002', storeName: 'Andheri Store', companyEntityId: 1,
    purchaseDate: '2026-08-05',
    items: [
      makeItem(3, { productId: 'PRD-007', productName: 'Optical Splitter 1x8', unit: 'Piece', poQty: 20, receivedQty: 15, price: 650, gstPercent: 18 }),
      makeItem(4, { productId: 'PRD-008', productName: 'SFP Module 1G', unit: 'Piece', poQty: 10, receivedQty: 0, price: 900, gstPercent: 18 }),
    ],
    remarks: '',
    status: 'Draft', createdBy: 'Neha Gupta', createdAt: '2026-08-05T09:00:00.000Z',
  },
  {
    id: 'PUR-000003', purchaseNumber: 'PUR-2026-000003',
    poId: null, poNumber: null,
    vendorId: 'VEN-001', vendorName: 'ZTE India Ltd',
    storeId: 'STR-002', storeName: 'Andheri Store', companyEntityId: 1,
    purchaseDate: '2026-08-12',
    items: [
      makeItem(5, {
        source: 'outside', productId: 'PRD-001', productName: 'ONT Device', unit: 'Piece',
        poQty: 0, receivedQty: 3, price: 1800, gstPercent: 18,
        reason: 'Urgent field requirement for a VIP customer install',
      }),
    ],
    remarks: 'Emergency stock-out purchase — approved verbally by Ops Manager.',
    status: 'Confirmed', createdBy: 'Admin User', createdAt: '2026-08-12T14:00:00.000Z',
  },
].map(pur => ({ ...pur, ...summarizePurchase(pur.items) }))

_nextSeq = SEED.length + 1

let _purchases = [...SEED]
let _nextInternalSeq = _purchases.length + 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._purchases])) }

export function getPurchases() { return _purchases }
export function getPurchase(id) { return _purchases.find(p => p.id === id) ?? null }

export function subscribePurchases(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

// Cumulative received qty per productId across every 'Confirmed' Purchase
// linked to `poId` — a PO can be received across multiple partial
// Purchases, so this always re-derives from the full history rather than
// tracking a running total separately (single source of truth).
function receivedByProductIdForPO(poId) {
  const map = {}
  _purchases.forEach(pur => {
    if (pur.poId !== poId || pur.status !== 'Confirmed') return
    pur.items.forEach(it => {
      if (it.source !== 'po') return
      map[it.productId] = (map[it.productId] ?? 0) + (Number(it.receivedQty) || 0)
    })
  })
  return map
}

// Creates or updates a Purchase. `action` drives the resulting status:
//  - 'draft'   → status 'Draft', no PO/stock updates.
//  - 'confirm' → status 'Confirmed'; if tied to a PO, recalculates that
//                PO's receipt status (Partially/Fully Received) from the
//                cumulative received qty across all Confirmed Purchases
//                against it. Real stock-ledger writes are Phase 4's job —
//                this store is deliberately already shaped as the source of
//                truth Phase 4 will read received quantities from.
// `editingId` re-saves an existing Draft Purchase instead of creating a new
// one — the purchaseNumber is only generated once, on first creation.
export function savePurchase(data, { editingId = null, action = 'draft' } = {}) {
  const existing = editingId ? _purchases.find(p => p.id === editingId) : null
  const items = data.items.map(computeItemFields)
  const summary = summarizePurchase(items)

  let purchase = existing
    ? { ...existing, ...data, items, ...summary }
    : {
        id: `PUR-${String(_nextInternalSeq++).padStart(6, '0')}`,
        purchaseNumber: nextPurchaseNumber(),
        createdAt: new Date().toISOString(),
        createdBy: 'Admin User',
        status: 'Draft',
        ...data, items, ...summary,
      }

  purchase = { ...purchase, status: action === 'confirm' ? 'Confirmed' : 'Draft' }

  _purchases = existing ? _purchases.map(p => p.id === purchase.id ? purchase : p) : [purchase, ..._purchases]
  notify()

  if (action === 'confirm' && purchase.poId) {
    recalculatePOReceiptStatus(purchase.poId, receivedByProductIdForPO(purchase.poId))
  }

  return purchase
}

// Reconcile PO receipt status against the seed's already-'Confirmed'
// Purchases, same "seed then reconcile" pattern purchaseOrderStore.js uses
// for its own approval-linked seed row — keeps the derived PO status
// consistent with the seeded Purchase history from first load.
const _poIdsToReconcile = [...new Set(SEED.filter(p => p.status === 'Confirmed' && p.poId).map(p => p.poId))]
_poIdsToReconcile.forEach(poId => recalculatePOReceiptStatus(poId, receivedByProductIdForPO(poId)))

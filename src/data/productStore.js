// Product master store — module-level pub/sub pattern (mirrors feasibilityStore.js).
// Backs Inventory's Product Management (Phase 1: Configuration). Real stock
// quantities (Available Qty) come in a later phase — this store only holds
// the product master record, not stock levels.

import { HARDWARE_CATALOG } from './hardwareCatalog'
import { logAudit } from './auditLogStore'

export const UNIT_TYPES = ['Piece', 'Box', 'Packet']
export const TRACKING_TYPES = [
  { value: 'quantity', label: 'Quantity' },
  { value: 'serial',   label: 'Serial Number' },
  { value: 'mac',      label: 'MAC Number' },
]
export const GOOD_TYPES = [
  { value: 'consumable',     label: 'Consumable' },
  { value: 'non_consumable', label: 'Non-Consumable' },
]

// Seeded from the existing shared hardware catalog so Product List isn't
// empty on first load — sku/brand/model are left blank since hardwareCatalog
// entries never carried them; trackingType defaults to 'quantity' (no
// serial/MAC tracking configured yet for these legacy items). IDs are
// assigned from each item's original HARDWARE_CATALOG index (not the
// post-filter position) so the numbering below stays stable/traceable even
// with "Drop Wire (per m)" filtered out.
//
// "Drop Wire (per m)" is dropped here rather than kept alongside the new
// wire-type "Drop Wire" product below — same physical item, and carrying
// both would just be a confusing duplicate in Product Management. Nothing
// in the codebase does a live productStore.getProduct(id) lookup against
// this catalog's ids (grep confirms getProduct() has no callers yet), so
// removing PRD-005 here is safe — existing seeded PO/approval records that
// reference "Drop Wire (per m)" by name are independent point-in-time
// snapshots, not live joins, and are unaffected.
const HARDWARE_SEED = HARDWARE_CATALOG
  .map((item, i) => ({ item, seq: i + 1 }))
  .filter(({ item }) => item.name !== 'Drop Wire (per m)')
  .map(({ item, seq }) => ({
    id: `PRD-${String(seq).padStart(3, '0')}`,
    productType: 'hardware',
    name: item.name,
    sku: '',
    brand: '',
    model: '',
    imageUrl: '',
    unitType: 'Piece',
    sellingPrice: item.unitPrice,
    reorderAlertQty: 10,
    trackingType: 'quantity',
    drumNumberRequired: false,
    purchasedCompanyId: null,
    goodType: 'consumable',
    status: 'active',
  }))

// Wire-type products didn't exist in the original hardwareCatalog.js
// migration — seeded here so Product Management's Wire tab isn't empty and
// Create PO's Wire product picker has real options to search against.
const WIRE_SEED = [
  { name: '4 Core Fiber Cable', sku: 'WR-4CFC-001', sellingPrice: 12 },
  { name: 'Drop Wire',          sku: 'WR-DW-001',   sellingPrice: 8 },
  { name: '6 Core Fiber Cable', sku: 'WR-6CFC-001', sellingPrice: 18 },
].map((w, i) => ({
  id: `PRD-${String(HARDWARE_CATALOG.length + i + 1).padStart(3, '0')}`,
  productType: 'wire',
  name: w.name,
  sku: w.sku,
  brand: '',
  model: '',
  imageUrl: '',
  unitType: 'Meter',
  sellingPrice: w.sellingPrice,
  reorderAlertQty: 100,
  trackingType: null,
  drumNumberRequired: true,
  status: 'active',
}))

const SEED = [...HARDWARE_SEED, ...WIRE_SEED]

let _products = [...SEED]
// Next id continues after the highest numeric suffix actually in use —
// HARDWARE_SEED has a gap where "Drop Wire (per m)" was filtered out, so
// this can't just be _products.length + 1 without risking a collision.
let _nextSeq = Math.max(...SEED.map(p => Number(p.id.slice(4)))) + 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._products])) }

export function getProducts() { return _products }
export function getProduct(id) { return _products.find(p => p.id === id) ?? null }

// Non-consuming — safe to call on every render while the Add Product modal
// is open, mirrors purchaseOrderStore.js's previewNextPoNumber(). Doesn't
// advance _nextSeq itself; saveProduct() is the only thing that does that,
// at actual save time.
export function previewNextProductId() {
  return `PRD-${String(_nextSeq).padStart(3, '0')}`
}

export function subscribeProducts(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

export function isProductNameTaken(name, excludeId = null) {
  const q = name.trim().toLowerCase()
  return _products.some(p => p.id !== excludeId && p.name.trim().toLowerCase() === q)
}

export function isSkuTaken(sku, excludeId = null) {
  const q = sku.trim().toLowerCase()
  if (!q) return false
  return _products.some(p => p.id !== excludeId && p.sku.trim().toLowerCase() === q)
}

// Create or update. Callers pass an `id` to update an existing product;
// omitting it (new product) assigns the next PRD-### sequence id.
export function saveProduct(product) {
  const isNew = !(product.id && _products.find(p => p.id === product.id))
  let saved
  if (!isNew) {
    _products = _products.map(p => p.id === product.id ? { ...p, ...product } : p)
    saved = _products.find(p => p.id === product.id)
  } else {
    const id = `PRD-${String(_nextSeq++).padStart(3, '0')}`
    saved = { ...product, id, status: product.status ?? 'active' }
    _products = [..._products, saved]
  }
  notify()
  logAudit({
    action: isNew ? 'Create' : 'Edit', module: 'Inventory',
    details: `${isNew ? 'Added' : 'Updated'} product ${saved.name} (${saved.id})`,
  })
}

// Products are never hard-deleted once transaction history could exist
// against them (BR: "Product cannot be deleted once it has any transaction
// history") — v1 has no transactions yet, so this status toggle is the only
// delete-adjacent action exposed anywhere in the UI.
export function setProductStatus(id, status) {
  _products = _products.map(p => p.id === id ? { ...p, status } : p)
  notify()
  const product = getProduct(id)
  logAudit({ action: 'Edit', module: 'Inventory', details: `${status === 'active' ? 'Activated' : 'Deactivated'} product ${product?.name ?? id}` })
}

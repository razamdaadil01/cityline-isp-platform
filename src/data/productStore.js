// Product master store — module-level pub/sub pattern (mirrors feasibilityStore.js).
// Backs Inventory's Product Management (Phase 1: Configuration). Real stock
// quantities (Available Qty) come in a later phase — this store only holds
// the product master record, not stock levels.

import { HARDWARE_CATALOG } from './hardwareCatalog'

export const UNIT_TYPES = ['Piece', 'Box', 'Packet']
export const TRACKING_TYPES = [
  { value: 'quantity', label: 'Need Quantity Only' },
  { value: 'serial',   label: 'Serial Number' },
  { value: 'mac',      label: 'MAC Number' },
]

// Seeded from the existing shared hardware catalog so Product List isn't
// empty on first load — sku/brand/model are left blank since hardwareCatalog
// entries never carried them; trackingType defaults to 'quantity' (no
// serial/MAC tracking configured yet for these legacy items).
const SEED = HARDWARE_CATALOG.map((item, i) => ({
  id: `PRD-${String(i + 1).padStart(3, '0')}`,
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
  status: 'active',
}))

let _products = [...SEED]
let _nextSeq = _products.length + 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._products])) }

export function getProducts() { return _products }
export function getProduct(id) { return _products.find(p => p.id === id) ?? null }

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
  if (product.id && _products.find(p => p.id === product.id)) {
    _products = _products.map(p => p.id === product.id ? { ...p, ...product } : p)
  } else {
    const id = `PRD-${String(_nextSeq++).padStart(3, '0')}`
    _products = [..._products, { ...product, id, status: product.status ?? 'active' }]
  }
  notify()
}

// Products are never hard-deleted once transaction history could exist
// against them (BR: "Product cannot be deleted once it has any transaction
// history") — v1 has no transactions yet, so this status toggle is the only
// delete-adjacent action exposed anywhere in the UI.
export function setProductStatus(id, status) {
  _products = _products.map(p => p.id === id ? { ...p, status } : p)
  notify()
}

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

// Tracking configuration is stored as two independent booleans rather than
// the old single `trackingType` string — Serial Number and MAC Number can
// now both be enabled at once (a single physical unit tracked by both,
// e.g. an ONT that has its own serial AND a MAC), which a single-value enum
// couldn't represent. Quantity is exclusive: a product is quantity-tracked
// only when NEITHER of these booleans is set, never stored as a boolean of
// its own — isQuantityTracked() is the one place that rule lives, so every
// caller checks tracking mode the same way instead of re-deriving it.
export function isQuantityTracked(product) {
  return !product?.trackedBySerial && !product?.trackedByMac
}

export function getTrackingLabel(product) {
  if (isQuantityTracked(product)) return 'Quantity'
  const parts = []
  if (product.trackedBySerial) parts.push('Serial Number')
  if (product.trackedByMac) parts.push('MAC Number')
  return parts.join(' + ')
}

// Purchased Company defaults for the seeded catalog — companyEntities.js
// seeds exactly two entities (id 1 'Cityline Networks Pvt Ltd', id 2
// 'Cityline Fiber Solutions LLP'); purchasedCompanyId stores that same id
// directly (see AddEditProductModal in ProductList.jsx — its dropdown value
// is the entity's own `id`, no translation layer). Split by name so
// Product Management's "Purchased Company" column isn't blank for every
// seeded row, and there's realistic mixed data (spanning both entities) to
// exercise Create PO's multi-company auto-split against. Fiber/wire items
// go to entity 2 — its name is a natural fit — everything else to entity 1.
const HARDWARE_PURCHASED_COMPANY = {
  'ONT Device': 1,
  'WiFi Router': 1,
  'Wall Mount Bracket': 1,
  'POE Switch': 1,
  'Patch Cord (LC-LC, 5m)': 2,
  'Optical Splitter 1x8': 2,
  'SFP Module 1G': 2,
}

// ONT Device is the one seeded hardware item actually serial-tracked in the
// field (an ISP always knows which physical ONT is at which customer) — set
// here rather than left at the 'quantity' default so Inventory Overview's
// Units tab, Vendor Detail's Repairing Pending tab, etc. have at least one
// real serial-tracked product to exercise against out of the box.
const SERIAL_TRACKED_HARDWARE = new Set(['ONT Device'])

// ONT Device is also the one seeded item dual-tracked by MAC alongside its
// serial — a real ONT carries both, and CreatePurchase.jsx's
// SerialMacEntryModal already has a dedicated trackedBySerial && trackedByMac
// branch that had no seeded product to exercise it before this.
const MAC_TRACKED_HARDWARE = new Set(['ONT Device'])

// Seeded from the existing shared hardware catalog so Product List isn't
// empty on first load — sku/brand/model are left blank since hardwareCatalog
// entries never carried them; trackedBySerial/trackedByMac both default to
// false (quantity-tracked — no serial/MAC tracking configured yet for these
// legacy items) except ONT Device, tracked by both. IDs are
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
    // Material Cost calc (Project Management, later phase) needs each item's
    // purchase cost, not just its selling price — seeded here at a plausible
    // margin below sellingPrice since no real purchase-price data exists yet.
    purchasePrice: Math.round(item.unitPrice * 0.8),
    reorderAlertQty: 10,
    trackedBySerial: SERIAL_TRACKED_HARDWARE.has(item.name),
    trackedByMac: MAC_TRACKED_HARDWARE.has(item.name),
    drumNumberRequired: false,
    purchasedCompanyId: HARDWARE_PURCHASED_COMPANY[item.name] ?? null,
    goodType: 'consumable',
    status: 'active',
  }))

// Wire-type products didn't exist in the original hardwareCatalog.js
// migration — seeded here so Product Management's Wire tab isn't empty and
// Create PO's Wire product picker has real options to search against.
// purchasedCompanyId is seeded (entity 2, same "fiber -> Cityline Fiber
// Solutions LLP" reasoning as HARDWARE_PURCHASED_COMPANY above) even though
// the Add/Edit Product modal's Wire tab has no field to edit it — that
// field only exists on the Hardware tab by design, so this stays read-only
// seed data for now; it's still picked up correctly everywhere that reads
// purchasedCompanyId (the Product Management column, Create PO's grouping).
const WIRE_SEED = [
  { name: '4 Core Fiber Cable', sku: 'WR-4CFC-001', sellingPrice: 12, purchasePrice: 9 },
  { name: 'Drop Wire',          sku: 'WR-DW-001',   sellingPrice: 8,  purchasePrice: 6 },
  { name: '6 Core Fiber Cable', sku: 'WR-6CFC-001', sellingPrice: 18, purchasePrice: 14 },
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
  purchasePrice: w.purchasePrice,
  reorderAlertQty: 100,
  trackedBySerial: false,
  trackedByMac: false,
  drumNumberRequired: true,
  purchasedCompanyId: 2,
  status: 'active',
}))

// HDD/Backbone Route Project execution materials (Project Management) —
// Duct and Coupler didn't exist in the original hardware/wire catalogs.
// Seeded here so projectStore.js's seeded HDD work order's ductsUsed/
// couplersUsed segment fields have a real Purchase Price to match against
// in getHDDProjectCapex()'s Material Cost calc. "40mm PLB HDPE Duct" is
// named to match the seeded HDD project's technicalSpecs.ductType exactly
// (that's what the matching logic searches for); "Coupler" just needs to
// contain the keyword "coupler".
const PROJECT_MATERIAL_SEED = [
  { name: '40mm PLB HDPE Duct', productType: 'wire',     sku: 'WR-DUCT40-001', unitType: 'Meter', sellingPrice: 45, purchasePrice: 35, purchasedCompanyId: 2 },
  { name: 'Coupler',            productType: 'hardware', sku: 'HW-CPLR-001',   unitType: 'Piece',  sellingPrice: 60, purchasePrice: 50, purchasedCompanyId: 1 },
].map((m, i) => ({
  id: `PRD-${String(HARDWARE_CATALOG.length + WIRE_SEED.length + i + 1).padStart(3, '0')}`,
  productType: m.productType,
  name: m.name,
  sku: m.sku,
  brand: '',
  model: '',
  imageUrl: '',
  unitType: m.unitType,
  sellingPrice: m.sellingPrice,
  purchasePrice: m.purchasePrice,
  reorderAlertQty: m.unitType === 'Meter' ? 100 : 20,
  trackedBySerial: false,
  trackedByMac: false,
  drumNumberRequired: m.unitType === 'Meter',
  purchasedCompanyId: m.purchasedCompanyId,
  goodType: 'consumable',
  status: 'active',
}))

const SEED = [...HARDWARE_SEED, ...WIRE_SEED, ...PROJECT_MATERIAL_SEED]

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

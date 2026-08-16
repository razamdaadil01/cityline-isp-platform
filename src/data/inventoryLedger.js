// Inventory ledger — a computed read layer, not a store of its own. There is
// no persisted/manually-editable "stock" anywhere; every balance, unit and
// movement here is derived fresh from purchaseStore's Confirmed Purchases
// each time it's queried, so it can never drift out of sync with the
// receipts that are its single source of truth.
//
// Assigned/Damaged/Scrap movements don't exist until Phase 5/6 (Engineer
// Assignment / Damage-Scrap), so every unit derived here is 'Available' by
// definition — but the `status` field is already present on every unit/drum
// record specifically so Phase 5 can start writing 'Assigned to Engineer'
// etc. into it without restructuring these shapes.

import { getProducts } from './productStore'
import { getPurchases, subscribePurchases } from './purchaseStore'

// Every Purchase item carries a productId snapshotted at the moment it was
// added (copied from the PO line it came from, or from the product picker
// for an outside-PO/PO-extra item). That snapshot is normally identical to
// the product's live id, but it's still a copy, not a live reference — so
// rather than trust it blindly as the ledger's grouping key, resolve it
// against the live productStore first. An exact id match is the common
// case and returns immediately; SKU and then exact product name are the
// fallbacks for a snapshot that's drifted, so a Purchase item never silently
// aggregates onto an orphaned key that no product row in Inventory Overview
// (which always keys off the live productStore's ids) can ever match.
function resolveProductId(it) {
  const products = getProducts()
  if (products.some(p => p.id === it.productId)) return it.productId
  const bySku = it.sku && products.find(p => p.sku && p.sku === it.sku)
  if (bySku) return bySku.id
  const byName = it.productName && products.find(p => p.name === it.productName)
  if (byName) return byName.id
  return it.productId
}

// Re-derives balances/units/drums/movements from every Confirmed Purchase.
// Cheap enough to recompute on demand at this data scale (mock stage) rather
// than maintain incrementally-updated state that could drift.
function computeLedger() {
  const balanceByKey = {} // `${productId}|${storeId}` -> cumulative receivedQty
  const units = []        // serial/MAC-tracked hardware, one row per physical unit
  const drums = []        // wire, one row per drum
  const movements = []    // chronological Purchase movement log

  getPurchases()
    .filter(pur => pur.status === 'Confirmed')
    .forEach(pur => {
      pur.items.forEach(it => {
        const receivedQty = Number(it.receivedQty) || 0
        if (!it.productId || receivedQty <= 0) return

        const productId = resolveProductId(it)
        const key = `${productId}|${pur.storeId}`
        balanceByKey[key] = (balanceByKey[key] ?? 0) + receivedQty

        movements.push({
          date: pur.purchaseDate, productId, movementType: 'Purchase',
          qty: receivedQty, fromLabel: pur.vendorName, toLabel: pur.storeName,
          reference: pur.purchaseNumber, poReference: pur.poNumber,
        })

        const origin = {
          productId, storeId: pur.storeId,
          purchaseId: pur.id, purchaseNumber: pur.purchaseNumber,
          poId: pur.poId, poNumber: pur.poNumber,
          vendorName: pur.vendorName, receivedDate: pur.purchaseDate,
        }

        if (it.type === 'wire' && it.drumNumber?.trim()) {
          drums.push({
            ...origin, drumNumber: it.drumNumber.trim(),
            receivedMeters: receivedQty, remainingMeters: receivedQty, status: 'Available',
          })
        } else if (it.serials?.length) {
          it.serials.filter(s => s?.trim()).forEach(serial => {
            units.push({ ...origin, kind: 'serial', value: serial.trim(), status: 'Available' })
          })
        } else if (it.macs?.length) {
          it.macs.filter(m => m?.trim()).forEach(mac => {
            units.push({ ...origin, kind: 'mac', value: mac.trim(), status: 'Available' })
          })
        }
      })
    })

  return { balanceByKey, units, drums, movements }
}

// Flat [{ productId, storeId, availableQty }] — the base balance table
// everything else (product rows, summary cards) aggregates from.
export function getStockBalances() {
  const { balanceByKey } = computeLedger()
  return Object.entries(balanceByKey).map(([key, availableQty]) => {
    const [productId, storeId] = key.split('|')
    return { productId, storeId, availableQty }
  })
}

// Total available for a product — across all stores, or narrowed to one.
export function getProductAvailability(productId, storeId = null) {
  return getStockBalances()
    .filter(b => b.productId === productId && (storeId == null || b.storeId === storeId))
    .reduce((sum, b) => sum + b.availableQty, 0)
}

// Serial/MAC unit rows, optionally narrowed by productId/storeId/status.
export function getUnits({ productId, storeId, status } = {}) {
  return computeLedger().units.filter(u =>
    (!productId || u.productId === productId) &&
    (!storeId || u.storeId === storeId) &&
    (!status || u.status === status)
  )
}

// Per-drum wire rows, optionally narrowed by productId/storeId.
export function getDrums({ productId, storeId } = {}) {
  return computeLedger().drums.filter(d =>
    (!productId || d.productId === productId) &&
    (!storeId || d.storeId === storeId)
  )
}

// Movement log, newest first, optionally narrowed to one product.
export function getMovements({ productId } = {}) {
  const { movements } = computeLedger()
  const scoped = productId ? movements.filter(m => m.productId === productId) : movements
  return [...scoped].sort((a, b) => new Date(b.date) - new Date(a.date))
}

// A single serial/MAC/drum unit's trail so far — just its one Purchase hop
// for now (no Phase 5 assignment exists yet), shaped so appending further
// steps ('Assigned to Engineer X', 'Installed at Customer Y') later is just
// pushing onto this same array, not a restructure.
export function getUnitTrail(unit) {
  return [
    {
      date: unit.receivedDate, action: 'Purchased',
      detail: `From ${unit.vendorName}${unit.poNumber ? ` · PO ${unit.poNumber}` : ' · Outside PO'}`,
    },
    {
      date: unit.receivedDate, action: 'Received',
      detail: `Via ${unit.purchaseNumber}`,
      storeId: unit.storeId,
    },
  ]
}

// No independent notify loop — the ledger has no state of its own to
// notify about, so this just re-exposes purchaseStore's own pub/sub.
// Consumers re-run their selectors (getStockBalances() etc.) on fire.
export function subscribeInventoryLedger(fn) {
  return subscribePurchases(() => fn())
}

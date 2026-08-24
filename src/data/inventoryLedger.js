// Inventory ledger — a computed read layer, not a store of its own. There is
// no persisted/manually-editable "stock" anywhere; every balance, unit and
// movement here is derived fresh from purchaseStore's Confirmed Purchases
// each time it's queried, so it can never drift out of sync with the
// receipts that are its single source of truth.
//
// Phase 5 (Engineer Assignment) layers assignmentStore.js's confirmed
// deductions on top of the purchase-derived state below — a unit/drum's
// `status`/remaining figures reflect assignments automatically. Damaged/
// Scrap movements are still a later phase.

import { getProducts } from './productStore'
import { getPurchases, subscribePurchases } from './purchaseStore'
import { getAssignments, subscribeAssignments } from './assignmentStore'
import { getReplacements, subscribeReplacements } from './replacementStore'

function normalizeMatchKey(s) {
  return (s || '').trim().toLowerCase()
}

// Every Purchase item carries a productId snapshotted at the moment it was
// added (copied from the PO line it came from, or from the product picker
// for an outside-PO/PO-extra item). That snapshot is normally identical to
// the product's live id, but it's still a copy, not a live reference — so
// rather than trust it blindly as the ledger's grouping key, resolve it
// against the live productStore first. An exact id match is the common
// case and returns immediately; SKU and then product name are the
// fallbacks for a snapshot that's drifted, so a Purchase item never silently
// aggregates onto an orphaned key that no product row in Inventory Overview
// (which always keys off the live productStore's ids) can ever match. The
// SKU/name fallbacks compare trimmed + case-insensitively (normalizeMatchKey)
// rather than requiring a byte-for-byte match — a stray leading/trailing
// space or a casing difference on an otherwise-identical name/SKU shouldn't
// be enough to orphan an entire receipt's balance and serial units.
function resolveProductId(it) {
  const products = getProducts()
  if (products.some(p => p.id === it.productId)) return it.productId
  const sku = normalizeMatchKey(it.sku)
  const bySku = sku && products.find(p => normalizeMatchKey(p.sku) === sku)
  if (bySku) return bySku.id
  const name = normalizeMatchKey(it.productName)
  const byName = name && products.find(p => normalizeMatchKey(p.name) === name)
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

  // ── Assignments: deductions ──────────────────────────────────────────
  // Layered on top of the purchase-derived state above so every reader of
  // this module (getStockBalances/getUnits/getDrums/getMovements) reflects
  // engineer assignments automatically, with zero changes needed anywhere
  // that already calls them — Inventory Overview in particular. See
  // assignmentStore.js's file-level note for why that store computes its
  // own save-time validation independently instead of this relationship
  // running the other way.
  const assignedQtyByKey = {} // `${productId}|${storeId}` -> cumulative assignedQty (quantity-tracked only)
  const unitsByValue = new Map(units.map(u => [u.value, u]))
  const drumsByNumber = new Map(drums.map(d => [d.drumNumber, d]))

  getAssignments()
    .filter(a => a.status !== 'Returned')
    .forEach(a => {
      a.hardwareLines.forEach(l => {
        const values = [...l.serials, ...l.macs]
        if (values.length) {
          values.forEach(v => {
            const unit = unitsByValue.get(v)
            if (!unit) return
            unit.status = 'Assigned to Engineer'
            unit.engineerId = a.engineerId
            unit.engineerName = a.engineerName
            unit.assignmentId = a.id
            unit.assignmentNumber = a.assignmentNumber
            unit.assignedAt = a.assignedAt
            unit.workOrderId = a.workOrderId
            unit.workOrderLabel = a.workOrderLabel
          })
        } else if (l.assignedQty > 0) {
          const key = `${l.productId}|${a.storeId}`
          balanceByKey[key] = Math.max(0, (balanceByKey[key] ?? 0) - l.assignedQty)
          assignedQtyByKey[key] = (assignedQtyByKey[key] ?? 0) + l.assignedQty
        }
        if (l.assignedQty > 0) {
          movements.push({
            date: (a.assignedAt || '').slice(0, 10), productId: l.productId, movementType: 'Assignment',
            qty: l.assignedQty, fromLabel: a.storeName, toLabel: a.engineerName,
            reference: a.assignmentNumber, poReference: null,
          })
        }
      })
      a.wireLines.forEach(l => {
        const drum = drumsByNumber.get(l.drumNumber)
        if (drum) drum.remainingMeters = Math.max(0, drum.remainingMeters - (Number(l.assignedMeters) || 0))
        if (l.assignedMeters > 0) {
          movements.push({
            date: (a.assignedAt || '').slice(0, 10), productId: l.productId, movementType: 'Assignment',
            qty: l.assignedMeters, fromLabel: a.storeName, toLabel: a.engineerName,
            reference: a.assignmentNumber, poReference: null,
          })
        }
      })
    })

  // ── Replacements: manual field swap-outs against a Support ticket ───────
  // Layered on last, same pattern as assignments above, so a replaced unit's
  // status/movement reflect the swap regardless of whether it was ever
  // assigned to an engineer first. Processed oldest-first (the store
  // prepends newest-first) so that if a unit were ever marked Replaced more
  // than once, the most recent record wins.
  ;[...getReplacements()].reverse().forEach(r => {
    const unit = unitsByValue.get(r.value)
    if (!unit || unit.productId !== r.productId) return
    unit.status = 'Replaced'
    unit.replacedAt = r.replacedAt
    unit.replacementTicketNumber = r.ticketNumber
    unit.replacementRemarks = r.remarks
    movements.push({
      date: r.replacedAt.slice(0, 10), productId: unit.productId, movementType: 'Replaced',
      qty: 1, fromLabel: unit.engineerName ?? 'Field', toLabel: `Ticket ${r.ticketNumber}`,
      reference: r.ticketNumber, poReference: null, remarks: r.remarks,
    })
  })

  return { balanceByKey, units, drums, movements, assignedQtyByKey }
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

// How much of a product currently sits with engineer(s) — the same
// tracked-vs-quantity split Inventory Overview's own hardwareAvailable stat
// already makes: quantity-tracked hardware contributes its cumulative
// assignedQty, serial/MAC-tracked hardware contributes a count of units
// whose status is 'Assigned to Engineer'. Summed together since both are
// "how many of this product are with an engineer right now", just derived
// differently depending on how the product is tracked.
export function getEngineerAssignedQty(productId, storeId = null) {
  const { assignedQtyByKey, units } = computeLedger()
  const qtySum = Object.entries(assignedQtyByKey)
    .filter(([key]) => key.startsWith(`${productId}|`) && (!storeId || key === `${productId}|${storeId}`))
    .reduce((sum, [, v]) => sum + v, 0)
  const unitCount = units.filter(u =>
    u.productId === productId && u.status === 'Assigned to Engineer' && (!storeId || u.storeId === storeId)
  ).length
  return qtySum + unitCount
}

// Movement log, newest first, optionally narrowed to one product.
export function getMovements({ productId } = {}) {
  const { movements } = computeLedger()
  const scoped = productId ? movements.filter(m => m.productId === productId) : movements
  return [...scoped].sort((a, b) => new Date(b.date) - new Date(a.date))
}

// A single serial/MAC/drum unit's trail so far — Purchased → Received, plus
// an Assigned to Engineer step once assignmentStore.js has one on record,
// plus a Replaced step once replacementStore.js has one on record. Each step
// keys off the unit still carrying that record (assignmentNumber/
// replacementTicketNumber) rather than its *current* status, so a unit that
// has since moved on to 'Replaced' still shows its earlier Assigned step —
// the trail is a history, not just a snapshot of where the unit is now.
// Shaped so a later phase (Installed at Customer, Returned, ...) is just
// pushing onto this same array, not a restructure.
export function getUnitTrail(unit) {
  const trail = [
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
  if (unit.assignmentNumber) {
    trail.push({
      date: (unit.assignedAt || '').slice(0, 10), action: 'Assigned to Engineer',
      detail: `${unit.engineerName}${unit.workOrderLabel ? ` · Work Order ${unit.workOrderLabel}` : ''} · ${unit.assignmentNumber}`,
    })
  }
  if (unit.status === 'Replaced' && unit.replacementTicketNumber) {
    trail.push({
      date: (unit.replacedAt || '').slice(0, 10), action: 'Replaced',
      detail: `Ticket ${unit.replacementTicketNumber}${unit.replacementRemarks ? ` — ${unit.replacementRemarks}` : ''}`,
    })
  }
  return trail
}

// No independent notify loop — the ledger has no state of its own to
// notify about, so this just re-exposes purchaseStore's, assignmentStore's
// and replacementStore's own pub/subs. Consumers re-run their selectors
// (getStockBalances() etc.) on fire, from a new receipt, a new assignment,
// or a new replacement.
export function subscribeInventoryLedger(fn) {
  const unsubPurchases = subscribePurchases(() => fn())
  const unsubAssignments = subscribeAssignments(() => fn())
  const unsubReplacements = subscribeReplacements(() => fn())
  return () => { unsubPurchases(); unsubAssignments(); unsubReplacements() }
}

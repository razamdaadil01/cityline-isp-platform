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
import { getUserAssignments, subscribeUserAssignments } from './userAssignmentStore'
import { getStoreTransfers, subscribeStoreTransfers } from './storeTransferStore'
import { getRepairs } from './repairStore'

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
//
// `excludeUserAssignmentId` (used only by CreateUserAssignment.jsx's Edit
// mode) skips one specific UserAssignment entirely when applying the "User
// Assignments: engineer -> customer handoffs" block below — every unit/qty/
// meters that assignment ever handed off reverts to "still held by the
// engineer" for this one computation, so editing an existing handoff can
// show (and let the user re-pick from) exactly what it originally included,
// not just whatever the engineer happens to hold right now. No caller
// outside the edit flow passes this, so every other read of this module is
// completely unaffected.
//
// `excludeAssignmentId` is the same idea one layer up — used only by
// CreateAssignment.jsx's own Edit mode — and skips one specific engineer
// Assignment entirely in the "Assignments: deductions" block just below, so
// that assignment's own already-claimed units/qty/drum-meters revert to
// "still Available at the store" for this one computation, letting the user
// re-pick from (or change) exactly what it originally issued.
//
// `excludeStoreTransferId` is the same idea again, one layer over on the
// Store Transfers block further down — used only by CreateStoreTransfer.jsx's
// own Edit mode — and skips one specific transfer entirely, so its own
// already-moved units/qty/drum-meters revert to "still at Store From" for
// this one computation.
function computeLedger({ excludeUserAssignmentId, excludeAssignmentId, excludeStoreTransferId } = {}) {
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
        } else if (it.serials?.length && it.macs?.length) {
          // Dual-tracked (Serial Number AND MAC Number both enabled) — one
          // unit per received quantity, serials[i]/macs[i] paired as the
          // same physical unit rather than two separate unit lists.
          const count = Math.max(it.serials.length, it.macs.length)
          for (let i = 0; i < count; i++) {
            const serial = (it.serials[i] || '').trim()
            const mac = (it.macs[i] || '').trim()
            if (!serial && !mac) continue
            units.push({ ...origin, kind: 'serial-mac', value: serial || mac, serial: serial || null, mac: mac || null, status: 'Available' })
          }
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
  // `${engineerId}|${productId}` -> cumulative assignedQty issued to that
  // engineer specifically (quantity-tracked only) — a per-engineer view
  // assignedQtyByKey above can't answer, needed for Assign to User's Step 3
  // cap (see getEngineerHeldQty below). Not netted against handoffs yet;
  // the User Assignments block further down does that.
  const assignedQtyByEngineerKey = {}
  // `${engineerId}|${productId}|${drumNumber}` -> cumulative assignedMeters
  // issued to that engineer specifically, from that specific drum — wire's
  // equivalent of assignedQtyByEngineerKey above, needed for Assign to
  // User's Wire tab. Keyed per-drum (not just per-product) because an
  // engineer can hold meters cut from more than one drum of the same wire
  // product; unlike a serial/MAC unit, a drum is never atomically "assigned
  // to an engineer" as a whole (it's fungible meters shared with the
  // store's own remaining stock), so this is tracked as its own running
  // total rather than by mutating drum objects the way unit.engineerId
  // does above. Not netted against handoffs yet; the User Assignments block
  // further down does that.
  const assignedMetersByEngineerDrumKey = {}
  // A dual-tracked unit is keyed by BOTH its serial (u.value) and its mac —
  // whichever identifier a downstream record (assignment line, replacement,
  // transfer, repair) carries still resolves to the one physical unit, so
  // its status is never split across two phantom entries.
  const unitsByValue = new Map()
  units.forEach(u => {
    unitsByValue.set(u.value, u)
    if (u.mac) unitsByValue.set(u.mac, u)
  })
  const drumsByNumber = new Map(drums.map(d => [d.drumNumber, d]))

  getAssignments()
    .filter(a => a.status !== 'Returned' && a.id !== excludeAssignmentId)
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
          const engKey = `${a.engineerId}|${l.productId}`
          assignedQtyByEngineerKey[engKey] = (assignedQtyByEngineerKey[engKey] ?? 0) + l.assignedQty
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
          if (l.drumNumber) {
            const engKey = `${a.engineerId}|${l.productId}|${l.drumNumber}`
            assignedMetersByEngineerDrumKey[engKey] = (assignedMetersByEngineerDrumKey[engKey] ?? 0) + (Number(l.assignedMeters) || 0)
          }
          movements.push({
            date: (a.assignedAt || '').slice(0, 10), productId: l.productId, movementType: 'Assignment',
            qty: l.assignedMeters, fromLabel: a.storeName, toLabel: a.engineerName,
            reference: a.assignmentNumber, poReference: null,
          })
        }
      })
    })

  // ── User Assignments: engineer → customer handoffs ───────────────────
  // A unit/qty here was already 'Assigned to Engineer' via the block above
  // — this layers on top the same way Replacements does below, moving the
  // specific units/qty this engineer handed off from 'Assigned to Engineer'
  // to 'Assigned to User'. Doesn't touch balanceByKey — that stock already
  // left the store's balance the moment it was assigned to the engineer;
  // handing it onward to a customer doesn't return it to any store.
  const handedOffQtyByEngineerKey = {} // `${engineerId}|${productId}` -> cumulative qty already handed to users
  // `${engineerId}|${productId}|${drumNumber}` -> cumulative meters already
  // handed to users from that specific held drum — wire's equivalent of
  // handedOffQtyByEngineerKey above.
  const handedOffMetersByEngineerDrumKey = {}
  getUserAssignments().filter(ua => ua.id !== excludeUserAssignmentId).forEach(ua => {
    const toLabel = ua.customerName || 'Customer'
    ua.items.forEach(it => {
      const values = [...it.serials, ...it.macs]
      if (values.length) {
        values.forEach(v => {
          const unit = unitsByValue.get(v)
          if (!unit) return
          unit.status = 'Assigned to User'
          unit.userAssignmentNumber = ua.assignmentNumber
          unit.handedOffAt = ua.assignedAt
          unit.customerName = ua.customerName
        })
        movements.push({
          date: (ua.assignedAt || '').slice(0, 10), productId: it.productId, movementType: 'Assignment',
          qty: values.length, fromLabel: ua.engineerName, toLabel,
          reference: ua.assignmentNumber, poReference: null,
        })
      } else if (it.drumNumber && Number(it.qty) > 0) {
        const engKey = `${ua.engineerId}|${it.productId}|${it.drumNumber}`
        handedOffMetersByEngineerDrumKey[engKey] = (handedOffMetersByEngineerDrumKey[engKey] ?? 0) + Number(it.qty)
        movements.push({
          date: (ua.assignedAt || '').slice(0, 10), productId: it.productId, movementType: 'Assignment',
          qty: Number(it.qty), fromLabel: ua.engineerName, toLabel,
          reference: ua.assignmentNumber, poReference: null,
        })
      } else if (Number(it.qty) > 0) {
        const engKey = `${ua.engineerId}|${it.productId}`
        handedOffQtyByEngineerKey[engKey] = (handedOffQtyByEngineerKey[engKey] ?? 0) + Number(it.qty)
        movements.push({
          date: (ua.assignedAt || '').slice(0, 10), productId: it.productId, movementType: 'Assignment',
          qty: Number(it.qty), fromLabel: ua.engineerName, toLabel,
          reference: ua.assignmentNumber, poReference: null,
        })
      }
    })
  })

  // ── Replacements: manual field swap-outs against a Support ticket ───────
  // Same pattern as assignments above, so a replaced unit's status/movement
  // reflect the swap regardless of whether it was ever assigned to an
  // engineer first. Processed oldest-first (the store prepends
  // newest-first) so that if a unit were ever marked Replaced more than
  // once, the most recent record wins.
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

  // ── Store Transfers: relocating stock between stores directly ──────────
  // Layered last — a transfer only ever touches units/balances currently
  // 'Available' (re-checked here defensively; see storeTransferStore.js's
  // file-level note on why that store can't independently re-derive full
  // point-in-time availability the way assignmentStore.js/
  // userAssignmentStore.js do against their own single upstream source).
  // storeId is mutated in place on the SAME unit object rather than
  // removing/re-adding it, so its purchase/receipt history (vendorName,
  // poNumber, purchaseNumber, etc.) stays intact — it's the same physical
  // unit, just relocated. One movement entry per (transfer × product line),
  // not one per whole transfer, since getMovements({ productId }) needs a
  // consistent productId per row to filter a specific product's Movement
  // History correctly when a single transfer covers multiple products.
  // A 'Reversed' transfer (every one of its lines individually reversed via
  // storeTransferStore.js's reverseStoreTransferLine) is skipped outright —
  // same idea as the Assignments block's own `a.status !== 'Returned'`
  // filter above, though by the time a transfer reaches 'Reversed' its
  // `items` array is already empty anyway, so this is mostly documentation.
  // Processed oldest-first (the store prepends newest-first) — a unit or
  // drum can in principle be transferred more than once while still
  // 'Available'/holding meters, and each later transfer's own source
  // (a unit currently at Store B, or a drum this same block created for an
  // earlier transfer into Store B) only exists once that earlier transfer
  // has already been applied.
  ;[...getStoreTransfers()]
    .filter(t => t.status !== 'Reversed' && t.id !== excludeStoreTransferId)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(t => {
    t.items.forEach(it => {
      const values = [...it.serials, ...it.macs]
      let movedQty = 0
      if (values.length) {
        values.forEach(v => {
          const unit = unitsByValue.get(v)
          if (!unit || unit.status !== 'Available') return
          unit.storeId = t.storeToId
          unit.lastTransferNumber = t.transferNumber
          unit.lastTransferredAt = t.date
          unit.lastTransferFromStoreName = t.storeFromName
          unit.lastTransferToStoreName = t.storeToName
          movedQty += 1
        })
      } else if (it.drumNumber) {
        // Wire — meters are cut from the specific source drum picked at
        // Store From (which stays put there, same as an assignment's own
        // per-drum deduction just above), and the moved length becomes its
        // own drum row at Store To. That destination row is keyed by a
        // transfer-scoped drum number (never the bare source drumNumber) so
        // it can never collide with — or get its deduction target confused
        // with — the source drum's own row still sitting at Store From; see
        // this same drumsByNumber Map already being read by the Assignments
        // block above. Inherits the source drum's own purchase/vendor
        // history via spread, same traceability reasoning as the unit
        // relocation branch above.
        const sourceDrum = drumsByNumber.get(it.drumNumber)
        const meters = Number(it.qty) || 0
        movedQty = sourceDrum ? Math.min(meters, sourceDrum.remainingMeters) : 0
        if (movedQty > 0) {
          sourceDrum.remainingMeters -= movedQty
          const destDrumNumber = `${it.drumNumber}-${t.transferNumber}`
          let destDrum = drumsByNumber.get(destDrumNumber)
          if (!destDrum) {
            destDrum = {
              ...sourceDrum, storeId: t.storeToId, drumNumber: destDrumNumber,
              sourceDrumNumber: it.drumNumber, receivedMeters: 0, remainingMeters: 0, status: 'Available',
            }
            drums.push(destDrum)
            drumsByNumber.set(destDrumNumber, destDrum)
          }
          destDrum.receivedMeters += movedQty
          destDrum.remainingMeters += movedQty
          destDrum.lastTransferNumber = t.transferNumber
          destDrum.lastTransferredAt = t.date
          destDrum.lastTransferFromStoreName = t.storeFromName
          destDrum.lastTransferToStoreName = t.storeToName
        }
      } else if (Number(it.qty) > 0) {
        const fromKey = `${it.productId}|${t.storeFromId}`
        const toKey = `${it.productId}|${t.storeToId}`
        movedQty = Math.min(Number(it.qty), balanceByKey[fromKey] ?? 0)
        balanceByKey[fromKey] = Math.max(0, (balanceByKey[fromKey] ?? 0) - movedQty)
        balanceByKey[toKey] = (balanceByKey[toKey] ?? 0) + movedQty
      }
      if (movedQty > 0) {
        movements.push({
          date: (t.date || '').slice(0, 10), productId: it.productId, movementType: 'Transfer',
          qty: movedQty, fromLabel: t.storeFromName, toLabel: t.storeToName,
          reference: t.transferNumber, poReference: null,
        })
      }
    })
  })

  // ── Repairs: unit sent back to its vendor for service ───────────────────
  // Vendor Detail's Repairing Pending tab reads getRepairsByVendor() + this
  // same live unit.status directly, so a repair's effect is visible
  // everywhere a unit's status already surfaces (Inventory Overview's Units
  // tab included), not just on the Vendor page. Only 'Sent for Repair'/
  // 'In Service' change the unit's status — a hypothetical 'Returned' record
  // is intentionally left alone here (no UI ever produces one yet; see
  // repairStore.js's file-level note), so a returned unit's status doesn't
  // silently get stuck on a repair state forever once that path exists.
  // Doesn't touch balanceByKey, mirroring how Assignments/Replacements above
  // also leave it alone for serial/MAC-tracked units (balanceByKey only
  // tracks quantity-tracked stock; per-unit availability for tracked
  // products is read via getUnits({ status }) instead).
  getRepairs().forEach(r => {
    if (r.status !== 'Sent for Repair' && r.status !== 'In Service') return
    const unit = unitsByValue.get(r.value)
    if (!unit || unit.productId !== r.productId) return
    unit.status = r.status
    unit.repairRecordId = r.id
    unit.repairVendorId = r.vendorId
    unit.repairVendorName = r.vendorName
    unit.repairExpectedDeliveryDate = r.expectedDeliveryDate
    unit.repairSentAt = r.sentAt
    unit.repairRemarks = r.remarks
  })

  return {
    balanceByKey, units, drums, movements, assignedQtyByKey, assignedQtyByEngineerKey, handedOffQtyByEngineerKey,
    assignedMetersByEngineerDrumKey, handedOffMetersByEngineerDrumKey,
  }
}

// Flat [{ productId, storeId, availableQty }] — the base balance table
// everything else (product rows, summary cards) aggregates from.
// `excludeAssignmentId` — CreateAssignment.jsx's Edit mode passing itself
// through so its own already-issued quantity comes back as Available — see
// computeLedger()'s file-level note.
export function getStockBalances(excludeAssignmentId, excludeStoreTransferId) {
  const { balanceByKey } = computeLedger({ excludeAssignmentId, excludeStoreTransferId })
  return Object.entries(balanceByKey).map(([key, availableQty]) => {
    const [productId, storeId] = key.split('|')
    return { productId, storeId, availableQty }
  })
}

// Total available for a product — across all stores, or narrowed to one.
export function getProductAvailability(productId, storeId = null, excludeAssignmentId, excludeStoreTransferId) {
  return getStockBalances(excludeAssignmentId, excludeStoreTransferId)
    .filter(b => b.productId === productId && (storeId == null || b.storeId === storeId))
    .reduce((sum, b) => sum + b.availableQty, 0)
}

// Serial/MAC unit rows, optionally narrowed by productId/storeId/status/
// engineerId — the last is how Assign to User's Step 3 asks "which units
// does THIS specific engineer currently hold" (status: 'Assigned to
// Engineer' + engineerId together), rather than every engineer's pool.
// `excludeUserAssignmentId` is CreateUserAssignment.jsx's Edit mode passing
// itself through so its own already-handed-off units come back as held;
// `excludeAssignmentId` is CreateAssignment.jsx's own Edit mode doing the
// same thing one layer up (its own already-issued units come back as
// Available) — see computeLedger()'s file-level note for both.
export function getUnits({ productId, storeId, status, engineerId, excludeUserAssignmentId, excludeAssignmentId, excludeStoreTransferId } = {}) {
  return computeLedger({ excludeUserAssignmentId, excludeAssignmentId, excludeStoreTransferId }).units.filter(u =>
    (!productId || u.productId === productId) &&
    (!storeId || u.storeId === storeId) &&
    (!status || u.status === status) &&
    (!engineerId || u.engineerId === engineerId)
  )
}

// Per-drum wire rows, optionally narrowed by productId/storeId.
// `excludeAssignmentId`/`excludeStoreTransferId` — see getUnits()'s note
// above; same idea for drums.
export function getDrums({ productId, storeId, excludeAssignmentId, excludeStoreTransferId } = {}) {
  return computeLedger({ excludeAssignmentId, excludeStoreTransferId }).drums.filter(d =>
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

// Net quantity-tracked qty of a product a SPECIFIC engineer currently
// holds — their cumulative assignedQty across all their non-Returned
// Assignments for that product, minus what they've already handed off via
// UserAssignments. Powers Assign to User's Step 3 cap on the quantity
// input; serial/MAC holdings are read via getUnits({ status: 'Assigned to
// Engineer', engineerId }) instead, since each unit is its own row there.
// `excludeUserAssignmentId` — see computeLedger()'s file-level note; used
// only by CreateUserAssignment.jsx's Edit mode.
export function getEngineerHeldQty(engineerId, productId, excludeUserAssignmentId) {
  const { assignedQtyByEngineerKey, handedOffQtyByEngineerKey } = computeLedger({ excludeUserAssignmentId })
  const key = `${engineerId}|${productId}`
  return Math.max(0, (assignedQtyByEngineerKey[key] ?? 0) - (handedOffQtyByEngineerKey[key] ?? 0))
}

// Wire's equivalent of getEngineerHeldQty above, one row per drum a
// specific engineer currently holds meters from — net of assignedMeters
// across their non-Returned Assignments, minus what they've already handed
// off via UserAssignments, per drum (not just per product, since an
// engineer can hold meters cut from more than one drum of the same
// product). Optionally narrowed to a single product for Assign to User's
// Wire tab, where each row already knows which product it's showing drums
// for. Zero-remaining drums are filtered out, same as getDrums() filtering
// to remainingMeters > 0 for store stock. `excludeUserAssignmentId` — see
// computeLedger()'s file-level note; used only by CreateUserAssignment.jsx's
// Edit mode.
export function getEngineerHeldDrums(engineerId, productId = null, excludeUserAssignmentId) {
  const { drums, assignedMetersByEngineerDrumKey, handedOffMetersByEngineerDrumKey } = computeLedger({ excludeUserAssignmentId })
  const drumsByNumber = new Map(drums.map(d => [d.drumNumber, d]))
  return Object.entries(assignedMetersByEngineerDrumKey)
    .map(([key, grossMeters]) => {
      const [keyEngineerId, keyProductId, drumNumber] = key.split('|')
      return { keyEngineerId, keyProductId, drumNumber, grossMeters }
    })
    .filter(d => d.keyEngineerId === engineerId && (!productId || d.keyProductId === productId))
    .map(d => ({
      productId: d.keyProductId, drumNumber: d.drumNumber,
      remainingMeters: Math.max(0, d.grossMeters - (handedOffMetersByEngineerDrumKey[`${d.keyEngineerId}|${d.keyProductId}|${d.drumNumber}`] ?? 0)),
      storeId: drumsByNumber.get(d.drumNumber)?.storeId ?? null,
    }))
    .filter(d => d.remainingMeters > 0)
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
  // Only the most recent transfer is shown here (a unit can in principle be
  // transferred more than once while still 'Available'); the full history
  // across every transfer is in the product's Movement History tab
  // (getMovements), which isn't limited to a single "latest" step per unit.
  if (unit.lastTransferNumber) {
    trail.push({
      date: (unit.lastTransferredAt || '').slice(0, 10), action: 'Transferred',
      detail: `${unit.lastTransferFromStoreName} → ${unit.lastTransferToStoreName} · ${unit.lastTransferNumber}`,
    })
  }
  if (unit.assignmentNumber) {
    trail.push({
      date: (unit.assignedAt || '').slice(0, 10), action: 'Assigned to Engineer',
      detail: `${unit.engineerName}${unit.workOrderLabel ? ` · Work Order ${unit.workOrderLabel}` : ''} · ${unit.assignmentNumber}`,
    })
  }
  if (unit.userAssignmentNumber) {
    trail.push({
      date: (unit.handedOffAt || '').slice(0, 10), action: 'Assigned to User',
      detail: `${unit.customerName ?? 'Customer'} · ${unit.userAssignmentNumber}`,
    })
  }
  if (unit.repairRecordId) {
    trail.push({
      date: (unit.repairSentAt || '').slice(0, 10), action: unit.status,
      detail: `${unit.repairVendorName ?? 'Vendor'}${unit.repairExpectedDeliveryDate ? ` · Expected back ${unit.repairExpectedDeliveryDate}` : ''}${unit.repairRemarks ? ` — ${unit.repairRemarks}` : ''}`,
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
// notify about, so this just re-exposes purchaseStore's, assignmentStore's,
// replacementStore's, userAssignmentStore's and storeTransferStore's own
// pub/subs. Consumers re-run their selectors (getStockBalances() etc.) on
// fire, from a new receipt, a new assignment, a new replacement, a new user
// handoff, or a new store transfer. repairStore.js has no pub/sub of its
// own yet (it's seed-only — see its file-level note), so there's nothing to
// re-export for it here; add it once a real write path exists.
export function subscribeInventoryLedger(fn) {
  const unsubPurchases = subscribePurchases(() => fn())
  const unsubAssignments = subscribeAssignments(() => fn())
  const unsubReplacements = subscribeReplacements(() => fn())
  const unsubUserAssignments = subscribeUserAssignments(() => fn())
  const unsubStoreTransfers = subscribeStoreTransfers(() => fn())
  return () => { unsubPurchases(); unsubAssignments(); unsubReplacements(); unsubUserAssignments(); unsubStoreTransfers() }
}

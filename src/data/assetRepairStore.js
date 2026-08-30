// Asset Repair store — module-level pub/sub pattern (mirrors assetStore.js
// itself). Phase 5 of Asset Management (PRD Section 12.3).
//
// Kept as its own file rather than folded into assetStore.js — a repair
// record has its own multi-step lifecycle (status progresses independently
// across several separate calls: raiseRepairRequest -> updateRepairStatus,
// repeatable -> resolveRepair), closer in shape to purchaseStore.js/
// purchaseOrderStore.js's own first-class mutable records than to a
// one-shot log entry like assetStore.js's own returnHistory (Phase 4b),
// which is written once and never touched again.
//
// Deliberately unrelated to Inventory's existing repairStore.js — that one
// tracks Inventory-catalog serial/MAC units sent to a vendor and is
// read-only/seed-only (confirmed in the Phase 4b/5 audit: no write path
// exists there). This is a completely separate tracking surface scoped to
// Asset Management's own assets; never touches or merges with that store.
//
// One-directional dependency on assetStore.js only (reads the linked
// asset's warranty dates, writes its status) — assetStore.js never imports
// this file back, same layering discipline purchaseStore.js ->
// assetStore.js already established in Phase 2/3.
//
// No repairHistory array duplicated onto the asset record: a repair record
// is mutated in place after creation (status progresses, then gets
// resolved), so keeping a second copy on asset.repairHistory would need
// syncing on every single update and risk drifting from this store's own
// copy. getRepairsForAsset(assetId) below (newest-first) IS the per-asset
// repair history the PRD's "recurring-fault visibility" asks for — a live,
// single-source-of-truth read, not a duplicated snapshot.

import { getAsset, updateAsset } from './assetStore'
import { logAudit } from './auditLogStore'

export const REPAIR_STATUSES = ['Under Repair', 'Sent to Vendor', 'In Progress', 'Received Back', 'Resolved']
export const REPAIR_PATHS = ['In-house', 'Vendor']
export const REPAIR_RESOLUTIONS = ['Fixed', 'Beyond Repair']

// Seed data — Phase 7 Reports coverage: a recurring-fault asset (3 linked
// repairs, 2 resolved + 1 active) and a single, non-recurring repair on a
// separate asset. Linked via assetId to assetStore.js's own
// AST-2026-000011/000012 seed assets. Field shapes match
// raiseRepairRequest()/resolveRepair()'s own real output exactly.
const SEED = [
  {
    id: 'AREP-000001', repairId: 'REP-2026-000001', assetId: 'AST-2026-000011',
    faultDescription: 'Overheating', reportedBy: 'Admin User', reportedDate: '2026-02-10',
    includeKitComponents: false, repairPath: 'In-house', isWarrantyClaim: false,
    status: 'Resolved', resolution: 'Fixed', remarks: 'Replaced thermal paste and cleaned fan.', cost: null,
    createdAt: '2026-02-10T09:00:00.000Z',
  },
  {
    id: 'AREP-000002', repairId: 'REP-2026-000002', assetId: 'AST-2026-000011',
    faultDescription: 'Display flicker', reportedBy: 'Admin User', reportedDate: '2026-05-18',
    includeKitComponents: false, repairPath: 'Vendor', isWarrantyClaim: true,
    status: 'Resolved', resolution: 'Fixed', remarks: 'Vendor replaced the display cable under warranty.', cost: null,
    createdAt: '2026-05-18T10:00:00.000Z',
  },
  {
    id: 'AREP-000003', repairId: 'REP-2026-000003', assetId: 'AST-2026-000011',
    faultDescription: "Won't power on", reportedBy: 'Admin User', reportedDate: '2026-08-24',
    includeKitComponents: false, repairPath: 'In-house', isWarrantyClaim: false,
    status: 'In Progress', resolution: null, remarks: null, cost: null,
    createdAt: '2026-08-24T09:15:00.000Z',
  },
  // Single, non-recurring repair on AST-2026-000012 — resolved 'Beyond
  // Repair' as a warranty claim, so it appears in the Repair Log but not
  // the Recurring Faults (2+ repairs) report.
  {
    id: 'AREP-000004', repairId: 'REP-2026-000004', assetId: 'AST-2026-000012',
    faultDescription: 'Fuser unit failure — smoke smell during printing', reportedBy: 'Admin User', reportedDate: '2026-06-05',
    includeKitComponents: false, repairPath: 'Vendor', isWarrantyClaim: true,
    status: 'Resolved', resolution: 'Beyond Repair', remarks: 'Vendor assessed board damage beyond economical repair.', cost: null,
    createdAt: '2026-06-05T11:00:00.000Z',
  },
]

let _repairs = [...SEED]
let _nextInternalSeq = SEED.length + 1
let _nextRepairSeq = SEED.length + 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._repairs])) }

// REP-YYYY-NNNNNN — the human-facing id (`repairId`); the record's own
// internal `id` (AREP-NNNNNN) is separate, mirroring purchaseOrderStore.js's
// own id/poNumber split.
function nextRepairId() {
  const year = new Date().getFullYear()
  return `REP-${year}-${String(_nextRepairSeq++).padStart(6, '0')}`
}

export function getAssetRepairs() { return _repairs }
export function getAssetRepair(id) { return _repairs.find(r => r.id === id) ?? null }

// Newest-first — the per-asset repair history the PRD's "recurring-fault
// visibility" asks for (see file-level note above on why this is a live
// read rather than a duplicated array on the asset record).
export function getRepairsForAsset(assetId) {
  return _repairs.filter(r => r.assetId === assetId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

// The one repair "in flight" for an asset — anything short of 'Resolved'.
// AssetDetail.jsx uses this both to gate "Send for Repair" (no duplicate
// active repairs per asset) and to render the Repair Status card.
export function getActiveRepairForAsset(assetId) {
  return _repairs.find(r => r.assetId === assetId && r.status !== 'Resolved') ?? null
}

export function subscribeAssetRepairs(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

// Today's date falls within [warrantyStartDate, warrantyEndDate] — both
// plain YYYY-MM-DD strings (assetTaxonomy.js's own 'date' field
// convention), so a lexicographic compare is exact — same shortcut
// storeTransferStore.js/purchaseOrderStore.js's own date-string fields
// already rely on elsewhere in this app. Exported so
// RepairRequestModal.jsx can show its own inline warranty-claim note using
// this exact same check, rather than a parallel copy that could drift.
export function isAssetWithinWarranty(asset) {
  const start = asset.fields?.warrantyStartDate
  const end = asset.fields?.warrantyEndDate
  if (!start || !end) return false
  const today = new Date().toISOString().slice(0, 10)
  return today >= start && today <= end
}

// Same category/type pair Phase 3/4a/4b already check inline
// (assetTaxonomy.js: 'field-splicing-tools' / 'splicing-machine').
export function isSplicingMachineAsset(asset) {
  return asset?.categoryId === 'field-splicing-tools' && asset?.typeId === 'splicing-machine'
}

// Creates a repair record and ensures the linked asset's status is
// 'Under Repair' (a no-op write if it already is — AssetDetail.jsx's own
// "Send for Repair" action is only ever shown once the asset is already
// there, via the Return flow's Damaged/Not Working path, but this stays
// idempotent regardless of caller). isWarrantyClaim is auto-computed, never
// asked of the user — true only when the chosen path is 'Vendor' AND
// today falls inside the asset's own warranty window.
export function raiseRepairRequest(assetId, { faultDescription, reportedBy = 'Admin User', includeKitComponents = false, repairPath }) {
  const asset = getAsset(assetId)
  if (!asset) throw new Error('Asset not found.')
  if (!faultDescription?.trim()) throw new Error('Fault description is required.')
  if (!REPAIR_PATHS.includes(repairPath)) throw new Error('Select a repair path.')
  if (getActiveRepairForAsset(assetId)) throw new Error('This asset already has an active repair in progress.')

  const isWarrantyClaim = repairPath === 'Vendor' && isAssetWithinWarranty(asset)

  const repair = {
    id: `AREP-${String(_nextInternalSeq++).padStart(6, '0')}`,
    repairId: nextRepairId(),
    assetId,
    faultDescription: faultDescription.trim(),
    reportedBy, reportedDate: new Date().toISOString().slice(0, 10),
    includeKitComponents: isSplicingMachineAsset(asset) ? !!includeKitComponents : false,
    repairPath,
    isWarrantyClaim,
    status: 'Under Repair',
    resolution: null,
    remarks: null,
    cost: null,
    createdAt: new Date().toISOString(),
  }
  _repairs = [repair, ..._repairs]
  notify()

  if (asset.status !== 'Under Repair') {
    updateAsset(assetId, { status: 'Under Repair' })
  }

  logAudit({
    action: 'Create', module: 'Assets',
    details: `Raised repair ${repair.repairId} for asset ${assetId}${isWarrantyClaim ? ' (warranty claim)' : ''}`,
  })
  return repair
}

// Progresses status through the flow (Under Repair -> Sent to Vendor ->
// In Progress -> Received Back) — 'Resolved' is deliberately not settable
// here, that's resolveRepair()'s own job below, since resolving also needs
// a resolution value and applies the resulting asset-status change.
export function updateRepairStatus(repairId, newStatus) {
  const repair = getAssetRepair(repairId)
  if (!repair) throw new Error('Repair record not found.')
  if (repair.status === 'Resolved') throw new Error('This repair has already been resolved.')
  if (newStatus === 'Resolved') throw new Error('Use resolveRepair() to resolve a repair.')
  if (!REPAIR_STATUSES.includes(newStatus)) throw new Error('Invalid repair status.')

  const updated = { ...repair, status: newStatus }
  _repairs = _repairs.map(r => r.id === repairId ? updated : r)
  notify()
  logAudit({ action: 'Edit', module: 'Assets', details: `Repair ${repair.repairId} status updated to ${newStatus}` })
  return updated
}

// 'Fixed' -> the asset returns to 'In Stock'. 'Beyond Repair' -> the asset
// deliberately STAYS 'Under Repair' — Retirement is a separate, not-yet-
// built action (future scope per the brief); leaving it Under Repair keeps
// it visibly flagged for manual retirement later rather than silently
// reverting it to a usable-looking status.
export function resolveRepair(repairId, { resolution, remarks = '' }) {
  const repair = getAssetRepair(repairId)
  if (!repair) throw new Error('Repair record not found.')
  if (repair.status === 'Resolved') throw new Error('This repair has already been resolved.')
  if (!REPAIR_RESOLUTIONS.includes(resolution)) throw new Error('Select a valid resolution.')

  const updated = { ...repair, status: 'Resolved', resolution, remarks: remarks.trim() }
  _repairs = _repairs.map(r => r.id === repairId ? updated : r)
  notify()

  if (resolution === 'Fixed') {
    updateAsset(repair.assetId, { status: 'In Stock' })
  }

  logAudit({
    action: 'Edit', module: 'Assets',
    details: `Resolved repair ${repair.repairId} — ${resolution}${resolution === 'Fixed' ? ' — asset back In Stock' : ' — asset remains Under Repair pending retirement'}`,
  })
  return updated
}

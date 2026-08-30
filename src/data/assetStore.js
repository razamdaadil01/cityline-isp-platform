// Asset store — module-level pub/sub pattern (mirrors storeTransferStore.js/
// assignmentStore.js/deliveryChallanStore.js — every mock data store in this
// app is in-memory, no localStorage anywhere). Backs the new Asset
// Management module's Phase 1: Asset Taxonomy + Add Asset flow. Deliberately
// scoped to just create/read/update/list — no PO/approval wiring, no GRN, no
// assignment, no repair/return logic; those are later phases per the brief.

import { logAudit } from './auditLogStore'

// 'In Stock' is reached automatically, never chosen directly — see
// markAssetsInStockForPO() below, called from purchaseStore.js when a GRN
// (Purchase confirm) completes against the asset's linked Asset Purchase PO.
// 'Assigned' is reached via assignAssetToEngineer() below (Phase 4a) — only
// ever from 'In Stock'. 'Under Repair' is reached via initiateAssetReturn()
// below (Phase 4b) when the returned condition is 'Damaged'/'Not Working' —
// this phase only tracks it as a data state; no repair record/vendor
// routing exists yet (that's Phase 5).
export const ASSET_STATUSES = ['Draft', 'PO Raised', 'In Stock', 'Assigned', 'Under Repair']

// Phase 4b — the condition options Return's own condition selector offers,
// and initiateAssetReturn()'s own valid-input check. 'Working'/'Minor
// Issue' route the asset back to 'In Stock'; 'Damaged'/'Not Working' route
// it to 'Under Repair' — see initiateAssetReturn() below.
export const ASSET_RETURN_CONDITIONS = ['Working', 'Minor Issue', 'Damaged', 'Not Working']

// ── Seed data — so Phase 4a's Assign to Engineer action has real 'In Stock'
// assets to test against without repeating Add Asset → PO → Approval → GRN
// each time the dev server resets. No poId (these weren't created through a
// real Asset Purchase PO — nothing in purchaseOrderStore.js's own seed data
// is poType 'Asset Purchase' to link against, and a fabricated poId would
// dangle when Asset Detail's "View PO" tries to resolve it), no
// companyEntityId (assetStore.js's own asset shape has never carried one —
// see Phase 2's note — Company/Entity only ever exists transiently in
// AddAsset.jsx's own form state, used solely to build a PO payload). Vendor
// ids reference vendorStore.js's real seeded vendors (VEN-002/VEN-003).
const SEED = [
  {
    id: 'AST-2026-000001',
    categoryId: 'it-asset', categoryLabel: 'IT Asset',
    typeId: 'laptop', typeLabel: 'Laptop',
    fields: {
      assetName: 'Field Ops Laptop 01', brandName: 'Dell', modelName: 'Latitude 5440',
      storageCapacity: '512GB SSD', ram: '16GB', processor: 'Intel Core i5-1335U',
      serialNumber: 'DL-LAT5440-0001',
      purchaseDate: '2026-07-10', warrantyStartDate: '2026-07-10', warrantyEndDate: '2029-07-09',
      vendorId: 'VEN-003',
    },
    status: 'In Stock', assignedTo: null, poId: null,
    createdBy: 'Admin User', createdAt: '2026-07-12T10:00:00.000Z',
  },
  // Splicing Machine #1 — every kit component came through GRN clean
  // (receivedStatus: 'Received' across the board), simulating a completed,
  // discrepancy-free receipt.
  {
    id: 'AST-2026-000002',
    categoryId: 'field-splicing-tools', categoryLabel: 'Field & Splicing Tools',
    typeId: 'splicing-machine', typeLabel: 'Splicing Machine',
    fields: {
      assetName: 'Fusion Splicer Unit A', brandName: 'Fujikura', modelName: '90S+',
      serialNumber: 'FJK-90S-2026-0001',
      purchaseDate: '2026-07-15', warrantyStartDate: '2026-07-15', warrantyEndDate: '2028-07-14',
      vendorId: 'VEN-002',
      kitComponents: [
        { id: 'kc-seed-1a', componentType: 'Cleaver', componentName: 'CT-50 Cleaver', serialNumber: 'CLV-2026-0001', quantity: 1, condition: 'New', receivedStatus: 'Received' },
        { id: 'kc-seed-1b', componentType: 'Clamping Tool', componentName: 'Fiber Clamp Set', serialNumber: 'CLT-2026-0001', quantity: 1, condition: 'New', receivedStatus: 'Received' },
        { id: 'kc-seed-1c', componentType: 'Carrying Case', componentName: 'Hard Transport Case', serialNumber: 'CC-2026-0001', quantity: 1, condition: 'Good', receivedStatus: 'Received' },
      ],
    },
    status: 'In Stock', assignedTo: null, poId: null,
    createdBy: 'Admin User', createdAt: '2026-07-16T09:30:00.000Z',
  },
  // Splicing Machine #2 — Clamping Tool never showed up at GRN
  // (receivedStatus: 'Missing', no serial/condition ever recorded for it),
  // simulating the missing-component scenario.
  {
    id: 'AST-2026-000003',
    categoryId: 'field-splicing-tools', categoryLabel: 'Field & Splicing Tools',
    typeId: 'splicing-machine', typeLabel: 'Splicing Machine',
    fields: {
      assetName: 'Fusion Splicer Unit B', brandName: 'Fujikura', modelName: '70S',
      serialNumber: 'FJK-70S-2026-0002',
      purchaseDate: '2026-08-01', warrantyStartDate: '2026-08-01', warrantyEndDate: '2028-07-31',
      vendorId: 'VEN-002',
      kitComponents: [
        { id: 'kc-seed-2a', componentType: 'Cleaver', componentName: 'CT-50 Cleaver', serialNumber: 'CLV-2026-0002', quantity: 1, condition: 'Good', receivedStatus: 'Received' },
        { id: 'kc-seed-2b', componentType: 'Clamping Tool', componentName: 'Fiber Clamp Set', serialNumber: '', quantity: 1, condition: '', receivedStatus: 'Missing' },
        { id: 'kc-seed-2c', componentType: 'Carrying Case', componentName: 'Hard Transport Case', serialNumber: 'CC-2026-0002', quantity: 1, condition: 'New', receivedStatus: 'Received' },
      ],
    },
    status: 'In Stock', assignedTo: null, poId: null,
    createdBy: 'Admin User', createdAt: '2026-08-02T11:15:00.000Z',
  },
]

// hasMissingComponents/returnHistory default onto every seed asset here
// (mirrors purchaseOrderStore.js's own seed `.map(po => ({ ...po, poType:
// 'Standard', ... }))` pattern) rather than repeating both on every SEED
// literal above — none of the 3 seed assets has been through a return yet.
let _assets = SEED.map(a => ({ ...a, hasMissingComponents: false, returnHistory: [] }))
let _nextSeq = SEED.length + 1
let _nextReturnSeq = 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._assets])) }

// AST-YYYY-XXXXXX, mirroring storeTransferStore.js's own TRF-YYYY-NNNNNN
// convention. Consumed internally by buildAsset() below on every create;
// exported too since it's part of this store's own requested API surface
// for this phase, available to a future caller that needs to preview an
// id before commit (AddAsset.jsx's current UI doesn't show one, so it
// doesn't call this directly today).
export function generateAssetId() {
  const year = new Date().getFullYear()
  return `AST-${year}-${String(_nextSeq++).padStart(6, '0')}`
}

export function getAssets() { return _assets }
export function getAsset(id) { return _assets.find(a => a.id === id) ?? null }

export function subscribeAssets(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

// A short human-readable label for one asset — whichever "name" field its
// own category's taxonomy actually defines (Asset Name for IT/Field
// Tools, Ladder Name for Ladder, Tool Name for Generic Tools, Card/ID
// Number for Authority/Access, which has no separate "name" field at
// all) — falls back to the type label so every asset always has
// something to show in the list/search rather than a blank cell.
export function assetDisplayName(asset) {
  const f = asset.fields || {}
  return f.assetName || f.ladderName || f.toolName || f.cardIdNumber || asset.typeLabel || asset.id
}

// data: { categoryId, categoryLabel, typeId, typeLabel, fields: {...} } —
// `fields` keys match the selected type's own taxonomy field `key`s
// (assetTaxonomy.js's getFieldsForType()), kept as free-form data here so
// this store never needs to know the taxonomy's shape itself.
function buildAsset(data, status, actor) {
  return {
    id: generateAssetId(),
    categoryId: data.categoryId, categoryLabel: data.categoryLabel,
    typeId: data.typeId, typeLabel: data.typeLabel,
    fields: data.fields || {},
    status,
    assignedTo: null,
    // Set after the fact, once "Save & Raise PO" has actually created the
    // linked Purchase Order (see AddAsset.jsx) — a brand-new asset never
    // carries this on creation itself, since the PO doesn't exist yet.
    poId: null,
    // Phase 4b — populated by initiateAssetReturn() below; a brand-new
    // asset has never been returned.
    hasMissingComponents: false,
    returnHistory: [],
    createdBy: actor, createdAt: new Date().toISOString(),
  }
}

export function createAsset(data, status = 'Draft', actor = 'Admin User') {
  const asset = buildAsset(data, status, actor)
  _assets = [asset, ..._assets]
  notify()
  logAudit({ action: 'Create', module: 'Assets', details: `Added asset ${asset.id} — ${assetDisplayName(asset)} (${asset.typeLabel})` })
  return asset
}

// Multi-item Add Asset sessions (Step 4's "+ Add Another Item") save every
// item in the session under the same status/actor in one call — Save as
// Draft vs Save & Raise PO is a decision made once for the whole session,
// not per item, so this takes a single shared `status` rather than letting
// each item carry its own.
export function createAssetsBulk(items, status = 'Draft', actor = 'Admin User') {
  const created = items.map(item => buildAsset(item, status, actor))
  _assets = [...created, ..._assets]
  notify()
  logAudit({
    action: 'Create', module: 'Assets',
    details: `Added ${created.length} asset(s) (${status})`,
  })
  return created
}

export function updateAsset(id, data) {
  const existing = getAsset(id)
  if (!existing) throw new Error('Asset not found.')
  const updated = { ...existing, ...data }
  _assets = _assets.map(a => a.id === id ? updated : a)
  notify()
  logAudit({ action: 'Edit', module: 'Assets', details: `Updated asset ${id}` })
  return updated
}

// Called from purchaseStore.js's savePurchase() when a GRN (Purchase
// confirm) completes against a PO whose poType is 'Asset Purchase' — every
// asset linked to that PO (via asset.poId, set by AddAsset.jsx's "Save &
// Raise PO") that's still sitting in 'PO Raised' moves to 'In Stock'.
// Mirrors purchaseOrderStore.js's recalculatePOReceiptStatus() shape: the
// caller (purchaseStore.js) already knows which PO was just received, this
// store just applies the resulting asset-side status change. A no-op when
// no asset is linked to the PO (e.g. a Standard PO, or an Asset Purchase PO
// whose asset was somehow already advanced) — nothing to notify/log then.
export function markAssetsInStockForPO(poId) {
  const linked = _assets.filter(a => a.poId === poId && a.status === 'PO Raised')
  if (linked.length === 0) return
  const linkedIds = new Set(linked.map(a => a.id))
  _assets = _assets.map(a => linkedIds.has(a.id) ? { ...a, status: 'In Stock' } : a)
  notify()
  linked.forEach(a => {
    logAudit({ action: 'Edit', module: 'Assets', details: `Asset ${a.id} marked In Stock — GRN completed for linked PO` })
  })
}

// Called from purchaseStore.js's savePurchase() when a GRN (Purchase
// confirm) completes for a receipt line linked to a Splicing Machine asset
// (CreatePurchase.jsx's own "Kit Components Received" section, shown only
// for a receipt item whose linked asset is category 'field-splicing-tools'
// / type 'splicing-machine'). Overwrites that asset's fields.kitComponents
// with the GRN-confirmed rows — same array, same rows (matched by id),
// just carrying the serial number/condition as actually confirmed at
// physical receipt plus a receivedStatus ('Received'/'Missing') per
// component. Kit components stay children of the parent asset record
// throughout — this only updates their data in place, never gives them an
// independent id/status/lifecycle of their own beyond the parent.
export function confirmKitComponentsForAsset(assetId, kitComponents) {
  const asset = getAsset(assetId)
  if (!asset) return
  const updated = { ...asset, fields: { ...asset.fields, kitComponents } }
  _assets = _assets.map(a => a.id === assetId ? updated : a)
  notify()
  logAudit({ action: 'Edit', module: 'Assets', details: `Kit components confirmed at GRN for asset ${assetId}` })
}

// Phase 4a — Assign Asset to Engineer. Only allowed from 'In Stock' (an
// asset still Draft/PO Raised has no physical unit to hand over yet; one
// already Assigned needs a Return first — see initiateAssetReturn() below).
// For a Splicing Machine asset, its fields.kitComponents ride along
// implicitly: they're already child data on this same asset record, so
// moving the asset to 'Assigned' is all that's needed — nothing else to
// write. AssignAssetModal.jsx is the only caller.
export function assignAssetToEngineer(assetId, { engineerName, branchCode, assignedBy = 'Admin User' }) {
  const asset = getAsset(assetId)
  if (!asset) throw new Error('Asset not found.')
  if (asset.status !== 'In Stock') throw new Error('Only an asset that is In Stock can be assigned to an engineer.')
  const assignedTo = { engineerName, branchCode, assignedAt: new Date().toISOString(), assignedBy }
  const updated = { ...asset, status: 'Assigned', assignedTo }
  _assets = _assets.map(a => a.id === assetId ? updated : a)
  notify()
  logAudit({ action: 'Edit', module: 'Assets', details: `Assigned asset ${assetId} — ${assetDisplayName(asset)} — to ${engineerName}` })
  return updated
}

// AST-YYYY-XXXXXX-shaped, mirroring generateAssetId()'s own convention.
function nextReturnId() {
  const year = new Date().getFullYear()
  return `RTN-${year}-${String(_nextReturnSeq++).padStart(6, '0')}`
}

// Phase 4b — Return an Assigned asset. Per PRD Section 12.2: condition
// determines where the asset lands next — 'Working'/'Minor Issue' → back
// to 'In Stock'; 'Damaged'/'Not Working' → 'Under Repair' (a data state
// only in this phase — no repair record/vendor routing yet, that's
// Phase 5). `kitComponentsReturned` (Splicing Machine assets only, from
// ReturnAssetModal.jsx's checklist) is [{ componentId, returned }] — any
// component NOT ticked is reconciled onto the asset's own
// fields.kitComponents as receivedStatus: 'Missing' (reusing Phase 3's
// same Received/Missing vocabulary the Kit Components table already
// renders), and hasMissingComponents is set so it's visible without
// digging into history. Per the brief, a missing component never blocks
// the return — the parent asset still lands on 'In Stock'/'Under Repair'
// as its condition dictates either way; the missing flag is purely for
// visibility/reporting. assignedTo is always cleared, regardless of
// outcome — the asset is no longer with that engineer once returned.
export function initiateAssetReturn(assetId, { condition, remarks = '', kitComponentsReturned = [], initiatedBy = 'Admin User' }) {
  const asset = getAsset(assetId)
  if (!asset) throw new Error('Asset not found.')
  if (asset.status !== 'Assigned') throw new Error('Only an asset that is Assigned can be returned.')
  if (!ASSET_RETURN_CONDITIONS.includes(condition)) throw new Error('Select a valid condition.')

  const missingComponentIds = kitComponentsReturned.filter(kc => !kc.returned).map(kc => kc.componentId)
  const hasMissingComponents = missingComponentIds.length > 0

  const existingKitComponents = asset.fields?.kitComponents
  const updatedKitComponents = Array.isArray(existingKitComponents)
    ? existingKitComponents.map(c => {
        const checked = kitComponentsReturned.find(kc => kc.componentId === c.id)
        return checked ? { ...c, receivedStatus: checked.returned ? 'Received' : 'Missing' } : c
      })
    : existingKitComponents

  const newStatus = (condition === 'Working' || condition === 'Minor Issue') ? 'In Stock' : 'Under Repair'

  const entry = {
    id: nextReturnId(),
    date: new Date().toISOString(),
    condition, remarks: remarks.trim(),
    initiatedBy,
    previousEngineer: asset.assignedTo?.engineerName ?? null,
    branchCode: asset.assignedTo?.branchCode ?? null,
    resultStatus: newStatus,
    missingComponentIds,
  }

  const updated = {
    ...asset,
    status: newStatus,
    assignedTo: null,
    hasMissingComponents,
    fields: updatedKitComponents ? { ...asset.fields, kitComponents: updatedKitComponents } : asset.fields,
    returnHistory: [entry, ...(asset.returnHistory || [])],
  }
  _assets = _assets.map(a => a.id === assetId ? updated : a)
  notify()

  const missingNote = hasMissingComponents ? ` — ${missingComponentIds.length} kit component(s) missing` : ''
  logAudit({
    action: 'Edit', module: 'Assets',
    details: `Returned asset ${assetId} — ${assetDisplayName(asset)} — condition: ${condition}, now ${newStatus}${missingNote}`,
  })

  return updated
}

// filters: { category, type, status, search } — every filter is optional;
// omitting all of them returns every asset, newest first.
export function listAssets({ category, type, status, search } = {}) {
  const q = (search || '').trim().toLowerCase()
  return _assets
    .filter(a => {
      if (category && a.categoryId !== category) return false
      if (type && a.typeId !== type) return false
      if (status && a.status !== status) return false
      if (q) {
        const haystack = `${a.id} ${assetDisplayName(a)} ${a.typeLabel} ${a.categoryLabel}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

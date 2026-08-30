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
export const ASSET_STATUSES = ['Draft', 'PO Raised', 'In Stock']

let _assets = []
let _nextSeq = 1
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

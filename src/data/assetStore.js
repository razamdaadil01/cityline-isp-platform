// Asset store — module-level pub/sub pattern (mirrors storeTransferStore.js/
// assignmentStore.js/deliveryChallanStore.js — every mock data store in this
// app is in-memory, no localStorage anywhere). Backs the new Asset
// Management module's Phase 1: Asset Taxonomy + Add Asset flow. Deliberately
// scoped to just create/read/update/list — no PO/approval wiring, no GRN, no
// assignment, no repair/return logic; those are later phases per the brief.

import { logAudit } from './auditLogStore'
import { addNotification } from './notificationStore'
import { daysUntilWarrantyEnd } from '../utils/warrantyStatus'

// 'In Stock' is reached automatically, never chosen directly — see
// markAssetsInStockForPO() below, called from purchaseStore.js when a GRN
// (Purchase confirm) completes against the asset's linked Asset Purchase PO.
// 'Assigned' is reached via assignAssetToEngineer() below (Phase 4a) — only
// ever from 'In Stock'. 'Under Repair' is reached via initiateAssetReturn()
// below (Phase 4b) when the returned condition is 'Damaged'/'Not Working' —
// this phase only tracks it as a data state; no repair record/vendor
// routing exists yet (that's Phase 5). 'Retired' and 'Lost' (Phase 8) are
// both terminal, manually-triggered states reachable from any other status
// via retireAsset()/reportAssetLost() below — see their own notes.
export const ASSET_STATUSES = ['Draft', 'PO Raised', 'In Stock', 'Assigned', 'Under Repair', 'Retired', 'Lost']

// Phase 8 — retireAsset()'s own valid-reason check, and RetireAssetModal.jsx's
// Reason dropdown options (PRD Section 12.4: "triggered when an asset is
// beyond repair, obsolete, or end-of-life").
export const ASSET_RETIREMENT_REASONS = ['Beyond Repair', 'Obsolete', 'End of Life']

// Phase 4b — the condition options Return's own condition selector offers,
// and initiateAssetReturn()'s own valid-input check. 'Working'/'Minor
// Issue' route the asset back to 'In Stock'; 'Damaged'/'Not Working' route
// it to 'Under Repair' — see initiateAssetReturn() below.
export const ASSET_RETURN_CONDITIONS = ['Working', 'Minor Issue', 'Damaged', 'Not Working']

// ── Seed data — so Phase 4a's Assign to Engineer action has real 'In Stock'
// assets to test against without repeating Add Asset → PO → Approval → GRN
// each time the dev server resets. No poId (these weren't created through a
// real Asset Purchase PO — until purchaseOrderStore.js's own seed data
// added its two Asset Purchase POs, nothing there was poType 'Asset
// Purchase' to link against, and a fabricated poId would dangle when Asset
// Detail's "View PO" tries to resolve it), no companyEntityId
// (assetStore.js's own asset shape has never carried one — see Phase 2's
// note — Company/Entity only ever exists transiently in AddAsset.jsx's own
// form state, used solely to build a PO payload). Vendor ids reference
// vendorStore.js's real seeded vendors (VEN-002/VEN-003). The one exception
// is AST-2026-000013 below, deliberately linked to the seeded PO-000010 so
// the Purchases (GRN) wizard's Kit Components Received section
// (CreatePurchase.jsx's linkedAssetForPOItem()/requestedKitComponents())
// has a real un-received Splicing Machine case to render against.
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
  // ── Phase 6 warranty-status coverage — one asset per computed status
  // (Active / Expiring Soon / Expired), dated relative to "today"
  // (2026-08-30) so getWarrantyStatus()/checkWarrantyAlerts() exercise
  // every branch without waiting on real dates to shift. Clearly-labeled
  // assetName values so they're easy to spot on the Asset List.
  {
    id: 'AST-2026-000004',
    categoryId: 'it-asset', categoryLabel: 'IT Asset',
    typeId: 'laptop', typeLabel: 'Laptop',
    fields: {
      assetName: 'Warranty Test — Active', brandName: 'HP', modelName: 'ProBook 450 G10',
      storageCapacity: '512GB SSD', ram: '16GB', processor: 'Intel Core i5-1335U',
      serialNumber: 'HP-PB450-WT-0001',
      // ~6 months out from today — well past the 30-day "Expiring Soon" window.
      purchaseDate: '2026-08-01', warrantyStartDate: '2026-08-01', warrantyEndDate: '2027-02-28',
      vendorId: 'VEN-003',
    },
    status: 'In Stock', assignedTo: null, poId: null,
    createdBy: 'Admin User', createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'AST-2026-000005',
    categoryId: 'it-asset', categoryLabel: 'IT Asset',
    typeId: 'desktop', typeLabel: 'Desktop',
    fields: {
      assetName: 'Warranty Test — Expiring Soon (20d)', brandName: 'Dell', modelName: 'OptiPlex 7020',
      storageCapacity: '1TB SSD', ram: '16GB', processor: 'Intel Core i5-13500',
      serialNumber: 'DL-OPX7020-WT-0001',
      // 20 days from today — inside the 30-day "Expiring Soon" window, past
      // the 7-day notification threshold.
      purchaseDate: '2025-09-19', warrantyStartDate: '2025-09-19', warrantyEndDate: '2026-09-19',
      vendorId: 'VEN-003',
    },
    status: 'In Stock', assignedTo: null, poId: null,
    createdBy: 'Admin User', createdAt: '2025-09-20T10:00:00.000Z',
  },
  // Splicing Machine — 5 days out, inside the 7-day notification threshold
  // (the tightest of the 30/15/7 alerts), so checkWarrantyAlerts() has a
  // real case to fire on load. 2 kit components, both already Received, to
  // confirm they don't interfere with the parent's own warranty badge —
  // kit components have no warranty field of their own and simply inherit
  // the parent's status visually (see utils/warrantyStatus.js's own note).
  {
    id: 'AST-2026-000006',
    categoryId: 'field-splicing-tools', categoryLabel: 'Field & Splicing Tools',
    typeId: 'splicing-machine', typeLabel: 'Splicing Machine',
    fields: {
      assetName: 'Warranty Test — Expiring Soon (5d)', brandName: 'Fujikura', modelName: '80S',
      serialNumber: 'FJK-80S-WT-0001',
      purchaseDate: '2025-09-04', warrantyStartDate: '2025-09-04', warrantyEndDate: '2026-09-04',
      vendorId: 'VEN-002',
      kitComponents: [
        { id: 'kc-seed-6a', componentType: 'Cleaver', componentName: 'CT-50 Cleaver', serialNumber: 'CLV-2026-WT-0001', quantity: 1, condition: 'New', receivedStatus: 'Received' },
        { id: 'kc-seed-6b', componentType: 'Carrying Case', componentName: 'Hard Transport Case', serialNumber: 'CC-2026-WT-0001', quantity: 1, condition: 'Good', receivedStatus: 'Received' },
      ],
    },
    status: 'In Stock', assignedTo: null, poId: null,
    createdBy: 'Admin User', createdAt: '2025-09-05T09:30:00.000Z',
  },
  {
    id: 'AST-2026-000007',
    categoryId: 'it-asset', categoryLabel: 'IT Asset',
    typeId: 'monitor', typeLabel: 'Monitor',
    fields: {
      assetName: 'Warranty Test — Expired', brandName: 'Dell', modelName: 'P2422H',
      storageCapacity: 'N/A', ram: '', processor: '',
      serialNumber: 'DL-P2422H-WT-0001',
      // 45 days in the past — already Expired.
      purchaseDate: '2025-07-16', warrantyStartDate: '2025-07-16', warrantyEndDate: '2026-07-16',
      vendorId: 'VEN-003',
    },
    status: 'In Stock', assignedTo: null, poId: null,
    createdBy: 'Admin User', createdAt: '2025-07-17T10:00:00.000Z',
  },
  // ── Assignment/Return/Repair coverage for Phase 7 Reports — assets
  // AST-2026-000008 through 000012, appended purely additively so the
  // existing 000001-000007 seed assets above stay untouched.
  {
    id: 'AST-2026-000008',
    categoryId: 'it-asset', categoryLabel: 'IT Asset',
    typeId: 'laptop', typeLabel: 'Laptop',
    fields: {
      assetName: 'Assigned — Laptop (Engineer Test)', brandName: 'Dell', modelName: 'Latitude 5440',
      storageCapacity: '512GB SSD', ram: '16GB', processor: 'Intel Core i5-1335U',
      serialNumber: 'DL-LAT5440-0008',
      purchaseDate: '2026-08-05', warrantyStartDate: '2026-08-05', warrantyEndDate: '2029-08-04',
      vendorId: 'VEN-003',
    },
    status: 'Assigned',
    assignedTo: { engineerName: 'Arjun Kumar', branchCode: 'CNPL-001', assignedAt: '2026-08-20T10:00:00.000Z', assignedBy: 'Admin User' },
    poId: null,
    createdBy: 'Admin User', createdAt: '2026-08-06T10:00:00.000Z',
  },
  {
    id: 'AST-2026-000009',
    categoryId: 'field-splicing-tools', categoryLabel: 'Field & Splicing Tools',
    typeId: 'splicing-machine', typeLabel: 'Splicing Machine',
    fields: {
      assetName: 'Assigned — Splicing Machine (Engineer Test)', brandName: 'Fujikura', modelName: '90S+',
      serialNumber: 'FJK-90S-2026-0009',
      purchaseDate: '2026-08-06', warrantyStartDate: '2026-08-06', warrantyEndDate: '2028-08-05',
      vendorId: 'VEN-002',
      kitComponents: [
        { id: 'kc-seed-9a', componentType: 'Cleaver', componentName: 'CT-50 Cleaver', serialNumber: 'CLV-2026-0009', quantity: 1, condition: 'New', receivedStatus: 'Received' },
        { id: 'kc-seed-9b', componentType: 'Clamping Tool', componentName: 'Fiber Clamp Set', serialNumber: 'CLT-2026-0009', quantity: 1, condition: 'New', receivedStatus: 'Received' },
        { id: 'kc-seed-9c', componentType: 'Carrying Case', componentName: 'Hard Transport Case', serialNumber: 'CC-2026-0009', quantity: 1, condition: 'Good', receivedStatus: 'Received' },
      ],
    },
    status: 'Assigned',
    assignedTo: { engineerName: 'Preethi Nair', branchCode: 'CNPL-002', assignedAt: '2026-08-22T11:00:00.000Z', assignedBy: 'Admin User' },
    poId: null,
    createdBy: 'Admin User', createdAt: '2026-08-07T09:30:00.000Z',
  },
  // Return + Missing Component — Cleaver never came back with the unit; a
  // real returnHistory entry (matching initiateAssetReturn()'s own output
  // shape exactly) flags it for the Missing/Lost Component Report.
  {
    id: 'AST-2026-000010',
    categoryId: 'field-splicing-tools', categoryLabel: 'Field & Splicing Tools',
    typeId: 'splicing-machine', typeLabel: 'Splicing Machine',
    fields: {
      assetName: 'Return Test — Missing Cleaver', brandName: 'Fujikura', modelName: '70S',
      serialNumber: 'FJK-70S-2026-0010',
      purchaseDate: '2026-07-20', warrantyStartDate: '2026-07-20', warrantyEndDate: '2028-07-19',
      vendorId: 'VEN-002',
      kitComponents: [
        { id: 'kc-seed-10a', componentType: 'Cleaver', componentName: 'CT-50 Cleaver', serialNumber: '', quantity: 1, condition: '', receivedStatus: 'Missing' },
        { id: 'kc-seed-10b', componentType: 'Clamping Tool', componentName: 'Fiber Clamp Set', serialNumber: 'CLT-2026-0010', quantity: 1, condition: 'Fair', receivedStatus: 'Received' },
        { id: 'kc-seed-10c', componentType: 'Carrying Case', componentName: 'Hard Transport Case', serialNumber: 'CC-2026-0010', quantity: 1, condition: 'Fair', receivedStatus: 'Received' },
      ],
    },
    status: 'Under Repair', assignedTo: null, poId: null,
    hasMissingComponents: true,
    returnHistory: [
      {
        id: 'RTN-2026-000001',
        date: '2026-08-25T14:00:00.000Z',
        condition: 'Damaged',
        remarks: 'Housing cracked after a field drop; Cleaver was not returned with the unit.',
        initiatedBy: 'Admin User',
        previousEngineer: 'Anita Sharma',
        branchCode: 'CNPL-001',
        resultStatus: 'Under Repair',
        missingComponentIds: ['kc-seed-10a'],
      },
    ],
    createdBy: 'Admin User', createdAt: '2026-07-21T09:00:00.000Z',
  },
  // Recurring Fault — 3 linked repairs in assetRepairStore.js's own SEED
  // (2 resolved, 1 active), so this asset surfaces in both the Recurring
  // Faults (2+ repairs) report and the full Repair Log.
  {
    id: 'AST-2026-000011',
    categoryId: 'it-asset', categoryLabel: 'IT Asset',
    typeId: 'desktop', typeLabel: 'Desktop',
    fields: {
      assetName: 'Recurring Fault Test — Desktop', brandName: 'Dell', modelName: 'OptiPlex 7020',
      storageCapacity: '1TB SSD', ram: '16GB', processor: 'Intel Core i5-13500',
      serialNumber: 'DL-OPX7020-RF-0011',
      purchaseDate: '2025-11-01', warrantyStartDate: '2025-11-01', warrantyEndDate: '2027-10-31',
      vendorId: 'VEN-003',
    },
    status: 'Under Repair', assignedTo: null, poId: null,
    createdBy: 'Admin User', createdAt: '2025-11-02T10:00:00.000Z',
  },
  // Single, non-recurring repair — resolved 'Beyond Repair' under warranty,
  // so it appears in the Repair Log but not the Recurring Faults report.
  {
    id: 'AST-2026-000012',
    categoryId: 'it-asset', categoryLabel: 'IT Asset',
    typeId: 'printer', typeLabel: 'Printer',
    fields: {
      assetName: 'Single Repair Test — Printer', brandName: 'HP', modelName: 'LaserJet Pro M404dn',
      storageCapacity: 'N/A', ram: '', processor: '',
      serialNumber: 'HP-LJM404-SR-0012',
      purchaseDate: '2025-12-01', warrantyStartDate: '2025-12-01', warrantyEndDate: '2026-11-30',
      vendorId: 'VEN-003',
    },
    status: 'Under Repair', assignedTo: null, poId: null,
    createdBy: 'Admin User', createdAt: '2025-12-02T10:00:00.000Z',
  },
  // Linked to the seeded Asset Purchase PO PO-000010 (purchaseOrderStore.js)
  // — status stays 'PO Raised' (not 'In Stock') since that PO is still
  // 'Sent', not yet received; markAssetsInStockForPO() (called from
  // purchaseStore.js once a real GRN against PO-000010 is confirmed) will
  // flip this to 'In Stock' the same way it does for a live Add Asset → Save
  // & Raise PO asset. kitComponents carries no receivedStatus yet — that's
  // only set once GRN receipt actually confirms each one — so the Purchases
  // wizard's Select PO step can pull this in as a genuine "not yet
  // received" Splicing Machine case.
  {
    id: 'AST-2026-000013',
    categoryId: 'field-splicing-tools', categoryLabel: 'Field & Splicing Tools',
    typeId: 'splicing-machine', typeLabel: 'Splicing Machine',
    fields: {
      assetName: 'Fusion Splicer Unit C', brandName: 'Fujikura', modelName: '80S',
      serialNumber: 'FJK-80S-2026-0013',
      purchaseDate: '2026-08-29', warrantyStartDate: '2026-08-29', warrantyEndDate: '2028-08-28',
      vendorId: 'VEN-001',
      kitComponents: [
        { id: 'kc-seed-13a', componentType: 'Cleaver', componentName: 'CT-50 Cleaver', serialNumber: 'CLV-2026-0013', quantity: 1, condition: 'New' },
        { id: 'kc-seed-13b', componentType: 'Clamping Tool', componentName: 'Fiber Clamp Set', serialNumber: 'CLT-2026-0013', quantity: 1, condition: 'New' },
        { id: 'kc-seed-13c', componentType: 'Carrying Case', componentName: 'Hard Transport Case', serialNumber: 'CC-2026-0013', quantity: 1, condition: 'New' },
      ],
    },
    status: 'PO Raised', assignedTo: null, poId: 'PO-000010',
    createdBy: 'Rajesh Patel', createdAt: '2026-08-29T10:30:00.000Z',
  },
]

// hasMissingComponents/returnHistory/warrantyAlertsSent/retirementInfo/
// lostInfo default onto every seed asset here (mirrors
// purchaseOrderStore.js's own seed `.map(po => ({ ...po, poType:
// 'Standard', ... }))` pattern) rather than repeating them all on every
// SEED literal above — most seed assets have never been through a return,
// fired a warranty alert, or been retired/reported lost; AST-2026-000010
// overrides hasMissingComponents/returnHistory with its own real values
// (defaults spread first so the literal's own fields win).
let _assets = SEED.map(a => ({ hasMissingComponents: false, returnHistory: [], warrantyAlertsSent: [], retirementInfo: null, lostInfo: null, ...a }))
let _nextSeq = SEED.length + 1
let _nextReturnSeq = 2
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
    // Phase 6 — populated by checkWarrantyAlerts() below; a brand-new
    // asset has never fired a warranty alert.
    warrantyAlertsSent: [],
    // Phase 8 — populated by retireAsset()/reportAssetLost() below; a
    // brand-new asset has never been retired or reported lost.
    retirementInfo: null,
    lostInfo: null,
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
  addNotification({
    type: 'asset_assigned',
    title: 'Asset Assigned',
    description: `Asset ${assetId} (${assetDisplayName(asset)}) assigned to ${engineerName}.`,
    meta: `For ${engineerName} & Store Manager`,
    reference: assetId,
    color: 'blue',
  })
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

  addNotification({
    type: 'asset_returned',
    title: 'Asset Returned',
    description: `Asset ${assetId} returned from ${entry.previousEngineer ?? 'engineer'} — condition: ${condition}.`,
    meta: 'For Store Manager',
    reference: assetId,
    color: 'blue',
  })

  // Return flagged with discrepancy — a distinct notification from the
  // plain return one above, mirroring purchaseStore.js's own
  // 'purchase_discrepancy' GRN notification (same yellow "needs a look"
  // color) rather than folding it into the return notification's text.
  if (hasMissingComponents) {
    addNotification({
      type: 'asset_return_missing_components',
      title: 'Return Discrepancy — Missing Components',
      description: `Asset ${assetId}: ${missingComponentIds.length} kit component(s) reported missing at return.`,
      meta: 'For Store Manager',
      reference: assetId,
      color: 'yellow',
    })
  }

  return updated
}

// Phase 6 — Warranty Management (PRD Section 9). This app has no
// background job/cron, so there's no way to fire an alert the instant an
// asset's warranty actually crosses a threshold — instead this scans on
// demand, called from AssetList.jsx/AssetDetail.jsx on page load. Only
// 'In Stock'/'Assigned' assets are checked (a Draft/PO Raised asset isn't
// deployed yet, and an Under Repair one is already flagged some other
// way). warrantyAlertsSent stores one key per (threshold, day) already
// notified — e.g. '30d-2026-08-30' — so a re-scan later the same day never
// re-notifies for the same asset+threshold, but a threshold nobody
// addressed can still fire again the following day rather than going
// permanently silent after its first alert.
export const WARRANTY_ALERT_THRESHOLDS = [30, 15, 7]

export function checkWarrantyAlerts() {
  const today = new Date().toISOString().slice(0, 10)
  let changed = false

  _assets = _assets.map(asset => {
    if (asset.status !== 'In Stock' && asset.status !== 'Assigned') return asset
    const days = daysUntilWarrantyEnd(asset)
    if (days === null || days < 0) return asset
    const threshold = WARRANTY_ALERT_THRESHOLDS.find(t => days <= t)
    if (threshold == null) return asset
    const alertKey = `${threshold}d-${today}`
    if ((asset.warrantyAlertsSent || []).includes(alertKey)) return asset

    addNotification({
      type: 'asset_warranty_expiring',
      title: 'Asset Warranty Expiring Soon',
      description: `${assetDisplayName(asset)} (${asset.id}) warranty expires in ${days} day${days === 1 ? '' : 's'}.`,
      meta: `${threshold}-day alert`,
      reference: asset.id,
      color: 'yellow',
    })
    changed = true
    return { ...asset, warrantyAlertsSent: [...(asset.warrantyAlertsSent || []), alertKey] }
  })

  if (changed) notify()
}

// Phase 8 — Retirement (PRD Section 12.4). A manual admin action, never
// automatic — including after a repair resolves as 'Beyond Repair', which
// deliberately leaves the asset 'Under Repair' rather than retiring it
// itself (see resolveRepair()'s own note in assetRepairStore.js); an admin
// still has to retire it explicitly from here. Allowed from any status
// except the two other terminal ones ('Retired'/'Lost') — retirement can
// follow Beyond Repair, obsolescence, or end-of-life regardless of whether
// the asset is currently In Stock, Assigned, or Under Repair.
export function retireAsset(assetId, { reason, retiredBy = 'Admin User' }) {
  const asset = getAsset(assetId)
  if (!asset) throw new Error('Asset not found.')
  if (asset.status === 'Retired' || asset.status === 'Lost') throw new Error('This asset has already been retired or reported lost.')
  if (!ASSET_RETIREMENT_REASONS.includes(reason)) throw new Error('Select a valid retirement reason.')

  const retirementInfo = { reason, date: new Date().toISOString(), retiredBy }
  const updated = { ...asset, status: 'Retired', retirementInfo }
  _assets = _assets.map(a => a.id === assetId ? updated : a)
  notify()
  logAudit({ action: 'Edit', module: 'Assets', details: `Retired asset ${assetId} — ${assetDisplayName(asset)} — reason: ${reason}` })
  return updated
}

// Phase 8 — Lost/Stolen (PRD Section 12.5): "can be reported at any time,
// not only at return." Allowed from 'In Stock', 'Assigned', or 'Under
// Repair' — not from the two terminal statuses. When componentId is given
// (Splicing Machine kit component only), just that component's own
// receivedStatus flips to 'Lost' (reusing the same Received/Missing/Lost
// vocabulary the Kit Components table already renders — see Phase 3) and
// the parent asset's status is untouched, since the rest of the kit is
// still usable; lostInfo is still recorded on the parent for an audit
// trail of who/when/why, just with its own componentId set rather than
// null. Without componentId (the whole asset is lost/stolen), the asset
// itself moves to 'Lost' — a terminal status excluded from
// assignable/active inventory (AssetList.jsx/AssetDetail.jsx never show
// "Assign" once status is 'Lost').
const LOST_ELIGIBLE_STATUSES = ['In Stock', 'Assigned', 'Under Repair']

export function reportAssetLost(assetId, { reason, reportedBy = 'Admin User', componentId = null }) {
  const asset = getAsset(assetId)
  if (!asset) throw new Error('Asset not found.')
  if (asset.status === 'Retired' || asset.status === 'Lost') throw new Error('This asset has already been retired or reported lost.')
  if (!reason?.trim()) throw new Error('A reason is required.')

  const lostInfo = { reason: reason.trim(), date: new Date().toISOString(), reportedBy, componentId: componentId || null }

  if (componentId) {
    const existingKitComponents = asset.fields?.kitComponents
    if (!Array.isArray(existingKitComponents) || !existingKitComponents.some(c => c.id === componentId)) {
      throw new Error('Select a valid kit component to report lost.')
    }
    const updatedKitComponents = existingKitComponents.map(c => c.id === componentId ? { ...c, receivedStatus: 'Lost' } : c)
    const updated = { ...asset, fields: { ...asset.fields, kitComponents: updatedKitComponents }, lostInfo }
    _assets = _assets.map(a => a.id === assetId ? updated : a)
    notify()
    logAudit({ action: 'Edit', module: 'Assets', details: `Reported a kit component lost on asset ${assetId} — ${assetDisplayName(asset)}` })
    return updated
  }

  if (!LOST_ELIGIBLE_STATUSES.includes(asset.status)) throw new Error('This asset cannot be reported lost from its current status.')
  const updated = { ...asset, status: 'Lost', lostInfo }
  _assets = _assets.map(a => a.id === assetId ? updated : a)
  notify()
  logAudit({ action: 'Edit', module: 'Assets', details: `Reported asset ${assetId} — ${assetDisplayName(asset)} — lost` })
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

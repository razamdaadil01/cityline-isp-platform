// Project Management store — module-level pub/sub pattern (mirrors
// vendorStore.js/productStore.js). Phase 1: foundation only — ID generation,
// base record shapes, and empty getter/subscribe/save scaffolding for the
// two project types. Segments, work orders, and the full creation forms are
// built in Phase 2 (HDD) and Phase 5 (Site).

import { logAudit } from './auditLogStore'

export const PROJECT_STATUSES = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled']

// Planned Technical Specifications master lists (HDD Project Creation Form,
// Phase 2) — plain exported arrays, same "editable master list" idiom as
// PAYMENT_TERMS in vendorStore.js / UNIT_TYPES in productStore.js. Nothing
// in the app has a Settings-managed editable-master-list UI yet, so these
// stay static constants here rather than a DB-backed list.
export const DUCT_TYPES = ['40mm PLB HDPE Duct', '2-Way Coupled Duct']
export const FIBER_CORE_SIZES = ['48-Core Armored Fiber', '96-Core Armored Fiber']
export const DISTANCE_UNITS = ['Meters', 'Kilometers']

// HDD Work Order Creation Form (Phase 3) master lists.
export const WORK_ORDER_STATUSES = ['Assigned', 'In-Progress', 'Completed']
export const LABOUR_RATE_TYPES = ['Daily Wage — Per Person', 'Fixed Daily Contractor Labour Charge']

// ── ID generation ────────────────────────────────────────────────────────
// Same PREFIX-YYYY-#### shape as customersData.js's nextIntercomCustomerId()
// (RES/ENT-style ids), and the same simple incrementing-counter idiom as
// purchaseStore.js's nextPurchaseNumber() for the two Work Order ids, which
// have no year segment.

let _nextHDDProjectSeq = 1
export function generateHDDProjectId() {
  const year = new Date().getFullYear()
  return `HDD-${year}-${String(_nextHDDProjectSeq++).padStart(4, '0')}`
}

let _nextSiteProjectSeq = 1
export function generateSiteProjectId() {
  const year = new Date().getFullYear()
  return `PRJ-SITE-${year}-${String(_nextSiteProjectSeq++).padStart(4, '0')}`
}

let _nextHDDWorkOrderSeq = 1
export function generateHDDWorkOrderId() {
  return `WO-HDD-${String(_nextHDDWorkOrderSeq++).padStart(4, '0')}`
}

let _nextSiteWorkOrderSeq = 1
export function generateSiteWorkOrderId() {
  return `WO-SITE-${String(_nextSiteWorkOrderSeq++).padStart(4, '0')}`
}

// ── Data model stubs ─────────────────────────────────────────────────────
//
// HDDProject — HDD / Backbone Route Project:
//   id               string   generateHDDProjectId(), e.g. "HDD-2026-0012"
//   title            string
//   siteIncharge     string   userStore.js user id (Site Incharge / Project Owner)
//   status           string   one of PROJECT_STATUSES
//   routeGeometry    object   { start: {name, lat, lng}, end: {name, lat, lng} }
//   distance         number   total estimated route distance, in distanceUnit
//   distanceUnit     string   one of DISTANCE_UNITS
//   technicalSpecs   object   { ductType, fiberCoreSize, plannedChambers }
//   vendor           string   vendorStore.js vendor id (HDD Contractor)
//   drillingRate     number   snapshot of getVendorDrillingRate(vendor) at creation (admin-overridable)
//   capex            object   placeholder for capital-expenditure figures (Phase 4)
//   workOrders       array    HDDWorkOrder[] — nested on the project record (Phase 3)
//   drilledDistance  number   sum of lengthDrilled across every segment of every work order, in meters —
//                             recalculated by saveHDDWorkOrder() on every save
//   createdAt        string   ISO date
//
// HDDWorkOrder — one HDD project's daily execution unit (Phase 3):
//   id                 string   generateHDDWorkOrderId(), e.g. "WO-HDD-0012"
//   projectId          string   parent HDDProject id
//   assignedEngineer   string   userStore.js user id
//   executionDate      string   ISO date
//   status             string   one of WORK_ORDER_STATUSES
//   requiredMaterials  array    [{ itemId, quantity }] — itemId is a productStore.js product id
//   segments           array    Segment[] (see below)
//   labour             object   { headcount, rateType, dailyRate, totalCost } — rateType one of
//                                LABOUR_RATE_TYPES; dailyRate is null for the Fixed rate type;
//                                totalCost is headcount × dailyRate for Per-Person, or the
//                                admin-entered fixed amount otherwise
//   remarks            string   daily site notes
//   attachments        array    [{ name, sizeLabel }] — filenames only, no real upload backend (matches
//                                TicketCreate.jsx's attachment convention)
//   createdAt          string   ISO date
//
// Segment — one drilled stretch within a work order (Phase 3):
//   id                 string   client-generated, not persisted-unique across work orders
//   startPointName     string
//   endPointName       string
//   lengthDrilled      number   meters
//   shotsTaken         number
//   ductsUsed          number   meters
//   couplersUsed       number
//   chambersInstalled  number
//   chamberTag         string|null   auto-assigned e.g. "CH-01" when chambersInstalled > 0 — sequential
//                                     per project across all its segments (every work order), not global
//
// SiteProject — Site Project (FTTH/Commercial):
//   id               string   generateSiteProjectId(), e.g. "PRJ-SITE-2026-0089"
//   name             string
//   builderName      string
//   contactPerson    string
//   siteType         string   e.g. "FTTH" | "Commercial"
//   capacity         number   placeholder for planned home/unit count
//   competitors      array    placeholder list of competing ISPs at the site
//   status           string   one of PROJECT_STATUSES
//   capex            object   placeholder for capital-expenditure figures (Phase 5)
//   createdAt        string   ISO date

// Seed data so there's a ready-made HDD project on app load (for testing
// the Work Order flow without recreating one every session) — same
// literal-id-plus-bumped-sequence convention as vendorStore.js's/
// productStore.js's SEED arrays. Zero work orders, so its Work Orders tab
// starts empty. VEN-001 (ZTE India Ltd) is seeded in vendorStore.js as an
// HDD Contractor with a ₹220/m drilling rate to match.
const HDD_SEED = [
  {
    id: 'HDD-2026-0001',
    title: 'Sector 62 Backbone Route',
    siteIncharge: 'u2', // Anita Sharma (userStore.js)
    status: 'In Progress',
    routeGeometry: {
      start: { name: 'Sector 62 Gate', lat: 28.6139, lng: 77.2090 },
      end: { name: 'Sector 128 Chowk', lat: 28.5921, lng: 77.3266 },
    },
    distance: 2500,
    distanceUnit: 'Meters',
    technicalSpecs: { ductType: '40mm PLB HDPE Duct', fiberCoreSize: '48-Core Armored Fiber', plannedChambers: 6 },
    vendor: 'VEN-001',
    drillingRate: 220,
    capex: null,
    workOrders: [],
    drilledDistance: 0,
    createdAt: '2026-08-01',
  },
]

let _hddProjects = [...HDD_SEED]
let _siteProjects = []
const _listeners = []

// Continue the id sequence after the seeded project above so a live-created
// HDD project never collides with it (same pattern as vendorStore.js's
// `_nextSeq = _vendors.length + 1`).
_nextHDDProjectSeq = HDD_SEED.length + 1

function notify() { _listeners.forEach(fn => fn({ hddProjects: [..._hddProjects], siteProjects: [..._siteProjects] })) }

export function getHDDProjects() { return _hddProjects }
export function getSiteProjects() { return _siteProjects }
export function getHDDProject(id) { return _hddProjects.find(p => p.id === id) ?? null }
export function getSiteProject(id) { return _siteProjects.find(p => p.id === id) ?? null }

export function subscribeProjects(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

export function saveHDDProject(project) {
  const id = project.id ?? generateHDDProjectId()
  const isNew = !_hddProjects.some(p => p.id === id)
  const saved = {
    status: PROJECT_STATUSES[0], routeGeometry: null, distance: null, distanceUnit: DISTANCE_UNITS[0],
    technicalSpecs: null, vendor: null, drillingRate: null, capex: null,
    workOrders: [], drilledDistance: 0,
    createdAt: new Date().toISOString().split('T')[0],
    ...project, id,
  }
  _hddProjects = isNew ? [..._hddProjects, saved] : _hddProjects.map(p => p.id === id ? saved : p)
  notify()
  logAudit({ action: isNew ? 'Create' : 'Edit', module: 'Projects', details: `${isNew ? 'Created' : 'Updated'} HDD project ${saved.title} (${saved.id})` })
  return saved
}

// ── HDD Work Orders (Phase 3) ───────────────────────────────────────────
// Nested on the parent HDDProject record (project.workOrders) rather than
// a separate top-level array — simplest shape given HDDProject already
// exists and every read/write is always scoped to one project.

export function getHDDWorkOrders(projectId) {
  return getHDDProject(projectId)?.workOrders ?? []
}

// Chamber tags are sequential per project across every segment of every
// work order (never reused, never reset per work order) — shared by
// saveHDDWorkOrder() and previewChamberTags() below so the tag a user sees
// while filling the form is exactly the tag it gets on save. excludeId lets
// re-saving an existing work order recompute its own segments' tags without
// double-counting its previous ones.
function computeSegmentsWithChamberTags(existingWorkOrders, segments, excludeId) {
  let chamberSeq = 0
  existingWorkOrders.forEach(wo => {
    if (wo.id === excludeId) return
    ;(wo.segments ?? []).forEach(seg => {
      const m = seg.chamberTag?.match(/^CH-(\d+)$/)
      if (m) chamberSeq = Math.max(chamberSeq, Number(m[1]))
    })
  })
  return segments.map(seg => {
    const chambersInstalled = Number(seg.chambersInstalled) || 0
    const chamberTag = chambersInstalled > 0 ? `CH-${String(++chamberSeq).padStart(2, '0')}` : null
    return { ...seg, chambersInstalled, chamberTag }
  })
}

// Non-consuming — safe to call on every render while the Add Work Order
// form is open, mirrors productStore.js's previewNextProductId(). Lets the
// Segments Builder show the real chamber tag a segment will get before the
// work order is actually saved.
export function previewChamberTags(projectId, segments, excludeWorkOrderId = null) {
  const existingWorkOrders = getHDDWorkOrders(projectId)
  return computeSegmentsWithChamberTags(existingWorkOrders, segments, excludeWorkOrderId)
}

export function saveHDDWorkOrder(projectId, workOrder) {
  const project = getHDDProject(projectId)
  if (!project) return null

  const existingWorkOrders = project.workOrders ?? []
  const id = workOrder.id ?? generateHDDWorkOrderId()
  const isNew = !existingWorkOrders.some(w => w.id === id)
  const segments = computeSegmentsWithChamberTags(existingWorkOrders, workOrder.segments ?? [], id)

  const saved = {
    status: WORK_ORDER_STATUSES[0], requiredMaterials: [], labour: null,
    remarks: '', attachments: [],
    createdAt: new Date().toISOString().split('T')[0],
    ...workOrder, id, projectId, segments,
  }

  const newWorkOrders = isNew ? [...existingWorkOrders, saved] : existingWorkOrders.map(w => w.id === id ? saved : w)
  const drilledDistance = newWorkOrders.reduce(
    (sum, wo) => sum + (wo.segments ?? []).reduce((s, seg) => s + (Number(seg.lengthDrilled) || 0), 0),
    0
  )

  _hddProjects = _hddProjects.map(p => p.id === projectId ? { ...p, workOrders: newWorkOrders, drilledDistance } : p)
  notify()
  logAudit({
    action: isNew ? 'Create' : 'Edit', module: 'Projects',
    details: `${isNew ? 'Created' : 'Updated'} work order ${saved.id} for HDD project ${project.title} (${projectId})`,
  })
  return saved
}

export function saveSiteProject(project) {
  const id = project.id ?? generateSiteProjectId()
  const isNew = !_siteProjects.some(p => p.id === id)
  const saved = {
    status: PROJECT_STATUSES[0], builderName: '', contactPerson: '', siteType: 'FTTH',
    capacity: null, competitors: [], capex: null,
    createdAt: new Date().toISOString().split('T')[0],
    ...project, id,
  }
  _siteProjects = isNew ? [..._siteProjects, saved] : _siteProjects.map(p => p.id === id ? saved : p)
  notify()
  logAudit({ action: isNew ? 'Create' : 'Edit', module: 'Projects', details: `${isNew ? 'Created' : 'Updated'} site project ${saved.name} (${saved.id})` })
  return saved
}

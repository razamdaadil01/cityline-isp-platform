// Project Management store — module-level pub/sub pattern (mirrors
// vendorStore.js/productStore.js). Phase 1: foundation only — ID generation,
// base record shapes, and empty getter/subscribe/save scaffolding for the
// two project types. Segments, work orders, and the full creation forms are
// built in Phase 2 (HDD) and Phase 5 (Site).

import { logAudit } from './auditLogStore'
import { getProducts } from './productStore'

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

// Site Project Creation Form (Phase 5) master lists. SITE_PROJECT_STATUSES
// is a distinct lifecycle from HDD's PROJECT_STATUSES — a site project
// moves NEW → SURVEY → ACQUIRED → IN_EXECUTION → Live, nothing like HDD's
// Planning/On Hold/Cancelled set, so it gets its own array rather than
// reusing that one.
export const SITE_TYPES = ['Residential', 'Commercial', 'Mixed-Use']
export const COMPETITOR_OPTIONS = ['Airtel', 'Jio Fiber', 'Tata Play', 'Local LCO', 'None/Monopoly']
export const SITE_PROJECT_STATUSES = ['NEW', 'SURVEY', 'ACQUIRED', 'IN_EXECUTION', 'Live']

// Site Work Order Creation Form (Phase 6) master list.
export const SITE_ACTIVITY_TYPES = [
  'Vertical Riser & Ducting',
  'Distribution Fiber Pulling',
  'FAT Box Mounting & Splicing',
  'POP Room Rack & OLT Setup',
  'Final Optical Testing',
]

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
// SiteProject — Site Project (FTTH/Commercial), Phase 5:
//   id                    string   generateSiteProjectId(), e.g. "PRJ-SITE-2026-0089"
//   name                  string   Project Site Name, e.g. "Ace City"
//   builderName           string
//   contactPerson         string
//   contactNumber         string
//   address               string
//   pincode               string
//   geo                   object   { lat, lng }
//   siteType              string   one of SITE_TYPES
//   capacity              object   shape depends on siteType —
//                                  Residential: { homePasses, flatsCount, towersCount }
//                                  Commercial:  { shopUnits }
//                                  Mixed-Use:   { residentialUnits, commercialUnits }
//   competitors           array    subset of COMPETITOR_OPTIONS
//   expectedClosureDate   string   ISO date
//   status                string   one of SITE_PROJECT_STATUSES, defaults to 'NEW'
//   capex                 object   placeholder for capital-expenditure figures (later phase)
//   workOrders            array    SiteWorkOrder[] — nested on the project record (Phase 6)
//   createdAt             string   ISO date
//
// SiteWorkOrder — one Site Project's building-centric work unit (Phase 6),
// distinct from HDD's route/segment model:
//   id                   string   generateSiteWorkOrderId(), e.g. "WO-SITE-0012"
//   siteProjectId        string   parent SiteProject id
//   activityType         string   one of SITE_ACTIVITY_TYPES
//   targetLocation       string   free text, e.g. "Tower A - Floors 1 to 10"
//   requiredMaterials    array    [{ itemId, quantity }] — itemId is a productStore.js product id
//   assignedTechnicians  array    userStore.js user ids (multi-select)
//   executionDate        string   ISO date
//   targetDeadline       string   ISO date
//   dprEntries           array    DPREntry[] (see below)
//   createdAt            string   ISO date
//
// DPREntry — one Daily Progress Report entry logged against a work order:
//   id                     string   generated by addDPREntry(), e.g. "DPR-0001"
//   date                   string   ISO date
//   workDoneToday          string
//   materialConsumed       array    [{ itemId, quantity }]
//   barcodesScanned        array    string[] — manually typed/pasted, no real scanner hardware
//   installationLocation   string   free text, e.g. "Floor 1-6"

// Seed data so there's a ready-made HDD project on app load (for testing
// the Work Order flow without recreating one every session) — same
// literal-id-plus-bumped-sequence convention as vendorStore.js's/
// productStore.js's SEED arrays. VEN-001 (ZTE India Ltd) is seeded in
// vendorStore.js as an HDD Contractor with a ₹220/m drilling rate to match.
//
// One work order (WO-HDD-0001) is seeded too, with one completed segment,
// so the CAPEX engine and Work Orders tab have real data on load instead of
// all-zero placeholders:
//   - Drilled Distance: segment.lengthDrilled (120) sums straight into
//     drilledDistance below → header progress bar reads "120m / 2500m — 5%".
//   - Drilling Cost: 120 (lengthDrilled) × 220 (project.drillingRate) = ₹26,400.
//   - Labour Charges: this work order's labour.totalCost = ₹3,000
//     (6 workers × ₹500/day, per-person rate type).
//   - Material Cost: segment.ductsUsed (120) × the "40mm PLB HDPE Duct"
//     product's purchasePrice (₹35, seeded in productStore.js) = ₹4,200,
//     plus segment.couplersUsed (2) × "Coupler"'s purchasePrice (₹50) =
//     ₹100 → ₹4,300 total, resolved live by getHDDProjectCapex()'s
//     name-matching logic against project.technicalSpecs.ductType.
//   - Live Total CAPEX: 26,400 + 3,000 + 4,300 = ₹33,700 on load.
// requiredMaterials references the same two productStore.js items by id
// (looked up by name below, not hardcoded, so it can't drift out of sync
// with productStore.js's own id numbering) — it doesn't feed the CAPEX
// calc (that's driven by the segment fields above), it's just the
// material-allocation record the work order form itself would have saved.
const _seedDuctProduct = getProducts().find(p => p.name === '40mm PLB HDPE Duct')
const _seedCouplerProduct = getProducts().find(p => p.name === 'Coupler')

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
    workOrders: [
      {
        id: 'WO-HDD-0001',
        projectId: 'HDD-2026-0001',
        assignedEngineer: 'u3', // Arjun Kumar (userStore.js, role: engineer)
        executionDate: new Date().toISOString().slice(0, 10),
        status: 'Completed',
        requiredMaterials: [
          ...(_seedDuctProduct ? [{ itemId: _seedDuctProduct.id, quantity: 300 }] : []),
          ...(_seedCouplerProduct ? [{ itemId: _seedCouplerProduct.id, quantity: 6 }] : []),
        ],
        segments: [
          {
            id: 'seg-hdd-2026-0001-1',
            startPointName: 'Sector 62 Gate',
            endPointName: 'Metro Pillar 142',
            lengthDrilled: 120,
            shotsTaken: 2,
            ductsUsed: 120,
            couplersUsed: 2,
            chambersInstalled: 1,
            chamberTag: 'CH-01',
          },
        ],
        labour: {
          headcount: 6,
          rateType: 'Daily Wage — Per Person',
          dailyRate: 500,
          totalCost: 3000,
        },
        remarks: 'Hit gas pipeline, 1 hr delay',
        attachments: [],
        createdAt: new Date().toISOString().slice(0, 10),
      },
    ],
    drilledDistance: 120,
    createdAt: '2026-08-01',
  },
]

let _hddProjects = [...HDD_SEED]
let _siteProjects = []
const _listeners = []

// Continue the id sequences after the seeded project/work order above so a
// live-created one never collides with them (same pattern as vendorStore.js's
// `_nextSeq = _vendors.length + 1`).
_nextHDDProjectSeq = HDD_SEED.length + 1
_nextHDDWorkOrderSeq = HDD_SEED[0].workOrders.length + 1

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

// ── HDD Project CAPEX (Phase 4) ─────────────────────────────────────────
// Pure computed-on-read functions, not a stored/cached field — CAPEX
// depends on Product Management's Purchase Price too (not just the
// project's own saved data), so recomputing from scratch on every call is
// what keeps it "live" if an item's price changes later, not just when a
// work order is saved. Called directly from the Project Details page,
// which already re-renders on every projectStore change via
// subscribeProjects (same reactivity as Drilled Distance).

// Best-effort match against Product Management: find an item whose name
// contains `keyword` (case-insensitive) and has a Purchase Price set.
// Ducts are matched against the project's own technicalSpecs.ductType
// (e.g. "40mm PLB HDPE Duct") since that's the exact duct this project
// uses; Couplers have no per-project spec, so they're matched against the
// generic keyword "coupler" instead. Neither duct types nor a "Coupler"
// item exist in Product Management's seed data today, so this normally
// falls back to ₹0 — logged once per keyword (not on every render) so a
// missing master item is easy to notice without spamming the console.
const _warnedMissingCapexItems = new Set()
function findItemPurchasePrice(products, keyword, contextLabel) {
  const q = keyword.trim().toLowerCase()
  const match = products.find(p => p.name.toLowerCase().includes(q))
  if (!match || match.purchasePrice == null) {
    if (!_warnedMissingCapexItems.has(q)) {
      _warnedMissingCapexItems.add(q)
      console.warn(`[projectStore] No Product Management item with a Purchase Price found matching "${keyword}" (${contextLabel}) — treating as ₹0. Add a matching item in Product Management to price this automatically.`)
    }
    return 0
  }
  return match.purchasePrice
}

export function getHDDProjectCapex(projectId) {
  const project = getHDDProject(projectId)
  if (!project) return { drillingCost: 0, labourCharges: 0, materialCost: 0, totalCapex: 0 }

  const workOrders = project.workOrders ?? []
  const allSegments = workOrders.flatMap(wo => wo.segments ?? [])

  // 1. Contractor Drilling Cost — Σ (segment.lengthDrilled × project.drillingRate)
  const drillingRate = Number(project.drillingRate) || 0
  const drillingCost = allSegments.reduce((sum, seg) => sum + (Number(seg.lengthDrilled) || 0) * drillingRate, 0)

  // 2. Labour Charges — Σ (workOrder.labour.totalCost)
  const labourCharges = workOrders.reduce((sum, wo) => sum + (Number(wo.labour?.totalCost) || 0), 0)

  // 3. Material / Hardware Cost — segments don't record per-item material
  // consumption directly, only ductsUsed (meters) and couplersUsed (count),
  // so those are priced against Product Management's Purchase Price instead
  // of requiredMaterials (which is a separate, unrelated allocation list).
  const products = getProducts()
  const ductPricePerMeter = findItemPurchasePrice(products, project.technicalSpecs?.ductType || 'duct', `${projectId}'s duct type`)
  const couplerPricePerUnit = findItemPurchasePrice(products, 'coupler', `${projectId}'s couplers`)
  const materialCost = allSegments.reduce((sum, seg) => {
    const ductCost = (Number(seg.ductsUsed) || 0) * ductPricePerMeter
    const couplerCost = (Number(seg.couplersUsed) || 0) * couplerPricePerUnit
    return sum + ductCost + couplerCost
  }, 0)

  // 4. Total HDD Project CAPEX
  const totalCapex = drillingCost + labourCharges + materialCost

  return { drillingCost, labourCharges, materialCost, totalCapex }
}

export function saveSiteProject(project) {
  const id = project.id ?? generateSiteProjectId()
  const isNew = !_siteProjects.some(p => p.id === id)
  const saved = {
    status: SITE_PROJECT_STATUSES[0], builderName: '', contactPerson: '', contactNumber: '',
    address: '', pincode: '', geo: null, siteType: SITE_TYPES[0],
    capacity: null, competitors: [], expectedClosureDate: null, capex: null,
    workOrders: [],
    createdAt: new Date().toISOString().split('T')[0],
    ...project, id,
  }
  _siteProjects = isNew ? [..._siteProjects, saved] : _siteProjects.map(p => p.id === id ? saved : p)
  notify()
  logAudit({ action: isNew ? 'Create' : 'Edit', module: 'Projects', details: `${isNew ? 'Created' : 'Updated'} site project ${saved.name} (${saved.id})` })
  return saved
}

// ── Site Work Orders & DPR (Phase 6) ─────────────────────────────────────
// Nested on the parent SiteProject record (project.workOrders), same
// "simplest shape given the parent record already exists" reasoning as HDD
// Work Orders in Phase 3 — but building-centric (activity type + target
// location + assigned technicians) rather than route/segment-based.

export function getSiteWorkOrders(siteProjectId) {
  return getSiteProject(siteProjectId)?.workOrders ?? []
}

// Single-argument save — unlike saveHDDWorkOrder(projectId, workOrder),
// the site project id lives on the work order itself (siteProjectId), so
// there's nothing extra the caller needs to pass separately.
export function saveSiteWorkOrder(workOrder) {
  const siteProjectId = workOrder.siteProjectId
  const project = getSiteProject(siteProjectId)
  if (!project) return null

  const existingWorkOrders = project.workOrders ?? []
  const id = workOrder.id ?? generateSiteWorkOrderId()
  const isNew = !existingWorkOrders.some(w => w.id === id)

  const saved = {
    requiredMaterials: [], assignedTechnicians: [], dprEntries: [],
    createdAt: new Date().toISOString().split('T')[0],
    ...workOrder, id, siteProjectId,
  }

  const newWorkOrders = isNew ? [...existingWorkOrders, saved] : existingWorkOrders.map(w => w.id === id ? saved : w)
  _siteProjects = _siteProjects.map(p => p.id === siteProjectId ? { ...p, workOrders: newWorkOrders } : p)
  notify()
  logAudit({
    action: isNew ? 'Create' : 'Edit', module: 'Projects',
    details: `${isNew ? 'Created' : 'Updated'} work order ${saved.id} for site project ${project.name} (${siteProjectId})`,
  })
  return saved
}

let _nextDPREntrySeq = 1
function nextDPREntryId() {
  return `DPR-${String(_nextDPREntrySeq++).padStart(4, '0')}`
}

// Looks the work order up by id across every site project rather than
// taking a siteProjectId param — site work order ids are already globally
// unique (one shared generateSiteWorkOrderId() counter), so there's no
// ambiguity, and it keeps this call sitting one level above "which project
// is this on" the same way the DPR form itself only ever knows the work
// order it's attached to.
export function addDPREntry(workOrderId, entry) {
  let savedEntry = null
  let parentProject = null
  _siteProjects = _siteProjects.map(p => {
    if (!(p.workOrders ?? []).some(w => w.id === workOrderId)) return p
    parentProject = p
    const newWorkOrders = p.workOrders.map(wo => {
      if (wo.id !== workOrderId) return wo
      savedEntry = {
        id: nextDPREntryId(),
        date: entry.date || new Date().toISOString().split('T')[0],
        workDoneToday: entry.workDoneToday || '',
        materialConsumed: entry.materialConsumed || [],
        barcodesScanned: entry.barcodesScanned || [],
        installationLocation: entry.installationLocation || '',
      }
      return { ...wo, dprEntries: [...(wo.dprEntries ?? []), savedEntry] }
    })
    return { ...p, workOrders: newWorkOrders }
  })

  if (!savedEntry) return null
  notify()
  logAudit({
    action: 'Edit', module: 'Projects',
    details: `Added DPR entry to work order ${workOrderId} for site project ${parentProject.name} (${parentProject.id})`,
  })
  return savedEntry
}

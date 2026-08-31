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
//   createdAt        string   ISO date
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

let _hddProjects = []
let _siteProjects = []
const _listeners = []

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
    createdAt: new Date().toISOString().split('T')[0],
    ...project, id,
  }
  _hddProjects = isNew ? [..._hddProjects, saved] : _hddProjects.map(p => p.id === id ? saved : p)
  notify()
  logAudit({ action: isNew ? 'Create' : 'Edit', module: 'Projects', details: `${isNew ? 'Created' : 'Updated'} HDD project ${saved.title} (${saved.id})` })
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

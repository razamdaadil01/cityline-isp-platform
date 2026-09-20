// POP (Point of Presence) store — module-level pub/sub pattern, same
// isNew/sequence-id create-or-update convention as departmentStore.js/
// storeStore.js. First real persisted store for network sites/equipment —
// Network.jsx's Topology view (SWITCHES/OLTS) and NetworkServers.jsx
// (Jaze/IPACCAT SERVERS) are still flat, unlinked, hardcoded mock arrays of
// their own; wiring them to read from here is explicitly a follow-up, not
// done by this store.
//
// A POP's `locality` field references areaMappingStore.js's geographic
// hierarchy by its natural compound key ({ state, district, area, locality
// }) rather than duplicating any of that data here — look it up with
// areaMappingStore's own getLocalityInfo(state, district, area, locality)
// when POP-side detail (siteType, branchCode, intercomSite) is ever needed.
// It's nullable: not every POP sits in an already-mapped locality (see the
// seeded Core POP below, at the corporate HQ address rather than a
// customer-facing neighborhood).
//
// Equipment (OLT/Switch records) is nested directly on the POP record,
// same convention as HDD Work Orders' segments/requiredMaterials in
// projectStore.js — there's no cross-POP reference to an equipment id
// anywhere yet, so a flat per-POP array (not a separate top-level store) is
// the simplest shape. Field set is deliberately the trimmed one requested
// (id, type, label, ip, model, ports, portsUsed, status, plus the one
// OLT-only/Switch-only extra each already carried) — Network.jsx's own
// mock devices additionally carry `subtitle` (a per-device location label)
// and `uptime` (a live monitoring stat); subtitle's job is now done once by
// the parent POP's own name/address instead of repeated per device, and
// uptime isn't a value an admin hand-enters when registering equipment, so
// neither is part of this persisted schema.
//
// ── POP Master PRD expansion ─────────────────────────────────────────────
// Extends the original trimmed schema above with the fields the client's
// POP Master PRD calls for: POP Type/Category classification, a link back
// to the Projects module, richer site/ownership/contact detail, a Site
// Photos/Documents upload, and a broader lifecycle Status enum. New id
// generation (generatePOPId) sits alongside the old sequential id — see its
// own comment below — rather than replacing savePOP()'s isNew/id
// convention, and Power Backup keeps its original `powerBackup` enum
// (the backup *equipment type* — UPS/Generator/None) as a separate field
// from the new `hasBackupPower`/`backupHours` pair (Y/N presence + runtime
// hours) the PRD asks for; they answer different questions, so both stay.

import { logAudit } from './auditLogStore'
import { getHDDProjects, getSiteProjects, getHDDProject, getSiteProject } from './projectStore'

export const POWER_BACKUP_TYPES = ['UPS + Battery', 'Generator Backup', 'None']
// Old 3-value enum -> closest new-enum equivalent, applied once to seed data
// below (see INITIAL_POPS) — 'Under Maintenance' reads as a temporary
// works-in-progress state, same family as 'Under Construction', closer to
// it in spirit than either 'Active' or 'Inactive'.
const STATUS_MIGRATION = { 'Under Maintenance': 'Under Construction' }
export const POP_STATUSES = ['Planned', 'Under Construction', 'Active', 'Inactive', 'Decommissioned']
export const EQUIPMENT_TYPES = ['OLT', 'Switch']
export const EQUIPMENT_STATUSES = ['online', 'offline', 'degraded']

export const POP_TYPES = ['FTTH', 'OH', 'Hybrid']
export const POP_CATEGORIES = ['Main POP', 'Sub-POP', 'Splitter Box', 'FDMS', 'DP (Distribution Point)', 'OLT Room']
export const POWER_SOURCES = ['Grid', 'Solar', 'Generator']
export const SITE_OWNERSHIP_TYPES = ['Owned', 'Rented', 'Shared']

// Migrated from Network.jsx's own hardcoded SWITCHES/OLTS arrays, grouped
// into 3 POPs that mirror the existing topology's own Core -> Distribution
// -> OLT tree rather than one POP per device (that tree already groups
// devices by physical site far better than a 1:1 split would):
//   - Core POP: just the CORE switch, at the corporate HQ address
//     (companyEntities.js's own seeded Cityline Networks Pvt Ltd address) —
//     "HQ" was never a real neighborhood name, so no Area Mapping locality
//     is linked here.
//   - Andheri POP: DIST-01 (subtitle "Andheri") + its 3 child OLTs
//     (Versova, Lokhandwala, DN Nagar — all real west-Andheri
//     neighborhoods) — linked to areaMappingStore.js's real seeded
//     'Andheri West' locality (AM-008), the closest of its localities to
//     all three.
//   - Bandra POP: DIST-02 (subtitle "Bandra") + its 3 child OLTs (Khar,
//     Santacruz, Vile Parle — all real east-of-Bandra neighborhoods) —
//     linked to areaMappingStore.js's real seeded 'Bandra East' locality
//     (AM-009).
// ip/model/ports/portsUsed/status values are carried over unchanged from
// Network.jsx; ids are kept identical to Network.jsx's own (CORE, DIST-01,
// OLT-01, etc.) so a future linkage pass can match them 1:1.
// popType/category/powerSource/siteOwnership/defaultTechnicianId are
// enriched below with plausible values for each seeded POP; none is linked
// to a seeded Project (projectId stays null) — both seeded Projects
// (projectStore.js's HDD_SEED/SITE_SEED) are Noida-based while these three
// POPs are real Mumbai sites, so there's no genuine match to link rather
// than fabricate one. That also means projectId is confirmed nullable, same
// as `locality` above.
const INITIAL_POPS = [
  {
    id: 'POP-001',
    name: 'Core POP',
    address: '404, Skyline Tower, Andheri West, Mumbai - 400053, Maharashtra',
    latitude: 19.1197,
    longitude: 72.8468,
    locality: null,
    lastCleaningDate: null,
    popType: 'Hybrid',
    projectId: null,
    category: 'Main POP',
    landmark: 'Skyline Tower, opposite Metro Pillar 140',
    capacity: '',
    powerSource: 'Grid',
    powerBackup: 'UPS + Battery',
    hasBackupPower: true,
    backupHours: 4,
    siteOwnership: 'Owned',
    ownerContactName: '', ownerContactPhone: '', rentAgreementExpiry: null,
    siteContactName: 'Admin User', siteContactPhone: '9900001111',
    defaultTechnicianId: null,
    documents: [],
    status: 'Active',
    equipment: [
      { id: 'CORE', type: 'Switch', label: 'Core Switch', ip: '10.0.0.1', model: 'Cisco Catalyst 9300', ports: 48, portsUsed: 48, status: 'online', vlan: 'VLAN 10, 20, 30' },
    ],
  },
  {
    id: 'POP-002',
    name: 'Andheri POP',
    address: 'Andheri West, Mumbai, Maharashtra',
    latitude: 19.1364,
    longitude: 72.8296,
    locality: { state: 'Maharashtra', district: 'Mumbai Suburban', area: 'Mumbai', locality: 'Andheri West' },
    popType: 'FTTH',
    projectId: null,
    category: 'OLT Room',
    // Matches WO-POP-2026-0001's seeded resolved Cleaning Work Order below
    // in workOrderStore.js — kept as a plain literal here (not set via a
    // cross-module savePOP() call from that seed) so app boot doesn't fire a
    // spurious audit-log "Updated POP" entry before any real user action.
    lastCleaningDate: '2026-08-20',
    landmark: 'Near Andheri West Metro Station',
    capacity: '1:8',
    powerSource: 'Grid',
    powerBackup: 'Generator Backup',
    hasBackupPower: true,
    backupHours: 8,
    siteOwnership: 'Rented',
    ownerContactName: 'Ramesh Gupta', ownerContactPhone: '9820011223', rentAgreementExpiry: '2027-03-31',
    siteContactName: 'Arjun Kumar', siteContactPhone: '9876543210',
    defaultTechnicianId: 'u3', // Arjun Kumar (userStore.js) — zone: Andheri West
    documents: [],
    status: 'Active',
    equipment: [
      { id: 'DIST-01', type: 'Switch', label: 'Distribution Switch', ip: '10.1.0.1', model: 'Cisco SG350', ports: 24, portsUsed: 24, status: 'online', vlan: 'VLAN 20' },
      { id: 'OLT-01', type: 'OLT', label: 'OLT — Versova', ip: '10.10.1.1', model: 'ZTE C300', ports: 8, portsUsed: 8, status: 'online', customers: 64 },
      { id: 'OLT-02', type: 'OLT', label: 'OLT — Lokhandwala', ip: '10.10.1.2', model: 'ZTE C300', ports: 8, portsUsed: 6, status: 'online', customers: 48 },
      { id: 'OLT-03', type: 'OLT', label: 'OLT — DN Nagar', ip: '10.10.1.3', model: 'ZTE C300', ports: 8, portsUsed: 0, status: 'offline', customers: 0 },
    ],
  },
  {
    id: 'POP-003',
    name: 'Bandra POP',
    address: 'Bandra East, Mumbai, Maharashtra',
    latitude: 19.0596,
    longitude: 72.8656,
    locality: { state: 'Maharashtra', district: 'Mumbai Suburban', area: 'Mumbai', locality: 'Bandra East' },
    lastCleaningDate: null,
    popType: 'FTTH',
    projectId: null,
    category: 'OLT Room',
    landmark: 'Near Bandra East Bus Depot',
    capacity: '1:8',
    powerSource: 'Grid',
    powerBackup: 'UPS + Battery',
    hasBackupPower: true,
    backupHours: 4,
    siteOwnership: 'Shared',
    ownerContactName: 'Sunil Patil', ownerContactPhone: '9820099887', rentAgreementExpiry: '2026-12-31',
    siteContactName: 'Prakash Yadav', siteContactPhone: '9812345005',
    defaultTechnicianId: 'u12', // Prakash Yadav (userStore.js) — zone: Bandra East
    documents: [],
    status: 'Active',
    equipment: [
      { id: 'DIST-02', type: 'Switch', label: 'Distribution Switch', ip: '10.2.0.1', model: 'Cisco SG350', ports: 24, portsUsed: 22, status: 'online', vlan: 'VLAN 30' },
      { id: 'OLT-04', type: 'OLT', label: 'OLT — Khar', ip: '10.10.2.1', model: 'Huawei MA5600', ports: 8, portsUsed: 5, status: 'degraded', customers: 40 },
      { id: 'OLT-05', type: 'OLT', label: 'OLT — Santacruz', ip: '10.10.2.2', model: 'Huawei MA5600', ports: 8, portsUsed: 7, status: 'online', customers: 56 },
      { id: 'OLT-06', type: 'OLT', label: 'OLT — Vile Parle', ip: '10.10.2.3', model: 'Huawei MA5600', ports: 8, portsUsed: 8, status: 'online', customers: 64 },
    ],
  },
].map(p => ({ ...p, status: STATUS_MIGRATION[p.status] || p.status, createdAt: new Date().toISOString().split('T')[0] }))

let _pops = [...INITIAL_POPS]
// The original plain `POP-###` sequence — kept alive (not replaced) so the
// three seeded ids above stay stable, but no longer used to mint new POP
// ids; new POPs get generatePOPId()'s POP-<TYPE>-#### id instead (see
// below). Continues past the seeded ids purely for historical continuity.
let _nextSeq = INITIAL_POPS.length + 1

// New POP ids are POP-<TYPE>-#### — e.g. "POP-FTTH-0231" — one independent
// 4-digit sequence per POP Type (FTTH/OH/HYBRID) rather than one global
// counter, so the type code in the id always matches the id's own running
// count for that type. This directly answers the PRD's "POP Type + a
// project-linked code" ask for the *type* half; the "project-linked" half
// is carried by the separate `projectId` field instead of being folded into
// the id string itself — a POP's linked Project can be changed later
// without needing to also rename the POP's id, and one Project can have
// many linked POPs (1:many) each with their own independent id.
const _nextSeqByType = {}
function popIdCode(popType) { return (popType || POP_TYPES[0]).toUpperCase().replace(/\s+/g, '') }
export function generatePOPId(popType) {
  const code = popIdCode(popType)
  _nextSeqByType[code] = (_nextSeqByType[code] || 0) + 1
  return `POP-${code}-${String(_nextSeqByType[code]).padStart(4, '0')}`
}
// Non-consuming — safe to call on every render while the Add POP form is
// open, same convention as projectStore.js's previewChamberTags()/
// productStore.js's previewNextProductId(). Lets the form show the id a new
// POP will get (and keep it live as the POP Type dropdown changes) before
// it's actually saved.
export function previewPOPId(popType) {
  const code = popIdCode(popType)
  const seq = (_nextSeqByType[code] || 0) + 1
  return `POP-${code}-${String(seq).padStart(4, '0')}`
}

const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._pops])) }

export function getPOPs() { return _pops }

export function getPOP(id) { return _pops.find(p => p.id === id) ?? null }

export function isPopNameTaken(name, excludeId = null) {
  const q = name.trim().toLowerCase()
  return _pops.some(p => p.id !== excludeId && p.name.trim().toLowerCase() === q)
}

// Projects don't carry an explicit FTTH/OH "project type" field of their
// own (see projectStore.js) — the closest existing signal is Project
// Execution Type (`projectExecutionType`, one of PROJECT_EXECUTION_TYPES),
// which every HDD and Site project already has, combined with Site
// Projects being explicitly the FTTH/Commercial rollout kind
// (ProjectTypeModal.jsx's own label). So a project's matching POP Type is
// derived as: 'OH' when its own projectExecutionType is 'OH' (aerial/
// overhead work, on either an HDD or a Site project), else 'FTTH' (every
// Site Project, plus underground/UG HDD backbone routes — UG is how FTTH
// last-mile fiber is physically laid). A 'Hybrid' POP can link to a project
// of either derived type.
function projectMatchType(project) {
  return project.projectExecutionType === 'OH' ? 'OH' : 'FTTH'
}

// Live-sourced (not cached) so a Project created/edited after this POP form
// opened is picked up immediately, same as every other cross-store lookup
// in this app (e.g. productStore.js's getProducts() called fresh per Work
// Order render). Returns every project when popType is 'Hybrid' or omitted.
export function getProjectsForPOPType(popType) {
  const all = [
    ...getHDDProjects().map(p => ({ id: p.id, name: p.title, kind: 'hdd', matchType: projectMatchType(p) })),
    ...getSiteProjects().map(p => ({ id: p.id, name: p.name, kind: 'site', matchType: projectMatchType(p) })),
  ]
  if (!popType || popType === 'Hybrid') return all
  return all.filter(p => p.matchType === popType)
}

// Resolves a POP's linked projectId back to a display-ready { id, name,
// kind } across both project kinds — used by POPManagement.jsx's list
// column and POPDetail.jsx's read-only display of an already-saved link.
export function getLinkedProject(projectId) {
  if (!projectId) return null
  const hdd = getHDDProject(projectId)
  if (hdd) return { id: hdd.id, name: hdd.title, kind: 'hdd' }
  const site = getSiteProject(projectId)
  if (site) return { id: site.id, name: site.name, kind: 'site' }
  return null
}

// Create or update. Callers pass an `id` to update an existing POP;
// omitting it (new POP) assigns a new generatePOPId(pop.popType) id — same
// isNew/generated-id convention as storeStore.js's saveStore()/
// departmentStore.js's saveDepartment(), just with a type-aware generator
// in place of a plain sequence (see generatePOPId above). `equipment` is
// saved wholesale as whatever array the caller passes (POPDetail.jsx builds
// it from its own add-row form state), same as saveHDDWorkOrder() does with
// requiredMaterials/segments in projectStore.js — no separate per-equipment
// CRUD endpoint. `documents` (Site Photos/Documents) is saved wholesale the
// same way.
export function savePOP(pop) {
  const isNew = !(pop.id && _pops.find(p => p.id === pop.id))
  let saved
  if (!isNew) {
    _pops = _pops.map(p => p.id === pop.id ? { ...p, ...pop } : p)
    saved = _pops.find(p => p.id === pop.id)
  } else {
    const id = generatePOPId(pop.popType)
    saved = {
      equipment: [], documents: [], projectId: null, lastCleaningDate: null,
      popType: POP_TYPES[0], category: POP_CATEGORIES[0],
      landmark: '', capacity: '', powerSource: POWER_SOURCES[0],
      hasBackupPower: false, backupHours: null,
      siteOwnership: SITE_OWNERSHIP_TYPES[0],
      ownerContactName: '', ownerContactPhone: '', rentAgreementExpiry: null,
      siteContactName: '', siteContactPhone: '', defaultTechnicianId: null,
      status: POP_STATUSES[0],
      ...pop, id, createdAt: new Date().toISOString().split('T')[0],
    }
    _pops = [..._pops, saved]
  }
  notify()
  logAudit({
    action: isNew ? 'Create' : 'Edit', module: 'Network',
    details: `${isNew ? 'Added' : 'Updated'} POP ${saved.name} (${saved.id})`,
  })
  return saved
}

export function deletePOP(id) {
  const pop = getPOP(id)
  _pops = _pops.filter(p => p.id !== id)
  notify()
  if (pop) logAudit({ action: 'Delete', module: 'Network', details: `Deleted POP ${pop.name} (${pop.id})` })
}

export function subscribePOPs(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

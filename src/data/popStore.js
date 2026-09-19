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

import { logAudit } from './auditLogStore'

export const POWER_BACKUP_TYPES = ['UPS + Battery', 'Generator Backup', 'None']
export const POP_STATUSES = ['Active', 'Inactive', 'Under Maintenance']
export const EQUIPMENT_TYPES = ['OLT', 'Switch']
export const EQUIPMENT_STATUSES = ['online', 'offline', 'degraded']

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
const INITIAL_POPS = [
  {
    id: 'POP-001',
    name: 'Core POP',
    address: '404, Skyline Tower, Andheri West, Mumbai - 400053, Maharashtra',
    latitude: 19.1197,
    longitude: 72.8468,
    locality: null,
    powerBackup: 'UPS + Battery',
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
    powerBackup: 'Generator Backup',
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
    powerBackup: 'UPS + Battery',
    status: 'Active',
    equipment: [
      { id: 'DIST-02', type: 'Switch', label: 'Distribution Switch', ip: '10.2.0.1', model: 'Cisco SG350', ports: 24, portsUsed: 22, status: 'online', vlan: 'VLAN 30' },
      { id: 'OLT-04', type: 'OLT', label: 'OLT — Khar', ip: '10.10.2.1', model: 'Huawei MA5600', ports: 8, portsUsed: 5, status: 'degraded', customers: 40 },
      { id: 'OLT-05', type: 'OLT', label: 'OLT — Santacruz', ip: '10.10.2.2', model: 'Huawei MA5600', ports: 8, portsUsed: 7, status: 'online', customers: 56 },
      { id: 'OLT-06', type: 'OLT', label: 'OLT — Vile Parle', ip: '10.10.2.3', model: 'Huawei MA5600', ports: 8, portsUsed: 8, status: 'online', customers: 64 },
    ],
  },
].map(p => ({ ...p, createdAt: new Date().toISOString().split('T')[0] }))

let _pops = [...INITIAL_POPS]
let _nextSeq = INITIAL_POPS.length + 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._pops])) }

export function getPOPs() { return _pops }

export function getPOP(id) { return _pops.find(p => p.id === id) ?? null }

export function isPopNameTaken(name, excludeId = null) {
  const q = name.trim().toLowerCase()
  return _pops.some(p => p.id !== excludeId && p.name.trim().toLowerCase() === q)
}

// Create or update. Callers pass an `id` to update an existing POP;
// omitting it (new POP) assigns the next POP-### sequence id — same
// isNew/sequence-id convention as storeStore.js's saveStore()/
// departmentStore.js's saveDepartment(). `equipment` is saved wholesale as
// whatever array the caller passes (POPDetail.jsx builds it from its own
// add-row form state), same as saveHDDWorkOrder() does with
// requiredMaterials/segments in projectStore.js — no separate per-equipment
// CRUD endpoint.
export function savePOP(pop) {
  const isNew = !(pop.id && _pops.find(p => p.id === pop.id))
  let saved
  if (!isNew) {
    _pops = _pops.map(p => p.id === pop.id ? { ...p, ...pop } : p)
    saved = _pops.find(p => p.id === pop.id)
  } else {
    const id = `POP-${String(_nextSeq++).padStart(3, '0')}`
    saved = { equipment: [], ...pop, id, createdAt: new Date().toISOString().split('T')[0] }
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

import { logAudit } from './auditLogStore'

// ── Constants ─────────────────────────────────────────────────────────────────

export const REGION_STATUSES       = ['Active', 'Inactive']
export const SITE_STATUSES         = ['Active', 'Under Construction', 'Decommissioned']
export const OLT_TYPES             = ['GPON', 'EPON', 'XG-PON']
export const OLT_PORT_COUNTS       = [1, 4, 8, 16]
export const OLT_STATUSES          = ['Active', 'Inactive', 'Maintenance']
export const PON_PORT_STATUSES     = ['Available', 'In-Use']
export const SPLITTER_LEVELS       = ['S1', 'S2']
export const SPLITTER_TYPES        = ['HighDensity', 'LowDensity', 'Sparse']
export const SPLITTER_RATIOS       = ['1:2', '1:4', '1:8', '1:16', '1:32']
export const VIRTUAL_PORT_STATUSES = ['Available', 'In-Use', 'Vacant']

// ── ID helpers ────────────────────────────────────────────────────────────────

function nextId(prefix, list) {
  const re = new RegExp(`^${prefix}-(\\d+)$`)
  const nums = list
    .map(r => { const m = r.id.match(re); return m ? parseInt(m[1], 10) : NaN })
    .filter(n => !isNaN(n))
  const max = nums.length ? Math.max(...nums) : 0
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

// PONP-OLT001-01 — strips hyphens from oltId for the compound key
function _ponPortId(oltId, portNum) {
  return `PONP-${oltId.replace(/-/g, '')}-${String(portNum).padStart(2, '0')}`
}

// VP-FAT001-01 — strips hyphens from fatBoxId for the compound key
function _virtualPortId(fatBoxId, portNum) {
  return `VP-${fatBoxId.replace(/-/g, '')}-${String(portNum).padStart(2, '0')}`
}

// ── Seed data ─────────────────────────────────────────────────────────────────

let _regions = [
  { id: 'RGN-001', name: 'Gautam Buddha Nagar', code: 'GBN', description: '', status: 'Active', createdAt: '2024-01-01' },
  { id: 'RGN-002', name: 'Ghaziabad',           code: 'GZB', description: '', status: 'Active', createdAt: '2024-01-01' },
]

let _siteGroups = [
  { id: 'SGP-001', name: 'Alpha Cluster',     regionId: 'RGN-001', description: '', status: 'Active', createdAt: '2024-01-01' },
  { id: 'SGP-002', name: 'Sector 62 Cluster', regionId: 'RGN-001', description: '', status: 'Active', createdAt: '2024-01-01' },
]

let _sites = [
  {
    id: 'SITE-001', name: 'Alpha 1 Tower', siteGroupId: 'SGP-001',
    address: 'Alpha 1, Greater Noida', geo: { lat: 28.4744, lng: 77.5040 },
    siteProjectId: null, status: 'Active', createdAt: '2024-01-01',
  },
  {
    id: 'SITE-002', name: 'Logix Cyber Park', siteGroupId: 'SGP-002',
    address: 'Sector 62, Noida', geo: { lat: 28.6241, lng: 77.3669 },
    siteProjectId: null, status: 'Active', createdAt: '2024-01-01',
  },
]

let _locations = [
  { id: 'LOC-001', name: 'Rooftop Server Room', siteId: 'SITE-001', description: 'Server room on rooftop', createdAt: '2024-01-01' },
  { id: 'LOC-002', name: 'Basement Rack',        siteId: 'SITE-001', description: 'Rack room in basement',  createdAt: '2024-01-01' },
]

let _olts = [
  {
    id: 'OLT-001', name: 'OLT-GBN-01', locationId: 'LOC-001',
    type: 'GPON', portCount: 8, model: 'Syrotech SY-GPON-1040',
    serialNumber: '', inventoryItemId: null,
    status: 'Active', installedAt: '2024-01-15', createdAt: '2024-01-01',
  },
]

// 8 PON ports for OLT-001; port 1 is In-Use (feeds the seeded splitter chain)
let _ponPorts = Array.from({ length: 8 }, (_, i) => ({
  id: _ponPortId('OLT-001', i + 1),
  oltId: 'OLT-001',
  portNumber: i + 1,
  status: i === 0 ? 'In-Use' : 'Available',
}))

// S1 splitter on port 1, then 8 S2 splitters (one per S1 output)
// S2 splitters carry the same ponPortId as their parent S1 so hierarchy
// traversal helpers can resolve them back to the PON port without following
// the parentSplitterId chain on every call.
let _splitters = [
  {
    id: 'SPL-001', ponPortId: 'PONP-OLT001-01', level: 'S1',
    splitterType: 'HighDensity', ratio: '1:8', parentSplitterId: null,
    createdAt: '2024-01-15',
  },
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `SPL-${String(i + 2).padStart(3, '0')}`,
    ponPortId: 'PONP-OLT001-01',
    level: 'S2',
    splitterType: 'HighDensity',
    ratio: '1:16',
    parentSplitterId: 'SPL-001',
    createdAt: '2024-01-15',
  })),
]

// 1 FAT box under the first S2 splitter (SPL-002)
let _fatBoxes = [
  {
    id: 'FAT-001', splitterId: 'SPL-002', name: 'FAT-GBN-01',
    locationComment: 'Pole 3 near Alpha 1 main gate',
    portCount: 16, createdAt: '2024-01-15',
  },
]

// 16 virtual ports for FAT-001
// Ports 1-3 In-Use, 4-14 Available, 15-16 Vacant
let _virtualPorts = Array.from({ length: 16 }, (_, i) => {
  const portNum = i + 1
  const inUse   = portNum <= 3
  const vacant  = portNum >= 15
  return {
    id: _virtualPortId('FAT-001', portNum),
    fatBoxId: 'FAT-001',
    portNumber: portNum,
    status: inUse ? 'In-Use' : vacant ? 'Vacant' : 'Available',
    customerId: inUse ? `CUST-00${portNum}` : null,
  }
})

// ── Pub/sub ───────────────────────────────────────────────────────────────────

let _subscribers = []

function _notify() {
  const snapshot = {
    regions: [..._regions], siteGroups: [..._siteGroups], sites: [..._sites],
    locations: [..._locations], olts: [..._olts], ponPorts: [..._ponPorts],
    splitters: [..._splitters], fatBoxes: [..._fatBoxes], virtualPorts: [..._virtualPorts],
  }
  _subscribers.forEach(fn => fn(snapshot))
}

function subscribe(fn) {
  _subscribers.push(fn)
  return () => unsubscribe(fn)
}

function unsubscribe(fn) {
  const i = _subscribers.indexOf(fn)
  if (i >= 0) _subscribers.splice(i, 1)
}

// ── Getters ───────────────────────────────────────────────────────────────────

function getRegions() { return _regions }

function getSiteGroups(regionId = null) {
  return regionId ? _siteGroups.filter(sg => sg.regionId === regionId) : _siteGroups
}

function getSites(siteGroupId = null) {
  return siteGroupId ? _sites.filter(s => s.siteGroupId === siteGroupId) : _sites
}

function getLocations(siteId = null) {
  return siteId ? _locations.filter(l => l.siteId === siteId) : _locations
}

function getOLTs(locationId = null) {
  return locationId ? _olts.filter(o => o.locationId === locationId) : _olts
}

function getPONPorts(oltId = null) {
  return oltId ? _ponPorts.filter(p => p.oltId === oltId) : _ponPorts
}

// level is optional — pass 'S1' or 'S2' to filter
function getSplitters(ponPortId = null, level = null) {
  let result = ponPortId ? _splitters.filter(s => s.ponPortId === ponPortId) : _splitters
  if (level) result = result.filter(s => s.level === level)
  return result
}

function getFATBoxes(splitterId = null) {
  return splitterId ? _fatBoxes.filter(f => f.splitterId === splitterId) : _fatBoxes
}

function getVirtualPorts(fatBoxId = null) {
  return fatBoxId ? _virtualPorts.filter(v => v.fatBoxId === fatBoxId) : _virtualPorts
}

// ── Internal traversal helpers ────────────────────────────────────────────────

// Returns ids of all splitters reachable from the given PON port ids:
// direct S1 splitters plus their S2 children.
function _splitterIdsUnder(ponPortIds) {
  const s1 = _splitters.filter(s => s.level === 'S1' && ponPortIds.includes(s.ponPortId))
  const s1Ids = s1.map(s => s.id)
  const s2 = _splitters.filter(s => s.level === 'S2' && s1Ids.includes(s.parentSplitterId))
  return [...s1, ...s2].map(s => s.id)
}

function _fatBoxIdsFor(splitterIds) {
  return _fatBoxes.filter(f => splitterIds.includes(f.splitterId)).map(f => f.id)
}

function _vpsFor(fatBoxIds) {
  return _virtualPorts.filter(v => fatBoxIds.includes(v.fatBoxId))
}

// Walks a FAT box back up to its region and site for context labels.
function _resolvePortContext(fat) {
  const splitter = _splitters.find(s => s.id === fat.splitterId)
  // Use the splitter's ponPortId directly (S2 splitters carry the same
  // ponPortId as their parent S1 in this store's convention).
  const ponPortId = splitter?.ponPortId ?? null
  const ponPort   = ponPortId ? _ponPorts.find(p => p.id === ponPortId) : null
  const olt       = ponPort   ? _olts.find(o => o.id === ponPort.oltId)         : null
  const location  = olt       ? _locations.find(l => l.id === olt.locationId)   : null
  const site      = location  ? _sites.find(s => s.id === location.siteId)      : null
  const siteGroup = site      ? _siteGroups.find(sg => sg.id === site.siteGroupId) : null
  const region    = siteGroup ? _regions.find(r => r.id === siteGroup.regionId) : null
  return { regionName: region?.name ?? null, siteName: site?.name ?? null }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function getRegionStats(regionId) {
  const sgIds       = _siteGroups.filter(sg => sg.regionId === regionId).map(sg => sg.id)
  const sites       = _sites.filter(s => sgIds.includes(s.siteGroupId))
  const locationIds = _locations.filter(l => sites.some(s => s.id === l.siteId)).map(l => l.id)
  const oltIds      = _olts.filter(o => locationIds.includes(o.locationId)).map(o => o.id)
  const ponPortIds  = _ponPorts.filter(p => oltIds.includes(p.oltId)).map(p => p.id)
  const vps         = _vpsFor(_fatBoxIdsFor(_splitterIdsUnder(ponPortIds)))
  return {
    siteCount:      sites.length,
    oltCount:       oltIds.length,
    totalPorts:     vps.length,
    usedPorts:      vps.filter(v => v.status === 'In-Use').length,
    availablePorts: vps.filter(v => v.status === 'Available').length,
  }
}

function getSiteStats(siteId) {
  const locationIds = _locations.filter(l => l.siteId === siteId).map(l => l.id)
  const oltIds      = _olts.filter(o => locationIds.includes(o.locationId)).map(o => o.id)
  const ponPortIds  = _ponPorts.filter(p => oltIds.includes(p.oltId)).map(p => p.id)
  const vps         = _vpsFor(_fatBoxIdsFor(_splitterIdsUnder(ponPortIds)))
  return {
    locationCount:  locationIds.length,
    oltCount:       oltIds.length,
    totalPorts:     vps.length,
    usedPorts:      vps.filter(v => v.status === 'In-Use').length,
    availablePorts: vps.filter(v => v.status === 'Available').length,
  }
}

function getOLTStats(oltId) {
  const ponPortIds = _ponPorts.filter(p => p.oltId === oltId).map(p => p.id)
  const vps        = _vpsFor(_fatBoxIdsFor(_splitterIdsUnder(ponPortIds)))
  return {
    portCount:     vps.length,
    usedPorts:     vps.filter(v => v.status === 'In-Use').length,
    availablePorts:vps.filter(v => v.status === 'Available').length,
    customerCount: new Set(vps.filter(v => v.customerId).map(v => v.customerId)).size,
  }
}

// ── Feasibility check ─────────────────────────────────────────────────────────

// Returns the first available virtual port in the system, preferring a FAT
// box whose region or site name contains areaHint (case-insensitive).
function checkPortAvailability(areaHint) {
  const hint = (areaHint ?? '').trim().toLowerCase()
  const available = _virtualPorts.filter(v => v.status === 'Available')
  if (!available.length) {
    return { available: false, fatBoxId: null, virtualPortId: null, regionName: null, siteName: null }
  }

  let best = null
  for (const vp of available) {
    const fat = _fatBoxes.find(f => f.id === vp.fatBoxId)
    if (!fat) continue
    const ctx = _resolvePortContext(fat)
    if (!best) best = { vp, fat, ctx }
    if (hint && (
      ctx.regionName?.toLowerCase().includes(hint) ||
      ctx.siteName?.toLowerCase().includes(hint)
    )) {
      best = { vp, fat, ctx }
      break
    }
  }

  if (!best) return { available: false, fatBoxId: null, virtualPortId: null, regionName: null, siteName: null }
  return {
    available:     true,
    fatBoxId:      best.fat.id,
    virtualPortId: best.vp.id,
    regionName:    best.ctx.regionName,
    siteName:      best.ctx.siteName,
  }
}

// ── Save functions ────────────────────────────────────────────────────────────

function saveRegion(region) {
  const isNew = !(region.id && _regions.find(r => r.id === region.id))
  let saved
  if (!isNew) {
    _regions = _regions.map(r => r.id === region.id ? { ...r, ...region } : r)
    saved = _regions.find(r => r.id === region.id)
  } else {
    const id = region.id ?? nextId('RGN', _regions)
    saved = { description: '', status: 'Active', createdAt: new Date().toISOString().slice(0, 10), ...region, id }
    _regions = [..._regions, saved]
  }
  _notify()
  logAudit({ action: isNew ? 'Create' : 'Edit', module: 'Network', details: `${isNew ? 'Created' : 'Updated'} region ${saved.name} (${saved.id})` })
  return saved
}

function saveSiteGroup(siteGroup) {
  const isNew = !(siteGroup.id && _siteGroups.find(sg => sg.id === siteGroup.id))
  let saved
  if (!isNew) {
    _siteGroups = _siteGroups.map(sg => sg.id === siteGroup.id ? { ...sg, ...siteGroup } : sg)
    saved = _siteGroups.find(sg => sg.id === siteGroup.id)
  } else {
    const id = siteGroup.id ?? nextId('SGP', _siteGroups)
    saved = { description: '', status: 'Active', createdAt: new Date().toISOString().slice(0, 10), ...siteGroup, id }
    _siteGroups = [..._siteGroups, saved]
  }
  _notify()
  logAudit({ action: isNew ? 'Create' : 'Edit', module: 'Network', details: `${isNew ? 'Created' : 'Updated'} site group ${saved.name} (${saved.id})` })
  return saved
}

function saveSite(site) {
  const isNew = !(site.id && _sites.find(s => s.id === site.id))
  let saved
  if (!isNew) {
    _sites = _sites.map(s => s.id === site.id ? { ...s, ...site } : s)
    saved = _sites.find(s => s.id === site.id)
  } else {
    const id = site.id ?? nextId('SITE', _sites)
    saved = { address: '', geo: null, siteProjectId: null, status: 'Active', createdAt: new Date().toISOString().slice(0, 10), ...site, id }
    _sites = [..._sites, saved]
  }
  _notify()
  logAudit({ action: isNew ? 'Create' : 'Edit', module: 'Network', details: `${isNew ? 'Created' : 'Updated'} site ${saved.name} (${saved.id})` })
  return saved
}

function saveLocation(location) {
  const isNew = !(location.id && _locations.find(l => l.id === location.id))
  let saved
  if (!isNew) {
    _locations = _locations.map(l => l.id === location.id ? { ...l, ...location } : l)
    saved = _locations.find(l => l.id === location.id)
  } else {
    const id = location.id ?? nextId('LOC', _locations)
    saved = { description: '', createdAt: new Date().toISOString().slice(0, 10), ...location, id }
    _locations = [..._locations, saved]
  }
  _notify()
  logAudit({ action: isNew ? 'Create' : 'Edit', module: 'Network', details: `${isNew ? 'Created' : 'Updated'} location ${saved.name} (${saved.id})` })
  return saved
}

// Also auto-generates PON ports (portCount of them) for new OLTs.
function saveOLT(olt) {
  const isNew = !(olt.id && _olts.find(o => o.id === olt.id))
  let saved
  if (!isNew) {
    _olts = _olts.map(o => o.id === olt.id ? { ...o, ...olt } : o)
    saved = _olts.find(o => o.id === olt.id)
  } else {
    const id = olt.id ?? nextId('OLT', _olts)
    saved = {
      serialNumber: '', inventoryItemId: null, status: 'Active',
      installedAt: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString().slice(0, 10),
      ...olt, id,
    }
    _olts = [..._olts, saved]
    // Auto-generate PON ports — skip any port numbers already present to
    // allow callers to pre-seed ports before calling save.
    const portCount = Number(saved.portCount) || 8
    const existingNums = new Set(_ponPorts.filter(p => p.oltId === id).map(p => p.portNumber))
    const newPorts = []
    for (let i = 1; i <= portCount; i++) {
      if (!existingNums.has(i)) {
        newPorts.push({ id: _ponPortId(id, i), oltId: id, portNumber: i, status: 'Available' })
      }
    }
    if (newPorts.length) _ponPorts = [..._ponPorts, ...newPorts]
  }
  _notify()
  logAudit({ action: isNew ? 'Create' : 'Edit', module: 'Network', details: `${isNew ? 'Created' : 'Updated'} OLT ${saved.name} (${saved.id})` })
  return saved
}

function saveSplitter(splitter) {
  const isNew = !(splitter.id && _splitters.find(s => s.id === splitter.id))
  let saved
  if (!isNew) {
    _splitters = _splitters.map(s => s.id === splitter.id ? { ...s, ...splitter } : s)
    saved = _splitters.find(s => s.id === splitter.id)
  } else {
    const id = splitter.id ?? nextId('SPL', _splitters)
    saved = { parentSplitterId: null, createdAt: new Date().toISOString().slice(0, 10), ...splitter, id }
    _splitters = [..._splitters, saved]
  }
  _notify()
  logAudit({ action: isNew ? 'Create' : 'Edit', module: 'Network', details: `${isNew ? 'Created' : 'Updated'} splitter ${saved.id} (${saved.level}, ${saved.ratio})` })
  return saved
}

// Also auto-generates virtual ports (portCount of them) for new FAT boxes.
function saveFATBox(fatBox) {
  const isNew = !(fatBox.id && _fatBoxes.find(f => f.id === fatBox.id))
  let saved
  if (!isNew) {
    _fatBoxes = _fatBoxes.map(f => f.id === fatBox.id ? { ...f, ...fatBox } : f)
    saved = _fatBoxes.find(f => f.id === fatBox.id)
  } else {
    const id = fatBox.id ?? nextId('FAT', _fatBoxes)
    saved = { locationComment: '', portCount: 16, createdAt: new Date().toISOString().slice(0, 10), ...fatBox, id }
    _fatBoxes = [..._fatBoxes, saved]
    const portCount = Number(saved.portCount) || 16
    const existingNums = new Set(_virtualPorts.filter(v => v.fatBoxId === id).map(v => v.portNumber))
    const newPorts = []
    for (let i = 1; i <= portCount; i++) {
      if (!existingNums.has(i)) {
        newPorts.push({ id: _virtualPortId(id, i), fatBoxId: id, portNumber: i, status: 'Available', customerId: null })
      }
    }
    if (newPorts.length) _virtualPorts = [..._virtualPorts, ...newPorts]
  }
  _notify()
  logAudit({ action: isNew ? 'Create' : 'Edit', module: 'Network', details: `${isNew ? 'Created' : 'Updated'} FAT box ${saved.name} (${saved.id})` })
  return saved
}

function saveVirtualPort(port) {
  const isNew = !(port.id && _virtualPorts.find(v => v.id === port.id))
  let saved
  if (!isNew) {
    _virtualPorts = _virtualPorts.map(v => v.id === port.id ? { ...v, ...port } : v)
    saved = _virtualPorts.find(v => v.id === port.id)
  } else {
    const id = port.id ?? _virtualPortId(port.fatBoxId, port.portNumber)
    saved = { status: 'Available', customerId: null, ...port, id }
    _virtualPorts = [..._virtualPorts, saved]
  }
  _notify()
  logAudit({ action: isNew ? 'Create' : 'Edit', module: 'Network', details: `${isNew ? 'Created' : 'Updated'} virtual port ${saved.id}` })
  return saved
}

// ── Delete functions ──────────────────────────────────────────────────────────

function deleteRegion(id) {
  const item = _regions.find(r => r.id === id)
  _regions = _regions.filter(r => r.id !== id)
  _notify()
  if (item) logAudit({ action: 'Delete', module: 'Network', details: `Deleted region ${item.name} (${id})` })
}

function deleteSiteGroup(id) {
  const item = _siteGroups.find(sg => sg.id === id)
  _siteGroups = _siteGroups.filter(sg => sg.id !== id)
  _notify()
  if (item) logAudit({ action: 'Delete', module: 'Network', details: `Deleted site group ${item.name} (${id})` })
}

function deleteSite(id) {
  const item = _sites.find(s => s.id === id)
  _sites = _sites.filter(s => s.id !== id)
  _notify()
  if (item) logAudit({ action: 'Delete', module: 'Network', details: `Deleted site ${item.name} (${id})` })
}

function deleteLocation(id) {
  const item = _locations.find(l => l.id === id)
  _locations = _locations.filter(l => l.id !== id)
  _notify()
  if (item) logAudit({ action: 'Delete', module: 'Network', details: `Deleted location ${item.name} (${id})` })
}

// Cascades to PON ports (auto-generated children).
function deleteOLT(id) {
  const item = _olts.find(o => o.id === id)
  _olts     = _olts.filter(o => o.id !== id)
  _ponPorts = _ponPorts.filter(p => p.oltId !== id)
  _notify()
  if (item) logAudit({ action: 'Delete', module: 'Network', details: `Deleted OLT ${item.name} (${id})` })
}

function deleteSplitter(id) {
  const item = _splitters.find(s => s.id === id)
  _splitters = _splitters.filter(s => s.id !== id)
  _notify()
  if (item) logAudit({ action: 'Delete', module: 'Network', details: `Deleted splitter ${id} (${item.level}, ${item.ratio})` })
}

// Cascades to virtual ports (auto-generated children).
function deleteFATBox(id) {
  const item    = _fatBoxes.find(f => f.id === id)
  _fatBoxes     = _fatBoxes.filter(f => f.id !== id)
  _virtualPorts = _virtualPorts.filter(v => v.fatBoxId !== id)
  _notify()
  if (item) logAudit({ action: 'Delete', module: 'Network', details: `Deleted FAT box ${item.name} (${id})` })
}

function deleteVirtualPort(id) {
  _virtualPorts = _virtualPorts.filter(v => v.id !== id)
  _notify()
  logAudit({ action: 'Delete', module: 'Network', details: `Deleted virtual port ${id}` })
}

// ── Port assignment ───────────────────────────────────────────────────────────

function assignCustomerToPort(virtualPortId, customerId) {
  _virtualPorts = _virtualPorts.map(v =>
    v.id === virtualPortId ? { ...v, status: 'In-Use', customerId } : v
  )
  _notify()
  logAudit({ action: 'Edit', module: 'Network', details: `Assigned customer ${customerId} to virtual port ${virtualPortId}` })
}

function releasePort(virtualPortId) {
  _virtualPorts = _virtualPorts.map(v =>
    v.id === virtualPortId ? { ...v, status: 'Available', customerId: null } : v
  )
  _notify()
  logAudit({ action: 'Edit', module: 'Network', details: `Released virtual port ${virtualPortId}` })
}

// ── Default export ────────────────────────────────────────────────────────────

const hierarchyStore = {
  // Getters
  getRegions,
  getSiteGroups,
  getSites,
  getLocations,
  getOLTs,
  getPONPorts,
  getSplitters,
  getFATBoxes,
  getVirtualPorts,
  // Stats
  getRegionStats,
  getSiteStats,
  getOLTStats,
  // Feasibility
  checkPortAvailability,
  // Save
  saveRegion,
  saveSiteGroup,
  saveSite,
  saveLocation,
  saveOLT,
  saveSplitter,
  saveFATBox,
  saveVirtualPort,
  // Delete
  deleteRegion,
  deleteSiteGroup,
  deleteSite,
  deleteLocation,
  deleteOLT,
  deleteSplitter,
  deleteFATBox,
  deleteVirtualPort,
  // Port assignment
  assignCustomerToPort,
  releasePort,
  // Subscribe
  subscribe,
  unsubscribe,
}

export default hierarchyStore

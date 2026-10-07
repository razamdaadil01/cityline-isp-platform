import { logAudit } from './auditLogStore'

export const FIBRE_ROUTE_STATUSES = ['Active', 'Damaged', 'Under Repair', 'Inactive']
export const CABLE_TYPES = ['Single Mode', 'Multi Mode']
export const CORE_COUNTS = [6, 12, 24, 48, 96]

export const INFRA_TYPES = ['Splice Point', 'Splitter', 'Manhole', 'Handhole']
export const INFRA_STATUSES = ['Active', 'Damaged', 'Under Maintenance']

export const FAULT_TYPES = ['Cable Cut', 'High Attenuation', 'Connector Damage', 'Splice Failure', 'Other']
export const FAULT_SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
export const FAULT_STATUSES = ['Open', 'In Progress', 'Resolved']

let _routes = [
  {
    id: 'FR-001',
    name: 'Andheri West Backbone',
    startPoint: 'Core POP - HQ',
    endPoint: 'OLT-AW-01 - Versova',
    cableType: 'Single Mode',
    coreCount: 24,
    lengthMeters: 2400,
    status: 'Active',
    linkedOltId: 'OLT-01',
    coordinates: [
      { lat: 19.1197, lng: 72.8468 },
      { lat: 19.1364, lng: 72.8296 },
      { lat: 19.1220, lng: 72.8180 },
    ],
    installedOn: '2022-03-15',
    notes: 'Primary backbone route serving Andheri West distribution zone.',
  },
  {
    id: 'FR-002',
    name: 'Bandra Distribution Loop',
    startPoint: 'Bandra POP',
    endPoint: 'OLT-BND-03 - Khar',
    cableType: 'Single Mode',
    coreCount: 12,
    lengthMeters: 1800,
    status: 'Active',
    linkedOltId: 'OLT-04',
    coordinates: [
      { lat: 19.0596, lng: 72.8295 },
      { lat: 19.0523, lng: 72.8458 },
      { lat: 19.0650, lng: 72.8530 },
    ],
    installedOn: '2022-07-10',
    notes: 'Distribution loop for Bandra and Khar zones.',
  },
  {
    id: 'FR-003',
    name: 'Santacruz Feeder',
    startPoint: 'Andheri POP',
    endPoint: 'OLT-STC-02 - Santacruz East',
    cableType: 'Multi Mode',
    coreCount: 6,
    lengthMeters: 900,
    status: 'Damaged',
    linkedOltId: 'OLT-05',
    coordinates: [
      { lat: 19.0825, lng: 72.8405 },
      { lat: 19.0760, lng: 72.8510 },
    ],
    installedOn: '2023-01-20',
    notes: 'Feeder to Santacruz East. Reported cable damage — repair pending.',
  },
]

let _infraPoints = [
  {
    id: 'INF-001',
    type: 'Splice Point',
    name: 'SP-AW-01',
    latitude: 19.1364,
    longitude: 72.8296,
    routeId: 'FR-001',
    description: 'Primary splice point at Andheri distribution node.',
    status: 'Active',
    installedOn: '2022-03-20',
    lastInspected: '2026-08-10',
  },
  {
    id: 'INF-002',
    type: 'Splitter',
    name: 'SPL-AW-01',
    latitude: 19.1220,
    longitude: 72.8180,
    routeId: 'FR-001',
    description: '1:8 splitter serving Versova sector.',
    status: 'Active',
    installedOn: '2022-04-05',
    lastInspected: '2026-07-22',
  },
  {
    id: 'INF-003',
    type: 'Manhole',
    name: 'MH-BND-01',
    latitude: 19.0523,
    longitude: 72.8458,
    routeId: 'FR-002',
    description: 'Manhole junction at Linking Road underpass.',
    status: 'Active',
    installedOn: '2022-07-15',
    lastInspected: '2026-09-01',
  },
  {
    id: 'INF-004',
    type: 'Splice Point',
    name: 'SP-BND-01',
    latitude: 19.0650,
    longitude: 72.8530,
    routeId: 'FR-002',
    description: 'Splice closure at Khar West entry point.',
    status: 'Active',
    installedOn: '2022-08-02',
    lastInspected: '2026-09-12',
  },
  {
    id: 'INF-005',
    type: 'Splice Point',
    name: 'SP-STC-01',
    latitude: 19.0760,
    longitude: 72.8510,
    routeId: 'FR-003',
    description: 'Splice point near reported cable damage site.',
    status: 'Damaged',
    installedOn: '2023-01-25',
    lastInspected: '2026-09-28',
  },
]

let _faults = [
  {
    id: 'FF-001',
    routeId: 'FR-003',
    routeName: 'Santacruz Feeder',
    faultType: 'Cable Cut',
    severity: 'Critical',
    location: 'Near Santacruz East flyover, approx 450m from splice point SP-STC-01',
    latitude: 19.0790,
    longitude: 72.8475,
    reportedBy: 'Admin User',
    reportedAt: '2026-09-28T09:15:00.000Z',
    assignedTo: 'Rajan Mehta',
    status: 'Open',
    resolvedAt: '',
    notes: 'Physical cable cut suspected due to road excavation work by MCGM.',
  },
  {
    id: 'FF-002',
    routeId: 'FR-001',
    routeName: 'Andheri West Backbone',
    faultType: 'High Attenuation',
    severity: 'Medium',
    location: 'Between splice point SP-AW-01 and splitter SPL-AW-01, approx 300m stretch',
    latitude: 19.1290,
    longitude: 72.8238,
    reportedBy: 'Admin User',
    reportedAt: '2026-09-25T14:30:00.000Z',
    assignedTo: 'Suresh Patil',
    status: 'In Progress',
    resolvedAt: '',
    notes: 'OTDR trace shows signal degradation. Likely connector contamination or micro-bend.',
  },
  {
    id: 'FF-003',
    routeId: 'FR-002',
    routeName: 'Bandra Distribution Loop',
    faultType: 'Connector Damage',
    severity: 'Low',
    location: 'Manhole MH-BND-01 — SC/APC connector on port 3',
    latitude: 19.0523,
    longitude: 72.8458,
    reportedBy: 'Admin User',
    reportedAt: '2026-09-20T11:00:00.000Z',
    assignedTo: 'Rajan Mehta',
    status: 'Resolved',
    resolvedAt: '2026-09-22T16:45:00.000Z',
    notes: 'Connector cleaned and re-polished. Signal restored to spec.',
  },
]

let _routeListeners = []
let _infraListeners = []
let _faultListeners = []

function notifyRoutes() { _routeListeners.forEach(fn => fn([..._routes])) }
function notifyInfra() { _infraListeners.forEach(fn => fn([..._infraPoints])) }
function notifyFaults() { _faultListeners.forEach(fn => fn([..._faults])) }

function nextId(prefix, list) {
  const nums = list
    .map(r => parseInt(r.id.replace(prefix + '-', ''), 10))
    .filter(n => !isNaN(n))
  const max = nums.length ? Math.max(...nums) : 0
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

// ── Fibre Routes ────────────────────────────────────────────────────────────

export function getFibreRoutes() { return _routes }

export function subscribeFibreRoutes(fn) {
  _routeListeners.push(fn)
  return () => { const i = _routeListeners.indexOf(fn); if (i >= 0) _routeListeners.splice(i, 1) }
}

export function saveFibreRoute(data) {
  const isNew = !(data.id && _routes.find(r => r.id === data.id))
  let saved
  if (!isNew) {
    _routes = _routes.map(r => r.id === data.id ? { ...r, ...data } : r)
    saved = _routes.find(r => r.id === data.id)
    logAudit({ action: 'Edit', module: 'Network', details: `Updated fibre route ${saved.name} (${saved.id})` })
  } else {
    const id = nextId('FR', _routes)
    saved = {
      coordinates: [], linkedOltId: '', notes: '', installedOn: '',
      ...data,
      id,
    }
    _routes = [..._routes, saved]
    logAudit({ action: 'Create', module: 'Network', details: `Created fibre route ${saved.name} (${id})` })
  }
  notifyRoutes()
  return saved
}

export function deleteFibreRoute(id) {
  const route = _routes.find(r => r.id === id)
  _routes = _routes.filter(r => r.id !== id)
  notifyRoutes()
  if (route) logAudit({ action: 'Delete', module: 'Network', details: `Deleted fibre route ${route.name} (${id})` })
}

// ── Infrastructure Points ───────────────────────────────────────────────────

export function getInfraPoints() { return _infraPoints }

export function subscribeInfraPoints(fn) {
  _infraListeners.push(fn)
  return () => { const i = _infraListeners.indexOf(fn); if (i >= 0) _infraListeners.splice(i, 1) }
}

export function saveInfraPoint(data) {
  const isNew = !(data.id && _infraPoints.find(p => p.id === data.id))
  let saved
  if (!isNew) {
    _infraPoints = _infraPoints.map(p => p.id === data.id ? { ...p, ...data } : p)
    saved = _infraPoints.find(p => p.id === data.id)
    logAudit({ action: 'Edit', module: 'Network', details: `Updated infra point ${saved.name} (${saved.id})` })
  } else {
    const id = nextId('INF', _infraPoints)
    saved = { description: '', installedOn: '', lastInspected: '', ...data, id }
    _infraPoints = [..._infraPoints, saved]
    logAudit({ action: 'Create', module: 'Network', details: `Created infra point ${saved.name} (${id})` })
  }
  notifyInfra()
  return saved
}

export function deleteInfraPoint(id) {
  const pt = _infraPoints.find(p => p.id === id)
  _infraPoints = _infraPoints.filter(p => p.id !== id)
  notifyInfra()
  if (pt) logAudit({ action: 'Delete', module: 'Network', details: `Deleted infra point ${pt.name} (${id})` })
}

// ── Fibre Faults ────────────────────────────────────────────────────────────

export function getFibreFaults() { return _faults }

export function subscribeFibreFaults(fn) {
  _faultListeners.push(fn)
  return () => { const i = _faultListeners.indexOf(fn); if (i >= 0) _faultListeners.splice(i, 1) }
}

export function saveFibreFault(data) {
  const id = nextId('FF', _faults)
  const fault = {
    resolvedAt: '', notes: '', assignedTo: '',
    latitude: null, longitude: null,
    ...data,
    id,
    reportedAt: new Date().toISOString(),
    status: 'Open',
  }
  _faults = [..._faults, fault]
  notifyFaults()
  logAudit({ action: 'Create', module: 'Network', details: `Reported fibre fault ${fault.faultType} on ${fault.routeName} (${id})` })
  return fault
}

export function updateFibreFault(id, fields) {
  _faults = _faults.map(f => f.id === id ? { ...f, ...fields } : f)
  notifyFaults()
  const fault = _faults.find(f => f.id === id)
  if (fault) logAudit({ action: 'Edit', module: 'Network', details: `Updated fibre fault ${id} — status: ${fault.status}` })
}

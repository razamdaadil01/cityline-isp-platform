// Area mapping store — module-level pub/sub pattern

const INIT_DATA = [
  {
    id: 'AM-001', state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar',
    area: 'Noida', locality: 'Sector 62', subLocality: 'Tower A',
    siteType: 'FTTH', branchCode: 'CNPL-001', feasibility: 'Feasible', active: true,
  },
  {
    id: 'AM-002', state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar',
    area: 'Noida', locality: 'Sector 62', subLocality: 'Tower B',
    siteType: 'FTTH', branchCode: 'CNPL-001', feasibility: 'Feasible', active: true,
  },
  {
    id: 'AM-003', state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar',
    area: 'Noida', locality: 'Sector 63', subLocality: 'Block C',
    siteType: 'Sector', branchCode: 'CNPL-002', feasibility: 'Feasible', active: true,
  },
  {
    id: 'AM-004', state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar',
    area: 'Noida Extension', locality: 'Bisrakh', subLocality: 'Tower A',
    siteType: 'FTTH', branchCode: 'CNPL-001', feasibility: 'Feasible', active: true,
  },
  {
    id: 'AM-005', state: 'Uttar Pradesh', district: 'Ghaziabad',
    area: 'Indirapuram', locality: 'Ahinsa Khand', subLocality: 'Block A',
    siteType: 'FTTH', branchCode: 'CNPL-003', feasibility: 'Feasible', active: true,
  },
  {
    id: 'AM-006', state: 'Karnataka', district: 'Bangalore',
    area: 'Koramangala', locality: '5th Block', subLocality: 'HSR Layout',
    siteType: 'FTTH', branchCode: 'CNPL-010', feasibility: 'Feasible', active: true,
  },
  {
    id: 'AM-007', state: 'Karnataka', district: 'Bangalore',
    area: 'Whitefield', locality: 'Marathahalli', subLocality: 'Outer Ring Road',
    siteType: 'FTTH', branchCode: 'CNPL-011', feasibility: 'Feasible', active: true,
  },
]

let _areas = [...INIT_DATA]

// Hierarchy stubs — intermediate level entries without sub-localities yet
let _stubs = {
  states:     [],  // string[]
  districts:  [],  // { state, name }[]
  areas:      [],  // { state, district, name }[]
  localities: [],  // { state, district, area, name }[]
}

const _areaListeners = new Set()
const _hierarchyListeners = new Set()

function notify()          { _areaListeners.forEach(fn => fn([..._areas])) }
function notifyHierarchy() { _hierarchyListeners.forEach(fn => fn()) }
function notifyAll()       { notify(); notifyHierarchy() }

export function getAreas() { return _areas }

export function saveArea(area) {
  if (area.id && _areas.find(a => a.id === area.id)) {
    _areas = _areas.map(a => a.id === area.id ? { ...a, ...area } : a)
  } else {
    _areas = [..._areas, { ...area, id: `AM-${Date.now()}` }]
  }
  notify()
}

export function deleteArea(id) {
  _areas = _areas.filter(a => a.id !== id)
  notify()
}

export function subscribeAreas(fn) {
  _areaListeners.add(fn)
  return () => _areaListeners.delete(fn)
}

export function subscribeHierarchy(fn) {
  _hierarchyListeners.add(fn)
  return () => _hierarchyListeners.delete(fn)
}

// ── Hierarchy stub savers ────────────────────────────────────────────────────

export function saveStateName(name) {
  if (!_stubs.states.includes(name)) {
    _stubs.states = [..._stubs.states, name]
    notifyHierarchy()
  }
}

export function saveDistrictName(state, name) {
  if (!_stubs.districts.find(d => d.state === state && d.name === name)) {
    _stubs.districts = [..._stubs.districts, { state, name }]
    notifyHierarchy()
  }
}

export function saveAreaName(state, district, name) {
  if (!_stubs.areas.find(a => a.state === state && a.district === district && a.name === name)) {
    _stubs.areas = [..._stubs.areas, { state, district, name }]
    notifyHierarchy()
  }
}

export function saveLocalityName(state, district, area, name) {
  if (!_stubs.localities.find(l => l.state === state && l.district === district && l.area === area && l.name === name)) {
    _stubs.localities = [..._stubs.localities, { state, district, area, name }]
    notifyHierarchy()
  }
}

// ── Getters — merge sub-locality records + hierarchy stubs ──────────────────

export function getStates() {
  const fromAreas = _areas.map(a => a.state)
  return [...new Set([...fromAreas, ..._stubs.states])].sort()
}

export function getDistricts(state) {
  const fromAreas = _areas.filter(a => a.state === state).map(a => a.district)
  const fromStubs = _stubs.districts.filter(d => d.state === state).map(d => d.name)
  return [...new Set([...fromAreas, ...fromStubs])].sort()
}

export function getAreasList(state, district) {
  const fromAreas = _areas.filter(a => a.state === state && a.district === district).map(a => a.area)
  const fromStubs = _stubs.areas.filter(a => a.state === state && a.district === district).map(a => a.name)
  return [...new Set([...fromAreas, ...fromStubs])].sort()
}

export function getLocalities(state, district, area) {
  const fromAreas = _areas.filter(a => a.state === state && a.district === district && a.area === area).map(a => a.locality)
  const fromStubs = _stubs.localities.filter(l => l.state === state && l.district === district && l.area === area).map(l => l.name)
  return [...new Set([...fromAreas, ...fromStubs])].sort()
}

export function getSubLocalities(state, district, area, locality) {
  return _areas.filter(a =>
    a.state === state && a.district === district && a.area === area && a.locality === locality
  ).map(a => ({ subLocality: a.subLocality, siteType: a.siteType, branchCode: a.branchCode, id: a.id }))
}

export function lookupSubLocality(state, district, area, locality, subLocality) {
  return _areas.find(a =>
    a.state === state && a.district === district && a.area === area &&
    a.locality === locality && a.subLocality === subLocality
  ) || null
}

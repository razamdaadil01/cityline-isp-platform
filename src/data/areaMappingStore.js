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
const _listeners = []

export function getAreas() { return _areas }

export function saveArea(area) {
  if (area.id && _areas.find(a => a.id === area.id)) {
    _areas = _areas.map(a => a.id === area.id ? { ...a, ...area } : a)
  } else {
    _areas = [..._areas, { ...area, id: `AM-${Date.now()}` }]
  }
  _listeners.forEach(fn => fn([..._areas]))
}

export function deleteArea(id) {
  _areas = _areas.filter(a => a.id !== id)
  _listeners.forEach(fn => fn([..._areas]))
}

export function subscribeAreas(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

export function getStates() {
  return [...new Set(_areas.map(a => a.state))].sort()
}

export function getDistricts(state) {
  return [...new Set(_areas.filter(a => a.state === state).map(a => a.district))].sort()
}

export function getAreasList(state, district) {
  return [...new Set(_areas.filter(a => a.state === state && a.district === district).map(a => a.area))].sort()
}

export function getLocalities(state, district, area) {
  return [...new Set(_areas.filter(a => a.state === state && a.district === district && a.area === area).map(a => a.locality))].sort()
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

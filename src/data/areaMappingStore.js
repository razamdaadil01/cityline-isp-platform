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
  {
    id: 'AM-008', state: 'Maharashtra', district: 'Mumbai Suburban',
    area: 'Mumbai', locality: 'Andheri West', subLocality: 'Four Bungalows',
    siteType: 'FTTH', branchCode: 'CNPL-AW-01', feasibility: 'Feasible', active: true,
  },
  {
    id: 'AM-009', state: 'Maharashtra', district: 'Mumbai Suburban',
    area: 'Mumbai', locality: 'Bandra East', subLocality: 'Kalanagar',
    siteType: 'FTTH', branchCode: 'CNPL-BE-01', feasibility: 'Feasible', active: true,
  },
  {
    id: 'AM-010', state: 'Maharashtra', district: 'Mumbai Suburban',
    area: 'Mumbai', locality: 'Goregaon', subLocality: 'Goregaon West',
    siteType: 'FTTH', branchCode: 'CNPL-GO-01', feasibility: 'Feasible', active: true,
  },
  {
    id: 'AM-011', state: 'Maharashtra', district: 'Mumbai Suburban',
    area: 'Mumbai', locality: 'Versova', subLocality: 'Yari Road',
    siteType: 'FTTH', branchCode: 'CNPL-VE-01', feasibility: 'Feasible', active: true,
  },
  {
    id: 'AM-012', state: 'Maharashtra', district: 'Mumbai Suburban',
    area: 'Mumbai', locality: 'Andheri East', subLocality: 'Marol',
    siteType: 'FTTH', branchCode: 'CNPL-AE-01', feasibility: 'Feasible', active: true,
  },
]

let _areas = [...INIT_DATA]

// Hierarchy stubs — intermediate level entries without sub-localities yet.
// `localities` is also the canonical store for locality-level metadata
// (e.g. intercomSite) — it exists even for localities that already have
// real sub-locality rows in `_areas`, since intercomSite is a Locality-level
// attribute, not a Sub Locality one.
let _stubs = {
  states:     [],  // string[]
  districts:  [],  // { state, name }[]
  areas:      [],  // { state, district, name }[]
  localities: [    // { state, district, area, name, siteType, branchCode, intercomSite }[]
    { state: 'Maharashtra', district: 'Mumbai Suburban', area: 'Mumbai', name: 'Andheri West', siteType: '', branchCode: '', intercomSite: true  },
    { state: 'Maharashtra', district: 'Mumbai Suburban', area: 'Mumbai', name: 'Bandra East',   siteType: '', branchCode: '', intercomSite: true  },
    { state: 'Maharashtra', district: 'Mumbai Suburban', area: 'Mumbai', name: 'Goregaon',       siteType: '', branchCode: '', intercomSite: false },
    { state: 'Maharashtra', district: 'Mumbai Suburban', area: 'Mumbai', name: 'Versova',        siteType: '', branchCode: '', intercomSite: false },
    { state: 'Maharashtra', district: 'Mumbai Suburban', area: 'Mumbai', name: 'Andheri East',   siteType: '', branchCode: '', intercomSite: true  },
  ],
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

export function saveLocalityName(state, district, area, name, siteType = '', branchCode = '', intercomSite = false) {
  if (!_stubs.localities.find(l => l.state === state && l.district === district && l.area === area && l.name === name)) {
    _stubs.localities = [..._stubs.localities, { state, district, area, name, siteType, branchCode, intercomSite }]
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

export function getLocalityInfo(state, district, area, locality) {
  const fromArea = _areas.find(a =>
    a.state === state && a.district === district && a.area === area && a.locality === locality
  )
  const fromStub = _stubs.localities.find(l =>
    l.state === state && l.district === district && l.area === area && l.name === locality
  )
  if (!fromArea && !fromStub) return null
  // siteType/branchCode are Sub Locality-provisioning details, so prefer an
  // actual sub-locality row when one exists. intercomSite is a Locality-level
  // attribute and always comes from the locality stub, never a sub-locality row.
  return {
    siteType: fromArea?.siteType || fromStub?.siteType || '',
    branchCode: fromArea?.branchCode || fromStub?.branchCode || '',
    intercomSite: !!fromStub?.intercomSite,
  }
}

export function upsertLocalityIntercomSite(state, district, area, locality, intercomSite) {
  const idx = _stubs.localities.findIndex(l =>
    l.state === state && l.district === district && l.area === area && l.name === locality
  )
  if (idx >= 0) {
    _stubs.localities = _stubs.localities.map((l, i) => i === idx ? { ...l, intercomSite } : l)
  } else {
    _stubs.localities = [..._stubs.localities, { state, district, area, name: locality, siteType: '', branchCode: '', intercomSite }]
  }
  notifyHierarchy()
}

// Flat, deduped list of every locality name across the whole state/district/area
// hierarchy — for pickers (e.g. Outage Management) that just need real locality
// names without caring which state/district/area they belong to.
export function getAllLocalities() {
  const set = new Set()
  getStates().forEach(state => {
    getDistricts(state).forEach(district => {
      getAreasList(state, district).forEach(area => {
        getLocalities(state, district, area).forEach(locality => set.add(locality))
      })
    })
  })
  return [...set].sort()
}

// Localities grouped by their parent Area (the closest "zone" tier in this
// hierarchy) — for pickers that support grouping/"select all in zone" at once
// (e.g. Outage Management's Affected Area(s) field).
export function getAllLocalitiesGrouped() {
  const groups = new Map() // area name -> Set(locality names)
  getStates().forEach(state => {
    getDistricts(state).forEach(district => {
      getAreasList(state, district).forEach(area => {
        const localities = getLocalities(state, district, area)
        if (!localities.length) return
        if (!groups.has(area)) groups.set(area, new Set())
        localities.forEach(l => groups.get(area).add(l))
      })
    })
  })
  return [...groups.entries()]
    .map(([area, set]) => ({ area, localities: [...set].sort() }))
    .sort((a, b) => a.area.localeCompare(b.area))
}

export function getIntercomLocalities(state, district, area) {
  return getLocalities(state, district, area).filter(locality => {
    const info = getLocalityInfo(state, district, area, locality)
    return !!info?.intercomSite
  })
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

// ── Hierarchy updaters — rename with cascade ────────────────────────────────

export function updateStateName(oldName, newName) {
  if (!newName.trim() || oldName === newName) return
  _stubs.states    = _stubs.states.map(s => s === oldName ? newName : s)
  _stubs.districts = _stubs.districts.map(d => d.state === oldName ? { ...d, state: newName } : d)
  _stubs.areas     = _stubs.areas.map(a => a.state === oldName ? { ...a, state: newName } : a)
  _stubs.localities= _stubs.localities.map(l => l.state === oldName ? { ...l, state: newName } : l)
  _areas           = _areas.map(a => a.state === oldName ? { ...a, state: newName } : a)
  notifyAll()
}

export function updateDistrictName(state, oldName, newName) {
  if (!newName.trim() || oldName === newName) return
  _stubs.districts = _stubs.districts.map(d => d.state === state && d.name === oldName ? { ...d, name: newName } : d)
  _stubs.areas     = _stubs.areas.map(a => a.state === state && a.district === oldName ? { ...a, district: newName } : a)
  _stubs.localities= _stubs.localities.map(l => l.state === state && l.district === oldName ? { ...l, district: newName } : l)
  _areas           = _areas.map(a => a.state === state && a.district === oldName ? { ...a, district: newName } : a)
  notifyAll()
}

export function updateAreaName(state, district, oldName, newName) {
  if (!newName.trim() || oldName === newName) return
  _stubs.areas     = _stubs.areas.map(a => a.state === state && a.district === district && a.name === oldName ? { ...a, name: newName } : a)
  _stubs.localities= _stubs.localities.map(l => l.state === state && l.district === district && l.area === oldName ? { ...l, area: newName } : l)
  _areas           = _areas.map(a => a.state === state && a.district === district && a.area === oldName ? { ...a, area: newName } : a)
  notifyAll()
}

export function updateLocalityName(state, district, area, oldName, newName) {
  if (!newName.trim() || oldName === newName) return
  _stubs.localities= _stubs.localities.map(l => l.state === state && l.district === district && l.area === area && l.name === oldName ? { ...l, name: newName } : l)
  _areas           = _areas.map(a => a.state === state && a.district === district && a.area === area && a.locality === oldName ? { ...a, locality: newName } : a)
  notifyAll()
}

// ── Hierarchy deleters — remove with full cascade ───────────────────────────

export function deleteStateName(name) {
  _stubs.states    = _stubs.states.filter(s => s !== name)
  _stubs.districts = _stubs.districts.filter(d => d.state !== name)
  _stubs.areas     = _stubs.areas.filter(a => a.state !== name)
  _stubs.localities= _stubs.localities.filter(l => l.state !== name)
  _areas           = _areas.filter(a => a.state !== name)
  notifyAll()
}

export function deleteDistrictName(state, name) {
  _stubs.districts = _stubs.districts.filter(d => !(d.state === state && d.name === name))
  _stubs.areas     = _stubs.areas.filter(a => !(a.state === state && a.district === name))
  _stubs.localities= _stubs.localities.filter(l => !(l.state === state && l.district === name))
  _areas           = _areas.filter(a => !(a.state === state && a.district === name))
  notifyAll()
}

export function deleteAreaName(state, district, name) {
  _stubs.areas     = _stubs.areas.filter(a => !(a.state === state && a.district === district && a.name === name))
  _stubs.localities= _stubs.localities.filter(l => !(l.state === state && l.district === district && l.area === name))
  _areas           = _areas.filter(a => !(a.state === state && a.district === district && a.area === name))
  notifyAll()
}

export function deleteLocalityName(state, district, area, name) {
  _stubs.localities= _stubs.localities.filter(l => !(l.state === state && l.district === district && l.area === area && l.name === name))
  _areas           = _areas.filter(a => !(a.state === state && a.district === district && a.area === area && a.locality === name))
  notifyAll()
}

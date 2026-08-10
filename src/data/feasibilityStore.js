export const FEASIBILITY_ENGINEERS = [
  { name: 'Arjun Kumar',   initials: 'AK', color: 'bg-brand-blue'  },
  { name: 'Preethi Nair',  initials: 'PN', color: 'bg-purple-500'  },
  { name: 'Anita Sharma',  initials: 'AS', color: 'bg-teal-500'    },
  { name: 'Suresh Babu',   initials: 'SB', color: 'bg-emerald-600' },
  { name: 'Ravi Menon',    initials: 'RM', color: 'bg-orange-500'  },
]

export const FEASIBILITY_BRANCHES = [
  'CNPL-001','CNPL-002','CNPL-003','CNPL-004','CNPL-005',
  'CNPL-006','CNPL-007','CNPL-008','CNPL-009','CNPL-010','CNPL-011',
]

const SEED = [
  {
    id: 'FR-001', leadId: 'LD-301', customerName: 'Rakesh Verma', mobile: '9812345678',
    email: 'rakesh.verma@email.com', pipeline: 'Residential', stage: 'Feasibility Check',
    createdBy: 'Salim Khan',
    village: 'Sector 78', area: 'Noida', localityName: 'Sector 78', subLocalityName: 'Block D',
    landmark: 'Near Sector 78 Metro Gate 2', gpsLocation: '28.6293° N, 77.3649° E',
    connectionType: 'FTTH', assignedBranch: 'CNPL-002',
    feasibilityStatus: 'Pending', createdAt: '2026-05-18',
    feasibilityReason: 'New expansion area — no existing fiber',
    networkExpansionRequired: 'Yes',
    estimatedDistanceFromFiber: '850 meters',
    poleRequirement: '12 poles',
    customerRequirementNotes: 'Customer wants 100 Mbps plan, willing to wait up to 3 weeks.',
    internalRemarks: 'Check with infra team for OFC availability in Sector 78.',
    assignedEngineer: '', fiberRequired: '',
    priority: 'High',
    // Seeded so the Hardware tab renders with data out of the box instead
    // of the empty state — same { name, chargeable, unitPrice, quantity }
    // shape the Add Hardware modal produces (see HARDWARE_CATALOG), items
    // added via that modal get appended alongside these, not replace them.
    hardwareItems: [
      { name: 'Wall Mount Bracket', chargeable: false, unitPrice: 150, quantity: 1 },
      { name: 'Patch Cord (LC-LC, 5m)', chargeable: false, unitPrice: 90, quantity: 2 },
      { name: 'WiFi Router', chargeable: true, unitPrice: 1500, quantity: 1 },
    ],
    timeline: [
      { action: 'Created', by: 'Salim Khan', at: '2026-05-18 10:23', note: 'Feasibility request raised from lead LD-301' },
    ],
  },
  {
    id: 'FR-002', leadId: 'LD-302', customerName: 'Sunita Rao', mobile: '9876543210',
    email: 'sunita.rao@email.com', pipeline: 'Residential', stage: 'Feasibility Check',
    createdBy: 'Pooja Mehta',
    village: 'Raj Nagar', area: 'Ghaziabad', localityName: 'Raj Nagar', subLocalityName: 'Pocket 5',
    landmark: 'Opposite RNS Hospital', gpsLocation: '28.6726° N, 77.4362° E',
    connectionType: 'Sector', assignedBranch: 'CNPL-003',
    feasibilityStatus: 'Pending', createdAt: '2026-05-17',
    feasibilityReason: 'Customer in sector boundary — needs field check',
    networkExpansionRequired: 'No',
    estimatedDistanceFromFiber: '120 meters',
    poleRequirement: '3 poles',
    customerRequirementNotes: 'Needs high-speed connection for WFH setup.',
    internalRemarks: 'Possible sector handoff — verify boundary with CNPL-003 team.',
    assignedEngineer: '', fiberRequired: '120',
    priority: 'Medium',
    timeline: [
      { action: 'Created', by: 'Pooja Mehta', at: '2026-05-17 14:05', note: 'Feasibility request raised from lead LD-302' },
    ],
  },
  {
    id: 'FR-003', leadId: 'LD-303', customerName: 'Amit Singh', mobile: '9988776655',
    email: 'amit.singh@email.com', pipeline: 'Enterprise', stage: 'Feasibility Check',
    createdBy: 'Ravi Patel',
    village: 'Palm Meadows', area: 'Bangalore', localityName: 'Bellandur', subLocalityName: 'Palm Meadows',
    landmark: 'Palm Meadows Main Gate', gpsLocation: '12.9352° N, 77.6745° E',
    connectionType: 'FTTH', assignedBranch: 'CNPL-010',
    feasibilityStatus: 'Assigned', createdAt: '2026-05-16',
    feasibilityReason: 'Multi-floor building — duct access unclear',
    networkExpansionRequired: 'No',
    estimatedDistanceFromFiber: '200 meters',
    poleRequirement: 'None — indoor duct',
    customerRequirementNotes: 'B2B customer, needs 500 Mbps for 40 users.',
    internalRemarks: 'Building manager must be contacted for duct permission.',
    assignedEngineer: 'Arjun Kumar', fiberRequired: '200',
    assignmentDate: '2026-05-17', assignmentNotes: 'Check duct availability on floors 2–5.',
    priority: 'High',
    timeline: [
      { action: 'Created', by: 'Ravi Patel', at: '2026-05-16 09:10', note: 'Feasibility request raised from lead LD-303' },
      { action: 'Assigned', by: 'Admin', at: '2026-05-17 11:30', note: 'Assigned to Arjun Kumar — check duct availability' },
    ],
  },
  {
    id: 'FR-004', leadId: 'LD-304', customerName: 'Priya Menon', mobile: '9123456789',
    email: 'priya.menon@email.com', pipeline: 'Residential', stage: 'Feasibility Check',
    createdBy: 'Anil Sharma',
    village: 'Tower 12', area: 'Noida Extension', localityName: 'Gaur City', subLocalityName: 'Tower 12',
    landmark: 'Gaur City Tower 12 Lobby', gpsLocation: '28.5968° N, 77.4317° E',
    connectionType: 'FTTH', assignedBranch: 'CNPL-001',
    feasibilityStatus: 'In Progress', createdAt: '2026-05-20',
    feasibilityReason: 'Gated society — permission required',
    networkExpansionRequired: 'No',
    estimatedDistanceFromFiber: '50 meters',
    poleRequirement: 'None — existing conduit',
    customerRequirementNotes: 'Customer wants 200 Mbps. Preferred installation date: 25 May.',
    internalRemarks: 'Society NOC pending — Suresh to follow up with RWA.',
    assignedEngineer: 'Suresh Babu', fiberRequired: '350',
    assignmentDate: '2026-05-20', assignmentNotes: 'Obtain NOC from Gaur City RWA, then proceed.',
    priority: 'Medium',
    timeline: [
      { action: 'Created', by: 'Anil Sharma', at: '2026-05-20 08:45', note: 'Feasibility request raised from lead LD-304' },
      { action: 'Assigned', by: 'Admin', at: '2026-05-20 10:00', note: 'Assigned to Suresh Babu for NOC procurement' },
      { action: 'In Progress', by: 'Suresh Babu', at: '2026-05-21 16:20', note: 'RWA meeting scheduled for 22 May' },
    ],
  },
  {
    id: 'FR-005', leadId: 'LD-305', customerName: 'Deepak Joshi', mobile: '9000123456',
    email: 'deepak.joshi@email.com', pipeline: 'Residential', stage: 'Approved',
    createdBy: 'Neha Gupta',
    village: 'Block H', area: 'Indirapuram', localityName: 'Shipra Sun City', subLocalityName: 'Block H',
    landmark: 'Block H Community Hall', gpsLocation: '28.6405° N, 77.3762° E',
    connectionType: 'Village', assignedBranch: 'CNPL-005',
    feasibilityStatus: 'Approved', createdAt: '2026-05-21',
    feasibilityReason: 'Village connection — long-distance run',
    networkExpansionRequired: 'Yes',
    estimatedDistanceFromFiber: '1.2 km',
    poleRequirement: '18 poles',
    customerRequirementNotes: 'Community of 40 households. Bulk connection preferred.',
    internalRemarks: 'Long-distance run approved by infra committee on 23 May.',
    assignedEngineer: 'Preethi Nair', fiberRequired: '500',
    assignmentDate: '2026-05-22', assignmentNotes: 'Survey entire route from Shipra main OFC to Block H.',
    approvalComment: 'Route survey complete. OFC laying approved for Block H community.',
    hardwareSummary: '18 poles, 500m fiber, 2 ODF boxes, 40 ONTs',
    installationNotes: 'Work to begin 1 June. Contractor: M/s Infra Plus.',
    approvedBy: 'Rajesh Kumar (Network Head)', approvedAt: '2026-05-24 10:15',
    priority: 'Low',
    timeline: [
      { action: 'Created', by: 'Neha Gupta', at: '2026-05-21 11:00', note: 'Feasibility request raised from lead LD-305' },
      { action: 'Assigned', by: 'Admin', at: '2026-05-22 09:30', note: 'Assigned to Preethi Nair for route survey' },
      { action: 'In Progress', by: 'Preethi Nair', at: '2026-05-23 14:00', note: 'Route survey in progress — 1.2 km stretch mapped' },
      { action: 'Approved', by: 'Rajesh Kumar (Network Head)', at: '2026-05-24 10:15', note: 'Approved. OFC laying order raised.' },
    ],
  },
]

let _requests = [...SEED]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._requests])) }

export function getFeasibilityRequests() { return _requests }
export function getFeasibilityRequest(id) { return _requests.find(r => r.id === id) ?? null }

export function saveFeasibilityRequest(req) {
  if (req.id && _requests.find(r => r.id === req.id)) {
    _requests = _requests.map(r => r.id === req.id ? { ...r, ...req } : r)
  } else {
    const id = `FR-${String(_requests.length + 1).padStart(3, '0')}`
    _requests = [..._requests, { ...req, id, createdAt: new Date().toISOString().slice(0, 10) }]
  }
  notify()
}

export function updateFeasibilityStatus(id, status, extra = {}) {
  const now = new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16).replace('T', ' ')
  _requests = _requests.map(r => {
    if (r.id !== id) return r
    const timelineEntry = {
      action: status,
      by: extra._by || 'Admin',
      at: now,
      note: extra._note || `Status changed to ${status}`,
    }
    const { _by, _note, ...cleanExtra } = extra
    return {
      ...r,
      feasibilityStatus: status,
      ...cleanExtra,
      timeline: [...(r.timeline || []), timelineEntry],
    }
  })
  notify()
}

export function subscribeFeasibility(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

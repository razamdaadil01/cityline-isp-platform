const SEED = [
  {
    id: 'FR-001', leadId: 'LD-301', customerName: 'Rakesh Verma', mobile: '9812345678',
    village: 'Sector 78', area: 'Noida', localityName: 'Sector 78', subLocalityName: 'Block D',
    connectionType: 'FTTH', assignedBranch: 'CNPL-002',
    feasibilityStatus: 'Pending', createdAt: '2026-05-18',
    feasibilityReason: 'New expansion area — no existing fiber', assignedEngineer: '', fiberRequired: '',
    priority: 'High',
  },
  {
    id: 'FR-002', leadId: 'LD-302', customerName: 'Sunita Rao', mobile: '9876543210',
    village: 'Raj Nagar', area: 'Ghaziabad', localityName: 'Raj Nagar', subLocalityName: 'Pocket 5',
    connectionType: 'Sector', assignedBranch: 'CNPL-003',
    feasibilityStatus: 'Pending', createdAt: '2026-05-17',
    feasibilityReason: 'Customer in sector boundary — needs field check', assignedEngineer: '', fiberRequired: '120',
    priority: 'Medium',
  },
  {
    id: 'FR-003', leadId: 'LD-303', customerName: 'Amit Singh', mobile: '9988776655',
    village: 'Palm Meadows', area: 'Bangalore', localityName: 'Bellandur', subLocalityName: 'Palm Meadows',
    connectionType: 'FTTH', assignedBranch: 'CNPL-010',
    feasibilityStatus: 'Assigned', createdAt: '2026-05-16',
    feasibilityReason: 'Multi-floor building — duct access unclear', assignedEngineer: 'Arjun Kumar', fiberRequired: '200',
    priority: 'High',
  },
  {
    id: 'FR-004', leadId: 'LD-304', customerName: 'Priya Menon', mobile: '9123456789',
    village: 'Tower 12', area: 'Noida Extension', localityName: 'Gaur City', subLocalityName: 'Tower 12',
    connectionType: 'FTTH', assignedBranch: 'CNPL-001',
    feasibilityStatus: 'In Progress', createdAt: '2026-05-20',
    feasibilityReason: 'Gated society — permission required', assignedEngineer: 'Suresh Babu', fiberRequired: '350',
    priority: 'Medium',
  },
  {
    id: 'FR-005', leadId: 'LD-305', customerName: 'Deepak Joshi', mobile: '9000123456',
    village: 'Block H', area: 'Indirapuram', localityName: 'Shipra Sun City', subLocalityName: 'Block H',
    connectionType: 'Village', assignedBranch: 'CNPL-005',
    feasibilityStatus: 'Approved', createdAt: '2026-05-21',
    feasibilityReason: 'Village connection — long-distance run', assignedEngineer: 'Preethi Nair', fiberRequired: '500',
    priority: 'Low',
  },
]

let _requests = [...SEED]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._requests])) }

export function getFeasibilityRequests() { return _requests }

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
  _requests = _requests.map(r => r.id === id ? { ...r, feasibilityStatus: status, ...extra } : r)
  notify()
}

export function subscribeFeasibility(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

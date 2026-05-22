// Feasibility requests store

const SEED = [
  {
    id: 'FR-001', leadId: 'LD-301', customerName: 'Rakesh Verma', phone: '9812345678',
    area: 'Noida', localityName: 'Sector 78', subLocalityName: 'Block D',
    connectionType: 'FTTH', assignedBranch: 'CNPL-002',
    feasibilityStatus: 'Pending', createdAt: '2026-05-18',
  },
  {
    id: 'FR-002', leadId: 'LD-302', customerName: 'Sunita Rao', phone: '9876543210',
    area: 'Ghaziabad', localityName: 'Raj Nagar', subLocalityName: 'Pocket 5',
    connectionType: 'Sector', assignedBranch: 'CNPL-003',
    feasibilityStatus: 'Feasible', createdAt: '2026-05-17',
  },
  {
    id: 'FR-003', leadId: 'LD-303', customerName: 'Amit Singh', phone: '9988776655',
    area: 'Bangalore', localityName: 'Bellandur', subLocalityName: 'Palm Meadows',
    connectionType: 'FTTH', assignedBranch: 'CNPL-010',
    feasibilityStatus: 'Not Feasible', createdAt: '2026-05-16',
  },
  {
    id: 'FR-004', leadId: 'LD-304', customerName: 'Priya Menon', phone: '9123456789',
    area: 'Noida Extension', localityName: 'Gaur City', subLocalityName: 'Tower 12',
    connectionType: 'FTTH', assignedBranch: 'CNPL-001',
    feasibilityStatus: 'Pending', createdAt: '2026-05-20',
  },
  {
    id: 'FR-005', leadId: 'LD-305', customerName: 'Deepak Joshi', phone: '9000123456',
    area: 'Indirapuram', localityName: 'Shipra Sun City', subLocalityName: 'Block H',
    connectionType: 'Village', assignedBranch: '',
    feasibilityStatus: 'Pending', createdAt: '2026-05-21',
  },
]

let _requests = [...SEED]
const _listeners = []

export function getFeasibilityRequests() { return _requests }

export function saveFeasibilityRequest(req) {
  if (req.id && _requests.find(r => r.id === req.id)) {
    _requests = _requests.map(r => r.id === req.id ? { ...r, ...req } : r)
  } else {
    const id = `FR-${String(_requests.length + 1).padStart(3, '0')}`
    _requests = [..._requests, { ...req, id, createdAt: new Date().toISOString().slice(0, 10) }]
  }
  _listeners.forEach(fn => fn([..._requests]))
}

export function updateFeasibilityStatus(id, status) {
  _requests = _requests.map(r => r.id === id ? { ...r, feasibilityStatus: status } : r)
  _listeners.forEach(fn => fn([..._requests]))
}

export function subscribeFeasibility(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

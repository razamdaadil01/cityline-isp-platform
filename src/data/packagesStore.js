export const MOCK_TENURES = [
  { id: 1, name: '1 Month',     months: 1,  description: 'Monthly billing cycle',     status: 'Active' },
  { id: 2, name: '3 Months',    months: 3,  description: 'Quarterly billing cycle',   status: 'Active' },
  { id: 3, name: '6 Months',    months: 6,  description: 'Semi-annual billing cycle', status: 'Active' },
  { id: 4, name: '1 Year',      months: 12, description: 'Annual billing cycle',      status: 'Active' },
  { id: 5, name: '12+1 Month',  months: 13, description: 'Annual + 1 free month',     status: 'Active' },
  { id: 6, name: '12+2 Months', months: 14, description: 'Annual + 2 free months',    status: 'Active' },
]

export const MOCK_BANDWIDTHS = [
  { id: 1, speed: 50,  unit: 'Mbps', description: '50 Mbps fiber',  status: 'Active' },
  { id: 2, speed: 100, unit: 'Mbps', description: '100 Mbps fiber', status: 'Active' },
  { id: 3, speed: 150, unit: 'Mbps', description: '150 Mbps fiber', status: 'Active' },
  { id: 4, speed: 200, unit: 'Mbps', description: '200 Mbps fiber', status: 'Active' },
  { id: 5, speed: 300, unit: 'Mbps', description: '300 Mbps fiber', status: 'Active' },
  { id: 6, speed: 500, unit: 'Mbps', description: '500 Mbps fiber', status: 'Active' },
  { id: 7, speed: 1,   unit: 'Gbps', description: '1 Gbps fiber',   status: 'Active' },
]

export const MOCK_OTT = [
  { id: 1, name: 'Cityline TV Gold',   provider: 'Playbox', description: 'Premium OTT bundle',  status: 'Active' },
  { id: 2, name: 'Cityline TV Silver', provider: 'Playbox', description: 'Standard OTT bundle', status: 'Active' },
  { id: 3, name: 'Cityline TV Basic',  provider: 'Playbox', description: 'Basic OTT bundle',    status: 'Active' },
]

export const MOCK_BW_PACKAGES = [
  {
    id: 'BWP-001', type: 'Bandwidth', name: 'Sonic 100', zone: 'Residential',
    rows: [
      { bandwidth: '100 Mbps', jazeId: 23, tenure: '1 Month',  price: 899,   ott: 'Cityline TV Basic' },
      { bandwidth: '100 Mbps', jazeId: 24, tenure: '3 Months', price: 2499,  ott: 'Cityline TV Basic' },
      { bandwidth: '100 Mbps', jazeId: 25, tenure: '1 Year',   price: 8999,  ott: 'Cityline TV Basic' },
    ],
    editable: false, landline: false, offer: false, status: 'Active',
  },
  {
    id: 'BWP-002', type: 'Bandwidth', name: 'Sonic 200', zone: 'Residential',
    rows: [
      { bandwidth: '200 Mbps', jazeId: 30, tenure: '1 Month', price: 1499,  ott: 'Cityline TV Gold' },
      { bandwidth: '200 Mbps', jazeId: 31, tenure: '1 Year',  price: 14999, ott: 'Cityline TV Gold' },
    ],
    editable: false, landline: true, offer: false, status: 'Active',
  },
  {
    id: 'BWP-003', type: 'Bandwidth', name: 'Enterprise ILL 100', zone: 'Enterprise',
    rows: [
      { bandwidth: '100 Mbps', jazeId: 50, tenure: '1 Month', price: 15000,  ott: 'None' },
      { bandwidth: '100 Mbps', jazeId: 51, tenure: '1 Year',  price: 150000, ott: 'None' },
    ],
    editable: true, landline: true, offer: false, status: 'Active',
  },
]

export const MOCK_OTHER_PACKAGES = [
  { id: 'OTH-001', type: 'Other', name: 'ONU Installation Charges', zone: 'Residential', bindPackage: null,        price: 500, separateInvoice: true,  status: 'Active' },
  { id: 'OTH-002', type: 'Other', name: 'Static IP Package',        zone: 'Both',        bindPackage: null,        price: 200, separateInvoice: true,  status: 'Active' },
  { id: 'OTH-003', type: 'Other', name: 'Router Rental',            zone: 'Residential', bindPackage: 'Sonic 100', price: 150, separateInvoice: false, status: 'Active' },
]

export const MOCK_LANDLINES = [
  { id: 1, number: '+91-120-4567890', status: 'Available', assignedTo: null,     customer: null,          assignedDate: null },
  { id: 2, number: '+91-120-4567891', status: 'Available', assignedTo: null,     customer: null,          assignedDate: null },
  { id: 3, number: '+91-120-4567892', status: 'Assigned',  assignedTo: 'LD-201', customer: 'Ramesh Nair', assignedDate: '2026-01-15' },
]

export const MOCK_STATIC_IPS = [
  { id: 1, ip: '103.21.58.10', subnet: '255.255.255.0', gateway: '103.21.58.1', status: 'Available', assignedTo: null,     customer: null },
  { id: 2, ip: '103.21.58.11', subnet: '255.255.255.0', gateway: '103.21.58.1', status: 'Assigned',  assignedTo: 'LD-301', customer: 'Anita Sharma' },
  { id: 3, ip: '103.21.58.12', subnet: '255.255.255.0', gateway: '103.21.58.1', status: 'Available', assignedTo: null,     customer: null },
]

export const MOCK_PLANS = [...MOCK_BW_PACKAGES, ...MOCK_OTHER_PACKAGES]
export const SERVICE_TYPES = ['Bandwidth', 'Other']
export const BILLING_TYPES = ['Monthly', 'Annual']
export const SERVICE_BADGE = { Bandwidth: 'blue', Other: 'gray' }

let _plans = [...MOCK_PLANS]
const _subs = new Set()
export function getPlans() { return _plans }
export function savePlan(plan) { _plans = [{ ...plan, id: plan.id || `PKG-${Date.now()}` }, ..._plans]; _subs.forEach(fn => fn()) }
export function updatePlanStatus(id, status) { _plans = _plans.map(p => p.id === id ? { ...p, status } : p); _subs.forEach(fn => fn()) }
export function subscribePlans(fn) { _subs.add(fn); return () => _subs.delete(fn) }

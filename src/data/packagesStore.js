// Mock data store for Package Management

export const MOCK_TENURES = [
  { id: 't1', name: '1 Month', months: 1, discount: 0, status: 'active' },
  { id: 't2', name: '3 Months', months: 3, discount: 5, status: 'active' },
  { id: 't3', name: '6 Months', months: 6, discount: 10, status: 'active' },
  { id: 't4', name: '12 Months', months: 12, discount: 15, status: 'active' },
  { id: 't5', name: '24 Months', months: 24, discount: 20, status: 'inactive' },
  { id: 't6', name: '36 Months', months: 36, discount: 25, status: 'inactive' },
]

export const MOCK_BANDWIDTHS = [
  { id: 'bw1', name: '50 Mbps', download: 50, upload: 50, unit: 'Mbps', status: 'active' },
  { id: 'bw2', name: '100 Mbps', download: 100, upload: 100, unit: 'Mbps', status: 'active' },
  { id: 'bw3', name: '150 Mbps', download: 150, upload: 150, unit: 'Mbps', status: 'active' },
  { id: 'bw4', name: '200 Mbps', download: 200, upload: 200, unit: 'Mbps', status: 'active' },
  { id: 'bw5', name: '300 Mbps', download: 300, upload: 300, unit: 'Mbps', status: 'active' },
  { id: 'bw6', name: '500 Mbps', download: 500, upload: 500, unit: 'Mbps', status: 'active' },
  { id: 'bw7', name: '1 Gbps', download: 1000, upload: 1000, unit: 'Gbps', status: 'active' },
]

export const MOCK_OTT = [
  { id: 'ott1', name: 'Cityline TV Gold', provider: 'Playbox', channels: 250, price: 299, status: 'active' },
  { id: 'ott2', name: 'Cityline TV Silver', provider: 'Playbox', channels: 150, price: 199, status: 'active' },
  { id: 'ott3', name: 'Cityline TV Basic', provider: 'Playbox', channels: 80, price: 99, status: 'active' },
]

export const MOCK_BW_PACKAGES = [
  {
    id: 'bwp1',
    name: 'Sonic 100',
    zone: 'Residential',
    type: 'bandwidth',
    bandwidths: [
      { bandwidth: '100 Mbps', tenures: [
        { tenure: '1 Month', price: 999, mrp: 1199 },
        { tenure: '3 Months', price: 2799, mrp: 3399 },
        { tenure: '6 Months', price: 5399, mrp: 6599 },
        { tenure: '12 Months', price: 9999, mrp: 12999 },
      ]},
    ],
    landlineEnabled: false,
    staticIpEnabled: false,
    ottEnabled: true,
    status: 'active',
    subscribers: 342,
  },
  {
    id: 'bwp2',
    name: 'Sonic 200',
    zone: 'Residential',
    type: 'bandwidth',
    bandwidths: [
      { bandwidth: '200 Mbps', tenures: [
        { tenure: '1 Month', price: 1499, mrp: 1799 },
        { tenure: '3 Months', price: 4299, mrp: 5099 },
        { tenure: '6 Months', price: 8299, mrp: 9999 },
        { tenure: '12 Months', price: 15999, mrp: 19999 },
      ]},
    ],
    landlineEnabled: true,
    staticIpEnabled: true,
    ottEnabled: true,
    status: 'active',
    subscribers: 187,
  },
  {
    id: 'bwp3',
    name: 'Enterprise ILL 100',
    zone: 'Enterprise',
    type: 'bandwidth',
    bandwidths: [
      { bandwidth: '100 Mbps', tenures: [
        { tenure: '1 Month', price: 4999, mrp: 5999 },
        { tenure: '12 Months', price: 54999, mrp: 65999 },
      ]},
    ],
    landlineEnabled: true,
    staticIpEnabled: true,
    ottEnabled: false,
    status: 'active',
    subscribers: 45,
  },
]

export const MOCK_OTHER_PACKAGES = [
  { id: 'op1', name: 'ONU Installation', type: 'one-time', price: 1500, taxable: true, boundPackage: null, status: 'active' },
  { id: 'op2', name: 'Static IP', type: 'recurring', price: 299, taxable: true, boundPackage: 'Sonic 200', status: 'active' },
  { id: 'op3', name: 'Router Rental', type: 'recurring', price: 199, taxable: false, boundPackage: null, status: 'active' },
]

export const MOCK_LANDLINES = [
  { id: 'ln1', number: '+91-22-4567-8901', type: 'DID', assignedTo: 'Ramesh Nair', customerId: 'C-1042', status: 'assigned' },
  { id: 'ln2', number: '+91-22-4567-8902', type: 'DID', assignedTo: null, customerId: null, status: 'available' },
  { id: 'ln3', number: '+91-22-4567-8903', type: 'DID', assignedTo: null, customerId: null, status: 'available' },
]

export const MOCK_STATIC_IPS = [
  { id: 'ip1', address: '103.21.58.10', subnet: '/32', assignedTo: 'Anita Sharma', customerId: 'C-1089', status: 'assigned' },
  { id: 'ip2', address: '103.21.58.11', subnet: '/32', assignedTo: null, customerId: null, status: 'available' },
  { id: 'ip3', address: '103.21.58.12', subnet: '/32', assignedTo: null, customerId: null, status: 'available' },
]

// Backward-compatible exports
export const MOCK_PLANS = MOCK_BW_PACKAGES
export function getPlans() { return MOCK_BW_PACKAGES }
export function savePlan(plan) { MOCK_BW_PACKAGES.push({ ...plan, id: 'bwp' + Date.now(), subscribers: 0 }) }
export function updatePlanStatus(id, status) {
  const p = MOCK_BW_PACKAGES.find(x => x.id === id)
  if (p) p.status = status
}
export const subscribePlans = MOCK_BW_PACKAGES

// Legacy exports for other components
export const SERVICE_TYPES = ['bandwidth', 'other']
export const BILLING_TYPES = ['Monthly', 'Annual']
export const SERVICE_BADGE = { bandwidth: 'blue', other: 'gray', Bandwidth: 'blue', Other: 'gray' }

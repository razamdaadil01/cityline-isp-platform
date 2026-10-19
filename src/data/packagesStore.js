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
    code: 'SONIC100', radiusId: 'RAD-1001',
    rows: [
      { bandwidth: '100 Mbps', jazeId: 23, tenure: '1 Month',  price: 899,   ott: 'Cityline TV Basic' },
      { bandwidth: '100 Mbps', jazeId: 24, tenure: '3 Months', price: 2499,  ott: 'Cityline TV Basic' },
      { bandwidth: '100 Mbps', jazeId: 25, tenure: '1 Year',   price: 8999,  ott: 'Cityline TV Basic' },
    ],
    boundPackages: [
      { name: 'Installation Charge', code: 'INSTALLATION_CHARGE', price: 999 },
    ],
    editable: false, landline: false, staticIp: false, offer: false, status: 'Active',
  },
  {
    id: 'BWP-002', type: 'Bandwidth', name: 'Sonic 200', zone: 'Residential',
    code: 'SONIC200', radiusId: 'RAD-2002',
    rows: [
      { bandwidth: '200 Mbps', jazeId: 30, tenure: '1 Month', price: 1499,  ott: 'Cityline TV Gold' },
      { bandwidth: '200 Mbps', jazeId: 31, tenure: '1 Year',  price: 14999, ott: 'Cityline TV Gold' },
    ],
    boundPackages: [
      { name: 'Installation Charge', code: 'INSTALLATION_CHARGE', price: 1180 },
    ],
    editable: false, landline: true, staticIp: false, offer: false, status: 'Active',
  },
  {
    id: 'BWP-003', type: 'Bandwidth', name: 'Enterprise ILL 100', zone: 'Enterprise',
    code: 'ENT_ILL100', radiusId: 'RAD-3003',
    rows: [
      { bandwidth: '100 Mbps', jazeId: 50, tenure: '1 Month', price: 15000,  ott: 'None' },
      { bandwidth: '100 Mbps', jazeId: 51, tenure: '1 Year',  price: 150000, ott: 'None' },
    ],
    boundPackages: [
      { name: 'Installation Charge', code: 'INSTALLATION_CHARGE', price: 2500 },
    ],
    editable: true, landline: true, staticIp: true, offer: false, status: 'Active',
  },
  {
    id: 'BWP-004', type: 'Bandwidth', name: 'FTTB 50Mbps', zone: 'Residential',
    code: 'FTTB50', radiusId: 'RAD-4004',
    rows: [
      { bandwidth: '50 Mbps', jazeId: 60, tenure: '1 Month', price: 599,  ott: 'None' },
    ],
    boundPackages: [], editable: false, landline: false, staticIp: false, offer: false, status: 'Active',
  },
  {
    id: 'BWP-005', type: 'Bandwidth', name: 'Wireless 25Mbps', zone: 'Residential',
    code: 'WLESS25', radiusId: 'RAD-5005',
    rows: [
      { bandwidth: '25 Mbps', jazeId: 61, tenure: '1 Month', price: 399,  ott: 'None' },
    ],
    boundPackages: [], editable: false, landline: false, staticIp: false, offer: false, status: 'Active',
  },
  {
    id: 'BWP-006', type: 'Bandwidth', name: 'ILL 10Mbps', zone: 'Enterprise',
    code: 'ILL10', radiusId: 'RAD-6006',
    rows: [
      { bandwidth: '10 Mbps', jazeId: 62, tenure: '1 Month', price: 4999,  ott: 'None' },
    ],
    boundPackages: [], editable: true, landline: false, staticIp: true, offer: false, status: 'Active',
  },
  {
    id: 'BWP-007', type: 'Bandwidth', name: 'FTTH 40Mbps', zone: 'Residential',
    code: 'FTTH40', radiusId: 'RAD-7007',
    rows: [
      { bandwidth: '40 Mbps', jazeId: 63, tenure: '1 Month', price: 499,  ott: 'None' },
    ],
    boundPackages: [], editable: false, landline: false, staticIp: false, offer: false, status: 'Active',
  },
  {
    id: 'BWP-008', type: 'Bandwidth', name: 'Wireless 10Mbps', zone: 'Residential',
    code: 'WLESS10', radiusId: 'RAD-8008',
    rows: [
      { bandwidth: '10 Mbps', jazeId: 64, tenure: '1 Month', price: 299,  ott: 'None' },
    ],
    boundPackages: [], editable: false, landline: false, staticIp: false, offer: false, status: 'Active',
  },
  {
    id: 'BWP-009', type: 'Bandwidth', name: 'FTTH 500Mbps', zone: 'Residential',
    code: 'FTTH500', radiusId: 'RAD-9009',
    rows: [
      { bandwidth: '500 Mbps', jazeId: 65, tenure: '1 Month', price: 3999,  ott: 'None' },
    ],
    boundPackages: [], editable: false, landline: false, staticIp: false, offer: false, status: 'Active',
  },
  {
    id: 'BWP-010', type: 'Bandwidth', name: 'FTTH 1Gbps', zone: 'Residential',
    code: 'FTTH1G', radiusId: 'RAD-1010',
    rows: [
      { bandwidth: '1 Gbps', jazeId: 66, tenure: '1 Month', price: 7999,  ott: 'None' },
    ],
    boundPackages: [], editable: false, landline: false, staticIp: false, offer: false, status: 'Active',
  },
  {
    id: 'BWP-011', type: 'Bandwidth', name: 'ILL 100Mbps', zone: 'Enterprise',
    code: 'ILL100', radiusId: 'RAD-1011',
    rows: [
      { bandwidth: '100 Mbps', jazeId: 67, tenure: '1 Month', price: 14999, ott: 'None' },
    ],
    boundPackages: [], editable: true, landline: false, staticIp: true, offer: false, status: 'Active',
  },
  {
    id: 'BWP-012', type: 'Bandwidth', name: 'ILL 500Mbps', zone: 'Enterprise',
    code: 'ILL500', radiusId: 'RAD-1012',
    rows: [
      { bandwidth: '500 Mbps', jazeId: 68, tenure: '1 Month', price: 49999, ott: 'None' },
    ],
    boundPackages: [], editable: true, landline: false, staticIp: true, offer: false, status: 'Active',
  },
  {
    id: 'BWP-013', type: 'Bandwidth', name: 'P2P 100Mbps', zone: 'Enterprise',
    code: 'P2P100', radiusId: 'RAD-1013',
    rows: [
      { bandwidth: '100 Mbps', jazeId: 69, tenure: '1 Month', price: 9999,  ott: 'None' },
    ],
    boundPackages: [], editable: true, landline: false, staticIp: true, offer: false, status: 'Active',
  },
  {
    id: 'BWP-014', type: 'Bandwidth', name: 'P2P 1Gbps', zone: 'Enterprise',
    code: 'P2P1G', radiusId: 'RAD-1014',
    rows: [
      { bandwidth: '1 Gbps', jazeId: 70, tenure: '1 Month', price: 29999,  ott: 'None' },
    ],
    boundPackages: [], editable: true, landline: false, staticIp: true, offer: false, status: 'Active',
  },
  {
    id: 'BWP-015', type: 'Bandwidth', name: 'P2P 2Gbps', zone: 'Enterprise',
    code: 'P2P2G', radiusId: 'RAD-1015',
    rows: [
      { bandwidth: '2 Gbps', jazeId: 71, tenure: '1 Month', price: 49999,  ott: 'None' },
    ],
    boundPackages: [], editable: true, landline: false, staticIp: true, offer: false, status: 'Active',
  },
  {
    id: 'BWP-016', type: 'Bandwidth', name: 'P2P 10Gbps', zone: 'Enterprise',
    code: 'P2P10G', radiusId: 'RAD-1016',
    rows: [
      { bandwidth: '10 Gbps', jazeId: 72, tenure: '1 Month', price: 149999, ott: 'None' },
    ],
    boundPackages: [], editable: true, landline: false, staticIp: true, offer: false, status: 'Active',
  },
  {
    id: 'BWP-017', type: 'Bandwidth', name: 'Wireless 50Mbps', zone: 'Residential',
    code: 'WLESS50', radiusId: 'RAD-1017',
    rows: [
      { bandwidth: '50 Mbps', jazeId: 73, tenure: '1 Month', price: 549,  ott: 'None' },
    ],
    boundPackages: [], editable: false, landline: false, staticIp: false, offer: false, status: 'Active',
  },
]

export const MOCK_OTHER_PACKAGES = [
  { id: 'OTH-001', type: 'Other', name: 'ONU Installation Charges', zone: 'Residential', bindPackage: null,        price: 500, separateInvoice: true,  status: 'Active' },
  { id: 'OTH-002', type: 'Other', name: 'Static IP Package',        zone: 'Both',        bindPackage: null,        price: 200, separateInvoice: true,  status: 'Active' },
  { id: 'OTH-003', type: 'Other', name: 'Router Rental',            zone: 'Residential', bindPackage: 'Sonic 100', price: 150, separateInvoice: false, status: 'Active' },
  { id: 'OTH-010', type: 'Other', name: 'Intercom Basic',           zone: 'Residential', bindPackage: null,        price: 199, separateInvoice: false, status: 'Active' },
]

export const MOCK_LANDLINES = [
  { id: 1, number: '+91-120-4567890', status: 'Available', assignedTo: null,     customer: null,          assignedDate: null,       addedAt: '2025-06-01', removedAt: null },
  { id: 2, number: '+91-120-4567891', status: 'Available', assignedTo: null,     customer: null,          assignedDate: null,       addedAt: '2025-06-01', removedAt: null },
  { id: 3, number: '+91-120-4567892', status: 'Assigned',  assignedTo: 'LD-201', customer: 'Ramesh Nair', assignedDate: '2026-01-15', addedAt: '2025-06-01', removedAt: null },
]

export const MOCK_STATIC_IPS = [
  { id: 1, ip: '103.21.58.10', subnet: '255.255.255.0', gateway: '103.21.58.1', status: 'Available', assignedTo: null,     customer: null,          assignedDate: null,         addedAt: '2025-06-01', removedAt: null },
  { id: 2, ip: '103.21.58.11', subnet: '255.255.255.0', gateway: '103.21.58.1', status: 'Assigned',  assignedTo: 'LD-301', customer: 'Anita Sharma', assignedDate: '2026-02-10', addedAt: '2025-06-01', removedAt: null },
  { id: 3, ip: '103.21.58.12', subnet: '255.255.255.0', gateway: '103.21.58.1', status: 'Available', assignedTo: null,     customer: null,          assignedDate: null,         addedAt: '2025-06-01', removedAt: null },
]

// Maps a tenure name to days. Uses MOCK_TENURES as the source of truth;
// 12 months = 365 days, additional months beyond 12 are each 30 days.
function tenureToDays(tenureName) {
  const t = MOCK_TENURES.find(t => t.name === tenureName)
  if (!t) return 30
  if (t.months === 12) return 365
  if (t.months > 12) return 365 + (t.months - 12) * 30
  return t.months * 30
}

// Flat, selectable plan shape for consumers like the Lead Detail package
// assignment flow (PackageSelectModal / package cards) — the admin
// MOCK_BW_PACKAGES/MOCK_OTHER_PACKAGES shape stores multiple tenure/price
// "rows" per bandwidth package, which those consumers can't render directly
// (they expect a single flat speed/price/billingType per plan).
function bwPackageToPlan(p) {
  const row = p.rows.find(r => r.tenure === '1 Month') ?? p.rows[0]
  return {
    id: p.id,
    name: p.name,
    code: p.code ?? null,
    radiusId: p.radiusId ?? null,
    serviceType: 'Bandwidth',
    billingType: row?.tenure === '1 Month' ? 'Monthly' : 'Annual',
    tenure: row?.tenure ?? null,
    speed: row?.bandwidth ?? null,
    price: row?.price ?? 0,
    validity: null, // deprecated — use tenures[i].days instead
    server: null,
    packageType: p.zone === 'Enterprise' ? 'Private' : 'Standard',
    offer: p.offer,
    ottBundle: !!(row?.ott && row.ott !== 'None'),
    ottName: row?.ott && row.ott !== 'None' ? row.ott : null,
    boundPackages: p.boundPackages ?? [],
    landline: !!p.landline,
    staticIp: !!p.staticIp,
    zone: p.zone,
    status: p.status,
    // All tenure/price rows — billing foundation (BATCH F2-1 Step 1)
    tenures: p.rows.map(r => ({ label: r.tenure, days: tenureToDays(r.tenure), price: r.price })),
    gstRate: 18, // confirm with CA — 18% standard rate for internet/telecom services
    hsnSac: '998422', // SAC for internet access services — confirm SAC code with CA
  }
}

function otherPackageToPlan(p) {
  return {
    id: p.id,
    name: p.name,
    serviceType: 'Other',
    billingType: 'Monthly',
    speed: null,
    price: p.price,
    validity: null, // deprecated — use tenures[0].days instead
    server: null,
    packageType: 'Standard',
    offer: false,
    ottBundle: false,
    zone: p.zone,
    status: p.status,
    // Billing foundation fields (BATCH F2-1 Step 1)
    tenures: [{ label: '1 Month', days: 30, price: p.price }],
    gstRate: 18, // confirm with CA
    hsnSac: '998422', // SAC for internet access services — confirm with CA
  }
}

export const MOCK_PLANS = [
  ...MOCK_BW_PACKAGES.map(bwPackageToPlan),
  ...MOCK_OTHER_PACKAGES.map(otherPackageToPlan),
]
export const SERVICE_TYPES = ['Bandwidth', 'Other']
export const BILLING_TYPES = ['Monthly', 'Annual']
export const SERVICE_BADGE = { Bandwidth: 'blue', Other: 'gray' }

export const MOCK_ADDONS = [
  { id: 'ADDON-001', name: 'Static IP',    price: 99 },
  { id: 'ADDON-002', name: 'Extra Router', price: 149 },
  { id: 'ADDON-003', name: 'OTT Bundle',   price: 199 },
  { id: 'ADDON-004', name: 'Extended Warranty', price: 79 },
]

let _plans = [...MOCK_PLANS]
const _subs = new Set()
export function getPlans() { return _plans }
export function savePlan(plan) { _plans = [{ ...plan, id: plan.id || `PKG-${Date.now()}` }, ..._plans]; _subs.forEach(fn => fn()) }
export function updatePlanStatus(id, status) { _plans = _plans.map(p => p.id === id ? { ...p, status } : p); _subs.forEach(fn => fn()) }
export function subscribePlans(fn) { _subs.add(fn); return () => _subs.delete(fn) }

export const SERVICE_TYPES = ['FTTH', 'FTTB', 'Wireless', 'P2P', 'Leased Line', 'ILL']

let _plans = [
  { id: 1,  name: '50 Mbps Monthly',        serviceType: 'FTTH',        server: 'Jaze-01',    serverType: 'CNPL_B2C',  packageType: 'Public',  billingType: 'Monthly',       price: 699,   speed: '50 Mbps',  validity: 30,  ottBundle: false, offer: false, status: 'active',   sortOrder: 1,  noOfRecharge: 1,  subPlanName: '',              bwPackageId: 'PKG-001', createdAt: '2025-01-10', addedBy: 'Admin' },
  { id: 2,  name: '100 Mbps Monthly',       serviceType: 'FTTH',        server: 'Jaze-01',    serverType: 'CNPL_B2C',  packageType: 'Public',  billingType: 'Monthly',       price: 899,   speed: '100 Mbps', validity: 30,  ottBundle: true,  offer: false, status: 'active',   sortOrder: 2,  noOfRecharge: 1,  subPlanName: '',              bwPackageId: 'PKG-002', createdAt: '2025-01-10', addedBy: 'Admin' },
  { id: 3,  name: '200 Mbps Quarterly',     serviceType: 'FTTH',        server: 'Jaze-02',    serverType: 'CNPL_B2C',  packageType: 'Public',  billingType: 'Quarterly',     price: 2499,  speed: '200 Mbps', validity: 90,  ottBundle: true,  offer: false, status: 'active',   sortOrder: 3,  noOfRecharge: 1,  subPlanName: '',              bwPackageId: 'PKG-003', createdAt: '2025-01-15', addedBy: 'Admin' },
  { id: 4,  name: '500 Mbps Half Yearly',   serviceType: 'FTTH',        server: 'Jaze-01',    serverType: 'CNPL_B2C',  packageType: 'Private', billingType: 'Half Yearly',   price: 5999,  speed: '500 Mbps', validity: 180, ottBundle: false, offer: true,  status: 'active',   sortOrder: 4,  noOfRecharge: 1,  subPlanName: '',              bwPackageId: 'PKG-004', createdAt: '2025-02-01', addedBy: 'Admin' },
  { id: 5,  name: '30 Mbps Monthly',        serviceType: 'Wireless',    server: 'Jaze-03',    serverType: 'CNPL_WHI',  packageType: 'Public',  billingType: 'Monthly',       price: 499,   speed: '30 Mbps',  validity: 30,  ottBundle: false, offer: false, status: 'active',   sortOrder: 5,  noOfRecharge: 1,  subPlanName: '',              bwPackageId: 'PKG-005', createdAt: '2025-02-10', addedBy: 'Admin' },
  { id: 6,  name: '50 Mbps Yearly',         serviceType: 'Wireless',    server: 'Jaze-03',    serverType: 'CNPL_WHI',  packageType: 'Public',  billingType: 'Yearly',        price: 5500,  speed: '50 Mbps',  validity: 365, ottBundle: false, offer: true,  status: 'inactive', sortOrder: 6,  noOfRecharge: 1,  subPlanName: '',              bwPackageId: 'PKG-006', createdAt: '2025-03-01', addedBy: 'Admin' },
  { id: 7,  name: '100 Mbps P2P Monthly',   serviceType: 'P2P',         server: 'Jaze-02',    serverType: 'CNPL_B2B',  packageType: 'Private', billingType: 'Monthly',       price: 1999,  speed: '100 Mbps', validity: 30,  ottBundle: false, offer: false, status: 'active',   sortOrder: 7,  noOfRecharge: 1,  subPlanName: '',              bwPackageId: 'PKG-007', createdAt: '2025-03-15', addedBy: 'Admin' },
  { id: 8,  name: 'FTTB 20 Mbps Monthly',   serviceType: 'FTTB',        server: 'Jaze-01',    serverType: 'CNPL_B2C',  packageType: 'Public',  billingType: 'Monthly',       price: 599,   speed: '20 Mbps',  validity: 30,  ottBundle: false, offer: false, status: 'active',   sortOrder: 8,  noOfRecharge: 1,  subPlanName: '',              bwPackageId: 'PKG-008', createdAt: '2025-03-20', addedBy: 'Admin' },
  { id: 9,  name: '1 Gbps Yearly',          serviceType: 'FTTH',        server: 'Jaze-01',    serverType: 'CNPL_B2C',  packageType: 'Private', billingType: 'Yearly',        price: 11999, speed: '1 Gbps',   validity: 365, ottBundle: true,  offer: true,  status: 'active',   sortOrder: 9,  noOfRecharge: 1,  subPlanName: '',              bwPackageId: 'PKG-009', createdAt: '2025-04-01', addedBy: 'Admin' },
  { id: 10, name: 'Leased 10 Mbps Monthly', serviceType: 'Leased Line', server: 'IPACCAT-01', serverType: 'CNPL_B2B',  packageType: 'Private', billingType: 'Monthly',       price: 4999,  speed: '10 Mbps',  validity: 30,  ottBundle: false, offer: false, status: 'active',   sortOrder: 10, noOfRecharge: 1,  subPlanName: '',              bwPackageId: 'PKG-010', createdAt: '2025-04-10', addedBy: 'Admin' },
  { id: 11, name: 'ILL 100 Mbps Monthly',   serviceType: 'ILL',         server: 'IPACCAT-01', serverType: 'CNPL_B2B',  packageType: 'Private', billingType: 'Monthly',       price: 15000, speed: '100 Mbps', validity: 30,  ottBundle: false, offer: false, status: 'active',   sortOrder: 11, noOfRecharge: 1,  subPlanName: '',              bwPackageId: 'PKG-011', createdAt: '2025-04-15', addedBy: 'Admin' },
  { id: 12, name: '75 Mbps 12+2 Offer',     serviceType: 'FTTH',        server: 'Jaze-02',    serverType: 'CNPL_B2C',  packageType: 'Public',  billingType: '12+2',          price: 8500,  speed: '75 Mbps',  validity: 420, ottBundle: true,  offer: true,  status: 'active',   sortOrder: 12, noOfRecharge: 3,  subPlanName: '12+2 Special',  bwPackageId: 'PKG-012', createdAt: '2025-05-01', addedBy: 'Admin' },
  { id: 13, name: '50 Mbps Diwali Dhamaka', serviceType: 'FTTH',        server: 'Jaze-01',    serverType: 'CNPL_B2C',  packageType: 'Public',  billingType: 'Diwali Dhamaka',price: 599,   speed: '50 Mbps',  validity: 30,  ottBundle: true,  offer: true,  status: 'inactive', sortOrder: 13, noOfRecharge: 1,  subPlanName: 'Festive Offer', bwPackageId: 'PKG-013', createdAt: '2025-09-20', addedBy: 'Admin' },
  { id: 14, name: '100 Mbps 3+1 Offer',     serviceType: 'FTTH',        server: 'Jaze-02',    serverType: 'CNPL_B2C',  packageType: 'Public',  billingType: '3+1',           price: 2699,  speed: '100 Mbps', validity: 120, ottBundle: false, offer: true,  status: 'active',   sortOrder: 14, noOfRecharge: 2,  subPlanName: '3+1 Bundle',    bwPackageId: 'PKG-014', createdAt: '2025-10-01', addedBy: 'Admin' },
  { id: 15, name: 'Wireless 20 Mbps 6+1',   serviceType: 'Wireless',    server: 'Jaze-03',    serverType: 'CNPL_WHI',  packageType: 'Public',  billingType: '6+1',           price: 3200,  speed: '20 Mbps',  validity: 210, ottBundle: false, offer: true,  status: 'active',   sortOrder: 15, noOfRecharge: 2,  subPlanName: '6+1 Bundle',    bwPackageId: 'PKG-015', createdAt: '2025-10-15', addedBy: 'Admin' },
]

const _subs = new Set()
function notify() { _subs.forEach(fn => fn(_plans)) }

export function getPlans()            { return _plans }
export function savePlan(plan)        { _plans = [plan, ..._plans]; notify() }
export function updatePlanStatus(id, status) {
  _plans = _plans.map(p => p.id === id ? { ...p, status } : p)
  notify()
}
export function subscribePlans(fn)    { _subs.add(fn); return () => _subs.delete(fn) }

export const BILLING_TYPES = [
  'One Time', 'Monthly', 'Quarterly', 'Half Yearly', 'Yearly',
  '1+1', '3+1', '6+1', '12+1', '12+2', 'Diwali Dhamaka',
]

export const SERVICE_BADGE = {
  FTTH: 'blue',
  FTTB: 'cyan',
  Wireless: 'purple',
  P2P: 'orange',
  'Leased Line': 'navy',
  ILL: 'gray',
}

export const MOCK_PLANS = [
  { id: 1,  name: '50 Mbps Monthly',       serviceType: 'FTTH',        server: 'Jaze-01',     packageType: 'Public',  billingType: 'Monthly',       price: 699,   speed: '50 Mbps',  validity: 30,  ottBundle: false, offer: false, status: 'active'   },
  { id: 2,  name: '100 Mbps Monthly',      serviceType: 'FTTH',        server: 'Jaze-01',     packageType: 'Public',  billingType: 'Monthly',       price: 899,   speed: '100 Mbps', validity: 30,  ottBundle: true,  offer: false, status: 'active'   },
  { id: 3,  name: '200 Mbps Quarterly',    serviceType: 'FTTH',        server: 'Jaze-02',     packageType: 'Public',  billingType: 'Quarterly',     price: 2499,  speed: '200 Mbps', validity: 90,  ottBundle: true,  offer: false, status: 'active'   },
  { id: 4,  name: '500 Mbps Half Yearly',  serviceType: 'FTTH',        server: 'Jaze-01',     packageType: 'Private', billingType: 'Half Yearly',   price: 5999,  speed: '500 Mbps', validity: 180, ottBundle: false, offer: true,  status: 'active'   },
  { id: 5,  name: '30 Mbps Monthly',       serviceType: 'Wireless',    server: 'Jaze-03',     packageType: 'Public',  billingType: 'Monthly',       price: 499,   speed: '30 Mbps',  validity: 30,  ottBundle: false, offer: false, status: 'active'   },
  { id: 6,  name: '50 Mbps Yearly',        serviceType: 'Wireless',    server: 'Jaze-03',     packageType: 'Public',  billingType: 'Yearly',        price: 5500,  speed: '50 Mbps',  validity: 365, ottBundle: false, offer: true,  status: 'inactive' },
  { id: 7,  name: '100 Mbps P2P Monthly',  serviceType: 'P2P',         server: 'Jaze-02',     packageType: 'Private', billingType: 'Monthly',       price: 1999,  speed: '100 Mbps', validity: 30,  ottBundle: false, offer: false, status: 'active'   },
  { id: 8,  name: 'FTTB 20 Mbps Monthly',  serviceType: 'FTTB',        server: 'Jaze-01',     packageType: 'Public',  billingType: 'Monthly',       price: 599,   speed: '20 Mbps',  validity: 30,  ottBundle: false, offer: false, status: 'active'   },
  { id: 9,  name: '1 Gbps Yearly',         serviceType: 'FTTH',        server: 'Jaze-01',     packageType: 'Private', billingType: 'Yearly',        price: 11999, speed: '1 Gbps',   validity: 365, ottBundle: true,  offer: true,  status: 'active'   },
  { id: 10, name: 'Leased 10 Mbps Monthly',serviceType: 'Leased Line', server: 'IPACCAT-01',  packageType: 'Private', billingType: 'Monthly',       price: 4999,  speed: '10 Mbps',  validity: 30,  ottBundle: false, offer: false, status: 'active'   },
  { id: 11, name: 'ILL 100 Mbps Monthly',  serviceType: 'ILL',         server: 'IPACCAT-01',  packageType: 'Private', billingType: 'Monthly',       price: 15000, speed: '100 Mbps', validity: 30,  ottBundle: false, offer: false, status: 'active'   },
  { id: 12, name: '75 Mbps 12+2 Offer',    serviceType: 'FTTH',        server: 'Jaze-02',     packageType: 'Public',  billingType: '12+2',          price: 8500,  speed: '75 Mbps',  validity: 420, ottBundle: true,  offer: true,  status: 'active'   },
  { id: 13, name: '50 Mbps Diwali Dhamaka',serviceType: 'FTTH',        server: 'Jaze-01',     packageType: 'Public',  billingType: 'Diwali Dhamaka',price: 599,   speed: '50 Mbps',  validity: 30,  ottBundle: true,  offer: true,  status: 'inactive' },
  { id: 14, name: '100 Mbps 3+1 Offer',    serviceType: 'FTTH',        server: 'Jaze-02',     packageType: 'Public',  billingType: '3+1',           price: 2699,  speed: '100 Mbps', validity: 120, ottBundle: false, offer: true,  status: 'active'   },
  { id: 15, name: 'Wireless 20 Mbps 6+1',  serviceType: 'Wireless',    server: 'Jaze-03',     packageType: 'Public',  billingType: '6+1',           price: 3200,  speed: '20 Mbps',  validity: 210, ottBundle: false, offer: true,  status: 'active'   },
]

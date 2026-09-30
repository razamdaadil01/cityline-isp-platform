export const VAS_TYPES = ['OTT', 'IPTV', 'Landline', 'Static IP']
export const OTT_PLATFORMS = ['Netflix', 'Amazon Prime', 'Hotstar', 'SonyLIV', 'Zee5', 'Other']
export const SUBSCRIPTION_PLANS = ['Monthly', 'Quarterly', 'Yearly']
export const NUMBER_TYPES = ['Local', 'STD', 'ISD']

let _products = [
  {
    id: 'VAS-001',
    type: 'OTT',
    price: 299,
    status: true,
    createdAt: '2024-01-15T10:00:00.000Z',
    ottPlatform: 'Netflix',
    subscriptionPlan: 'Monthly',
    validity: 30,
  },
  {
    id: 'VAS-002',
    type: 'Landline',
    price: 199,
    status: true,
    createdAt: '2024-02-01T10:00:00.000Z',
    numberType: 'Local',
    freeMinutes: 500,
    validity: 30,
  },
  {
    id: 'VAS-003',
    type: 'Static IP',
    price: 499,
    status: true,
    createdAt: '2024-03-10T10:00:00.000Z',
    ipAddress: '203.0.113.10',
    subnetMask: '255.255.255.0',
    gateway: '203.0.113.1',
  },
]

const _listeners = []

function notify() { _listeners.forEach(fn => fn(getVasProducts())) }

export function getVasProducts() { return [..._products] }

export function subscribeVasProducts(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}

function nextVasId() {
  const nums = _products.map(p => {
    const m = p.id.match(/^VAS-(\d+)$/)
    return m ? parseInt(m[1], 10) : 0
  })
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `VAS-${String(max + 1).padStart(3, '0')}`
}

export function saveVasProduct(product) {
  const exists = product.id && _products.some(p => p.id === product.id)
  if (exists) {
    _products = _products.map(p => p.id === product.id ? { ...p, ...product } : p)
  } else {
    _products = [..._products, { ...product, id: nextVasId(), createdAt: new Date().toISOString() }]
  }
  notify()
}

export function setVasProductStatus(id, status) {
  _products = _products.map(p => p.id === id ? { ...p, status } : p)
  notify()
}

export function deleteVasProduct(id) {
  _products = _products.filter(p => p.id !== id)
  notify()
}

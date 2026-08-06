// Company/Entity records are legal billing entities used when a customer's
// Connection Type = Own. Shaped for the Connection Type component on the
// Customer Creation forms (built next), which will filter these by
// status === 'Active' only (BR-7/BR-8).

// Illustrative only — the actual list depends on which payment gateway
// integrations get built.
export const PG_CONNECTIONS = ['Razorpay', 'PayU', 'CCAvenue', 'Cashfree']

// Standard GSTIN pattern: 2-digit state code + 10-char PAN (5 letters, 4
// digits, 1 letter) + 1 entity code + fixed 'Z' + 1 checksum char.
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

export function isValidGstin(gstin) {
  return GSTIN_REGEX.test((gstin || '').trim().toUpperCase())
}

let _companyEntities = [
  {
    id: 1,
    name: 'Cityline Networks Pvt Ltd',
    gstin: '27AABCU9603R1ZM',
    email: 'accounts@citylinenetworks.in',
    address: '404, Skyline Tower, Andheri West, Mumbai - 400053, Maharashtra',
    bank: { bankName: 'HDFC Bank', accountNo: '50100123456789', ifsc: 'HDFC0001234', branch: 'Andheri West' },
    pgId: 'rzp_live_CitylineNet01',
    pgConnection: 'Razorpay',
    status: 'Active',
  },
  {
    id: 2,
    name: 'Cityline Fiber Solutions LLP',
    gstin: '27AAFCC5678E1ZS',
    email: 'billing@citylinefiber.in',
    address: '12, Business Bay, Bandra Kurla Complex, Mumbai - 400051, Maharashtra',
    bank: { bankName: 'ICICI Bank', accountNo: '602301987654', ifsc: 'ICIC0006023', branch: 'BKC' },
    pgId: 'rzp_live_CitylineFiber02',
    pgConnection: 'Razorpay',
    status: 'Active',
  },
]
let _nextId = 3

const _listeners = []

function notify() { _listeners.forEach(fn => fn(getCompanyEntities())) }

export function getCompanyEntities() { return [..._companyEntities] }

export function getActiveCompanyEntities() { return _companyEntities.filter(e => e.status === 'Active') }

export function getCompanyEntity(id) { return _companyEntities.find(e => e.id === id) ?? null }

export function subscribeCompanyEntities(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}

export function saveCompanyEntity(entity) {
  const exists = entity.id != null && _companyEntities.some(e => e.id === entity.id)
  if (exists) {
    _companyEntities = _companyEntities.map(e => e.id === entity.id ? { ...e, ...entity } : e)
    notify()
    return entity
  }
  const newEntity = { ...entity, id: _nextId++ }
  _companyEntities = [..._companyEntities, newEntity]
  notify()
  return newEntity
}

export function setCompanyEntityStatus(id, status) {
  _companyEntities = _companyEntities.map(e => e.id === id ? { ...e, status } : e)
  notify()
}

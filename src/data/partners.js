// Partner records are reseller/channel entities used when a customer's
// Connection Type = Partner. Shaped for the Connection Type component on the
// Customer Creation forms (built next), which will filter these by
// status === 'Active' only (BR-7/BR-8).

export const SHARE_TYPES = ['Percentage', 'Fixed']

export function isValidContactNumber(number) {
  return /^\d{10}$/.test((number || '').trim())
}

export function formatShareValue(partner) {
  return partner.shareType === 'Percentage'
    ? `${partner.shareValue}%`
    : `₹${Number(partner.shareValue).toLocaleString('en-IN')}`
}

let _partners = [
  {
    id: 1,
    name: 'Metro Broadband Partners',
    shareType: 'Percentage',
    shareValue: 15,
    contactNumber: '9876543210',
    email: 'partner@metrobroadband.in',
    address: '',
    bank: { bankName: '', accountNo: '', ifsc: '' },
    status: 'Active',
  },
  {
    id: 2,
    name: 'Andheri Channel Reseller',
    shareType: 'Fixed',
    shareValue: 500,
    contactNumber: '9123456780',
    email: 'reseller@andherichannel.in',
    address: 'Shop 4, Link Road, Andheri West, Mumbai',
    bank: { bankName: 'Axis Bank', accountNo: '910020012345', ifsc: 'UTIB0000123' },
    status: 'Active',
  },
]
let _nextId = 3

const _listeners = []

function notify() { _listeners.forEach(fn => fn(getPartners())) }

export function getPartners() { return [..._partners] }

export function getActivePartners() { return _partners.filter(p => p.status === 'Active') }

export function getPartner(id) { return _partners.find(p => p.id === id) ?? null }

export function subscribePartners(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}

export function savePartner(partner) {
  const exists = partner.id != null && _partners.some(p => p.id === partner.id)
  if (exists) {
    _partners = _partners.map(p => p.id === partner.id ? { ...p, ...partner } : p)
    notify()
    return partner
  }
  const newPartner = { ...partner, id: _nextId++ }
  _partners = [..._partners, newPartner]
  notify()
  return newPartner
}

export function setPartnerStatus(id, status) {
  _partners = _partners.map(p => p.id === id ? { ...p, status } : p)
  notify()
}

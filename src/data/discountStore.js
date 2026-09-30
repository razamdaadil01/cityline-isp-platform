let _discounts = [
  {
    id: 'DISC-001',
    name: 'Diwali Offer',
    discountType: 'percentage',
    value: 10,
    applicablePackages: ['all'],
    validFrom: '2026-10-01',
    validTo: '2026-11-01',
    maxUses: 100,
    usedCount: 0,
    status: true,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'DISC-002',
    name: 'Enterprise Special',
    discountType: 'flat',
    value: 500,
    applicablePackages: ['BWP-003'],
    validFrom: '2026-09-01',
    validTo: '',
    maxUses: 0,
    usedCount: 0,
    status: true,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'DISC-003',
    name: 'Expired Promo',
    discountType: 'percentage',
    value: 5,
    applicablePackages: ['all'],
    validFrom: '2026-07-01',
    validTo: '2026-08-31',
    maxUses: 50,
    usedCount: 0,
    status: false,
    createdAt: '2026-07-01T00:00:00.000Z',
  },
]

const _listeners = []

function notify() { _listeners.forEach(fn => fn(getDiscounts())) }

export function getDiscounts() { return [..._discounts] }

export function subscribeDiscounts(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}

function nextDiscountId() {
  const nums = _discounts.map(d => {
    const m = d.id.match(/^DISC-(\d+)$/)
    return m ? parseInt(m[1], 10) : 0
  })
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `DISC-${String(max + 1).padStart(3, '0')}`
}

export function saveDiscount(discount) {
  const exists = discount.id && _discounts.some(d => d.id === discount.id)
  if (exists) {
    _discounts = _discounts.map(d => d.id === discount.id ? { ...d, ...discount } : d)
  } else {
    _discounts = [..._discounts, { ...discount, id: nextDiscountId(), createdAt: new Date().toISOString() }]
  }
  notify()
}

export function setDiscountStatus(id, status) {
  _discounts = _discounts.map(d => d.id === id ? { ...d, status } : d)
  notify()
}

export function deleteDiscount(id) {
  _discounts = _discounts.filter(d => d.id !== id)
  notify()
}

export function getApplicableDiscount(packageId) {
  const todayStr = new Date().toISOString().split('T')[0]
  return _discounts.find(d => {
    if (!d.status) return false
    if (todayStr < d.validFrom) return false
    if (d.validTo && todayStr > d.validTo) return false
    if (d.maxUses > 0 && d.usedCount >= d.maxUses) return false
    if (!d.applicablePackages.includes('all') && !d.applicablePackages.includes(packageId)) return false
    return true
  }) ?? null
}

export function redeemDiscount(id) {
  _discounts = _discounts.map(d => d.id === id ? { ...d, usedCount: d.usedCount + 1 } : d)
  notify()
}

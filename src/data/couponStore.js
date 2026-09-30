let _coupons = [
  {
    id: 'CPN-001',
    code: 'SONIC10',
    discountType: 'percentage',
    value: 10,
    applicablePackages: ['all'],
    validFrom: '2026-09-01',
    validTo: '2026-12-31',
    usageLimit: 200,
    perCustomerLimit: 1,
    usedCount: 0,
    usedBy: [],
    status: true,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'CPN-002',
    code: 'FLAT200',
    discountType: 'flat',
    value: 200,
    applicablePackages: ['BWP-001', 'BWP-002'],
    validFrom: '2026-10-01',
    validTo: '2026-10-31',
    usageLimit: 50,
    perCustomerLimit: 1,
    usedCount: 0,
    usedBy: [],
    status: true,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'CPN-003',
    code: 'TEST10',
    discountType: 'percentage',
    value: 10,
    applicablePackages: ['all'],
    validFrom: '2026-01-01',
    validTo: '',
    usageLimit: 0,
    perCustomerLimit: 0,
    usedCount: 0,
    usedBy: [],
    status: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

const _listeners = []

function notify() { _listeners.forEach(fn => fn(getCoupons())) }

export function getCoupons() { return [..._coupons] }

export function subscribeCoupons(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}

function nextCouponId() {
  const nums = _coupons.map(c => {
    const m = c.id.match(/^CPN-(\d+)$/)
    return m ? parseInt(m[1], 10) : 0
  })
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `CPN-${String(max + 1).padStart(3, '0')}`
}

export function saveCoupon(coupon) {
  const exists = coupon.id && _coupons.some(c => c.id === coupon.id)
  if (exists) {
    _coupons = _coupons.map(c => c.id === coupon.id ? { ...c, ...coupon } : c)
  } else {
    _coupons = [..._coupons, { ...coupon, id: nextCouponId(), usedCount: 0, usedBy: [], createdAt: new Date().toISOString() }]
  }
  notify()
}

export function setCouponStatus(id, status) {
  _coupons = _coupons.map(c => c.id === id ? { ...c, status } : c)
  notify()
}

export function deleteCoupon(id) {
  _coupons = _coupons.filter(c => c.id !== id)
  notify()
}

export function applyCoupon(code, packageId, customerId) {
  const coupon = _coupons.find(c => c.code.toUpperCase() === code.toUpperCase())
  if (!coupon) return { valid: false, error: 'Invalid coupon code' }
  if (!coupon.status) return { valid: false, error: 'This coupon is no longer active' }

  const today = new Date().toISOString().split('T')[0]
  if (coupon.validTo && today > coupon.validTo) return { valid: false, error: 'This coupon has expired' }
  if (coupon.validFrom > today) return { valid: false, error: 'This coupon is not yet active' }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return { valid: false, error: 'This coupon has reached its usage limit' }
  if (coupon.perCustomerLimit === 1 && coupon.usedBy.includes(customerId)) return { valid: false, error: 'You have already used this coupon' }
  if (!coupon.applicablePackages.includes('all') && !coupon.applicablePackages.includes(packageId)) {
    return { valid: false, error: 'This coupon is not valid for the selected package' }
  }

  return {
    valid: true,
    discountType: coupon.discountType,
    value: coupon.value,
  }
}

export function redeemCoupon(code, customerId) {
  _coupons = _coupons.map(c => {
    if (c.code.toUpperCase() !== code.toUpperCase()) return c
    return { ...c, usedCount: c.usedCount + 1, usedBy: [...c.usedBy, customerId] }
  })
  notify()
}

// Final Settlement store for the Customer Disconnection flow (Phase 4) —
// core RES-/ENT- customers only. Mirrors the simple module-level pub/sub
// pattern already used throughout this app (customerRecoveryStore.js,
// auditLogStore.js, etc.). Mock/display-only, same as the rest of this
// app's billing: no real payment collection happens here, this only
// computes and records the settlement figure (see CustomerDetail.jsx's
// "Generate Final Settlement" action).

let _settlements = []
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._settlements])) }

export function getSettlements() { return [..._settlements] }

export function getSettlement(id) { return _settlements.find(s => s.id === id) ?? null }

export function getSettlementByCustomerId(customerId) {
  return _settlements.find(s => s.customerId === customerId) ?? null
}

export function hasSettlementForCustomer(customerId) {
  return !!getSettlementByCustomerId(customerId)
}

export function addSettlement(settlement) {
  _settlements = [settlement, ..._settlements]
  notify()
  return settlement
}

export function subscribeSettlements(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i > -1) _listeners.splice(i, 1)
  }
}

export function nextSettlementId() {
  const year = new Date().getFullYear()
  const nums = _settlements
    .map(s => s.id.match(/^SETL-(\d{4})-(\d+)$/))
    .filter(Boolean)
    .map(m => Number(m[2]))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `SETL-${year}-${String(next).padStart(6, '0')}`
}

// Real payment records — Add Payment's Submit action writes here; Finance
// tab's Payments sub-tab merges these (real, customer-specific) on top of
// its own pre-existing MOCK_PAYMENTS seed rows. Mirrors the module-level
// pub/sub pattern already used throughout this app (settlementStore.js,
// customerRecoveryStore.js, etc.) — no real payment gateway involved, this
// only records that a payment was entered.

let _payments = []
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._payments])) }

export function getPayments() { return [..._payments] }

export function getPaymentsForCustomer(customerId) {
  return _payments.filter(p => p.customerId === customerId)
}

export function addPayment(payment) {
  _payments = [payment, ..._payments]
  notify()
  return payment
}

export function subscribePayments(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i > -1) _listeners.splice(i, 1)
  }
}

// Starts past MOCK_PAYMENTS' own highest seed receipt no. (117644) so a
// newly generated receipt never collides with an existing displayed row.
export function nextReceiptNo() {
  const nums = _payments.map(p => Number(p.receiptNo)).filter(Number.isFinite)
  const next = (nums.length ? Math.max(...nums) : 117644) + 1
  return String(next)
}

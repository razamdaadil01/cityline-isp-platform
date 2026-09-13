// Hardware Recovery store for core ISP customers (RES-/ENT- — see
// customersData.js's CUSTOMER_STATUSES). Phase 3 of the Customer
// Disconnection flow: mirrors intercomRecoveryStore.js's shape (same
// HRWO-YYYY-NNNNNN numbering, same status vocabulary) so the two modules
// stay operationally consistent, but is a wholly separate, independent
// store — no state or records are shared with the Intercom module, and
// nothing here imports from or is imported by intercomRecoveryStore.js.
//
// Unlike the Intercom version, this store starts empty: there's no existing
// demo data for core-customer hardware recovery to seed from (Phase 3 is a
// brand-new flow), so work orders only appear once CustomerDetail.jsx's
// "Schedule Hardware Recovery" action (Terminate flow, 'Pending
// Disconnection' status) creates one.

// Core customers don't have an Intercom-style "Converted to Internet" path
// — this list only reflects the one path Phase 1/2 actually create a
// disconnection through (CustomerDetail.jsx's Terminate action).
export const RECOVERY_REASONS = ['Service Terminated']

export const RECOVERY_STATUS_CFG = {
  pending:          { variant: 'orange', label: 'Pending'          },
  inprogress:       { variant: 'blue',   label: 'In Progress'      },
  completed:        { variant: 'green',  label: 'Completed'        },
  missing_hardware: { variant: 'red',    label: 'Missing Hardware' },
  damaged_hardware: { variant: 'red',    label: 'Damaged Hardware' },
  partial_recovery: { variant: 'yellow', label: 'Partial Recovery' },
}

// Statuses that mean a recovery work order is resolved one way or another —
// used by customersData.js's updateCustomer() (Phase 5 gate) to decide
// whether a customer may move from 'Pending Disconnection' to
// 'Disconnected'. Phase 4 (billing/settlement) will add its own gate on
// top of this one, not replace it.
export const RECOVERY_TERMINAL_STATUSES = ['completed', 'missing_hardware', 'damaged_hardware', 'partial_recovery']

let _recoveries = []
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._recoveries])) }

export function getRecoveries() { return [..._recoveries] }

export function getRecovery(id) { return _recoveries.find(o => o.id === id) ?? null }

export function getRecoveryByCustomerId(customerId) {
  return _recoveries.find(o => o.customerId === customerId) ?? null
}

export function addRecovery(order) {
  _recoveries = [order, ..._recoveries]
  notify()
  return order
}

export function updateRecovery(id, patch) {
  _recoveries = _recoveries.map(o => o.id === id ? { ...o, ...patch } : o)
  notify()
  return getRecovery(id)
}

export function subscribeRecoveries(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i > -1) _listeners.splice(i, 1)
  }
}

export function nextRecoveryId() {
  const year = new Date().getFullYear()
  const nums = _recoveries
    .map(o => o.id.match(/^HRWO-(\d{4})-(\d+)$/))
    .filter(Boolean)
    .map(m => Number(m[2]))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `HRWO-${year}-${String(next).padStart(6, '0')}`
}

// Phase 5 gate — see RECOVERY_TERMINAL_STATUSES above.
export function isRecoveryResolvedForCustomer(customerId) {
  const r = getRecoveryByCustomerId(customerId)
  return !!r && RECOVERY_TERMINAL_STATUSES.includes(r.status)
}

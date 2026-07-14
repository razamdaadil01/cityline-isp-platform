export const RECOVERY_REASONS = ['Service Terminated', 'Converted to Internet']

export const RECOVERY_STATUS_CFG = {
  pending:          { variant: 'orange', label: 'Pending'          },
  inprogress:       { variant: 'blue',   label: 'In Progress'      },
  completed:        { variant: 'green',  label: 'Completed'        },
  missing_hardware: { variant: 'red',    label: 'Missing Hardware' },
  damaged_hardware: { variant: 'red',    label: 'Damaged Hardware' },
  partial_recovery: { variant: 'yellow', label: 'Partial Recovery' },
}

const INIT_RECOVERIES = [
  { id: 'HRWO-2026-000001', customerId: 'IC-CUST-2026-000003', customer: 'Suresh Patil', phone: '99887 76655', reason: 'Service Terminated',     hardwareToRecover: 'Intercom Panel Unit (ICP-2026-0003)', technician: 'Preethi Nair', scheduledDate: '05-07-2026', timeSlot: 'Morning 9-12',  createdDate: '01-07-2026', notes: 'Customer suspended, hardware pickup requested.', accessInstructions: '', status: 'completed' },
  { id: 'HRWO-2026-000002', customerId: 'IC-CUST-2026-000004', customer: 'Anita Desai',  phone: '91234 56789', reason: 'Converted to Internet',   hardwareToRecover: 'Intercom Panel Unit (ICP-2026-0004), Handset Unit (ICH-2026-0004)', technician: 'Anita Sharma', scheduledDate: '10-07-2026', timeSlot: 'Afternoon 12-3', createdDate: '07-07-2026', notes: 'Converted to internet-only service.', accessInstructions: 'Ring bell twice, ask for security desk.', status: 'pending' },
]

let _recoveries = [...INIT_RECOVERIES]
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

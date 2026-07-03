export const INTERCOM_STAGES = ['New Inquiry', 'Feasibility', 'Booked', 'Converted', 'Lost']

export const INTERCOM_PLANS = ['Intercom Basic', 'Intercom Plus']

export const INTERCOM_STAFF = [
  { name: 'Arjun Kumar',  initials: 'AK', color: 'bg-brand-blue'   },
  { name: 'Suresh Babu',  initials: 'SB', color: 'bg-emerald-500'  },
  { name: 'Preethi Nair', initials: 'PN', color: 'bg-purple-500'   },
  { name: 'Anita Sharma', initials: 'AS', color: 'bg-brand-orange' },
]

const STAFF_MAP = Object.fromEntries(INTERCOM_STAFF.map(s => [s.name, s]))

function withAssigned(lead) {
  const staff = STAFF_MAP[lead.assigned]
  return { ...lead, assignedInitials: staff?.initials ?? '??', assignedColor: staff?.color ?? 'bg-gray-400' }
}

const INIT_LEADS = [
  { id: 'IL-2026-0001', leadName: 'Ramesh Nair — Intercom Basic',    customer: 'Ramesh Nair',     mobile: '9876001890', plan: 'Intercom Basic', stage: 'New Inquiry', assigned: 'Arjun Kumar',  followUp: '',             createdAt: '2026-06-25', notes: '' },
  { id: 'IL-2026-0002', leadName: 'Priya Sharma — Intercom Plus',    customer: 'Priya Sharma',    mobile: '9845123456', plan: 'Intercom Plus',  stage: 'Feasibility',  assigned: 'Suresh Babu',  followUp: '28-06-2026',  createdAt: '2026-06-24', notes: '' },
  { id: 'IL-2026-0003', leadName: 'Mohan Das — Intercom Basic',      customer: 'Mohan Das',       mobile: '9345678901', plan: 'Intercom Basic', stage: 'Booked',       assigned: 'Preethi Nair', followUp: '',             createdAt: '2026-06-20', notes: '' },
  { id: 'IL-2026-0004', leadName: 'Sunita Bose — Intercom Plus',     customer: 'Sunita Bose',     mobile: '9765443322', plan: 'Intercom Plus',  stage: 'Converted',    assigned: 'Anita Sharma', followUp: '',             createdAt: '2026-06-15', notes: '' },
  { id: 'IL-2026-0005', leadName: 'Harish Kulkarni — Intercom Basic',customer: 'Harish Kulkarni', mobile: '9988001133', plan: 'Intercom Basic', stage: 'Lost',         assigned: 'Arjun Kumar',  followUp: '',             createdAt: '2026-06-10', notes: '' },
].map(withAssigned)

let _leads = [...INIT_LEADS]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._leads])) }

export function getLeads() { return [..._leads] }

export function getLead(id) { return _leads.find(l => l.id === id) ?? null }

export function saveLead(lead) {
  const withMeta = withAssigned(lead)
  const exists = _leads.find(l => l.id === withMeta.id)
  _leads = exists ? _leads.map(l => l.id === withMeta.id ? withMeta : l) : [withMeta, ..._leads]
  notify()
  return withMeta
}

export function deleteLead(id) {
  _leads = _leads.filter(l => l.id !== id)
  notify()
}

export function subscribeLeads(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i > -1) _listeners.splice(i, 1)
  }
}

export function nextLeadId() {
  const year = new Date().getFullYear()
  const nums = _leads
    .map(l => l.id.match(/^IL-(\d{4})-(\d+)$/))
    .filter(Boolean)
    .map(m => Number(m[2]))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `IL-${year}-${String(next).padStart(4, '0')}`
}

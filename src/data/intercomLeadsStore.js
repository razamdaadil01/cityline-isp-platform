export const INTERCOM_STAGES = ['New Inquiry', 'Booked', 'Converted', 'Lost']

export const INTERCOM_PLANS = ['Intercom Basic', 'Intercom Plus']

export const INTERCOM_ENGINEERS = ['Ravi Technician', 'Kumar Installer', 'Sunil Networks', 'Dinesh Fiber']

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
  {
    id: 'IL-2026-0001', leadName: 'Ramesh Nair', customer: 'Ramesh Nair', mobile: '9876001890',
    plan: 'Intercom Basic', stage: 'New Inquiry', assigned: 'Arjun Kumar', followUp: '', createdAt: '2026-06-25', notes: '',
    stageHistory: [
      { stage: 'New Inquiry', date: '2026-06-25', time: '09:15', note: 'Lead created', actor: 'Arjun Kumar' },
    ],
  },
  {
    id: 'IL-2026-0002', leadName: 'Priya Sharma', customer: 'Priya Sharma', mobile: '9845123456',
    plan: 'Intercom Plus', stage: 'New Inquiry', assigned: 'Suresh Babu', followUp: '28-06-2026', createdAt: '2026-06-24', notes: '',
    engineer: 'Ravi Technician', visitDate: '2026-06-28', visitTime: '11:00',
    stageHistory: [
      { stage: 'New Inquiry', date: '2026-06-24', time: '10:00', note: 'Lead created', actor: 'Suresh Babu' },
      { stage: 'Feasibility', date: '2026-06-25', time: '11:30', note: 'Feasibility requested — engineer Ravi Technician, visit 2026-06-28 11:00', actor: 'Suresh Babu' },
    ],
  },
  {
    id: 'IL-2026-0003', leadName: 'Mohan Das', customer: 'Mohan Das', mobile: '9345678901',
    plan: 'Intercom Basic', stage: 'Booked', assigned: 'Preethi Nair', followUp: '', createdAt: '2026-06-20', notes: '',
    engineer: 'Kumar Installer', visitDate: '2026-06-22', visitTime: '14:00', feasible: true,
    package: 'Intercom Basic', installDate: '2026-07-05', installTime: '10:30', advancePayment: '500',
    stageHistory: [
      { stage: 'New Inquiry', date: '2026-06-20', time: '09:00', note: 'Lead created', actor: 'Preethi Nair' },
      { stage: 'Feasibility', date: '2026-06-21', time: '10:15', note: 'Feasibility requested — engineer Kumar Installer, visit 2026-06-22 14:00', actor: 'Preethi Nair' },
      { stage: 'Feasibility', date: '2026-06-22', time: '15:30', note: 'Marked Feasible', actor: 'Preethi Nair' },
      { stage: 'Booked', date: '2026-06-23', time: '09:45', note: 'Booking confirmed — Intercom Basic, install 2026-07-05 10:30', actor: 'Preethi Nair' },
    ],
  },
  {
    id: 'IL-2026-0004', leadName: 'Sunita Bose', customer: 'Sunita Bose', mobile: '9765443322',
    plan: 'Intercom Plus', stage: 'Converted', assigned: 'Anita Sharma', followUp: '', createdAt: '2026-06-15', notes: '',
    engineer: 'Sunil Networks', visitDate: '2026-06-16', visitTime: '11:00', feasible: true,
    package: 'Intercom Plus', installDate: '2026-06-20', installTime: '10:00', advancePayment: '750',
    customerId: 'INC-2026-0004',
    stageHistory: [
      { stage: 'New Inquiry', date: '2026-06-15', time: '09:30', note: 'Lead created', actor: 'Anita Sharma' },
      { stage: 'Feasibility', date: '2026-06-15', time: '16:00', note: 'Feasibility requested — engineer Sunil Networks, visit 2026-06-16 11:00', actor: 'Anita Sharma' },
      { stage: 'Feasibility', date: '2026-06-16', time: '12:30', note: 'Marked Feasible', actor: 'Anita Sharma' },
      { stage: 'Booked', date: '2026-06-17', time: '09:00', note: 'Booking confirmed — Intercom Plus, install 2026-06-20 10:00', actor: 'Anita Sharma' },
      { stage: 'Converted', date: '2026-06-20', time: '12:00', note: 'Installation completed — customer account INC-2026-0004 created', actor: 'Anita Sharma' },
    ],
  },
  {
    id: 'IL-2026-0005', leadName: 'Harish Kulkarni', customer: 'Harish Kulkarni', mobile: '9988001133',
    plan: 'Intercom Basic', stage: 'Lost', assigned: 'Arjun Kumar', followUp: '', createdAt: '2026-06-10', notes: '',
    engineer: 'Dinesh Fiber', visitDate: '2026-06-12', visitTime: '15:00', feasible: false,
    lostReason: 'Customer relocated before installation could be scheduled.',
    stageHistory: [
      { stage: 'New Inquiry', date: '2026-06-10', time: '10:00', note: 'Lead created', actor: 'Arjun Kumar' },
      { stage: 'Feasibility', date: '2026-06-11', time: '09:30', note: 'Feasibility requested — engineer Dinesh Fiber, visit 2026-06-12 15:00', actor: 'Arjun Kumar' },
      { stage: 'Lost', date: '2026-06-12', time: '16:15', note: 'Marked Not Feasible — Customer relocated before installation could be scheduled.', actor: 'Arjun Kumar' },
    ],
  },
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

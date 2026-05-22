const INIT_FOLLOWUPS = [
  {
    id: 'FU-001', leadId: 'LD-201', leadName: 'Ramesh Nair',      phone: '9876001122',
    date: '2026-05-08', time: '10:00', note: 'Discuss plan upgrade options',
    stage: 'Contacted', assignedTo: 'Arjun Kumar', notifyTo: ['Preethi Nair'],
    priority: 'high', status: 'Overdue',
  },
  {
    id: 'FU-002', leadId: 'LD-202', leadName: 'Sunita Bose',      phone: '9765443322',
    date: '2026-05-09', time: '11:30', note: 'Send quotation after call',
    stage: 'Follow-up', assignedTo: 'Preethi Nair', notifyTo: [],
    priority: 'high', status: 'Overdue',
  },
  {
    id: 'FU-003', leadId: 'LD-205', leadName: 'Deepak Joshi',     phone: '9011556677',
    date: '2026-05-15', time: '14:00', note: 'Callback — no answer last time',
    stage: 'Follow-up', assignedTo: 'Suresh Babu', notifyTo: ['Arjun Kumar'],
    priority: 'medium', status: 'Pending',
  },
  {
    id: 'FU-004', leadId: 'LD-204', leadName: 'Meena Iyer',       phone: '9123887766',
    date: '2026-05-15', time: '16:00', note: 'Final pricing negotiation',
    stage: 'Negotiation', assignedTo: 'Preethi Nair', notifyTo: ['Anita Sharma'],
    priority: 'high', status: 'Pending',
  },
  {
    id: 'FU-005', leadId: 'LD-210', leadName: 'Rekha Menon',      phone: '9871234560',
    date: '2026-05-16', time: '10:30', note: 'Share 500 Mbps plan details',
    stage: 'Contacted', assignedTo: 'Anita Sharma', notifyTo: [],
    priority: 'high', status: 'Pending',
  },
  {
    id: 'FU-006', leadId: 'LD-211', leadName: 'Sanjay Rao',       phone: '9654321098',
    date: '2026-05-18', time: '09:00', note: 'Site survey scheduled',
    stage: 'Site Survey', assignedTo: 'Arjun Kumar', notifyTo: ['Suresh Babu'],
    priority: 'medium', status: 'Pending',
  },
  {
    id: 'FU-007', leadId: 'LD-206', leadName: 'Kavita Sharma',    phone: '9876543210',
    date: '2026-05-20', time: '12:00', note: 'Check if quote was reviewed',
    stage: 'Quotation Sent', assignedTo: 'Anita Sharma', notifyTo: [],
    priority: 'medium', status: 'Pending',
  },
  {
    id: 'FU-008', leadId: 'LD-213', leadName: 'Mohan Das',        phone: '9345678901',
    date: '2026-05-22', time: '11:00', note: 'Follow up on walk-in visit',
    stage: 'New Inquiry', assignedTo: 'Suresh Babu', notifyTo: [],
    priority: 'low', status: 'Pending',
  },
  {
    id: 'FU-009', leadId: 'LD-203', leadName: 'Harish Kulkarni',  phone: '9988001133',
    date: '2026-05-25', time: '15:30', note: 'Post-survey proposal discussion',
    stage: 'Site Survey', assignedTo: 'Arjun Kumar', notifyTo: [],
    priority: 'medium', status: 'Pending',
  },
  {
    id: 'FU-010', leadId: 'LD-201', leadName: 'Ramesh Nair',      phone: '9876001122',
    date: '2026-05-28', time: '10:00', note: 'Confirm installation date',
    stage: 'Won', assignedTo: 'Arjun Kumar', notifyTo: ['Preethi Nair'],
    priority: 'low', status: 'Done',
  },
]

let _followups = [...INIT_FOLLOWUPS]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._followups])) }

export function getFollowups() { return [..._followups] }

export function saveFollowup(fu) {
  const exists = _followups.find(f => f.id === fu.id)
  _followups = exists
    ? _followups.map(f => f.id === fu.id ? fu : f)
    : [fu, ..._followups]
  notify()
}

export function markFollowupDone(id) {
  _followups = _followups.map(f => f.id === id ? { ...f, status: 'Done' } : f)
  notify()
}

export function cancelFollowup(id) {
  _followups = _followups.map(f => f.id === id ? { ...f, status: 'Cancelled' } : f)
  notify()
}

export function subscribeFollowups(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i > -1) _listeners.splice(i, 1)
  }
}

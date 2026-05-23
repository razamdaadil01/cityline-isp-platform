const INIT_NOTIFICATIONS = [
  {
    id: 'N-001',
    type: 'lead_assigned',
    title: 'Lead Assigned',
    description: 'Ramesh Nair lead assigned to you',
    meta: 'by Admin',
    time: '5 min ago',
    read: false,
    leadId: 'LD-201',
    color: 'blue',
  },
  {
    id: 'N-002',
    type: 'followup_due',
    title: 'Follow-up Due',
    description: 'Follow-up due for Sunita Bose',
    meta: 'Today at 2:00 PM',
    time: 'Today',
    read: false,
    leadId: 'LD-202',
    color: 'yellow',
  },
  {
    id: 'N-003',
    type: 'followup_overdue',
    title: 'Follow-up Overdue',
    description: 'Follow-up overdue — Deepak Joshi',
    meta: 'Yesterday',
    time: 'Yesterday',
    read: false,
    leadId: 'LD-205',
    color: 'red',
  },
  {
    id: 'N-004',
    type: 'mention',
    title: 'Mentioned in Comment',
    description: '@You were mentioned by Preethi Nair',
    meta: 'on Rekha Menon lead',
    time: '1 hr ago',
    read: true,
    leadId: 'LD-210',
    color: 'purple',
  },
  {
    id: 'N-005',
    type: 'stage_moved',
    title: 'Stage Moved',
    description: 'Harish Kulkarni moved to Site Survey',
    meta: 'by Arjun Kumar',
    time: '2 hrs ago',
    read: true,
    leadId: 'LD-203',
    color: 'blue',
  },
  {
    id: 'N-006',
    type: 'followup_tomorrow',
    title: 'Follow-up Due Tomorrow',
    description: 'Follow-up due tomorrow — Meena Iyer',
    meta: 'Tomorrow at 10:00 AM',
    time: 'Tomorrow',
    read: true,
    leadId: 'LD-204',
    color: 'yellow',
  },
  {
    id: 'N-007',
    type: 'lead_assigned',
    title: 'Lead Assigned',
    description: 'Sanjay Rao lead assigned to Suresh Babu',
    meta: 'by Admin',
    time: '3 hrs ago',
    read: true,
    leadId: 'LD-211',
    color: 'blue',
  },
  {
    id: 'N-008',
    type: 'followup_overdue',
    title: 'Follow-up Overdue',
    description: 'Follow-up overdue — Kavita Sharma',
    meta: '2 days ago',
    time: '2 days ago',
    read: true,
    leadId: 'LD-206',
    color: 'red',
  },
  {
    id: 'N-009',
    type: 'stage_moved',
    title: 'Stage Moved',
    description: 'Mohan Das moved to Contacted',
    meta: 'by Preethi Nair',
    time: '1 day ago',
    read: true,
    leadId: 'LD-213',
    color: 'blue',
  },
  {
    id: 'N-010',
    type: 'mention',
    title: 'Mentioned in Comment',
    description: '@You were mentioned by Arjun Kumar',
    meta: 'on FU-006 follow-up',
    time: '5 hrs ago',
    read: true,
    leadId: 'LD-211',
    color: 'purple',
  },
]

let _notifications = [...INIT_NOTIFICATIONS]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._notifications])) }

export function getNotifications() { return [..._notifications] }

export function markAsRead(id) {
  _notifications = _notifications.map(n => n.id === id ? { ...n, read: true } : n)
  notify()
}

export function markAllAsRead() {
  _notifications = _notifications.map(n => ({ ...n, read: true }))
  notify()
}

export function clearNotifications() {
  _notifications = []
  notify()
}

export function subscribeNotifications(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i > -1) _listeners.splice(i, 1)
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const TICKET_STATUSES = [
  'New', 'Assigned', 'In Progress', 'Waiting for Customer', 'Waiting for Technician',
  'Waiting for NOC', 'Waiting for Billing', 'Resolved', 'Closed', 'Reopened',
  'Cancelled', 'Duplicate',
]

// Statuses where the ticket is no longer being actively worked
export const CLOSED_STATUSES = ['Resolved', 'Closed', 'Cancelled', 'Duplicate']

export const PRIORITIES = ['P1', 'P2', 'P3', 'P4']
export const PRIORITY_LABEL = { P1: 'P1 · Critical', P2: 'P2 · High', P3: 'P3 · Medium', P4: 'P4 · Low' }

// Admin-configurable SLA response windows (hours), per priority. Seeded with the
// previous hardcoded defaults; editable via Settings > SLA Configuration through
// getSlaHours()/saveSlaHours()/subscribeSlaHours() below. Changing this only
// affects SLA deadlines computed from this point forward (new tickets, and
// existing tickets the next time their priority changes) — it never retroactively
// recalculates a ticket's already-stored slaDeadline.
let _slaHours = { P1: 4, P2: 8, P3: 24, P4: 72 }
const _slaHoursListeners = []

function notifySlaHours() { _slaHoursListeners.forEach(fn => fn({ ..._slaHours })) }

export function getSlaHours() { return { ..._slaHours } }

export function saveSlaHours(newHours) {
  _slaHours = { ..._slaHours, ...newHours }
  notifySlaHours()
  return { ..._slaHours }
}

export function subscribeSlaHours(fn) {
  _slaHoursListeners.push(fn)
  return () => {
    const i = _slaHoursListeners.indexOf(fn)
    if (i !== -1) _slaHoursListeners.splice(i, 1)
  }
}

export const CATEGORY_SUBCATEGORIES = {
  Connectivity: ['No Internet', 'Intermittent Connection', 'Fiber Cut'],
  Performance: ['Slow Speed', 'High Latency', 'OTT Buffering'],
  Billing: ['Invoice Query', 'Payment Not Reflected', 'Plan Upgrade/Downgrade'],
  Hardware: ['Router Issue', 'ONU/CPE Fault', 'Cabling Issue'],
  Network: ['Outage', 'OLT Port Down', 'Backbone Issue'],
  Installation: ['New Connection Delay', 'Relocation'],
  Account: ['KYC Update', 'Address Change'],
  Other: ['General Query', 'Feedback'],
}
export const CATEGORIES = Object.keys(CATEGORY_SUBCATEGORIES)

export const AREAS = [
  'Andheri West', 'Andheri East', 'Bandra West', 'Bandra East',
  'Mahim', 'Chembur', 'Nariman Point', 'Colaba',
  'Goregaon', 'Versova', 'MIDC Andheri', 'Juhu', 'Malad West', 'Santacruz', 'SEEPZ',
  'Powai', 'Borivali', 'Kandivali', 'BKC', 'Ghatkopar', 'Mulund', 'Vikhroli', 'Bhandup',
  'Kurla', 'Dadar', 'Matunga', 'Lower Parel', 'Worli', 'Thane West', 'Navi Mumbai', 'Mira Road',
]

export const AGENTS = ['Ravi T.', 'Neha M.', 'Arjun P.', 'Sita K.', 'Kiran B.']

export const TECHNICIANS = ['Suresh Iyer', 'Prakash Yadav', 'Manoj Verma', 'Dinesh Kumar', 'Vikram Singh']

export const TECHNICIAN_SKILLS = [
  'Fiber Splicing', 'Router Configuration', 'ONU Replacement',
  'General Troubleshooting', 'Cabling & Wiring', 'OLT/Network Diagnostics',
]

// Richer per-technician profile (skills/active flag) for the Schedule Technician
// Visit flow. TECHNICIANS above stays a plain name list so existing dropdowns
// (Ticket List bulk-assign, Create Ticket) are unaffected.
export const TECHNICIAN_PROFILES = [
  { name: 'Suresh Iyer', skills: ['Fiber Splicing', 'OLT/Network Diagnostics'], active: true },
  { name: 'Prakash Yadav', skills: ['Cabling & Wiring', 'General Troubleshooting'], active: true },
  { name: 'Manoj Verma', skills: ['ONU Replacement', 'Fiber Splicing'], active: true },
  { name: 'Dinesh Kumar', skills: ['Router Configuration', 'General Troubleshooting'], active: true },
  { name: 'Vikram Singh', skills: ['Fiber Splicing', 'General Troubleshooting'], active: true },
]

export const CONTACT_METHODS = ['Phone', 'Email', 'WhatsApp', 'Portal', 'Walk-in']

export const RESOLUTION_TYPES = ['Fixed Remotely', 'Technician Visit', 'Escalated', 'Customer Education', 'Other']

export const TECH_VISIT_STATUSES = [
  'Visit Scheduled', 'Technician Travelling', 'Technician Reached',
  'Work Started', 'Work Completed', 'Follow-up Required',
]

// Statuses only reachable through a dedicated action (Resolve / Close / Reopen modals),
// never a plain status-dropdown selection.
export const GATED_STATUSES = ['Resolved', 'Closed', 'Reopened']

const H = 3600000 // 1 hour in ms
const NOW = Date.now()

function slaDeadlineFor(createdAt, priority) {
  return new Date(new Date(createdAt).getTime() + _slaHours[priority] * H).toISOString()
}

export const computeSlaDeadline = slaDeadlineFor

// 'On Track' | 'Due Soon' | 'Breached' — 'Due Soon' = within 20% of SLA window remaining
export function slaStatusOf(ticket) {
  if (CLOSED_STATUSES.includes(ticket.status)) return 'Met'
  const deadline = new Date(ticket.slaDeadline).getTime()
  const remaining = deadline - Date.now()
  if (remaining <= 0) return 'Breached'
  const windowMs = _slaHours[ticket.priority] * H
  if (remaining < windowMs * 0.2) return 'Due Soon'
  return 'On Track'
}

// ─── Seed data ──────────────────────────────────────────────────────────────

const SEED = [
  {
    id: 'TKT-2026-000101',
    customerName: 'Mohan Lal', phone: '9765432198', accountNumber: 'ACC-100231',
    category: 'Connectivity', subcategory: 'No Internet',
    priority: 'P1', status: 'New',
    assignedAgent: null, assignedTechnician: null,
    area: 'Andheri West',
    createdAt: new Date(NOW - 0.5 * H).toISOString(), updatedAt: new Date(NOW - 0.5 * H).toISOString(),
    outageLinked: false, reopened: false,
    description: 'Customer reports complete loss of internet since this morning. ONU signal light is red.',
    customerAddress: 'Andheri West', plan: 'FTTH 100Mbps', billingStatus: 'Paid up to date', connectionStatus: 'Connected',
    communicationLog: [
      { time: new Date(NOW - 0.33 * H).toISOString(), actor: 'Support Desk', channel: 'Call', text: 'Call duration: 3m 45s — Customer reported no internet since early morning. ONU light red. Advised power-cycle; issue persists.' },
      { time: new Date(NOW - 0.17 * H).toISOString(), actor: 'Support Desk', channel: 'Call', text: 'Call duration: 1m 52s — Follow-up call; customer confirmed still no connectivity, escalated for urgent action.' },
    ],
  },
  {
    id: 'TKT-2026-000102',
    customerName: 'Radha Krishnan', phone: '9812334455', accountNumber: 'ACC-100455',
    category: 'Billing', subcategory: 'Invoice Query',
    priority: 'P2', status: 'Assigned',
    assignedAgent: 'Neha M.', assignedTechnician: null,
    area: 'Bandra West',
    createdAt: new Date(NOW - 5 * H).toISOString(), updatedAt: new Date(NOW - 3 * H).toISOString(),
    firstResponseAt: new Date(NOW - 4.7 * H).toISOString(),
    outageLinked: false, reopened: false,
    description: 'Invoice amount mismatch — customer claims a promotional offer was not applied.',
    customerAddress: 'Bandra West', plan: 'FTTB 50Mbps', billingStatus: 'Overdue', connectionStatus: 'Connected',
    communicationLog: [
      { time: new Date(NOW - 4 * H).toISOString(), actor: 'Neha M.', channel: 'Call', text: 'Call duration: 5m 02s — Called to clarify the promotional offer details; customer to share screenshot.' },
      { time: new Date(NOW - 2.5 * H).toISOString(), actor: 'Neha M.', channel: 'Call', text: 'Call duration: 2m 40s — Follow-up call; customer confirmed screenshot shared, verifying with billing team.' },
      { time: new Date(NOW - 1 * H).toISOString(), actor: 'Neha M.', channel: 'Call', text: 'Call duration: 3m 15s — Informed customer that the promotional discount will be adjusted in the next invoice cycle.' },
    ],
  },
  {
    id: 'TKT-2026-000103',
    customerName: 'Deepak Patel', phone: '9988776655', accountNumber: 'ACC-100612',
    category: 'Network', subcategory: 'OLT Port Down',
    priority: 'P1', status: 'In Progress',
    assignedAgent: 'Ravi T.', assignedTechnician: 'Suresh Iyer',
    area: 'Andheri East',
    createdAt: new Date(NOW - 9 * H).toISOString(), updatedAt: new Date(NOW - 1 * H).toISOString(),
    firstResponseAt: new Date(NOW - 8.8 * H).toISOString(),
    outageLinked: true, outageId: 'OUT-2026-000004', reopened: false,
    description: 'OLT-ANW-02 port 12 flapping intermittently. Field technician dispatched — SLA at risk.',
    customerAddress: 'Andheri East', plan: 'FTTH 200Mbps', billingStatus: 'Paid up to date', connectionStatus: 'Connected',
    technicianVisit: {
      technician: 'Suresh Iyer',
      visitDate: new Date(NOW - 1 * H).toISOString().slice(0, 10),
      visitTime: '11:30',
      visitStatus: 'Work Started',
      notes: 'On-site at OLT-ANW-02. Confirmed intermittent port flapping on port 12.',
      diagnosis: 'Suspected damaged SFP module on OLT port 12 causing signal flap.',
      photos: ['olt_port12_before.jpg'],
      materialsUsed: [],
      completionDetails: '',
    },
    communicationLog: [
      { time: new Date(NOW - 8 * H).toISOString(), actor: 'Ravi T.', channel: 'Call', text: 'Call duration: 6m 20s — Customer escalated again; confirmed technician dispatched to OLT-ANW-02.' },
      { time: new Date(NOW - 5 * H).toISOString(), actor: 'Ravi T.', channel: 'Call', text: 'Call duration: 2m 10s — Customer called for a status update; informed technician is on-site working on port 12.' },
      { time: new Date(NOW - 1 * H).toISOString(), actor: 'Ravi T.', channel: 'Call', text: 'Call duration: 3m 05s — Follow-up call; confirmed signal stabilizing, asked customer to monitor for further drops.' },
    ],
  },
  {
    id: 'TKT-2026-000104',
    customerName: 'Sunita Rao', phone: '9123456789', accountNumber: 'ACC-100789',
    category: 'Hardware', subcategory: 'Router Issue',
    priority: 'P3', status: 'Waiting for Customer',
    assignedAgent: 'Sita K.', assignedTechnician: null,
    area: 'Andheri West',
    createdAt: new Date(NOW - 30 * H).toISOString(), updatedAt: new Date(NOW - 8 * H).toISOString(),
    firstResponseAt: new Date(NOW - 29.5 * H).toISOString(),
    outageLinked: false, reopened: false,
    description: 'Asked customer to power-cycle the router and share a screenshot of the status LEDs.',
    customerAddress: 'Andheri West', plan: 'FTTH 100Mbps', billingStatus: 'Paid up to date', connectionStatus: 'Connected',
    communicationLog: [
      { time: new Date(NOW - 28 * H).toISOString(), actor: 'Sita K.', channel: 'Call', text: 'Call duration: 2m 58s — Asked customer to power-cycle the router and share the LED status screenshot.' },
      { time: new Date(NOW - 8 * H).toISOString(), actor: 'Sita K.', channel: 'Call', text: 'Call duration: 1m 45s — Follow-up call; customer hasn\'t sent the screenshot yet, requested again.' },
    ],
  },
  {
    id: 'TKT-2026-000105',
    customerName: 'Arjun Nair', phone: '9876543210', accountNumber: 'ACC-100893',
    category: 'Hardware', subcategory: 'Cabling Issue',
    priority: 'P2', status: 'Waiting for Technician',
    assignedAgent: 'Kiran B.', assignedTechnician: 'Prakash Yadav',
    area: 'Nariman Point',
    createdAt: new Date(NOW - 14 * H).toISOString(), updatedAt: new Date(NOW - 2 * H).toISOString(),
    firstResponseAt: new Date(NOW - 13 * H).toISOString(),
    outageLinked: false, reopened: false,
    description: 'Fiber patch cord needs replacement at the customer premises. Technician visit scheduled.',
    customerAddress: 'Nariman Point', plan: 'P2P 1Gbps', billingStatus: 'Paid up to date', connectionStatus: 'Connected',
    technicianVisit: {
      technician: 'Prakash Yadav',
      visitDate: new Date(NOW + 24 * H).toISOString().slice(0, 10),
      visitTime: '10:00',
      visitStatus: 'Visit Scheduled',
      notes: 'Customer confirmed availability for tomorrow morning slot.',
      diagnosis: '',
      photos: [],
      materialsUsed: ['Patch cord (LC-LC, 5m)'],
      completionDetails: '',
    },
    communicationLog: [
      { time: new Date(NOW - 11 * H).toISOString(), actor: 'Kiran B.', channel: 'Call', text: 'Call duration: 4m 30s — Confirmed fiber patch cord replacement needed; technician visit scheduled.' },
      { time: new Date(NOW - 4 * H).toISOString(), actor: 'Kiran B.', channel: 'Call', text: 'Call duration: 2m 15s — Called to confirm technician visit slot for tomorrow morning between 10-12 PM.' },
    ],
  },
  {
    id: 'TKT-2026-000106',
    customerName: 'Kavita Mehta', phone: '9001234567', accountNumber: 'ACC-100944',
    category: 'Network', subcategory: 'Outage',
    priority: 'P1', status: 'Waiting for NOC',
    assignedAgent: 'Arjun P.', assignedTechnician: null,
    area: 'Mahim',
    createdAt: new Date(NOW - 3 * H).toISOString(), updatedAt: new Date(NOW - 0.3 * H).toISOString(),
    firstResponseAt: new Date(NOW - 2.75 * H).toISOString(),
    outageLinked: true, outageId: 'OUT-2026-000005', reopened: false,
    description: 'Area-wide outage suspected after last night\'s storm — escalated to NOC for backbone check.',
    customerAddress: 'Mahim', plan: 'Wireless 25Mbps', billingStatus: 'Paid up to date', connectionStatus: 'Connected',
    communicationLog: [
      { time: new Date(NOW - 2 * H).toISOString(), actor: 'Arjun P.', channel: 'Call', text: 'Call duration: 3m 15s — Customer reported area-wide outage after last night\'s storm; escalated to NOC.' },
      { time: new Date(NOW - 1 * H).toISOString(), actor: 'Arjun P.', channel: 'Call', text: 'Call duration: 1m 30s — Follow-up call; informed customer NOC is investigating a backbone fault, ETA pending.' },
    ],
  },
  {
    id: 'TKT-2026-000107',
    customerName: 'Sanjay Bhat', phone: '9912345678', accountNumber: 'ACC-101022',
    category: 'Billing', subcategory: 'Payment Not Reflected',
    priority: 'P4', status: 'Waiting for Billing',
    assignedAgent: 'Neha M.', assignedTechnician: null,
    area: 'Bandra East',
    createdAt: new Date(NOW - 40 * H).toISOString(), updatedAt: new Date(NOW - 20 * H).toISOString(),
    firstResponseAt: new Date(NOW - 38 * H).toISOString(),
    outageLinked: false, reopened: false,
    description: 'Customer paid via UPI but payment has not reflected on the account. Forwarded to billing team.',
    customerAddress: 'Bandra East', plan: 'FTTH 100Mbps', billingStatus: 'Overdue', connectionStatus: 'Connected',
    communicationLog: [
      { time: new Date(NOW - 38 * H).toISOString(), actor: 'Neha M.', channel: 'Call', text: 'Call duration: 3m 40s — Customer followed up on payment status; informed billing team is verifying the UPI transaction.' },
      { time: new Date(NOW - 20 * H).toISOString(), actor: 'Neha M.', channel: 'Call', text: 'Call duration: 2m 20s — Follow-up call; confirmed payment reference forwarded, awaiting bank reconciliation.' },
    ],
  },
  {
    id: 'TKT-2026-000108',
    customerName: 'Rajan Mehta', phone: '9876543210', accountNumber: 'ACC-100112',
    category: 'Performance', subcategory: 'OTT Buffering',
    priority: 'P3', status: 'Resolved',
    assignedAgent: 'Neha M.', assignedTechnician: null,
    area: 'Andheri West',
    createdAt: new Date(NOW - 72 * H).toISOString(), updatedAt: new Date(NOW - 12 * H).toISOString(),
    firstResponseAt: new Date(NOW - 71 * H).toISOString(),
    outageLinked: false, reopened: false,
    description: 'Buffering on OTT platforms resolved after switching customer DNS to public resolvers.',
    customerAddress: 'Andheri West', plan: 'FTTH 100Mbps', billingStatus: 'Paid up to date', connectionStatus: 'Connected',
    csatScore: 5,
    resolution: {
      rootCause: 'DNS resolution latency to OTT CDN edge nodes.',
      resolutionDetails: 'Switched customer DNS to public resolvers (1.1.1.1 / 8.8.8.8) and confirmed buffering stopped on retest.',
      resolutionType: 'Fixed Remotely',
      customerUpdate: 'Your OTT buffering issue has been resolved by updating your router DNS settings.',
      resolvedAt: new Date(NOW - 12 * H).toISOString(),
      resolvedBy: 'Neha M.',
    },
    communicationLog: [
      { time: new Date(NOW - 70 * H).toISOString(), actor: 'Neha M.', channel: 'Call', text: 'Call duration: 4m 05s — Suggested switching DNS to public resolvers to fix OTT buffering.' },
      { time: new Date(NOW - 12 * H).toISOString(), actor: 'Neha M.', channel: 'Call', text: 'Call duration: 1m 50s — Follow-up call; customer confirmed buffering resolved after the DNS change.' },
    ],
  },
  {
    id: 'TKT-2026-000109',
    customerName: 'Meena Krishnan', phone: '9812334455', accountNumber: 'ACC-100367',
    category: 'Installation', subcategory: 'Relocation',
    priority: 'P4', status: 'Closed',
    assignedAgent: 'Kiran B.', assignedTechnician: 'Manoj Verma',
    area: 'Chembur',
    createdAt: new Date(NOW - 96 * H).toISOString(), updatedAt: new Date(NOW - 36 * H).toISOString(),
    firstResponseAt: new Date(NOW - 95 * H).toISOString(),
    outageLinked: false, reopened: false,
    description: 'Relocation to new address completed and closed after customer confirmation.',
    customerAddress: 'Chembur', plan: 'FTTB 100Mbps', billingStatus: 'Paid up to date', connectionStatus: 'Connected',
    csatScore: 4,
    technicianVisit: {
      technician: 'Manoj Verma',
      visitDate: new Date(NOW - 40 * H).toISOString().slice(0, 10),
      visitTime: '14:00',
      visitStatus: 'Work Completed',
      notes: 'New fiber pulled to relocated address and ONU reinstalled.',
      diagnosis: 'N/A — planned relocation, not a fault.',
      photos: ['new_address_install.jpg', 'onu_signal_check.jpg'],
      materialsUsed: ['Fiber cable (40m)', 'ONU unit', 'Patch cord'],
      completionDetails: 'Connection verified active at new address. Customer confirmed speeds as expected.',
    },
    resolution: {
      rootCause: 'Customer relocated to a new address.',
      resolutionDetails: 'New fiber pull and installation completed at the Chembur address; service verified active.',
      resolutionType: 'Technician Visit',
      customerUpdate: 'Your relocation request has been completed and the new connection is active.',
      resolvedAt: new Date(NOW - 38 * H).toISOString(),
      resolvedBy: 'Kiran B.',
    },
    communicationLog: [
      { time: new Date(NOW - 72 * H).toISOString(), actor: 'Kiran B.', channel: 'Call', text: 'Call duration: 5m 50s — Confirmed relocation address and scheduled fiber pull with technician.' },
      { time: new Date(NOW - 45 * H).toISOString(), actor: 'Kiran B.', channel: 'Call', text: 'Call duration: 2m 30s — Called to confirm technician visit timing for the new address.' },
      { time: new Date(NOW - 38 * H).toISOString(), actor: 'Kiran B.', channel: 'Call', text: 'Call duration: 2m 05s — Follow-up call; customer confirmed new connection active and speeds as expected.' },
    ],
  },
  {
    id: 'TKT-2026-000110',
    customerName: 'Priya Iyer', phone: '9845098450', accountNumber: 'ACC-101155',
    category: 'Connectivity', subcategory: 'Intermittent Connection',
    priority: 'P2', status: 'Reopened',
    assignedAgent: 'Ravi T.', assignedTechnician: 'Vikram Singh',
    area: 'Colaba',
    createdAt: new Date(NOW - 60 * H).toISOString(), updatedAt: new Date(NOW - 1.5 * H).toISOString(),
    firstResponseAt: new Date(NOW - 59.25 * H).toISOString(),
    outageLinked: false, reopened: true,
    description: 'Customer reopened the ticket — intermittent drops resumed two days after the ticket was closed.',
    customerAddress: 'Colaba', plan: 'FTTH 200Mbps', billingStatus: 'Paid up to date', connectionStatus: 'Connected',
    reopenReason: 'Intermittent drops resumed two days after the ticket was closed.',
    resolution: {
      rootCause: 'Loose fiber connector at the ONU.',
      resolutionDetails: 'Reseated the fiber connector at the customer ONU; signal stabilized on the day of the visit.',
      resolutionType: 'Technician Visit',
      customerUpdate: 'Your connection issue was resolved by reseating the fiber connection at your ONU.',
      resolvedAt: new Date(NOW - 50 * H).toISOString(),
      resolvedBy: 'Ravi T.',
    },
    communicationLog: [
      { time: new Date(NOW - 55 * H).toISOString(), actor: 'Ravi T.', channel: 'Call', text: 'Call duration: 3m 30s — Technician visit arranged to reseat the fiber connector at the ONU.' },
      { time: new Date(NOW - 50 * H).toISOString(), actor: 'Ravi T.', channel: 'Call', text: 'Call duration: 1m 40s — Follow-up call; customer confirmed connection stable after the technician visit.' },
      { time: new Date(NOW - 1.6 * H).toISOString(), actor: 'Ravi T.', channel: 'Call', text: 'Call duration: 2m 50s — Customer called again reporting drops resumed; ticket reopened and technician re-dispatched.' },
    ],
  },
].map(t => ({
  ...t,
  slaDeadline: slaDeadlineFor(t.createdAt, t.priority),
  activityLog: t.activityLog ?? [{ time: t.createdAt, actor: 'System', action: 'Ticket created' }],
  communicationLog: t.communicationLog ?? [{ time: t.createdAt, actor: 'System', channel: 'Portal', text: 'Ticket created — notification sent to customer.' }],
  internalNotesLog: t.internalNotesLog ?? [],
  technicianVisit: t.technicianVisit ?? null,
  resolution: t.resolution ?? null,
  attachments: t.attachments ?? [],
  firstResponseAt: t.firstResponseAt ?? null,
  csatScore: t.csatScore ?? null,
}))

// ─── Store ──────────────────────────────────────────────────────────────────

let _tickets = [...SEED]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._tickets])) }

export function nextTicketNumber() {
  const year = new Date().getFullYear()
  const nums = _tickets
    .map(t => t.id.match(/^TKT-(\d{4})-(\d+)$/))
    .filter(Boolean)
    .map(m => Number(m[2]))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `TKT-${year}-${String(next).padStart(6, '0')}`
}

export function getTickets() { return [..._tickets] }

export function getTicket(id) { return _tickets.find(t => t.id === id) ?? null }

export function subscribeTickets(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}

export function saveTicket(ticket) {
  const exists = _tickets.find(t => t.id === ticket.id)
  _tickets = exists ? _tickets.map(t => t.id === ticket.id ? ticket : t) : [ticket, ..._tickets]
  notify()
  return ticket
}

function updateTickets(ids, patch) {
  const idSet = new Set(ids)
  _tickets = _tickets.map(t => idSet.has(t.id) ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)
  notify()
}

// Assigning an agent counts as a first response if none has been recorded yet.
export function assignAgent(ids, agent) {
  const idSet = new Set(ids)
  const now = new Date().toISOString()
  _tickets = _tickets.map(t => idSet.has(t.id)
    ? { ...t, assignedAgent: agent, firstResponseAt: t.firstResponseAt ?? now, updatedAt: now }
    : t)
  notify()
}

export function linkTicketsToOutage(ids, outageId) { updateTickets(ids, { outageId, outageLinked: true }) }

// Open (not Resolved/Closed/Cancelled/Duplicate) tickets in the given areas whose
// category suggests a network-level issue, created around/after the outage's start
// time — candidates for auto-linking to a newly confirmed outage. A 6-hour lookback
// is included since customers usually report the issue before an outage is formally
// confirmed.
export function findTicketsForOutage(areas, sinceIso) {
  const since = new Date(sinceIso).getTime() - 6 * H
  return _tickets.filter(t =>
    areas.includes(t.area) &&
    ['Network', 'Connectivity'].includes(t.category) &&
    !CLOSED_STATUSES.includes(t.status) &&
    new Date(t.createdAt).getTime() >= since
  )
}

export function assignTechnician(ids, technician) { updateTickets(ids, { assignedTechnician: technician }) }

export function changePriority(ids, priority) {
  const idSet = new Set(ids)
  _tickets = _tickets.map(t => idSet.has(t.id)
    ? { ...t, priority, slaDeadline: slaDeadlineFor(t.createdAt, priority), updatedAt: new Date().toISOString() }
    : t)
  notify()
}

function appendActivity(ticket, action, actor) {
  return [...(ticket.activityLog ?? []), { time: new Date().toISOString(), actor, action }]
}

// Plain status-dropdown transition. Resolved/Closed/Reopened are gated behind their
// dedicated actions below and can never be reached through this function.
export function updateTicketStatus(id, status, actor = 'Admin User') {
  if (GATED_STATUSES.includes(status)) return null
  const t = getTicket(id)
  if (!t) return null
  const now = new Date().toISOString()
  return saveTicket({
    ...t, status, updatedAt: now,
    firstResponseAt: t.firstResponseAt ?? (status !== 'New' ? now : null),
    activityLog: appendActivity(t, `Status changed to ${status}`, actor),
  })
}

export function addCommunication(id, { channel, text }, actor = 'Admin User') {
  const t = getTicket(id)
  if (!t) return null
  const now = new Date().toISOString()
  const entry = { time: now, actor, channel, text }
  return saveTicket({
    ...t, communicationLog: [...(t.communicationLog ?? []), entry],
    firstResponseAt: t.firstResponseAt ?? now,
    updatedAt: now,
  })
}

export function addInternalNote(id, text, actor = 'Admin User') {
  const t = getTicket(id)
  if (!t) return null
  const now = new Date().toISOString()
  const entry = { time: now, actor, text }
  return saveTicket({
    ...t, internalNotesLog: [...(t.internalNotesLog ?? []), entry],
    firstResponseAt: t.firstResponseAt ?? now,
    updatedAt: now,
  })
}

export function resolveTicket(id, { rootCause, resolutionDetails, resolutionType, customerUpdate }, actor = 'Admin User') {
  const t = getTicket(id)
  if (!t) return null
  const now = new Date().toISOString()
  const resolution = { rootCause, resolutionDetails, resolutionType, customerUpdate, resolvedAt: now, resolvedBy: actor }
  const communicationLog = customerUpdate?.trim()
    ? [...(t.communicationLog ?? []), { time: now, actor, channel: 'Portal', text: customerUpdate.trim() }]
    : (t.communicationLog ?? [])
  return saveTicket({
    ...t, status: 'Resolved', resolution, communicationLog, updatedAt: now,
    firstResponseAt: t.firstResponseAt ?? now,
    activityLog: appendActivity(t, `Ticket resolved (${resolutionType})`, actor),
  })
}

export function closeTicket(id, actor = 'Admin User') {
  const t = getTicket(id)
  if (!t || t.status !== 'Resolved') return null
  return saveTicket({
    ...t, status: 'Closed', updatedAt: new Date().toISOString(),
    activityLog: appendActivity(t, 'Ticket closed', actor),
  })
}

export function reopenTicket(id, reason, actor = 'Admin User') {
  const t = getTicket(id)
  if (!t || !['Resolved', 'Closed'].includes(t.status)) return null
  return saveTicket({
    ...t, status: 'Reopened', reopened: true, reopenReason: reason, updatedAt: new Date().toISOString(),
    activityLog: appendActivity(t, `Ticket reopened — reason: ${reason}`, actor),
  })
}

// Count of this technician's currently open (not Resolved/Closed/Cancelled/Duplicate) tickets.
export function technicianWorkload(name) {
  return _tickets.filter(t => t.assignedTechnician === name && !CLOSED_STATUSES.includes(t.status)).length
}

// Technician visits can't be scheduled once a ticket is Closed or Cancelled.
export function scheduleTechnicianVisit(id, { technician, visitDate, visitTime, requiredSkill, specialInstructions }, actor = 'Admin User') {
  const t = getTicket(id)
  if (!t || ['Closed', 'Cancelled'].includes(t.status)) return null
  const profile = TECHNICIAN_PROFILES.find(p => p.name === technician)
  if (!profile || !profile.active) return null

  const now = new Date().toISOString()
  const technicianVisit = {
    technician, visitDate, visitTime, visitStatus: 'Visit Scheduled',
    requiredSkill, specialInstructions,
    notes: '', diagnosis: '', photos: [], materialsUsed: [], completionDetails: '',
  }
  const communicationLog = [
    ...(t.communicationLog ?? []),
    { time: now, actor: 'System', channel: 'Portal', text: `Visit confirmation sent to customer for ${visitDate} at ${visitTime}.` },
  ]

  return saveTicket({
    ...t, technicianVisit, communicationLog,
    assignedTechnician: technician,
    firstResponseAt: t.firstResponseAt ?? now,
    updatedAt: now,
    activityLog: appendActivity(t, `Technician visit scheduled with ${technician} for ${visitDate} ${visitTime}`, actor),
  })
}

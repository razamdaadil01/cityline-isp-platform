import { getAllCustomers } from './customersData'
import { getTickets, findTicketsForOutage, findTicketsForEquipment, linkTicketsToOutage } from './ticketsStore'

export const OUTAGE_TYPES = ['Fiber Cut', 'Power Failure', 'Equipment Failure', 'Planned Maintenance', 'Backbone Issue']

export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low']

export const OUTAGE_STATUSES = ['Confirmed', 'Work in Progress', 'Monitoring', 'Resolved', 'Closed']

export const ACTIVE_OUTAGE_STATUSES = ['Confirmed', 'Work in Progress', 'Monitoring']

// Resolved is only reachable through the Resolve Outage modal, never a plain
// status-dropdown selection — same gating pattern as ticketsStore.js.
export const GATED_OUTAGE_STATUSES = ['Resolved']

const H = 3600000
const NOW = Date.now()

function affectedCustomerCountFor(areas) {
  return getAllCustomers().filter(c => areas.includes(c.zone)).length
}

// Full customer records matching an outage's affected area(s) — customers only
// carry a zone, not an equipment/NAS field, so area is the operative match for them.
export function getAffectedCustomers(outage) {
  return getAllCustomers().filter(c => outage.affectedAreas.includes(c.zone))
}

// Union of area-based and equipment/NAS-Port-based open-ticket matches, deduped —
// the combined auto-link basis re-run on both outage creation and area/equipment edits.
function computeRelatedTickets({ affectedAreas, affectedEquipment, startTime }) {
  const byArea = findTicketsForOutage(affectedAreas, startTime)
  const byEquipment = findTicketsForEquipment(affectedEquipment)
  const seen = new Set()
  return [...byArea, ...byEquipment].filter(t => (seen.has(t.id) ? false : (seen.add(t.id), true)))
}

const SEED = [
  {
    id: 'OUT-2026-000001',
    title: 'Fiber Cut Near Four Bungalows Junction',
    type: 'Fiber Cut',
    affectedAreas: ['Andheri West', 'Andheri East', 'Juhu', 'Versova'],
    affectedEquipment: 'OLT-AW-02, Junction Box #23',
    severity: 'Critical',
    status: 'Work in Progress',
    startTime: new Date(NOW - 4 * H).toISOString(),
    expectedRestorationTime: new Date(NOW + 2 * H).toISOString(),
    description: 'Underground fiber cut identified near the Four Bungalows junction box, taking down the OLT-AW-02 uplink.',
    customerMessage: 'We are aware of an internet outage in your area due to a fiber cut and are working to restore service.',
  },
  {
    id: 'OUT-2026-000002',
    title: 'Scheduled OLT Firmware Upgrade',
    type: 'Planned Maintenance',
    affectedAreas: ['Bandra East'],
    affectedEquipment: 'OLT-BE-02',
    severity: 'Low',
    status: 'Monitoring',
    startTime: new Date(NOW - 1 * H).toISOString(),
    expectedRestorationTime: new Date(NOW + 3 * H).toISOString(),
    description: 'Planned firmware upgrade on OLT-BE-02 causing brief intermittent drops during the maintenance window.',
    customerMessage: 'Scheduled network maintenance is in progress in your area. You may experience brief, intermittent drops.',
  },
  {
    id: 'OUT-2026-000003',
    title: 'Power Failure at Goregaon POP',
    type: 'Power Failure',
    affectedAreas: ['Goregaon'],
    affectedEquipment: 'POP-GG-01 (mains + battery backup)',
    severity: 'High',
    status: 'Confirmed',
    startTime: new Date(NOW - 0.5 * H).toISOString(),
    expectedRestorationTime: new Date(NOW + 4 * H).toISOString(),
    description: 'Mains power failure at the Goregaon POP; battery backup engaged, generator team dispatched.',
    customerMessage: 'A power outage at our local facility is affecting your connection. Backup power is active while we resolve this.',
  },
  {
    id: 'OUT-2026-000004',
    title: 'Backbone Fiber Damage — Versova / Andheri East Link',
    type: 'Backbone Issue',
    affectedAreas: ['Versova', 'Andheri East'],
    affectedEquipment: 'Backbone link OLT-AE-02 <-> OLT-VE-01',
    severity: 'Critical',
    status: 'Resolved',
    startTime: new Date(NOW - 30 * H).toISOString(),
    expectedRestorationTime: new Date(NOW - 25 * H).toISOString(),
    description: 'Backbone fiber link between Versova and Andheri East OLTs was severed during nearby roadworks.',
    customerMessage: 'A backbone fiber fault affected internet service in your area. Service has since been restored.',
    resolution: {
      rootCause: 'Backbone fiber severed by third-party roadworks near the Andheri East - Versova link.',
      solution: 'Spliced a new fiber run and rerouted traffic through the backup path during repair.',
      actualRestorationTime: new Date(NOW - 24 * H).toISOString(),
      finalCustomerMessage: 'Service has been fully restored. We apologize for the disruption caused by third-party roadworks.',
      resolvedAt: new Date(NOW - 24 * H).toISOString(),
      resolvedBy: 'Ravi T.',
    },
  },
  {
    id: 'OUT-2026-000005',
    title: 'Equipment Failure — Mahim Router Card',
    type: 'Equipment Failure',
    affectedAreas: ['Mahim'],
    affectedEquipment: 'Core router line card — POP-MH-01',
    severity: 'High',
    status: 'Confirmed',
    startTime: new Date(NOW - 3 * H).toISOString(),
    expectedRestorationTime: new Date(NOW + 5 * H).toISOString(),
    description: 'A line card failure on the Mahim POP core router is suspected after last night\'s storm; NOC investigating.',
    customerMessage: 'We are investigating a network equipment issue affecting your area following last night\'s storm.',
  },
].map(o => ({
  ...o,
  affectedCustomerCount: o.affectedCustomerCount ?? affectedCustomerCountFor(o.affectedAreas),
  resolution: o.resolution ?? null,
  createdAt: o.createdAt ?? o.startTime,
  updatedAt: o.updatedAt ?? o.startTime,
  activityLog: o.activityLog ?? [{ time: o.startTime, actor: 'Admin User', action: 'Outage confirmed' }],
  notificationLog: o.notificationLog ?? [],
}))

let _outages = [...SEED]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._outages])) }

export function nextOutageNumber() {
  const year = new Date().getFullYear()
  const nums = _outages
    .map(o => o.id.match(/^OUT-(\d{4})-(\d+)$/))
    .filter(Boolean)
    .map(m => Number(m[2]))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `OUT-${year}-${String(next).padStart(6, '0')}`
}

export function getOutages() { return [..._outages] }

export function getOutage(id) { return _outages.find(o => o.id === id) ?? null }

export function subscribeOutages(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}

export function saveOutage(outage) {
  const exists = _outages.find(o => o.id === outage.id)
  _outages = exists ? _outages.map(o => o.id === outage.id ? outage : o) : [outage, ..._outages]
  notify()
  return outage
}

function appendActivity(outage, action, actor) {
  return [...(outage.activityLog ?? []), { time: new Date().toISOString(), actor, action }]
}

// Plain status-dropdown transition. Resolved is gated behind resolveOutage().
export function updateOutageStatus(id, status, actor = 'Admin User') {
  if (GATED_OUTAGE_STATUSES.includes(status)) return null
  const o = getOutage(id)
  if (!o) return null
  return saveOutage({
    ...o, status, updatedAt: new Date().toISOString(),
    activityLog: appendActivity(o, `Status changed to ${status}`, actor),
  })
}

export function resolveOutage(id, { rootCause, solution, actualRestorationTime, finalCustomerMessage }, actor = 'Admin User') {
  const o = getOutage(id)
  if (!o) return null
  const now = new Date().toISOString()
  const resolution = { rootCause, solution, actualRestorationTime, finalCustomerMessage, resolvedAt: now, resolvedBy: actor }
  return saveOutage({
    ...o, status: 'Resolved', resolution, updatedAt: now,
    activityLog: appendActivity(o, 'Outage resolved', actor),
  })
}

// The active-outage check used by Create Ticket's Step 2.
export function findActiveOutageForArea(area) {
  if (!area) return null
  return _outages.find(o => o.affectedAreas.includes(area) && ACTIVE_OUTAGE_STATUSES.includes(o.status)) ?? null
}

export function getLinkedTickets(outageId) {
  return getTickets().filter(t => t.outageId === outageId)
}

// Re-runs the auto-link match after Affected Area(s)/Affected Equipment are edited
// on an existing outage — links any newly-matching open tickets that aren't already linked.
export function updateOutageAreaEquipment(id, { affectedAreas, affectedEquipment }, actor = 'Admin User') {
  const o = getOutage(id)
  if (!o) return null
  const now = new Date().toISOString()
  const relatedTickets = computeRelatedTickets({ affectedAreas, affectedEquipment, startTime: o.startTime })
  const newlyLinked = relatedTickets.filter(t => t.outageId !== id)
  if (newlyLinked.length) linkTicketsToOutage(newlyLinked.map(t => t.id), id)

  const affectedCustomerCount = affectedCustomerCountFor(affectedAreas)
  let activityLog = appendActivity(o, 'Affected area/equipment updated', actor)
  if (newlyLinked.length) {
    activityLog = [...activityLog, { time: now, actor: 'System', action: `Auto-linked ${newlyLinked.length} newly-matching open ticket(s).` }]
  }

  return saveOutage({
    ...o, affectedAreas, affectedEquipment, affectedCustomerCount, updatedAt: now, activityLog,
  })
}

// Logs a (stubbed) customer-notification send — no real SMS/email provider is wired up.
export function logNotification(id, { customerCount, message }, actor = 'Admin User') {
  const o = getOutage(id)
  if (!o) return null
  const now = new Date().toISOString()
  const entry = { time: now, actor, customerCount, message }
  return saveOutage({
    ...o,
    notificationLog: [...(o.notificationLog ?? []), entry],
    updatedAt: now,
    activityLog: appendActivity(o, `Notification sent to ${customerCount} customer(s).`, actor),
  })
}

// Full "Create Outage" flow: generates the record, computes affected customers,
// auto-links related open tickets, and logs the mock customer notification.
export function createOutage(data, actor = 'Admin User') {
  const id = nextOutageNumber()
  const now = new Date().toISOString()
  const affectedCustomerCount = affectedCustomerCountFor(data.affectedAreas)
  const relatedTickets = computeRelatedTickets({ affectedAreas: data.affectedAreas, affectedEquipment: data.affectedEquipment, startTime: data.startTime })
  if (relatedTickets.length) linkTicketsToOutage(relatedTickets.map(t => t.id), id)

  const activityLog = [
    { time: now, actor, action: 'Outage confirmed' },
    { time: now, actor: 'System', action: `Outage notification sent to ${affectedCustomerCount} affected customer(s).` },
  ]
  if (relatedTickets.length) {
    activityLog.push({ time: now, actor: 'System', action: `Auto-linked ${relatedTickets.length} related open ticket(s).` })
  }

  const outage = {
    id,
    title: data.title,
    type: data.type,
    affectedAreas: data.affectedAreas,
    affectedEquipment: data.affectedEquipment,
    severity: data.severity,
    status: 'Confirmed',
    startTime: data.startTime,
    expectedRestorationTime: data.expectedRestorationTime,
    description: data.description,
    customerMessage: data.customerMessage,
    affectedCustomerCount,
    resolution: null,
    createdAt: now,
    updatedAt: now,
    activityLog,
    notificationLog: [{ time: now, actor: 'System', customerCount: affectedCustomerCount, message: data.customerMessage }],
  }

  return saveOutage(outage)
}

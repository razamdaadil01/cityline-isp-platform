export const APPROVAL_TYPES = ['Installation', 'Payment', 'Visibility', 'Hardware', 'Purchase Order']

export const APPROVAL_STATUSES = ['Pending', 'Approved', 'Rejected', 'Correction Required']

const H = 3600000
const NOW = Date.now()

// Installation/Payment/Visibility have no dedicated data model yet — mock/placeholder
// detail objects stand in for them until those modules exist to source real records from.
const SEED = [
  {
    id: 'APR-2026-000001',
    type: 'Hardware',
    status: 'Pending',
    relatedType: 'ticket', relatedId: 'TKT-2026-000101', relatedLabel: 'TKT-2026-000101',
    requestedBy: 'Ravi T.',
    requestedDate: new Date(NOW - 5 * H).toISOString(),
    items: [{ name: 'ONU - GPON', quantity: 1, unitPrice: 1800 }],
  },
  {
    id: 'APR-2026-000002',
    type: 'Hardware',
    status: 'Approved',
    relatedType: 'ticket', relatedId: 'TKT-2026-000103', relatedLabel: 'TKT-2026-000103',
    requestedBy: 'Neha M.',
    requestedDate: new Date(NOW - 30 * H).toISOString(),
    items: [{ name: 'Fiber Patch Cord (5m)', quantity: 2, unitPrice: 150 }, { name: 'Wi-Fi Router - Dual Band', quantity: 1, unitPrice: 2200 }],
    decidedBy: 'Admin User', decidedAt: new Date(NOW - 26 * H).toISOString(), decisionComment: 'Approved — matches ticket resolution.',
  },
  {
    id: 'APR-2026-000003',
    type: 'Hardware',
    status: 'Rejected',
    relatedType: 'ticket', relatedId: 'TKT-2026-000105', relatedLabel: 'TKT-2026-000105',
    requestedBy: 'Arjun P.',
    requestedDate: new Date(NOW - 50 * H).toISOString(),
    items: [{ name: 'Set Top Box', quantity: 3, unitPrice: 1600 }],
    decidedBy: 'Admin User', decidedAt: new Date(NOW - 48 * H).toISOString(), decisionComment: 'Quantity too high for a single ticket — please split and re-raise.',
  },
  {
    id: 'APR-2026-000004',
    type: 'Installation',
    status: 'Pending',
    relatedType: 'customer', relatedId: 'RES-2026-0003', relatedLabel: 'RES-2026-0003 · Suresh Kumar',
    requestedBy: 'Pradeep Kumar',
    requestedDate: new Date(NOW - 8 * H).toISOString(),
    installation: {
      customer: 'Suresh Kumar', address: 'Flat 12B, Silver Heights, Goregaon West, Mumbai',
      requestedEquipment: ['ONU - GPON', 'Wi-Fi Router - Dual Band'],
    },
  },
  {
    id: 'APR-2026-000005',
    type: 'Installation',
    status: 'Approved',
    relatedType: 'customer', relatedId: 'RES-2026-0007', relatedLabel: 'RES-2026-0007 · Rahul Patil',
    requestedBy: 'Salim Khan',
    requestedDate: new Date(NOW - 60 * H).toISOString(),
    installation: {
      customer: 'Rahul Patil', address: '4th Floor, Om Sai CHS, Malad West, Mumbai',
      requestedEquipment: ['ONU - GPON'],
    },
    decidedBy: 'Admin User', decidedAt: new Date(NOW - 55 * H).toISOString(), decisionComment: 'Site survey clean — approved for install.',
  },
  {
    id: 'APR-2026-000006',
    type: 'Payment',
    status: 'Pending',
    relatedType: 'customer', relatedId: 'RES-2026-0010', relatedLabel: 'RES-2026-0010 · Kavitha Rao',
    requestedBy: 'Neha Gupta',
    requestedDate: new Date(NOW - 3 * H).toISOString(),
    amount: 1200,
    payment: { customer: 'Kavitha Rao', amount: 1200, reason: 'Partial refund for service outage during billing cycle.' },
  },
  {
    id: 'APR-2026-000007',
    type: 'Payment',
    status: 'Rejected',
    relatedType: 'customer', relatedId: 'RES-2026-0002', relatedLabel: 'RES-2026-0002 · Priya Sharma',
    requestedBy: 'Rajesh Patel',
    requestedDate: new Date(NOW - 70 * H).toISOString(),
    amount: 3500,
    payment: { customer: 'Priya Sharma', amount: 3500, reason: 'Waiver request for late payment penalty.' },
    decidedBy: 'Admin User', decidedAt: new Date(NOW - 65 * H).toISOString(), decisionComment: 'Third waiver request this year — not approved per policy.',
  },
  {
    id: 'APR-2026-000008',
    type: 'Payment',
    status: 'Approved',
    relatedType: 'customer', relatedId: 'RES-2026-0013', relatedLabel: 'RES-2026-0013 · Sanjay Verma',
    requestedBy: 'Ananya Mehta',
    requestedDate: new Date(NOW - 90 * H).toISOString(),
    amount: 800,
    payment: { customer: 'Sanjay Verma', amount: 800, reason: 'Refund for double-billed add-on package.' },
    decidedBy: 'Admin User', decidedAt: new Date(NOW - 88 * H).toISOString(), decisionComment: 'Confirmed duplicate charge — approved.',
  },
  {
    id: 'APR-2026-000009',
    type: 'Visibility',
    status: 'Pending',
    relatedType: 'customer', relatedId: 'ENT-2026-0001', relatedLabel: 'ENT-2026-0001 · Vikram Singh',
    requestedBy: 'Vinod Sharma',
    requestedDate: new Date(NOW - 12 * H).toISOString(),
    visibility: { subject: 'P2P 1Gbps enterprise pricing tier', visibleTo: 'Reseller Partners — MIDC Andheri zone', reason: 'Enable partner-side quoting for a large enterprise prospect in the zone.' },
  },
  {
    id: 'APR-2026-000010',
    type: 'Visibility',
    status: 'Approved',
    relatedType: 'customer', relatedId: 'RES-2026-0006', relatedLabel: 'RES-2026-0006 · Deepa Nair',
    requestedBy: 'Kiran Desai',
    requestedDate: new Date(NOW - 40 * H).toISOString(),
    visibility: { subject: 'Account billing history', visibleTo: 'Support Team — Juhu zone', reason: 'Needed to investigate a recurring billing complaint.' },
    decidedBy: 'Admin User', decidedAt: new Date(NOW - 38 * H).toISOString(), decisionComment: 'Approved for the duration of the investigation.',
  },
  {
    id: 'APR-2026-000011',
    type: 'Purchase Order',
    status: 'Approved',
    relatedType: 'purchase-order', relatedId: 'PO-000005', relatedLabel: 'CITY/PO/2026/00005',
    requestedBy: 'Admin User',
    requestedDate: new Date(NOW - 20 * H).toISOString(),
    amount: 7080,
    purchaseOrder: { poId: 'PO-000005', poNumber: 'CITY/PO/2026/00005', vendorName: 'Sterlite Technologies', storeName: 'Andheri Store' },
    items: [{ name: 'Drop Wire (per m)', quantity: 500, unitPrice: 12 }],
    decidedBy: 'Admin User', decidedAt: new Date(NOW - 18 * H).toISOString(), decisionComment: 'Approved — pricing matches last quarter\'s rate card.',
  },
].map(a => ({
  ...a,
  amount: a.amount ?? null,
  items: a.items ?? [],
  installation: a.installation ?? null,
  payment: a.payment ?? null,
  visibility: a.visibility ?? null,
  purchaseOrder: a.purchaseOrder ?? null,
  decidedBy: a.decidedBy ?? null,
  decidedAt: a.decidedAt ?? null,
  decisionComment: a.decisionComment ?? null,
  activityLog: a.activityLog ?? [
    { time: a.requestedDate, actor: a.requestedBy, action: `${a.type} approval requested` },
    ...(a.decidedAt ? [{ time: a.decidedAt, actor: a.decidedBy, action: `${a.status}${a.decisionComment ? ` — ${a.decisionComment}` : ''}` }] : []),
  ],
}))

let _approvals = [...SEED]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._approvals])) }

export function nextApprovalNumber() {
  const year = new Date().getFullYear()
  const nums = _approvals
    .map(a => a.id.match(/^APR-(\d{4})-(\d+)$/))
    .filter(Boolean)
    .map(m => Number(m[2]))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `APR-${year}-${String(next).padStart(6, '0')}`
}

export function getApprovals() { return [..._approvals] }

export function getApproval(id) { return _approvals.find(a => a.id === id) ?? null }

export function subscribeApprovals(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}

export function saveApproval(approval) {
  const exists = _approvals.find(a => a.id === approval.id)
  _approvals = exists ? _approvals.map(a => a.id === approval.id ? approval : a) : [approval, ..._approvals]
  notify()
  return approval
}

export function createApproval({ type, relatedType = null, relatedId = null, relatedLabel = null, requestedBy = 'Admin User', amount = null, items = [], installation = null, payment = null, visibility = null, purchaseOrder = null }) {
  const id = nextApprovalNumber()
  const now = new Date().toISOString()
  const approval = {
    id, type, status: 'Pending',
    relatedType, relatedId, relatedLabel,
    requestedBy, requestedDate: now,
    amount, items, installation, payment, visibility, purchaseOrder,
    decidedBy: null, decidedAt: null, decisionComment: null,
    activityLog: [{ time: now, actor: requestedBy, action: `${type} approval requested` }],
  }
  return saveApproval(approval)
}

// Raised from Ticket Detail's Hardware Assignment card when hardware is added to a ticket.
export function createHardwareApproval({ ticketId, items }, actor = 'Admin User') {
  const amount = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0)
  return createApproval({
    type: 'Hardware',
    relatedType: 'ticket', relatedId: ticketId, relatedLabel: ticketId,
    requestedBy: actor, amount, items,
  })
}

// Raised from Create Purchase Order's "Send PO" action when the selected
// Company/Entity has poApprovalRequired on (inventorySettingsStore) — see
// purchaseOrderStore.js's savePurchaseOrder(). items reuses the exact same
// {name, quantity, unitPrice} shape createHardwareApproval() uses, so
// ApprovalDetail's item table renders both the same way.
export function createPurchaseOrderApproval({ poId, poNumber, vendorName, storeName, amount, items }, actor = 'Admin User') {
  return createApproval({
    type: 'Purchase Order',
    relatedType: 'purchase-order', relatedId: poId, relatedLabel: poNumber,
    requestedBy: actor, amount, items,
    purchaseOrder: { poId, poNumber, vendorName, storeName },
  })
}

// `actionLabel` lets a caller log a different Activity Log verb than the raw
// status value, e.g. sendForCorrection() below logs "Sent for correction"
// instead of the raw 'Correction Required' status.
function decide(id, status, comment, actor, actionLabel = status) {
  const a = getApproval(id)
  if (!a) return null
  const now = new Date().toISOString()
  const trimmedComment = comment?.trim() || null
  return saveApproval({
    ...a, status, decidedBy: actor, decidedAt: now, decisionComment: trimmedComment,
    activityLog: [...a.activityLog, { time: now, actor, action: `${actionLabel}${trimmedComment ? ` — ${trimmedComment}` : ''}` }],
  })
}

export function approveApproval(id, comment, actor = 'Admin User') { return decide(id, 'Approved', comment, actor) }

export function rejectApproval(id, comment, actor = 'Admin User') { return decide(id, 'Rejected', comment, actor) }

// Purchase-Order-specific "Reject" — a distinct 'Correction Required' status
// (rather than reusing 'Rejected') so the approval itself reflects that the
// PO is expected to come back, not that the request was denied outright.
// syncPOStatusFromApproval()'s subscribeApprovals listener recognizes both
// this status and a plain 'Rejected' (still reachable via the Approvals list
// page's generic Reject action) and maps either to the linked PO's
// 'Correction Required' status, including the PO-correction notification.
export function sendForCorrection(id, comment, actor = 'Admin User') { return decide(id, 'Correction Required', comment, actor, 'Sent for correction') }

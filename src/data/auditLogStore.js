// Audit Log store — module-level pub/sub pattern (mirrors productStore.js).
// Extracted from AuditLog.jsx, which previously generated 120 random mock
// entries as a local SEED_LOGS const with no export and no write function —
// nothing else in the app could ever add a real entry, despite the page's
// own "Immutable" badge implying otherwise. logAudit() below is the real
// write path every other Inventory store now calls into directly (never
// from a UI component, so nothing can bypass it).

export const MODULES = ['Customers', 'Billing', 'Resellers', 'Packages', 'Network', 'Support', 'Settings', 'Auth', 'Inventory']
export const ACTIONS = ['Create', 'Edit', 'Delete', 'Login', 'Logout', 'Export', 'View']

// ── Seed generation — mock history only, not used by the real write path ──
const SEED_USERS   = ['admin@cityline.in', 'rahul.ops@cityline.in', 'billing@cityline.in', 'support@cityline.in']
const SEED_DEVICES = ['Chrome / Windows', 'Safari / macOS', 'Firefox / Linux', 'Chrome / Android', 'Edge / Windows']
const SEED_IPS     = ['192.168.1.10', '103.25.44.81', '49.37.128.55', '10.0.0.5', '203.197.12.44']

const SEED_DETAILS_MAP = {
  'Customers-Create':   ['Added new customer Rajan Mehta (RES-2026-0030)', 'Created account for Priya Sharma', 'New residential customer onboarded'],
  'Customers-Edit':     ['Updated plan for ENT-2026-0001 to FTTH 200Mbps', 'Changed contact number for RES-2026-0011', 'Modified expiry date for RES-2026-0022'],
  'Customers-Delete':   ['Deleted inactive account RES-2026-0015', 'Removed duplicate entry RES-2026-0004'],
  'Billing-Create':     ['Invoice INV-2026-0451 generated', 'Receipt issued for payment ₹999'],
  'Billing-Edit':       ['Updated invoice INV-2026-0440 due date', 'Corrected amount on INV-2026-0388'],
  'Resellers-Create':   ['Added reseller: Raj Networks (RS-001)', 'New reseller DigiLink onboarded'],
  'Resellers-Edit':     ['Updated profit margin for RS-007 to 25%', 'Wallet top-up ₹10,000 for RS-002'],
  'Packages-Create':    ['Created package FTTH 300Mbps ₹1,399/mo', 'Added OTT bundle package'],
  'Packages-Edit':      ['Updated price for FTTB 50Mbps to ₹649', 'Modified validity period for Wireless plans'],
  'Packages-Delete':    ['Deprecated package Wireless 10Mbps'],
  'Network-Edit':       ['Updated OLT-AW-01 configuration', 'Changed port mapping on JAZE-MUM-01'],
  'Settings-Edit':      ['Modified SMTP settings', 'Updated SMS gateway credentials', 'Changed system timezone to Asia/Kolkata'],
  'Support-Create':     ['Ticket TK-2026-0189 opened by Sunita Joshi', 'New escalation created for RES-2026-0006'],
  'Support-Edit':       ['Ticket TK-2026-0180 status changed to Resolved', 'Assigned ticket to support team'],
  'Auth-Login':         ['Successful login from Chrome / Windows', 'Login from new device detected'],
  'Auth-Logout':        ['User session ended normally'],
  'Inventory-Create':   ['Added 20 units of ONU TP-Link XS-010X-Q to stock'],
  'Inventory-Edit':     ['Updated stock count for Cat6 cable to 450m'],
}

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randomDetails(module, action) {
  const key = `${module}-${action}`
  const pool = SEED_DETAILS_MAP[key] || [`${action} performed on ${module} module`]
  return randomFrom(pool)
}

const SEED = Array.from({ length: 120 }, (_, i) => {
  const action = randomFrom(ACTIONS)
  const module = action === 'Login' || action === 'Logout' ? 'Auth' : randomFrom(MODULES.filter(m => m !== 'Auth'))
  const d      = new Date(2026, 4, 7 - Math.floor(i / 15), 23 - (i % 12), (i * 7) % 60, (i * 13) % 60)
  return {
    id:        `LOG-${String(i + 1).padStart(5, '0')}`,
    timestamp: d.toISOString().replace('T', ' ').slice(0, 19),
    user:      randomFrom(SEED_USERS),
    action,
    module,
    details:   randomDetails(module, action),
    ip:        randomFrom(SEED_IPS),
    device:    randomFrom(SEED_DEVICES),
  }
}).sort((a, b) => b.timestamp.localeCompare(a.timestamp))

let _logs = [...SEED]
let _nextSeq = _logs.length + 1
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._logs])) }

export function getAuditLogs() { return _logs }

export function subscribeAuditLogs(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

// The real write path — called directly from inside other stores'
// create/edit functions (productStore.js, vendorStore.js, purchaseStore.js,
// etc.) so an entry is written whenever the underlying action actually
// happens, never left to a UI component to remember to call. Always
// prepends (newest first), matching the seed's own sort order.
export function logAudit({ user, action, module, details, ip, device }) {
  const entry = {
    id: `LOG-${String(_nextSeq++).padStart(5, '0')}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    user: user || 'admin@cityline.in',
    action,
    module,
    details: details || '',
    ip: ip || '—',
    device: device || '—',
  }
  _logs = [entry, ..._logs]
  notify()
  return entry
}

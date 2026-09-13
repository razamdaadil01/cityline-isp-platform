// Vendor master store — module-level pub/sub pattern (mirrors feasibilityStore.js).
// Backs Inventory's Vendor Management (Phase 1: Configuration).
// totalPurchases/totalPaid/outstanding are still simple running totals
// (Purchase Orders/Ledger reconciliation from real receipts is a later
// phase), but each vendor now also carries a real `ledgerEntries` array
// (Date/Reference/Description/Debit/Credit/running Balance) that
// recordVendorPayment() appends to below — Vendor Detail's Ledger
// Statement tab reads this array directly rather than recomputing one on
// the fly, per PRD Sec 16's "Payment recorded -> Vendor ledger updated ->
// Vendor outstanding recalculated" flow.

import { logAudit } from './auditLogStore'

export const PAYMENT_TERMS = ['Advance', 'Net 15', 'Net 30', 'Net 45', 'Net 60']

// Project Management (HDD/Backbone Route Projects, Phase 1) tags a vendor as
// an HDD Contractor so the HDD project creation form (Phase 2) can look up
// their per-meter drilling rate via getVendorDrillingRate() below.
// isHDDContractor defaults false on every vendor unless explicitly set —
// SEED vendors below are all general hardware/fiber suppliers, none tagged.
export function getVendorDrillingRate(vendorId) {
  const vendor = getVendor(vendorId)
  if (!vendor?.isHDDContractor) return null
  return vendor.drillingRatePerMeter ?? null
}

// Vendors now carry a `contacts` array (Add/Edit Vendor's modal supports
// multiple, same repeatable-row pattern as the Add Store modal) rather than
// a single `primaryContact` object. getContacts() is the one place that
// distinction lives — it also covers a legacy record that still only has
// `primaryContact` (none exist in this store's own SEED any more, but any
// external caller still passing the old shape keeps working, migrated to a
// one-item array on the fly rather than breaking).
export function getContacts(vendor) {
  if (vendor?.contacts?.length) return vendor.contacts
  if (vendor?.primaryContact) return [vendor.primaryContact]
  return []
}

const SEED = [
  {
    id: 'VEN-001',
    companyName: 'ZTE India Ltd',
    gstNumber: '27AABCZ1234E1Z5',
    address: '14th Floor, Nirlon Knowledge Park, Goregaon East, Mumbai - 400063, Maharashtra',
    paymentTerms: 'Net 30',
    contacts: [{ name: 'Rakesh Iyer', phone: '98200 11223', email: 'rakesh.iyer@zteindia.com' }],
    totalPurchases: 485000,
    totalPaid: 385000,
    outstanding: 100000,
    lastPurchaseDate: '2026-07-12',
    lastPaymentDate: '2026-07-20',
    status: 'active',
    // Tagged as an HDD Contractor so Project Management's seeded HDD project
    // (projectStore.js) has a real vendor + drilling rate to reference.
    isHDDContractor: true,
    drillingRatePerMeter: 220,
    // Newest first (matches recordVendorPayment()'s own prepend order).
    // Amounts sum to totalPaid (385000) above; the newest date matches
    // lastPaymentDate above.
    payments: [
      { id: 'PAY-2026-000003', paymentDate: '2026-07-20', amount: 135000, method: 'UPI', reference: 'UPI/ZTE2026072012345', notes: 'Final settlement for PUR-2026-000003 shipment', recordedBy: 'Admin User' },
      { id: 'PAY-2026-000002', paymentDate: '2026-06-25', amount: 100000, method: 'Cheque', reference: 'CHQ-778812', notes: '', recordedBy: 'Anita Sharma' },
      { id: 'PAY-2026-000001', paymentDate: '2026-06-10', amount: 150000, method: 'Bank Transfer', reference: 'NEFT/ZTE/0610', notes: 'Advance against PO CITY/PO/2026/00001', recordedBy: 'Admin User' },
    ],
    // Opening Balance (478628) covers the gap between totalPurchases (485000)
    // above and the one real Confirmed Purchase this vendor has in
    // purchaseStore.js's seed (PUR-2026-000003, 6372) — without it the
    // running balance couldn't reconcile to outstanding (100000) below,
    // since that Confirmed Purchase alone falls far short of totalPurchases.
    // Chronological order, ending balance === outstanding above.
    ledgerEntries: [
      { id: 'LED-2026-000001', vendorId: 'VEN-001', date: '2026-06-01', reference: 'Opening Balance', description: 'Opening balance carried forward', debit: 478628, credit: 0, balance: 478628 },
      { id: 'LED-2026-000002', vendorId: 'VEN-001', date: '2026-06-10', reference: 'PAY-2026-000001', description: 'Payment recorded — Bank Transfer', debit: 0, credit: 150000, balance: 328628 },
      { id: 'LED-2026-000003', vendorId: 'VEN-001', date: '2026-06-25', reference: 'PAY-2026-000002', description: 'Payment recorded — Cheque', debit: 0, credit: 100000, balance: 228628 },
      { id: 'LED-2026-000004', vendorId: 'VEN-001', date: '2026-07-20', reference: 'PAY-2026-000003', description: 'Payment recorded — UPI', debit: 0, credit: 135000, balance: 93628 },
      { id: 'LED-2026-000005', vendorId: 'VEN-001', date: '2026-08-12', reference: 'PUR-2026-000003', description: 'Purchase', debit: 6372, credit: 0, balance: 100000 },
    ],
  },
  {
    id: 'VEN-002',
    companyName: 'Sterlite Technologies',
    gstNumber: '27AABCS5678F1Z2',
    address: 'Plot No. 68-69, Silvassa Road, Waghodia, Vadodara - 391760, Gujarat',
    paymentTerms: 'Net 45',
    contacts: [{ name: 'Meena Kulkarni', phone: '99870 33445', email: 'meena.kulkarni@sterlite.com' }],
    totalPurchases: 920000,
    totalPaid: 920000,
    outstanding: 0,
    lastPurchaseDate: '2026-06-28',
    lastPaymentDate: '2026-07-05',
    status: 'active',
    // Amounts sum to totalPaid (920000) above; the newest date matches
    // lastPaymentDate above.
    payments: [
      { id: 'PAY-2026-000006', paymentDate: '2026-07-05', amount: 170000, method: 'Cheque', reference: 'CHQ-441209', notes: 'Balance cleared in full', recordedBy: 'Admin User' },
      { id: 'PAY-2026-000005', paymentDate: '2026-06-20', amount: 350000, method: 'Bank Transfer', reference: 'RTGS/STL/062099', notes: '', recordedBy: 'Suresh Babu' },
      { id: 'PAY-2026-000004', paymentDate: '2026-05-15', amount: 400000, method: 'Bank Transfer', reference: 'RTGS/STL/051526', notes: 'Advance payment for bulk fiber order', recordedBy: 'Admin User' },
    ],
    // Opening Balance (920000) === totalPurchases above — this vendor's only
    // seeded Purchase in purchaseStore.js is still 'Draft' (not Confirmed),
    // so there's no real Purchase debit to carry any of this balance.
    // Chronological order, ending balance === outstanding (0) below.
    ledgerEntries: [
      { id: 'LED-2026-000006', vendorId: 'VEN-002', date: '2026-05-01', reference: 'Opening Balance', description: 'Opening balance carried forward', debit: 920000, credit: 0, balance: 920000 },
      { id: 'LED-2026-000007', vendorId: 'VEN-002', date: '2026-05-15', reference: 'PAY-2026-000004', description: 'Payment recorded — Bank Transfer', debit: 0, credit: 400000, balance: 520000 },
      { id: 'LED-2026-000008', vendorId: 'VEN-002', date: '2026-06-20', reference: 'PAY-2026-000005', description: 'Payment recorded — Bank Transfer', debit: 0, credit: 350000, balance: 170000 },
      { id: 'LED-2026-000009', vendorId: 'VEN-002', date: '2026-07-05', reference: 'PAY-2026-000006', description: 'Payment recorded — Cheque', debit: 0, credit: 170000, balance: 0 },
    ],
  },
  {
    id: 'VEN-003',
    companyName: 'TP-Link India Pvt Ltd',
    gstNumber: '29AABCT9012G1Z8',
    address: 'Prestige Solitaire, Brigade Road, Bengaluru - 560025, Karnataka',
    paymentTerms: 'Advance',
    contacts: [{ name: 'Suresh Bhat', phone: '97410 55667', email: 'suresh.bhat@tp-link.co.in' }],
    totalPurchases: 156000,
    totalPaid: 120000,
    outstanding: 36000,
    lastPurchaseDate: '2026-08-02',
    lastPaymentDate: '2026-08-02',
    status: 'active',
    // Amounts sum to totalPaid (120000) above; the newest date matches
    // lastPaymentDate above (Advance terms — paid same day as the order).
    payments: [
      { id: 'PAY-2026-000009', paymentDate: '2026-08-02', amount: 30000, method: 'UPI', reference: 'UPI/TPL2026080277123', notes: 'Advance payment terms — paid same day as order', recordedBy: 'Admin User' },
      { id: 'PAY-2026-000008', paymentDate: '2026-07-25', amount: 40000, method: 'Bank Transfer', reference: 'NEFT/TPL/072599', notes: '', recordedBy: 'Admin User' },
      { id: 'PAY-2026-000007', paymentDate: '2026-07-10', amount: 50000, method: 'UPI', reference: 'UPI/TPL2026071044556', notes: 'Advance for patch cord order', recordedBy: 'Preethi Nair' },
    ],
    // Opening Balance (138654) covers the gap between totalPurchases (156000)
    // above and the one real Confirmed Purchase this vendor has in
    // purchaseStore.js's seed (PUR-2026-000001, 17346). Chronological order,
    // ending balance === outstanding (36000) below.
    ledgerEntries: [
      { id: 'LED-2026-000010', vendorId: 'VEN-003', date: '2026-07-01', reference: 'Opening Balance', description: 'Opening balance carried forward', debit: 138654, credit: 0, balance: 138654 },
      { id: 'LED-2026-000011', vendorId: 'VEN-003', date: '2026-07-10', reference: 'PAY-2026-000007', description: 'Payment recorded — UPI', debit: 0, credit: 50000, balance: 88654 },
      { id: 'LED-2026-000012', vendorId: 'VEN-003', date: '2026-07-20', reference: 'PUR-2026-000001', description: 'Purchase', debit: 17346, credit: 0, balance: 106000 },
      { id: 'LED-2026-000013', vendorId: 'VEN-003', date: '2026-07-25', reference: 'PAY-2026-000008', description: 'Payment recorded — Bank Transfer', debit: 0, credit: 40000, balance: 66000 },
      { id: 'LED-2026-000014', vendorId: 'VEN-003', date: '2026-08-02', reference: 'PAY-2026-000009', description: 'Payment recorded — UPI', debit: 0, credit: 30000, balance: 36000 },
    ],
  },
]

let _vendors = [...SEED]
let _nextSeq = _vendors.length + 1
const _listeners = []

// Payment id sequence — same PREFIX-YYYY-###### shape as purchaseStore.js's
// nextPurchaseNumber() (PUR-2026-000001), just for payments (PAY-2026-000001).
// Starts after the 9 seeded payments above (000001-000009) so a live-recorded
// payment never collides with a seeded id.
let _nextPaymentSeq = 1 + SEED.reduce((sum, v) => sum + (v.payments?.length ?? 0), 0)
function nextPaymentId() {
  const year = new Date().getFullYear()
  return `PAY-${year}-${String(_nextPaymentSeq++).padStart(6, '0')}`
}

// Ledger entry id sequence — same shape as the payment/purchase id
// sequences above. Starts after the 14 seeded ledger entries (000001-000014)
// so a live-recorded entry never collides with a seeded id.
let _nextLedgerSeq = 1 + SEED.reduce((sum, v) => sum + (v.ledgerEntries?.length ?? 0), 0)
function nextLedgerEntryId() {
  const year = new Date().getFullYear()
  return `LED-${year}-${String(_nextLedgerSeq++).padStart(6, '0')}`
}

function notify() { _listeners.forEach(fn => fn([..._vendors])) }

export function getVendors() { return _vendors }
export function getVendor(id) { return _vendors.find(v => v.id === id) ?? null }

export function subscribeVendors(fn) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

export function isVendorNameTaken(companyName, excludeId = null) {
  const q = companyName.trim().toLowerCase()
  return _vendors.some(v => v.id !== excludeId && v.companyName.trim().toLowerCase() === q)
}

// Create or update. Callers pass an `id` to update an existing vendor;
// omitting it (new vendor) assigns the next VEN-### sequence id.
export function saveVendor(vendor) {
  const isNew = !(vendor.id && _vendors.find(v => v.id === vendor.id))
  let saved
  if (!isNew) {
    _vendors = _vendors.map(v => v.id === vendor.id ? { ...v, ...vendor } : v)
    saved = _vendors.find(v => v.id === vendor.id)
  } else {
    const id = `VEN-${String(_nextSeq++).padStart(3, '0')}`
    saved = {
      totalPurchases: 0, totalPaid: 0, outstanding: 0,
      lastPurchaseDate: null, lastPaymentDate: null, status: 'active',
      payments: [],
      isHDDContractor: false, drillingRatePerMeter: null,
      ...vendor, id,
    }
    _vendors = [..._vendors, saved]
  }
  notify()
  logAudit({
    action: isNew ? 'Create' : 'Edit', module: 'Inventory',
    details: `${isNew ? 'Added' : 'Updated'} vendor ${saved.companyName} (${saved.id})`,
  })
}

// Vendors are never hard-deleted once purchase history could exist against
// them (BR: "Vendor cannot be hard-deleted if any purchase history exists")
// — v1 has no purchase history yet, so this status toggle (deactivate) is
// the only delete-adjacent action exposed anywhere in the UI.
export function setVendorStatus(id, status) {
  _vendors = _vendors.map(v => v.id === id ? { ...v, status } : v)
  notify()
  const vendor = getVendor(id)
  logAudit({ action: 'Edit', module: 'Inventory', details: `${status === 'active' ? 'Activated' : 'Deactivated'} vendor ${vendor?.companyName ?? id}` })
}

// Simple arithmetic against the vendor's running totals — real Purchase-vs-
// Payment reconciliation is a later phase. Reduces outstanding by the paid
// amount (floored at 0) and bumps totalPaid + lastPaymentDate. Also appends
// an itemized record to `payments` (method/reference/notes previously
// collected by Record Payment's form and then discarded) — Vendor Detail's
// Payments tab and its Excel export both read this array — and a matching
// credit entry to `ledgerEntries`, per PRD Sec 16's "Payment recorded ->
// Vendor ledger updated -> Vendor outstanding recalculated" flow. The
// ledger entry's reference is the generated Payment ID rather than the
// user-typed transaction/cheque reference — it's the more durable id (always
// present, unique, never blank) — and its balance is the same floored
// (outstanding - amount) figure used for the vendor's own outstanding field
// below, so the two can never disagree.
export function recordVendorPayment(id, { amount, paymentDate, method, reference, notes }) {
  let vendorName = id
  _vendors = _vendors.map(v => {
    if (v.id !== id) return v
    vendorName = v.companyName
    const payment = {
      id: nextPaymentId(), paymentDate, amount, method: method || '', reference: reference || '', notes: notes || '',
      // Hardcoded 'current user' — no auth/session system exists yet, same
      // convention as purchaseOrderStore.js's/purchaseStore.js's createdBy
      // and assignmentStore.js's assignedBy.
      recordedBy: 'Admin User',
    }
    const newOutstanding = Math.max(0, v.outstanding - amount)
    const ledgerEntry = {
      id: nextLedgerEntryId(), vendorId: v.id, date: paymentDate, reference: payment.id,
      description: `Payment recorded — ${payment.method || 'Payment'}`,
      debit: 0, credit: amount, balance: newOutstanding,
    }
    return {
      ...v,
      totalPaid: v.totalPaid + amount,
      outstanding: newOutstanding,
      lastPaymentDate: paymentDate || v.lastPaymentDate,
      payments: [payment, ...(v.payments ?? [])],
      ledgerEntries: [ledgerEntry, ...(v.ledgerEntries ?? [])],
    }
  })
  notify()
  logAudit({ action: 'Edit', module: 'Inventory', details: `Recorded ₹${amount.toLocaleString('en-IN')} payment for ${vendorName}` })
}

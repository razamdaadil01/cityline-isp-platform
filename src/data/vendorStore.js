// Vendor master store — module-level pub/sub pattern (mirrors feasibilityStore.js).
// Backs Inventory's Vendor Management (Phase 1: Configuration). Purchase
// Orders/Ledger (Phase 2-3) aren't built yet — totalPurchases/totalPaid/
// outstanding are simple running totals updated by recordVendorPayment(),
// not derived from real ledger entries.

import { logAudit } from './auditLogStore'

export const PAYMENT_TERMS = ['Advance', 'Net 15', 'Net 30', 'Net 45', 'Net 60']

const SEED = [
  {
    id: 'VEN-001',
    companyName: 'ZTE India Ltd',
    gstNumber: '27AABCZ1234E1Z5',
    address: '14th Floor, Nirlon Knowledge Park, Goregaon East, Mumbai - 400063, Maharashtra',
    paymentTerms: 'Net 30',
    primaryContact: { name: 'Rakesh Iyer', phone: '98200 11223', email: 'rakesh.iyer@zteindia.com' },
    totalPurchases: 485000,
    totalPaid: 385000,
    outstanding: 100000,
    lastPurchaseDate: '2026-07-12',
    lastPaymentDate: '2026-07-20',
    status: 'active',
  },
  {
    id: 'VEN-002',
    companyName: 'Sterlite Technologies',
    gstNumber: '27AABCS5678F1Z2',
    address: 'Plot No. 68-69, Silvassa Road, Waghodia, Vadodara - 391760, Gujarat',
    paymentTerms: 'Net 45',
    primaryContact: { name: 'Meena Kulkarni', phone: '99870 33445', email: 'meena.kulkarni@sterlite.com' },
    totalPurchases: 920000,
    totalPaid: 920000,
    outstanding: 0,
    lastPurchaseDate: '2026-06-28',
    lastPaymentDate: '2026-07-05',
    status: 'active',
  },
  {
    id: 'VEN-003',
    companyName: 'TP-Link India Pvt Ltd',
    gstNumber: '29AABCT9012G1Z8',
    address: 'Prestige Solitaire, Brigade Road, Bengaluru - 560025, Karnataka',
    paymentTerms: 'Advance',
    primaryContact: { name: 'Suresh Bhat', phone: '97410 55667', email: 'suresh.bhat@tp-link.co.in' },
    totalPurchases: 156000,
    totalPaid: 120000,
    outstanding: 36000,
    lastPurchaseDate: '2026-08-02',
    lastPaymentDate: '2026-08-02',
    status: 'active',
  },
]

let _vendors = [...SEED]
let _nextSeq = _vendors.length + 1
const _listeners = []

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

// Simple arithmetic against the vendor's running totals — no real ledger
// entries yet (that's Phase 3). Reduces outstanding by the paid amount
// (floored at 0) and bumps totalPaid + lastPaymentDate. Also appends an
// itemized record to `payments` (method/reference/notes previously
// collected by Record Payment's form and then discarded) — Vendor Detail's
// Payments tab and its Excel export both read this array.
export function recordVendorPayment(id, { amount, paymentDate, method, reference, notes }) {
  let vendorName = id
  _vendors = _vendors.map(v => {
    if (v.id !== id) return v
    vendorName = v.companyName
    const payment = {
      id: `PAY-${Date.now()}`, paymentDate, amount, method: method || '', reference: reference || '', notes: notes || '',
    }
    return {
      ...v,
      totalPaid: v.totalPaid + amount,
      outstanding: Math.max(0, v.outstanding - amount),
      lastPaymentDate: paymentDate || v.lastPaymentDate,
      payments: [payment, ...(v.payments ?? [])],
    }
  })
  notify()
  logAudit({ action: 'Edit', module: 'Inventory', details: `Recorded ₹${amount.toLocaleString('en-IN')} payment for ${vendorName}` })
}

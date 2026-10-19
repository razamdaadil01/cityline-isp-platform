// Invoices store — Finance tab's Invoices sub-tab and Add Payment both read/
// write this. Mirrors the module-level pub/sub pattern already used
// throughout this app (settlementStore.js, customerRecoveryStore.js, etc.).
//
// Still a single shared invoice list rather than genuinely per-customer data
// (same pre-existing limitation as the rest of Finance's mock data) — every
// customer's Finance tab shows the same invoices. Out of scope to fix here;
// this only makes the shared list a real, mutable store instead of a dead
// local const, so Add Payment's Submit action can actually mark an invoice
// Paid and have it persist/reflect live everywhere this data is read.
import { getNextInvoiceNumber } from './companyEntities'

// GST breakdown for seed invoices: 18% intra-state (CGST 9% + SGST 9%)
// For ₹1499 total: taxable = 1270.34, cgst = sgst = 114.33
// For ₹999 total:  taxable = 847.46,  cgst = sgst = 76.27  (rounding: sum = 1000)
let _invoices = [
  { no: 'INV-2026-0451', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'Broadband + Landline + OTT', packageName: 'Broadband + Landline + OTT',
    date: '01 May 2026', issueDate: '2026-05-01', dueDate: '2026-05-08',
    lines: [{ description: 'Broadband + Landline + OTT', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0,
    amount: 1499, totalAmount: 1499, status: 'paid' },
  { no: 'INV-2026-0312', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'Broadband + Landline + OTT', packageName: 'Broadband + Landline + OTT',
    date: '01 Apr 2026', issueDate: '2026-04-01', dueDate: '2026-04-08',
    lines: [{ description: 'Broadband + Landline + OTT', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0,
    amount: 1499, totalAmount: 1499, status: 'paid' },
  { no: 'INV-2026-0189', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'Broadband + Landline + OTT', packageName: 'Broadband + Landline + OTT',
    date: '01 Mar 2026', issueDate: '2026-03-01', dueDate: '2026-03-08',
    lines: [{ description: 'Broadband + Landline + OTT', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0,
    amount: 1499, totalAmount: 1499, status: 'paid' },
  { no: 'INV-2026-0088', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'Broadband + Landline + OTT', packageName: 'Broadband + Landline + OTT',
    date: '01 Feb 2026', issueDate: '2026-02-01', dueDate: '2026-02-08',
    lines: [{ description: 'Broadband + Landline + OTT', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0,
    amount: 1499, totalAmount: 1499, status: 'paid' },
  { no: 'INV-2026-0052', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'Broadband', packageName: 'Broadband',
    date: '01 Jan 2026', issueDate: '2026-01-01', dueDate: '2026-01-08',
    lines: [{ description: 'Broadband', quantity: 1, unitPrice: 847.46, amount: 847.46, hsnSac: '998422' }],
    taxableAmount: 847.46, cgst: 76.27, sgst: 76.27, igst: 0,
    amount: 999, totalAmount: 999, status: 'paid' },
  { no: 'INV-2025-0987', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'Broadband', packageName: 'Broadband',
    date: '01 Dec 2025', issueDate: '2025-12-01', dueDate: '2025-12-08',
    lines: [{ description: 'Broadband', quantity: 1, unitPrice: 847.46, amount: 847.46, hsnSac: '998422' }],
    taxableAmount: 847.46, cgst: 76.27, sgst: 76.27, igst: 0,
    amount: 999, totalAmount: 999, status: 'paid' },
  { no: 'INV-2026-0512', customerId: 'RES-2026-0001', entityId: 1, packageId: 'BWP-001',
    pkg: 'Broadband + Landline + OTT', packageName: 'Broadband + Landline + OTT',
    date: '01 Jun 2026', issueDate: '2026-06-01', dueDate: '2026-06-08',
    lines: [{ description: 'Broadband + Landline + OTT', quantity: 1, unitPrice: 1270.34, amount: 1270.34, hsnSac: '998422' }],
    taxableAmount: 1270.34, cgst: 114.33, sgst: 114.33, igst: 0,
    amount: 1499, totalAmount: 1499, status: 'pending' },
]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._invoices])) }

export function getInvoices() { return [..._invoices] }

export function getOutstandingInvoices() { return _invoices.filter(i => i.status !== 'paid') }

export function getOutstandingTotal() {
  return getOutstandingInvoices().reduce((sum, i) => sum + i.amount, 0)
}

export function markInvoicesPaid(invoiceNos, paymentMeta = {}) {
  const set = new Set(invoiceNos)
  _invoices = _invoices.map(i => set.has(i.no) ? {
    ...i,
    status: 'paid',
    paidOn: paymentMeta.paymentDate || '',
    paymentMode: paymentMeta.mode || '',
    txnId: paymentMeta.txnId || '',
  } : i)
  notify()
}

export function updateInvoice(no, fields) {
  _invoices = _invoices.map(i => i.no === no ? { ...i, ...fields } : i)
  notify()
}

// deprecated — use getNextInvoiceNumber(entityId) from companyEntities when entityId is known
function generateInvoiceNo() {
  const year = new Date().getFullYear()
  const existing = _invoices.filter(i => i.no && i.no.startsWith(`INV-${year}-`))
  const max = existing.reduce((m, i) => {
    const n = parseInt(i.no.split('-')[2]) || 0
    return Math.max(m, n)
  }, 0)
  return `INV-${year}-${String(max + 1).padStart(3, '0')}`
}

export function addInvoice(data) {
  const no = data.entityId
    ? getNextInvoiceNumber(data.entityId)
    : generateInvoiceNo()
  const invoice = {
    ...data,
    no,
    createdAt: new Date().toISOString(),
    // Compatibility aliases — CustomerDetail Finance tab reads inv.pkg, inv.date, inv.amount
    pkg: data.packageName || '',
    date: data.issueDate
      ? new Date(data.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '',
    amount: data.totalAmount || 0,
    status: data.status || 'pending',
  }
  _invoices = [..._invoices, invoice]
  notify()
  return invoice
}

export function getOverdueInvoices() {
  const today = new Date().toISOString().split('T')[0]
  return _invoices.filter(i => i.status === 'pending' && i.dueDate && i.dueDate < today)
}

export function getPendingInvoices() {
  return _invoices.filter(i => i.status === 'pending')
}

export function getCollectedTotal() {
  return _invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.totalAmount || i.amount || 0), 0)
}

export function getPendingTotal() {
  return _invoices.filter(i => i.status === 'pending').reduce((s, i) => s + (i.totalAmount || i.amount || 0), 0)
}

export function getOverdueTotal() {
  return getOverdueInvoices().reduce((s, i) => s + (i.totalAmount || i.amount || 0), 0)
}

export function subscribeInvoices(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i > -1) _listeners.splice(i, 1)
  }
}

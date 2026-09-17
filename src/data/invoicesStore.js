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

let _invoices = [
  { no: 'INV-2026-0451', pkg: 'Broadband + Landline + OTT', date: '01 May 2026', amount: 1499, status: 'paid' },
  { no: 'INV-2026-0312', pkg: 'Broadband + Landline + OTT', date: '01 Apr 2026', amount: 1499, status: 'paid' },
  { no: 'INV-2026-0189', pkg: 'Broadband + Landline + OTT', date: '01 Mar 2026', amount: 1499, status: 'paid' },
  { no: 'INV-2026-0088', pkg: 'Broadband + Landline + OTT', date: '01 Feb 2026', amount: 1499, status: 'paid' },
  { no: 'INV-2026-0052', pkg: 'Broadband',                   date: '01 Jan 2026', amount: 999,  status: 'paid' },
  { no: 'INV-2025-0987', pkg: 'Broadband',                   date: '01 Dec 2025', amount: 999,  status: 'paid' },
  { no: 'INV-2026-0512', pkg: 'Broadband + Landline + OTT',  date: '01 Jun 2026', amount: 1499, status: 'pending' },
]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._invoices])) }

export function getInvoices() { return [..._invoices] }

export function getOutstandingInvoices() { return _invoices.filter(i => i.status !== 'paid') }

export function getOutstandingTotal() {
  return getOutstandingInvoices().reduce((sum, i) => sum + i.amount, 0)
}

export function markInvoicesPaid(invoiceNos) {
  const set = new Set(invoiceNos)
  _invoices = _invoices.map(i => set.has(i.no) ? { ...i, status: 'paid' } : i)
  notify()
}

export function subscribeInvoices(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i > -1) _listeners.splice(i, 1)
  }
}

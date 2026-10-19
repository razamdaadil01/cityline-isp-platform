import { getInvoices, updateInvoice } from './invoicesStore'
import { getCustomer, updateCustomer } from './customersData'

// Real payment records — Add Payment's Submit action writes here; Finance
// tab's Payments sub-tab merges these (real, customer-specific) on top of
// its own pre-existing MOCK_PAYMENTS seed rows. Mirrors the module-level
// pub/sub pattern already used throughout this app (settlementStore.js,
// customerRecoveryStore.js, etc.) — no real payment gateway involved, this
// only records that a payment was entered.

// Seeded payment history — for demo purposes only, so Revenue Overview,
// Today's Collections and the "Today's Collection" stat card show a
// genuine multi-month trend instead of starting completely empty every
// session. Shape mirrors exactly what AddPayment.jsx's own Submit action
// writes (see that file's handleSubmit) so every consumer of this store
// (CustomerDetail.jsx's Payment History tab, Reports.jsx, Dashboard.jsx)
// renders these the same way it renders a real in-session payment.
// customerId references are real customersData.js ids; amounts are
// realistic monthly/annual charges for each customer's own `plan`
// (broadly following the per-tenure pricing already seeded in
// packagesStore.js's MOCK_BW_PACKAGES, e.g. ~₹899-1499/mo for residential
// FTTH/FTTB, several thousand+ for P2P/ILL enterprise links). Each
// payment now references a real invoicesStore.js invoice (invoiceNo +
// invoiceNos[]) for the same customer and same month — seed invoices were
// added to invoicesStore.js to match (Batch F2-1 Item 4).
const SEED_PAYMENTS = [
  // ── April 2026 ──
  { id: 'PAY-SEED-0001', customerId: 'RES-2026-0001', receiptNo: '117645', invoiceNo: 'INV-2026-0312', invoiceNos: ['INV-2026-0312'], paymentDate: '05-04-2026', date: '05-04-2026 10:15:22', mode: 'Cash', total: 999, paid: 999, status: 'Complete', orderNo: '—', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0002', customerId: 'RES-2026-0004', receiptNo: '117646', invoiceNo: 'INV-2026-1001', invoiceNos: ['INV-2026-1001'], paymentDate: '12-04-2026', date: '12-04-2026 11:40:05', mode: 'Online', total: 1499, paid: 1499, status: 'Complete', orderNo: 'TXN117646', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0003', customerId: 'ENT-2026-0001', receiptNo: '117647', invoiceNo: 'INV-2026-1003', invoiceNos: ['INV-2026-1003'], paymentDate: '10-04-2026', date: '10-04-2026 15:20:00', mode: 'Cheque', total: 12999, paid: 12999, status: 'Complete', orderNo: 'CHQ117647', chequeBCh: 0, addBy: 'Admin User', comment: 'Quarterly ILL payment' },
  { id: 'PAY-SEED-0004', customerId: 'RES-2026-0012', receiptNo: '117648', invoiceNo: 'INV-2026-1004', invoiceNos: ['INV-2026-1004'], paymentDate: '18-04-2026', date: '18-04-2026 09:05:44', mode: 'Cheque', total: 1499, paid: 1499, status: 'Complete', orderNo: 'CHQ117648', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0005', customerId: 'ENT-2026-0002', receiptNo: '117649', invoiceNo: 'INV-2026-1005', invoiceNos: ['INV-2026-1005'], paymentDate: '25-04-2026', date: '25-04-2026 16:00:00', mode: 'Cheque', total: 45000, paid: 45000, status: 'Complete', orderNo: 'CHQ117649', chequeBCh: 0, addBy: 'Admin User', comment: 'Quarterly ILL payment' },

  // ── May 2026 ──
  { id: 'PAY-SEED-0006', customerId: 'RES-2026-0001', receiptNo: '117650', invoiceNo: 'INV-2026-0451', invoiceNos: ['INV-2026-0451'], paymentDate: '05-05-2026', date: '05-05-2026 10:20:10', mode: 'Cash', total: 999, paid: 999, status: 'Complete', orderNo: '—', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0007', customerId: 'RES-2026-0004', receiptNo: '117651', invoiceNo: 'INV-2026-1002', invoiceNos: ['INV-2026-1002'], paymentDate: '12-05-2026', date: '12-05-2026 11:35:50', mode: 'Online', total: 1499, paid: 1499, status: 'Complete', orderNo: 'TXN117651', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0008', customerId: 'RES-2026-0010', receiptNo: '117652', invoiceNo: 'INV-2026-1006', invoiceNos: ['INV-2026-1006'], paymentDate: '20-05-2026', date: '20-05-2026 14:10:33', mode: 'Android App', total: 999, paid: 999, status: 'Complete', orderNo: 'APP117652', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0009', customerId: 'RES-2026-0020', receiptNo: '117653', invoiceNo: 'INV-2026-1008', invoiceNos: ['INV-2026-1008'], paymentDate: '22-05-2026', date: '22-05-2026 10:45:12', mode: 'Online', total: 1499, paid: 1499, status: 'Complete', orderNo: 'TXN117653', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0010', customerId: 'IC-CUST-2026-000001', receiptNo: '117654', invoiceNo: 'INV-2026-1009', invoiceNos: ['INV-2026-1009'], paymentDate: '15-05-2026', date: '15-05-2026 09:30:00', mode: 'Cash', total: 299, paid: 299, status: 'Complete', orderNo: '—', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },

  // ── June 2026 ──
  { id: 'PAY-SEED-0011', customerId: 'RES-2026-0001', receiptNo: '117655', invoiceNo: 'INV-2026-0512', invoiceNos: ['INV-2026-0512'], paymentDate: '05-06-2026', date: '05-06-2026 10:05:00', mode: 'Cash', total: 999, paid: 999, status: 'Complete', orderNo: '—', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0012', customerId: 'RES-2026-0004', receiptNo: '117656', invoiceNo: 'INV-2026-1007', invoiceNos: ['INV-2026-1007'], paymentDate: '12-06-2026', date: '12-06-2026 11:50:20', mode: 'Online', total: 1499, paid: 1499, status: 'Complete', orderNo: 'TXN117656', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0013', customerId: 'RES-2026-0010', receiptNo: '117657', invoiceNo: 'INV-2026-1010', invoiceNos: ['INV-2026-1010'], paymentDate: '20-06-2026', date: '20-06-2026 13:55:40', mode: 'Android App', total: 999, paid: 999, status: 'Complete', orderNo: 'APP117657', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0014', customerId: 'RES-2026-0012', receiptNo: '117658', invoiceNo: 'INV-2026-1011', invoiceNos: ['INV-2026-1011'], paymentDate: '18-06-2026', date: '18-06-2026 09:15:10', mode: 'Cheque', total: 1499, paid: 1499, status: 'Complete', orderNo: 'CHQ117658', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0015', customerId: 'RES-2026-0024', receiptNo: '117659', invoiceNo: 'INV-2026-1012', invoiceNos: ['INV-2026-1012'], paymentDate: '05-06-2026', date: '05-06-2026 17:00:00', mode: 'Cheque', total: 49999, paid: 49999, status: 'Complete', orderNo: 'CHQ117659', chequeBCh: 0, addBy: 'Admin User', comment: 'P2P 10Gbps enterprise link' },
  { id: 'PAY-SEED-0016', customerId: 'RES-2026-0026', receiptNo: '117660', invoiceNo: 'INV-2026-1013', invoiceNos: ['INV-2026-1013'], paymentDate: '02-06-2026', date: '02-06-2026 10:00:00', mode: 'Cash', total: 1199, paid: 1199, status: 'Complete', orderNo: '—', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },

  // ── July 2026 ──
  { id: 'PAY-SEED-0017', customerId: 'RES-2026-0001', receiptNo: '117661', invoiceNo: 'INV-2026-1014', invoiceNos: ['INV-2026-1014'], paymentDate: '05-07-2026', date: '05-07-2026 10:12:00', mode: 'Cash', total: 999, paid: 999, status: 'Complete', orderNo: '—', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0018', customerId: 'RES-2026-0004', receiptNo: '117662', invoiceNo: 'INV-2026-1015', invoiceNos: ['INV-2026-1015'], paymentDate: '12-07-2026', date: '12-07-2026 11:30:00', mode: 'Online', total: 1499, paid: 1499, status: 'Complete', orderNo: 'TXN117662', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0019', customerId: 'ENT-2026-0001', receiptNo: '117663', invoiceNo: 'INV-2026-1016', invoiceNos: ['INV-2026-1016'], paymentDate: '10-07-2026', date: '10-07-2026 15:45:00', mode: 'Cheque', total: 12999, paid: 12999, status: 'Complete', orderNo: 'CHQ117663', chequeBCh: 0, addBy: 'Admin User', comment: 'Quarterly ILL payment' },
  { id: 'PAY-SEED-0020', customerId: 'RES-2026-0010', receiptNo: '117664', invoiceNo: 'INV-2026-1017', invoiceNos: ['INV-2026-1017'], paymentDate: '20-07-2026', date: '20-07-2026 14:00:00', mode: 'Android App', total: 999, paid: 999, status: 'Complete', orderNo: 'APP117664', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0021', customerId: 'ENT-2026-0002', receiptNo: '117665', invoiceNo: 'INV-2026-1018', invoiceNos: ['INV-2026-1018'], paymentDate: '25-07-2026', date: '25-07-2026 16:10:00', mode: 'Cheque', total: 45000, paid: 45000, status: 'Complete', orderNo: 'CHQ117665', chequeBCh: 0, addBy: 'Admin User', comment: 'Quarterly ILL payment' },
  { id: 'PAY-SEED-0022', customerId: 'RES-2026-0016', receiptNo: '117666', invoiceNo: 'INV-2026-1019', invoiceNos: ['INV-2026-1019'], paymentDate: '08-07-2026', date: '08-07-2026 12:00:00', mode: 'Online', total: 1499, paid: 1499, status: 'Complete', orderNo: 'TXN117666', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0023', customerId: 'RES-2026-0027', receiptNo: '117667', invoiceNo: 'INV-2026-1020', invoiceNos: ['INV-2026-1020'], paymentDate: '30-07-2026', date: '30-07-2026 09:50:00', mode: 'Cash', total: 1499, paid: 1499, status: 'Complete', orderNo: '—', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },

  // ── August 2026 ──
  { id: 'PAY-SEED-0024', customerId: 'RES-2026-0001', receiptNo: '117668', invoiceNo: 'INV-2026-1021', invoiceNos: ['INV-2026-1021'], paymentDate: '05-08-2026', date: '05-08-2026 10:18:00', mode: 'Cash', total: 999, paid: 999, status: 'Complete', orderNo: '—', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0025', customerId: 'RES-2026-0004', receiptNo: '117669', invoiceNo: 'INV-2026-1022', invoiceNos: ['INV-2026-1022'], paymentDate: '12-08-2026', date: '12-08-2026 11:25:00', mode: 'Online', total: 1499, paid: 1499, status: 'Complete', orderNo: 'TXN117669', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0026', customerId: 'RES-2026-0010', receiptNo: '117670', invoiceNo: 'INV-2026-1023', invoiceNos: ['INV-2026-1023'], paymentDate: '20-08-2026', date: '20-08-2026 13:40:00', mode: 'Android App', total: 999, paid: 999, status: 'Complete', orderNo: 'APP117670', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0027', customerId: 'RES-2026-0020', receiptNo: '117671', invoiceNo: 'INV-2026-1024', invoiceNos: ['INV-2026-1024'], paymentDate: '22-08-2026', date: '22-08-2026 10:05:00', mode: 'Online', total: 1499, paid: 1499, status: 'Complete', orderNo: 'TXN117671', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0028', customerId: 'RES-2026-0017', receiptNo: '117672', invoiceNo: 'INV-2026-1025', invoiceNos: ['INV-2026-1025'], paymentDate: '12-08-2026', date: '12-08-2026 15:15:00', mode: 'Cheque', total: 3999, paid: 3999, status: 'Complete', orderNo: 'CHQ117672', chequeBCh: 0, addBy: 'Admin User', comment: 'P2P 100Mbps link' },

  // ── September 2026 (current month) ──
  { id: 'PAY-SEED-0029', customerId: 'RES-2026-0001', receiptNo: '117673', invoiceNo: 'INV-2026-1026', invoiceNos: ['INV-2026-1026'], paymentDate: '05-09-2026', date: '05-09-2026 10:00:00', mode: 'Cash', total: 999, paid: 999, status: 'Complete', orderNo: '—', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0030', customerId: 'RES-2026-0004', receiptNo: '117674', invoiceNo: 'INV-2026-1027', invoiceNos: ['INV-2026-1027'], paymentDate: '12-09-2026', date: '12-09-2026 11:20:00', mode: 'Online', total: 1499, paid: 1499, status: 'Complete', orderNo: 'TXN117674', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },

  // ── Today (2026-09-20) — populates the "Today's Collection" stat card
  // and Today's Collections widget with realistic entries. Sanjay Verma
  // (RES-2026-0013) and Farida Sheikh (ENT-2026-0003) are both due to
  // renew this month (see customersData.js) and are shown here renewing
  // early, on the day of the demo.
  { id: 'PAY-SEED-0031', customerId: 'RES-2026-0013', receiptNo: '117675', invoiceNo: 'INV-2026-1029', invoiceNos: ['INV-2026-1029'], paymentDate: '20-09-2026', date: '20-09-2026 09:40:15', mode: 'Online', total: 2999, paid: 2999, status: 'Complete', orderNo: 'TXN117675', chequeBCh: 0, addBy: 'Admin User', comment: 'Renewal payment' },
  { id: 'PAY-SEED-0032', customerId: 'ENT-2026-0003', receiptNo: '117676', invoiceNo: 'INV-2026-1028', invoiceNos: ['INV-2026-1028'], paymentDate: '20-09-2026', date: '20-09-2026 11:05:40', mode: 'Cheque', total: 19999, paid: 19999, status: 'Complete', orderNo: 'CHQ117676', chequeBCh: 0, addBy: 'Admin User', comment: 'Renewal payment' },
  { id: 'PAY-SEED-0033', customerId: 'RES-2026-0021', receiptNo: '117677', invoiceNo: 'INV-2026-1030', invoiceNos: ['INV-2026-1030'], paymentDate: '20-09-2026', date: '20-09-2026 13:25:00', mode: 'Android App', total: 4999, paid: 4999, status: 'Complete', orderNo: 'APP117677', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
  { id: 'PAY-SEED-0034', customerId: 'RES-2026-0029', receiptNo: '117678', invoiceNo: 'INV-2026-1031', invoiceNos: ['INV-2026-1031'], paymentDate: '20-09-2026', date: '20-09-2026 15:50:30', mode: 'Cash', total: 2999, paid: 2999, status: 'Complete', orderNo: '—', chequeBCh: 0, addBy: 'Admin User', comment: 'Complete' },
]

let _payments = [...SEED_PAYMENTS]
const _listeners = []

function notify() { _listeners.forEach(fn => fn([..._payments])) }

export function getPayments() { return [..._payments] }

export function getPaymentsForCustomer(customerId) {
  return _payments.filter(p => p.customerId === customerId)
}

export function addPayment(payment) {
  _payments = [payment, ..._payments]
  notify()
  return payment
}

export function subscribePayments(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i > -1) _listeners.splice(i, 1)
  }
}

// Starts past MOCK_PAYMENTS' own highest seed receipt no. (117644) so a
// newly generated receipt never collides with an existing displayed row.
export function nextReceiptNo() {
  const nums = _payments.map(p => Number(p.receiptNo)).filter(Number.isFinite)
  const next = (nums.length ? Math.max(...nums) : 117644) + 1
  return String(next)
}

// Central payment path — allocates amount across oldest-outstanding invoices
// first (or specific invoiceNos when provided). Overpayment goes to customer
// creditBalance. Returns the created payment record.
export function recordPayment({
  customerId, amount, mode, invoiceNos, txnId, date, notes, source, status,
}) {
  const amountPaid = Number(amount) || 0
  const payStatus = status || 'Complete'

  // Only allocate when Complete (not Pending Verification)
  const applicableNos = []
  if (payStatus === 'Complete' && amountPaid > 0) {
    const allInvoices = getInvoices().filter(i => i.customerId === customerId && i.status !== 'paid')
    const targetInvoices = invoiceNos && invoiceNos.length > 0
      ? allInvoices.filter(i => invoiceNos.includes(i.no))
      : allInvoices.sort((a, b) => (a.issueDate || '').localeCompare(b.issueDate || ''))

    let remaining = amountPaid
    for (const inv of targetInvoices) {
      if (remaining <= 0) break
      const alreadyPaid = inv.amountPaid || 0
      const invTotal = inv.totalAmount || inv.amount || 0
      const stillDue = invTotal - alreadyPaid
      if (stillDue <= 0) continue
      const applying = Math.min(remaining, stillDue)
      const newPaid = alreadyPaid + applying
      const newStatus = newPaid >= invTotal ? 'paid' : 'partially_paid'
      updateInvoice(inv.no, { amountPaid: newPaid, status: newStatus })
      remaining -= applying
      applicableNos.push(inv.no)
    }

    if (remaining > 0) {
      const customer = getCustomer(customerId)
      const current = customer?.creditBalance || 0
      updateCustomer(customerId, { creditBalance: current + remaining })
    }
  }

  const now = new Date()
  const dateOnly = date || now.toLocaleDateString('en-GB').split('/').join('-')
  const timeStr = now.toLocaleTimeString('en-GB')
  const payment = {
    id: `PAY-${Date.now()}`,
    customerId,
    receiptNo: nextReceiptNo(),
    invoiceNo: applicableNos.join(', ') || (invoiceNos ? invoiceNos.join(', ') : '—'),
    invoiceNos: applicableNos.length > 0 ? applicableNos : (invoiceNos || []),
    paymentDate: dateOnly,
    date: `${dateOnly} ${timeStr}`,
    mode: mode || 'Cash',
    total: amountPaid,
    paid: amountPaid,
    status: payStatus,
    orderNo: txnId || '—',
    chequeBCh: 0,
    addBy: 'Admin User',
    comment: notes || payStatus,
    source: source || 'manual',
  }
  addPayment(payment)
  return payment
}

export function verifyPayment(paymentId) {
  const payment = _payments.find(p => p.id === paymentId)
  if (!payment || payment.status !== 'Pending Verification') return null
  const updated = { ...payment, status: 'Complete' }
  _payments = _payments.map(p => p.id === paymentId ? updated : p)

  // Allocate now that it's verified
  const { customerId, total, invoiceNos: originalNos } = payment
  const allInvoices = getInvoices().filter(i => i.customerId === customerId && i.status !== 'paid')
  const targetInvoices = originalNos && originalNos.length > 0
    ? allInvoices.filter(i => originalNos.includes(i.no))
    : allInvoices.sort((a, b) => (a.issueDate || '').localeCompare(b.issueDate || ''))

  let remaining = total
  for (const inv of targetInvoices) {
    if (remaining <= 0) break
    const alreadyPaid = inv.amountPaid || 0
    const invTotal = inv.totalAmount || inv.amount || 0
    const stillDue = invTotal - alreadyPaid
    if (stillDue <= 0) continue
    const applying = Math.min(remaining, stillDue)
    const newPaid = alreadyPaid + applying
    updateInvoice(inv.no, { amountPaid: newPaid, status: newPaid >= invTotal ? 'paid' : 'partially_paid' })
    remaining -= applying
  }
  if (remaining > 0) {
    const customer = getCustomer(customerId)
    updateCustomer(customerId, { creditBalance: (customer?.creditBalance || 0) + remaining })
  }

  notify()
  return updated
}

export function rejectPayment(paymentId, reason) {
  _payments = _payments.map(p =>
    p.id === paymentId && p.status === 'Pending Verification'
      ? { ...p, status: 'Failed', rejectReason: reason || '' }
      : p
  )
  notify()
}

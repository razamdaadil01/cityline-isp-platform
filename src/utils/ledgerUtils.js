import { getInvoices } from '../data/invoicesStore'
import { getPaymentsForCustomer } from '../data/paymentsStore'

// Parse a date string (DD-MM-YYYY, YYYY-MM-DD, 'DD Mon YYYY') to a sortable ISO string.
function parseDate(str) {
  if (!str) return ''
  // 'DD-MM-YYYY HH:MM:SS' or 'DD-MM-YYYY'
  const ddmmyyyy = str.match(/^(\d{2})-(\d{2})-(\d{4})/)
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`
  // 'DD Mon YYYY'
  const ddmonyyyy = str.match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})/)
  if (ddmonyyyy) {
    const months = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' }
    const m = months[ddmonyyyy[2].slice(0,3)] ?? '01'
    return `${ddmonyyyy[3]}-${m}-${String(ddmonyyyy[1]).padStart(2,'0')}`
  }
  return str.slice(0, 10)
}

export function computeCustomerLedger(customerId) {
  const invoices = getInvoices().filter(i => i.customerId === customerId)
  const payments = getPaymentsForCustomer(customerId)

  const raw = []

  for (const inv of invoices) {
    const isoDate = inv.issueDate || parseDate(inv.date)
    raw.push({
      isoDate,
      date: inv.date || inv.issueDate,
      description: `Invoice #${inv.no}`,
      type: 'debit',
      amount: inv.totalAmount || inv.amount || 0,
      ref: inv.no,
    })
    // If credit was applied from customer credit balance when the invoice was added
    if (inv.creditApplied > 0) {
      raw.push({
        isoDate,
        date: inv.date || inv.issueDate,
        description: `Credit applied to ${inv.no}`,
        type: 'credit',
        amount: inv.creditApplied,
        ref: inv.no,
      })
    }
  }

  for (const pay of payments) {
    const isoDate = parseDate(pay.paymentDate || pay.date)
    raw.push({
      isoDate,
      date: pay.paymentDate || (pay.date ? pay.date.slice(0, 10) : ''),
      description: `Payment received — ${pay.mode}`,
      type: 'credit',
      amount: pay.paid ?? pay.amount ?? 0,
      ref: pay.id,
    })
  }

  // Sort oldest-first for running balance calculation
  raw.sort((a, b) => a.isoDate.localeCompare(b.isoDate))

  // Compute running balance (debit increases, credit decreases)
  let balance = 0
  const entries = raw.map(e => {
    balance = e.type === 'debit' ? balance + e.amount : balance - e.amount
    return { date: e.date, description: e.description, type: e.type, amount: e.amount, balance }
  })

  // Reverse to newest-first for display
  entries.reverse()

  const totalInvoiced = invoices.reduce((s, i) => s + (i.totalAmount || i.amount || 0), 0)
  const totalPaid = payments.reduce((s, p) => s + (p.paid ?? p.amount ?? 0), 0)
  const outstanding = invoices
    .filter(i => i.status !== 'paid')
    .reduce((s, i) => s + ((i.totalAmount || i.amount || 0) - (i.amountPaid || 0)), 0)

  return { entries, totalInvoiced, totalPaid, outstanding }
}

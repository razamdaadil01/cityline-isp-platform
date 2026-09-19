// Shared collection aggregation helper — used by Reports.jsx's Collection
// Report. Merges paymentsStore.js's real collected-per-month series (same
// computeRevenueByMonth() the Revenue Report uses) with invoicesStore.js's
// real pending invoices, grouped by each invoice's own issue month.
//
// invoicesStore.js is documented (see that file's own top-of-file comment)
// as "a single shared invoice list rather than genuinely per-customer
// data" — a known, pre-existing limitation, not something this aggregation
// can fix. It also has no due-date/overdue-by-days field, just an issue
// `date` and a paid/pending `status`, so "pending in month X" here means
// "invoices issued in month X that are still unpaid today", not "became
// overdue in month X".
import { computeRevenueByMonth } from './revenueStats'

const MONTH_ABBR_TO_INDEX = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

// invoicesStore.js's `date` is "DD Mon YYYY" (e.g. "01 Jun 2026") — parsed
// manually rather than via `new Date(str)` for the same reason
// revenueStats.js parses paymentDate manually: explicit field-by-field
// parsing can't silently misread an ambiguous format the way a locale-
// dependent Date constructor could.
function parseInvoiceMonth(dateStr) {
  const [day, mon, year] = (dateStr || '').split(' ')
  const monthIndex = MONTH_ABBR_TO_INDEX[mon]
  if (!day || monthIndex == null || !year) return null
  return { year, monthIndex }
}

export function computeCollectionByMonth(payments, invoices) {
  const collectedByMonth = computeRevenueByMonth(payments)
  const collectedByKey = new Map(collectedByMonth.map(m => [m.key, m]))

  const pendingByKey = new Map() // "YYYY-MM" -> pending total
  invoices.forEach(inv => {
    if (inv.status === 'paid') return
    const parsed = parseInvoiceMonth(inv.date)
    if (!parsed) return
    const key = `${parsed.year}-${String(parsed.monthIndex + 1).padStart(2, '0')}`
    pendingByKey.set(key, (pendingByKey.get(key) || 0) + (Number(inv.amount) || 0))
  })

  const allKeys = new Set([...collectedByKey.keys(), ...pendingByKey.keys()])
  return [...allKeys]
    .sort((a, b) => a.localeCompare(b))
    .map(key => {
      const [y, m] = key.split('-')
      const month = collectedByKey.get(key)?.month
        ?? new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short' })
      return {
        key,
        month,
        collected: collectedByKey.get(key)?.collected ?? 0,
        pending: pendingByKey.get(key) ?? 0,
      }
    })
}

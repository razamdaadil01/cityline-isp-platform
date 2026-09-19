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
import { monthKeyFromDMonYYYY, monthLabelFromKey } from './dateFormats'

export function computeCollectionByMonth(payments, invoices) {
  const collectedByMonth = computeRevenueByMonth(payments)
  const collectedByKey = new Map(collectedByMonth.map(m => [m.key, m]))

  const pendingByKey = new Map() // "YYYY-MM" -> pending total
  invoices.forEach(inv => {
    if (inv.status === 'paid') return
    const key = monthKeyFromDMonYYYY(inv.date)
    if (!key) return
    pendingByKey.set(key, (pendingByKey.get(key) || 0) + (Number(inv.amount) || 0))
  })

  const allKeys = new Set([...collectedByKey.keys(), ...pendingByKey.keys()])
  return [...allKeys]
    .sort((a, b) => a.localeCompare(b))
    .map(key => ({
      key,
      month: collectedByKey.get(key)?.month ?? monthLabelFromKey(key),
      collected: collectedByKey.get(key)?.collected ?? 0,
      pending: pendingByKey.get(key) ?? 0,
    }))
}

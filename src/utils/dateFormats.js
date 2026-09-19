// Shared parsing for this app's "DD Mon YYYY" display-date convention
// (e.g. "01 Jun 2026") — used wherever a store keeps a human-readable date
// string rather than an ISO one: invoicesStore.js's `date`,
// customersData.js's `createdOn`. Parsed manually rather than via
// `new Date(str)`, same reasoning revenueStats.js already documents for
// paymentDate: explicit field-by-field parsing can't silently misread an
// ambiguous format the way a locale-dependent Date constructor could.

export const MONTH_ABBR_TO_INDEX = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

export function parseDMonYYYY(dateStr) {
  const [day, mon, year] = (dateStr || '').split(' ')
  const monthIndex = MONTH_ABBR_TO_INDEX[mon]
  if (!day || monthIndex == null || !year) return null
  return { day, monthIndex, year }
}

// "YYYY-MM" grouping key — same shape revenueStats.js's computeRevenueByMonth
// uses for paymentDate, so a "DD Mon YYYY" field and a "DD-MM-YYYY" field can
// both feed the same month-bucket merge (see collectionStats.js/
// churnStats.js).
export function monthKeyFromDMonYYYY(dateStr) {
  const parsed = parseDMonYYYY(dateStr)
  if (!parsed) return null
  return `${parsed.year}-${String(parsed.monthIndex + 1).padStart(2, '0')}`
}

export function monthLabelFromKey(key) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}

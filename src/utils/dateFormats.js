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

// "YYYY-MM-DD" ISO — same day-precision format the Reports.jsx date-range
// picker's <input type="date"> values already come in, so a "DD Mon YYYY"
// field can be compared directly against dateFrom/dateTo with plain string
// comparison (ISO sorts lexicographically).
export function isoFromDMonYYYY(dateStr) {
  const parsed = parseDMonYYYY(dateStr)
  if (!parsed) return null
  return `${parsed.year}-${String(parsed.monthIndex + 1).padStart(2, '0')}-${parsed.day.padStart(2, '0')}`
}

// paymentsStore.js's paymentDate is "DD-MM-YYYY" (see revenueStats.js's own
// computeRevenueByMonth, which parses it the same field-by-field way) —
// same ISO output as isoFromDMonYYYY() above, for the same reason.
export function isoFromDMY(dateStr) {
  const [d, m, y] = (dateStr || '').split('-')
  if (!d || !m || !y) return null
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// Inclusive range check — a missing/unparseable date never matches (dates
// this app can't place on a timeline are excluded from a date-filtered
// view rather than silently counted as always-in-range). Either bound can
// be omitted to leave that side open.
export function isDateInRange(isoDate, fromISO, toISO) {
  if (!isoDate) return false
  if (fromISO && isoDate < fromISO) return false
  if (toISO && isoDate > toISO) return false
  return true
}

// Same inclusive check, one level coarser — for a "YYYY-MM" month-bucket
// key (revenueStats.js/collectionStats.js/churnStats.js's own output
// shape) against a day-precision date range, comparing only the "YYYY-MM"
// slice of each bound so a range that starts/ends mid-month still includes
// that whole month.
export function isMonthKeyInRange(key, fromISO, toISO) {
  if (!key) return false
  if (fromISO && key < fromISO.slice(0, 7)) return false
  if (toISO && key > toISO.slice(0, 7)) return false
  return true
}

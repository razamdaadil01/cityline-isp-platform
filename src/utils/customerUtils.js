// Computes a plan expiry date from a start date and an optional package object.
// Uses the package's `validity` field (in days) if present, otherwise defaults
// to 30 days. Used by leadConversion.js and AddCustomer.jsx so both customer-
// creation paths produce an expiry without duplicating the fallback logic.
// Batch 3 will move expiry start to activation date.
export function computeExpiry(startDate, pkg) {
  const days = Number(pkg?.validity) || 30
  const base = startDate ? new Date(startDate) : new Date()
  const d = isNaN(base.getTime()) ? new Date() : new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

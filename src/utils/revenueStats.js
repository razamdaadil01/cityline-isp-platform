// Shared revenue aggregation helpers — used by both Dashboard.jsx's Revenue
// Overview widget and Reports.jsx's Revenue Report, so the two pages read
// real paymentsStore.js records through the exact same logic and can never
// disagree with each other.

import { effectiveStatus } from '../data/customersData'

// Groups real payments by calendar month (parsed from paymentDate's own
// "DD-MM-YYYY", same format AddPayment.jsx writes), summing paid/total per
// month. Returns only months that actually have at least one real payment,
// sorted chronologically — paymentsStore.js starts empty each session, so
// this is often mostly (or entirely) empty until AddPayment.jsx records are
// made. There's no real "Target"/expenses/profit figure anywhere in this
// app (no monthly-goal or cost store exists), so this only ever returns the
// one real collected-revenue series.
export function computeRevenueByMonth(payments) {
  const totals = new Map() // "YYYY-MM" -> collected total
  payments.forEach(p => {
    const [d, m, y] = (p.paymentDate || '').split('-')
    if (!d || !m || !y) return
    const key = `${y}-${m}`
    totals.set(key, (totals.get(key) || 0) + (Number(p.paid ?? p.total) || 0))
  })
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, collected]) => {
      const [y, m] = key.split('-')
      const month = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short' })
      return { key, month, collected }
    })
}

// Real per-plan revenue join — customersData.js's `plan` is a free-text
// string with no foreign key into packagesStore.js (packages there are
// named e.g. "Sonic 100", customer plans "FTTH 100Mbps" — no shared key),
// so this groups directly by that raw string rather than a package id.
// paymentsStore.js has no plan-at-time-of-payment snapshot, so every real
// payment a customer ever made is attributed to whatever plan they're
// currently on. "Active Customers" per plan counts only customers with an
// effectively active connection (effectiveStatus === 'active'), matching
// Dashboard.jsx's own definition of "active" — a plan can therefore show
// real revenue with 0 currently-active customers (e.g. everyone on it has
// since churned), or active customers with 0 revenue (no payments recorded
// yet), and both are surfaced rather than hidden.
export function computeRevenueByPlan(customers, payments) {
  const planOf = new Map(customers.map(c => [c.id, c.plan || 'Unknown']))
  const rows = new Map() // plan -> { customers, revenue }
  const ensure = plan => {
    if (!rows.has(plan)) rows.set(plan, { customers: 0, revenue: 0 })
    return rows.get(plan)
  }
  customers.forEach(c => {
    if (effectiveStatus(c) !== 'active') return
    ensure(c.plan || 'Unknown').customers++
  })
  payments.forEach(p => {
    const plan = planOf.get(p.customerId)
    if (!plan) return
    ensure(plan).revenue += Number(p.paid ?? p.total) || 0
  })
  const totalRevenue = [...rows.values()].reduce((sum, r) => sum + r.revenue, 0)
  return [...rows.entries()]
    .map(([plan, r]) => ({
      plan,
      customers: r.customers,
      revenue: r.revenue,
      pct: totalRevenue === 0 ? 0 : (r.revenue / totalRevenue) * 100,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

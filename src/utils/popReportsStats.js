// Pure compute functions for the POP Management "Reports" page
// (src/pages/POPReports.jsx) — same page-agnostic-aggregation-over-real-
// data separation as revenueStats.js/inventoryStats.js/collectionStats.js/
// churnStats.js: every function here takes real workOrderStore.js/
// popStore.js/productStore.js/userStore.js data plus a date range and
// returns plain data, no React/JSX. The page's own live-subscribed hooks
// (useWorkOrdersLive() etc.) feed these, the same way Reports.jsx's detail
// views feed its own computeXStats() helpers.

import { isDateInRange } from './dateFormats'
import { CLOSED_WORK_ORDER_STATUSES } from '../data/workOrderStore'

// workOrderStore.js's createdAt/assignedAt/resolvedAt/slaDate are full ISO
// timestamps (new Date().toISOString()), not the "DD Mon YYYY"/"DD-MM-YYYY"
// display strings dateFormats.js's isoFromXXX() parsers exist for — already
// lexicographically comparable against the date-range picker's date-only
// "YYYY-MM-DD" bounds via isDateInRange(), once sliced down to the date.
function dateOnly(iso) {
  return iso ? iso.slice(0, 10) : null
}
function monthKey(iso) {
  return iso ? iso.slice(0, 7) : null
}
function avg(nums) {
  return nums.length === 0 ? 0 : nums.reduce((s, n) => s + n, 0) / nums.length
}
function round1(n) {
  return Math.round(n * 10) / 10
}

// The PRD's Work Order TAT report names only "Cleaning vs Maintenance" —
// this store's own two non-Cleaning categories (Preventive Maintenance,
// Breakdown-Fault) are both maintenance-shaped work, so they're merged into
// one "Maintenance" bucket here rather than surfacing a third category the
// PRD never asked for.
const MAINTENANCE_CATEGORIES = ['Preventive Maintenance', 'Breakdown-Fault']

// ── 1. Work Order TAT (Turnaround Time) ────────────────────────────────
// Average resolution time (timeTaken, hours — stamped by workOrderStore.js's
// saveWorkOrder() the moment a Work Order first reaches 'Resolved', from
// assignedAt to that moment) broken down by category and priority. Scoped
// to Work Orders resolved within the selected range (filtered on
// resolvedAt, not createdAt — a TAT report is about when resolutions
// happened) with a real timeTaken; a still-open Work Order has no
// resolution time to average in yet.
export function computeWorkOrderTAT(workOrders, from, to) {
  const resolved = workOrders.filter(
    wo => wo.resolvedAt && wo.timeTaken != null && isDateInRange(dateOnly(wo.resolvedAt), from, to)
  )

  const byCategory = ['Cleaning', 'Maintenance'].map(bucket => {
    const rows = bucket === 'Cleaning'
      ? resolved.filter(wo => wo.category === 'Cleaning')
      : resolved.filter(wo => MAINTENANCE_CATEGORIES.includes(wo.category))
    return { category: bucket, count: rows.length, avgHours: round1(avg(rows.map(w => w.timeTaken))) }
  })

  const byPriority = ['Critical', 'High', 'Medium', 'Low'].map(priority => {
    const rows = resolved.filter(wo => wo.priority === priority)
    return { priority, count: rows.length, avgHours: round1(avg(rows.map(w => w.timeTaken))) }
  })

  return {
    byCategory,
    byPriority,
    totalResolved: resolved.length,
    overallAvgHours: round1(avg(resolved.map(w => w.timeTaken))),
    cleaningAvgHours: byCategory.find(c => c.category === 'Cleaning')?.avgHours ?? 0,
    maintenanceAvgHours: byCategory.find(c => c.category === 'Maintenance')?.avgHours ?? 0,
  }
}

// ── 2. Technician performance ───────────────────────────────────────────
// Per technician (userStore.js's real role==='engineer' users, via
// technicianHelpers.js's getAllTechnicians() — passed in already filtered):
// count of Work Orders closed, average resolution time, and SLA adherence
// rate (resolvedAt at-or-before slaDate). Scoped to Resolved/Closed Work
// Orders resolved within the selected range and assigned to that
// technician — a technician can appear in more than one Work Order's
// assignedTechnicianIds (multi-tech jobs), so each Work Order counts once
// per assigned technician rather than being split.
export function computeTechnicianPerformance(workOrders, technicians, from, to) {
  return technicians.map(tech => {
    const rows = workOrders.filter(wo =>
      wo.assignedTechnicianIds?.includes(tech.id)
      && CLOSED_WORK_ORDER_STATUSES.includes(wo.status)
      && wo.resolvedAt
      && isDateInRange(dateOnly(wo.resolvedAt), from, to)
    )
    const closedCount = rows.length
    const withinSlaCount = rows.filter(
      wo => wo.slaDate && new Date(wo.resolvedAt).getTime() <= new Date(wo.slaDate).getTime()
    ).length
    return {
      technicianId: tech.id,
      technicianName: tech.name,
      closedCount,
      avgResolutionHours: round1(avg(rows.map(w => w.timeTaken ?? 0))),
      slaAdherenceRate: closedCount === 0 ? 0 : round1((withinSlaCount / closedCount) * 100),
    }
  })
}

// ── 3. POP-wise downtime ─────────────────────────────────────────────────
// Downtime proxy (per the task's own suggested approach): total time each
// POP spent with an open Critical/High-priority fault Work Order —
// Breakdown-Fault category specifically, since Cleaning/Preventive
// Maintenance aren't outage-causing by definition. Summed from a Work
// Order's createdAt (when the fault was raised) to its resolvedAt (when
// service was restored), or to "now" for one still open — an unresolved
// Critical/High fault is still actively degrading that POP's uptime.
// Scoped to incidents that started (createdAt) within the selected range.
export function computePOPDowntime(workOrders, pops, from, to) {
  const now = Date.now()
  return pops.map(pop => {
    const rows = workOrders.filter(wo =>
      wo.popId === pop.id
      && wo.category === 'Breakdown-Fault'
      && (wo.priority === 'Critical' || wo.priority === 'High')
      && isDateInRange(dateOnly(wo.createdAt), from, to)
    )
    const downtimeHours = rows.reduce((sum, wo) => {
      const start = new Date(wo.createdAt).getTime()
      const end = wo.resolvedAt ? new Date(wo.resolvedAt).getTime() : now
      return sum + (end - start) / 3600000
    }, 0)
    return {
      popId: pop.id,
      popName: pop.name,
      incidentCount: rows.length,
      downtimeHours: round1(downtimeHours),
      openIncidentCount: rows.filter(wo => !CLOSED_WORK_ORDER_STATUSES.includes(wo.status)).length,
    }
  }).sort((a, b) => b.downtimeHours - a.downtimeHours)
}

// ── 4. Cleaning compliance % ────────────────────────────────────────────
// % of Cleaning Work Orders resolved on-time (resolvedAt at-or-before
// slaDate) vs delayed, per POP and overall. Scoped to Resolved/Closed
// Cleaning Work Orders resolved within the selected range — an open
// Cleaning Work Order hasn't missed or met its deadline yet, so it's
// excluded rather than counted as either.
export function computeCleaningCompliance(workOrders, pops, from, to) {
  const closedCleaning = workOrders.filter(wo =>
    wo.category === 'Cleaning'
    && CLOSED_WORK_ORDER_STATUSES.includes(wo.status)
    && wo.resolvedAt
    && isDateInRange(dateOnly(wo.resolvedAt), from, to)
  )
  const isOnTime = wo => wo.slaDate && new Date(wo.resolvedAt).getTime() <= new Date(wo.slaDate).getTime()

  const byPOP = pops.map(pop => {
    const rows = closedCleaning.filter(wo => wo.popId === pop.id)
    const onTime = rows.filter(isOnTime).length
    return {
      popId: pop.id,
      popName: pop.name,
      total: rows.length,
      onTime,
      delayed: rows.length - onTime,
      compliancePct: rows.length === 0 ? 0 : round1((onTime / rows.length) * 100),
    }
  })

  const overallOnTime = closedCleaning.filter(isOnTime).length
  return {
    byPOP,
    overall: {
      total: closedCleaning.length,
      onTime: overallOnTime,
      delayed: closedCleaning.length - overallOnTime,
      compliancePct: closedCleaning.length === 0 ? 0 : round1((overallOnTime / closedCleaning.length) * 100),
    },
  }
}

// ── 5. Inventory consumption / cost ─────────────────────────────────────
// Total hardware consumed and its cost, per POP and per month. Sourced
// from hardwareUsed (confirmed actual quantities, not the originally-
// requested hardwareNeed) on Work Orders where hardwareDeducted is true —
// the same real-deduction flag workOrderStore.js's saveWorkOrder() sets
// only once central Inventory stock has actually been reduced via a real
// Assignment record (see that file's own deductHardwareUsed() comment), so
// this report never counts hardware that was merely requested/planned.
// Costed at each product's purchasePrice (productStore.js) — a "cost"
// report reflects what this hardware cost the company to acquire, not what
// it would sell for. Dated by resolvedAt (when the deduction actually
// fired), for both the date-range filter and the per-month breakdown.
export function computeInventoryConsumption(workOrders, pops, products, from, to) {
  const productById = Object.fromEntries(products.map(p => [p.id, p]))
  const relevant = workOrders.filter(wo =>
    wo.hardwareDeducted
    && wo.resolvedAt
    && isDateInRange(dateOnly(wo.resolvedAt), from, to)
    && (wo.hardwareUsed ?? []).length > 0
  )

  const byPOPMap = new Map()
  const byMonthMap = new Map()
  let totalQuantity = 0
  let totalCost = 0

  relevant.forEach(wo => {
    const pop = pops.find(p => p.id === wo.popId)
    const mKey = monthKey(wo.resolvedAt)
    ;(wo.hardwareUsed ?? []).forEach(line => {
      const qty = Number(line.quantity) || 0
      if (qty <= 0) return
      const cost = qty * (productById[line.productId]?.purchasePrice ?? 0)
      totalQuantity += qty
      totalCost += cost

      const popRow = byPOPMap.get(wo.popId) ?? { popId: wo.popId, popName: pop?.name ?? wo.popId, quantity: 0, cost: 0 }
      popRow.quantity += qty
      popRow.cost += cost
      byPOPMap.set(wo.popId, popRow)

      const monthRow = byMonthMap.get(mKey) ?? { month: mKey, quantity: 0, cost: 0 }
      monthRow.quantity += qty
      monthRow.cost += cost
      byMonthMap.set(mKey, monthRow)
    })
  })

  return {
    byPOP: [...byPOPMap.values()].sort((a, b) => b.cost - a.cost),
    byMonth: [...byMonthMap.values()].sort((a, b) => a.month.localeCompare(b.month)),
    totalQuantity,
    totalCost: Math.round(totalCost),
  }
}

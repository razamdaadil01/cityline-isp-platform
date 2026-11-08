import { useState } from 'react'
import { LayoutGrid, List, Download, FileBarChart, Lock, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useMicroPermission } from '../data/rolesStore'
import { exportCsv } from '../utils/csvExport'

// Real data sources — every report card below reads straight from these,
// the same stores/aggregations every other real (non-Reports) page in this
// app already uses. Nothing here is fabricated: a report whose only real
// backing data is thin (e.g. Churn, Hardware Recovery) exports exactly
// that thin real data rather than inventing rows to fill it out — see each
// builder function's own comment for specifics.
import { getPayments } from '../data/paymentsStore'
import { normalizeMode } from '../data/paymentModes'
import { getInvoices, getOutstandingInvoicesAll, getCreditNotes } from '../data/invoicesStore'
import { computeRevenueByMonth, computeRevenueByPlan } from '../utils/revenueStats'
import { computeCollectionByMonth } from '../utils/collectionStats'
import { getAllCustomers, effectiveStatus } from '../data/customersData'
import { computeChurnByMonth } from '../utils/churnStats'
import {
  getTickets, CLOSED_STATUSES, slaStatusOf, technicianWorkload,
} from '../data/ticketsStore'
import { getOutages } from '../data/outagesStore'
import { getProducts } from '../data/productStore'
import { computeInventoryByCategory, formatAvailableQty } from '../utils/inventoryStats'
import { getPurchaseOrders, computePoSummary, getPoStatusLabel } from '../data/purchaseOrderStore'
import { getVendor } from '../data/vendorStore'
import { getRecoveries } from '../data/customerRecoveryStore'
import { getLeads } from '../data/leadsStore'
import { getFeasibilityRequests } from '../data/feasibilityStore'
import { getPOPs } from '../data/popStore'
import { getWorkOrders } from '../data/workOrderStore'
import { computeWorkOrderTAT, computeCleaningCompliance } from '../utils/popReportsStats'
import { getPartners } from '../data/partners'
import { computePartnerCollection } from '../utils/partnerStoreStats'
import { getAllTechnicians } from '../data/technicianHelpers'
import { getInstallations } from '../data/installationsStore'
import { getAssignments } from '../data/assignmentStore'

// ── Row builders ─────────────────────────────────────────────────────────────
// One pure function per report card, called only when its Download button is
// clicked — each re-reads the real store(s) fresh at that moment (not a
// stale snapshot) and returns the plain row-object array exportCsv() turns
// into a CSV. Grouped in the same order as REPORT_LIBRARY below.

// Same "still being actively worked" status sets TechnicianDashboard.jsx's
// own techStats uses, duplicated here rather than imported since that page
// keeps them as page-local constants, not a shared export.
const ACTIVE_INSTALL_STATUSES = [
  'Scheduled', 'Assigned', 'Hardware Collection Pending', 'Dispatched', 'In Progress', 'Rescheduled',
]
const ACTIVE_RECOVERY_STATUSES = ['pending', 'inprogress']

function buildRevenueSummaryRows() {
  return computeRevenueByMonth(getPayments()).map(m => ({
    Month: m.month, 'Collected Revenue (₹)': m.collected,
  }))
}

function buildCollectionReportRows() {
  return computeCollectionByMonth(getPayments(), getInvoices()).map(m => ({
    Month: m.month, 'Collected (₹)': m.collected, 'Pending (₹)': m.pending,
  }))
}

function overdueAgeing(dueDate) {
  if (!dueDate) return { days: 0, bucket: '0–30 days' }
  const due = new Date(dueDate)
  const today = new Date()
  const days = Math.max(0, Math.floor((today - due) / 86400000))
  const bucket = days <= 30 ? '0–30 days' : days <= 60 ? '31–60 days' : days <= 90 ? '61–90 days' : '90+ days'
  return { days, bucket }
}

function buildOverdueReportRows() {
  const customers = getAllCustomers()
  const custMap = new Map(customers.map(c => [c.id, c]))
  return getOutstandingInvoicesAll().map(inv => {
    const cust = custMap.get(inv.customerId)
    const { days, bucket } = overdueAgeing(inv.dueDate)
    return {
      'Invoice No.': inv.no,
      'Customer ID': inv.customerId,
      'Customer Name': cust?.name ?? '—',
      Phone: cust?.phone ?? '—',
      Area: cust?.area ?? '—',
      'Sales Executive': cust?.sales?.executive ?? '—',
      Package: inv.pkg,
      'Issue Date': inv.date,
      'Due Date': inv.dueDate ?? '—',
      'Days Overdue': days,
      'Ageing Bucket': bucket,
      'Amount (₹)': inv.amount,
      Status: inv.status,
    }
  })
}

function buildOverdueViewData() {
  const customers = getAllCustomers()
  const custMap = new Map(customers.map(c => [c.id, c]))
  const BUCKETS = ['0–30 days', '31–60 days', '61–90 days', '90+ days']
  const rows = getOutstandingInvoicesAll().map(inv => {
    const cust = custMap.get(inv.customerId)
    const { days, bucket } = overdueAgeing(inv.dueDate)
    return { inv, cust, days, bucket }
  })
  const bucketTotals = BUCKETS.map(b => ({
    bucket: b,
    count: rows.filter(r => r.bucket === b).length,
    total: rows.filter(r => r.bucket === b).reduce((s, r) => s + r.inv.amount, 0),
  }))
  return { rows, bucketTotals, BUCKETS }
}

function buildPlanWiseRevenueRows() {
  return computeRevenueByPlan(getAllCustomers(), getPayments()).map(r => ({
    Plan: r.plan, 'Active Customers': r.customers, 'Revenue (₹)': r.revenue,
    'Share %': Number(r.pct.toFixed(1)),
  }))
}

function buildPaymentHistoryRows() {
  return getPayments().map(p => ({
    'Receipt No.': p.receiptNo, 'Customer ID': p.customerId, Date: p.paymentDate,
    Mode: p.mode, 'Amount (₹)': p.paid ?? p.total, Status: p.status,
  }))
}

function buildCustomerStatusRows() {
  return getAllCustomers().map(c => ({
    'Customer ID': c.id, Name: c.name, Status: effectiveStatus(c),
    Plan: c.plan ?? '—', Radius: c.zone ?? '—',
  }))
}

// Reuses computeChurnByMonth()'s own real newJoins-per-month series (driven
// by customersData.js's real createdOn) rather than re-deriving it.
function buildNewCustomerAcquisitionRows() {
  return computeChurnByMonth(getAllCustomers()).map(m => ({
    Month: m.month, 'New Customers': m.newJoins,
  }))
}

// "Churned" here only counts customers whose status was actually changed to
// Disconnected during a live session (see churnStats.js's own comment) — on
// a fresh session this is often 0, which is the real number, not a bug.
function buildChurnReportRows() {
  return computeChurnByMonth(getAllCustomers()).map(m => ({
    Month: m.month, 'New Joins': m.newJoins, Churned: m.churned, 'At Risk': m.atRisk, Net: m.net,
  }))
}

function buildCafComplianceRows() {
  return getAllCustomers().map(c => ({
    'Customer ID': c.id, Name: c.name, 'CAF Status': c.cafStatus ?? 'Pending',
  }))
}

function buildRenewalExpiryRows() {
  const todayISO = new Date().toISOString().slice(0, 10)
  const monthEndISO = new Date(Date.now() + 29 * 86400000).toISOString().slice(0, 10)
  return getAllCustomers()
    .filter(c => c.expiry && c.expiry >= todayISO && c.expiry <= monthEndISO)
    .map(c => ({
      'Customer ID': c.id, Name: c.name, Plan: c.plan ?? '—', 'Expiry Date': c.expiry,
      'Days Until Expiry': Math.round((new Date(c.expiry) - new Date(todayISO)) / 86400000),
    }))
    .sort((a, b) => a['Days Until Expiry'] - b['Days Until Expiry'])
}

function buildZoneWiseCustomerRows() {
  const counts = new Map()
  getAllCustomers().forEach(c => {
    const key = `${c.zone ?? 'Unknown'}|${c.area ?? 'Unknown'}`
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  return [...counts.entries()]
    .map(([key, count]) => {
      const [Radius, Area] = key.split('|')
      return { Radius, Area, 'Customer Count': count }
    })
    .sort((a, b) => b['Customer Count'] - a['Customer Count'])
}

// Mirrors TechnicianDashboard.jsx's own techStats computation (active
// installs + active hardware recoveries + open tickets + current hardware
// holdings, all per real technician) — that page keeps its version as
// local component state rather than an exported function, so this is the
// same logic against the same real stores, not a separate invented metric.
function buildTechnicianWorkloadRows() {
  const technicians = getAllTechnicians()
  const installations = getInstallations()
  const recoveries = getRecoveries()
  const assignments = getAssignments()
  return technicians.map(tech => {
    const activeInstalls = installations.filter(inst => {
      const names = (inst.engineerName || '').split(',').map(s => s.trim())
      return names.includes(tech.name) && ACTIVE_INSTALL_STATUSES.includes(inst.status)
    }).length
    const activeRecoveries = recoveries.filter(
      r => r.technician === tech.name && ACTIVE_RECOVERY_STATUSES.includes(r.status)
    ).length
    const holdings = assignments.filter(a => a.status !== 'Returned' && a.engineerName === tech.name)
    const holdingsCount = holdings.reduce(
      (sum, a) => sum + (a.hardwareLines?.length ?? 0) + (a.wireLines?.length ?? 0), 0
    )
    return {
      Technician: tech.name, Radius: tech.zone ?? '—',
      'Active Jobs': activeInstalls + activeRecoveries,
      'Open Tickets': technicianWorkload(tech.name),
      'Hardware Holdings': holdingsCount,
    }
  })
}

// Real per-technician ticket close rate/resolution-time/SLA adherence —
// computed from ticketsStore.js's own resolution.resolvedAt/slaDeadline,
// the same fields slaStatusOf() itself reads.
function buildTechnicianPerformanceRows() {
  const technicians = getAllTechnicians()
  const tickets = getTickets()
  return technicians.map(tech => {
    const closed = tickets.filter(t => t.assignedTechnician === tech.name && CLOSED_STATUSES.includes(t.status))
    const withResolution = closed.filter(t => t.resolution?.resolvedAt)
    const avgHours = withResolution.length === 0 ? 0 : Math.round(
      (withResolution.reduce((sum, t) => sum + (new Date(t.resolution.resolvedAt) - new Date(t.createdAt)) / 3600000, 0)
        / withResolution.length) * 10
    ) / 10
    const withinSla = withResolution.filter(
      t => t.slaDeadline && new Date(t.resolution.resolvedAt) <= new Date(t.slaDeadline)
    ).length
    const slaRate = withResolution.length === 0 ? 0 : Math.round((withinSla / withResolution.length) * 1000) / 10
    return {
      Technician: tech.name, 'Tickets Closed': closed.length,
      'Avg Resolution (hrs)': avgHours, 'SLA Adherence %': slaRate,
    }
  })
}

function buildInstallationCompletionRows() {
  return getInstallations().map(inst => ({
    'Installation ID': inst.id, Customer: inst.customerName ?? '—',
    Engineer: inst.engineerName ?? '—', Status: inst.status, 'Created Date': inst.createdAt,
  }))
}

function buildHardwareAssignedRows() {
  const rows = []
  getAssignments().filter(a => a.status !== 'Returned').forEach(a => {
    ;(a.hardwareLines ?? []).forEach(l => rows.push({
      Technician: a.engineerName, Item: l.productName, Quantity: l.assignedQty, Type: 'Hardware',
    }))
    ;(a.wireLines ?? []).forEach(l => rows.push({
      Technician: a.engineerName, Item: l.productName, Quantity: l.assignedMeters, Type: 'Wire/Cable',
    }))
  })
  return rows
}

function buildTicketSummaryRows() {
  return getTickets().map(t => ({
    'Ticket ID': t.id, Customer: t.customerName, Priority: t.priority, Status: t.status,
    Category: t.category, 'Created At': t.createdAt,
  }))
}

function buildSlaBreachRows() {
  return getTickets()
    .filter(t => slaStatusOf(t) === 'Breached')
    .map(t => ({
      'Ticket ID': t.id, Customer: t.customerName, Priority: t.priority,
      'SLA Deadline': t.slaDeadline, Status: t.status,
    }))
}

function buildComplaintCategoryRows() {
  const counts = new Map()
  getTickets().forEach(t => {
    const key = `${t.category}|${t.subcategory}`
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  return [...counts.entries()]
    .map(([key, count]) => {
      const [Category, Subcategory] = key.split('|')
      return { Category, Subcategory, 'Ticket Count': count }
    })
    .sort((a, b) => b['Ticket Count'] - a['Ticket Count'])
}

function buildOutageReportRows() {
  return getOutages().map(o => ({
    'Outage ID': o.id, Title: o.title, Severity: o.severity, Status: o.status,
    'Start Time': o.startTime, 'Resolved At': o.resolution?.resolvedAt ?? '—',
  }))
}

function buildStockSummaryRows() {
  const rows = []
  computeInventoryByCategory(getProducts()).forEach(cat => {
    cat.products.forEach(({ product, availableQty }) => {
      rows.push({
        Category: cat.category, Product: product.name, SKU: product.sku || '—',
        'Available Qty': formatAvailableQty(product, availableQty),
      })
    })
  })
  return rows
}

function buildLowStockRows() {
  const rows = []
  computeInventoryByCategory(getProducts()).forEach(cat => {
    cat.products.forEach(({ product, availableQty, lowStock }) => {
      if (!lowStock) return
      rows.push({
        Category: cat.category, Product: product.name, SKU: product.sku || '—',
        'Available Qty': formatAvailableQty(product, availableQty),
        'Reorder Threshold': product.reorderAlertQty ?? 0,
      })
    })
  })
  return rows
}

function buildPurchaseOrderRows() {
  return getPurchaseOrders().map(po => ({
    'PO Number': po.poNumber, Vendor: getVendor(po.vendorId)?.companyName ?? po.vendorId,
    Status: getPoStatusLabel(po.status), 'Order Date': po.orderDate,
    'Total Amount (₹)': computePoSummary(po.items, {}).grandTotal,
  }))
}

// Internet-side hardware recovery (customerRecoveryStore.js) — recovery
// work orders for disconnecting customers, currently a single real seed
// record (see that store's own comment) rather than a large dataset.
function buildHardwareRecoveryRows() {
  return getRecoveries().map(r => ({
    'Recovery ID': r.id, Customer: r.customer, Reason: r.reason,
    Status: r.status, 'Scheduled Date': r.scheduledDate,
  }))
}

function buildLeadSummaryRows() {
  const counts = new Map()
  getLeads().forEach(l => {
    const key = `${l.pipeline}|${l.stage}`
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  return [...counts.entries()].map(([key, count]) => {
    const [Pipeline, Stage] = key.split('|')
    return { Pipeline, Stage, 'Lead Count': count }
  })
}

function buildLeadConversionRows() {
  const byExec = new Map()
  getLeads().forEach(l => {
    const exec = l.assigned || 'Unassigned'
    const row = byExec.get(exec) ?? { total: 0, won: 0 }
    row.total += 1
    if (l.stage === 'Won') row.won += 1
    byExec.set(exec, row)
  })
  return [...byExec.entries()]
    .map(([exec, r]) => ({
      'Sales Executive': exec, 'Total Leads': r.total, 'Converted (Won)': r.won,
      'Conversion Rate %': r.total === 0 ? 0 : Math.round((r.won / r.total) * 1000) / 10,
    }))
    .sort((a, b) => b['Conversion Rate %'] - a['Conversion Rate %'])
}

function buildFeasibilityRows() {
  return getFeasibilityRequests().map(r => ({
    'Request ID': r.id, Customer: r.customerName, Status: r.feasibilityStatus,
    Engineer: r.assignedEngineer || '—', 'Created Date': r.createdAt,
  }))
}

function buildPopInventoryRows() {
  const rows = []
  getPOPs().forEach(pop => {
    ;(pop.equipment ?? []).forEach(eq => rows.push({
      POP: pop.name, Equipment: eq.label, Category: eq.itemCategory,
      Condition: eq.condition, Status: eq.status, 'Serial Number': eq.serialNumber,
    }))
  })
  return rows
}

// Reuses POPReports.jsx's own computeWorkOrderTAT() — from/to left null
// (no range restriction) so the CSV covers every real resolved Work Order,
// not just whatever date window POPReports.jsx's own picker happened to be
// set to.
function buildWorkOrderTatRows() {
  const stats = computeWorkOrderTAT(getWorkOrders(), null, null)
  return [
    ...stats.byCategory.map(c => ({ Group: 'Category', Name: c.category, Count: c.count, 'Avg Hours': c.avgHours })),
    ...stats.byPriority.map(p => ({ Group: 'Priority', Name: p.priority, Count: p.count, 'Avg Hours': p.avgHours })),
  ]
}

function buildCleaningComplianceRows() {
  const stats = computeCleaningCompliance(getWorkOrders(), getPOPs(), null, null)
  return stats.byPOP.map(p => ({
    POP: p.popName, Total: p.total, 'On Time': p.onTime, Delayed: p.delayed, 'Compliance %': p.compliancePct,
  }))
}

// No real "pending" figure exists per partner (see partnerStoreStats.js's
// own comment — invoicesStore.js has no customerId to attribute a pending
// invoice to a partner with), so only the real, attributable collected
// amount/customer count/share are exported.
function buildPartnerCollectionRows() {
  return computePartnerCollection(getAllCustomers(), getPayments(), getPartners()).map(r => ({
    Partner: r.partnerName, Customers: r.customerCount, 'Collected (₹)': r.collected,
    'Share %': Number(r.pct.toFixed(1)),
  }))
}

// GST Summary helpers — B2B = customer has a gstNo; B2C = no GSTIN.
// Excludes cancelled invoices. `monthFilter` is 'YYYY-MM' or null (all months).
function gstInvoiceRows(monthFilter) {
  const customers = getAllCustomers()
  const custMap = new Map(customers.map(c => [c.id, c]))
  return getInvoices()
    .filter(inv => inv.status !== 'cancelled')
    .filter(inv => {
      if (!monthFilter) return true
      const iso = inv.issueDate || inv.date || ''
      return iso.startsWith(monthFilter)
    })
    .map(inv => {
      const cust = custMap.get(inv.customerId)
      const isB2B = !!(cust?.gstNo)
      return { inv, cust, isB2B }
    })
}

function buildGstSummaryRows(monthFilter) {
  const customers = getAllCustomers()
  const custMap = new Map(customers.map(c => [c.id, c]))
  const invoiceRows = gstInvoiceRows(monthFilter).map(({ inv, cust, isB2B }) => ({
    Type: isB2B ? 'B2B' : 'B2C',
    'Doc Type': 'Invoice',
    'Invoice No.': inv.no,
    'Invoice Date': inv.issueDate || inv.date,
    'Customer Name': cust?.name ?? inv.customerId,
    GSTIN: cust?.gstNo ?? '—',
    'Taxable Amount (₹)': inv.taxableAmount ?? 0,
    'CGST (₹)': inv.cgst ?? 0,
    'SGST (₹)': inv.sgst ?? 0,
    'IGST (₹)': inv.igst ?? 0,
    'Total (₹)': inv.totalAmount || inv.amount || 0,
    'HSN/SAC': (inv.lines?.[0]?.hsnSac) ?? '998422',
    Status: inv.status,
  }))
  const cnRows = getCreditNotes()
    .filter(cn => {
      if (!monthFilter) return true
      return (cn.issuedOn || '').startsWith(monthFilter)
    })
    .map(cn => {
      const cust = custMap.get(cn.customerId)
      const isB2B = !!(cust?.gstNo)
      return {
        Type: isB2B ? 'B2B' : 'B2C',
        'Doc Type': 'Credit Note',
        'Invoice No.': cn.no,
        'Invoice Date': cn.issuedOn,
        'Customer Name': cust?.name ?? cn.customerId,
        GSTIN: cust?.gstNo ?? '—',
        'Taxable Amount (₹)': -(cn.taxableAmount ?? 0),
        'CGST (₹)': -(cn.cgst ?? 0),
        'SGST (₹)': -(cn.sgst ?? 0),
        'IGST (₹)': -(cn.igst ?? 0),
        'Total (₹)': -(cn.amount || 0),
        'HSN/SAC': '998422',
        Status: cn.status,
      }
    })
  return [...invoiceRows, ...cnRows]
}

function buildGstViewData(monthFilter) {
  const customers = getAllCustomers()
  const custMap = new Map(customers.map(c => [c.id, c]))
  const rows = gstInvoiceRows(monthFilter)
  const b2b = rows.filter(r => r.isB2B)
  const b2c = rows.filter(r => !r.isB2B)
  const sum = (arr, key) => arr.reduce((s, r) => s + (r.inv[key] ?? 0), 0)

  // Credit note adjustments
  const cns = getCreditNotes().filter(cn => {
    if (!monthFilter) return true
    return (cn.issuedOn || '').startsWith(monthFilter)
  })
  const cnAdj = { taxable: 0, cgst: 0, sgst: 0, igst: 0, count: cns.length }
  cns.forEach(cn => {
    cnAdj.taxable += cn.taxableAmount ?? 0
    cnAdj.cgst += cn.cgst ?? 0
    cnAdj.sgst += cn.sgst ?? 0
    cnAdj.igst += cn.igst ?? 0
  })

  // HSN-wise summary across all rows minus credit notes
  const hsnMap = new Map()
  rows.forEach(({ inv }) => {
    ;(inv.lines || [{ hsnSac: inv.lines?.[0]?.hsnSac ?? '998422', amount: inv.taxableAmount ?? 0 }]).forEach(l => {
      const hsn = l.hsnSac || '998422'
      const ex = hsnMap.get(hsn) ?? { hsn, taxable: 0, cgst: 0, sgst: 0, igst: 0 }
      const lineFrac = inv.taxableAmount && inv.lines?.length > 1 ? (l.amount / (inv.taxableAmount || 1)) : 1
      ex.taxable += (inv.taxableAmount ?? 0) * lineFrac
      ex.cgst += (inv.cgst ?? 0) * lineFrac
      ex.sgst += (inv.sgst ?? 0) * lineFrac
      ex.igst += (inv.igst ?? 0) * lineFrac
      hsnMap.set(hsn, ex)
    })
  })
  // Subtract credit notes from HSN 998422 (all ISP services)
  if (cnAdj.count > 0) {
    const ex = hsnMap.get('998422') ?? { hsn: '998422', taxable: 0, cgst: 0, sgst: 0, igst: 0 }
    ex.taxable -= cnAdj.taxable
    ex.cgst -= cnAdj.cgst
    ex.sgst -= cnAdj.sgst
    ex.igst -= cnAdj.igst
    hsnMap.set('998422', ex)
  }

  return {
    b2bCount: b2b.length,
    b2cCount: b2c.length,
    b2bTaxable: sum(b2b, 'taxableAmount'),
    b2bCgst: sum(b2b, 'cgst'),
    b2bSgst: sum(b2b, 'sgst'),
    b2bIgst: sum(b2b, 'igst'),
    b2cTaxable: sum(b2c, 'taxableAmount'),
    b2cCgst: sum(b2c, 'cgst'),
    b2cSgst: sum(b2c, 'sgst'),
    b2cIgst: sum(b2c, 'igst'),
    cnAdj,
    hsnRows: [...hsnMap.values()],
    totalInvoices: rows.length,
  }
}

// Normalise a payment's date to 'YYYY-MM-DD' for comparison.
function payDateISO(p) {
  const raw = p.paymentDate || p.date || ''
  const s = String(raw).split(' ')[0]
  if (!s) return ''
  if (s.includes('-') && s.length === 10 && s.indexOf('-') === 2) {
    // DD-MM-YYYY
    const [d, m, y] = s.split('-')
    return `${y}-${m}-${d}`
  }
  return s // already YYYY-MM-DD or ISO
}

function buildDailyCashRows(dateFilter) {
  const payments = getPayments().filter(p => {
    if (p.status === 'Failed') return false
    if (dateFilter) return payDateISO(p) === dateFilter
    return true
  })
  return payments.map(p => ({
    Date: payDateISO(p), 'Receipt No.': p.receiptNo, 'Customer ID': p.customerId,
    Mode: normalizeMode(p.mode), Amount: p.paid ?? p.total ?? 0,
    'Recorded By': p.addBy ?? '—', Status: p.status,
  }))
}

function buildDailyCashViewData(dateFilter) {
  const payments = getPayments().filter(p => {
    if (p.status === 'Failed') return false
    if (dateFilter) return payDateISO(p) === dateFilter
    return true
  })
  const byMode = new Map()
  const byUser = new Map()
  payments.forEach(p => {
    const mode = normalizeMode(p.mode)
    const amt = p.paid ?? p.total ?? 0
    byMode.set(mode, (byMode.get(mode) ?? 0) + amt)
    const user = p.addBy ?? '—'
    byUser.set(user, (byUser.get(user) ?? 0) + amt)
  })
  const grandTotal = [...byMode.values()].reduce((s, v) => s + v, 0)
  return {
    byMode: [...byMode.entries()].map(([mode, total]) => ({ mode, total })).sort((a, b) => b.total - a.total),
    byUser: [...byUser.entries()].map(([user, total]) => ({ user, total })).sort((a, b) => b.total - a.total),
    count: payments.length,
    grandTotal,
  }
}

function buildEngineerCollectionRows() {
  const collectionPayments = getPayments().filter(p => p.source === 'collection')
  return collectionPayments.map(p => ({
    'Receipt No.': p.receiptNo, 'Customer ID': p.customerId, Date: payDateISO(p),
    'Collected By': p.addBy ?? '—', Mode: normalizeMode(p.mode),
    Amount: p.paid ?? p.total ?? 0, Status: p.status,
  }))
}

function buildEngineerCollectionViewData() {
  const today = new Date()
  const payments = getPayments().filter(p => p.source === 'collection')
  const byEngineer = new Map()
  payments.forEach(p => {
    const eng = p.addBy ?? '—'
    const existing = byEngineer.get(eng) ?? { engineer: eng, collected: 0, verified: 0, pending: 0, failed: 0, pendingItems: [] }
    const amt = p.paid ?? p.total ?? 0
    if (p.status === 'Complete') { existing.collected += amt; existing.verified += amt }
    else if (p.status === 'Pending Verification') {
      existing.collected += amt; existing.pending += amt
      const dateISO = payDateISO(p)
      const days = dateISO ? Math.floor((today - new Date(dateISO)) / 86400000) : 0
      existing.pendingItems.push({ receiptNo: p.receiptNo, days, amt })
    } else if (p.status === 'Failed') { existing.failed += amt }
    byEngineer.set(eng, existing)
  })
  return [...byEngineer.values()].sort((a, b) => b.collected - a.collected)
}

// ── Report library ────────────────────────────────────────────────────────
// One entry per card. `permKey` is the Reports micro-permission
// (rolesStore.js's MODULE_MICRO_PERMISSIONS.Reports) that gates whether the
// card renders at all; the download button additionally requires
// exportReportsToExcel, same as the export-permission split every other
// gated action in this app already uses. Section order/labels match the
// spec exactly.
const REPORT_LIBRARY = [
  {
    section: 'Revenue & Billing',
    reports: [
      { key: 'revenue-summary', title: 'Revenue Summary', description: 'Monthly revenue collected across all plans and services.', permKey: 'viewRevenueReport', filename: 'revenue_summary.csv', buildRows: buildRevenueSummaryRows },
      { key: 'collection-report', title: 'Collection Report', description: 'Collected vs. pending amounts with collection efficiency %.', permKey: 'viewCollectionReport', filename: 'collection_report.csv', buildRows: buildCollectionReportRows },
      { key: 'overdue-report', title: 'Overdue/Outstanding Report', description: 'Outstanding invoices with customer info, ageing buckets, and bucket totals.', permKey: 'viewCollectionReport', filename: 'overdue_outstanding_report.csv', buildRows: buildOverdueReportRows, buildViewData: buildOverdueViewData },
      { key: 'plan-wise-revenue', title: 'Plan-wise Revenue', description: 'Revenue breakdown by service plan (FTTH, FTTB, P2P, etc.).', permKey: 'viewRevenueReport', filename: 'plan_wise_revenue.csv', buildRows: buildPlanWiseRevenueRows },
      { key: 'payment-history', title: 'Payment History Report', description: 'Detailed log of all recorded payments.', permKey: 'viewRevenueReport', filename: 'payment_history_report.csv', buildRows: buildPaymentHistoryRows },
      { key: 'gst-summary', title: 'GST Summary (GSTR-1)', description: 'B2B/B2C split, taxable/CGST/SGST/IGST, HSN-wise summary. Excludes cancelled invoices. Month-filterable.', permKey: 'viewRevenueReport', filename: 'gst_summary_gstr1.csv', buildRows: () => buildGstSummaryRows(null), buildViewData: buildGstViewData },
      { key: 'daily-cash', title: 'Daily Cash Report', description: 'Payment totals by mode and by recorded-by user for a selected date.', permKey: 'viewCollectionReport', filename: 'daily_cash_report.csv', buildRows: () => buildDailyCashRows(null), buildViewData: buildDailyCashViewData },
      { key: 'engineer-collection', title: 'Engineer-wise Collection Report', description: 'Collected vs verified vs pending per field engineer, with ageing of pending items.', permKey: 'viewCollectionReport', filename: 'engineer_collection_report.csv', buildRows: buildEngineerCollectionRows, buildViewData: buildEngineerCollectionViewData },
    ],
  },
  {
    section: 'Customers',
    reports: [
      { key: 'customer-status', title: 'Active/Inactive Customer Report', description: 'Customer count and details by status (Active, Suspended, Expired, etc.).', permKey: 'viewCustomerReports', filename: 'active_inactive_customer_report.csv', buildRows: buildCustomerStatusRows },
      { key: 'new-customer-acquisition', title: 'New Customer Acquisition Report', description: 'New customers onboarded, by month.', permKey: 'viewCustomerReports', filename: 'new_customer_acquisition_report.csv', buildRows: buildNewCustomerAcquisitionRows },
      { key: 'customer-churn', title: 'Customer Churn Report', description: 'Customers disconnected/lost, with monthly trend.', permKey: 'viewChurnReport', filename: 'customer_churn_report.csv', buildRows: buildChurnReportRows },
      { key: 'caf-compliance', title: 'CAF Compliance Report', description: 'CAF submission/approval status across all customers.', permKey: 'viewCafComplianceReport', filename: 'caf_compliance_report.csv', buildRows: buildCafComplianceRows },
      { key: 'renewal-expiry', title: 'Renewal/Expiry Report', description: 'Customers due for plan renewal within the next 30 days.', permKey: 'viewCustomerReports', filename: 'renewal_expiry_report.csv', buildRows: buildRenewalExpiryRows },
      { key: 'zone-wise-customers', title: 'Area/Radius-wise Customer Report', description: 'Customer distribution across radius and localities.', permKey: 'viewCustomerReports', filename: 'area_zone_wise_customer_report.csv', buildRows: buildZoneWiseCustomerRows },
    ],
  },
  {
    section: 'Technicians & Installations',
    reports: [
      { key: 'technician-workload', title: 'Technician Workload Report', description: 'Active jobs, open tickets, and hardware holdings per technician.', permKey: 'viewTechnicianReports', filename: 'technician_workload_report.csv', buildRows: buildTechnicianWorkloadRows },
      { key: 'technician-performance', title: 'Technician Performance Report', description: 'Jobs closed, average resolution time, and SLA adherence per technician.', permKey: 'viewTechnicianPerformanceReport', filename: 'technician_performance_report.csv', buildRows: buildTechnicianPerformanceRows },
      { key: 'installation-completion', title: 'Installation Completion Report', description: 'Installations completed vs. pending.', permKey: 'viewTechnicianReports', filename: 'installation_completion_report.csv', buildRows: buildInstallationCompletionRows },
      { key: 'hardware-assigned', title: 'Hardware Assigned to Technician', description: 'Hardware currently held by each field engineer.', permKey: 'viewTechnicianReports', filename: 'hardware_assigned_to_technician.csv', buildRows: buildHardwareAssignedRows },
    ],
  },
  {
    section: 'Support & Tickets',
    reports: [
      { key: 'ticket-summary', title: 'Ticket Summary Report', description: 'Open, closed, and pending tickets with priority breakdown.', permKey: 'viewSupportReports', filename: 'ticket_summary_report.csv', buildRows: buildTicketSummaryRows },
      { key: 'sla-breach', title: 'SLA Breach Report', description: 'Tickets that missed their SLA deadline.', permKey: 'viewSupportReports', filename: 'sla_breach_report.csv', buildRows: buildSlaBreachRows },
      { key: 'complaint-category', title: 'Complaint Category-wise Report', description: 'Tickets grouped by complaint category/subcategory.', permKey: 'viewSupportReports', filename: 'complaint_category_wise_report.csv', buildRows: buildComplaintCategoryRows },
      { key: 'outage-report', title: 'Outage Report', description: 'Network outages logged, severity, and resolution time.', permKey: 'viewSupportReports', filename: 'outage_report.csv', buildRows: buildOutageReportRows },
    ],
  },
  {
    section: 'Inventory',
    reports: [
      { key: 'stock-summary', title: 'Stock Summary Report', description: 'Current stock levels by product category.', permKey: 'viewInventoryReport', filename: 'stock_summary_report.csv', buildRows: buildStockSummaryRows },
      { key: 'low-stock', title: 'Low Stock Report', description: 'Products below their reorder threshold.', permKey: 'viewInventoryReport', filename: 'low_stock_report.csv', buildRows: buildLowStockRows },
      { key: 'purchase-order', title: 'Purchase Order Report', description: 'POs raised, approved, and pending across vendors.', permKey: 'viewInventoryReport', filename: 'purchase_order_report.csv', buildRows: buildPurchaseOrderRows },
      { key: 'hardware-recovery', title: 'Hardware Recovery Report', description: 'Recovery status of hardware from disconnected customers.', permKey: 'viewInventoryReport', filename: 'hardware_recovery_report.csv', buildRows: buildHardwareRecoveryRows },
    ],
  },
  {
    section: 'Sales & Leads',
    reports: [
      { key: 'lead-summary', title: 'Lead Summary Report', description: 'Total leads by stage and pipeline (Residential/Enterprise).', permKey: 'viewSalesReports', filename: 'lead_summary_report.csv', buildRows: buildLeadSummaryRows },
      { key: 'lead-conversion', title: 'Lead Conversion Report', description: 'Conversion rate from lead to customer, by sales executive.', permKey: 'viewSalesReports', filename: 'lead_conversion_report.csv', buildRows: buildLeadConversionRows },
      { key: 'feasibility-report', title: 'Feasibility Report', description: 'Feasibility requests raised, approved, and rejected.', permKey: 'viewSalesReports', filename: 'feasibility_report.csv', buildRows: buildFeasibilityRows },
    ],
  },
  {
    section: 'Network / POP',
    reports: [
      { key: 'pop-inventory', title: 'POP Inventory Report', description: 'Equipment status and condition across all POPs.', permKey: 'viewInventoryConsumptionReport', filename: 'pop_inventory_report.csv', buildRows: buildPopInventoryRows },
      { key: 'work-order-tat', title: 'Work Order TAT Report', description: 'Average resolution time for POP work orders.', permKey: 'viewWorkOrderTATReport', filename: 'work_order_tat_report.csv', buildRows: buildWorkOrderTatRows },
      { key: 'cleaning-compliance', title: 'Cleaning Compliance Report', description: '% of cleaning work orders completed on time.', permKey: 'viewCleaningComplianceReport', filename: 'cleaning_compliance_report.csv', buildRows: buildCleaningComplianceRows },
    ],
  },
  {
    section: 'Resellers',
    reports: [
      { key: 'partner-collection', title: 'Partner-wise Collection Report', description: 'Revenue collected per reseller/partner.', permKey: 'viewPartnerStoreCollectionReport', filename: 'partner_wise_collection_report.csv', buildRows: buildPartnerCollectionRows },
    ],
  },
]

// ── UI ─────────────────────────────────────────────────────────────────────

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const BUCKET_COLORS = {
  '0–30 days': 'text-emerald-700 bg-emerald-50',
  '31–60 days': 'text-amber-700 bg-amber-50',
  '61–90 days': 'text-orange-700 bg-orange-50',
  '90+ days': 'text-red-700 bg-red-50',
}

function OverdueTableView() {
  const { rows, bucketTotals } = buildOverdueViewData()
  if (rows.length === 0) {
    return <p className="text-xs text-gray-400 italic py-2">No outstanding invoices.</p>
  }
  return (
    <div className="mt-3 space-y-3">
      {/* Bucket summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {bucketTotals.map(b => (
          <div key={b.bucket} className={`rounded-lg px-3 py-2 text-xs font-semibold ${BUCKET_COLORS[b.bucket]}`}>
            <div className="font-bold">{b.bucket}</div>
            <div>{b.count} invoice{b.count !== 1 ? 's' : ''}</div>
            <div>{fmt(b.total)}</div>
          </div>
        ))}
      </div>
      {/* Detail table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              {['Invoice', 'Customer', 'Area', 'Sales Exec', 'Due Date', 'Days', 'Bucket', 'Amount'].map(h => (
                <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ inv, cust, days, bucket }) => (
              <tr key={inv.no} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-1.5 pr-3 font-mono text-gray-700 whitespace-nowrap">{inv.no}</td>
                <td className="py-1.5 pr-3 whitespace-nowrap">
                  <div className="font-medium text-gray-800">{cust?.name ?? '—'}</div>
                  <div className="text-gray-400">{cust?.phone ?? inv.customerId}</div>
                </td>
                <td className="py-1.5 pr-3 text-gray-600 whitespace-nowrap">{cust?.area ?? '—'}</td>
                <td className="py-1.5 pr-3 text-gray-600 whitespace-nowrap">{cust?.sales?.executive ?? '—'}</td>
                <td className="py-1.5 pr-3 text-gray-600 whitespace-nowrap">{inv.dueDate ?? '—'}</td>
                <td className="py-1.5 pr-3 font-medium text-gray-800 whitespace-nowrap">{days}</td>
                <td className="py-1.5 pr-3 whitespace-nowrap">
                  <span className={`px-1.5 py-0.5 rounded font-semibold ${BUCKET_COLORS[bucket]}`}>{bucket}</span>
                </td>
                <td className="py-1.5 pr-3 font-semibold text-gray-900 whitespace-nowrap">{fmt(inv.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GstSummaryView({ onMonthChange }) {
  const [month, setMonth] = useState('')
  function handleMonth(e) {
    setMonth(e.target.value)
    onMonthChange?.(e.target.value || null)
  }
  const d = buildGstViewData(month || null)
  const fmtAmt = (n) => fmt(n)
  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Month</label>
        <input type="month" value={month} onChange={handleMonth}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-blue" />
        {month && <button onClick={() => { setMonth(''); onMonthChange?.(null) }} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>}
        <span className="ml-auto text-xs text-gray-400">{d.totalInvoices} invoice{d.totalInvoices !== 1 ? 's' : ''}
          {d.cnAdj?.count > 0 ? `, ${d.cnAdj.count} credit note${d.cnAdj.count !== 1 ? 's' : ''}` : ''} (excl. cancelled)</span>
      </div>

      {/* B2B / B2C split */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'B2B (Registered)', count: d.b2bCount, taxable: d.b2bTaxable, cgst: d.b2bCgst, sgst: d.b2bSgst, igst: d.b2bIgst, color: 'bg-blue-50 border-blue-100' },
          { label: 'B2C (Unregistered)', count: d.b2cCount, taxable: d.b2cTaxable, cgst: d.b2cCgst, sgst: d.b2cSgst, igst: d.b2cIgst, color: 'bg-purple-50 border-purple-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-lg border p-3 text-xs ${s.color}`}>
            <div className="font-bold text-gray-700 mb-1">{s.label} <span className="font-normal text-gray-500">({s.count})</span></div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-gray-600">
              <span>Taxable</span><span className="font-semibold text-gray-800">{fmtAmt(s.taxable)}</span>
              <span>CGST</span><span className="font-semibold">{fmtAmt(s.cgst)}</span>
              <span>SGST</span><span className="font-semibold">{fmtAmt(s.sgst)}</span>
              <span>IGST</span><span className="font-semibold">{fmtAmt(s.igst)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* HSN-wise summary */}
      {d.hsnRows.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">HSN/SAC-wise Summary</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                {['HSN/SAC', 'Taxable (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)'].map(h => (
                  <th key={h} className="text-left py-1 pr-3 font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.hsnRows.map(r => (
                <tr key={r.hsn} className="border-b border-gray-100">
                  <td className="py-1 pr-3 font-mono text-gray-700">{r.hsn}</td>
                  <td className="py-1 pr-3 text-gray-800">{fmtAmt(r.taxable)}</td>
                  <td className="py-1 pr-3 text-gray-800">{fmtAmt(r.cgst)}</td>
                  <td className="py-1 pr-3 text-gray-800">{fmtAmt(r.sgst)}</td>
                  <td className="py-1 pr-3 text-gray-800">{fmtAmt(r.igst)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DailyCashView() {
  const todayISO = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(todayISO)
  const d = buildDailyCashViewData(date || null)
  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-blue" />
        {date !== todayISO && <button onClick={() => setDate(todayISO)} className="text-xs text-gray-400 hover:text-gray-600">Today</button>}
        <span className="ml-auto text-xs text-gray-400">{d.count} payment{d.count !== 1 ? 's' : ''} · Total {fmt(d.grandTotal)}</span>
      </div>
      {d.count === 0 ? <p className="text-xs text-gray-400 italic">No payments on this date.</p> : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">By Mode</p>
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-200"><th className="text-left py-1 pr-3 font-semibold text-gray-500">Mode</th><th className="text-right py-1 font-semibold text-gray-500">Amount</th></tr></thead>
              <tbody>
                {d.byMode.map(r => (
                  <tr key={r.mode} className="border-b border-gray-100">
                    <td className="py-1 pr-3 text-gray-700">{r.mode}</td>
                    <td className="py-1 text-right font-semibold text-gray-800">{fmt(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">By Recorded By</p>
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-200"><th className="text-left py-1 pr-3 font-semibold text-gray-500">User</th><th className="text-right py-1 font-semibold text-gray-500">Amount</th></tr></thead>
              <tbody>
                {d.byUser.map(r => (
                  <tr key={r.user} className="border-b border-gray-100">
                    <td className="py-1 pr-3 text-gray-700">{r.user}</td>
                    <td className="py-1 text-right font-semibold text-gray-800">{fmt(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function EngineerCollectionView() {
  const rows = buildEngineerCollectionViewData()
  if (rows.length === 0) return <p className="text-xs text-gray-400 italic mt-3">No collection payments found.</p>
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            {['Engineer', 'Collected', 'Verified', 'Pending', 'Failed', 'Oldest Pending (days)'].map(h => (
              <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-500 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const oldest = r.pendingItems.length > 0 ? Math.max(...r.pendingItems.map(i => i.days)) : 0
            return (
              <tr key={r.engineer} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-1.5 pr-3 font-medium text-gray-800 whitespace-nowrap">{r.engineer}</td>
                <td className="py-1.5 pr-3 font-semibold text-gray-900">{fmt(r.collected)}</td>
                <td className="py-1.5 pr-3 text-emerald-700">{fmt(r.verified)}</td>
                <td className={`py-1.5 pr-3 font-semibold ${r.pending > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{fmt(r.pending)}</td>
                <td className={`py-1.5 pr-3 ${r.failed > 0 ? 'text-red-600' : 'text-gray-400'}`}>{fmt(r.failed)}</td>
                <td className={`py-1.5 pr-3 font-semibold ${oldest > 7 ? 'text-red-600' : oldest > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {r.pendingItems.length > 0 ? oldest : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ReportCardGrid({ report, canExport, onDownload, expandedKey, onToggleExpand }) {
  const isExpanded = expandedKey === report.key
  return (
    <div className={`bg-white rounded-xl border shadow-card p-4 flex flex-col gap-2 transition-all ${isExpanded ? 'border-brand-blue ring-2 ring-brand-blue/20' : 'border-surface-border'}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug">{report.title}</h3>
        <div className="flex items-center gap-1 shrink-0">
          {report.buildViewData && (
            <button
              onClick={() => onToggleExpand(report.key)}
              title={isExpanded ? 'Hide table' : 'View on screen'}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isExpanded ? 'text-brand-blue bg-brand-blue/10' : 'text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10'}`}
            >
              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
          {canExport ? (
            <button
              onClick={() => onDownload(report)}
              title="Download CSV"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors"
            >
              <Download size={15} />
            </button>
          ) : (
            <span title="Export permission required" className="w-8 h-8 flex items-center justify-center text-gray-300">
              <Lock size={13} />
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 leading-snug">{report.description}</p>
    </div>
  )
}

function ReportRowList({ report, canExport, onDownload, expandedKey, onToggleExpand }) {
  const isExpanded = expandedKey === report.key
  return (
    <div className={`bg-white border first:rounded-t-xl last:rounded-b-xl -mt-px transition-all ${isExpanded ? 'border-brand-blue ring-1 ring-brand-blue/20 z-10 relative' : 'border-surface-border'}`}>
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{report.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{report.description}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {report.buildViewData && (
            <button
              onClick={() => onToggleExpand(report.key)}
              title={isExpanded ? 'Hide table' : 'View on screen'}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isExpanded ? 'text-brand-blue bg-brand-blue/10' : 'text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10'}`}
            >
              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
          {canExport ? (
            <button
              onClick={() => onDownload(report)}
              title="Download CSV"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors"
            >
              <Download size={15} />
            </button>
          ) : (
            <span title="Export permission required" className="w-8 h-8 flex items-center justify-center text-gray-300">
              <Lock size={13} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function ReportView({ reportKey }) {
  if (reportKey === 'overdue-report') return <OverdueTableView />
  if (reportKey === 'gst-summary') return <GstSummaryView />
  if (reportKey === 'daily-cash') return <DailyCashView />
  if (reportKey === 'engineer-collection') return <EngineerCollectionView />
  return null
}

export default function Reports() {
  const [view, setView] = useState('grid')
  // Defaults to the first section (Revenue & Billing) — if that section
  // ends up hidden for the current role (see visibleSections below),
  // rendering falls back to whichever visible section comes first instead
  // of showing a dead/empty tab.
  const [activeSection, setActiveSection] = useState(REPORT_LIBRARY[0].section)
  const [expandedKey, setExpandedKey] = useState(null)

  function handleToggleExpand(key) {
    setExpandedKey(prev => prev === key ? null : key)
  }

  // One useMicroPermission() call per distinct Reports permission key this
  // library's cards reference — see REPORT_LIBRARY above for which card
  // uses which. exportReportsToExcel is the single export gate shared by
  // every card's download action, same as the old dashboard's Export Excel
  // button used.
  const permFlags = {
    viewRevenueReport: useMicroPermission('Reports', 'viewRevenueReport'),
    viewCollectionReport: useMicroPermission('Reports', 'viewCollectionReport'),
    viewCafComplianceReport: useMicroPermission('Reports', 'viewCafComplianceReport'),
    viewChurnReport: useMicroPermission('Reports', 'viewChurnReport'),
    viewPartnerStoreCollectionReport: useMicroPermission('Reports', 'viewPartnerStoreCollectionReport'),
    viewInventoryReport: useMicroPermission('Reports', 'viewInventoryReport'),
    viewWorkOrderTATReport: useMicroPermission('Reports', 'viewWorkOrderTATReport'),
    viewCleaningComplianceReport: useMicroPermission('Reports', 'viewCleaningComplianceReport'),
    viewInventoryConsumptionReport: useMicroPermission('Reports', 'viewInventoryConsumptionReport'),
    viewTechnicianPerformanceReport: useMicroPermission('Reports', 'viewTechnicianPerformanceReport'),
    viewCustomerReports: useMicroPermission('Reports', 'viewCustomerReports'),
    viewTechnicianReports: useMicroPermission('Reports', 'viewTechnicianReports'),
    viewSupportReports: useMicroPermission('Reports', 'viewSupportReports'),
    viewSalesReports: useMicroPermission('Reports', 'viewSalesReports'),
  }
  const canExport = useMicroPermission('Reports', 'exportReportsToExcel')

  function handleDownload(report) {
    const rows = report.buildRows()
    if (!rows || rows.length === 0) {
      exportCsv(report.filename, [{ Status: 'No data available for this report yet' }])
      return
    }
    exportCsv(report.filename, rows)
  }

  // Cards the current user's role can't view are left out of the grid
  // entirely (not rendered greyed-out/disabled) — same convention as every
  // other useMicroPermission()-gated item in this app (see Settings.jsx's
  // Roles & Permissions tab). A section with every card hidden this way
  // doesn't render its own header either, rather than showing an empty
  // section.
  const visibleSections = REPORT_LIBRARY
    .map(section => ({
      ...section,
      reports: section.reports.filter(r => permFlags[r.permKey]),
    }))
    .filter(section => section.reports.length > 0)

  const currentSection = visibleSections.find(s => s.section === activeSection) ?? visibleSections[0] ?? null

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Browse and download reports across every module</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('grid')}
            title="Grid view"
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
              view === 'grid' ? 'bg-white shadow-sm text-brand-blue' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setView('list')}
            title="List view"
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
              view === 'list' ? 'bg-white shadow-sm text-brand-blue' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {visibleSections.length === 0 && (
        <div className="bg-white rounded-xl p-10 shadow-card border border-surface-border text-center">
          <FileBarChart size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900">No reports available</p>
          <p className="text-xs text-gray-500 mt-1">Your role doesn't have permission to view any reports. Contact an admin if you need access.</p>
        </div>
      )}

      {visibleSections.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-surface-border scrollbar-none">
          {visibleSections.map(section => (
            <button
              key={section.section}
              onClick={() => { setActiveSection(section.section); setExpandedKey(null) }}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                currentSection?.section === section.section
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
              }`}
            >
              {section.section}
            </button>
          ))}
        </div>
      )}

      {currentSection && (
        <div className="space-y-4">
          {view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentSection.reports.map(report => (
                <ReportCardGrid key={report.key} report={report} canExport={canExport} onDownload={handleDownload} expandedKey={expandedKey} onToggleExpand={handleToggleExpand} />
              ))}
            </div>
          ) : (
            <div>
              {currentSection.reports.map(report => (
                <ReportRowList key={report.key} report={report} canExport={canExport} onDownload={handleDownload} expandedKey={expandedKey} onToggleExpand={handleToggleExpand} />
              ))}
            </div>
          )}
          {expandedKey && currentSection.reports.find(r => r.key === expandedKey)?.buildViewData && (
            <div className="bg-white rounded-xl border border-brand-blue/30 shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  {currentSection.reports.find(r => r.key === expandedKey)?.title}
                </h3>
                <button onClick={() => setExpandedKey(null)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <X size={15} />
                </button>
              </div>
              <ReportView reportKey={expandedKey} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

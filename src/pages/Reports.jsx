import { useState } from 'react'
import { LayoutGrid, List, Download, FileBarChart, Lock } from 'lucide-react'
import { useMicroPermission } from '../data/rolesStore'
import { exportCsv } from '../utils/csvExport'

// Real data sources — every report card below reads straight from these,
// the same stores/aggregations every other real (non-Reports) page in this
// app already uses. Nothing here is fabricated: a report whose only real
// backing data is thin (e.g. Churn, Hardware Recovery) exports exactly
// that thin real data rather than inventing rows to fill it out — see each
// builder function's own comment for specifics.
import { getPayments } from '../data/paymentsStore'
import { getInvoices, getOutstandingInvoices } from '../data/invoicesStore'
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

// invoicesStore.js is a single shared invoice list with no customerId and
// no due-date/overdue-by-days field (see that store's own top-of-file
// comment) — so "days overdue" and "which customer" genuinely don't exist
// anywhere in this app's data yet. Exports the real outstanding invoices
// exactly as they are rather than inventing either field.
function buildOverdueReportRows() {
  return getOutstandingInvoices().map(inv => ({
    'Invoice No.': inv.no, Package: inv.pkg, 'Issue Date': inv.date,
    'Amount (₹)': inv.amount, Status: inv.status,
  }))
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
    Plan: c.plan ?? '—', Zone: c.zone ?? '—',
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
      const [Zone, Area] = key.split('|')
      return { Zone, Area, 'Customer Count': count }
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
      Technician: tech.name, Zone: tech.zone ?? '—',
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
      { key: 'overdue-report', title: 'Overdue/Outstanding Report', description: 'Outstanding invoices — amount and status for each.', permKey: 'viewCollectionReport', filename: 'overdue_outstanding_report.csv', buildRows: buildOverdueReportRows },
      { key: 'plan-wise-revenue', title: 'Plan-wise Revenue', description: 'Revenue breakdown by service plan (FTTH, FTTB, P2P, etc.).', permKey: 'viewRevenueReport', filename: 'plan_wise_revenue.csv', buildRows: buildPlanWiseRevenueRows },
      { key: 'payment-history', title: 'Payment History Report', description: 'Detailed log of all recorded payments.', permKey: 'viewRevenueReport', filename: 'payment_history_report.csv', buildRows: buildPaymentHistoryRows },
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
      { key: 'zone-wise-customers', title: 'Area/Zone-wise Customer Report', description: 'Customer distribution across zones and localities.', permKey: 'viewCustomerReports', filename: 'area_zone_wise_customer_report.csv', buildRows: buildZoneWiseCustomerRows },
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

function ReportCardGrid({ report, canExport, onDownload }) {
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug">{report.title}</h3>
        {canExport ? (
          <button
            onClick={() => onDownload(report)}
            title="Download CSV"
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors"
          >
            <Download size={15} />
          </button>
        ) : (
          <span title="Export permission required" className="w-8 h-8 shrink-0 flex items-center justify-center text-gray-300">
            <Lock size={13} />
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 leading-snug">{report.description}</p>
    </div>
  )
}

function ReportRowList({ report, canExport, onDownload }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-white border border-surface-border first:rounded-t-xl last:rounded-b-xl -mt-px">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{report.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{report.description}</p>
      </div>
      {canExport ? (
        <button
          onClick={() => onDownload(report)}
          title="Download CSV"
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors"
        >
          <Download size={15} />
        </button>
      ) : (
        <span title="Export permission required" className="w-8 h-8 shrink-0 flex items-center justify-center text-gray-300">
          <Lock size={13} />
        </span>
      )}
    </div>
  )
}

export default function Reports() {
  const [view, setView] = useState('grid')

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

      {visibleSections.map(section => (
        <div key={section.section} className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{section.section}</h2>
          {view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {section.reports.map(report => (
                <ReportCardGrid key={report.key} report={report} canExport={canExport} onDownload={handleDownload} />
              ))}
            </div>
          ) : (
            <div>
              {section.reports.map(report => (
                <ReportRowList key={report.key} report={report} canExport={canExport} onDownload={handleDownload} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

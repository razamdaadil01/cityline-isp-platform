import { useState, useEffect, useMemo } from 'react'
import { Download, TrendingUp, CheckCircle2, Clock, Wrench, X, Users } from 'lucide-react'
import { getLeads as getIntercomLeads, subscribeLeads as subscribeIntercomLeads } from '../data/intercomLeadsStore'
import { getInstallations as getIntercomInstallations, subscribeInstallations as subscribeIntercomInstallations } from '../data/intercomInstallationsStore'
import { getHardware, subscribeHardware } from '../data/intercomHardwareStore'
import { exportCsv } from '../utils/csvExport'

// Billing data mirrors IntercomBilling.jsx's INTERCOM_INVOICES constant (no
// dedicated billing store exists for Intercom yet — same thin dataset exported
// exactly rather than inventing rows to fill it out, following Reports.jsx's
// own pattern for thin real data).
const BILLING_INVOICES = [
  { customer: 'Mohan Das',    amount: 199, status: 'paid',    invoiceDate: '01-06-2026', zone: 'Andheri West'  },
  { customer: 'Priya Nair',   amount: 299, status: 'paid',    invoiceDate: '01-06-2026', zone: 'Bandra East'   },
  { customer: 'Suresh Patil', amount: 199, status: 'pending', invoiceDate: '01-06-2026', zone: 'Goregaon'      },
  { customer: 'Anita Desai',  amount: 199, status: 'paid',    invoiceDate: '05-06-2026', zone: 'Versova'       },
  { customer: 'Rajesh Kumar', amount: 199, status: 'overdue', invoiceDate: '01-06-2026', zone: 'Andheri East'  },
]

// DD-MM-YYYY → YYYY-MM-DD for ISO date range comparisons
function toISO(ddmmyyyy) {
  if (!ddmmyyyy) return ''
  const p = ddmmyyyy.split('-')
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : ddmmyyyy
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, icon, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-card border border-surface-border">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 leading-tight">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1.5 leading-none">{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function ReportCard({ title, description, children, onDownload }) {
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card flex flex-col">
      <div className="px-5 py-4 border-b border-surface-border flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{description}</p>
        </div>
        <button
          onClick={onDownload}
          title="Download CSV"
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors"
        >
          <Download size={15} />
        </button>
      </div>
      <div className="p-5 flex-1">{children}</div>
    </div>
  )
}

function StageRow({ label, count, total, colorClass }) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100)
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-gray-600 w-28 shrink-0 truncate">{label}</p>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs font-semibold text-gray-800 w-6 text-right shrink-0">{count}</p>
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function IntercomReports() {
  const [leads, setLeads]               = useState(getIntercomLeads)
  const [installations, setInstall]     = useState(getIntercomInstallations)
  const [hardware, setHardware]         = useState(getHardware)

  useEffect(() => subscribeIntercomLeads(setLeads), [])
  useEffect(() => subscribeIntercomInstallations(setInstall), [])
  useEffect(() => subscribeHardware(setHardware), [])

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  const hasFilter = dateFrom || dateTo
  function clearFilters() { setDateFrom(''); setDateTo('') }

  // ── Filtered slices ──────────────────────────────────────────────────────
  const filteredLeads = useMemo(() => leads.filter(l => {
    const d = l.createdAt?.slice(0, 10) ?? ''
    if (dateFrom && d < dateFrom) return false
    if (dateTo   && d > dateTo)   return false
    return true
  }), [leads, dateFrom, dateTo])

  const filteredInstall = useMemo(() => installations.filter(inst => {
    const d = toISO(inst.createdDate)
    if (dateFrom && d < dateFrom) return false
    if (dateTo   && d > dateTo)   return false
    return true
  }), [installations, dateFrom, dateTo])

  const filteredBilling = useMemo(() => BILLING_INVOICES.filter(inv => {
    const d = toISO(inv.invoiceDate)
    if (dateFrom && d < dateFrom) return false
    if (dateTo   && d > dateTo)   return false
    return true
  }), [dateFrom, dateTo])

  const filteredHardware = useMemo(() => hardware.filter(hw => {
    const d = toISO(hw.assignedDate ?? '')
    if (!hw.assignedDate) return !dateFrom && !dateTo
    if (dateFrom && d < dateFrom) return false
    if (dateTo   && d > dateTo)   return false
    return true
  }), [hardware, dateFrom, dateTo])

  // ── Aggregations ─────────────────────────────────────────────────────────
  const leadsByStage = useMemo(() => {
    const counts = new Map()
    filteredLeads.forEach(l => counts.set(l.stage, (counts.get(l.stage) ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [filteredLeads])

  const installCompleted = filteredInstall.filter(i => i.status === 'completed').length
  const installPending   = filteredInstall.filter(i => i.status === 'pending').length
  const installProgress  = filteredInstall.filter(i => i.status === 'inprogress').length

  const billingPaid    = filteredBilling.filter(b => b.status === 'paid')
  const billingPending = filteredBilling.filter(b => b.status === 'pending')
  const billingOverdue = filteredBilling.filter(b => b.status === 'overdue')
  const billingTotal   = billingPaid.reduce((s, b) => s + b.amount, 0)

  const hwAssigned  = filteredHardware.filter(h => h.status === 'assigned').length
  const hwAvailable = filteredHardware.filter(h => h.status === 'available').length
  const hwDamaged   = filteredHardware.filter(h => h.status === 'damaged').length

  // ── CSV builders ──────────────────────────────────────────────────────────
  function downloadLeads() {
    const rows = filteredLeads.map(l => ({
      'Lead ID': l.id, Customer: l.customer ?? l.leadName, Stage: l.stage,
      Type: l.type ?? '—', Assigned: l.assigned ?? '—', 'Created Date': l.createdAt ?? '—',
    }))
    exportCsv('intercom_leads_by_stage.csv', rows.length ? rows : [{ Status: 'No data' }])
  }

  function downloadInstallations() {
    const rows = filteredInstall.map(i => ({
      'Work Order ID': i.id, Customer: i.customer, Engineer: i.engineer ?? '—',
      Status: i.status, 'Install Date': i.installDate ?? '—', 'Created Date': i.createdDate ?? '—',
    }))
    exportCsv('intercom_installations.csv', rows.length ? rows : [{ Status: 'No data' }])
  }

  function downloadBilling() {
    const rows = filteredBilling.map(b => ({
      Customer: b.customer, 'Amount (₹)': b.amount, Status: b.status,
      'Invoice Date': b.invoiceDate, Zone: b.zone ?? '—',
    }))
    exportCsv('intercom_billing_collection.csv', rows.length ? rows : [{ Status: 'No data' }])
  }

  function downloadHardware() {
    const rows = filteredHardware.map(h => ({
      'Hardware ID': h.id, 'Device Type': h.deviceType, Serial: h.serial,
      Status: h.status, 'Assigned To': h.assignedTo ?? '—', Zone: h.zone ?? '—',
      'Assigned Date': h.assignedDate ?? '—',
    }))
    exportCsv('intercom_hardware_issued.csv', rows.length ? rows : [{ Status: 'No data' }])
  }

  const STAGE_COLORS = [
    'bg-brand-blue', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-400', 'bg-red-400', 'bg-gray-300',
  ]

  return (
    <div className="p-6 space-y-6">

      {/* Page heading */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Intercom Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Reporting and analytics for intercom operations</p>
      </div>

      {/* Date filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="text-sm border border-surface-border rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-blue"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="text-sm border border-surface-border rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-blue"
          />
        </div>
        {hasFilter && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-surface-border hover:bg-gray-50 transition-colors"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Leads"
          value={filteredLeads.length}
          icon={<Users size={16} />}
          iconBg="bg-brand-blue/10"
          iconColor="text-brand-blue"
        />
        <StatCard
          label="Installations Completed"
          value={installCompleted}
          icon={<CheckCircle2 size={16} />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Installations Pending"
          value={installPending + installProgress}
          icon={<Clock size={16} />}
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
        />
        <StatCard
          label="Hardware Issued"
          value={hwAssigned}
          icon={<Wrench size={16} />}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* Report cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Leads by Stage */}
        <ReportCard
          title="Intercom Leads by Stage"
          description="Lead counts grouped by current stage."
          onDownload={downloadLeads}
        >
          {leadsByStage.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No leads in selected date range.</p>
          ) : (
            <div className="space-y-3">
              {leadsByStage.map(([stage, count], i) => (
                <StageRow
                  key={stage}
                  label={stage}
                  count={count}
                  total={filteredLeads.length}
                  colorClass={STAGE_COLORS[i % STAGE_COLORS.length]}
                />
              ))}
            </div>
          )}
        </ReportCard>

        {/* Installations */}
        <ReportCard
          title="Installations (Completed / Pending)"
          description="Intercom work order status breakdown."
          onDownload={downloadInstallations}
        >
          {filteredInstall.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No installations in selected date range.</p>
          ) : (
            <div className="space-y-3">
              <StageRow label="Completed"   count={installCompleted} total={filteredInstall.length} colorClass="bg-emerald-500" />
              <StageRow label="In Progress" count={installProgress}  total={filteredInstall.length} colorClass="bg-brand-blue"  />
              <StageRow label="Pending"     count={installPending}   total={filteredInstall.length} colorClass="bg-orange-400"  />
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-surface-border grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-emerald-600">{installCompleted}</p>
              <p className="text-[11px] text-gray-500">Completed</p>
            </div>
            <div>
              <p className="text-lg font-bold text-brand-blue">{installProgress}</p>
              <p className="text-[11px] text-gray-500">In Progress</p>
            </div>
            <div>
              <p className="text-lg font-bold text-orange-500">{installPending}</p>
              <p className="text-[11px] text-gray-500">Pending</p>
            </div>
          </div>
        </ReportCard>

        {/* Billing Collection */}
        <ReportCard
          title="Intercom Billing Collection"
          description="Invoice status and collection totals."
          onDownload={downloadBilling}
        >
          {filteredBilling.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No billing records in selected date range.</p>
          ) : (
            <>
              <div className="space-y-3">
                <StageRow label="Paid"    count={billingPaid.length}    total={filteredBilling.length} colorClass="bg-emerald-500" />
                <StageRow label="Pending" count={billingPending.length} total={filteredBilling.length} colorClass="bg-orange-400"  />
                <StageRow label="Overdue" count={billingOverdue.length} total={filteredBilling.length} colorClass="bg-red-500"     />
              </div>
              <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between">
                <p className="text-xs text-gray-500">Collected</p>
                <p className="text-sm font-bold text-emerald-600">
                  ₹{billingTotal.toLocaleString('en-IN')}
                </p>
              </div>
            </>
          )}
        </ReportCard>

        {/* Hardware Issued */}
        <ReportCard
          title="Hardware Issued"
          description="Intercom hardware status across all units."
          onDownload={downloadHardware}
        >
          {filteredHardware.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No hardware records in selected date range.</p>
          ) : (
            <>
              <div className="space-y-3">
                <StageRow label="Assigned"  count={hwAssigned}  total={filteredHardware.length} colorClass="bg-brand-blue"  />
                <StageRow label="Available" count={hwAvailable} total={filteredHardware.length} colorClass="bg-emerald-500" />
                <StageRow label="Damaged"   count={hwDamaged}   total={filteredHardware.length} colorClass="bg-red-400"     />
              </div>
              <div className="mt-4 pt-3 border-t border-surface-border grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-brand-blue">{hwAssigned}</p>
                  <p className="text-[11px] text-gray-500">Issued</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600">{hwAvailable}</p>
                  <p className="text-[11px] text-gray-500">Available</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-500">{hwDamaged}</p>
                  <p className="text-[11px] text-gray-500">Damaged</p>
                </div>
              </div>
            </>
          )}
        </ReportCard>

      </div>
    </div>
  )
}

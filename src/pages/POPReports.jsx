import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadialBarChart, RadialBar,
} from 'recharts'
import {
  Download, Clock, UserCheck, Zap, Sparkles, Package,
  ArrowLeft, ChevronRight, Lock,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { Input } from '../components/ui/FormInputs'
import { getWorkOrders, subscribeWorkOrders } from '../data/workOrderStore'
import { getPOPs, subscribePOPs } from '../data/popStore'
import { getProducts, subscribeProducts } from '../data/productStore'
import { getUsers, subscribeUsers } from '../data/userStore'
import {
  computeWorkOrderTAT, computeTechnicianPerformance,
  computePOPDowntime, computeCleaningCompliance, computeInventoryConsumption,
} from '../utils/popReportsStats'
import { useMicroPermission } from '../data/rolesStore'
import { exportWorkbook } from '../utils/excelExport'

// POP Management Reports & Analytics (PRD Phase 3, Feature 6) — mirrors
// Reports.jsx's own established report-card pattern exactly (list-view
// card grid -> click a card -> self-contained detail view; a page-level
// dateFrom/dateTo range fed to every card/detail view as `range`; a single
// Export Excel button exporting either every visible card's sheets in list
// view or just the open report's sheets in detail view; granular per-
// report view/export permissions with ungrantable cards omitted entirely)
// rather than inventing a different pattern for POP-specific reports.
//
// Unlike Reports.jsx (whose detail views each independently re-subscribe
// to the same stores the parent already reads, so a card's summary number
// and its own detail view can never disagree), the 5 reports here share
// one small set of live-subscribed hooks (useWorkOrdersLive() etc.) below.
// Both the card grid and every detail view call the same hooks and the
// same pure compute functions (src/utils/popReportsStats.js), which gives
// the identical "can't disagree" guarantee with far less duplicated
// subscribe/useEffect boilerplate across 5 reports instead of Reports.jsx's
// 6 — the underlying convention (self-contained, live, real data) is the
// same, just factored differently.

function useWorkOrdersLive() {
  const [workOrders, setWorkOrders] = useState(getWorkOrders)
  useEffect(() => subscribeWorkOrders(setWorkOrders), [])
  return workOrders
}
function usePOPsLive() {
  const [pops, setPops] = useState(getPOPs)
  useEffect(() => subscribePOPs(setPops), [])
  return pops
}
function useProductsLive() {
  const [products, setProducts] = useState(getProducts)
  useEffect(() => subscribeProducts(setProducts), [])
  return products
}
// technicianHelpers.js's getAllTechnicians() has no subscribe of its own
// (it's a thin non-reactive filter over getUsers()) — subscribed here via
// userStore.js's own subscribeUsers() instead, then filtered the same way.
function useTechniciansLive() {
  const [users, setUsers] = useState(getUsers)
  useEffect(() => subscribeUsers(setUsers), [])
  return useMemo(() => users.filter(u => u.role === 'engineer'), [users])
}

// ── Report cards ──────────────────────────────────────────────────────────

const REPORT_CARDS = [
  { id: 'tat', title: 'Work Order TAT Report', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'technician', title: 'Technician Performance Report', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'downtime', title: 'POP-wise Downtime Report', icon: Zap, color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'cleaning', title: 'Cleaning Compliance Report', icon: Sparkles, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { id: 'inventory', title: 'Inventory Consumption & Cost Report', icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
]

// ── Detail views ──────────────────────────────────────────────────────────

function TATDetail({ range }) {
  const workOrders = useWorkOrdersLive()
  const stats = useMemo(() => computeWorkOrderTAT(workOrders, range?.from, range?.to), [workOrders, range?.from, range?.to])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Work Orders Resolved (Selected Range)', value: stats.totalResolved.toLocaleString('en-IN') },
          { label: 'Overall Avg TAT', value: `${stats.overallAvgHours}h` },
          { label: 'Cleaning vs Maintenance Avg TAT', value: `${stats.cleaningAvgHours}h / ${stats.maintenanceAvgHours}h` },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-surface-border">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-surface-border p-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-4">Avg TAT by Category</h4>
          {stats.totalResolved === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No resolved Work Orders in the selected date range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.byCategory} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}h`} />
                <Tooltip formatter={v => [`${v}h`, 'Avg TAT']} />
                <Bar dataKey="avgHours" name="Avg TAT (hrs)" fill="#0A8DCD" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-xl border border-surface-border p-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-4">Avg TAT by Priority</h4>
          {stats.totalResolved === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No resolved Work Orders in the selected date range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.byPriority} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="priority" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}h`} />
                <Tooltip formatter={v => [`${v}h`, 'Avg TAT']} />
                <Bar dataKey="avgHours" name="Avg TAT (hrs)" fill="#E8541A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

function TechnicianDetail({ range }) {
  const workOrders = useWorkOrdersLive()
  const technicians = useTechniciansLive()
  const rows = useMemo(
    () => computeTechnicianPerformance(workOrders, technicians, range?.from, range?.to),
    [workOrders, technicians, range?.from, range?.to]
  )
  const totalClosed = rows.reduce((sum, r) => sum + r.closedCount, 0)
  const activeRows = rows.filter(r => r.closedCount > 0)
  const avgSlaAdherence = activeRows.length === 0
    ? 0
    : Math.round((activeRows.reduce((sum, r) => sum + r.slaAdherenceRate, 0) / activeRows.length) * 10) / 10

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Technicians', value: technicians.length.toLocaleString('en-IN') },
          { label: 'Work Orders Closed (Selected Range)', value: totalClosed.toLocaleString('en-IN') },
          { label: 'Avg SLA Adherence', value: `${avgSlaAdherence}%` },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-surface-border">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <h4 className="text-sm font-semibold text-gray-800">Per-Technician Performance</h4>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No technicians found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-surface-border">
                {['Technician', 'Work Orders Closed', 'Avg Resolution Time', 'SLA Adherence'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.map(r => (
                <tr key={r.technicianId} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800">{r.technicianName}</td>
                  <td className="px-4 py-3 text-gray-700">{r.closedCount}</td>
                  <td className="px-4 py-3 text-gray-700">{r.closedCount === 0 ? '—' : `${r.avgResolutionHours}h`}</td>
                  <td className="px-4 py-3">
                    {r.closedCount === 0 ? (
                      <span className="text-gray-400 text-xs">—</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                          <div className="h-full bg-brand-blue rounded-full" style={{ width: `${r.slaAdherenceRate}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{r.slaAdherenceRate}%</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function DowntimeDetail({ range }) {
  const workOrders = useWorkOrdersLive()
  const pops = usePOPsLive()
  const rows = useMemo(() => computePOPDowntime(workOrders, pops, range?.from, range?.to), [workOrders, pops, range?.from, range?.to])
  const totalDowntimeHours = rows.reduce((sum, r) => sum + r.downtimeHours, 0)
  const totalIncidents = rows.reduce((sum, r) => sum + r.incidentCount, 0)
  const openIncidents = rows.reduce((sum, r) => sum + r.openIncidentCount, 0)
  const chartRows = rows.filter(r => r.downtimeHours > 0).slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Downtime (Selected Range)', value: `${Math.round(totalDowntimeHours * 10) / 10}h` },
          { label: 'Critical/High Fault Incidents', value: totalIncidents.toLocaleString('en-IN') },
          { label: 'Currently Open Incidents', value: openIncidents.toLocaleString('en-IN') },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-surface-border">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 -mt-4">
        Downtime is a proxy: total time each POP spent with an open Critical/High-priority Breakdown-Fault Work Order (creation to resolution, or to now if still open) — this app has no separate uptime-monitoring feed.
      </p>

      <div className="bg-white rounded-xl border border-surface-border p-5">
        <h4 className="text-sm font-semibold text-gray-800 mb-4">Top POPs by Downtime</h4>
        {chartRows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">No Critical/High-priority fault incidents in the selected date range.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartRows} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}h`} />
              <YAxis type="category" dataKey="popName" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={110} />
              <Tooltip formatter={v => [`${v}h`, 'Downtime']} />
              <Bar dataKey="downtimeHours" name="Downtime (hrs)" fill="#dc2626" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <h4 className="text-sm font-semibold text-gray-800">Per-POP Downtime</h4>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-surface-border">
              {['POP', 'Incidents', 'Open Now', 'Downtime'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {rows.map(r => (
              <tr key={r.popId} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-800">{r.popName}</td>
                <td className="px-4 py-3 text-gray-700">{r.incidentCount}</td>
                <td className="px-4 py-3">
                  {r.openIncidentCount > 0 ? <Badge variant="red" size="sm">{r.openIncidentCount}</Badge> : <span className="text-gray-400 text-xs">0</span>}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">{r.downtimeHours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CleaningDetail({ range }) {
  const workOrders = useWorkOrdersLive()
  const pops = usePOPsLive()
  const stats = useMemo(() => computeCleaningCompliance(workOrders, pops, range?.from, range?.to), [workOrders, pops, range?.from, range?.to])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Cleaning Work Orders (Resolved)', value: stats.overall.total.toLocaleString('en-IN') },
          { label: 'On-Time', value: stats.overall.onTime.toLocaleString('en-IN'), color: 'text-green-600' },
          { label: 'Delayed', value: stats.overall.delayed.toLocaleString('en-IN'), color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-surface-border">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color ?? 'text-gray-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-surface-border p-5 flex flex-col items-center">
        <h4 className="text-sm font-semibold text-gray-800 mb-2 self-start">Overall Compliance Rate</h4>
        <ResponsiveContainer width="100%" height={200}>
          <RadialBarChart cx="50%" cy="80%" innerRadius="60%" outerRadius="90%"
            startAngle={180} endAngle={0} data={[{ name: 'Compliance', value: Math.round(stats.overall.compliancePct), fill: '#0A8DCD' }]}>
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#f0f4f8' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <p className="text-3xl font-bold text-navy -mt-10">{stats.overall.compliancePct.toFixed(1)}%</p>
        <p className="text-xs text-gray-400 mt-1">Cleaning Compliance</p>
      </div>

      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <h4 className="text-sm font-semibold text-gray-800">Per-POP Cleaning Compliance</h4>
        </div>
        {stats.byPOP.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No POPs recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-surface-border">
                {['POP', 'Resolved', 'On-Time', 'Delayed', 'Compliance'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {stats.byPOP.map(r => (
                <tr key={r.popId} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800">{r.popName}</td>
                  <td className="px-4 py-3 text-gray-700">{r.total}</td>
                  <td className="px-4 py-3 text-green-600">{r.onTime}</td>
                  <td className="px-4 py-3 text-red-600">{r.delayed}</td>
                  <td className="px-4 py-3">
                    {r.total === 0 ? (
                      <span className="text-gray-400 text-xs">—</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                          <div className="h-full bg-brand-blue rounded-full" style={{ width: `${r.compliancePct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{r.compliancePct}%</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function InventoryConsumptionDetail({ range }) {
  const workOrders = useWorkOrdersLive()
  const pops = usePOPsLive()
  const products = useProductsLive()
  const stats = useMemo(
    () => computeInventoryConsumption(workOrders, pops, products, range?.from, range?.to),
    [workOrders, pops, products, range?.from, range?.to]
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Hardware Consumed (Selected Range)', value: stats.totalQuantity.toLocaleString('en-IN') },
          { label: 'Total Cost', value: `₹${stats.totalCost.toLocaleString('en-IN')}` },
          { label: 'POPs with Consumption', value: stats.byPOP.length.toLocaleString('en-IN') },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-surface-border">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 -mt-4">
        Sourced from confirmed Hardware Used on resolved Work Orders whose consumption was actually deducted from central Inventory stock — not the originally-requested Hardware Need — costed at each product's purchase price.
      </p>

      <div className="bg-white rounded-xl border border-surface-border p-5">
        <h4 className="text-sm font-semibold text-gray-800 mb-4">Month-wise Cost</h4>
        {stats.byMonth.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">No confirmed hardware consumption in the selected date range.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.byMonth} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Cost']} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="cost" name="Cost (₹)" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <h4 className="text-sm font-semibold text-gray-800">Per-POP Consumption</h4>
        </div>
        {stats.byPOP.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No confirmed hardware consumption in the selected date range.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-surface-border">
                {['POP', 'Quantity Consumed', 'Cost (₹)'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {stats.byPOP.map(r => (
                <tr key={r.popId} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800">{r.popName}</td>
                  <td className="px-4 py-3 text-gray-700">{r.quantity}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">₹{r.cost.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const DETAIL_VIEWS = {
  tat: TATDetail,
  technician: TechnicianDetail,
  downtime: DowntimeDetail,
  cleaning: CleaningDetail,
  inventory: InventoryConsumptionDetail,
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function POPReports() {
  const [active, setActive] = useState(null)
  // Same rolling 2-year default window as Reports.jsx's own date picker —
  // wide enough to cover this store's real seed history and any Work
  // Orders created this session, so reports aren't empty on first load.
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 2)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))

  const workOrders = useWorkOrdersLive()
  const pops = usePOPsLive()
  const products = useProductsLive()
  const technicians = useTechniciansLive()

  const tatStats = useMemo(() => computeWorkOrderTAT(workOrders, dateFrom, dateTo), [workOrders, dateFrom, dateTo])
  const technicianStats = useMemo(
    () => computeTechnicianPerformance(workOrders, technicians, dateFrom, dateTo),
    [workOrders, technicians, dateFrom, dateTo]
  )
  const downtimeStats = useMemo(() => computePOPDowntime(workOrders, pops, dateFrom, dateTo), [workOrders, pops, dateFrom, dateTo])
  const cleaningStats = useMemo(() => computeCleaningCompliance(workOrders, pops, dateFrom, dateTo), [workOrders, pops, dateFrom, dateTo])
  const inventoryStats = useMemo(
    () => computeInventoryConsumption(workOrders, pops, products, dateFrom, dateTo),
    [workOrders, pops, products, dateFrom, dateTo]
  )

  // Granular per-report permissions (rolesStore.js's MODULE_MICRO_PERMISSIONS
  // — extended with 5 new keys under the existing 'Reports' module rather
  // than a new permissions module; see this task's own commit message for
  // the reasoning). Reuses the existing 'exportReportsToExcel' key for
  // export, same as every report on the main Reports page.
  const canViewTAT = useMicroPermission('Reports', 'viewWorkOrderTATReport')
  const canViewTechnician = useMicroPermission('Reports', 'viewTechnicianPerformanceReport')
  const canViewDowntime = useMicroPermission('Reports', 'viewPOPDowntimeReport')
  const canViewCleaning = useMicroPermission('Reports', 'viewCleaningComplianceReport')
  const canViewInventory = useMicroPermission('Reports', 'viewInventoryConsumptionReport')
  const canExport = useMicroPermission('Reports', 'exportReportsToExcel')
  const reportPermissions = {
    tat: canViewTAT, technician: canViewTechnician, downtime: canViewDowntime,
    cleaning: canViewCleaning, inventory: canViewInventory,
  }

  const reportCards = useMemo(() => REPORT_CARDS.map(card => {
    switch (card.id) {
      case 'tat':
        return { ...card, value: `${tatStats.overallAvgHours}h`, sub: `${tatStats.totalResolved} Work Orders resolved`, badge: { label: 'Avg TAT', variant: 'blue' } }
      case 'technician': {
        const totalClosed = technicianStats.reduce((sum, r) => sum + r.closedCount, 0)
        return { ...card, value: `${totalClosed}`, sub: `across ${technicians.length} technicians`, badge: { label: 'Closed WOs', variant: 'green' } }
      }
      case 'downtime': {
        const totalDowntime = Math.round(downtimeStats.reduce((sum, r) => sum + r.downtimeHours, 0) * 10) / 10
        const openCount = downtimeStats.reduce((sum, r) => sum + r.openIncidentCount, 0)
        return { ...card, value: `${totalDowntime}h`, sub: 'Total fault downtime', badge: { label: openCount > 0 ? `${openCount} open` : 'All clear', variant: openCount > 0 ? 'red' : 'green' } }
      }
      case 'cleaning':
        return { ...card, value: `${cleaningStats.overall.compliancePct.toFixed(1)}%`, sub: `${cleaningStats.overall.total} Cleaning WOs resolved`, badge: { label: cleaningStats.overall.compliancePct >= 90 ? 'On target' : 'Needs attention', variant: cleaningStats.overall.compliancePct >= 90 ? 'green' : 'orange' } }
      case 'inventory':
        return { ...card, value: `₹${inventoryStats.totalCost.toLocaleString('en-IN')}`, sub: `${inventoryStats.totalQuantity} units consumed`, badge: { label: `${inventoryStats.byPOP.length} POPs`, variant: 'purple' } }
      default:
        return card
    }
  }), [tatStats, technicianStats, technicians.length, downtimeStats, cleaningStats, inventoryStats])

  const visibleReportCards = reportCards.filter(card => reportPermissions[card.id])
  const activeAllowed = !!active && !!reportPermissions[active]
  const activeCard = reportCards.find(c => c.id === active)
  const DetailView = activeAllowed ? DETAIL_VIEWS[active] : null

  function buildExportSheets(id) {
    const range = { from: dateFrom, to: dateTo }
    switch (id) {
      case 'tat': {
        const s = computeWorkOrderTAT(workOrders, range.from, range.to)
        return [
          { name: 'TAT - By Category', rows: s.byCategory.map(r => ({ Category: r.category, 'Work Orders Resolved': r.count, 'Avg TAT (hrs)': r.avgHours })) },
          { name: 'TAT - By Priority', rows: s.byPriority.map(r => ({ Priority: r.priority, 'Work Orders Resolved': r.count, 'Avg TAT (hrs)': r.avgHours })) },
        ]
      }
      case 'technician': {
        const rows = computeTechnicianPerformance(workOrders, technicians, range.from, range.to)
        return [{
          name: 'Technician Performance',
          rows: rows.map(r => ({
            Technician: r.technicianName, 'Work Orders Closed': r.closedCount,
            'Avg Resolution Time (hrs)': r.avgResolutionHours, 'SLA Adherence (%)': r.slaAdherenceRate,
          })),
        }]
      }
      case 'downtime': {
        const rows = computePOPDowntime(workOrders, pops, range.from, range.to)
        return [{
          name: 'POP-wise Downtime',
          rows: rows.map(r => ({
            POP: r.popName, 'Fault Incidents': r.incidentCount, 'Open Incidents': r.openIncidentCount, 'Downtime (hrs)': r.downtimeHours,
          })),
        }]
      }
      case 'cleaning': {
        const s = computeCleaningCompliance(workOrders, pops, range.from, range.to)
        return [
          {
            name: 'Cleaning Compliance - By POP',
            rows: s.byPOP.map(r => ({ POP: r.popName, Resolved: r.total, 'On-Time': r.onTime, Delayed: r.delayed, 'Compliance %': r.compliancePct })),
          },
          {
            name: 'Cleaning Compliance - Overall',
            rows: [{ Resolved: s.overall.total, 'On-Time': s.overall.onTime, Delayed: s.overall.delayed, 'Compliance %': s.overall.compliancePct }],
          },
        ]
      }
      case 'inventory': {
        const s = computeInventoryConsumption(workOrders, pops, products, range.from, range.to)
        return [
          { name: 'Inventory Consumption - By POP', rows: s.byPOP.map(r => ({ POP: r.popName, 'Quantity Consumed': r.quantity, 'Cost (₹)': r.cost })) },
          { name: 'Inventory Consumption - By Month', rows: s.byMonth.map(r => ({ Month: r.month, 'Quantity Consumed': r.quantity, 'Cost (₹)': r.cost })) },
        ]
      }
      default:
        return []
    }
  }

  function handleExport() {
    if (!activeAllowed) {
      exportWorkbook('POP_Reports.xlsx', visibleReportCards.flatMap(card => buildExportSheets(card.id)))
      return
    }
    exportWorkbook(`${activeCard.title.replace(/[^\w]+/g, '_')}.xlsx`, buildExportSheets(active))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {active && (
            <button onClick={() => setActive(null)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {active ? (activeCard?.title ?? 'Access restricted') : 'POP Management Reports'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {active ? 'Detailed analytics view' : 'Work Order, technician and inventory analytics for POP sites'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>From</span>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-xs py-1.5" />
            <span>To</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-xs py-1.5" />
          </div>
          {canExport && (active ? activeAllowed : visibleReportCards.length > 0) && (
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport}>Export Excel</Button>
          )}
        </div>
      </div>

      {/* Report cards grid */}
      {!active && visibleReportCards.length === 0 && (
        <div className="bg-white rounded-xl p-10 shadow-card border border-surface-border text-center">
          <Lock size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900">No reports available</p>
          <p className="text-xs text-gray-500 mt-1">Your role doesn't have permission to view any POP Management reports. Contact an admin if you need access.</p>
        </div>
      )}
      {!active && visibleReportCards.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {visibleReportCards.map(card => {
            const Icon = card.icon
            return (
              <button key={card.id} onClick={() => setActive(card.id)}
                className="bg-white rounded-xl p-5 shadow-card border border-surface-border text-left
                  hover:border-brand-blue/40 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg}`}>
                    <Icon size={20} className={card.color} />
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-blue transition-colors mt-1" />
                </div>
                <p className="text-sm font-semibold text-gray-800">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 mb-2">{card.value}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">{card.sub}</p>
                  <Badge variant={card.badge.variant} size="sm">{card.badge.label}</Badge>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Detail view */}
      {active && !activeAllowed && (
        <div className="bg-white rounded-xl p-10 shadow-card border border-surface-border text-center">
          <Lock size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900">Access restricted</p>
          <p className="text-xs text-gray-500 mt-1">You don't have permission to view this report. Contact an admin if you need access.</p>
        </div>
      )}
      {active && activeAllowed && DetailView && (
        <DetailView range={{ from: dateFrom, to: dateTo }} />
      )}
    </div>
  )
}

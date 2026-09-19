import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, LineChart, Line, AreaChart, Area,
} from 'recharts'
import {
  Download, TrendingDown, TrendingUp, Receipt, Store,
  Package, FileText, ArrowLeft, AlertCircle, CheckCircle2,
  Clock, ChevronRight, Lock,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { Input, Select } from '../components/ui/FormInputs'
import { getAllCustomers, subscribeCustomers, effectiveStatus } from '../data/customersData'
import { getPayments, subscribePayments } from '../data/paymentsStore'
import { computeRevenueByMonth, computeRevenueByPlan } from '../utils/revenueStats'
import { getProducts, subscribeProducts } from '../data/productStore'
import { subscribeInventoryLedger } from '../data/inventoryLedger'
import { computeInventoryByCategory, formatAvailableQty } from '../utils/inventoryStats'
import { getInvoices, getOutstandingInvoices, getOutstandingTotal, subscribeInvoices } from '../data/invoicesStore'
import { computeCollectionByMonth } from '../utils/collectionStats'
import { computeChurnByMonth, countCurrentlyAtRisk } from '../utils/churnStats'
import { useMicroPermission } from '../data/rolesStore'
import { exportWorkbook } from '../utils/excelExport'

// ── Mock data ─────────────────────────────────────────────────────────────────

// Revenue Report used to have its own independently-hardcoded
// MONTHLY_REVENUE/SERVICE_BREAKDOWN mocks that could never agree with
// Dashboard.jsx's real "Revenue Overview" numbers since neither read the
// other's data. Both now read paymentsStore.js/customersData.js through
// the same computeRevenueByMonth()/computeRevenueByPlan() helpers
// (src/utils/revenueStats.js) Dashboard.jsx uses, so the two pages can't
// drift apart. There's no real expenses/profit or monthly-target figure
// anywhere in this app (no cost or goal store exists), so unlike the old
// mock this only ever plots the one real collected-revenue series.
const REVENUE_MONTHS_SHOWN = 6

// Real per-customer cafStatus (customersData.js's CAF_STATUSES), same
// source Dashboard.jsx's own CAF Compliance widget reads — replaces the
// old CAF_GAUGE_DATA/INCOMPLETE_CAFS mocks (CAF-1042 etc., names that
// mostly didn't even match a real seeded customer) so the two pages can't
// disagree. "Compliant" here means cafStatus === 'Approved' (the same
// definition Dashboard.jsx's own compliance rate uses); everything else
// (Submitted/Pending/Rejected) is "Incomplete" — awaiting review, not yet
// uploaded, or sent back respectively.
const CAF_STATUS_BREAKDOWN_META = [
  { key: 'Submitted', label: 'Submitted — awaiting review', color: '#0A8DCD' },
  { key: 'Pending',    label: 'Not yet uploaded',            color: '#E8541A' },
  { key: 'Rejected',   label: 'Rejected — needs resubmission', color: '#0F2744' },
]

function computeCafStats(customers) {
  const total = customers.length
  const counts = { Approved: 0, Submitted: 0, Pending: 0, Rejected: 0 }
  customers.forEach(c => {
    const status = counts[c.cafStatus] !== undefined ? c.cafStatus : 'Pending'
    counts[status]++
  })
  const compliant = counts.Approved
  const incomplete = total - compliant
  const complianceRate = total === 0 ? 0 : (compliant / total) * 100
  const incompleteCustomers = customers.filter(c => (c.cafStatus ?? 'Pending') !== 'Approved')
  return { total, compliant, incomplete, complianceRate, counts, incompleteCustomers }
}

const PARTNER_COLLECTION = [
  { partner: 'Andheri Store',   collected: 312000, pending: 18000, pct: 95 },
  { partner: 'Bandra Store',    collected: 275000, pending: 22000, pct: 93 },
  { partner: 'Thane Store',     collected: 198000, pending: 14000, pct: 93 },
  { partner: 'Kurla Store',     collected: 142000, pending: 8000,  pct: 95 },
  { partner: 'Borivali Store',  collected: 89000,  pending: 6500,  pct: 93 },
]

// Display colors for productTaxonomyStore.js's real seeded categories (ONT,
// Router, Cable, Network Accessories, Splicing & Termination) plus the
// "Unclassified" bucket computeInventoryByCategory() groups legacy,
// pre-taxonomy products into — any category added later via Product
// Taxonomy's admin UI still renders (falls back to CATEGORY_COLOR_FALLBACK)
// rather than being dropped for having no color assigned.
const CATEGORY_COLORS = {
  ONT: '#0A8DCD',
  Router: '#0F2744',
  Cable: '#059669',
  'Network Accessories': '#E8541A',
  'Splicing & Termination': '#7c3aed',
  Unclassified: '#94a3b8',
}
const CATEGORY_COLOR_FALLBACK = '#64748b'

// ── Report Cards ──────────────────────────────────────────────────────────────

const REPORT_CARDS = [
  {
    id: 'revenue',
    title: 'Revenue Report',
    icon: TrendingUp,
    color: 'text-brand-blue',
    bg: 'bg-blue-50',
    value: '₹4,24,500',
    sub: 'Last 6 months total',
    badge: { label: '+8.2% vs prior period', variant: 'green' },
  },
  {
    id: 'caf',
    title: 'CAF Compliance',
    icon: FileText,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    value: '78%',
    sub: '6 incomplete CAFs',
    badge: { label: 'Action needed', variant: 'yellow' },
  },
  {
    id: 'churn',
    title: 'Churn Report',
    icon: TrendingDown,
    color: 'text-red-500',
    bg: 'bg-red-50',
    value: '1.2%',
    sub: 'Monthly churn rate',
    badge: { label: 'Stable', variant: 'green' },
  },
  {
    id: 'collection',
    title: 'Collection Report',
    icon: Receipt,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    value: '94.8%',
    sub: 'Collection efficiency',
    badge: { label: '₹65.5k pending', variant: 'orange' },
  },
  {
    id: 'partner',
    title: 'Partner & Store-wise Collection',
    icon: Store,
    color: 'text-navy',
    bg: 'bg-indigo-50',
    value: '5 Stores',
    sub: 'Active partner locations',
    badge: { label: 'All performing', variant: 'green' },
  },
  {
    id: 'inventory',
    title: 'Inventory Report',
    icon: Package,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    value: '613 Units',
    sub: 'Total tracked stock',
    badge: { label: '2 critical SKUs', variant: 'red' },
  },
]

// ── Detail views ──────────────────────────────────────────────────────────────

// Self-contained, live-subscribed detail view (same pattern as CAFDetail
// below) rather than reading the page-level date pickers — those are
// display-only elsewhere in this file and this view doesn't filter by them.
function RevenueDetail() {
  const [customers, setCustomers] = useState(getAllCustomers)
  useEffect(() => subscribeCustomers(() => setCustomers(getAllCustomers())), [])
  const [payments, setPayments] = useState(getPayments)
  useEffect(() => subscribePayments(setPayments), [])

  const revenueByMonth = useMemo(() => computeRevenueByMonth(payments), [payments])
  const shownMonths = useMemo(
    () => (revenueByMonth.length <= REVENUE_MONTHS_SHOWN ? revenueByMonth : revenueByMonth.slice(-REVENUE_MONTHS_SHOWN)),
    [revenueByMonth]
  )
  const totalRevenue = useMemo(() => shownMonths.reduce((sum, m) => sum + m.collected, 0), [shownMonths])
  const activeCustomerCount = useMemo(() => customers.filter(c => effectiveStatus(c) === 'active').length, [customers])
  const latestMonth = shownMonths[shownMonths.length - 1]
  const currentMonthRevenue = latestMonth?.collected ?? 0
  const currentMonthLabel = latestMonth?.month ?? new Date().toLocaleDateString('en-US', { month: 'short' })
  const arpu = activeCustomerCount === 0 ? 0 : currentMonthRevenue / activeCustomerCount

  const revenueByPlan = useMemo(() => computeRevenueByPlan(customers, payments), [customers, payments])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: `Total Revenue (${shownMonths.length || REVENUE_MONTHS_SHOWN}m)`, value: `₹${totalRevenue.toLocaleString('en-IN')}` },
          { label: 'Active Customers', value: activeCustomerCount.toLocaleString('en-IN') },
          { label: `ARPU (${currentMonthLabel})`, value: `₹${Math.round(arpu).toLocaleString('en-IN')}` },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-surface-border">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-surface-border p-5">
        <h4 className="text-sm font-semibold text-gray-800 mb-4">Month-wise Revenue</h4>
        {shownMonths.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">No payments recorded yet — the revenue trend will build up as payments come in.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={shownMonths} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="collected" name="Revenue" fill="#0A8DCD" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <h4 className="text-sm font-semibold text-gray-800">Plan-wise Revenue Breakdown</h4>
        </div>
        {revenueByPlan.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No customers recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-surface-border">
                {['Plan', 'Active Customers', 'Revenue (₹)', 'Share %'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {revenueByPlan.map(s => (
                <tr key={s.plan} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.plan}</td>
                  <td className="px-4 py-3 text-gray-700">{s.customers}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">₹{s.revenue.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-blue rounded-full" style={{ width: `${s.pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{s.pct.toFixed(0)}%</span>
                    </div>
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

const CUSTOM_GAUGE_LABEL = ({ cx, cy, value }) => (
  <text x={cx} y={cy + 8} textAnchor="middle" className="text-2xl font-bold fill-navy">
    <tspan fontSize={32} fontWeight={700} fill="#0F2744">{value}%</tspan>
  </text>
)

function CAFDetail() {
  const [customers, setCustomers] = useState(getAllCustomers)
  useEffect(() => subscribeCustomers(() => setCustomers(getAllCustomers())), [])
  const stats = useMemo(() => computeCafStats(customers), [customers])
  const maxIssueCount = Math.max(1, stats.counts.Submitted, stats.counts.Pending, stats.counts.Rejected)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total CAFs',       value: stats.total.toLocaleString('en-IN'),     color: 'text-gray-900' },
          { label: 'Compliant CAFs',   value: stats.compliant.toLocaleString('en-IN'), color: 'text-green-600' },
          { label: 'Incomplete CAFs',  value: stats.incomplete.toLocaleString('en-IN'), color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-surface-border">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-surface-border p-5 flex flex-col items-center">
          <h4 className="text-sm font-semibold text-gray-800 mb-2 self-start">Compliance Rate</h4>
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart cx="50%" cy="80%" innerRadius="60%" outerRadius="90%"
              startAngle={180} endAngle={0} data={[{ name: 'Compliance', value: Math.round(stats.complianceRate), fill: '#0A8DCD' }]}>
              <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#f0f4f8' }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="text-3xl font-bold text-navy -mt-10">{stats.complianceRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-1">CAF Compliance</p>
          <div className="mt-3 flex gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-blue inline-block" /> Compliant</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" /> Remaining</span>
          </div>
        </div>

        {/* Status Breakdown — real cafStatus counts (customersData.js),
            same statuses Dashboard.jsx's own CAF Compliance widget shows.
            Replaces the old fabricated "Photo ID missing"/"Signature
            missing" issue-reason breakdown — no real field tracks a
            specific rejection reason anywhere in this app. */}
        <div className="bg-white rounded-xl border border-surface-border p-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Status Breakdown</h4>
          <div className="space-y-2.5">
            {CAF_STATUS_BREAKDOWN_META.map(s => (
              <div key={s.key}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{s.label}</span><span className="font-medium">{stats.counts[s.key]}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(stats.counts[s.key] / maxIssueCount) * 100}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">Incomplete CAF List</h4>
          <Badge variant="yellow" size="sm">{stats.incompleteCustomers.length} pending action</Badge>
        </div>
        {stats.incompleteCustomers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No incomplete CAFs — every customer is fully compliant.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-surface-border">
                {['CAF No.', 'Customer', 'Plan', 'CAF Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {stats.incompleteCustomers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.cafNo ?? c.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3"><Badge variant="blue" size="sm">{c.plan ?? '—'}</Badge></td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-amber-600 text-xs font-medium">
                      <AlertCircle size={12} />{c.cafStatus ?? 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="xs">Upload Docs</Button>
                      <Button variant="ghost" size="xs">Send SMS</Button>
                    </div>
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

// Self-contained, live-subscribed detail view (same pattern as
// RevenueDetail/CAFDetail above) — reuses computeChurnByMonth()
// (src/utils/churnStats.js), real join dates (customersData.js's
// createdOn) and real status-change timestamps (statusChangedAt, set by
// every updateCustomer() call — see that function's own comment). Shows
// every month with real data rather than a fixed recent window
// (churnStats.js's own comment explains why: createdOn is backfilled
// history, not recent activity like paymentsStore.js).
function ChurnDetail() {
  const [customers, setCustomers] = useState(getAllCustomers)
  useEffect(() => subscribeCustomers(() => setCustomers(getAllCustomers())), [])

  const byMonth = useMemo(() => computeChurnByMonth(customers), [customers])
  const totalNewJoins = useMemo(() => byMonth.reduce((sum, m) => sum + m.newJoins, 0), [byMonth])
  const totalChurned = useMemo(() => byMonth.reduce((sum, m) => sum + m.churned, 0), [byMonth])
  const netGrowth = useMemo(() => byMonth.reduce((sum, m) => sum + m.net, 0), [byMonth])
  const avgNewJoins = byMonth.length === 0 ? 0 : totalNewJoins / byMonth.length
  const avgChurned = byMonth.length === 0 ? 0 : totalChurned / byMonth.length
  const currentlyAtRisk = useMemo(() => countCurrentlyAtRisk(customers), [customers])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Avg Monthly Churn',    value: `${avgChurned.toFixed(1)}/mo`, color: 'text-red-500' },
          { label: 'Avg New Joins',        value: `${avgNewJoins.toFixed(1)}/mo`, color: 'text-green-600' },
          { label: 'Net Growth (to date)', value: `${netGrowth >= 0 ? '+' : ''}${netGrowth}`, color: 'text-brand-blue' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-surface-border">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-surface-border p-5">
        <h4 className="text-sm font-semibold text-gray-800 mb-4">Churn vs New Joins</h4>
        {byMonth.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">No customer join or status-change data recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={byMonth} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorJoin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorChurn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="newJoins" name="New Joins" stroke="#059669" fill="url(#colorJoin)" strokeWidth={2} />
              <Area type="monotone" dataKey="churned"  name="Churned (Disconnected)" stroke="#ef4444" fill="url(#colorChurn)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        <p className="text-[11px] text-gray-400 mt-3">
          {currentlyAtRisk} customer{currentlyAtRisk !== 1 ? 's' : ''} currently suspended or inactive — shown as "at risk", not counted as churn unless later marked Disconnected. Churn/new-join history only reflects real join dates and status changes recorded in this app, going forward from today for status changes.
        </p>
      </div>
    </div>
  )
}

// Self-contained, live-subscribed detail view (same pattern as
// RevenueDetail/CAFDetail above) — collected side reuses
// computeRevenueByMonth() (src/utils/revenueStats.js, via
// computeCollectionByMonth()), the exact same real, live paymentsStore.js
// aggregation the Revenue Report uses; pending side reads invoicesStore.js
// directly (getOutstandingInvoices()/getOutstandingTotal()), the same real
// functions Dashboard.jsx's own "Overdue Payments" widget already uses, so
// neither disagrees with the other.
function CollectionDetail() {
  const [payments, setPayments] = useState(getPayments)
  useEffect(() => subscribePayments(setPayments), [])
  const [invoices, setInvoices] = useState(getInvoices)
  useEffect(() => subscribeInvoices(setInvoices), [])

  const byMonth = useMemo(() => computeCollectionByMonth(payments, invoices), [payments, invoices])
  const shownMonths = useMemo(
    () => (byMonth.length <= REVENUE_MONTHS_SHOWN ? byMonth : byMonth.slice(-REVENUE_MONTHS_SHOWN)),
    [byMonth]
  )
  const periodCollected = useMemo(() => shownMonths.reduce((sum, m) => sum + m.collected, 0), [shownMonths])
  const outstandingInvoices = useMemo(() => getOutstandingInvoices(), [invoices])
  const outstandingTotal = useMemo(() => getOutstandingTotal(), [invoices])
  const collectionRate = (periodCollected + outstandingTotal) === 0
    ? 0 : (periodCollected / (periodCollected + outstandingTotal)) * 100

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: `Collected (${shownMonths.length || REVENUE_MONTHS_SHOWN}m)`, value: `₹${periodCollected.toLocaleString('en-IN')}`, color: 'text-green-600' },
          { label: 'Pending (Outstanding)', value: `₹${outstandingTotal.toLocaleString('en-IN')}`, color: 'text-amber-600' },
          { label: 'Collection Rate', value: `${collectionRate.toFixed(1)}%`, color: 'text-brand-blue' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-surface-border">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-surface-border p-5">
        <h4 className="text-sm font-semibold text-gray-800 mb-4">Monthly Collection vs Pending</h4>
        {shownMonths.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">No payments or invoices recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={shownMonths} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="collected" name="Collected" fill="#059669" radius={[4,4,0,0]} />
              <Bar dataKey="pending"   name="Pending"   fill="#E8541A" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <p className="text-[11px] text-gray-400 mt-3">
          Pending amounts reflect aggregate invoice data, not per-customer billing records.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">Outstanding Invoices</h4>
          <Badge variant="yellow" size="sm">{outstandingInvoices.length} pending</Badge>
        </div>
        {outstandingInvoices.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No outstanding invoices.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-surface-border">
                {['Invoice No.', 'Package', 'Date', 'Amount (₹)', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {outstandingInvoices.map(inv => (
                <tr key={inv.no} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{inv.no}</td>
                  <td className="px-4 py-3 text-gray-700">{inv.pkg}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{inv.date}</td>
                  <td className="px-4 py-3 font-semibold text-amber-600">₹{inv.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3"><Badge variant="yellow" size="sm" className="capitalize">{inv.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function PartnerDetail() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <h4 className="text-sm font-semibold text-gray-800">Store-wise Collection Summary</h4>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-surface-border">
              {['Store / Partner', 'Collected (₹)', 'Pending (₹)', 'Collection %', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {PARTNER_COLLECTION.map(p => (
              <tr key={p.partner} className="hover:bg-gray-50/60">
                <td className="px-4 py-3 font-medium text-gray-800">{p.partner}</td>
                <td className="px-4 py-3 font-semibold text-green-600">₹{p.collected.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-amber-600 font-medium">₹{p.pending.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${p.pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-600 font-medium">{p.pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3"><Badge variant={p.pct >= 95 ? 'green' : 'yellow'} size="sm">{p.pct >= 95 ? 'On Target' : 'Below Target'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Self-contained, live-subscribed detail view (same pattern as
// RevenueDetail/CAFDetail above) — reuses computeInventoryByCategory()
// (src/utils/inventoryStats.js), the exact same category rollup and
// low-stock definition InventoryOverview.jsx's own summary cards/table use,
// so this report and Inventory Overview can never disagree with each
// other. Also subscribes to inventoryLedger.js directly (not just
// productStore.js) since a product's availability can change from a
// purchase/assignment/transfer/repair/scrap event without the product
// master record itself changing.
function InventoryReportDetail() {
  const [products, setProducts] = useState(getProducts)
  useEffect(() => subscribeProducts(setProducts), [])
  const [ledgerTick, setLedgerTick] = useState(0)
  useEffect(() => subscribeInventoryLedger(() => setLedgerTick(n => n + 1)), [])

  const byCategory = useMemo(() => computeInventoryByCategory(products), [products, ledgerTick])
  const totalLowStock = useMemo(() => byCategory.reduce((sum, c) => sum + c.lowStockCount, 0), [byCategory])

  const [selectedCategory, setSelectedCategory] = useState(null)
  const activeCategory = byCategory.find(c => c.category === selectedCategory) ?? byCategory[0] ?? null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total SKUs Tracked', value: products.length.toLocaleString('en-IN'), color: 'text-gray-900' },
          { label: 'Low Stock SKUs',     value: totalLowStock.toLocaleString('en-IN'),    color: totalLowStock > 0 ? 'text-amber-600' : 'text-emerald-600' },
          { label: 'Categories',         value: byCategory.length.toLocaleString('en-IN'), color: 'text-brand-blue' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-surface-border">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {byCategory.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-16">No products tracked yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-surface-border p-5">
              <h4 className="text-sm font-semibold text-gray-800 mb-4">Stock by Category</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byCategory} dataKey="availableQty" nameKey="category"
                    cx="50%" cy="50%" outerRadius={80} label={({ category, availableQty }) => `${category}: ${availableQty}`}
                    labelLine={false} fontSize={11}>
                    {byCategory.map(c => <Cell key={c.category} fill={CATEGORY_COLORS[c.category] ?? CATEGORY_COLOR_FALLBACK} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-surface-border p-5">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Category Breakdown</h4>
              <p className="text-xs text-gray-400 mb-3">Select a category to view its products below.</p>
              <div className="space-y-1">
                {byCategory.map(c => {
                  const maxQty = Math.max(1, ...byCategory.map(x => x.availableQty))
                  const color = CATEGORY_COLORS[c.category] ?? CATEGORY_COLOR_FALLBACK
                  const isActive = activeCategory?.category === c.category
                  return (
                    <button key={c.category} onClick={() => setSelectedCategory(c.category)}
                      className={`w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${isActive ? 'bg-brand-blue/5 ring-1 ring-brand-blue/30' : 'hover:bg-gray-50'}`}>
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-sm text-gray-700 flex-1">{c.category}</span>
                      {c.lowStockCount > 0 && (
                        <Badge variant="yellow" size="sm">{c.lowStockCount} low</Badge>
                      )}
                      <span className="text-sm font-semibold text-gray-900 w-14 text-right">{c.availableQty.toLocaleString('en-IN')}</span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(c.availableQty / maxQty) * 100}%`, background: color }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800">{activeCategory?.category} — Products</h4>
              <Badge variant="blue" size="sm">{activeCategory?.productCount ?? 0} SKUs</Badge>
            </div>
            {!activeCategory || activeCategory.products.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No products in this category.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-surface-border">
                    {['Product', 'SKU', 'Type', 'Available Qty', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {activeCategory.products.map(({ product, availableQty, lowStock }) => (
                    <tr key={product.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-800">{product.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{product.sku || '—'}</td>
                      <td className="px-4 py-3"><Badge variant={product.productType === 'wire' ? 'orange' : 'blue'} size="sm" className="capitalize">{product.productType}</Badge></td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-xs ${lowStock ? 'text-red-600' : 'text-gray-800'}`}>{formatAvailableQty(product, availableQty)}</span>
                        {lowStock && <AlertCircle size={12} className="inline-block ml-1.5 text-amber-500" />}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={lowStock ? 'yellow' : 'green'} size="sm">{lowStock ? 'Low Stock' : 'In Stock'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const DETAIL_VIEWS = {
  revenue:   RevenueDetail,
  caf:       CAFDetail,
  churn:     ChurnDetail,
  collection: CollectionDetail,
  partner:   PartnerDetail,
  inventory: InventoryReportDetail,
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const [active,    setActive]    = useState(null)
  const [dateFrom,  setDateFrom]  = useState(() => `${new Date().getFullYear()}-01-01`)
  const [dateTo,    setDateTo]    = useState(() => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0])

  // Real CAF compliance stats (customersData.js), same source CAFDetail
  // below reads independently — overrides just the 'caf' card's static
  // value/sub/badge below so the summary card and its own detail view can
  // never show two different numbers.
  const [customers, setCustomers] = useState(getAllCustomers)
  useEffect(() => subscribeCustomers(() => setCustomers(getAllCustomers())), [])
  const cafStats = useMemo(() => computeCafStats(customers), [customers])

  // Real churn stats (customersData.js's createdOn/statusChangedAt via
  // churnStats.js — same computeChurnByMonth() this page's own
  // ChurnDetail uses), overriding just the 'churn' card's static value/
  // sub/badge so it can never disagree with it.
  const churnByMonth = useMemo(() => computeChurnByMonth(customers), [customers])
  const churnStats = useMemo(() => {
    const totalNewJoins = churnByMonth.reduce((sum, m) => sum + m.newJoins, 0)
    const totalChurned = churnByMonth.reduce((sum, m) => sum + m.churned, 0)
    const netGrowth = churnByMonth.reduce((sum, m) => sum + m.net, 0)
    const avgChurned = churnByMonth.length === 0 ? 0 : totalChurned / churnByMonth.length
    return { totalNewJoins, totalChurned, netGrowth, avgChurned, currentlyAtRisk: countCurrentlyAtRisk(customers) }
  }, [churnByMonth, customers])

  // Real revenue stats (paymentsStore.js/customersData.js via
  // revenueStats.js — same helpers Dashboard.jsx's Revenue Overview and
  // this page's own RevenueDetail use), overriding just the 'revenue'
  // card's static value/sub/badge and the summary strip above so neither
  // can ever show a different number than RevenueDetail itself.
  const [payments, setPayments] = useState(getPayments)
  useEffect(() => subscribePayments(setPayments), [])
  const revenueByPlan = useMemo(() => computeRevenueByPlan(customers, payments), [customers, payments])
  const revenueStats = useMemo(() => {
    const byMonth = computeRevenueByMonth(payments)
    const shownMonths = byMonth.length <= REVENUE_MONTHS_SHOWN ? byMonth : byMonth.slice(-REVENUE_MONTHS_SHOWN)
    const periodRevenue = shownMonths.reduce((sum, m) => sum + m.collected, 0)
    const activeCustomerCount = customers.filter(c => effectiveStatus(c) === 'active').length
    const latestMonth = shownMonths[shownMonths.length - 1]
    const currentMonthRevenue = latestMonth?.collected ?? 0
    const currentMonthLabel = latestMonth?.month ?? new Date().toLocaleDateString('en-US', { month: 'short' })
    const arpu = activeCustomerCount === 0 ? 0 : currentMonthRevenue / activeCustomerCount
    return {
      shownMonths,
      monthsCounted: shownMonths.length,
      periodRevenue,
      currentMonthRevenue,
      currentMonthLabel,
      activeCustomerCount,
      totalCustomerCount: customers.length,
      arpu,
      currentMonthPaymentCount: payments.filter(p => {
        const [d, m, y] = (p.paymentDate || '').split('-')
        return d && m && y && `${y}-${m}` === latestMonth?.key
      }).length,
    }
  }, [payments, customers])

  // Real inventory stats (productStore.js/inventoryLedger.js via
  // inventoryStats.js — same computeInventoryByCategory() this page's own
  // InventoryReportDetail and InventoryOverview.jsx use), overriding just
  // the 'inventory' card's static value/sub/badge so it can never disagree
  // with either of those.
  const [products, setProducts] = useState(getProducts)
  useEffect(() => subscribeProducts(setProducts), [])
  const [inventoryLedgerTick, setInventoryLedgerTick] = useState(0)
  useEffect(() => subscribeInventoryLedger(() => setInventoryLedgerTick(n => n + 1)), [])
  const inventoryStats = useMemo(() => {
    const byCategory = computeInventoryByCategory(products)
    const lowStockCount = byCategory.reduce((sum, c) => sum + c.lowStockCount, 0)
    return { byCategory, totalProducts: products.length, categoryCount: byCategory.length, lowStockCount }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, inventoryLedgerTick])

  // Real collection stats (paymentsStore.js/invoicesStore.js via
  // collectionStats.js — same computeCollectionByMonth() this page's own
  // CollectionDetail uses, and the same getOutstandingInvoices()/
  // getOutstandingTotal() Dashboard.jsx's "Overdue Payments" widget
  // already reads), overriding just the 'collection' card's static value/
  // sub/badge so it can never disagree with either of those.
  const [invoices, setInvoices] = useState(getInvoices)
  useEffect(() => subscribeInvoices(setInvoices), [])
  const collectionByMonth = useMemo(() => computeCollectionByMonth(payments, invoices), [payments, invoices])
  const collectionStats = useMemo(() => {
    const shownMonths = collectionByMonth.length <= REVENUE_MONTHS_SHOWN
      ? collectionByMonth : collectionByMonth.slice(-REVENUE_MONTHS_SHOWN)
    const periodCollected = shownMonths.reduce((sum, m) => sum + m.collected, 0)
    const outstandingInvoices = getOutstandingInvoices()
    const outstandingTotal = getOutstandingTotal()
    const collectionRate = (periodCollected + outstandingTotal) === 0
      ? 0 : (periodCollected / (periodCollected + outstandingTotal)) * 100
    return { shownMonths, monthsCounted: shownMonths.length, periodCollected, outstandingInvoices, outstandingTotal, collectionRate }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionByMonth, invoices])

  // Granular Reports permissions (rolesStore.js's MODULE_MICRO_PERMISSIONS.
  // Reports) — defined there with role presets but never read anywhere
  // until now, so every role saw and could open/export all 6 reports
  // regardless of its configured permissions. Each hook call is reactive
  // (re-renders this page if an admin edits the current user's role live),
  // same as every other useMicroPermission() call site in this app.
  const canViewRevenue    = useMicroPermission('Reports', 'viewRevenueReport')
  const canViewCaf        = useMicroPermission('Reports', 'viewCafComplianceReport')
  const canViewChurn      = useMicroPermission('Reports', 'viewChurnReport')
  const canViewCollection = useMicroPermission('Reports', 'viewCollectionReport')
  const canViewPartner    = useMicroPermission('Reports', 'viewPartnerStoreCollectionReport')
  const canViewInventory  = useMicroPermission('Reports', 'viewInventoryReport')
  const canExport         = useMicroPermission('Reports', 'exportReportsToExcel')
  const reportPermissions = {
    revenue: canViewRevenue, caf: canViewCaf, churn: canViewChurn,
    collection: canViewCollection, partner: canViewPartner, inventory: canViewInventory,
  }

  const reportCards = useMemo(() => REPORT_CARDS.map(card => {
    if (card.id === 'caf') {
      return {
        ...card,
        value: `${cafStats.complianceRate.toFixed(1)}%`,
        sub: `${cafStats.incomplete} incomplete CAF${cafStats.incomplete !== 1 ? 's' : ''}`,
        badge: cafStats.incomplete > 0
          ? { label: 'Action needed', variant: 'yellow' }
          : { label: 'Fully compliant', variant: 'green' },
      }
    }
    if (card.id === 'revenue') {
      return {
        ...card,
        value: `₹${revenueStats.periodRevenue.toLocaleString('en-IN')}`,
        sub: `Last ${revenueStats.monthsCounted || REVENUE_MONTHS_SHOWN} month${revenueStats.monthsCounted === 1 ? '' : 's'} total`,
        badge: revenueStats.currentMonthPaymentCount > 0
          ? { label: `${revenueStats.currentMonthPaymentCount} payment${revenueStats.currentMonthPaymentCount !== 1 ? 's' : ''} this month`, variant: 'green' }
          : { label: 'No payments this month', variant: 'gray' },
      }
    }
    if (card.id === 'inventory') {
      return {
        ...card,
        value: `${inventoryStats.totalProducts.toLocaleString('en-IN')} SKUs`,
        sub: `Across ${inventoryStats.categoryCount} categor${inventoryStats.categoryCount === 1 ? 'y' : 'ies'}`,
        badge: inventoryStats.lowStockCount > 0
          ? { label: `${inventoryStats.lowStockCount} low stock`, variant: 'red' }
          : { label: 'All in stock', variant: 'green' },
      }
    }
    if (card.id === 'collection') {
      return {
        ...card,
        value: `${collectionStats.collectionRate.toFixed(1)}%`,
        sub: 'Collection efficiency',
        badge: collectionStats.outstandingTotal > 0
          ? { label: `₹${collectionStats.outstandingTotal.toLocaleString('en-IN')} pending`, variant: 'orange' }
          : { label: 'Fully collected', variant: 'green' },
      }
    }
    if (card.id === 'churn') {
      const churnRate = customers.length === 0 ? 0 : (churnStats.totalChurned / customers.length) * 100
      return {
        ...card,
        value: `${churnRate.toFixed(1)}%`,
        sub: 'Cumulative churn rate',
        badge: churnStats.totalChurned > 0
          ? { label: `${churnStats.totalChurned} churned`, variant: 'red' }
          : { label: 'No churn recorded yet', variant: 'green' },
      }
    }
    return card
  }), [cafStats, revenueStats, inventoryStats, collectionStats, churnStats, customers])

  // Cards the current user's role can't view are left out of the grid
  // entirely — not rendered greyed-out/disabled — same convention as every
  // other useMicroPermission()-gated button in this app.
  const visibleReportCards = reportCards.filter(card => reportPermissions[card.id])
  const activeAllowed = !!active && !!reportPermissions[active]
  const activeCard = activeAllowed ? reportCards.find(c => c.id === active) : null
  const DetailView = activeAllowed ? DETAIL_VIEWS[active] : null

  // Export sheets for one report, built from the exact same real (or,
  // for reports not yet wired to real data, mock) source each report's own
  // detail view above renders — so the exported file always matches what's
  // currently on screen. Revenue/CAF Compliance/Inventory/Collection/Churn
  // are real, live data; Partner & Store-wise Collection is still the
  // static mock its detail view renders (see this file's audit-trail
  // comment above it) — exporting it just captures that same mock
  // snapshot, not real numbers, until that report is wired up too.
  function buildExportSheets(id) {
    switch (id) {
      case 'revenue':
        return [
          {
            name: 'Revenue - Monthly',
            rows: revenueStats.shownMonths.map(m => ({ Month: m.month, 'Revenue (₹)': m.collected })),
          },
          {
            name: 'Revenue - By Plan',
            rows: revenueByPlan.map(r => ({
              Plan: r.plan, 'Active Customers': r.customers,
              'Revenue (₹)': r.revenue, 'Share %': Number(r.pct.toFixed(1)),
            })),
          },
        ]
      case 'caf':
        return [
          {
            name: 'CAF Summary',
            rows: [{
              'Total CAFs': cafStats.total, 'Compliant CAFs': cafStats.compliant,
              'Incomplete CAFs': cafStats.incomplete, 'Compliance Rate %': Number(cafStats.complianceRate.toFixed(1)),
              Submitted: cafStats.counts.Submitted, 'Not Yet Uploaded': cafStats.counts.Pending,
              Rejected: cafStats.counts.Rejected,
            }],
          },
          {
            name: 'Incomplete CAFs',
            rows: cafStats.incompleteCustomers.map(c => ({
              'CAF No.': c.cafNo ?? c.id, Customer: c.name, Plan: c.plan ?? '—',
              'CAF Status': c.cafStatus ?? 'Pending',
            })),
          },
        ]
      case 'churn':
        return [{
          name: 'Churn',
          rows: churnByMonth.map(m => ({
            Month: m.month, 'New Joins': m.newJoins, Churned: m.churned, 'At Risk': m.atRisk, Net: m.net,
          })),
        }]
      case 'collection':
        return [
          {
            name: 'Collection - Monthly',
            rows: collectionStats.shownMonths.map(m => ({
              Month: m.month, 'Collected (₹)': m.collected, 'Pending (₹)': m.pending,
            })),
          },
          {
            name: 'Outstanding Invoices',
            rows: collectionStats.outstandingInvoices.map(inv => ({
              'Invoice No.': inv.no, Package: inv.pkg, Date: inv.date,
              'Amount (₹)': inv.amount, Status: inv.status,
            })),
          },
        ]
      case 'partner':
        return [{
          name: 'Partner Collection',
          rows: PARTNER_COLLECTION.map(r => ({
            'Store / Partner': r.partner, 'Collected (₹)': r.collected,
            'Pending (₹)': r.pending, 'Collection %': r.pct,
          })),
        }]
      case 'inventory':
        return [
          {
            name: 'Inventory by Category',
            rows: inventoryStats.byCategory.map(c => ({
              Category: c.category, 'SKUs': c.productCount,
              'Available Qty': c.availableQty, 'Low Stock SKUs': c.lowStockCount,
            })),
          },
          {
            name: 'Inventory - Products',
            rows: inventoryStats.byCategory.flatMap(c => c.products.map(({ product, availableQty, lowStock }) => ({
              Category: c.category, Product: product.name, SKU: product.sku || '',
              Type: product.productType, 'Available Qty': formatAvailableQty(product, availableQty),
              Status: lowStock ? 'Low Stock' : 'In Stock',
            }))),
          },
        ]
      default:
        return []
    }
  }

  function handleExport() {
    if (!activeAllowed) {
      // List view (or no permitted report currently open) — one workbook
      // with every report the current role can view, each as its own
      // sheet(s), rather than requiring a separate export click per report.
      exportWorkbook('Reports.xlsx', visibleReportCards.flatMap(card => buildExportSheets(card.id)))
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
              {active ? (activeCard?.title ?? 'Access restricted') : 'Reports'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {active ? 'Detailed analytics view' : 'Business analytics and performance reports'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>From</span>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-36 text-xs py-1.5" />
            <span>To</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-36 text-xs py-1.5" />
          </div>
          {canExport && (active ? activeAllowed : visibleReportCards.length > 0) && (
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport}>Export Excel</Button>
          )}
        </div>
      </div>

      {/* Summary stat strip */}
      {!active && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: `Revenue (${revenueStats.currentMonthLabel})`,
              value: `₹${revenueStats.currentMonthRevenue.toLocaleString('en-IN')}`,
              sub: `${revenueStats.currentMonthPaymentCount} payment${revenueStats.currentMonthPaymentCount !== 1 ? 's' : ''} recorded`,
            },
            {
              label: 'Active Customers',
              value: revenueStats.activeCustomerCount.toLocaleString('en-IN'),
              sub: `of ${revenueStats.totalCustomerCount.toLocaleString('en-IN')} total customers`,
            },
            {
              label: 'ARPU',
              value: `₹${Math.round(revenueStats.arpu).toLocaleString('en-IN')}`,
              sub: `${revenueStats.currentMonthLabel} revenue ÷ active customers`,
            },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-5 shadow-card border border-surface-border">
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1.5">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Report cards grid */}
      {!active && visibleReportCards.length === 0 && (
        <div className="bg-white rounded-xl p-10 shadow-card border border-surface-border text-center">
          <Lock size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900">No reports available</p>
          <p className="text-xs text-gray-500 mt-1">Your role doesn't have permission to view any reports. Contact an admin if you need access.</p>
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

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
import { getInvoices, getOutstandingInvoices, subscribeInvoices } from '../data/invoicesStore'
import { computeCollectionByMonth } from '../utils/collectionStats'
import { computeChurnByMonth, countCurrentlyAtRisk } from '../utils/churnStats'
import { getStores, subscribeStores } from '../data/storeStore'
import { getPartners, subscribePartners } from '../data/partners'
import { computeStoreCollection, computePartnerCollection } from '../utils/partnerStoreStats'
import { isoFromDMonYYYY, isoFromDMY, isDateInRange, isMonthKeyInRange, monthLabelFromKey } from '../utils/dateFormats'
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

// Shared date-range filters for this page's own date picker (dateFrom/
// dateTo state in Reports(), passed down as `range` to every detail view
// below) — applied against whichever real date field backs each report's
// timeline. Used both by the parent's own card/summary-strip stats and by
// each self-contained detail view, so a report's summary card and its
// detail view are always filtered the same way and can't disagree — with
// one exception: the Revenue Report's own detail view is driven by its
// own separate revenueDateFrom/revenueDateTo state (see Reports()'s own
// comment on it) so it can default to a full 12-month trend without
// widening/narrowing the generic dateFrom/dateTo every other report (and
// the list-view 'revenue' summary card) still uses.
function filterPaymentsByRange(payments, from, to) {
  return payments.filter(p => isDateInRange(isoFromDMY(p.paymentDate), from, to))
}
function filterInvoicesByRange(invoices, from, to) {
  return invoices.filter(inv => isDateInRange(isoFromDMonYYYY(inv.date), from, to))
}
// CAF Compliance has no submission-date field of its own — no rejection
// reason or submission timestamp is tracked anywhere for it (see
// customersData.js's own CAF_STATUSES comment). createdOn (real join
// date) is used as the closest real proxy for "when this customer's CAF
// entered the system" — the same date this page's Churn Report treats as
// the real signal for "new" activity.
function filterCustomersByCreatedOn(customers, from, to) {
  return customers.filter(c => isDateInRange(isoFromDMonYYYY(c.createdOn), from, to))
}

// Continuous "YYYY-MM"-keyed month sequence between two ISO day-precision
// bounds (inclusive), walked with plain integer year/month arithmetic —
// not a `Date` object — for the same reason dateFormats.js's own header
// comment gives for its own parsing helpers: no locale/timezone-dependent
// Date math to silently misplace a month boundary.
function monthKeysInRange(fromISO, toISO) {
  const [fy, fm] = fromISO.slice(0, 7).split('-').map(Number)
  const [ty, tm] = toISO.slice(0, 7).split('-').map(Number)
  const keys = []
  let y = fy, m = fm
  while (y < ty || (y === ty && m <= tm)) {
    keys.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }
  return keys
}

// Fills any month in [from, to] that has no real payment data with a
// zero-value entry, so the Revenue Report's Month-wise Revenue chart
// always shows a visually continuous timeline (all 12 months of its own
// default range, in order) instead of silently skipping months nothing
// was paid in. computeRevenueByMonth() itself only returns months that
// actually have a real payment (see its own comment in revenueStats.js)
// — the right behavior for Dashboard.jsx's Revenue Overview, which has no
// business fabricating a flat-0 history before this mock backend had any
// real payment data at all, but wrong for a report meant to plot one
// continuous trend line across a chosen range.
function fillMonthRange(shownMonths, fromISO, toISO) {
  if (!fromISO || !toISO) return shownMonths
  const byKey = new Map(shownMonths.map(m => [m.key, m]))
  return monthKeysInRange(fromISO, toISO).map(key =>
    byKey.get(key) ?? { key, month: monthLabelFromKey(key), collected: 0 }
  )
}

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
// below) — accepts the page-level `range` prop (dateFrom/dateTo) and
// filters real payments to it via filterPaymentsByRange() above, so the
// monthly trend, its totals, and the plan-wise breakdown all reflect
// whatever date range the user picked rather than a fixed recent window.
function RevenueDetail({ range }) {
  const [customers, setCustomers] = useState(getAllCustomers)
  useEffect(() => subscribeCustomers(() => setCustomers(getAllCustomers())), [])
  const [payments, setPayments] = useState(getPayments)
  useEffect(() => subscribePayments(setPayments), [])

  const filteredPayments = useMemo(
    () => filterPaymentsByRange(payments, range?.from, range?.to),
    [payments, range?.from, range?.to]
  )
  // Zero-filled so the chart below always plots a continuous timeline
  // across the selected range (e.g. all 12 months of this report's own
  // default) rather than only the months that happen to have a payment.
  const shownMonths = useMemo(
    () => fillMonthRange(computeRevenueByMonth(filteredPayments), range?.from, range?.to),
    [filteredPayments, range?.from, range?.to]
  )
  const totalRevenue = useMemo(() => shownMonths.reduce((sum, m) => sum + m.collected, 0), [shownMonths])
  const activeCustomerCount = useMemo(() => customers.filter(c => effectiveStatus(c) === 'active').length, [customers])
  const latestMonth = shownMonths[shownMonths.length - 1]
  const currentMonthRevenue = latestMonth?.collected ?? 0
  const currentMonthLabel = latestMonth?.month ?? new Date().toLocaleDateString('en-US', { month: 'short' })
  const arpu = activeCustomerCount === 0 ? 0 : currentMonthRevenue / activeCustomerCount

  const revenueByPlan = useMemo(() => computeRevenueByPlan(customers, filteredPayments), [customers, filteredPayments])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Revenue (Selected Range)', value: `₹${totalRevenue.toLocaleString('en-IN')}` },
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
          <p className="text-sm text-gray-400 text-center py-16">No payments recorded in the selected date range.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={shownMonths} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              {/* interval={0} forces every month label to render rather than
                  recharts auto-skipping some to avoid overlap — with up to
                  12 short 3-letter labels (this report's own default range)
                  there's always room for all of them. */}
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
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

// Accepts the page-level `range` prop — CAF Compliance has no submission-
// date field of its own, so customers are filtered by createdOn (real
// join date), the closest real proxy (see filterCustomersByCreatedOn()'s
// own comment above).
function CAFDetail({ range }) {
  const [customers, setCustomers] = useState(getAllCustomers)
  useEffect(() => subscribeCustomers(() => setCustomers(getAllCustomers())), [])
  const filteredCustomers = useMemo(
    () => filterCustomersByCreatedOn(customers, range?.from, range?.to),
    [customers, range?.from, range?.to]
  )
  const stats = useMemo(() => computeCafStats(filteredCustomers), [filteredCustomers])
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
      <p className="text-[11px] text-gray-400 -mt-4">
        CAF Compliance has no submission-date field of its own — filtered above by each customer's join date (Customer Since) instead, the closest real date this app tracks per customer.
      </p>

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
// every updateCustomer() call — see that function's own comment). Accepts
// the page-level `range` prop and narrows the monthly series to it by
// filtering on each month's own "YYYY-MM" key rather than filtering
// customers directly — a customer's createdOn (feeds newJoins) and
// statusChangedAt (feeds churned) can easily fall in different months, so
// filtering the already-bucketed output is the only way to keep both
// series correct at once.
function ChurnDetail({ range }) {
  const [customers, setCustomers] = useState(getAllCustomers)
  useEffect(() => subscribeCustomers(() => setCustomers(getAllCustomers())), [])

  const byMonth = useMemo(() => {
    const all = computeChurnByMonth(customers)
    return all.filter(m => isMonthKeyInRange(m.key, range?.from, range?.to))
  }, [customers, range?.from, range?.to])
  const totalNewJoins = useMemo(() => byMonth.reduce((sum, m) => sum + m.newJoins, 0), [byMonth])
  const totalChurned = useMemo(() => byMonth.reduce((sum, m) => sum + m.churned, 0), [byMonth])
  const netGrowth = useMemo(() => byMonth.reduce((sum, m) => sum + m.net, 0), [byMonth])
  const avgNewJoins = byMonth.length === 0 ? 0 : totalNewJoins / byMonth.length
  const avgChurned = byMonth.length === 0 ? 0 : totalChurned / byMonth.length
  // Live snapshot, not date-filtered — "currently at risk" means right
  // now, independent of when a customer entered that state (see
  // countCurrentlyAtRisk()'s own comment in churnStats.js).
  const currentlyAtRisk = useMemo(() => countCurrentlyAtRisk(customers), [customers])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Avg Monthly Churn',           value: `${avgChurned.toFixed(1)}/mo`, color: 'text-red-500' },
          { label: 'Avg New Joins',               value: `${avgNewJoins.toFixed(1)}/mo`, color: 'text-green-600' },
          { label: 'Net Growth (Selected Range)', value: `${netGrowth >= 0 ? '+' : ''}${netGrowth}`, color: 'text-brand-blue' },
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
          <p className="text-sm text-gray-400 text-center py-16">No customer join or status-change data in the selected date range.</p>
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
// aggregation the Revenue Report uses; pending side filters invoicesStore.js's
// own getOutstandingInvoices() (the same real function Dashboard.jsx's
// "Overdue Payments" widget uses) down to the selected date range by each
// invoice's own issue date. Accepts the page-level `range` prop and
// applies it to both sides.
function CollectionDetail({ range }) {
  const [payments, setPayments] = useState(getPayments)
  useEffect(() => subscribePayments(setPayments), [])
  const [invoices, setInvoices] = useState(getInvoices)
  useEffect(() => subscribeInvoices(setInvoices), [])

  const filteredPayments = useMemo(
    () => filterPaymentsByRange(payments, range?.from, range?.to),
    [payments, range?.from, range?.to]
  )
  const filteredInvoices = useMemo(
    () => filterInvoicesByRange(invoices, range?.from, range?.to),
    [invoices, range?.from, range?.to]
  )
  const shownMonths = useMemo(
    () => computeCollectionByMonth(filteredPayments, filteredInvoices),
    [filteredPayments, filteredInvoices]
  )
  const periodCollected = useMemo(() => shownMonths.reduce((sum, m) => sum + m.collected, 0), [shownMonths])
  const outstandingInvoices = useMemo(
    () => filterInvoicesByRange(getOutstandingInvoices(), range?.from, range?.to),
    [invoices, range?.from, range?.to]
  )
  const outstandingTotal = useMemo(
    () => outstandingInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0),
    [outstandingInvoices]
  )
  const collectionRate = (periodCollected + outstandingTotal) === 0
    ? 0 : (periodCollected / (periodCollected + outstandingTotal)) * 100

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Collected (Selected Range)', value: `₹${periodCollected.toLocaleString('en-IN')}`, color: 'text-green-600' },
          { label: 'Pending (Selected Range)', value: `₹${outstandingTotal.toLocaleString('en-IN')}`, color: 'text-amber-600' },
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
          <p className="text-sm text-gray-400 text-center py-16">No payments or invoices in the selected date range.</p>
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
          Pending amounts reflect aggregate invoice data, not per-customer billing records, filtered to invoices issued within the selected date range.
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

// Self-contained, live-subscribed detail view (same pattern as
// RevenueDetail/CAFDetail above) — reuses computeStoreCollection()/
// computePartnerCollection() (src/utils/partnerStoreStats.js), the real
// join between customersData.js's storeId/partnerId and each customer's
// real paymentsStore.js payments. No "Pending"/"Collection %" columns
// like the old mock had — there's no real per-store/per-partner pending
// figure anywhere in this app (partnerStoreStats.js's own comment
// explains why: invoicesStore.js has no customerId to attribute a
// pending invoice through). Accepts the page-level `range` prop and
// filters the payments fed into the aggregation to it — customer counts
// stay unfiltered (which store/partner a customer belongs to is a current
// assignment, not a dated event).
function PartnerDetail({ range }) {
  const [customers, setCustomers] = useState(getAllCustomers)
  useEffect(() => subscribeCustomers(() => setCustomers(getAllCustomers())), [])
  const [payments, setPayments] = useState(getPayments)
  useEffect(() => subscribePayments(setPayments), [])
  const [stores, setStores] = useState(getStores)
  useEffect(() => subscribeStores(setStores), [])
  const [partners, setPartners] = useState(getPartners)
  useEffect(() => subscribePartners(setPartners), [])

  const filteredPayments = useMemo(
    () => filterPaymentsByRange(payments, range?.from, range?.to),
    [payments, range?.from, range?.to]
  )
  const storeRows = useMemo(
    () => computeStoreCollection(customers, filteredPayments, stores),
    [customers, filteredPayments, stores]
  )
  const partnerRows = useMemo(
    () => computePartnerCollection(customers, filteredPayments, partners),
    [customers, filteredPayments, partners]
  )

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <h4 className="text-sm font-semibold text-gray-800">Store-wise Collection</h4>
        </div>
        {storeRows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No stores configured yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-surface-border">
                {['Store', 'Customers', 'Collected (₹)', 'Share %'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {storeRows.map(s => (
                <tr key={s.storeId} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.storeName}</td>
                  <td className="px-4 py-3 text-gray-700">{s.customerCount}</td>
                  <td className="px-4 py-3 font-semibold text-green-600">₹{s.collected.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${s.pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 font-medium">{s.pct.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <h4 className="text-sm font-semibold text-gray-800">Partner-wise Collection</h4>
        </div>
        {partnerRows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No partners configured yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-surface-border">
                {['Partner', 'Customers', 'Collected (₹)', 'Share %'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {partnerRows.map(p => (
                <tr key={p.partnerId ?? 'direct'} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.partnerName}</td>
                  <td className="px-4 py-3 text-gray-700">{p.customerCount}</td>
                  <td className="px-4 py-3 font-semibold text-green-600">₹{p.collected.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-blue rounded-full" style={{ width: `${p.pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 font-medium">{p.pct.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[11px] text-gray-400">
        Pending/overdue amounts can't be attributed to a specific store or partner yet — invoice records in this app aren't linked to individual customers. Collected amounts above are filtered to the selected date range; customer counts reflect each customer's current store/partner assignment regardless of date.
      </p>
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
//
// Deliberately ignores the page-level date range — stock levels are a
// live snapshot (how much is available right now), not a trend with a
// start/end date the way payments or join dates are. Reports() hides the
// date picker entirely while this report is open rather than leaving it
// present but inert, and this note explains why for anyone exporting or
// otherwise expecting it to have filtered something.
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
      <p className="text-[11px] text-gray-400 -mt-4">
        Date range not applicable — inventory levels reflect current stock, not a historical trend.
      </p>

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
  const [active, setActive] = useState(null)
  // Defaults to a rolling 2-year window ending today — wide enough to
  // cover customersData.js's real createdOn backfill (spread over roughly
  // the past 1-2 years) and any real payments recorded this session, so
  // reports aren't empty on first load. The old default (Jan 1 of the
  // current year to the end of the current month) cut off most of that
  // real join history and included future dates within the month that
  // could never have real data.
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 2)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))

  // Revenue Report's own default date range — a clean rolling 12 months
  // (this calendar month back through the same month last year), kept
  // separate from the generic 2-year default above rather than changing
  // it: CAF/Churn/Collection/Partner all still need that wider window so
  // their own real data (customersData.js's createdOn, backfilled 1-2
  // years) doesn't load looking empty. The Revenue Report specifically
  // wants a full-but-compact 12-bar month-wise trend by default. Still
  // freely adjustable via the same From/To picker below — this only sets
  // the initial range shown on first load.
  const [revenueDateFrom, setRevenueDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - 11)
    return d.toISOString().slice(0, 10)
  })
  const [revenueDateTo, setRevenueDateTo] = useState(() => new Date().toISOString().slice(0, 10))

  // Real CAF compliance stats (customersData.js), same source CAFDetail
  // below reads independently — overrides just the 'caf' card's static
  // value/sub/badge below so the summary card and its own detail view can
  // never show two different numbers. Filtered by createdOn (see
  // filterCustomersByCreatedOn()'s own comment above) since CAF Compliance
  // has no submission-date field of its own.
  const [customers, setCustomers] = useState(getAllCustomers)
  useEffect(() => subscribeCustomers(() => setCustomers(getAllCustomers())), [])
  const cafStats = useMemo(
    () => computeCafStats(filterCustomersByCreatedOn(customers, dateFrom, dateTo)),
    [customers, dateFrom, dateTo]
  )

  // Real churn stats (customersData.js's createdOn/statusChangedAt via
  // churnStats.js — same computeChurnByMonth() this page's own
  // ChurnDetail uses), overriding just the 'churn' card's static value/
  // sub/badge so it can never disagree with it. Filtered by each month's
  // own key, same reasoning ChurnDetail's own comment gives.
  const churnByMonth = useMemo(() => {
    const all = computeChurnByMonth(customers)
    return all.filter(m => isMonthKeyInRange(m.key, dateFrom, dateTo))
  }, [customers, dateFrom, dateTo])
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
  // Shared across Revenue/Collection/Partner sections below — every real
  // payment amount this page aggregates is scoped to the same selected
  // date range, via the same filterPaymentsByRange() the detail views use.
  const filteredPayments = useMemo(
    () => filterPaymentsByRange(payments, dateFrom, dateTo),
    [payments, dateFrom, dateTo]
  )
  const revenueByPlan = useMemo(
    () => computeRevenueByPlan(customers, filteredPayments),
    [customers, filteredPayments]
  )
  const revenueStats = useMemo(() => {
    const shownMonths = computeRevenueByMonth(filteredPayments)
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
      currentMonthPaymentCount: filteredPayments.filter(p => {
        const [d, m, y] = (p.paymentDate || '').split('-')
        return d && m && y && `${y}-${m}` === latestMonth?.key
      }).length,
    }
  }, [filteredPayments, customers])

  // Real inventory stats (productStore.js/inventoryLedger.js via
  // inventoryStats.js — same computeInventoryByCategory() this page's own
  // InventoryReportDetail and InventoryOverview.jsx use), overriding just
  // the 'inventory' card's static value/sub/badge so it can never disagree
  // with either of those. Not date-filtered — see InventoryReportDetail's
  // own comment on why a stock snapshot has no date dimension to filter.
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
  // CollectionDetail uses, and the same getOutstandingInvoices()
  // Dashboard.jsx's "Overdue Payments" widget already reads), overriding
  // just the 'collection' card's static value/sub/badge so it can never
  // disagree with either of those. Both collected and pending sides are
  // scoped to the selected date range.
  const [invoices, setInvoices] = useState(getInvoices)
  useEffect(() => subscribeInvoices(setInvoices), [])
  const filteredInvoices = useMemo(
    () => filterInvoicesByRange(invoices, dateFrom, dateTo),
    [invoices, dateFrom, dateTo]
  )
  const collectionByMonth = useMemo(
    () => computeCollectionByMonth(filteredPayments, filteredInvoices),
    [filteredPayments, filteredInvoices]
  )
  const collectionStats = useMemo(() => {
    const shownMonths = collectionByMonth
    const periodCollected = shownMonths.reduce((sum, m) => sum + m.collected, 0)
    const outstandingInvoices = filterInvoicesByRange(getOutstandingInvoices(), dateFrom, dateTo)
    const outstandingTotal = outstandingInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)
    const collectionRate = (periodCollected + outstandingTotal) === 0
      ? 0 : (periodCollected / (periodCollected + outstandingTotal)) * 100
    return { shownMonths, monthsCounted: shownMonths.length, periodCollected, outstandingInvoices, outstandingTotal, collectionRate }
  }, [collectionByMonth, invoices, dateFrom, dateTo])

  // Real partner/store collection stats (customersData.js's storeId/
  // partnerId + paymentsStore.js via partnerStoreStats.js — same
  // computeStoreCollection()/computePartnerCollection() this page's own
  // PartnerDetail uses), overriding just the 'partner' card's static
  // value/sub/badge so it can never disagree with it. Payments are date-
  // filtered; customer-to-store/partner assignment is a current fact, not
  // a dated event, so customer counts aren't.
  const [stores, setStores] = useState(getStores)
  useEffect(() => subscribeStores(setStores), [])
  const [partners, setPartners] = useState(getPartners)
  useEffect(() => subscribePartners(setPartners), [])
  const storeCollection = useMemo(
    () => computeStoreCollection(customers, filteredPayments, stores),
    [customers, filteredPayments, stores]
  )
  const partnerCollection = useMemo(
    () => computePartnerCollection(customers, filteredPayments, partners),
    [customers, filteredPayments, partners]
  )
  const partnerStoreStats = useMemo(() => {
    const totalCollected = storeCollection.reduce((sum, s) => sum + s.collected, 0)
    return { totalCollected, storeCount: stores.length, partnerCount: partners.length, topStore: storeCollection[0] ?? null }
  }, [storeCollection, stores, partners])

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
        sub: revenueStats.monthsCounted > 0
          ? `${revenueStats.monthsCounted} month${revenueStats.monthsCounted === 1 ? '' : 's'} in range`
          : 'No data in range',
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
        sub: 'Churn rate (selected range)',
        badge: churnStats.totalChurned > 0
          ? { label: `${churnStats.totalChurned} churned`, variant: 'red' }
          : { label: 'No churn recorded yet', variant: 'green' },
      }
    }
    if (card.id === 'partner') {
      return {
        ...card,
        value: `₹${partnerStoreStats.totalCollected.toLocaleString('en-IN')}`,
        sub: `${partnerStoreStats.storeCount} stores · ${partnerStoreStats.partnerCount} partners`,
        badge: partnerStoreStats.totalCollected > 0
          ? { label: `Top: ${partnerStoreStats.topStore?.storeName ?? '—'}`, variant: 'green' }
          : { label: 'No collections yet', variant: 'gray' },
      }
    }
    return card
  }), [cafStats, revenueStats, inventoryStats, collectionStats, churnStats, partnerStoreStats, customers])

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
  // currently on screen. All 6 reports are now real, live data.
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
        return [
          {
            name: 'Store Collection',
            rows: storeCollection.map(s => ({
              Store: s.storeName, Customers: s.customerCount,
              'Collected (₹)': s.collected, 'Share %': Number(s.pct.toFixed(1)),
            })),
          },
          {
            name: 'Partner Collection',
            rows: partnerCollection.map(p => ({
              Partner: p.partnerName, Customers: p.customerCount,
              'Collected (₹)': p.collected, 'Share %': Number(p.pct.toFixed(1)),
            })),
          },
        ]
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
          {/* Inventory is a live stock snapshot, not a trend — a date range
              has nothing to filter there (see InventoryReportDetail's own
              note), so the picker is hidden rather than left present but
              inert while that report is open. */}
          {active !== 'inventory' && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>From</span>
              {/* Revenue Report drives this same picker off its own
                  revenueDateFrom/revenueDateTo state (12-month default)
                  rather than the generic dateFrom/dateTo every other
                  report uses, but it's still the one on-screen picker —
                  freely adjustable, not a fixed 12-month lock. */}
              <Input type="date" value={active === 'revenue' ? revenueDateFrom : dateFrom}
                onChange={e => active === 'revenue' ? setRevenueDateFrom(e.target.value) : setDateFrom(e.target.value)}
                className="w-36 text-xs py-1.5" />
              <span>To</span>
              <Input type="date" value={active === 'revenue' ? revenueDateTo : dateTo}
                onChange={e => active === 'revenue' ? setRevenueDateTo(e.target.value) : setDateTo(e.target.value)}
                className="w-36 text-xs py-1.5" />
            </div>
          )}
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
              label: 'Revenue (Selected Range)',
              value: `₹${revenueStats.periodRevenue.toLocaleString('en-IN')}`,
              sub: revenueStats.monthsCounted > 0
                ? `${revenueStats.monthsCounted} month${revenueStats.monthsCounted === 1 ? '' : 's'} in range`
                : 'No data in range',
            },
            {
              label: 'Active Customers',
              value: revenueStats.activeCustomerCount.toLocaleString('en-IN'),
              sub: `of ${revenueStats.totalCustomerCount.toLocaleString('en-IN')} total customers`,
            },
            {
              label: `ARPU (${revenueStats.currentMonthLabel})`,
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
        <DetailView range={active === 'revenue' ? { from: revenueDateFrom, to: revenueDateTo } : { from: dateFrom, to: dateTo }} />
      )}
    </div>
  )
}

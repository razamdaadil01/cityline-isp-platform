import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts'
import {
  Users, Wifi, TrendingUp, IndianRupee, AlertTriangle,
  CheckCircle2, Clock, XCircle, RefreshCw, PhoneCall,
  FileText, Server, Activity,
  ChevronRight, Zap,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { getAllCustomers, subscribeCustomers, effectiveStatus, updateCustomer } from '../data/customersData'
import { getPayments, subscribePayments } from '../data/paymentsStore'
import { getTickets, subscribeTickets, CLOSED_STATUSES, slaStatusOf } from '../data/ticketsStore'
import { getLeads, subscribeLeads } from '../data/leadsStore'
import { getOutages, subscribeOutages, ACTIVE_OUTAGE_STATUSES } from '../data/outagesStore'
import { getOutstandingInvoices, getOutstandingTotal, subscribeInvoices } from '../data/invoicesStore'
import { getJazeServers, subscribeJazeServers } from '../data/jazeServerStore'
import { exportCsv } from '../utils/csvExport'
import { computeRevenueByMonth } from '../utils/revenueStats'

// ─── Mock data ────────────────────────────────────────────────────────────────

// Key Metrics stat cards (STAT_CARD_META below), Revenue Overview, the
// Connection Mix/Service pills, Renewal Forecast, Today's Collections,
// Sales Lead Pipeline, Support Overview, Recent Open Tickets, the Active
// Outages/Overdue Payments widgets (new, not a rewire of anything
// pre-existing), and CAF Compliance (now backed by a genuinely new
// cafStatus field on the customer record — see customersData.js's
// CAF_STATUSES) are wired to real, live-subscribed data so far — see
// Dashboard() itself for the real customers/payments/tickets/leads/
// outages/invoices computation. Jaze Network Status is now wired to
// jazeServerStore.js too — the same real, persisted store NetworkServers.jsx
// reads/writes, so both pages show one consistent set of servers.

// A customer's `plan` string always starts with its connection-technology
// keyword ("FTTH 100Mbps", "Wireless 25Mbps", ...) except ILL plans, which
// display under this app's existing "Leased Line" label (the same label
// the static pills/pie this replaces already used) rather than the raw
// "ILL" plan prefix.
function serviceTypeOf(customer) {
  const prefix = (customer.plan || '').split(' ')[0]
  return prefix === 'ILL' ? 'Leased Line' : (prefix || 'Other')
}

// Preferred display order/styling for the connection types this app's
// seed data actually has today; any other plan prefix (e.g. a future
// service type) still renders, appended after these in alphabetical order,
// rather than silently being dropped.
const SERVICE_TYPE_ORDER = ['FTTH', 'FTTB', 'Wireless', 'P2P', 'Leased Line']
const SERVICE_TYPE_STYLES = {
  FTTH:          { pill: 'bg-brand-blue text-white',   pie: '#0A8DCD' },
  FTTB:          { pill: 'bg-navy text-white',          pie: '#0F2744' },
  Wireless:      { pill: 'bg-brand-orange text-white',  pie: '#E8541A' },
  P2P:           { pill: 'bg-purple-600 text-white',    pie: '#7c3aed' },
  'Leased Line': { pill: 'bg-emerald-600 text-white',   pie: '#059669' },
}
const OTHER_SERVICE_TYPE_STYLE = { pill: 'bg-slate-500 text-white', pie: '#64748b' }

// Single real source for both the "Active Services by Type" pills and the
// Connection Mix pie chart, so the two can never drift out of sync the way
// the old separately-hardcoded SERVICE_PILLS/PIE_DATA arrays could (and,
// coincidentally, already had — their counts happened to still match, but
// nothing enforced that). Scoped to customers with an effectively active
// connection (effectiveStatus === 'active'), matching the "Active
// Services by Type" section title — Total Customers below is the
// unfiltered, all-statuses count.
function computeServiceMix(activeCustomers) {
  const counts = new Map()
  activeCustomers.forEach(c => {
    const type = serviceTypeOf(c)
    counts.set(type, (counts.get(type) || 0) + 1)
  })
  const knownFirst = SERVICE_TYPE_ORDER.filter(t => counts.has(t))
  const rest = [...counts.keys()].filter(t => !SERVICE_TYPE_ORDER.includes(t)).sort()
  return [...knownFirst, ...rest].map(type => ({
    type,
    count: counts.get(type),
    ...(SERVICE_TYPE_STYLES[type] ?? OTHER_SERVICE_TYPE_STYLE),
  }))
}

// Static metadata (label/icon/colors) for the 6 Key Metrics cards — the
// actual `value` for each is computed live in Dashboard() below from
// customersData.js/paymentsStore.js/ticketsStore.js and looked up by
// `key`. The old mock's per-card "change since X" trend arrows aren't
// carried over: none of them has a real equivalent anywhere in this app
// (no snapshot/history data to diff against), so inventing a new fake
// delta to replace the old fake delta would just be a different kind of
// placeholder — these cards show only the real current value for now.
const STAT_CARD_META = [
  { key: 'totalCustomers',    label: 'Total Customers',      icon: <Users size={20} />,         iconBg: 'bg-brand-blue/10',    iconColor: 'text-brand-blue' },
  { key: 'activeConnections', label: 'Active Connections',   icon: <Wifi size={20} />,          iconBg: 'bg-emerald-100',      iconColor: 'text-emerald-600' },
  { key: 'inactiveSuspended', label: 'Inactive / Suspended', icon: <XCircle size={20} />,       iconBg: 'bg-red-100',          iconColor: 'text-red-500' },
  { key: 'todaysCollection',  label: "Today's Collection",   icon: <IndianRupee size={20} />,   iconBg: 'bg-amber-100',        iconColor: 'text-amber-600' },
  { key: 'openTickets',       label: 'Open Tickets',         icon: <AlertTriangle size={20} />, iconBg: 'bg-brand-orange/10',  iconColor: 'text-brand-orange' },
  { key: 'renewalsDueToday',  label: 'Renewals Due Today',   icon: <RefreshCw size={20} />,     iconBg: 'bg-purple-100',       iconColor: 'text-purple-600' },
]

// Same severity->Badge color convention as OutageList.jsx/OutageDetail.jsx.
const SEVERITY_BADGE = { Critical: 'red', High: 'orange', Medium: 'yellow', Low: 'gray' }

// Today's Collections' time column comes from paymentsStore.js's own
// `date` field — "DD-MM-YYYY HH:MM:SS" (AddPayment.jsx's
// `${dateOnly} ${timeStr}`, timeStr from toLocaleTimeString('en-GB')) —
// reformatted to a friendly 12-hour clock rather than shown raw.
function formatPaymentTime(payment) {
  const timePart = (payment.date || '').split(' ')[1]
  if (!timePart) return ''
  const [h, m] = timePart.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

// Won/Lost are terminal outcomes (see pipelineStore.js's own stage
// statusType), not "still in the pipeline" — excluded so a closed-out lead
// doesn't inflate the funnel this widget is meant to show.
const CLOSED_LEAD_STAGES = ['Won', 'Lost']
const LEAD_STAGE_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-orange-500', 'bg-emerald-500', 'bg-teal-500', 'bg-pink-500', 'bg-cyan-500']

// Real lead `stage` values vary by pipeline (Residential/Enterprise/any
// custom pipeline in pipelineStore.js each define their own stage names),
// so there's no single fixed funnel order across all of them the way the
// old static LEAD_PIPELINE assumed — stages are ranked by how many leads
// are actually in them (busiest first) instead.
function computeLeadPipeline(leads) {
  const counts = new Map()
  leads.forEach(l => {
    if (CLOSED_LEAD_STAGES.includes(l.stage)) return
    counts.set(l.stage, (counts.get(l.stage) || 0) + 1)
  })
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([stage, count], i) => ({ stage, count, color: LEAD_STAGE_COLORS[i % LEAD_STAGE_COLORS.length] }))
}

// Today/Tomorrow/This Week/This Month are cumulative windows off
// customersData.js's real per-customer `expiry` (ISO date) field — This
// Month (today through +29 days) is the widest, so the Collected/Pending/
// Expired breakdown below is deliberately scoped to that exact same
// customer set rather than a separately-computed range, guaranteeing the
// two numbers relate to each other (their three counts always sum to
// This Month's own count) instead of being unrelated figures the way the
// old static mock's were. No real per-customer plan price exists anywhere
// (customer.plan is a free-text string like "FTTH 100Mbps" with nothing
// resembling a Product Management foreign key), so the old mock's ₹
// amount per period isn't carried over — showing a fabricated number
// there would be no more honest than the count it replaced.
//
// Per-customer classification within This Month, in priority order:
//   Collected — paymentsStore.js has any recorded payment for them
//     (renewed already, regardless of exactly when relative to expiry).
//   Expired   — not paid, and customersData.js's own effectiveStatus()
//     already reads 'expired' for them (structurally rare within a
//     forward-only window — only reachable if their status was already
//     something other than 'active' before expiry day arrived — but a
//     real computed predicate, not a hardcoded floor of 0).
//   Pending   — everyone else in the window: due, not yet paid, not yet
//     lapsed.
function computeRenewalForecast(customers, payments, todayISO) {
  const addDaysISO = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const tomorrowISO = addDaysISO(1)
  const weekEndISO = addDaysISO(6)
  const monthEndISO = addDaysISO(29)
  const inRange = (expiry, end) => expiry >= todayISO && expiry <= end

  const monthCohort = customers.filter(c => c.expiry && inRange(c.expiry, monthEndISO))
  let collected = 0, expired = 0, pending = 0
  monthCohort.forEach(c => {
    if (payments.some(p => p.customerId === c.id)) collected++
    else if (effectiveStatus(c) === 'expired') expired++
    else pending++
  })

  const buckets = [
    { period: 'Today', count: customers.filter(c => c.expiry === todayISO).length, status: 'urgent' },
    { period: 'Tomorrow', count: customers.filter(c => c.expiry === tomorrowISO).length, status: 'warning' },
    { period: 'This Week', count: customers.filter(c => c.expiry && inRange(c.expiry, weekEndISO)).length, status: 'info' },
    { period: 'This Month', count: monthCohort.length, status: 'normal' },
  ]

  return { buckets, collected, pending, expired }
}

// Real per-customer cafStatus (customersData.js's CAF_STATUSES) counts,
// shown against the full customer base — "Approved" is the only status
// that counts toward the compliance rate below (see CAF_STATUSES' own
// comment for why Submitted-but-unreviewed doesn't count yet).
const CAF_STATUS_META = [
  { key: 'Approved',  label: 'Approved',      color: '#059669' },
  { key: 'Submitted', label: 'CAF Submitted', color: '#0A8DCD' },
  { key: 'Pending',   label: 'Pending Upload', color: '#E8541A' },
  { key: 'Rejected',  label: 'Rejected',      color: '#ef4444' },
]

function computeCafCompliance(customers) {
  const total = customers.length
  const counts = { Approved: 0, Submitted: 0, Pending: 0, Rejected: 0 }
  customers.forEach(c => {
    const status = counts[c.cafStatus] !== undefined ? c.cafStatus : 'Pending'
    counts[status]++
  })
  const buckets = CAF_STATUS_META.map(meta => ({ ...meta, value: counts[meta.key], total }))
  const complianceRate = total === 0 ? 0 : (counts.Approved / total) * 100
  return { buckets, total, approvedCount: counts.Approved, complianceRate }
}

// Real online/degraded/offline counts + a prioritized preview list for the
// Jaze Network Status widget below — computed from jazeServerStore.js's
// live server records (degraded/offline first, since those are the
// actionable ones), capped so the widget stays a compact preview rather
// than repeating NetworkServers.jsx's own full grid.
const JAZE_PREVIEW_LIMIT = 6
const JAZE_STATUS_RANK = { offline: 0, degraded: 1, online: 2 }

function computeJazeSummary(servers) {
  const online = servers.filter(s => s.status === 'online').length
  const degraded = servers.filter(s => s.status === 'degraded').length
  const offline = servers.filter(s => s.status === 'offline').length
  const preview = servers
    .slice()
    .sort((a, b) => (JAZE_STATUS_RANK[a.status] ?? 3) - (JAZE_STATUS_RANK[b.status] ?? 3))
    .slice(0, JAZE_PREVIEW_LIMIT)
  return { online, degraded, offline, total: servers.length, preview }
}

// Metadata (label/color) for Support Overview's 5 tiles — the actual
// `count` for each is computed live in Dashboard() below from
// ticketsStore.js's real statuses/slaStatusOf() and looked up by `key`.
const SUPPORT_OVERVIEW_META = [
  { key: 'new',             label: 'New',              color: 'text-brand-blue',  bg: 'bg-brand-blue/10' },
  { key: 'inProgress',      label: 'In Progress',      color: 'text-amber-600',   bg: 'bg-amber-100' },
  { key: 'pendingCustomer', label: 'Pending Customer', color: 'text-purple-600',  bg: 'bg-purple-100' },
  { key: 'resolvedToday',   label: 'Resolved Today',   color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { key: 'slaBreached',     label: 'SLA Breached',     color: 'text-red-600',     bg: 'bg-red-100' },
]

const RECENT_TICKETS_LIMIT = 4

// Same m/h/d-ago shape as TicketDetail.jsx's own timeSince() — kept as a
// local copy rather than imported since that file's version lives inside a
// page module, not a shared util.
function ticketAge(createdAt) {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  const m = Math.floor(diffMs / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{children}</h2>
}

function WidgetCard({ title, action, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-card border border-surface-border overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {action && <div>{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// Real ticket priorities are 'P1'-'P4' (ticketsStore.js) — same color
// convention as SupportTicketDetail.jsx's/Support.jsx's own PRIORITY_BADGE/
// P_VARIANT maps.
function PriorityBadge({ priority }) {
  const map = { P1: 'red', P2: 'orange', P3: 'yellow', P4: 'gray' }
  return <Badge variant={map[priority] ?? 'gray'} size="sm" dot>{priority}</Badge>
}

function StatusDot({ status }) {
  const map = {
    online: 'bg-emerald-400',
    degraded: 'bg-amber-400',
    offline: 'bg-red-500',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${map[status]}`} />
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-surface-border rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: ₹{p.value.toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  )
}

// Flattens every widget already wired to real data into one "long format"
// (Section, Metric, Value) table — the shape exportCsv() (this app's
// existing shared CSV helper, already used by Customers.jsx/
// CustomerDetail.jsx) needs one consistent column set across every row,
// and the widgets here have wildly different native shapes (a stat card,
// a pie breakdown, a payments list, a ticket list...), so a single wide
// table per widget isn't realistic in one file.
function buildDashboardReportRows({
  statValues, serviceMix, activeCustomers, revenueData, renewalForecast,
  todaysPayments, leadPipeline, totalLeadsInPipeline, supportOverviewValues,
  recentTickets, activeOutages, outstandingInvoices, outstandingTotal, cafCompliance,
  jazeSummary,
}) {
  const rows = []
  const add = (section, metric, value) => rows.push({ Section: section, Metric: metric, Value: value })

  STAT_CARD_META.forEach(card => {
    const value = statValues[card.key]
    add('Key Metrics', card.label, card.key === 'todaysCollection' ? `₹${value.toLocaleString('en-IN')}` : value)
  })

  serviceMix.forEach(s => add('Active Services by Type', s.type, s.count))
  add('Active Services by Type', 'Total Active', activeCustomers.length)

  if (revenueData.length === 0) {
    add('Revenue Overview', 'Status', 'No payments recorded yet')
  } else {
    revenueData.forEach(r => add('Revenue Overview', r.month, `₹${r.collected.toLocaleString('en-IN')}`))
  }

  renewalForecast.buckets.forEach(b => add('Renewal Forecast', b.period, b.count))
  add('Renewal Forecast', 'Collected', renewalForecast.collected)
  add('Renewal Forecast', 'Pending', renewalForecast.pending)
  add('Renewal Forecast', 'Expired', renewalForecast.expired)

  add("Today's Collections", 'Total', `₹${statValues.todaysCollection.toLocaleString('en-IN')}`)
  if (todaysPayments.length === 0) {
    add("Today's Collections", 'Status', 'No payments recorded yet today')
  } else {
    todaysPayments.forEach(p => add("Today's Collections", `${p.customer} (${p.time})`, `₹${p.amount.toLocaleString('en-IN')} · ${p.mode}`))
  }

  if (leadPipeline.length === 0) {
    add('Sales Lead Pipeline', 'Status', 'No leads currently in the pipeline')
  } else {
    leadPipeline.forEach(s => add('Sales Lead Pipeline', s.stage, s.count))
  }
  add('Sales Lead Pipeline', 'Total leads in pipeline', totalLeadsInPipeline)

  SUPPORT_OVERVIEW_META.forEach(s => add('Support Overview', s.label, supportOverviewValues[s.key]))

  if (recentTickets.length === 0) {
    add('Recent Open Tickets', 'Status', 'No open tickets right now')
  } else {
    recentTickets.forEach(t => add('Recent Open Tickets', `${t.id} — ${t.customerName}`, `${t.subject} (${t.priority})`))
  }

  if (activeOutages.length === 0) {
    add('Active Outages', 'Status', 'All systems operational')
  } else {
    activeOutages.forEach(o => add('Active Outages', `${o.id} — ${o.title}`, o.severity))
  }

  add('Overdue Payments', 'Outstanding Total', `₹${outstandingTotal.toLocaleString('en-IN')}`)
  add('Overdue Payments', 'Outstanding Invoices', outstandingInvoices.length)

  cafCompliance.buckets.forEach(b => add('CAF Compliance', b.label, b.value))
  add('CAF Compliance', 'Overall Compliance Rate', `${cafCompliance.complianceRate.toFixed(1)}%`)

  add('Jaze Network Status', 'Online', jazeSummary.online)
  add('Jaze Network Status', 'Degraded', jazeSummary.degraded)
  add('Jaze Network Status', 'Offline', jazeSummary.offline)
  add('Jaze Network Status', 'Total Servers', jazeSummary.total)

  return rows
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()

  // Same getAllCustomers()-refetch pattern as Customers.jsx — subscribeCustomers()'s
  // own payload is only the dynamically-added customers, not the full merged
  // list, so every callback re-reads getAllCustomers() itself rather than
  // trusting the payload.
  const [customers, setCustomers] = useState(() => getAllCustomers())
  useEffect(() => subscribeCustomers(() => setCustomers(getAllCustomers())), [])

  const [payments, setPayments] = useState(getPayments)
  useEffect(() => subscribePayments(setPayments), [])

  const [tickets, setTickets] = useState(getTickets)
  useEffect(() => subscribeTickets(setTickets), [])

  const [leads, setLeads] = useState(getLeads)
  useEffect(() => subscribeLeads(setLeads), [])

  const [outages, setOutages] = useState(getOutages)
  useEffect(() => subscribeOutages(setOutages), [])

  // getOutstandingInvoices()/getOutstandingTotal() are derived getters, not
  // the raw store — subscribeInvoices()'s payload is the raw invoice list,
  // so both are re-read fresh on every notification rather than derived
  // from that payload here.
  const [outstandingInvoices, setOutstandingInvoices] = useState(getOutstandingInvoices)
  const [outstandingTotal, setOutstandingTotal] = useState(getOutstandingTotal)
  useEffect(() => subscribeInvoices(() => {
    setOutstandingInvoices(getOutstandingInvoices())
    setOutstandingTotal(getOutstandingTotal())
  }), [])

  const [jazeServers, setJazeServers] = useState(getJazeServers)
  useEffect(() => subscribeJazeServers(setJazeServers), [])

  // "Today" in both formats this app's stores actually use — DD-MM-YYYY
  // for paymentsStore.js's paymentDate, ISO for customersData.js's expiry.
  const todayDMY = new Date().toLocaleDateString('en-GB').split('/').join('-')
  const todayISO = new Date().toISOString().slice(0, 10)

  const activeCustomers = useMemo(
    () => customers.filter(c => effectiveStatus(c) === 'active'),
    [customers]
  )
  const serviceMix = useMemo(() => computeServiceMix(activeCustomers), [activeCustomers])
  const cafCompliance = useMemo(() => computeCafCompliance(customers), [customers])
  // "Upload CAF" — customers who still need one uploaded/re-uploaded.
  const cafActionNeeded = useMemo(
    () => customers.filter(c => (c.cafStatus ?? 'Pending') !== 'Approved' && (c.cafStatus ?? 'Pending') !== 'Submitted'),
    [customers]
  )

  const statValues = useMemo(() => ({
    totalCustomers: customers.length,
    activeConnections: activeCustomers.length,
    inactiveSuspended: customers.filter(c => ['inactive', 'suspended'].includes(effectiveStatus(c))).length,
    todaysCollection: payments
      .filter(p => p.paymentDate === todayDMY)
      .reduce((sum, p) => sum + (Number(p.paid ?? p.total) || 0), 0),
    openTickets: tickets.filter(t => !CLOSED_STATUSES.includes(t.status)).length,
    renewalsDueToday: customers.filter(c => c.expiry === todayISO).length,
  }), [customers, activeCustomers, payments, tickets, todayDMY, todayISO])

  const renewalForecast = useMemo(
    () => computeRenewalForecast(customers, payments, todayISO),
    [customers, payments, todayISO]
  )
  const maxRenewalBucketCount = Math.max(1, ...renewalForecast.buckets.map(b => b.count))

  // Chronological (earliest first) — payment.date's "DD-MM-YYYY HH:MM:SS"
  // sorts correctly by plain string comparison once every row shares the
  // same date prefix (guaranteed by the todayDMY filter below).
  const todaysPayments = useMemo(() => {
    return payments
      .filter(p => p.paymentDate === todayDMY)
      .slice()
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .map(p => {
        const customer = customers.find(c => c.id === p.customerId)
        return {
          id: p.id,
          customer: customer?.name ?? p.customerId,
          plan: customer?.plan ?? '—',
          amount: Number(p.paid ?? p.total) || 0,
          mode: p.mode,
          time: formatPaymentTime(p),
        }
      })
  }, [payments, customers, todayDMY])

  const [revenueRangeMonths, setRevenueRangeMonths] = useState(6)
  const revenueData = useMemo(() => {
    const byMonth = computeRevenueByMonth(payments)
    return revenueRangeMonths >= byMonth.length ? byMonth : byMonth.slice(-revenueRangeMonths)
  }, [payments, revenueRangeMonths])

  const leadPipeline = useMemo(() => computeLeadPipeline(leads), [leads])
  const maxStageCount = Math.max(1, ...leadPipeline.map(s => s.count))
  const totalLeadsInPipeline = leadPipeline.reduce((sum, s) => sum + s.count, 0)

  const recentTickets = useMemo(
    () => tickets
      .filter(t => !CLOSED_STATUSES.includes(t.status))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, RECENT_TICKETS_LIMIT),
    [tickets]
  )
  const supportOverviewValues = useMemo(() => ({
    new: tickets.filter(t => t.status === 'New').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    pendingCustomer: tickets.filter(t => t.status === 'Waiting for Customer').length,
    // resolution.resolvedAt is set once, exactly when resolveTicket() runs
    // — persists through a later Close, so a ticket resolved yesterday and
    // closed today correctly doesn't count as resolved "today".
    resolvedToday: tickets.filter(t => t.resolution?.resolvedAt?.slice(0, 10) === todayISO).length,
    slaBreached: tickets.filter(t => slaStatusOf(t) === 'Breached').length,
  }), [tickets, todayISO])

  const activeOutages = useMemo(() => {
    const severityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 }
    return outages
      .filter(o => ACTIVE_OUTAGE_STATUSES.includes(o.status))
      .sort((a, b) => (severityRank[a.severity] ?? 4) - (severityRank[b.severity] ?? 4))
  }, [outages])

  const jazeSummary = useMemo(() => computeJazeSummary(jazeServers), [jazeServers])

  // Same local toast convention as CustomerDetail.jsx's own showToast() —
  // no shared toast component exists anywhere in this app.
  const [toast, setToast] = useState(null)
  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Every widget here already subscribes to its own store, so nothing is
  // stale — this just re-reads each store and gives the user visible
  // feedback that it happened, rather than a real refetch (there's
  // nothing to refetch from).
  const [refreshing, setRefreshing] = useState(false)
  function handleRefresh() {
    setRefreshing(true)
    setCustomers(getAllCustomers())
    setPayments(getPayments())
    setTickets(getTickets())
    setLeads(getLeads())
    setOutages(getOutages())
    setOutstandingInvoices(getOutstandingInvoices())
    setOutstandingTotal(getOutstandingTotal())
    setJazeServers(getJazeServers())
    setTimeout(() => {
      setRefreshing(false)
      showToast('Dashboard refreshed')
    }, 500)
  }

  function handleExportReport() {
    exportCsv(
      `dashboard_report_${new Date().toISOString().slice(0, 10)}.csv`,
      buildDashboardReportRows({
        statValues, serviceMix, activeCustomers, revenueData, renewalForecast,
        todaysPayments, leadPipeline, totalLeadsInPipeline, supportOverviewValues,
        recentTickets, activeOutages, outstandingInvoices, outstandingTotal, cafCompliance,
        jazeSummary,
      })
    )
    showToast('Dashboard report exported')
  }

  // "Upload CAF" — a simple customer-picker modal is the natural fit here
  // (mark a customer's already-outstanding CAF as submitted/uploaded); a
  // real file-upload flow with document storage is out of scope — this
  // app has no working document storage/viewer anywhere yet (see
  // AddCustomer.jsx's own kycDocuments comment).
  const [uploadCafOpen, setUploadCafOpen] = useState(false)
  function markCafSubmitted(customerId) {
    // subscribeCustomers() below already re-reads getAllCustomers() on
    // every change, so no separate local state update is needed here.
    updateCustomer(customerId, { cafStatus: 'Submitted' })
    showToast('CAF marked as submitted')
  }

  return (
    <div className="p-6 space-y-6">

      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back, Admin. Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary" size="sm" disabled={refreshing}
            icon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
          <Button size="sm" icon={<FileText size={14} />} onClick={handleExportReport}>Export Report</Button>
        </div>
      </div>

      {/* Service type pills */}
      <div>
        <SectionTitle>Active Services by Type</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {serviceMix.map((s) => (
            <div key={s.type} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${s.pill} shadow-sm cursor-pointer hover:opacity-90 transition-opacity`}>
              <Wifi size={14} />
              <span>{s.type}</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-xs">{s.count}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors">
            <span>Total Active</span>
            <span className="bg-white px-1.5 py-0.5 rounded-md text-xs font-bold text-gray-800">{activeCustomers.length.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Stat cards row */}
      <div>
        <SectionTitle>Key Metrics</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {STAT_CARD_META.map((card) => {
            const value = statValues[card.key]
            const display = card.key === 'todaysCollection'
              ? `₹${value.toLocaleString('en-IN')}`
              : value.toLocaleString('en-IN')
            return (
              <div key={card.label} className="bg-white rounded-xl p-4 shadow-card border border-surface-border">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* min-h reserves room for a 2-line label (text-xs/leading-tight
                        ≈ 15px per line) so the value below always starts at the same
                        vertical position, whether a given card's label wraps to one
                        line ("Open Tickets") or two ("Renewals Due Today"). */}
                    <p className="text-xs font-medium text-gray-500 leading-tight min-h-[2rem]">{card.label}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1.5 leading-none">{display}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0 ml-2`}>
                    {card.icon}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Row: Active Outages + Overdue Payments — new widgets flagged by a
          prior audit as missing despite real backing data already existing
          (outagesStore.js/invoicesStore.js), placed after Key Metrics given
          their operational urgency. */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Active Outages / Critical Alerts */}
        <div
          onClick={() => navigate('/support/outages')}
          className={`xl:col-span-2 rounded-xl shadow-card border overflow-hidden cursor-pointer transition-colors ${
            activeOutages.length > 0
              ? 'bg-red-50 border-red-200 hover:bg-red-100/70'
              : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100/60'
          }`}
        >
          <div className="px-5 py-3.5 flex items-center gap-2 border-b border-black/5">
            {activeOutages.length > 0 ? (
              <>
                <AlertTriangle size={16} className="text-red-600 shrink-0" />
                <h3 className="text-sm font-semibold text-red-800">
                  {activeOutages.length} Active Outage{activeOutages.length !== 1 ? 's' : ''}
                </h3>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <h3 className="text-sm font-semibold text-emerald-800">All systems operational</h3>
              </>
            )}
          </div>
          <div className="p-4">
            {activeOutages.length === 0 ? (
              <p className="text-sm text-emerald-700">No active outages right now.</p>
            ) : (
              <div className="space-y-2">
                {activeOutages.slice(0, 3).map((o) => (
                  <div
                    key={o.id}
                    onClick={(e) => { e.stopPropagation(); navigate(`/support/outages/${o.id}`) }}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-white/60 hover:bg-white transition-colors"
                  >
                    <Badge variant={SEVERITY_BADGE[o.severity] ?? 'gray'} size="sm">{o.severity}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{o.title}</p>
                      <p className="text-xs text-gray-500 truncate">{o.description}</p>
                    </div>
                  </div>
                ))}
                {activeOutages.length > 3 && (
                  <p className="text-xs text-red-700 font-medium pl-1">+{activeOutages.length - 3} more — view all</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Overdue Payments / Aging — invoicesStore.js is a single shared
            invoice list rather than genuinely per-customer data (see that
            file's own top-of-file comment), so this reflects that store's
            real (if limited) outstanding total/count exactly, not a true
            company-wide receivables aggregate. No due-date/overdue-by-days
            field exists there either (just an issue `date` and a paid/
            pending `status`), so no aging breakdown is fabricated. */}
        <div
          onClick={() => navigate('/billing')}
          className="rounded-xl shadow-card border border-surface-border bg-white overflow-hidden cursor-pointer hover:bg-gray-50/70 transition-colors"
        >
          <div className="px-5 py-3.5 flex items-center gap-2 border-b border-surface-border">
            <IndianRupee size={16} className="text-amber-600 shrink-0" />
            <h3 className="text-sm font-semibold text-gray-800">Overdue Payments</h3>
          </div>
          <div className="p-4">
            {outstandingInvoices.length === 0 ? (
              <p className="text-sm text-gray-400">No outstanding invoices.</p>
            ) : (
              <>
                <p className="text-2xl font-bold text-amber-600">₹{outstandingTotal.toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {outstandingInvoices.length} outstanding invoice{outstandingInvoices.length !== 1 ? 's' : ''}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row: Revenue Chart + Mix Pie */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <WidgetCard
          title="Revenue Overview"
          className="xl:col-span-2"
          action={
            <div className="flex gap-1">
              {[{ label: '6M', months: 6 }, { label: '3M', months: 3 }, { label: '1M', months: 1 }].map((r) => (
                <button
                  key={r.label}
                  onClick={() => setRevenueRangeMonths(r.months)}
                  className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors
                    ${revenueRangeMonths === r.months ? 'bg-brand-blue text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          }
        >
          {revenueData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-sm text-gray-400">No payments recorded yet — the revenue trend will build up as payments come in.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0A8DCD" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0A8DCD" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<RevenueTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="collected" name="Collected" stroke="#0A8DCD" strokeWidth={2.5}
                  fill="url(#colorCollected)" dot={{ r: 3, fill: '#0A8DCD' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </WidgetCard>

        {/* Connection Mix */}
        <WidgetCard title="Connection Mix">
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={serviceMix} cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                dataKey="count" nameKey="type" paddingAngle={3}>
                {serviceMix.map((entry, i) => (
                  <Cell key={i} fill={entry.pie} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v} customers`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {serviceMix.map((d) => (
              <div key={d.type} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.pie }} />
                  <span className="text-gray-600">{d.type}</span>
                </div>
                <span className="font-semibold text-gray-800">{d.count}</span>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      {/* Row: Renewal Forecast + Today's Collection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Renewal Forecast */}
        <WidgetCard title="Renewal Forecast" action={
          <Button variant="ghost" size="xs" iconRight={<ChevronRight size={12} />} onClick={() => navigate('/customers')}>View All</Button>
        }>
          <div className="space-y-3">
            {renewalForecast.buckets.map((r) => {
              const variantMap = { urgent: 'red', warning: 'yellow', info: 'blue', normal: 'gray' }
              return (
                <div key={r.period} className="flex items-center gap-4">
                  <div className="w-24 shrink-0">
                    <p className="text-xs font-semibold text-gray-700">{r.period}</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all
                          ${r.status === 'urgent' ? 'bg-red-500' : r.status === 'warning' ? 'bg-amber-400' : r.status === 'info' ? 'bg-brand-blue' : 'bg-emerald-500'}
                        `}
                        style={{ width: `${Math.round((r.count / maxRenewalBucketCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right">
                    <Badge variant={variantMap[r.status]} size="sm">{r.count}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-surface-border">
            <p className="text-xs text-gray-400 mb-2">Breakdown of this month's {renewalForecast.buckets[3].count} renewals</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Collected', value: renewalForecast.collected, color: 'text-emerald-600' },
                { label: 'Pending', value: renewalForecast.pending, color: 'text-amber-600' },
                { label: 'Expired', value: renewalForecast.expired, color: 'text-red-500' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </WidgetCard>

        {/* Today's Collection */}
        <WidgetCard title="Today's Collections" action={
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-sm font-bold text-emerald-600">₹{statValues.todaysCollection.toLocaleString('en-IN')}</p>
            </div>
            <Button variant="ghost" size="xs" iconRight={<ChevronRight size={12} />} onClick={() => navigate('/billing/payment-history')}>View All</Button>
          </div>
        }>
          {todaysPayments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No payments recorded yet today.</p>
          ) : (
            <div className="space-y-3">
              {todaysPayments.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                    <IndianRupee size={14} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.customer}</p>
                    <p className="text-xs text-gray-400">{c.plan} · {c.time}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">₹{c.amount.toLocaleString('en-IN')}</p>
                    <Badge variant={c.mode === 'UPI' ? 'blue' : c.mode === 'Cash' ? 'green' : c.mode === 'Card' ? 'purple' : 'navy'} size="sm">
                      {c.mode}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>
      </div>

      {/* Row: Lead Pipeline + CAF Compliance + Jaze Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Pipeline */}
        <WidgetCard title="Sales Lead Pipeline" action={<Button variant="ghost" size="xs" iconRight={<ChevronRight size={12} />} onClick={() => navigate('/sales')}>View</Button>}>
          {leadPipeline.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No leads currently in the pipeline.</p>
          ) : (
            <div className="space-y-3">
              {leadPipeline.map((stage) => (
                <div key={stage.stage} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <p className="text-xs text-gray-600 font-medium truncate">{stage.stage}</p>
                  </div>
                  <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                    <div
                      className={`h-full ${stage.color} rounded-lg flex items-center justify-end pr-2 transition-all`}
                      style={{ width: `${Math.round((stage.count / maxStageCount) * 100)}%` }}
                    >
                      <span className="text-white text-xs font-bold">{stage.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-surface-border flex items-center justify-between">
            <p className="text-xs text-gray-500">Total leads in pipeline</p>
            <span className="text-lg font-bold text-gray-900">{totalLeadsInPipeline}</span>
          </div>
        </WidgetCard>

        {/* CAF Compliance — real per-customer cafStatus (customersData.js),
            live-subscribed via the same `customers` state every other
            customer-backed widget on this page already uses. */}
        <WidgetCard title="CAF Compliance">
          <div className="space-y-3">
            {cafCompliance.buckets.map((item) => (
              <div key={item.key}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-600 font-medium">{item.label}</p>
                  <p className="text-xs font-bold text-gray-800">{item.value} <span className="text-gray-400 font-normal">/ {item.total}</span></p>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: item.total ? `${Math.round((item.value / item.total) * 100)}%` : '0%', backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-surface-border flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <p className="text-xs text-gray-600">
              <span className="font-semibold text-emerald-600">{cafCompliance.complianceRate.toFixed(1)}%</span> overall compliance rate
            </p>
          </div>
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" size="xs" className="flex-1" onClick={() => setUploadCafOpen(true)}>Upload CAF</Button>
            <Button size="xs" className="flex-1" onClick={() => navigate('/reports')}>View Report</Button>
          </div>
        </WidgetCard>

        {/* Jaze / NMS Status */}
        <WidgetCard title="Jaze Network Status" action={
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Live
          </div>
        }>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center bg-emerald-50 rounded-lg py-2">
              <p className="text-lg font-bold text-emerald-600">{jazeSummary.online}</p>
              <p className="text-[11px] text-gray-500">Online</p>
            </div>
            <div className="text-center bg-amber-50 rounded-lg py-2">
              <p className="text-lg font-bold text-amber-600">{jazeSummary.degraded}</p>
              <p className="text-[11px] text-gray-500">Degraded</p>
            </div>
            <div className="text-center bg-red-50 rounded-lg py-2">
              <p className="text-lg font-bold text-red-500">{jazeSummary.offline}</p>
              <p className="text-[11px] text-gray-500">Offline</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {jazeSummary.preview.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot status={s.status} />
                  <span className="text-sm text-gray-700">{s.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">{s.latency !== null ? `${s.latency}ms` : '—'}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    s.status === 'online' ? 'bg-emerald-100 text-emerald-700' :
                    s.status === 'degraded' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-600'
                  }`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-surface-border text-xs text-gray-400">
            {jazeSummary.total > jazeSummary.preview.length && (
              <span>+{jazeSummary.total - jazeSummary.preview.length} more · </span>
            )}
            <span className="text-brand-blue cursor-pointer hover:underline" onClick={() => navigate('/network/servers')}>View full report</span>
          </div>
        </WidgetCard>
      </div>

      {/* Row: Support Overview + Recent Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Support Overview */}
        <WidgetCard title="Support Overview">
          <div className="grid grid-cols-2 gap-3">
            {SUPPORT_OVERVIEW_META.map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                <p className={`text-2xl font-bold ${s.color}`}>{supportOverviewValues[s.key]}</p>
                <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-surface-border">
            {/* Avg resolution time / Calls handled today have no real
                backing field anywhere in this app (no resolution-duration
                or call-log data source exists yet) — left as static
                placeholders rather than a fabricated live calculation, per
                a prior audit. */}
            <div className="flex items-center gap-2 text-xs">
              <Clock size={13} className="text-amber-500" />
              <span className="text-gray-600">Avg resolution time: <span className="font-semibold text-gray-800">4.2 hrs</span></span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1.5">
              <PhoneCall size={13} className="text-brand-blue" />
              <span className="text-gray-600">Calls handled today: <span className="font-semibold text-gray-800">38</span></span>
            </div>
          </div>
        </WidgetCard>

        {/* Recent Tickets */}
        <WidgetCard title="Recent Open Tickets" className="lg:col-span-2"
          action={<Button variant="ghost" size="xs" iconRight={<ChevronRight size={12} />} onClick={() => navigate('/support/tickets')}>All Tickets</Button>}
        >
          {recentTickets.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No open tickets right now.</p>
          ) : (
            <div className="space-y-2">
              {recentTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/support/tickets/${t.id}`)}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 bg-navy/10 rounded-lg flex items-center justify-center shrink-0">
                    <AlertTriangle size={14} className="text-navy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400">{t.id}</span>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{t.customerName}</p>
                    <p className="text-xs text-gray-500">{t.subject}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">{ticketAge(t.createdAt)}</p>
                    <Button
                      variant="ghost" size="xs" className="mt-1"
                      onClick={(e) => { e.stopPropagation(); navigate(`/support/tickets/${t.id}`) }}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-surface-border flex gap-2">
            <Button size="sm" variant="secondary" className="flex-1" icon={<Zap size={13} />} onClick={() => navigate('/support/tickets/new')}>New Ticket</Button>
            <Button size="sm" variant="secondary" className="flex-1" icon={<Activity size={13} />} onClick={() => navigate('/support/reports')}>View SLA Report</Button>
          </div>
        </WidgetCard>
      </div>

      {/* Upload CAF — picks a customer whose CAF is still Pending/Rejected
          and marks it Submitted. Simulated "upload": no real file storage
          exists anywhere in this app to actually attach a document to. */}
      <Modal
        isOpen={uploadCafOpen}
        onClose={() => setUploadCafOpen(false)}
        title="Upload CAF"
        size="sm"
        footer={<Button variant="secondary" size="sm" onClick={() => setUploadCafOpen(false)}>Close</Button>}
      >
        {cafActionNeeded.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No customers currently need a CAF upload.</p>
        ) : (
          <div className="space-y-2">
            {cafActionNeeded.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-gray-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.id} · {c.cafStatus ?? 'Pending'}</p>
                </div>
                <Button size="xs" onClick={() => markCafSubmitted(c.id)}>Mark Submitted</Button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Toast — same fixed bottom-right pill convention as CustomerDetail.jsx's own showToast() */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}

    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  PhoneCall, UserPlus, Users, CheckCircle2, Clock, RefreshCw,
  HardDrive, AlertTriangle, MapPin, TrendingUp, ChevronRight,
  Wifi, Percent, PackageMinus, PackageX, PackageCheck, Timer, Wrench, IndianRupee,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { getLeads as getIntercomLeads, subscribeLeads as subscribeIntercomLeads } from '../data/intercomLeadsStore'
import { getInstallations, subscribeInstallations } from '../data/intercomInstallationsStore'
import { getHardware, subscribeHardware } from '../data/intercomHardwareStore'
import { getRecoveries, subscribeRecoveries } from '../data/intercomRecoveryStore'
import { getLeads as getSalesLeads, subscribeLeads as subscribeSalesLeads } from '../data/leadsStore'
import { getLocalityInfo } from '../data/areaMappingStore'
import { INTERCOM_CUSTOMERS } from './IntercomCustomers'

// ─── Mock data (charts not covered by Section 23's metric list) ──────────────

const LEAD_STATUS_DATA = [
  { name: 'New',                    value: 2, color: '#0A8DCD' },
  { name: 'Installation Scheduled', value: 1, color: '#E8541A' },
  { name: 'Installed',              value: 1, color: '#f59e0b' },
  { name: 'Active',                 value: 1, color: '#059669' },
]

const MONTHLY_INSTALLATIONS = [
  { month: 'Jan', count: 2 },
  { month: 'Feb', count: 3 },
  { month: 'Mar', count: 1 },
  { month: 'Apr', count: 4 },
  { month: 'May', count: 3 },
  { month: 'Jun', count: 5 },
  { month: 'Jul', count: 8 },
]

const TYPE_BADGE = {
  'Internet + Intercom': 'blue',
  'Intercom Only':       'cyan',
}

const STAGE_BADGE = {
  'New':                    'blue',
  'Contacted':              'cyan',
  'Requirement Confirmed':  'purple',
  'Installation Scheduled': 'orange',
  'Installed':              'yellow',
  'Active':                 'green',
  'Cancelled':              'red',
}

const INSTALLATION_STATUS_BADGE = {
  completed: { variant: 'green',  label: 'Completed'   },
  inprogress:{ variant: 'orange', label: 'In Progress' },
  pending:   { variant: 'gray',   label: 'Pending'      },
}

const HARDWARE_STATUS_DISPLAY = {
  assigned:  { label: 'Assigned',  color: 'text-blue-600',    bg: 'bg-blue-100'    },
  available: { label: 'Available', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  damaged:   { label: 'Damaged',   color: 'text-orange-600',  bg: 'bg-orange-100'  },
  lost:      { label: 'Lost',      color: 'text-red-600',     bg: 'bg-red-100'     },
}

// Locality metadata used by the Locality-wise breakdown lives under this fixed hierarchy in areaMappingStore
const LOCALITY_HIERARCHY = { state: 'Maharashtra', district: 'Mumbai Suburban', area: 'Mumbai' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(ddmmyyyy) {
  if (!ddmmyyyy) return ''
  const [d, m, y] = ddmmyyyy.split('-')
  return `${y}-${m}-${d}`
}

function parseDDMMYYYY(ddmmyyyy) {
  if (!ddmmyyyy) return null
  const [d, m, y] = ddmmyyyy.split('-').map(Number)
  if (!d || !m || !y) return null
  return new Date(y, m - 1, d)
}

function daysBetween(startStr, endStr) {
  const start = parseDDMMYYYY(startStr)
  const end = parseDDMMYYYY(endStr)
  if (!start || !end) return null
  return Math.round((end - start) / (1000 * 60 * 60 * 24))
}

function average(nums) {
  const valid = nums.filter(n => n !== null && !Number.isNaN(n))
  if (!valid.length) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

function fmtDays(n) {
  return n === null ? '—' : `${n.toFixed(1)} days`
}

function groupCount(items, keyFn) {
  const map = {}
  items.forEach(item => {
    const keys = keyFn(item)
    ;(Array.isArray(keys) ? keys : [keys]).forEach(k => {
      if (!k) return
      map[k] = (map[k] ?? 0) + 1
    })
  })
  return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
}

function leadIsIntercomOnly(l) {
  return l.type === 'Intercom Only' || l.relationshipType === 'New / Intercom-Only Customer'
}

function leadIsInternetPlusIntercom(l) {
  return l.type === 'Internet + Intercom' || l.relationshipType === 'Existing Internet Customer'
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

function StatCard({ label, value, icon, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-card border border-surface-border">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 leading-tight">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1.5 leading-none">{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0 ml-2`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function RankedList({ rows, icon: Icon, iconBg, iconColor, extra }) {
  if (rows.length === 0) return <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.name} className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center text-xs font-bold shrink-0`}>
            {i + 1}
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon size={13} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 truncate">{r.name}</span>
            {extra && extra(r)}
          </div>
          <span className="text-sm font-bold text-gray-900">{r.count}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function IntercomDashboard() {
  const [intercomLeads, setIntercomLeads] = useState(getIntercomLeads())
  useEffect(() => subscribeIntercomLeads(setIntercomLeads), [])

  const [installations, setInstallations] = useState(getInstallations())
  useEffect(() => subscribeInstallations(setInstallations), [])

  const [hardware, setHardware] = useState(getHardware())
  useEffect(() => subscribeHardware(setHardware), [])

  const [recoveries, setRecoveries] = useState(getRecoveries())
  useEffect(() => subscribeRecoveries(setRecoveries), [])

  const [salesLeads, setSalesLeads] = useState(getSalesLeads())
  useEffect(() => subscribeSalesLeads(setSalesLeads), [])

  const todayISO = new Date().toISOString().slice(0, 10)

  const conversions = salesLeads.filter(l => l.sourceType === 'Intercom Conversion')
  const totalIntercomCustomers = INTERCOM_CUSTOMERS.length
  const conversionRate = totalIntercomCustomers > 0 ? (conversions.length / totalIntercomCustomers) * 100 : 0
  const activationPending = conversions.filter(l => !['Won', 'Lost'].includes(l.stage)).length

  const completedInstallations = installations.filter(o => o.status === 'completed')
  const avgInstallTime = average(completedInstallations.map(o => daysBetween(o.createdDate, o.completedDate)))

  const completedRecoveries = recoveries.filter(r => r.status === 'completed')
  const avgRecoveryTime = average(completedRecoveries.map(r => daysBetween(r.createdDate, r.completedDate)))

  const leads5 = intercomLeads.slice(0, 5)
  const pendingInstallations = installations.filter(o => o.status !== 'completed').slice(0, 3)

  const statCardsRow1 = [
    { label: 'Total Intercom Leads',                        value: intercomLeads.length, icon: <PhoneCall size={18} />,   iconBg: 'bg-brand-blue/10',  iconColor: 'text-brand-blue'  },
    { label: 'New Intercom-Only Customers',                  value: intercomLeads.filter(leadIsIntercomOnly).length, icon: <UserPlus size={18} />,    iconBg: 'bg-purple-100',     iconColor: 'text-purple-600'  },
    { label: 'Existing Internet Customers Taking Intercom',  value: intercomLeads.filter(leadIsInternetPlusIntercom).length, icon: <Users size={18} />,       iconBg: 'bg-cyan-100',       iconColor: 'text-cyan-700'    },
    { label: 'Intercom Installations Completed',             value: completedInstallations.length, icon: <CheckCircle2 size={18} />,iconBg: 'bg-emerald-100',    iconColor: 'text-emerald-600' },
  ]

  const statCardsRow2 = [
    { label: 'Pending Installations',            value: installations.filter(o => o.status !== 'completed').length, icon: <Clock size={18} />,        iconBg: 'bg-amber-100',  iconColor: 'text-amber-600'  },
    { label: 'Intercom-to-Internet Conversions', value: conversions.length, icon: <RefreshCw size={18} />,     iconBg: 'bg-blue-100',   iconColor: 'text-blue-600'   },
    { label: 'Hardware Recovery Pending',         value: recoveries.filter(r => r.status === 'pending').length, icon: <HardDrive size={18} />,     iconBg: 'bg-brand-orange/10', iconColor: 'text-brand-orange' },
    { label: 'Overdue Recoveries',                value: recoveries.filter(r => (r.status === 'pending' || r.status === 'inprogress') && toISO(r.scheduledDate) < todayISO).length, icon: <AlertTriangle size={18} />, iconBg: 'bg-red-100',   iconColor: 'text-red-500'    },
  ]

  const statCardsRow3 = [
    { label: 'Conversion Rate',              value: `${conversionRate.toFixed(1)}%`, icon: <Percent size={18} />,      iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { label: 'Internet Activation Pending',  value: activationPending, icon: <Wifi size={18} />,         iconBg: 'bg-blue-100',    iconColor: 'text-blue-600'    },
    { label: 'Partial Recoveries',           value: recoveries.filter(r => r.status === 'partial_recovery').length, icon: <PackageMinus size={18} />, iconBg: 'bg-amber-100',   iconColor: 'text-amber-600'   },
    { label: 'Missing Hardware',             value: recoveries.filter(r => r.status === 'missing_hardware').length, icon: <PackageX size={18} />,     iconBg: 'bg-red-100',     iconColor: 'text-red-600'     },
  ]

  const statCardsRow4 = [
    { label: 'Damaged Hardware',               value: recoveries.filter(r => r.status === 'damaged_hardware').length, icon: <PackageX size={18} />,     iconBg: 'bg-orange-100',  iconColor: 'text-orange-600'  },
    { label: 'Hardware Returned to Inventory', value: recoveries.filter(r => r.status === 'completed').length, icon: <PackageCheck size={18} />, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { label: 'Average Installation Time',      value: fmtDays(avgInstallTime), icon: <Timer size={18} />,        iconBg: 'bg-brand-blue/10',iconColor: 'text-brand-blue'  },
    { label: 'Average Hardware Recovery Time', value: fmtDays(avgRecoveryTime), icon: <Timer size={18} />,        iconBg: 'bg-purple-100',  iconColor: 'text-purple-600'  },
  ]

  const depositSettlementPending = INTERCOM_CUSTOMERS.filter(c => c.depositSettlementStatus === 'Pending').length

  const statCardsRow5 = [
    { label: 'Deposit Settlement Pending', value: depositSettlementPending, icon: <IndianRupee size={18} />, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  ]

  const localityBreakdown = (() => {
    const counts = {}
    INTERCOM_CUSTOMERS.forEach(c => { counts[c.zone] = (counts[c.zone] ?? 0) + 1 })
    return Object.entries(counts)
      .map(([zone, count]) => ({
        name: zone,
        count,
        intercomSite: !!getLocalityInfo(LOCALITY_HIERARCHY.state, LOCALITY_HIERARCHY.district, LOCALITY_HIERARCHY.area, zone)?.intercomSite,
      }))
      .sort((a, b) => b.count - a.count)
  })()

  const executiveBreakdown = groupCount(conversions, l => l.assigned).slice(0, 5)

  const technicianBreakdown = groupCount(
    completedInstallations,
    o => (o.engineer ?? '').split(',').map(s => s.trim()).filter(Boolean)
  ).slice(0, 5)

  const hardwareStatus = Object.keys(HARDWARE_STATUS_DISPLAY).map(key => ({
    key,
    ...HARDWARE_STATUS_DISPLAY[key],
    value: hardware.filter(h => h.status === key).length,
  }))

  return (
    <div className="p-6 space-y-6">

      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Intercom Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of intercom operations</p>
        </div>
      </div>

      {/* Section 1 — Stats Cards */}
      <div>
        <SectionTitle>Key Metrics</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCardsRow1.map(card => <StatCard key={card.label} {...card} />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          {statCardsRow2.map(card => <StatCard key={card.label} {...card} />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          {statCardsRow3.map(card => <StatCard key={card.label} {...card} />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          {statCardsRow4.map(card => <StatCard key={card.label} {...card} />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          {statCardsRow5.map(card => <StatCard key={card.label} {...card} />)}
        </div>
      </div>

      {/* Section 2 — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WidgetCard title="Lead Status Distribution">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={LEAD_STATUS_DATA} cx="50%" cy="50%" innerRadius={48} outerRadius={76}
                dataKey="value" paddingAngle={3}>
                {LEAD_STATUS_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v} leads`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {LEAD_STATUS_DATA.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-600">{d.name}</span>
                </div>
                <span className="font-semibold text-gray-800">{d.value}</span>
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Monthly Installations">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={MONTHLY_INSTALLATIONS} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip formatter={(v) => [`${v} installations`]} />
              <Bar dataKey="count" name="Installations" fill="#0A8DCD" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </WidgetCard>
      </div>

      {/* Section 3 — Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WidgetCard title="Recent Intercom Leads"
          action={<Link to="/intercom/leads"><Button variant="ghost" size="xs" iconRight={<ChevronRight size={12} />}>View All</Button></Link>}
        >
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-surface-border bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  {['Lead ID', 'Customer', 'Type', 'Stage', 'Assigned'].map(h => (
                    <th key={h} className="text-left px-5 py-2.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {leads5.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <Link to={`/intercom/leads/${lead.id}`} className="text-xs font-mono font-semibold text-brand-blue hover:underline">
                        {lead.id}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-sm font-medium text-gray-800 whitespace-nowrap">{lead.customer}</td>
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <Badge variant={TYPE_BADGE[lead.type] ?? 'gray'} size="sm">{lead.type ?? '—'}</Badge>
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <Badge variant={STAGE_BADGE[lead.stage] ?? 'gray'} size="sm">{lead.stage}</Badge>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-gray-600 whitespace-nowrap">{lead.assigned || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WidgetCard>

        <WidgetCard title="Pending Installations"
          action={<Link to="/intercom/installations"><Button variant="ghost" size="xs" iconRight={<ChevronRight size={12} />}>View All</Button></Link>}
        >
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-surface-border bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  {['Work Order', 'Customer', 'Scheduled Date', 'Technician', 'Status'].map(h => (
                    <th key={h} className="text-left px-5 py-2.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {pendingInstallations.map(o => {
                  const statusInfo = INSTALLATION_STATUS_BADGE[o.status] ?? { variant: 'gray', label: o.status }
                  return (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-2.5 whitespace-nowrap">
                        <Link to={`/intercom/installations/${o.id}`} className="text-xs font-mono font-semibold text-brand-blue hover:underline">
                          {o.id}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-sm font-medium text-gray-800 whitespace-nowrap">{o.customer}</td>
                      <td className="px-5 py-2.5 text-xs text-gray-600 whitespace-nowrap">{o.installDate}</td>
                      <td className="px-5 py-2.5 text-xs text-gray-600 whitespace-nowrap">{o.engineer}</td>
                      <td className="px-5 py-2.5 whitespace-nowrap">
                        <Badge variant={statusInfo.variant} size="sm">{statusInfo.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </WidgetCard>
      </div>

      {/* Section 4 — Breakdown Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <WidgetCard title="Locality-wise Intercom Customers">
          <RankedList
            rows={localityBreakdown}
            icon={MapPin}
            iconBg="bg-brand-blue/10"
            iconColor="text-brand-blue"
            extra={r => r.intercomSite && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Intercom Site" />}
          />
        </WidgetCard>

        <WidgetCard title="Sales Executive-wise Conversions">
          <RankedList
            rows={executiveBreakdown}
            icon={TrendingUp}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-700"
          />
        </WidgetCard>

        <WidgetCard title="Technician-wise Installation Completion">
          <RankedList
            rows={technicianBreakdown}
            icon={Wrench}
            iconBg="bg-purple-100"
            iconColor="text-purple-700"
          />
        </WidgetCard>

        <WidgetCard title="Hardware Status Summary">
          <div className="grid grid-cols-2 gap-3">
            {hardwareStatus.map(s => (
              <div key={s.key} className={`${s.bg} rounded-xl p-3 text-center`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

    </div>
  )
}

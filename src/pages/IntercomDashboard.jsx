import { Link } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  PhoneCall, UserPlus, Users, CheckCircle2, Clock, RefreshCw,
  HardDrive, AlertTriangle, MapPin, TrendingUp, ChevronRight,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { getLeads } from '../data/intercomLeadsStore'
import { getInstallations } from '../data/intercomInstallationsStore'

// ─── Mock data ────────────────────────────────────────────────────────────────

const STAT_CARDS_ROW1 = [
  { label: 'Total Intercom Leads',                        value: 5, icon: <PhoneCall size={18} />,   iconBg: 'bg-brand-blue/10',  iconColor: 'text-brand-blue'  },
  { label: 'New Intercom-Only Customers',                  value: 3, icon: <UserPlus size={18} />,    iconBg: 'bg-purple-100',     iconColor: 'text-purple-600'  },
  { label: 'Existing Internet Customers Taking Intercom',  value: 2, icon: <Users size={18} />,       iconBg: 'bg-cyan-100',       iconColor: 'text-cyan-700'    },
  { label: 'Intercom Installations Completed',             value: 8, icon: <CheckCircle2 size={18} />,iconBg: 'bg-emerald-100',    iconColor: 'text-emerald-600' },
]

const STAT_CARDS_ROW2 = [
  { label: 'Pending Installations',            value: 2, icon: <Clock size={18} />,        iconBg: 'bg-amber-100',  iconColor: 'text-amber-600'  },
  { label: 'Intercom-to-Internet Conversions', value: 1, icon: <RefreshCw size={18} />,     iconBg: 'bg-blue-100',   iconColor: 'text-blue-600'   },
  { label: 'Hardware Recovery Pending',         value: 3, icon: <HardDrive size={18} />,     iconBg: 'bg-brand-orange/10', iconColor: 'text-brand-orange' },
  { label: 'Overdue Recoveries',                value: 1, icon: <AlertTriangle size={18} />, iconBg: 'bg-red-100',   iconColor: 'text-red-500'    },
]

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

const LOCALITY_SUMMARY = [
  { locality: 'Andheri West', count: 4 },
  { locality: 'Bandra East',  count: 3 },
  { locality: 'Goregaon',     count: 2 },
]

const EXECUTIVE_CONVERSIONS = [
  { name: 'Arjun Kumar',  count: 2 },
  { name: 'Suresh Babu',  count: 2 },
  { name: 'Preethi Nair', count: 1 },
]

const HARDWARE_STATUS = [
  { label: 'Assigned',  value: 8, color: 'text-blue-600',    bg: 'bg-blue-100'    },
  { label: 'Available', value: 5, color: 'text-emerald-700', bg: 'bg-emerald-100' },
  { label: 'Damaged',   value: 2, color: 'text-orange-600',  bg: 'bg-orange-100'  },
  { label: 'Lost',      value: 1, color: 'text-red-600',     bg: 'bg-red-100'     },
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function IntercomDashboard() {
  const leads = getLeads().slice(0, 5)
  const pendingInstallations = getInstallations().filter(o => o.status !== 'completed').slice(0, 3)

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
          {STAT_CARDS_ROW1.map(card => <StatCard key={card.label} {...card} />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          {STAT_CARDS_ROW2.map(card => <StatCard key={card.label} {...card} />)}
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
                {leads.map(lead => (
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

      {/* Section 4 — Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WidgetCard title="Locality-wise Intercom Customers">
          <div className="space-y-3">
            {LOCALITY_SUMMARY.map((l, i) => (
              <div key={l.locality} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <MapPin size={13} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{l.locality}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{l.count}</span>
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Sales Executive-wise Conversions">
          <div className="space-y-3">
            {EXECUTIVE_CONVERSIONS.map((e, i) => (
              <div key={e.name} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <TrendingUp size={13} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{e.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{e.count}</span>
              </div>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Hardware Status Summary">
          <div className="grid grid-cols-2 gap-3">
            {HARDWARE_STATUS.map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
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

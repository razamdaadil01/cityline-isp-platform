import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, TrendingUp, CheckCircle2, XCircle, PhoneCall,
  Layers, ArrowLeft, Target, Award, AlertCircle, Eye,
} from 'lucide-react'
import { getSalesPermission, subscribeSalesPermission, CURRENT_USER } from '../data/salesPermissionStore'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

// ── Brand colours ─────────────────────────────────────────────────────────────

const NAVY   = '#0F2744'
const BLUE   = '#0A8DCD'
const ORANGE = '#E8541A'

// ── Mock data ─────────────────────────────────────────────────────────────────

const FUNNEL_DATA = [
  { stage: 'New Inquiry',  count: 28, fill: BLUE    },
  { stage: 'Contacted',    count: 20, fill: '#22d3ee' },
  { stage: 'Follow-up',    count: 15, fill: '#a855f7' },
  { stage: 'Site Survey',  count: 11, fill: '#f59e0b' },
  { stage: 'Quotation',    count:  8, fill: ORANGE  },
  { stage: 'Negotiation',  count:  5, fill: '#ec4899' },
  { stage: 'Won',          count: 24, fill: '#10b981' },
]

const SOURCE_DATA = [
  { name: 'Website',   value: 28 },
  { name: 'Referral',  value: 24 },
  { name: 'Walk-in',   value: 19 },
  { name: 'Cold Call', value: 16 },
]
const SOURCE_COLORS = [BLUE, '#10b981', ORANGE, '#6b7280']

const REVENUE_DATA = [
  { month: 'Jan', forecast: 420000, actual: 380000 },
  { month: 'Feb', forecast: 480000, actual: 460000 },
  { month: 'Mar', forecast: 520000, actual: 510000 },
  { month: 'Apr', forecast: 560000, actual: 540000 },
  { month: 'May', forecast: 620000, actual: null   },
]

const TOP_EXECS = [
  { name: 'Arjun Kumar',  leads: 28, won: 9, rate: '32.1', revenue: '₹2.4L' },
  { name: 'Preethi Nair', leads: 24, won: 7, rate: '29.2', revenue: '₹2.1L' },
  { name: 'Anita Sharma', leads: 20, won: 5, rate: '25.0', revenue: '₹1.8L' },
  { name: 'Suresh Babu',  leads: 15, won: 3, rate: '20.0', revenue: '₹1.2L' },
  { name: 'Ravi Menon',   leads: 12, won: 2, rate: '16.7', revenue: '₹0.9L' },
]

const TEAM_DATA = [
  { rep: 'Arjun Kumar',  assigned: 28, active: 18, won: 9, lost: 3, rate: '32.1', overdue: 2 },
  { rep: 'Preethi Nair', assigned: 24, active: 16, won: 7, lost: 2, rate: '29.2', overdue: 1 },
  { rep: 'Anita Sharma', assigned: 20, active: 14, won: 5, lost: 3, rate: '25.0', overdue: 3 },
  { rep: 'Suresh Babu',  assigned: 15, active: 11, won: 3, lost: 2, rate: '20.0', overdue: 0 },
]

const TEAM_CONVERSION = TEAM_DATA.map(r => ({ rep: r.rep.split(' ')[0], rate: parseFloat(r.rate) }))

const FOLLOWUP_RATE = [
  { rep: 'Arjun',  rate: 85 },
  { rep: 'Preethi', rate: 78 },
  { rep: 'Anita',  rate: 72 },
  { rep: 'Suresh', rate: 92 },
]

const PIPELINE_DIST = [
  { name: 'B2C',        value: 52, fill: BLUE       },
  { name: 'Enterprise', value: 22, fill: '#0ea5e9'  },
  { name: 'ILL',        value: 13, fill: '#7c3aed'  },
  { name: 'Custom',     value: 10, fill: ORANGE     },
]

const MY_STAGES = [
  { stage: 'Negotiation',  count: 2 },
  { stage: 'Quotation',    count: 2 },
  { stage: 'Site Survey',  count: 2 },
  { stage: 'Follow-up',    count: 3 },
  { stage: 'Contacted',    count: 4 },
  { stage: 'New Inquiry',  count: 5 },
]

const MY_FOLLOWUPS = [
  { name: 'Ramesh Nair',     phone: '9876001122', time: '10:00 AM', priority: 'high'   },
  { name: 'Harish Kulkarni', phone: '9988001133', time: '02:30 PM', priority: 'medium' },
  { name: 'Arun Pillai',     phone: '9087654321', time: '04:00 PM', priority: 'medium' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color, bg }) {
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card px-5 py-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card p-5">
      {title && <h3 className="text-sm font-bold text-gray-800 mb-4">{title}</h3>}
      {children}
    </div>
  )
}

function fmtRevenue(v) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  return `₹${(v / 1000).toFixed(0)}K`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-surface-border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === 'number' && p.value > 10000 ? fmtRevenue(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

// ── Role views ────────────────────────────────────────────────────────────────

function OwnerView() {
  const total = FUNNEL_DATA[0].count + FUNNEL_DATA[1].count + FUNNEL_DATA[2].count + FUNNEL_DATA[3].count +
                FUNNEL_DATA[4].count + FUNNEL_DATA[5].count + FUNNEL_DATA[6].count
  const won = FUNNEL_DATA[6].count

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Leads"      value={87}      icon={Users}        color="text-brand-blue"   bg="bg-brand-blue/10"   />
        <KpiCard label="Won This Month"   value={24}      icon={CheckCircle2} color="text-emerald-700"  bg="bg-emerald-100"     />
        <KpiCard label="Lost"             value={12}      icon={XCircle}      color="text-red-600"      bg="bg-red-100"         />
        <KpiCard label="Conversion Rate"  value="27.6%"   icon={TrendingUp}   color="text-brand-orange" bg="bg-brand-orange/10" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <SectionCard title="Pipeline Funnel — Stage-wise Lead Count">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={FUNNEL_DATA} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                  {FUNNEL_DATA.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        <SectionCard title="Source-wise Leads">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={SOURCE_DATA} cx="50%" cy="50%" innerRadius={52} outerRadius={78}
                dataKey="value" nameKey="name" paddingAngle={3}>
                {SOURCE_DATA.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <SectionCard title="Monthly Revenue Forecast">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={REVENUE_DATA} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `${(v / 100000).toFixed(1)}L`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="forecast" name="Forecast" stroke={BLUE} strokeWidth={2}
                  strokeDasharray="5 3" dot={{ r: 3, fill: BLUE }} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke={ORANGE} strokeWidth={2.5}
                  dot={{ r: 4, fill: ORANGE }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        {/* Top 5 table */}
        <SectionCard title="Top 5 Sales Executives">
          <div className="space-y-2">
            {TOP_EXECS.map((exec, i) => (
              <div key={exec.name} className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                  i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-600' : 'bg-gray-300'
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{exec.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400">{exec.leads} leads</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">{exec.rate}%</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-navy shrink-0">{exec.revenue}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Full table */}
      <SectionCard title="Top Performers — Detailed">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-surface-border">
              {['Name', 'Leads', 'Won', 'Conversion %', 'Revenue'].map(h => (
                <th key={h} className="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {TOP_EXECS.map(exec => (
              <tr key={exec.name} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-2.5 pr-4 font-semibold text-gray-800 text-sm">{exec.name}</td>
                <td className="py-2.5 pr-4 text-gray-600">{exec.leads}</td>
                <td className="py-2.5 pr-4 text-emerald-700 font-medium">{exec.won}</td>
                <td className="py-2.5 pr-4">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    parseFloat(exec.rate) >= 30 ? 'bg-emerald-100 text-emerald-700'
                    : parseFloat(exec.rate) >= 25 ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-700'
                  }`}>{exec.rate}%</span>
                </td>
                <td className="py-2.5 font-bold text-navy">{exec.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  )
}

function ManagerView() {
  return (
    <div className="space-y-5">
      {/* Team performance table */}
      <SectionCard title="Team Performance">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-surface-border">
                {['Sales Rep', 'Assigned', 'Active', 'Won', 'Lost', 'Conversion %', 'Overdue Follow-ups'].map(h => (
                  <th key={h} className="pb-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {TEAM_DATA.map(row => (
                <tr key={row.rep} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 pr-4 font-semibold text-gray-800">{row.rep}</td>
                  <td className="py-3 pr-4 text-gray-600">{row.assigned}</td>
                  <td className="py-3 pr-4 text-brand-blue font-medium">{row.active}</td>
                  <td className="py-3 pr-4 text-emerald-700 font-medium">{row.won}</td>
                  <td className="py-3 pr-4 text-red-600">{row.lost}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      parseFloat(row.rate) >= 30 ? 'bg-emerald-100 text-emerald-700'
                      : parseFloat(row.rate) >= 25 ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'
                    }`}>{row.rate}%</span>
                  </td>
                  <td className="py-3">
                    {row.overdue > 0
                      ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          <AlertCircle size={10} /> {row.overdue}
                        </span>
                      : <span className="text-[11px] text-emerald-600 font-semibold">Clear ✓</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <SectionCard title="Team Conversion Rate (%)">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={TEAM_CONVERSION} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="rep" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `${v}%`} domain={[0, 40]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="rate" name="Conversion %" fill={BLUE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        <SectionCard title="Pipeline Lead Distribution">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={PIPELINE_DIST} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                dataKey="value" nameKey="name" paddingAngle={3}>
                {PIPELINE_DIST.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Follow-up completion */}
      <SectionCard title="Follow-up Completion Rate per Rep">
        <div className="space-y-4">
          {FOLLOWUP_RATE.map(r => (
            <div key={r.rep}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-gray-700">{r.rep}</span>
                <span className="text-sm font-bold text-gray-900">{r.rate}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${r.rate}%`, backgroundColor: r.rate >= 85 ? '#10b981' : r.rate >= 75 ? BLUE : ORANGE }}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function ExecView() {
  const target  = 15
  const achieved = 9
  const pct = Math.round((achieved / target) * 100)

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="My Active Leads" value={18} sub="Across all pipelines"  icon={Users}        color="text-brand-blue"   bg="bg-brand-blue/10"   />
        <KpiCard label="Won"             value={9}  sub="This month"            icon={CheckCircle2} color="text-emerald-700"  bg="bg-emerald-100"     />
        <KpiCard label="Lost"            value={3}  sub="This month"            icon={XCircle}      color="text-red-600"      bg="bg-red-100"         />
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Today's follow-ups */}
        <SectionCard title="Today's Follow-ups">
          <div className="space-y-3">
            {MY_FOLLOWUPS.map(f => (
              <div key={f.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${f.priority === 'high' ? 'bg-brand-orange' : 'bg-brand-blue'}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{f.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{f.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600">{f.time}</span>
                  <a href={`tel:${f.phone}`}>
                    <Button variant="secondary" size="xs">Call</Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Target vs Achievement */}
        <SectionCard title="My Target vs Achievement">
          <div className="text-center py-2 mb-4">
            <div className="text-4xl font-bold" style={{ color: pct >= 80 ? '#10b981' : pct >= 50 ? BLUE : ORANGE }}>
              {pct}%
            </div>
            <p className="text-sm text-gray-500 mt-1">{achieved} of {target} target conversions</p>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(pct, 100)}%`,
                backgroundColor: pct >= 80 ? '#10b981' : pct >= 50 ? BLUE : ORANGE,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>0</span>
            <span className="font-semibold text-gray-700">Target: {target} Won</span>
            <span>{target}</span>
          </div>
          <div className="mt-4 pt-4 border-t border-surface-border grid grid-cols-2 gap-3">
            {[
              { label: 'My Conversion Rate', value: '32.1%', color: 'text-emerald-700' },
              { label: 'Avg. Deal Cycle',    value: '8 days',  color: 'text-brand-blue' },
              { label: 'Revenue Generated',  value: '₹2.4L',   color: 'text-navy'       },
              { label: 'Leads This Month',   value: '28',      color: 'text-gray-800'   },
            ].map(s => (
              <div key={s.label} className="text-center p-2 bg-gray-50 rounded-lg">
                <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* My conversion rate progress + My leads by stage */}
      <div className="grid grid-cols-2 gap-5">
        <SectionCard title="My Leads by Stage">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MY_STAGES} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Leads" fill={BLUE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="My Conversion Rate">
          <div className="flex flex-col items-center justify-center h-full py-4">
            <div className="relative w-36 h-36">
              {/* SVG donut */}
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                <circle cx="60" cy="60" r="48" fill="none" stroke={BLUE} strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 48 * 0.321} ${2 * Math.PI * 48 * (1 - 0.321)}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">32.1%</span>
                <span className="text-[10px] text-gray-500">conversion</span>
              </div>
            </div>
            <div className="mt-4 flex gap-6 text-center">
              <div>
                <p className="text-lg font-bold text-emerald-700">9</p>
                <p className="text-[11px] text-gray-500">Won</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800">28</p>
                <p className="text-[11px] text-gray-500">Total</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-600">3</p>
                <p className="text-[11px] text-gray-500">Lost</p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const ROLES = [
  { key: 'owner',   label: 'Owner'    },
  { key: 'manager', label: 'Manager'  },
  { key: 'exec',    label: 'Sales Exec' },
]

export default function SalesAnalytics() {
  const [role, setRole] = useState('owner')
  const [salesPerm, setSalesPerm] = useState(getSalesPermission)

  useEffect(() => subscribeSalesPermission(setSalesPerm), [])

  const viewMy = salesPerm === 'view_my'
  const activeRole = viewMy ? 'exec' : role

  const ROLE_BG = { owner: NAVY, manager: BLUE, exec: ORANGE }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Top bar */}
      <div className="px-6 pt-6 pb-4 shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/sales">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border hover:bg-gray-50 transition-colors text-gray-500">
                <ArrowLeft size={15} />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Sales Analytics</h1>
              <p className="text-sm text-gray-500 mt-0.5">Performance insights across all pipelines</p>
            </div>
          </div>

          {/* Sales section nav */}
          <div className="flex items-center gap-2">
            <Link to="/sales">
              <Button variant="secondary" size="sm">Pipeline</Button>
            </Link>
            <Link to="/sales/followups">
              <Button variant="secondary" size="sm" icon={<PhoneCall size={13} />}>Follow-ups</Button>
            </Link>
            <Link to="/sales/pipelines">
              <Button variant="secondary" size="sm" icon={<Layers size={13} />}>Pipelines</Button>
            </Link>
          </div>
        </div>

        {/* Scope indicator */}
        {viewMy && (
          <div className="flex items-center gap-2 px-3 py-2 bg-brand-blue/8 border border-brand-blue/20 rounded-lg w-fit">
            <Eye size={13} className="text-brand-blue shrink-0" />
            <span className="text-xs font-medium text-brand-blue">Viewing your leads only — {CURRENT_USER}</span>
          </div>
        )}

        {/* Role toggle — hidden when view_my is active */}
        {!viewMy && (
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit shadow-sm">
            {ROLES.map(r => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                style={role === r.key ? { backgroundColor: ROLE_BG[r.key], color: '#fff' } : {}}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  role === r.key ? 'shadow-sm' : 'text-gray-600 hover:bg-white/60'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {activeRole === 'owner'   && <OwnerView />}
        {activeRole === 'manager' && <ManagerView />}
        {activeRole === 'exec'    && <ExecView />}
      </div>
    </div>
  )
}

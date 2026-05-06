import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts'
import {
  Users, Wifi, TrendingUp, IndianRupee, AlertTriangle,
  CheckCircle2, Clock, XCircle, RefreshCw, PhoneCall,
  FileText, Server, Activity, ArrowUpRight, ArrowDownRight,
  ChevronRight, Zap,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

// ─── Mock data ────────────────────────────────────────────────────────────────

const SERVICE_PILLS = [
  { label: 'FTTH', count: 842, color: 'bg-brand-blue text-white' },
  { label: 'FTTB', count: 234, color: 'bg-navy text-white' },
  { label: 'Wireless', count: 156, color: 'bg-brand-orange text-white' },
  { label: 'P2P', count: 67, color: 'bg-purple-600 text-white' },
  { label: 'Leased Line', count: 28, color: 'bg-emerald-600 text-white' },
]

const STAT_CARDS = [
  {
    label: 'Total Customers',
    value: '1,327',
    change: '+12',
    period: 'this month',
    trend: 'up',
    icon: <Users size={20} />,
    iconBg: 'bg-brand-blue/10',
    iconColor: 'text-brand-blue',
  },
  {
    label: 'Active Connections',
    value: '1,189',
    change: '+8',
    period: 'this month',
    trend: 'up',
    icon: <Wifi size={20} />,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    label: 'Inactive / Suspended',
    value: '138',
    change: '-4',
    period: 'this month',
    trend: 'down',
    icon: <XCircle size={20} />,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
  },
  {
    label: "Today's Collection",
    value: '₹1,24,500',
    change: '+18%',
    period: 'vs yesterday',
    trend: 'up',
    icon: <IndianRupee size={20} />,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    label: 'Open Tickets',
    value: '47',
    change: '-3',
    period: 'since morning',
    trend: 'down',
    icon: <AlertTriangle size={20} />,
    iconBg: 'bg-brand-orange/10',
    iconColor: 'text-brand-orange',
  },
  {
    label: 'Renewals Due Today',
    value: '23',
    change: '8 pending',
    trend: 'neutral',
    icon: <RefreshCw size={20} />,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
]

const REVENUE_DATA = [
  { month: 'Nov', collected: 385000, target: 420000, outstanding: 35000 },
  { month: 'Dec', collected: 412000, target: 430000, outstanding: 18000 },
  { month: 'Jan', collected: 395000, target: 440000, outstanding: 45000 },
  { month: 'Feb', collected: 428000, target: 445000, outstanding: 17000 },
  { month: 'Mar', collected: 451000, target: 460000, outstanding: 9000 },
  { month: 'Apr', collected: 438000, target: 470000, outstanding: 32000 },
  { month: 'May', collected: 124500, target: 480000, outstanding: 0 },
]

const RENEWAL_FORECAST = [
  { period: 'Today', count: 23, amount: '₹28,750', status: 'urgent' },
  { period: 'Tomorrow', count: 31, amount: '₹38,900', status: 'warning' },
  { period: 'This Week', count: 128, amount: '₹1,60,000', status: 'info' },
  { period: 'This Month', count: 412, amount: '₹5,15,000', status: 'normal' },
]

const TODAYS_COLLECTIONS = [
  { time: '09:12 AM', customer: 'Rajan Mehta', plan: 'FTTH 100Mbps', amount: '₹699', mode: 'UPI' },
  { time: '09:34 AM', customer: 'Priya Sharma', plan: 'FTTB 50Mbps', amount: '₹499', mode: 'Cash' },
  { time: '10:05 AM', customer: 'Suresh Kumar', plan: 'Wireless 25Mbps', amount: '₹399', mode: 'Card' },
  { time: '10:47 AM', customer: 'Anita Desai', plan: 'FTTH 200Mbps', amount: '₹999', mode: 'UPI' },
  { time: '11:15 AM', customer: 'Vikram Singh', plan: 'P2P 1Gbps', amount: '₹4,500', mode: 'NEFT' },
]

const LEAD_PIPELINE = [
  { stage: 'New Inquiry', count: 18, color: 'bg-blue-500' },
  { stage: 'Site Survey', count: 11, color: 'bg-purple-500' },
  { stage: 'Quotation Sent', count: 7, color: 'bg-amber-500' },
  { stage: 'Negotiation', count: 4, color: 'bg-orange-500' },
  { stage: 'CAF Submitted', count: 3, color: 'bg-emerald-500' },
]

const CAF_COMPLIANCE = [
  { label: 'CAF Submitted', value: 312, total: 350, color: '#0A8DCD' },
  { label: 'Pending Upload', value: 28, total: 350, color: '#E8541A' },
  { label: 'Rejected', value: 10, total: 350, color: '#ef4444' },
]

const JAZE_STATUS = [
  { label: 'Radius Server', status: 'online', latency: '4ms' },
  { label: 'Billing Engine', status: 'online', latency: '12ms' },
  { label: 'API Gateway', status: 'online', latency: '8ms' },
  { label: 'NMS Poller', status: 'degraded', latency: '210ms' },
  { label: 'Mail Server', status: 'online', latency: '35ms' },
  { label: 'SMS Gateway', status: 'offline', latency: '—' },
]

const SUPPORT_OVERVIEW = [
  { label: 'New', count: 12, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
  { label: 'In Progress', count: 19, color: 'text-amber-600', bg: 'bg-amber-100' },
  { label: 'Pending Customer', count: 8, color: 'text-purple-600', bg: 'bg-purple-100' },
  { label: 'Resolved Today', count: 14, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { label: 'SLA Breached', count: 4, color: 'text-red-600', bg: 'bg-red-100' },
]

const RECENT_TICKETS = [
  { id: 'TK-1028', customer: 'Mohan Lal', issue: 'No Internet', priority: 'high', age: '2h' },
  { id: 'TK-1027', customer: 'Radha Krishnan', issue: 'Slow Speed', priority: 'medium', age: '4h' },
  { id: 'TK-1026', customer: 'Deepak Patel', issue: 'Router Config', priority: 'low', age: '6h' },
  { id: 'TK-1025', customer: 'Sunita Rao', issue: 'Billing Query', priority: 'low', age: '8h' },
]

const PIE_DATA = [
  { name: 'FTTH', value: 842, color: '#0A8DCD' },
  { name: 'FTTB', value: 234, color: '#0F2744' },
  { name: 'Wireless', value: 156, color: '#E8541A' },
  { name: 'P2P', value: 67, color: '#7c3aed' },
  { name: 'Leased', value: 28, color: '#059669' },
]

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

function PriorityBadge({ priority }) {
  const map = { high: 'red', medium: 'yellow', low: 'gray' }
  return <Badge variant={map[priority]} size="sm" dot>{priority}</Badge>
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px]">

      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back, Admin. Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />}>Refresh</Button>
          <Button size="sm" icon={<FileText size={14} />}>Export Report</Button>
        </div>
      </div>

      {/* Service type pills */}
      <div>
        <SectionTitle>Active Services by Type</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {SERVICE_PILLS.map((s) => (
            <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${s.color} shadow-sm cursor-pointer hover:opacity-90 transition-opacity`}>
              <Wifi size={14} />
              <span>{s.label}</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-xs">{s.count}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors">
            <span>Total Active</span>
            <span className="bg-white px-1.5 py-0.5 rounded-md text-xs font-bold text-gray-800">1,327</span>
          </div>
        </div>
      </div>

      {/* Stat cards row */}
      <div>
        <SectionTitle>Key Metrics</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {STAT_CARDS.map((card) => (
            <div key={card.label} className="bg-white rounded-xl p-4 shadow-card border border-surface-border">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 leading-tight">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1.5 leading-none">{card.value}</p>
                  <p className={`text-xs mt-1.5 font-medium flex items-center gap-1 ${
                    card.trend === 'up' ? 'text-emerald-600' :
                    card.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {card.trend === 'up' && <ArrowUpRight size={12} />}
                    {card.trend === 'down' && <ArrowDownRight size={12} />}
                    <span>{card.change}</span>
                    {card.period && <span className="text-gray-400 font-normal">{card.period}</span>}
                  </p>
                </div>
                <div className={`w-9 h-9 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0 ml-2`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
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
              {['6M', '3M', '1M'].map((t) => (
                <button key={t} className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors
                  ${t === '6M' ? 'bg-brand-blue text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {t}
                </button>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={REVENUE_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0A8DCD" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0A8DCD" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F2744" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#0F2744" stopOpacity={0} />
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
              <Area type="monotone" dataKey="target" name="Target" stroke="#0F2744" strokeWidth={2}
                strokeDasharray="5 3" fill="url(#colorTarget)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </WidgetCard>

        {/* Connection Mix */}
        <WidgetCard title="Connection Mix">
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                dataKey="value" paddingAngle={3}>
                {PIE_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v} customers`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {PIE_DATA.map((d) => (
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
      </div>

      {/* Row: Renewal Forecast + Today's Collection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Renewal Forecast */}
        <WidgetCard title="Renewal Forecast" action={<Button variant="ghost" size="xs" iconRight={<ChevronRight size={12} />}>View All</Button>}>
          <div className="space-y-3">
            {RENEWAL_FORECAST.map((r) => {
              const variantMap = { urgent: 'red', warning: 'yellow', info: 'blue', normal: 'gray' }
              const widthMap = { urgent: 'w-[18%]', warning: 'w-[24%]', info: '!w-[50%]', normal: 'w-full' }
              return (
                <div key={r.period} className="flex items-center gap-4">
                  <div className="w-24 shrink-0">
                    <p className="text-xs font-semibold text-gray-700">{r.period}</p>
                    <p className="text-xs text-gray-400">{r.amount}</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all
                        ${r.status === 'urgent' ? 'bg-red-500' : r.status === 'warning' ? 'bg-amber-400' : r.status === 'info' ? 'bg-brand-blue' : 'bg-emerald-500'}
                        ${r.period === 'Today' ? 'w-[18%]' : r.period === 'Tomorrow' ? 'w-[24%]' : r.period === 'This Week' ? 'w-[50%]' : 'w-full'}
                      `} />
                    </div>
                  </div>
                  <div className="w-12 text-right">
                    <Badge variant={variantMap[r.status]} size="sm">{r.count}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-surface-border grid grid-cols-3 gap-3">
            {[
              { label: 'Collected', value: '15', color: 'text-emerald-600' },
              { label: 'Pending', value: '8', color: 'text-amber-600' },
              { label: 'Expired', value: '0', color: 'text-red-500' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </WidgetCard>

        {/* Today's Collection */}
        <WidgetCard title="Today's Collections" action={
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-sm font-bold text-emerald-600">₹1,24,500</p>
            </div>
            <Button variant="ghost" size="xs" iconRight={<ChevronRight size={12} />}>View All</Button>
          </div>
        }>
          <div className="space-y-3">
            {TODAYS_COLLECTIONS.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                  <IndianRupee size={14} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.customer}</p>
                  <p className="text-xs text-gray-400">{c.plan} · {c.time}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{c.amount}</p>
                  <Badge variant={c.mode === 'UPI' ? 'blue' : c.mode === 'Cash' ? 'green' : c.mode === 'Card' ? 'purple' : 'navy'} size="sm">
                    {c.mode}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>

      {/* Row: Lead Pipeline + CAF Compliance + Jaze Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Pipeline */}
        <WidgetCard title="Sales Lead Pipeline" action={<Button variant="ghost" size="xs" iconRight={<ChevronRight size={12} />}>View</Button>}>
          <div className="space-y-3">
            {LEAD_PIPELINE.map((stage) => (
              <div key={stage.stage} className="flex items-center gap-3">
                <div className="w-32 shrink-0">
                  <p className="text-xs text-gray-600 font-medium truncate">{stage.stage}</p>
                </div>
                <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                  <div
                    className={`h-full ${stage.color} rounded-lg flex items-center justify-end pr-2 transition-all`}
                    style={{ width: `${Math.round((stage.count / 18) * 100)}%` }}
                  >
                    <span className="text-white text-xs font-bold">{stage.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-surface-border flex items-center justify-between">
            <p className="text-xs text-gray-500">Total leads in pipeline</p>
            <span className="text-lg font-bold text-gray-900">43</span>
          </div>
        </WidgetCard>

        {/* CAF Compliance */}
        <WidgetCard title="CAF Compliance">
          <div className="space-y-3">
            {CAF_COMPLIANCE.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-600 font-medium">{item.label}</p>
                  <p className="text-xs font-bold text-gray-800">{item.value} <span className="text-gray-400 font-normal">/ {item.total}</span></p>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round((item.value / item.total) * 100)}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-surface-border flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <p className="text-xs text-gray-600">
              <span className="font-semibold text-emerald-600">89.1%</span> compliance rate this month
            </p>
          </div>
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" size="xs" className="flex-1">Upload CAF</Button>
            <Button size="xs" className="flex-1">View Report</Button>
          </div>
        </WidgetCard>

        {/* Jaze / NMS Status */}
        <WidgetCard title="Jaze Network Status" action={
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Live
          </div>
        }>
          <div className="space-y-2.5">
            {JAZE_STATUS.map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot status={s.status} />
                  <span className="text-sm text-gray-700">{s.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">{s.latency}</span>
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
            Last synced: just now · <span className="text-brand-blue cursor-pointer hover:underline">View full report</span>
          </div>
        </WidgetCard>
      </div>

      {/* Row: Support Overview + Recent Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Support Overview */}
        <WidgetCard title="Support Overview">
          <div className="grid grid-cols-2 gap-3">
            {SUPPORT_OVERVIEW.map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-surface-border">
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
          action={<Button variant="ghost" size="xs" iconRight={<ChevronRight size={12} />}>All Tickets</Button>}
        >
          <div className="space-y-2">
            {RECENT_TICKETS.map((t) => (
              <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="w-8 h-8 bg-navy/10 rounded-lg flex items-center justify-center shrink-0">
                  <AlertTriangle size={14} className="text-navy" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">{t.id}</span>
                    <PriorityBadge priority={t.priority} />
                  </div>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{t.customer}</p>
                  <p className="text-xs text-gray-500">{t.issue}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">{t.age} ago</p>
                  <Button variant="ghost" size="xs" className="mt-1">View</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-surface-border flex gap-2">
            <Button size="sm" variant="secondary" className="flex-1" icon={<Zap size={13} />}>New Ticket</Button>
            <Button size="sm" variant="secondary" className="flex-1" icon={<Activity size={13} />}>View SLA Report</Button>
          </div>
        </WidgetCard>
      </div>

    </div>
  )
}

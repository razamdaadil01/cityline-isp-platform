import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, LineChart, Line, AreaChart, Area,
} from 'recharts'
import {
  Download, TrendingDown, TrendingUp, Receipt, Store,
  Package, FileText, ArrowLeft, AlertCircle, CheckCircle2,
  Clock, ChevronRight,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { Input, Select } from '../components/ui/FormInputs'

// ── Mock data ─────────────────────────────────────────────────────────────────

const MONTHLY_REVENUE = [
  { month: 'Dec', revenue: 412000, expenses: 180000, profit: 232000 },
  { month: 'Jan', revenue: 395000, expenses: 175000, profit: 220000 },
  { month: 'Feb', revenue: 428000, expenses: 182000, profit: 246000 },
  { month: 'Mar', revenue: 451000, expenses: 190000, profit: 261000 },
  { month: 'Apr', revenue: 438000, expenses: 185000, profit: 253000 },
  { month: 'May', revenue: 124500, expenses: 60000,  profit: 64500  },
]

const SERVICE_BREAKDOWN = [
  { service: 'Fiber - 50 Mbps',   customers: 342, revenue: 342000, pct: 27 },
  { service: 'Fiber - 100 Mbps',  customers: 281, revenue: 421500, pct: 34 },
  { service: 'Fiber - 200 Mbps',  customers: 156, revenue: 312000, pct: 25 },
  { service: 'Fiber - 500 Mbps',  customers: 89,  revenue: 267000, pct: 11 },
  { service: 'Broadband - 25 Mbps', customers: 45, revenue: 45000, pct: 3  },
]

const CAF_GAUGE_DATA = [{ name: 'Compliance', value: 78, fill: '#0A8DCD' }]

const INCOMPLETE_CAFS = [
  { id: 'CAF-1042', customer: 'Rajesh Mehta',    issue: 'Photo ID missing',       date: '2026-04-12', plan: '100 Mbps' },
  { id: 'CAF-1089', customer: 'Priya Sharma',    issue: 'Signature missing',      date: '2026-04-18', plan: '50 Mbps'  },
  { id: 'CAF-1105', customer: 'Sunil Verma',     issue: 'Address proof expired',  date: '2026-04-21', plan: '200 Mbps' },
  { id: 'CAF-1122', customer: 'Deepa Nair',      issue: 'Form not signed',        date: '2026-04-29', plan: '100 Mbps' },
  { id: 'CAF-1138', customer: 'Arjun Patel',     issue: 'Photo quality poor',     date: '2026-05-02', plan: '500 Mbps' },
  { id: 'CAF-1149', customer: 'Neha Kulkarni',   issue: 'DOB mismatch',           date: '2026-05-04', plan: '50 Mbps'  },
]

const CHURN_DATA = [
  { month: 'Dec', churned: 12, newJoins: 34, net: 22 },
  { month: 'Jan', churned: 15, newJoins: 28, net: 13 },
  { month: 'Feb', churned: 9,  newJoins: 42, net: 33 },
  { month: 'Mar', churned: 11, newJoins: 38, net: 27 },
  { month: 'Apr', churned: 14, newJoins: 31, net: 17 },
  { month: 'May', churned: 6,  newJoins: 14, net: 8  },
]

const COLLECTION_DATA = [
  { month: 'Dec', collected: 398000, pending: 14000 },
  { month: 'Jan', collected: 382000, pending: 13000 },
  { month: 'Feb', collected: 415000, pending: 13000 },
  { month: 'Mar', collected: 441000, pending: 10000 },
  { month: 'Apr', collected: 425000, pending: 13000 },
  { month: 'May', collected: 118000, pending: 6500  },
]

const PARTNER_COLLECTION = [
  { partner: 'Andheri Store',   collected: 312000, pending: 18000, pct: 95 },
  { partner: 'Bandra Store',    collected: 275000, pending: 22000, pct: 93 },
  { partner: 'Thane Store',     collected: 198000, pending: 14000, pct: 93 },
  { partner: 'Kurla Store',     collected: 142000, pending: 8000,  pct: 95 },
  { partner: 'Borivali Store',  collected: 89000,  pending: 6500,  pct: 93 },
]

const INV_CATEGORY_DATA = [
  { name: 'CPE',        value: 165, fill: '#0A8DCD' },
  { name: 'Router',     value: 75,  fill: '#0F2744' },
  { name: 'Fiber',      value: 200, fill: '#059669' },
  { name: 'Hardware',   value: 95,  fill: '#E8541A' },
  { name: 'Networking', value: 78,  fill: '#7c3aed' },
]

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

function RevenueDetail({ range, onRangeChange }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Revenue (6m)', value: '₹22,48,500', up: true },
          { label: 'Total Profit (6m)',  value: '₹12,76,500', up: true },
          { label: 'ARPU (May)',         value: '₹524',        up: true },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-surface-border">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-surface-border p-5">
        <h4 className="text-sm font-semibold text-gray-800 mb-4">Month-wise Revenue vs Expenses</h4>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={MONTHLY_REVENUE} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
              tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`]} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="revenue"  name="Revenue"  fill="#0A8DCD" radius={[4,4,0,0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#0F2744" radius={[4,4,0,0]} />
            <Bar dataKey="profit"   name="Profit"   fill="#059669" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <h4 className="text-sm font-semibold text-gray-800">Service-wise Revenue Breakdown</h4>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-surface-border">
              {['Service Plan', 'Active Customers', 'Revenue (₹)', 'Share %'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {SERVICE_BREAKDOWN.map(s => (
              <tr key={s.service} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-800">{s.service}</td>
                <td className="px-4 py-3 text-gray-700">{s.customers}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">₹{s.revenue.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-blue rounded-full" style={{ width: `${s.pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{s.pct}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total CAFs',       value: '1,189', color: 'text-gray-900' },
          { label: 'Compliant CAFs',   value: '927',   color: 'text-green-600' },
          { label: 'Incomplete CAFs',  value: '262',   color: 'text-amber-600' },
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
              startAngle={180} endAngle={0} data={CAF_GAUGE_DATA}>
              <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#f0f4f8' }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="text-3xl font-bold text-navy -mt-10">78%</p>
          <p className="text-xs text-gray-400 mt-1">CAF Compliance</p>
          <div className="mt-3 flex gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-blue inline-block" /> Compliant</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" /> Remaining</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-surface-border p-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Issue Breakdown</h4>
          <div className="space-y-2.5">
            {[
              { issue: 'Photo ID missing',    count: 89, color: '#E8541A' },
              { issue: 'Signature missing',   count: 74, color: '#0A8DCD' },
              { issue: 'Address proof issue', count: 61, color: '#0F2744' },
              { issue: 'Form not signed',     count: 38, color: '#059669' },
            ].map(i => (
              <div key={i.issue}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{i.issue}</span><span className="font-medium">{i.count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(i.count / 89) * 100}%`, background: i.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">Incomplete CAF List</h4>
          <Badge variant="yellow" size="sm">{INCOMPLETE_CAFS.length} pending action</Badge>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-surface-border">
              {['CAF ID', 'Customer', 'Plan', 'Issue', 'Date', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {INCOMPLETE_CAFS.map(c => (
              <tr key={c.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.id}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{c.customer}</td>
                <td className="px-4 py-3"><Badge variant="blue" size="sm">{c.plan}</Badge></td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-amber-600 text-xs font-medium">
                    <AlertCircle size={12} />{c.issue}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{c.date}</td>
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
      </div>
    </div>
  )
}

function ChurnDetail() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Avg Monthly Churn',  value: '11.2/mo', color: 'text-red-500' },
          { label: 'Avg New Joins',      value: '31.2/mo', color: 'text-green-600' },
          { label: 'Net Growth (6m)',    value: '+120',     color: 'text-brand-blue' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-surface-border">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-surface-border p-5">
        <h4 className="text-sm font-semibold text-gray-800 mb-4">Churn vs New Joins (6 Months)</h4>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={CHURN_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
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
            <Area type="monotone" dataKey="churned"  name="Churned"   stroke="#ef4444" fill="url(#colorChurn)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CollectionDetail() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Collected (6m)',    value: '₹21,79,000', color: 'text-green-600' },
          { label: 'Pending (6m)',      value: '₹69,500',    color: 'text-amber-600' },
          { label: 'Collection Rate',  value: '96.9%',       color: 'text-brand-blue' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-surface-border">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-surface-border p-5">
        <h4 className="text-sm font-semibold text-gray-800 mb-4">Monthly Collection vs Pending</h4>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={COLLECTION_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
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

function InventoryReportDetail() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Units In Stock', value: '613',  color: 'text-brand-blue' },
          { label: 'Low / Critical SKUs', value: '6',    color: 'text-amber-600' },
          { label: 'Total SKUs Tracked',  value: '10',   color: 'text-gray-900' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-surface-border">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-surface-border p-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-4">Stock by Category</h4>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={INV_CATEGORY_DATA} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}
                labelLine={false} fontSize={11}>
                {INV_CATEGORY_DATA.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-surface-border p-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Category Breakdown</h4>
          <div className="space-y-3">
            {INV_CATEGORY_DATA.map(c => (
              <div key={c.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: c.fill }} />
                <span className="text-sm text-gray-700 flex-1">{c.name}</span>
                <span className="text-sm font-semibold text-gray-900">{c.value}</span>
                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(c.value / 200) * 100}%`, background: c.fill }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
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

  const activeCard = REPORT_CARDS.find(c => c.id === active)
  const DetailView = active ? DETAIL_VIEWS[active] : null

  return (
    <div className="p-6 space-y-6 max-w-[1600px]">
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
              {active ? activeCard?.title : 'Reports'}
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
          <Button variant="secondary" size="sm" icon={<Download size={14} />}>Export Excel</Button>
        </div>
      </div>

      {/* Summary stat strip */}
      {!active && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Revenue (May)', value: '₹1,24,500', sub: '26% of monthly target' },
            { label: 'Active Customers', value: '1,189', sub: 'Net +8 this month' },
            { label: 'ARPU', value: '₹524', sub: '+₹12 vs last month' },
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
      {!active && (
        <div className="grid grid-cols-3 gap-4">
          {REPORT_CARDS.map(card => {
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
      {active && DetailView && (
        <DetailView range={{ from: dateFrom, to: dateTo }} />
      )}
    </div>
  )
}

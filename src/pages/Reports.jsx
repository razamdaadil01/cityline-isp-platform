import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Download } from 'lucide-react'
import Button from '../components/ui/Button'

const MONTHLY_DATA = [
  { month: 'Dec', revenue: 412000, expenses: 180000, profit: 232000 },
  { month: 'Jan', revenue: 395000, expenses: 175000, profit: 220000 },
  { month: 'Feb', revenue: 428000, expenses: 182000, profit: 246000 },
  { month: 'Mar', revenue: 451000, expenses: 190000, profit: 261000 },
  { month: 'Apr', revenue: 438000, expenses: 185000, profit: 253000 },
  { month: 'May', revenue: 124500, expenses: 60000, profit: 64500 },
]

export default function Reports() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Business analytics and performance reports</p>
        </div>
        <Button variant="secondary" size="sm" icon={<Download size={14} />}>Export All</Button>
      </div>

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

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-gray-800">Revenue vs Expenses (6 Months)</h3>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={MONTHLY_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#0A8DCD" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#0F2744" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="Profit" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          'Collection Report', 'Customer Growth Report',
          'Support SLA Report', 'Network Uptime Report',
          'CAF Compliance Report', 'Plan-wise Revenue Report',
        ].map(r => (
          <div key={r} className="bg-white rounded-xl p-4 shadow-card border border-surface-border flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">{r}</p>
            <Button variant="secondary" size="xs" icon={<Download size={12} />}>Download</Button>
          </div>
        ))}
      </div>
    </div>
  )
}

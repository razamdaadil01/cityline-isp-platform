import { Plus } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

const TICKETS = [
  { id: 'TK-1028', customer: 'Mohan Lal', phone: '9765432198', issue: 'No Internet', category: 'Connectivity', priority: 'high', status: 'open', assigned: 'Ravi T.', created: '2026-05-06 08:10' },
  { id: 'TK-1027', customer: 'Radha Krishnan', phone: '9812334455', issue: 'Slow Speed', category: 'Performance', priority: 'medium', status: 'in-progress', assigned: 'Neha M.', created: '2026-05-06 06:30' },
  { id: 'TK-1026', customer: 'Deepak Patel', phone: '9988776655', issue: 'Router Config', category: 'Hardware', priority: 'low', status: 'in-progress', assigned: 'Ravi T.', created: '2026-05-05 15:00' },
  { id: 'TK-1025', customer: 'Sunita Rao', phone: '9123456789', issue: 'Billing Query', category: 'Billing', priority: 'low', status: 'pending-customer', assigned: 'Neha M.', created: '2026-05-05 12:45' },
  { id: 'TK-1024', customer: 'Arjun Nair', phone: '9876543210', issue: 'Port Down', category: 'Network', priority: 'high', status: 'escalated', assigned: 'Manager', created: '2026-05-05 10:00' },
]

const PRIORITY_VARIANT = { high: 'red', medium: 'yellow', low: 'gray' }
const STATUS_VARIANT = { open: 'blue', 'in-progress': 'orange', 'pending-customer': 'purple', escalated: 'red', resolved: 'green' }

export default function Support() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Support & Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and resolve customer support requests</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />}>New Ticket</Button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'New', count: 12, bg: 'bg-brand-blue/10', text: 'text-brand-blue' },
          { label: 'In Progress', count: 19, bg: 'bg-amber-100', text: 'text-amber-600' },
          { label: 'Pending Customer', count: 8, bg: 'bg-purple-100', text: 'text-purple-600' },
          { label: 'Resolved Today', count: 14, bg: 'bg-emerald-100', text: 'text-emerald-600' },
          { label: 'SLA Breached', count: 4, bg: 'bg-red-100', text: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${s.text}`}>{s.count}</p>
            <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-gray-800">Active Tickets</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                {['Ticket ID', 'Customer', 'Issue', 'Category', 'Priority', 'Status', 'Assigned', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {TICKETS.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-brand-blue font-semibold">{t.id}</td>
                  <td className="px-4 py-3"><p className="font-medium text-gray-800">{t.customer}</p><p className="text-xs text-gray-400">{t.phone}</p></td>
                  <td className="px-4 py-3 text-gray-700">{t.issue}</td>
                  <td className="px-4 py-3"><Badge variant="gray" size="sm">{t.category}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={PRIORITY_VARIANT[t.priority]} dot size="sm">{t.priority}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[t.status]} size="sm">{t.status}</Badge></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{t.assigned}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{t.created}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="xs">View</Button>
                      <Button variant="ghost" size="xs">Assign</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import { Plus, Download } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

const INVOICES = [
  { id: 'INV-8821', customer: 'Rajan Mehta', plan: 'FTTH 100Mbps', amount: '₹699', due: '2026-05-31', status: 'paid', date: '2026-05-01' },
  { id: 'INV-8822', customer: 'Priya Sharma', plan: 'FTTB 50Mbps', amount: '₹499', due: '2026-05-20', status: 'pending', date: '2026-05-01' },
  { id: 'INV-8823', customer: 'Suresh Kumar', plan: 'Wireless 25Mbps', amount: '₹399', due: '2026-04-15', status: 'overdue', date: '2026-04-01' },
  { id: 'INV-8824', customer: 'Anita Desai', plan: 'FTTH 200Mbps', amount: '₹999', due: '2026-06-30', status: 'paid', date: '2026-05-01' },
  { id: 'INV-8825', customer: 'Vikram Singh', plan: 'P2P 1Gbps', amount: '₹4,500', due: '2026-07-15', status: 'pending', date: '2026-05-01' },
]

const STATUS_VARIANT = { paid: 'green', pending: 'yellow', overdue: 'red' }

export default function Billing() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage invoices, collections and payment records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />}>Export</Button>
          <Button size="sm" icon={<Plus size={14} />}>New Invoice</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Billed (May)', value: '₹5,15,000', color: 'text-gray-900' },
          { label: 'Collected', value: '₹1,24,500', color: 'text-emerald-600' },
          { label: 'Pending', value: '₹3,82,000', color: 'text-amber-600' },
          { label: 'Overdue', value: '₹8,500', color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-card border border-surface-border">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Invoice Register</h3>
          <div className="flex gap-1">
            {['All', 'Paid', 'Pending', 'Overdue'].map(f => (
              <button key={f} className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${f === 'All' ? 'bg-brand-blue text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                {['Invoice #', 'Customer', 'Plan', 'Amount', 'Issue Date', 'Due Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {INVOICES.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-brand-blue font-semibold">{inv.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{inv.customer}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.plan}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{inv.amount}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{inv.date}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{inv.due}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[inv.status]} dot size="sm">{inv.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="xs">View</Button>
                      <Button variant="ghost" size="xs">Print</Button>
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

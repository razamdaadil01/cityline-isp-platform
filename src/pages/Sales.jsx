import { Plus } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

const LEADS = [
  { id: 'LD-201', name: 'Ramesh Nair', phone: '9876001122', source: 'Website', stage: 'New Inquiry', assigned: 'Arjun', date: '2026-05-06' },
  { id: 'LD-202', name: 'Sunita Bose', phone: '9765443322', source: 'Referral', stage: 'Site Survey', assigned: 'Preethi', date: '2026-05-05' },
  { id: 'LD-203', name: 'Harish Kulkarni', phone: '9988001133', source: 'Walk-in', stage: 'Quotation Sent', assigned: 'Arjun', date: '2026-05-04' },
  { id: 'LD-204', name: 'Meena Iyer', phone: '9123887766', source: 'Social Media', stage: 'Negotiation', assigned: 'Preethi', date: '2026-05-03' },
  { id: 'LD-205', name: 'Deepak Joshi', phone: '9011556677', source: 'Cold Call', stage: 'CAF Submitted', assigned: 'Arjun', date: '2026-05-01' },
]

const STAGE_VARIANT = { 'New Inquiry': 'blue', 'Site Survey': 'purple', 'Quotation Sent': 'yellow', 'Negotiation': 'orange', 'CAF Submitted': 'green' }

export default function Sales() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sales & Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your lead pipeline and conversions</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />}>Add Lead</Button>
      </div>

      {/* Kanban-style stage count */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { stage: 'New Inquiry', count: 18, color: 'border-blue-400 bg-blue-50' },
          { stage: 'Site Survey', count: 11, color: 'border-purple-400 bg-purple-50' },
          { stage: 'Quotation', count: 7, color: 'border-amber-400 bg-amber-50' },
          { stage: 'Negotiation', count: 4, color: 'border-orange-400 bg-orange-50' },
          { stage: 'CAF Done', count: 3, color: 'border-emerald-400 bg-emerald-50' },
        ].map(s => (
          <div key={s.stage} className={`border-l-4 ${s.color} rounded-lg p-4`}>
            <p className="text-2xl font-bold text-gray-900">{s.count}</p>
            <p className="text-xs text-gray-600 mt-0.5">{s.stage}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-gray-800">All Leads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                {['Lead ID', 'Name', 'Phone', 'Source', 'Stage', 'Assigned To', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {LEADS.map(l => (
                <tr key={l.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{l.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{l.name}</td>
                  <td className="px-4 py-3 text-gray-600">{l.phone}</td>
                  <td className="px-4 py-3"><Badge variant="gray" size="sm">{l.source}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={STAGE_VARIANT[l.stage]} size="sm">{l.stage}</Badge></td>
                  <td className="px-4 py-3 text-gray-600">{l.assigned}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{l.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="xs">View</Button>
                      <Button variant="ghost" size="xs">Update</Button>
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

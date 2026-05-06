import { Plus } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

const ITEMS = [
  { id: 'ITM-001', name: 'ONT Device - ZTE F660', category: 'CPE', total: 120, allocated: 98, available: 22, status: 'adequate' },
  { id: 'ITM-002', name: 'TP-Link Router AC1200', category: 'Router', total: 75, allocated: 64, available: 11, status: 'low' },
  { id: 'ITM-003', name: 'Cat6 Cable (per roll)', category: 'Cable', total: 50, allocated: 38, available: 12, status: 'adequate' },
  { id: 'ITM-004', name: 'SC/APC Connector', category: 'Fiber', total: 500, allocated: 482, available: 18, status: 'critical' },
  { id: 'ITM-005', name: 'Outdoor Enclosure Box', category: 'Hardware', total: 30, allocated: 28, available: 2, status: 'critical' },
  { id: 'ITM-006', name: 'SFP Module 1G', category: 'Networking', total: 40, allocated: 32, available: 8, status: 'low' },
]

const STATUS_VARIANT = { adequate: 'green', low: 'yellow', critical: 'red' }

export default function Inventory() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track equipment, CPE devices and stock levels</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />}>Add Item</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total SKUs', value: '24', color: 'text-gray-900' },
          { label: 'Low Stock', value: '4', color: 'text-amber-600' },
          { label: 'Critical Stock', value: '2', color: 'text-red-500' },
          { label: 'Items Allocated', value: '742', color: 'text-brand-blue' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-card border border-surface-border">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-gray-800">Stock Register</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                {['Item ID', 'Name', 'Category', 'Total', 'Allocated', 'Available', 'Stock Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {ITEMS.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                  <td className="px-4 py-3"><Badge variant="gray" size="sm">{item.category}</Badge></td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{item.total}</td>
                  <td className="px-4 py-3 text-gray-600">{item.allocated}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{item.available}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[item.status]} dot size="sm">{item.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="xs">Edit</Button>
                      <Button variant="ghost" size="xs">Issue</Button>
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

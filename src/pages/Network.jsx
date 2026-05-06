import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { RefreshCw, Plus } from 'lucide-react'

const NODES = [
  { id: 'SW-01', name: 'Core Switch - HQ', type: 'Layer 3 Switch', ip: '10.0.0.1', uptime: '98.7%', status: 'online', ports: '48/48' },
  { id: 'SW-02', name: 'Distribution - Andheri', type: 'Layer 2 Switch', ip: '10.1.0.1', uptime: '99.1%', status: 'online', ports: '24/24' },
  { id: 'OLT-01', name: 'OLT - Versova', type: 'GPON OLT', ip: '10.2.0.1', uptime: '97.4%', status: 'online', ports: '8/8' },
  { id: 'OLT-02', name: 'OLT - Bandra', type: 'GPON OLT', ip: '10.3.0.1', uptime: '95.0%', status: 'degraded', ports: '6/8' },
  { id: 'AP-01', name: 'AP Tower - Goregaon', type: 'Wireless AP', ip: '10.4.0.1', uptime: '88.3%', status: 'degraded', ports: '—' },
  { id: 'RTR-01', name: 'Border Router', type: 'Core Router', ip: '10.0.0.254', uptime: '99.9%', status: 'online', ports: '—' },
]

const STATUS_VARIANT = { online: 'green', degraded: 'yellow', offline: 'red' }

export default function Network() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Network</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor network nodes, OLTs, and infrastructure</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />}>Refresh</Button>
          <Button size="sm" icon={<Plus size={14} />}>Add Node</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Nodes', value: '24', status: 'normal' },
          { label: 'Online', value: '21', status: 'good' },
          { label: 'Degraded', value: '2', status: 'warning' },
          { label: 'Offline', value: '1', status: 'bad' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-card border border-surface-border">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1.5 ${s.status === 'good' ? 'text-emerald-600' : s.status === 'warning' ? 'text-amber-600' : s.status === 'bad' ? 'text-red-500' : 'text-gray-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-gray-800">Network Inventory</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                {['Node ID', 'Name', 'Type', 'IP Address', 'Uptime', 'Ports', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {NODES.map(n => (
                <tr key={n.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{n.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{n.name}</td>
                  <td className="px-4 py-3 text-gray-600">{n.type}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{n.ip}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">{n.uptime}</td>
                  <td className="px-4 py-3 text-gray-600">{n.ports}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[n.status]} dot size="sm">{n.status}</Badge></td>
                  <td className="px-4 py-3"><Button variant="ghost" size="xs">Details</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

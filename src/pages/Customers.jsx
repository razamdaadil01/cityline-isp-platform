import { useState } from 'react'
import { UserPlus, Download, Filter } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Table from '../components/ui/Table'
import { SearchInput } from '../components/ui/FormInputs'

const CUSTOMERS = [
  { id: 'CL-1001', name: 'Rajan Mehta', phone: '9876543210', plan: 'FTTH 100Mbps', zone: 'Andheri West', status: 'active', expiry: '2026-05-31' },
  { id: 'CL-1002', name: 'Priya Sharma', phone: '9812345678', plan: 'FTTB 50Mbps', zone: 'Bandra East', status: 'active', expiry: '2026-05-20' },
  { id: 'CL-1003', name: 'Suresh Kumar', phone: '9988776655', plan: 'Wireless 25Mbps', zone: 'Goregaon', status: 'suspended', expiry: '2026-04-15' },
  { id: 'CL-1004', name: 'Anita Desai', phone: '9123456789', plan: 'FTTH 200Mbps', zone: 'Versova', status: 'active', expiry: '2026-06-30' },
  { id: 'CL-1005', name: 'Vikram Singh', phone: '9011223344', plan: 'P2P 1Gbps', zone: 'MIDC Andheri', status: 'active', expiry: '2026-07-15' },
  { id: 'CL-1006', name: 'Mohan Lal', phone: '9765432198', plan: 'FTTH 100Mbps', zone: 'Andheri East', status: 'inactive', expiry: '2026-03-01' },
]

const STATUS_VARIANT = { active: 'green', suspended: 'yellow', inactive: 'gray' }

const columns = [
  { key: 'id', label: 'Customer ID', render: (v) => <span className="font-mono text-xs text-gray-500">{v}</span> },
  { key: 'name', label: 'Name', render: (v) => <span className="font-medium text-gray-800">{v}</span> },
  { key: 'phone', label: 'Phone' },
  { key: 'plan', label: 'Plan' },
  { key: 'zone', label: 'Zone' },
  { key: 'expiry', label: 'Expiry', render: (v) => <span className="text-xs">{v}</span> },
  { key: 'status', label: 'Status', render: (v) => <Badge variant={STATUS_VARIANT[v]} dot>{v}</Badge> },
  { key: 'id', label: 'Actions', cellClassName: 'text-right', render: () => (
    <div className="flex gap-1 justify-end">
      <Button variant="ghost" size="xs">View</Button>
      <Button variant="ghost" size="xs">Edit</Button>
    </div>
  )},
]

export default function Customers() {
  const [search, setSearch] = useState('')
  const filtered = CUSTOMERS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search))

  return (
    <div className="p-6 space-y-6 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage all customer accounts and connections</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />}>Export</Button>
          <Button size="sm" icon={<UserPlus size={14} />}>Add Customer</Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SearchInput className="w-64" placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
        <Button variant="secondary" size="sm" icon={<Filter size={14} />}>Filters</Button>
        <div className="flex gap-2 ml-auto text-sm">
          {['All', 'Active', 'Suspended', 'Inactive'].map(f => (
            <button key={f} className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${f === 'All' ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <Table columns={columns} data={filtered} />
      </div>
    </div>
  )
}

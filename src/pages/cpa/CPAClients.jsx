import React, { useState } from 'react'
import { Search, Users, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CPA_CLIENTS } from '../../data/cpaData'

const fmt = (n) => '₦' + n.toLocaleString()

const StatusBadge = ({ status }) => {
  const map = { Active: 'bg-green-100 text-green-700', Inactive: 'bg-gray-100 text-gray-500' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

const TypeBadge = ({ type }) => {
  const map = { Individual: 'bg-indigo-100 text-indigo-700', SME: 'bg-orange-100 text-orange-700', Enterprise: 'bg-purple-100 text-purple-700' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[type] || 'bg-gray-100 text-gray-600'}`}>{type}</span>
}

export default function CPAClients() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')

  const filtered = CPA_CLIENTS.filter(c => {
    const ms = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
    const mt = filterType === 'All' || c.type === filterType
    const ms2 = filterStatus === 'All' || c.status === filterStatus
    return ms && mt && ms2
  })

  const totalBilled = CPA_CLIENTS.reduce((s, c) => s + c.totalBilled, 0)
  const totalOutstanding = CPA_CLIENTS.reduce((s, c) => s + c.outstanding, 0)
  const activeCount = CPA_CLIENTS.filter(c => c.status === 'Active').length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3A5C]">My Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">{CPA_CLIENTS.length} clients total</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active Clients', value: activeCount, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Total Billed', value: fmt(totalBilled), icon: TrendingUp, color: 'bg-green-50 text-green-600' },
          { label: 'Outstanding', value: fmt(totalOutstanding), icon: AlertCircle, color: 'bg-red-50 text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
            <span className={`p-3 rounded-xl ${s.color}`}><s.icon size={18} /></span>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-[#1B3A5C]">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30 w-56" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none">
          <option value="All">All Types</option>
          <option>Individual</option>
          <option>SME</option>
          <option>Enterprise</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none">
          <option value="All">All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Client', 'Type', 'City', 'Tags', 'Appointments', 'Total Billed', 'Outstanding', 'Last Activity', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#2E75B6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {c.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3"><TypeBadge type={c.type} /></td>
                  <td className="px-5 py-3 text-gray-600">{c.city}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {c.tags.map(t => (
                        <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{c.appointments}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{fmt(c.totalBilled)}</td>
                  <td className="px-5 py-3">
                    <span className={c.outstanding > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                      {c.outstanding > 0 ? fmt(c.outstanding) : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{c.lastActivity}</td>
                  <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3">
                    <button onClick={() => navigate(`/cpa/clients/${c.id}`)}
                      className="flex items-center gap-1 text-[#2E75B6] text-xs font-medium hover:underline">
                      View <ArrowRight size={12} />
                    </button>
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

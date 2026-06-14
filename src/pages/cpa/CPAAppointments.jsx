import React, { useState } from 'react'
import { Search, Filter, X, Phone, Mail, Clock, Calendar, DollarSign, CheckCircle, XCircle, Eye } from 'lucide-react'
import { CPA_APPOINTMENTS } from '../../data/cpaData'

const TABS = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled']

const fmt = (n) => '₦' + n.toLocaleString()

const StatusBadge = ({ status }) => {
  const map = {
    Pending: 'bg-amber-100 text-amber-700',
    Confirmed: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-gray-100 text-gray-600',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

const TypeBadge = ({ type }) => {
  const map = {
    Individual: 'bg-indigo-100 text-indigo-700',
    SME: 'bg-orange-100 text-orange-700',
    Enterprise: 'bg-purple-100 text-purple-700',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[type] || 'bg-gray-100 text-gray-600'}`}>{type}</span>
}

export default function CPAAppointments() {
  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [appointments, setAppointments] = useState(CPA_APPOINTMENTS)

  const filtered = appointments.filter(a => {
    const matchTab = tab === 'All' || a.status === tab
    const matchSearch = a.clientName.toLowerCase().includes(search.toLowerCase()) ||
      a.service.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const updateStatus = (id, status) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    setSelected(prev => prev ? { ...prev, status } : prev)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3A5C]">Appointments</h1>
          <p className="text-gray-500 text-sm mt-0.5">{appointments.length} total appointments</p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg flex-wrap">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-[#1B3A5C] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t} ({t === 'All' ? appointments.length : appointments.filter(a => a.status === t).length})
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search appointments..."
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30 w-64" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs text-gray-400 font-medium px-5 py-3">ID</th>
                <th className="text-left text-xs text-gray-400 font-medium px-5 py-3">Client</th>
                <th className="text-left text-xs text-gray-400 font-medium px-5 py-3">Service</th>
                <th className="text-left text-xs text-gray-400 font-medium px-5 py-3">Date & Time</th>
                <th className="text-left text-xs text-gray-400 font-medium px-5 py-3">Duration</th>
                <th className="text-left text-xs text-gray-400 font-medium px-5 py-3">Amount</th>
                <th className="text-left text-xs text-gray-400 font-medium px-5 py-3">Status</th>
                <th className="text-left text-xs text-gray-400 font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-400 py-10">No appointments found</td></tr>
              ) : filtered.map(apt => (
                <tr key={apt.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-xs text-gray-400 font-mono">{apt.id}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#2E75B6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {apt.clientName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{apt.clientName}</p>
                        <TypeBadge type={apt.clientType} />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{apt.service}</td>
                  <td className="px-5 py-3 text-gray-600">
                    <div>{apt.date}</div>
                    <div className="text-xs text-gray-400">{apt.time}</div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{apt.duration}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{fmt(apt.amount)}</td>
                  <td className="px-5 py-3"><StatusBadge status={apt.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelected(apt)}
                        className="p-1.5 text-gray-400 hover:text-[#2E75B6] hover:bg-blue-50 rounded transition-colors" title="View">
                        <Eye size={14} />
                      </button>
                      {apt.status === 'Pending' && (
                        <>
                          <button onClick={() => updateStatus(apt.id, 'Confirmed')}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Confirm">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={() => updateStatus(apt.id, 'Cancelled')}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Cancel">
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      {apt.status === 'Confirmed' && (
                        <button onClick={() => updateStatus(apt.id, 'Completed')}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Mark Complete">
                          <CheckCircle size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelected(null)} />
          <div className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300`}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-[#1B3A5C]">
              <div>
                <p className="text-xs text-white/60 font-mono">{selected.id}</p>
                <h2 className="text-white font-semibold">{selected.service}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Client */}
              <div>
                <p className="text-xs text-gray-400 font-medium mb-2">CLIENT</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2E75B6] flex items-center justify-center text-white font-bold">
                    {selected.clientName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1B3A5C]">{selected.clientName}</p>
                    <TypeBadge type={selected.clientType} />
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-gray-600"><Phone size={13} /> {selected.phone}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-600"><Mail size={13} /> {selected.email}</div>
                </div>
              </div>
              {/* Details */}
              <div>
                <p className="text-xs text-gray-400 font-medium mb-2">APPOINTMENT DETAILS</p>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2"><Calendar size={13} /> Date</span>
                    <span className="font-medium">{selected.date}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2"><Clock size={13} /> Time</span>
                    <span className="font-medium">{selected.time}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-medium">{selected.duration}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2"><DollarSign size={13} /> Amount</span>
                    <span className="font-bold text-[#1B3A5C]">{fmt(selected.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <StatusBadge status={selected.status} />
                  </div>
                </div>
              </div>
              {/* Notes */}
              {selected.clientNote && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-2">CLIENT NOTE</p>
                  <p className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3 border border-blue-100">{selected.clientNote}</p>
                </div>
              )}
            </div>
            {/* Actions */}
            <div className="p-5 border-t border-gray-100 space-y-2">
              {selected.status === 'Pending' && (
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(selected.id, 'Confirmed')}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                    Confirm
                  </button>
                  <button onClick={() => updateStatus(selected.id, 'Cancelled')}
                    className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                    Cancel
                  </button>
                </div>
              )}
              {selected.status === 'Confirmed' && (
                <button onClick={() => updateStatus(selected.id, 'Completed')}
                  className="w-full py-2 bg-[#2E75B6] text-white rounded-lg text-sm font-medium hover:bg-[#1B3A5C] transition-colors">
                  Mark as Completed
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

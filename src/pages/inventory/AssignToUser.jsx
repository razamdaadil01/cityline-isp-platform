import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Users, CalendarDays, UserCog, ClipboardList } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { getUserAssignments, subscribeUserAssignments } from '../../data/userAssignmentStore'
import { usePermission } from '../../data/rolesStore'

const STATUS_BADGE = { 'Handed Off': 'purple' }
const TYPE_BADGE = { new: 'blue', replace: 'orange', disconnection: 'red' }
const TYPE_LABEL = { new: 'New', replace: 'Replace', disconnection: 'Disconnection' }

function itemsSummary(a) {
  const count = a.items.reduce((s, it) => s + (it.serials.length + it.macs.length || it.qty), 0)
  const lines = a.items.length
  return `${count} item${count === 1 ? '' : 's'} · ${lines} line${lines === 1 ? '' : 's'}`
}

export default function AssignToUser() {
  const canCreate = usePermission('Inventory', 'Create')
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState(getUserAssignments)
  useEffect(() => subscribeUserAssignments(setAssignments), [])

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      total: assignments.length,
      today: assignments.filter(a => (a.assignedAt || '').slice(0, 10) === today).length,
      engineers: new Set(assignments.map(a => a.engineerId)).size,
    }
  }, [assignments])

  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return [...assignments].sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))
    return assignments.filter(a =>
      a.assignmentNumber.toLowerCase().includes(q) ||
      a.engineerName.toLowerCase().includes(q) ||
      a.workOrderLabel.toLowerCase().includes(q) ||
      (a.customerName || '').toLowerCase().includes(q)
    ).sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))
  }, [assignments, search])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assign to User</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} of {assignments.length} user assignments</p>
        </div>
        {canCreate && <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate('/inventory/assign-to-user/new')}>Assign to User</Button>}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Handoffs',      value: stats.total,     icon: ClipboardList, color: 'text-brand-blue',  bg: 'bg-brand-blue/10' },
          { label: "Today's Handoffs",    value: stats.today,     icon: CalendarDays,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Engineers Involved',  value: stats.engineers, icon: UserCog,       color: 'text-purple-600',  bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-surface-border shadow-card px-4 py-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-[11px] text-gray-500 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search assignment number, engineer, work order, customer…"
          className="pl-9 pr-3 py-1.5 text-sm w-96 bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Engineer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Work Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Customer / Reference</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-16 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-sm text-gray-400">
                    <Users size={32} className="mx-auto mb-2 text-gray-200" />
                    No user assignments found
                  </td>
                </tr>
              ) : filtered.map(a => (
                <tr key={a.id} onClick={() => navigate(`/inventory/assign-to-user/${a.id}`)} className="cursor-pointer hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{(a.assignedAt || '').slice(0, 10)}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{a.engineerName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={TYPE_BADGE[a.assignmentType] ?? 'blue'} size="sm">{TYPE_LABEL[a.assignmentType] ?? 'New'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                    <span className="font-mono">{a.workOrderLabel}</span>
                    <span className="text-gray-400"> · {a.workOrderType}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{a.customerName || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{itemsSummary(a)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[a.status] ?? 'gray'} dot size="sm">{a.status}</Badge>
                  </td>
                  <td className="px-4 py-3 w-16 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/inventory/assign-to-user/${a.id}`)}
                      title="View"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors mx-auto"
                    >
                      <Eye size={14} />
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

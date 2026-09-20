import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X, MoreVertical, Edit2, Trash2, Wrench } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { Select } from '../components/ui/FormInputs'
import {
  getWorkOrders, subscribeWorkOrders, deleteWorkOrder, slaStatusOf,
  WORK_ORDER_CATEGORIES, WORK_ORDER_PRIORITIES, WORK_ORDER_STATUSES,
} from '../data/workOrderStore'
import { getPOPs } from '../data/popStore'
import { getUsers } from '../data/userStore'
import PopAlertsPanel from '../components/network/PopAlertsPanel'

const STATUS_BADGE = {
  Open: 'blue', Assigned: 'indigo', 'In-Progress': 'orange', 'On-Hold': 'yellow', Resolved: 'green', Closed: 'gray',
}
const PRIORITY_BADGE = { Critical: 'red', High: 'orange', Medium: 'yellow', Low: 'gray' }
const SLA_BADGE = { 'On Track': 'green', 'Due Soon': 'yellow', Breached: 'red', Met: 'gray' }

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function POPWorkOrders() {
  const navigate = useNavigate()
  const [workOrders, setWorkOrders] = useState(getWorkOrders)
  useEffect(() => subscribeWorkOrders(setWorkOrders), [])

  const pops = getPOPs()
  const users = getUsers()
  const popName = id => pops.find(p => p.id === id)?.name ?? id
  const technicianNames = ids => (ids ?? []).map(id => users.find(u => u.id === id)?.name ?? id).join(', ') || '—'

  const [search, setSearch] = useState('')
  const [fCategory, setFCategory] = useState('')
  const [fPriority, setFPriority] = useState('')
  const [fStatus, setFStatus] = useState('')

  const [menuId, setMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const menuRef = useRef(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    if (!menuId) return
    function handleClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuId])

  function openMenu(e, id) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setMenuId(id)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return workOrders.filter(w => {
      if (fCategory && w.category !== fCategory) return false
      if (fPriority && w.priority !== fPriority) return false
      if (fStatus && w.status !== fStatus) return false
      if (!q) return true
      return (
        w.id.toLowerCase().includes(q) ||
        popName(w.popId).toLowerCase().includes(q) ||
        (w.description || '').toLowerCase().includes(q)
      )
    })
  }, [workOrders, search, fCategory, fPriority, fStatus])

  function confirmDelete() {
    if (!deleteTarget) return
    deleteWorkOrder(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">POP Work Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} of {workOrders.length} work orders</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate('/network/pops/work-orders/new')}>Add Work Order</Button>
      </div>

      <PopAlertsPanel />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search work order, POP, description…"
            className="pl-9 pr-8 py-1.5 text-sm w-full bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="w-44">
          <Select value={fCategory} onChange={e => setFCategory(e.target.value)}>
            <option value="">All Categories</option>
            {WORK_ORDER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div className="w-36">
          <Select value={fPriority} onChange={e => setFPriority(e.target.value)}>
            <option value="">All Priorities</option>
            {WORK_ORDER_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
        <div className="w-36">
          <Select value={fStatus} onChange={e => setFStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {WORK_ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Work Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">POP</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Technician(s)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">SLA Due</th>
                <th className="px-4 py-3 w-12 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-sm text-gray-400">
                    <Wrench size={32} className="mx-auto mb-2 text-gray-200" />
                    No work orders found
                  </td>
                </tr>
              ) : filtered.map(wo => {
                const sla = slaStatusOf(wo)
                return (
                  <tr
                    key={wo.id}
                    onClick={() => navigate(`/network/pops/work-orders/${wo.id}`)}
                    className="cursor-pointer hover:bg-gray-50/70 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">{wo.id}</td>
                    <td className="px-4 py-3 text-gray-700">{popName(wo.popId)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{wo.category}</td>
                    <td className="px-4 py-3">
                      <Badge variant={PRIORITY_BADGE[wo.priority] ?? 'gray'} size="sm">{wo.priority}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{technicianNames(wo.assignedTechnicianIds)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[wo.status] ?? 'gray'} dot size="sm">{wo.status}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs text-gray-500">{formatDateTime(wo.slaDate)}</p>
                      <Badge variant={SLA_BADGE[sla]} size="sm" className="mt-0.5">{sla}</Badge>
                    </td>
                    <td className="px-4 py-3 w-12 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => openMenu(e, wo.id)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto ${menuId === wo.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                      >
                        <MoreVertical size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {menuId && (() => {
        const wo = workOrders.find(w => w.id === menuId)
        if (!wo) return null
        return (
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
          >
            <button
              onClick={() => { navigate(`/network/pops/work-orders/${wo.id}`); setMenuId(null) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit2 size={13} className="text-gray-400 shrink-0" /> Edit
            </button>
            <button
              onClick={() => { setDeleteTarget(wo); setMenuId(null) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={13} className="text-red-400 shrink-0" /> Delete
            </button>
          </div>
        )
      })()}

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Work Order?"
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button size="sm" variant="danger" onClick={confirmDelete}>Delete</Button>
        </>}
      >
        <p className="text-sm text-gray-600">
          Delete <span className="font-semibold text-gray-900">{deleteTarget?.id}</span> ({deleteTarget && popName(deleteTarget.popId)})? This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}

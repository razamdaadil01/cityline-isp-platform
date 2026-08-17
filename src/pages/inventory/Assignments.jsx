import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Filter, X, ChevronDown, MoreVertical, Eye, UserCog,
  CalendarDays, Users, ClipboardList,
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ColumnManager, { useColumnPrefs } from '../../components/table/ColumnManager'
import { getAssignments, subscribeAssignments, ASSIGNMENT_STATUSES } from '../../data/assignmentStore'
import { getStores } from '../../data/storeStore'
import { usePermission } from '../../data/rolesStore'

const STATUS_BADGE = { Assigned: 'purple', Returned: 'gray' }

const ASSIGNMENT_TABLE_COLUMNS = [
  { key: 'assignmentNumber', label: 'Assignment Number', visible: true, defaultVisible: true, locked: true },
  { key: 'date',             label: 'Date',               visible: true, defaultVisible: true },
  { key: 'engineer',         label: 'Engineer',           visible: true, defaultVisible: true },
  { key: 'workOrder',        label: 'Work Order',         visible: true, defaultVisible: true },
  { key: 'branch',           label: 'Branch',             visible: true, defaultVisible: true },
  { key: 'items',            label: 'Items',              visible: true, defaultVisible: true },
  { key: 'status',           label: 'Status',             visible: true, defaultVisible: true },
  { key: 'actions',          label: 'Actions',            visible: true, defaultVisible: true },
]

function itemsSummary(a) {
  const count = a.hardwareLines.length + a.wireLines.length
  return `${count} item${count === 1 ? '' : 's'}`
}

export default function Assignments() {
  const canCreate = usePermission('Inventory', 'Create')
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState(getAssignments)
  useEffect(() => subscribeAssignments(setAssignments), [])

  const stores = getStores()

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      total: assignments.length,
      today: assignments.filter(a => (a.assignedAt || '').slice(0, 10) === today).length,
      engineers: new Set(assignments.map(a => a.engineerId)).size,
      workOrders: new Set(assignments.map(a => a.workOrderId)).size,
    }
  }, [assignments])

  const [tableColumns, setTableColumns] = useColumnPrefs('columnPrefs:inventoryAssignmentTable', ASSIGNMENT_TABLE_COLUMNS)
  const visibleCols = new Set(tableColumns.filter(c => c.visible).map(c => c.key))

  const [search, setSearch] = useState('')

  const [menuId, setMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const menuRef = useRef(null)

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

  const [filterBranch, setFilterBranch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const EMPTY_DRAFT = { branch: '', status: '' }
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  function openDrawer() {
    setDraft({ branch: filterBranch, status: filterStatus })
    setDrawerOpen(true)
  }
  function applyDrawer() {
    setFilterBranch(draft.branch); setFilterStatus(draft.status)
    setDrawerOpen(false)
  }
  function resetDrawer() { setDraft(EMPTY_DRAFT) }
  function setDraftField(k, v) { setDraft(prev => ({ ...prev, [k]: v })) }
  function clearAllFilters() { setFilterBranch(''); setFilterStatus('') }

  const activeFiltersCount = [filterBranch, filterStatus].filter(Boolean).length

  const branches = useMemo(() => [...new Set(stores.map(s => s.branchCode).filter(Boolean))].sort(), [stores])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return assignments.filter(a => {
      if (q && !a.assignmentNumber.toLowerCase().includes(q) &&
          !a.engineerName.toLowerCase().includes(q) &&
          !a.workOrderLabel.toLowerCase().includes(q)) return false
      if (filterBranch && a.branchCode !== filterBranch) return false
      if (filterStatus && a.status !== filterStatus) return false
      return true
    }).sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, search, filterBranch, filterStatus])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assign to Engineer</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} of {assignments.length} assignments</p>
        </div>
        <div className="flex gap-2">
          <ColumnManager columns={tableColumns} onChange={setTableColumns} />
          {canCreate && <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate('/inventory/assign/new')}>Assign Inventory</Button>}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Assignments', value: stats.total,      icon: ClipboardList, color: 'text-brand-blue',  bg: 'bg-brand-blue/10' },
          { label: "Today's Assignments", value: stats.today,     icon: CalendarDays,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Engineers Issued To', value: stats.engineers, icon: UserCog,       color: 'text-purple-600',  bg: 'bg-purple-50' },
          { label: 'Work Orders Covered', value: stats.workOrders,icon: Users,         color: 'text-cyan-600',    bg: 'bg-cyan-50' },
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assignment number, engineer, work order…"
            className="pl-9 pr-8 py-1.5 text-sm w-80 bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        <button
          onClick={openDrawer}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors shrink-0 ${
            activeFiltersCount > 0 ? 'bg-brand-blue text-white border-brand-blue hover:bg-brand-blue/90' : 'bg-white text-gray-700 border-surface-border hover:bg-gray-50'
          }`}
        >
          <Filter size={13} /> Filters
          {activeFiltersCount > 0 && <span className="bg-white/25 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold leading-none">{activeFiltersCount}</span>}
        </button>

        {activeFiltersCount > 0 && (
          <button onClick={clearAllFilters} className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1">
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* ── Filter Drawer ── */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-purple-600" />
              <h2 className="text-sm font-bold text-gray-900">Filters</h2>
              {activeFiltersCount > 0 && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">{activeFiltersCount} active</span>}
            </div>
            <button onClick={() => setDrawerOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Branch</label>
              <div className="relative">
                <select value={draft.branch} onChange={e => setDraftField('branch', e.target.value)}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All</option>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
              <div className="relative">
                <select value={draft.status} onChange={e => setDraftField('status', e.target.value)}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All</option>
                  {ASSIGNMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="shrink-0 px-5 py-4 border-t border-surface-border bg-gray-50 flex items-center gap-3">
            <button onClick={resetDrawer} className="flex-1 py-2.5 text-sm font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl transition-colors bg-white">
              Clear All Filters
            </button>
            <button onClick={applyDrawer} className="flex-1 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm">
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                {visibleCols.has('assignmentNumber') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[170px]">Assignment Number</th>}
                {visibleCols.has('date')      && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date</th>}
                {visibleCols.has('engineer')  && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Engineer</th>}
                {visibleCols.has('workOrder') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Work Order</th>}
                {visibleCols.has('branch')    && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Branch</th>}
                {visibleCols.has('items')     && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Items</th>}
                {visibleCols.has('status')    && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>}
                {visibleCols.has('actions')   && <th className="px-4 py-3 w-12 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.size} className="px-4 py-14 text-center text-sm text-gray-400">
                    <UserCog size={32} className="mx-auto mb-2 text-gray-200" />
                    No assignments found
                  </td>
                </tr>
              ) : filtered.map(a => (
                <tr
                  key={a.id}
                  onClick={() => navigate(`/inventory/assign/${a.id}`)}
                  className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                >
                  {visibleCols.has('assignmentNumber') && (
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-brand-blue">{a.assignmentNumber}</span>
                    </td>
                  )}
                  {visibleCols.has('date')      && <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{(a.assignedAt || '').slice(0, 10)}</td>}
                  {visibleCols.has('engineer')  && <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{a.engineerName}</td>}
                  {visibleCols.has('workOrder') && <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap">{a.workOrderLabel}</td>}
                  {visibleCols.has('branch')    && <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{a.branchCode}</td>}
                  {visibleCols.has('items')     && <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{itemsSummary(a)}</td>}
                  {visibleCols.has('status') && (
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[a.status] ?? 'gray'} dot size="sm">{a.status}</Badge>
                    </td>
                  )}
                  {visibleCols.has('actions') && (
                    <td className="px-4 py-3 w-12 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => openMenu(e, a.id)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto ${menuId === a.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                      >
                        <MoreVertical size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {menuId && (() => {
        const a = assignments.find(x => x.id === menuId)
        if (!a) return null
        return (
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
          >
            <button onClick={() => { navigate(`/inventory/assign/${a.id}`); setMenuId(null) }} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              <Eye size={13} className="text-brand-blue shrink-0" /> View Details
            </button>
          </div>
        )
      })()}
    </div>
  )
}

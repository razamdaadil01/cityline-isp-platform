import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, Users, Package, Truck, CheckCircle2, RefreshCw,
  XCircle, Search, MoreVertical, UserCheck, Clock, Wrench,
  Eye, List, ArrowRight, AlertTriangle, SlidersHorizontal, X,
} from 'lucide-react'
import {
  getInstallations, subscribeInstallations, updateInstallationStatus,
  FIELD_ENGINEERS, INSTALLATION_TEAMS, INST_BRANCHES,
} from '../data/installationsStore'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { FormField, Select, Input, Textarea } from '../components/ui/FormInputs'

/* ── Constants ─────────────────────────────────────────────────── */

const ALL_STATUSES = [
  'Scheduled', 'Assigned', 'Hardware Collection Pending',
  'Dispatched', 'Completed', 'Rescheduled', 'Cancelled',
]

const RESCHEDULE_REASONS = [
  'Customer Not Available',
  'Engineer Unavailable',
  'Hardware Not Ready',
  'Weather Conditions',
  'Other',
]

const STATUS_CHIP = {
  'Scheduled':                  'bg-blue-100 text-blue-700',
  'Assigned':                   'bg-purple-100 text-purple-700',
  'Hardware Collection Pending':'bg-amber-100 text-amber-700',
  'Dispatched':                 'bg-orange-100 text-orange-700',
  'Completed':                  'bg-emerald-100 text-emerald-700',
  'Rescheduled':                'bg-yellow-100 text-yellow-700',
  'Cancelled':                  'bg-red-100 text-red-600',
  'In Progress':                'bg-amber-100 text-amber-700',
}

const TABS = [
  { key: 'all',       label: 'All'           },
  { key: 'morning',   label: 'Morning Slot'  },
  { key: 'afternoon', label: 'Afternoon Slot'},
  { key: 'evening',   label: 'Evening Slot'  },
]

function matchesTab(tab, inst) {
  if (tab === 'all') return true
  return inst.slot?.toLowerCase() === tab
}

/* ── Toast ──────────────────────────────────────────────────────── */
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl">
      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
      {msg}
    </div>
  )
}

/* ── Main ───────────────────────────────────────────────────────── */
export default function Installations() {
  const navigate = useNavigate()
  const menuRef  = useRef(null)

  const [installations, setInstallations] = useState(getInstallations)
  const [activeTab,     setActiveTab]     = useState('all')

  /* Search */
  const [search, setSearch] = useState('')

  /* Applied filters (what the table actually uses) */
  const [filterDateFrom,  setFilterDateFrom]  = useState('')
  const [filterDateTo,    setFilterDateTo]    = useState('')
  const [filterStatuses,  setFilterStatuses]  = useState([])   // multi-select
  const [filterTeam,      setFilterTeam]      = useState('')
  const [filterEngineer,  setFilterEngineer]  = useState('')
  const [filterSlot,      setFilterSlot]      = useState('')
  const [filterPriority,  setFilterPriority]  = useState('')
  const [filterBranch,    setFilterBranch]    = useState('')

  /* Drawer state */
  const [drawerOpen, setDrawerOpen] = useState(false)

  /* Draft filters (edited inside drawer, applied on "Apply") */
  const EMPTY_DRAFT = {
    dateFrom: '', dateTo: '', statuses: [], slot: '', team: '', engineer: '', priority: '', branch: '',
  }
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  function openDrawer() {
    setDraft({
      dateFrom:  filterDateFrom,
      dateTo:    filterDateTo,
      statuses:  filterStatuses,
      slot:      filterSlot,
      team:      filterTeam,
      engineer:  filterEngineer,
      priority:  filterPriority,
      branch:    filterBranch,
    })
    setDrawerOpen(true)
  }

  function applyDrawer() {
    setFilterDateFrom(draft.dateFrom)
    setFilterDateTo(draft.dateTo)
    setFilterStatuses(draft.statuses)
    setFilterSlot(draft.slot)
    setFilterTeam(draft.team)
    setFilterEngineer(draft.engineer)
    setFilterPriority(draft.priority)
    setFilterBranch(draft.branch)
    setDrawerOpen(false)
  }

  function resetDrawer() {
    setDraft(EMPTY_DRAFT)
  }

  function clearAllFilters() {
    setFilterDateFrom(''); setFilterDateTo(''); setFilterStatuses([])
    setFilterTeam(''); setFilterEngineer(''); setFilterSlot('')
    setFilterPriority(''); setFilterBranch('')
  }

  function toggleDraftStatus(s) {
    setDraft(d => ({
      ...d,
      statuses: d.statuses.includes(s) ? d.statuses.filter(x => x !== s) : [...d.statuses, s],
    }))
  }

  const activeFilterCount = [
    filterDateFrom || filterDateTo,
    filterStatuses.length > 0,
    filterTeam,
    filterEngineer,
    filterSlot,
    filterPriority,
    filterBranch,
  ].filter(Boolean).length

  /* Menu */
  const [menuId,  setMenuId]  = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })

  /* Modals */
  const [assignInst,     setAssignInst]     = useState(null)
  const [rescheduleInst, setRescheduleInst] = useState(null)
  const [hwCollectInst,  setHwCollectInst]  = useState(null)
  const [dispatchInst,   setDispatchInst]   = useState(null)
  const [cancelInst,     setCancelInst]     = useState(null)
  const [completeInst,   setCompleteInst]   = useState(null)

  /* Forms */
  const [assignForm, setAssignForm] = useState({
    team: '', engineers: [], date: '', slot: 'Morning', notes: '',
  })
  const [rescheduleForm, setRescheduleForm] = useState({
    date: '', slot: 'Morning', reason: '', remarks: '',
  })

  const [toast, setToast] = useState('')

  useEffect(() => subscribeInstallations(setInstallations), [])

  useEffect(() => {
    if (!menuId) return
    function onDown(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuId])

  function openMenu(e, id) {
    const rect = e.currentTarget.getBoundingClientRect()
    const top = window.innerHeight - rect.bottom < 240 ? rect.top - 244 : rect.bottom + 4
    setMenuPos({ top, right: window.innerWidth - rect.right })
    setMenuId(id)
  }

  /* Stats */
  const counts = useMemo(() => ({
    total:       installations.length,
    scheduled:   installations.filter(i => i.status === 'Scheduled').length,
    assigned:    installations.filter(i => i.status === 'Assigned').length,
    hwPending:   installations.filter(i => i.status === 'Hardware Collection Pending').length,
    dispatched:  installations.filter(i => i.status === 'Dispatched').length,
    completed:   installations.filter(i => i.status === 'Completed').length,
    rescheduled: installations.filter(i => i.status === 'Rescheduled').length,
    cancelled:   installations.filter(i => i.status === 'Cancelled').length,
  }), [installations])

  /* Filtering */
  const tabCounts = useMemo(() =>
    Object.fromEntries(TABS.map(t => [t.key, installations.filter(i => matchesTab(t.key, i)).length]))
  , [installations])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return installations.filter(inst => {
      if (!matchesTab(activeTab, inst)) return false
      if (q && !inst.customerName.toLowerCase().includes(q) &&
               !inst.id.toLowerCase().includes(q) &&
               !(inst.mobile || '').includes(q) &&
               !inst.area.toLowerCase().includes(q)) return false
      if (filterDateFrom && inst.slotDate < filterDateFrom) return false
      if (filterDateTo   && inst.slotDate > filterDateTo)   return false
      if (filterStatuses.length > 0 && !filterStatuses.includes(inst.status)) return false
      if (filterTeam     && inst.assignedTeam !== filterTeam) return false
      if (filterEngineer && inst.engineerName !== filterEngineer) return false
      if (filterSlot     && inst.slot !== filterSlot)       return false
      if (filterPriority && inst.priority !== filterPriority) return false
      if (filterBranch   && inst.branch !== filterBranch)   return false
      return true
    })
  }, [installations, activeTab, search, filterDateFrom, filterDateTo,
      filterStatuses, filterTeam, filterEngineer, filterSlot, filterPriority, filterBranch])

  const hasFilters = activeFilterCount > 0

  const menuInst = installations.find(i => i.id === menuId) ?? null

  /* Assign Team */
  function startAssign(inst) {
    setAssignForm({
      team:      inst.assignedTeam || '',
      engineers: inst.engineerName ? [inst.engineerName] : [],
      date:      inst.slotDate || '',
      slot:      inst.slot || 'Morning',
      notes:     '',
    })
    setAssignInst(inst)
    setMenuId(null)
  }

  function handleAssign() {
    updateInstallationStatus(assignInst.id, 'Assigned', {
      assignedTeam:  assignForm.team,
      engineerName:  assignForm.engineers.join(', '),
      slotDate:      assignForm.date,
      slot:          assignForm.slot,
      _note:         `Assigned to ${assignForm.team} — ${assignForm.engineers.join(', ')}`,
    })
    setAssignInst(null)
    setToast('Team assigned successfully')
  }

  function toggleEngineer(name) {
    setAssignForm(f => ({
      ...f,
      engineers: f.engineers.includes(name)
        ? f.engineers.filter(e => e !== name)
        : [...f.engineers, name],
    }))
  }

  /* Reschedule */
  function startReschedule(inst) {
    setRescheduleForm({ date: inst.slotDate || '', slot: inst.slot || 'Morning', reason: '', remarks: '' })
    setRescheduleInst(inst)
    setMenuId(null)
  }

  function handleReschedule() {
    updateInstallationStatus(rescheduleInst.id, 'Rescheduled', {
      slotDate:          rescheduleForm.date,
      slot:              rescheduleForm.slot,
      rescheduleReason:  rescheduleForm.reason,
      rescheduleRemarks: rescheduleForm.remarks,
      _note: `Rescheduled to ${rescheduleForm.date} (${rescheduleForm.slot}) — ${rescheduleForm.reason}`,
    })
    setRescheduleInst(null)
    setToast('Installation rescheduled')
  }

  /* Hardware Collection */
  function handleHwCollect() {
    updateInstallationStatus(hwCollectInst.id, 'Hardware Collection Pending', {
      _note: 'Moved to hardware collection',
    })
    setHwCollectInst(null)
    setToast('Moved to Hardware Collection')
  }

  /* Dispatch */
  function handleDispatch() {
    updateInstallationStatus(dispatchInst.id, 'Dispatched', {
      _note: 'Hardware collected — team dispatched',
    })
    setDispatchInst(null)
    setToast('Marked as Dispatched')
  }

  /* Complete */
  function handleComplete() {
    updateInstallationStatus(completeInst.id, 'Completed', { _note: 'Installation completed' })
    setCompleteInst(null)
    setToast('Installation marked as Completed')
  }

  /* Cancel */
  function handleCancel() {
    updateInstallationStatus(cancelInst.id, 'Cancelled', { _note: 'Installation cancelled' })
    setCancelInst(null)
    setToast('Installation cancelled')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">

      {/* Header */}
      <div className="px-6 pt-5 pb-4 shrink-0 bg-white border-b border-surface-border">
        <h1 className="text-xl font-bold text-gray-900">Installation Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage and track all installation visits</p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Stats — 8 cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {[
            { label: 'Total Visits',         value: counts.total,       color: 'text-gray-700',    bg: 'bg-gray-100',    icon: CalendarDays  },
            { label: 'Scheduled',            value: counts.scheduled,   color: 'text-brand-blue',  bg: 'bg-blue-50',     icon: Clock         },
            { label: 'Assigned',             value: counts.assigned,    color: 'text-purple-600',  bg: 'bg-purple-50',   icon: UserCheck     },
            { label: 'HW Collection',        value: counts.hwPending,   color: 'text-amber-600',   bg: 'bg-amber-50',    icon: Package       },
            { label: 'Dispatched',           value: counts.dispatched,  color: 'text-orange-600',  bg: 'bg-orange-50',   icon: Truck         },
            { label: 'Completed',            value: counts.completed,   color: 'text-emerald-600', bg: 'bg-emerald-50',  icon: CheckCircle2  },
            { label: 'Rescheduled',          value: counts.rescheduled, color: 'text-yellow-600',  bg: 'bg-yellow-50',   icon: RefreshCw     },
            { label: 'Cancelled',            value: counts.cancelled,   color: 'text-red-500',     bg: 'bg-red-50',      icon: XCircle       },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="bg-white rounded-xl border border-surface-border p-4 flex items-center gap-3 shadow-card">
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={14} className={color} />
              </div>
              <div className="min-w-0">
                <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight truncate">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Slot tabs + filters + table card */}
        <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">

          {/* Slot tabs */}
          <div className="flex overflow-x-auto border-b border-surface-border scrollbar-none">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 flex items-center gap-2 px-5 py-3.5 text-xs font-medium transition-all border-b-2 -mb-px whitespace-nowrap
                  ${activeTab === tab.key
                    ? 'border-brand-blue text-brand-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                  }`}>
                {tab.label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-500'
                }`}>{tabCounts[tab.key]}</span>
              </button>
            ))}
          </div>

          {/* Search + Filter button */}
          <div className="px-4 py-3 border-b border-surface-border flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by customer name, installation ID, mobile, area..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>
            <button
              onClick={openDrawer}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors shrink-0 ${
                activeFilterCount > 0
                  ? 'bg-brand-blue text-white border-brand-blue hover:bg-brand-blue/90'
                  : 'bg-white text-gray-600 border-surface-border hover:bg-gray-50'
              }`}>
              <SlidersHorizontal size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {hasFilters && (
              <button onClick={clearAllFilters}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                Clear all
              </button>
            )}
            <span className="text-xs text-gray-400 shrink-0">
              {visible.length} installation{visible.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          {visible.length === 0 ? (
            <div className="py-16 text-center">
              <Wrench size={28} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No installations found</p>
              <p className="text-xs text-gray-400 mt-1">Try a different slot tab or clear filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 1400 }}>
                <thead>
                  <tr className="border-b border-surface-border bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    {['Inst ID','Lead ID','Customer Name','Mobile','Area','Locality',
                      'Assigned Team','Assigned Engineer','Installation Slot','Installation Date',
                      'Status','Branch','Created By','Actions'].map((h, i) => (
                      <th key={h} className={`px-4 py-3 text-left whitespace-nowrap ${i === 0 ? 'pl-6' : ''}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {visible.map(inst => (
                    <tr key={inst.id} className="hover:bg-gray-50/60 transition-colors">

                      {/* INST ID */}
                      <td className="pl-6 pr-4 py-3 whitespace-nowrap">
                        <button onClick={() => navigate(`/installations/${inst.id}`)}
                          className="font-mono text-xs font-semibold text-brand-blue hover:underline">
                          {inst.id}
                        </button>
                      </td>

                      {/* LEAD ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {inst.leadId
                          ? <button onClick={() => navigate(`/sales/leads/${inst.leadId}/overview`)}
                              className="font-mono text-xs font-semibold text-gray-600 hover:text-brand-blue hover:underline">
                              {inst.leadId}
                            </button>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>

                      {/* CUSTOMER NAME */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-gray-900">{inst.customerName}</span>
                      </td>

                      {/* MOBILE */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-600">{inst.mobile || inst.customerPhone || '—'}</span>
                      </td>

                      {/* AREA */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-700">{inst.area}</span>
                      </td>

                      {/* LOCALITY */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-600">{inst.locality || '—'}</span>
                      </td>

                      {/* ASSIGNED TEAM */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {inst.assignedTeam
                          ? <span className="text-xs font-medium bg-navy/10 text-navy px-2 py-0.5 rounded-full">{inst.assignedTeam}</span>
                          : <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Unassigned</span>}
                      </td>

                      {/* ASSIGNED ENGINEER */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {inst.engineerName
                          ? <span className="text-xs text-gray-800 font-medium">{inst.engineerName}</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>

                      {/* INSTALLATION SLOT */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {inst.slot
                          ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              inst.slot === 'Morning'   ? 'bg-yellow-50 text-yellow-700' :
                              inst.slot === 'Afternoon' ? 'bg-orange-50 text-orange-600' :
                                                          'bg-indigo-50 text-indigo-600'}`}>
                              {inst.slot}
                            </span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>

                      {/* INSTALLATION DATE */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-700 font-medium">{inst.slotDate || '—'}</span>
                        {inst.slotTime && <p className="text-[10px] text-gray-400 mt-0.5">{inst.slotTime}</p>}
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CHIP[inst.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {inst.status}
                        </span>
                      </td>

                      {/* BRANCH */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {inst.branch
                          ? <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{inst.branch}</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>

                      {/* CREATED BY */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-600">{inst.createdBy || '—'}</span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={e => openMenu(e, inst.id)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                            menuId === inst.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                          }`}>
                          <MoreVertical size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ⋮ Dropdown portal */}
      {menuInst && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-52"
        >
          {/* View Details */}
          <button onClick={() => { navigate(`/installations/${menuInst.id}`); setMenuId(null) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
            <Eye size={13} className="text-gray-400 shrink-0" /> View Details
          </button>

          {/* View Lead */}
          <button
            onClick={() => { if (menuInst.leadId) navigate(`/sales/leads/${menuInst.leadId}/overview`); setMenuId(null) }}
            disabled={!menuInst.leadId}
            className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${menuInst.leadId ? 'text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}>
            <List size={13} className="shrink-0" /> View Lead
          </button>

          {/* Assign Team */}
          <button onClick={() => startAssign(menuInst)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-brand-blue hover:bg-blue-50">
            <Users size={13} className="shrink-0" /> Assign Team
          </button>

          {/* Edit Slot / Reschedule */}
          <button onClick={() => startReschedule(menuInst)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
            <RefreshCw size={13} className="text-gray-400 shrink-0" /> Edit Slot / Reschedule
          </button>

          {/* Add Hardware */}
          <button onClick={() => { navigate(`/installations/${menuInst.id}?action=add-hardware`); setMenuId(null) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
            <Wrench size={13} className="text-gray-400 shrink-0" /> Add Hardware Requirements
          </button>

          <div className="my-1 border-t border-surface-border" />

          {/* Move to Hardware Collection */}
          <button
            onClick={() => { setHwCollectInst(menuInst); setMenuId(null) }}
            disabled={['Completed','Cancelled','Hardware Collection Pending','Dispatched'].includes(menuInst.status)}
            className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors ${
              ['Completed','Cancelled','Hardware Collection Pending','Dispatched'].includes(menuInst.status)
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-amber-700 hover:bg-amber-50'}`}>
            <Package size={13} className="shrink-0" /> Move to Hardware Collection
          </button>

          {/* Move to Dispatch */}
          <button
            onClick={() => { setDispatchInst(menuInst); setMenuId(null) }}
            disabled={menuInst.status !== 'Hardware Collection Pending'}
            className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors ${
              menuInst.status !== 'Hardware Collection Pending'
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-orange-600 hover:bg-orange-50'}`}>
            <Truck size={13} className="shrink-0" /> Move to Dispatch
          </button>

          <div className="my-1 border-t border-surface-border" />

          {/* Mark Completed */}
          <button
            onClick={() => { setCompleteInst(menuInst); setMenuId(null) }}
            disabled={['Completed','Cancelled'].includes(menuInst.status)}
            className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors ${
              ['Completed','Cancelled'].includes(menuInst.status)
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-emerald-700 hover:bg-emerald-50'}`}>
            <CheckCircle2 size={13} className="shrink-0" /> Mark Completed
          </button>

          {/* Mark Cancelled */}
          <button
            onClick={() => { setCancelInst(menuInst); setMenuId(null) }}
            disabled={['Completed','Cancelled'].includes(menuInst.status)}
            className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors ${
              ['Completed','Cancelled'].includes(menuInst.status)
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-red-600 hover:bg-red-50'}`}>
            <XCircle size={13} className="shrink-0" /> Mark Cancelled
          </button>
        </div>
      )}

      {/* ── Assign Team Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={!!assignInst}
        onClose={() => setAssignInst(null)}
        title={`Assign Team — ${assignInst?.id}`}
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setAssignInst(null)}>Cancel</Button>
          <Button size="sm" onClick={handleAssign}
            disabled={!assignForm.team || assignForm.engineers.length === 0 || !assignForm.date}>
            Assign Team
          </Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="Installation Team" required>
            <Select value={assignForm.team} onChange={e => setAssignForm(f => ({ ...f, team: e.target.value }))}>
              <option value="">Select team…</option>
              {INSTALLATION_TEAMS.map(t => <option key={t}>{t}</option>)}
            </Select>
          </FormField>

          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">
              Engineers <span className="text-red-500">*</span>
            </p>
            <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden">
              {FIELD_ENGINEERS.map(eng => (
                <label key={eng.id}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="checkbox"
                    checked={assignForm.engineers.includes(eng.name)}
                    onChange={() => toggleEngineer(eng.name)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <div className={`w-6 h-6 rounded-full ${eng.color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
                    {eng.initials}
                  </div>
                  <span className="text-sm text-gray-700">{eng.name}</span>
                </label>
              ))}
            </div>
          </div>

          <FormField label="Installation Date" required>
            <Input type="date" value={assignForm.date}
              onChange={e => setAssignForm(f => ({ ...f, date: e.target.value }))} />
          </FormField>

          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Installation Slot <span className="text-red-500">*</span></p>
            <div className="flex gap-3">
              {['Morning','Afternoon','Evening'].map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="assign-slot" value={s}
                    checked={assignForm.slot === s}
                    onChange={() => setAssignForm(f => ({ ...f, slot: s }))}
                    className="w-4 h-4 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <span className="text-sm text-gray-700">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <FormField label="Internal Notes">
            <Textarea rows={3} placeholder="Any notes for the team…"
              value={assignForm.notes}
              onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      {/* ── Reschedule Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={!!rescheduleInst}
        onClose={() => setRescheduleInst(null)}
        title={`Reschedule — ${rescheduleInst?.id}`}
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setRescheduleInst(null)}>Cancel</Button>
          <Button size="sm" onClick={handleReschedule}
            disabled={!rescheduleForm.date || !rescheduleForm.reason}>
            Reschedule
          </Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="New Installation Date" required>
            <Input type="date" value={rescheduleForm.date}
              onChange={e => setRescheduleForm(f => ({ ...f, date: e.target.value }))} />
          </FormField>

          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">New Slot</p>
            <div className="flex gap-3">
              {['Morning','Afternoon','Evening'].map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="resched-slot" value={s}
                    checked={rescheduleForm.slot === s}
                    onChange={() => setRescheduleForm(f => ({ ...f, slot: s }))}
                    className="w-4 h-4 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <span className="text-sm text-gray-700">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <FormField label="Reschedule Reason" required>
            <Select value={rescheduleForm.reason}
              onChange={e => setRescheduleForm(f => ({ ...f, reason: e.target.value }))}>
              <option value="">Select reason…</option>
              {RESCHEDULE_REASONS.map(r => <option key={r}>{r}</option>)}
            </Select>
          </FormField>

          <FormField label="Remarks">
            <Textarea rows={3} placeholder="Additional remarks…"
              value={rescheduleForm.remarks}
              onChange={e => setRescheduleForm(f => ({ ...f, remarks: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      {/* ── Hardware Collection Confirmation ─────────────────────── */}
      <Modal
        isOpen={!!hwCollectInst}
        onClose={() => setHwCollectInst(null)}
        title="Move to Hardware Collection"
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setHwCollectInst(null)}>Cancel</Button>
          <Button size="sm"
            className="bg-amber-600 hover:bg-amber-700"
            onClick={handleHwCollect}>
            Confirm
          </Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Move <span className="font-semibold">{hwCollectInst?.id}</span> to Hardware Collection?
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-700 font-medium">{hwCollectInst?.customerName}</p>
            <p className="text-xs text-amber-600 mt-0.5">{hwCollectInst?.area} · {hwCollectInst?.slot} Slot · {hwCollectInst?.slotDate}</p>
          </div>
          <p className="text-xs text-gray-400">Status will be updated to "Hardware Collection Pending".</p>
        </div>
      </Modal>

      {/* ── Dispatch Confirmation ─────────────────────────────────── */}
      <Modal
        isOpen={!!dispatchInst}
        onClose={() => setDispatchInst(null)}
        title="Confirm Dispatch"
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setDispatchInst(null)}>Cancel</Button>
          <Button size="sm"
            className="bg-orange-600 hover:bg-orange-700"
            onClick={handleDispatch}>
            <ArrowRight size={13} className="mr-1" /> Confirm — Dispatch
          </Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Mark hardware collected and dispatch team for{' '}
            <span className="font-semibold">{dispatchInst?.id}</span>?
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
            <p className="text-xs text-orange-700 font-medium">{dispatchInst?.customerName}</p>
            <p className="text-xs text-orange-600 mt-0.5">{dispatchInst?.area} · {dispatchInst?.assignedTeam}</p>
          </div>
          <p className="text-xs text-gray-400">Status will be updated to "Dispatched".</p>
        </div>
      </Modal>

      {/* ── Mark Completed Confirmation ───────────────────────────── */}
      <Modal
        isOpen={!!completeInst}
        onClose={() => setCompleteInst(null)}
        title="Mark as Completed"
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setCompleteInst(null)}>Cancel</Button>
          <Button size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleComplete}>
            <CheckCircle2 size={13} className="mr-1" /> Mark Completed
          </Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Mark <span className="font-semibold">{completeInst?.id}</span> as completed?
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <p className="text-xs text-emerald-700 font-medium">{completeInst?.customerName}</p>
            <p className="text-xs text-emerald-600 mt-0.5">{completeInst?.area} · {completeInst?.plan}</p>
          </div>
        </div>
      </Modal>

      {/* ── Mark Cancelled Confirmation ───────────────────────────── */}
      <Modal
        isOpen={!!cancelInst}
        onClose={() => setCancelInst(null)}
        title="Mark as Cancelled"
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setCancelInst(null)}>Keep Installation</Button>
          <Button size="sm"
            className="bg-red-600 hover:bg-red-700"
            onClick={handleCancel}>
            Confirm Cancellation
          </Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Cancel the installation for{' '}
            <span className="font-semibold">{cancelInst?.customerName}</span>?
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-xs text-red-700 font-medium">{cancelInst?.id} · {cancelInst?.area}</p>
            <p className="text-xs text-red-600 mt-0.5">Slot: {cancelInst?.slotDate} — {cancelInst?.slot}</p>
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-400">
            <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-400" />
            This action cannot be undone.
          </div>
        </div>
      </Modal>

      {/* ── Filter Drawer ─────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-[1000]"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-80 bg-white z-[1001] shadow-2xl flex flex-col">
            {/* Drawer header */}
            <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
              <button onClick={() => setDrawerOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* Drawer body — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

              {/* Section 1 — Date Range */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Date Range</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">From</label>
                    <input type="date" value={draft.dateFrom}
                      onChange={e => setDraft(d => ({ ...d, dateFrom: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">To</label>
                    <input type="date" value={draft.dateTo}
                      onChange={e => setDraft(d => ({ ...d, dateTo: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700" />
                  </div>
                </div>
              </div>

              {/* Section 2 — Status (multi-select checkboxes) */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status</p>
                <div className="space-y-2">
                  {ALL_STATUSES.map(s => (
                    <label key={s} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox"
                        checked={draft.statuses.includes(s)}
                        onChange={() => toggleDraftStatus(s)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                      />
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CHIP[s] ?? 'bg-gray-100 text-gray-500'}`}>
                        {s}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Section 3 — Installation Slot */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Installation Slot</p>
                <div className="space-y-2">
                  {[{ val: '', label: 'All Slots' }, { val: 'Morning', label: 'Morning' }, { val: 'Afternoon', label: 'Afternoon' }, { val: 'Evening', label: 'Evening' }].map(opt => (
                    <label key={opt.val} className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="drawer-slot" value={opt.val}
                        checked={draft.slot === opt.val}
                        onChange={() => setDraft(d => ({ ...d, slot: opt.val }))}
                        className="w-4 h-4 text-brand-blue focus:ring-brand-blue/30"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Section 4 — Assigned Team */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Assigned Team</p>
                <select value={draft.team} onChange={e => setDraft(d => ({ ...d, team: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700">
                  <option value="">All Teams</option>
                  {INSTALLATION_TEAMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              {/* Section 5 — Assigned Engineer */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Assigned Engineer</p>
                <select value={draft.engineer} onChange={e => setDraft(d => ({ ...d, engineer: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700">
                  <option value="">All Engineers</option>
                  {FIELD_ENGINEERS.map(e => <option key={e.id}>{e.name}</option>)}
                </select>
              </div>

              {/* Section 6 — Priority */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Priority</p>
                <div className="space-y-2">
                  {[{ val: '', label: 'All' }, { val: 'High', label: 'High' }, { val: 'Medium', label: 'Medium' }, { val: 'Low', label: 'Low' }].map(opt => (
                    <label key={opt.val} className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="drawer-priority" value={opt.val}
                        checked={draft.priority === opt.val}
                        onChange={() => setDraft(d => ({ ...d, priority: opt.val }))}
                        className="w-4 h-4 text-brand-blue focus:ring-brand-blue/30"
                      />
                      <span className="text-sm text-gray-700">{opt.label || 'All'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Section 7 — Branch */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Branch</p>
                <select value={draft.branch} onChange={e => setDraft(d => ({ ...d, branch: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700">
                  <option value="">All Branches</option>
                  {INST_BRANCHES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>

            </div>

            {/* Drawer footer — sticky */}
            <div className="px-5 py-4 border-t border-surface-border flex items-center gap-3 shrink-0 bg-white">
              <button onClick={resetDrawer}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-surface-border rounded-lg hover:bg-gray-50 transition-colors">
                Reset Filters
              </button>
              <button onClick={applyDrawer}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors">
                Apply Filters
              </button>
            </div>
          </div>
        </>
      )}

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}

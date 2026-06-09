import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  List, Clock, CheckCircle2, XCircle, Loader2,
  Search, MoreVertical, X, UserCheck, SlidersHorizontal, Plus, Trash2, Wrench,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Select, Input, Textarea } from '../components/ui/FormInputs'
import { getFeasibilityRequests, updateFeasibilityStatus, subscribeFeasibility } from '../data/feasibilityStore'

/* ── Constants ───────────────────────────────────────────────── */

const STATUSES = ['Pending', 'Assigned', 'In Progress', 'Approved', 'Rejected']

const STATUS_VARIANT = {
  Pending:      'yellow',
  Assigned:     'blue',
  'In Progress':'purple',
  Approved:     'green',
  Rejected:     'red',
}

const ENGINEERS = [
  { name: 'Arjun Kumar',   initials: 'AK', color: 'bg-brand-blue'  },
  { name: 'Preethi Nair',  initials: 'PN', color: 'bg-purple-500'  },
  { name: 'Anita Sharma',  initials: 'AS', color: 'bg-teal-500'    },
  { name: 'Suresh Babu',   initials: 'SB', color: 'bg-emerald-600' },
  { name: 'Ravi Menon',    initials: 'RM', color: 'bg-orange-500'  },
]

const BRANCHES = [
  'CNPL-001','CNPL-002','CNPL-003','CNPL-004','CNPL-005',
  'CNPL-006','CNPL-007','CNPL-008','CNPL-009','CNPL-010','CNPL-011',
]

const REJECTION_REASONS = [
  'Not Feasible — Too Far from Network',
  'Not Feasible — No Fiber Route',
  'Not Feasible — High Cost',
  'Infrastructure Unavailable',
  'Other',
]

const PRIORITY_VARIANT = { High: 'red', Medium: 'yellow', Low: 'gray' }

const HW_ITEM_SUGGESTIONS   = ['ONT Device', 'Drop Wire', 'Splitter', 'ONU', 'Patch Cord', 'Other']
const WIRE_ITEM_SUGGESTIONS  = ['Ethernet Cat6', 'Fiber Cable', 'Drop Wire', 'Other']

function newHwRow(name = '', qty = '', unit = 'pcs') { return { id: Date.now() + Math.random(), name, qty, unit } }
function newWireRow(name = '', qty = '', unit = 'm')  { return { id: Date.now() + Math.random(), name, qty, unit } }

/* ── Toast ───────────────────────────────────────────────────── */
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl animate-in slide-in-from-bottom-4">
      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
      {msg}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────── */
export default function FeasibilityRequests() {
  const navigate = useNavigate()
  const menuRef  = useRef(null)

  const [requests, setRequests] = useState(getFeasibilityRequests())

  // Search (stays in main page)
  const [search, setSearch] = useState('')

  // Pagination
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Applied filters
  const [filterStatuses,  setFilterStatuses]  = useState([])
  const [filterEngineer,  setFilterEngineer]  = useState('')
  const [filterPriority,  setFilterPriority]  = useState('')
  const [filterBranch,    setFilterBranch]    = useState('')
  const [filterDateFrom,  setFilterDateFrom]  = useState('')
  const [filterDateTo,    setFilterDateTo]    = useState('')

  // Drawer
  const EMPTY_DRAFT = { statuses: [], engineer: '', priority: '', branch: '', dateFrom: '', dateTo: '' }
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [draft,      setDraft]      = useState(EMPTY_DRAFT)

  function openDrawer() {
    setDraft({ statuses: filterStatuses, engineer: filterEngineer, priority: filterPriority,
               branch: filterBranch, dateFrom: filterDateFrom, dateTo: filterDateTo })
    setDrawerOpen(true)
  }
  function applyDrawer() {
    setFilterStatuses(draft.statuses); setFilterEngineer(draft.engineer)
    setFilterPriority(draft.priority); setFilterBranch(draft.branch)
    setFilterDateFrom(draft.dateFrom); setFilterDateTo(draft.dateTo)
    setPage(1)
    setDrawerOpen(false)
  }
  function resetDrawer() { setDraft(EMPTY_DRAFT) }
  function toggleDraftStatus(s) {
    setDraft(d => ({ ...d, statuses: d.statuses.includes(s) ? d.statuses.filter(x => x !== s) : [...d.statuses, s] }))
  }

  const activeFilterCount = [
    filterDateFrom || filterDateTo,
    filterStatuses.length > 0,
    filterEngineer,
    filterPriority,
    filterBranch,
  ].filter(Boolean).length

  // Menu
  const [menuId,  setMenuId]  = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })

  // Modals
  const [assignReq,  setAssignReq]  = useState(null)
  const [approveReq, setApproveReq] = useState(null)
  const [rejectReq,  setRejectReq]  = useState(null)

  // Assign form — engineers is an array
  const [assignForm, setAssignForm] = useState({ engineers: [], priority: 'Medium', notes: '' })
  const [engSearch, setEngSearch] = useState('')

  // Approve form
  const [approveForm, setApproveForm] = useState({ comment: '', fiberEstimate: '', hardware: '', installNotes: '' })

  // Reject form
  const [rejectForm, setRejectForm] = useState({ reason: '', remarks: '' })

  // Hardware requirements (separate modal)
  const [hwReqId,   setHwReqId]   = useState(null)
  const [hwItems,   setHwItems]   = useState([])
  const [wireItems, setWireItems] = useState([])

  // Toast
  const [toast, setToast] = useState('')

  useEffect(() => subscribeFeasibility(setRequests), [])

  useEffect(() => {
    if (!menuId) return
    function onDown(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuId])

  function openMenu(e, id) {
    const rect = e.currentTarget.getBoundingClientRect()
    const top = window.innerHeight - rect.bottom < 160 ? rect.top - 164 : rect.bottom + 4
    setMenuPos({ top, right: window.innerWidth - rect.right })
    setMenuId(id)
  }

  function startAssign(req) {
    const existing = req.assignedEngineer ? req.assignedEngineer.split(', ').filter(Boolean) : []
    setAssignForm({ engineers: existing, priority: req.priority || 'Medium', notes: '' })
    setEngSearch('')
    setAssignReq(req); setMenuId(null)
  }

  function startHwRequirements(req) {
    setHwItems([newHwRow('ONT Device', '1', 'pcs'), newHwRow('Drop Wire', '50', 'm')])
    setWireItems([newWireRow('Ethernet Cat6', '20', 'm')])
    setHwReqId(req.id); setMenuId(null)
  }

  function handleSaveHw() {
    setToast('Hardware requirements saved')
    setHwReqId(null)
  }

  function toggleAssignEngineer(name) {
    setAssignForm(f => ({
      ...f,
      engineers: f.engineers.includes(name) ? f.engineers.filter(e => e !== name) : [...f.engineers, name],
    }))
  }

  function handleAssign() {
    updateFeasibilityStatus(assignReq.id, 'Assigned', {
      assignedEngineer: assignForm.engineers.join(', '),
      priority: assignForm.priority,
    })
    setAssignReq(null)
    setToast('Engineer(s) assigned successfully')
  }

  function addHwItem()   { setHwItems(r   => [...r, newHwRow()])    }
  function addWireItem() { setWireItems(r => [...r, newWireRow()])   }
  function removeHwItem(id)   { setHwItems(r   => r.filter(x => x.id !== id)) }
  function removeWireItem(id) { setWireItems(r => r.filter(x => x.id !== id)) }
  function updateHwItem(id, field, val)   { setHwItems(r   => r.map(x => x.id === id ? { ...x, [field]: val } : x)) }
  function updateWireItem(id, field, val) { setWireItems(r => r.map(x => x.id === id ? { ...x, [field]: val } : x)) }

  function startApprove(req) {
    setApproveForm({ comment: '', fiberEstimate: req.fiberRequired || '', hardware: '', installNotes: '' })
    setApproveReq(req); setMenuId(null)
  }

  function handleApprove() {
    updateFeasibilityStatus(approveReq.id, 'Approved', { fiberRequired: approveForm.fiberEstimate })
    setApproveReq(null)
    setToast('Feasibility approved successfully')
  }

  function startReject(req) {
    setRejectForm({ reason: '', remarks: '' })
    setRejectReq(req); setMenuId(null)
  }

  function handleReject() {
    updateFeasibilityStatus(rejectReq.id, 'Rejected')
    setRejectReq(null)
    setToast('Feasibility rejected')
  }

  function clearAllFilters() {
    setFilterStatuses([]); setFilterEngineer(''); setFilterPriority('')
    setFilterBranch(''); setFilterDateFrom(''); setFilterDateTo('')
  }

  /* Counts */
  const counts = {
    total:      requests.length,
    pending:    requests.filter(r => r.feasibilityStatus === 'Pending').length,
    assigned:   requests.filter(r => r.feasibilityStatus === 'Assigned').length,
    inProgress: requests.filter(r => r.feasibilityStatus === 'In Progress').length,
    approved:   requests.filter(r => r.feasibilityStatus === 'Approved').length,
    rejected:   requests.filter(r => r.feasibilityStatus === 'Rejected').length,
  }

  /* Filtering */
  const q = search.trim().toLowerCase()
  const visible = requests.filter(r => {
    if (q && !r.customerName.toLowerCase().includes(q) && !r.leadId.toLowerCase().includes(q)
      && !(r.mobile || '').includes(q) && !r.area.toLowerCase().includes(q)
      && !r.localityName.toLowerCase().includes(q) && !(r.village || '').toLowerCase().includes(q)) return false
    if (filterStatuses.length > 0 && !filterStatuses.includes(r.feasibilityStatus)) return false
    if (filterEngineer && r.assignedEngineer  !== filterEngineer) return false
    if (filterPriority && r.priority          !== filterPriority) return false
    if (filterBranch   && r.assignedBranch    !== filterBranch) return false
    if (filterDateFrom && r.createdAt < filterDateFrom) return false
    if (filterDateTo   && r.createdAt > filterDateTo)   return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const paged      = visible.slice((safePage - 1) * pageSize, safePage * pageSize)

  const menuReq = requests.find(r => r.id === menuId) ?? null

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">

      {/* Header */}
      <div className="px-6 pt-5 pb-4 shrink-0 bg-white border-b border-surface-border">
        <h1 className="text-xl font-bold text-gray-900">Feasibility Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">Leads requiring feasibility check for unmapped or new areas</p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Stats — 6 cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Requests', value: counts.total,      color: 'text-gray-700',    bg: 'bg-gray-100',    icon: List         },
            { label: 'Pending',        value: counts.pending,    color: 'text-amber-600',   bg: 'bg-amber-50',    icon: Clock        },
            { label: 'Assigned',       value: counts.assigned,   color: 'text-brand-blue',  bg: 'bg-blue-50',     icon: UserCheck    },
            { label: 'In Progress',    value: counts.inProgress, color: 'text-purple-600',  bg: 'bg-purple-50',   icon: Loader2      },
            { label: 'Approved',       value: counts.approved,   color: 'text-emerald-600', bg: 'bg-emerald-50',  icon: CheckCircle2 },
            { label: 'Rejected',       value: counts.rejected,   color: 'text-red-500',     bg: 'bg-red-50',      icon: XCircle      },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="bg-white rounded-xl border border-surface-border p-4 flex items-center gap-3 shadow-card">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Filters button */}
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, lead ID, mobile, location..."
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
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                Clear all
              </button>
            )}
            <span className="text-xs text-gray-400 shrink-0">{visible.length} request{visible.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-surface-border overflow-hidden shadow-card">
          {visible.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-gray-400 text-sm">No requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 1500 }}>
                <thead>
                  <tr className="border-b border-surface-border bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    {['Req ID','Lead ID','Customer Name','Mobile','Connection Type','Area','Locality','Sub Locality',
                      'Assigned Engineer','Fiber Req (M)','Priority','Status','Created Date','Branch','Actions']
                      .map((h, i) => (
                        <th key={h} className={`px-4 py-3 text-left whitespace-nowrap ${i === 0 ? 'pl-6' : ''}`}>{h}</th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {paged.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="pl-6 pr-4 py-3 whitespace-nowrap">
                        <button onClick={() => navigate(`/sales/feasibility-requests/${r.id}`)}
                          className="font-mono text-xs font-semibold text-brand-blue hover:underline transition-colors">
                          {r.id}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button onClick={() => navigate(`/sales/leads/${r.leadId}/overview`)}
                          className="font-mono text-xs font-semibold text-gray-600 hover:text-brand-blue hover:underline transition-colors">
                          {r.leadId}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-gray-900">{r.customerName}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-600">{r.mobile || '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-700">{r.connectionType || '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-700">{r.area}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-700">{r.localityName}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-700">{r.subLocalityName}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.assignedEngineer
                          ? <span className="text-xs text-gray-800 font-medium">{r.assignedEngineer}</span>
                          : <span className="text-gray-300 text-xs">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="text-xs text-gray-700">{r.fiberRequired ? `${r.fiberRequired} m` : '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.priority
                          ? <Badge variant={PRIORITY_VARIANT[r.priority] || 'gray'} size="sm">{r.priority}</Badge>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={STATUS_VARIANT[r.feasibilityStatus] ?? 'gray'} size="sm">
                          {r.feasibilityStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-500">{r.createdAt}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.assignedBranch
                          ? <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{r.assignedBranch}</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={e => openMenu(e, r.id)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                            menuId === r.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
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

          {/* Pagination footer */}
          {visible.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Show</span>
                <select value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                  className="text-xs border border-surface-border rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
                  {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="text-xs text-gray-500">per page</span>
              </div>
              <span className="text-xs text-gray-500">
                Showing {visible.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, visible.length)} of {visible.length} request{visible.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                      p === safePage ? 'bg-brand-blue text-white' : 'border border-surface-border hover:bg-white text-gray-600'
                    }`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ⋮ Dropdown portal */}
      {menuReq && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="bg-white rounded-lg border border-gray-100 shadow-lg py-1 min-w-[220px]"
        >
          <button onClick={() => { navigate(`/sales/feasibility-requests/${menuReq.id}`); setMenuId(null) }}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 cursor-pointer">
            <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">View Details</span>
          </button>
          <button onClick={() => { navigate(`/sales/leads/${menuReq.leadId}/overview`); setMenuId(null) }}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 cursor-pointer">
            <List className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">View Lead</span>
          </button>
          <button onClick={() => startAssign(menuReq)}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 cursor-pointer">
            <UserCheck className="w-4 h-4 text-brand-blue flex-shrink-0" />
            <span className="text-sm text-gray-700">Assign Engineer</span>
          </button>
          <button onClick={() => startHwRequirements(menuReq)}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 cursor-pointer">
            <Wrench className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">Add Hardware Requirements</span>
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => startApprove(menuReq)}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 cursor-pointer">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">Approve</span>
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => startReject(menuReq)}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 cursor-pointer">
            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">Reject</span>
          </button>
        </div>
      )}

      {/* Assign Engineer modal */}
      <Modal
        isOpen={!!assignReq}
        onClose={() => setAssignReq(null)}
        title={`Assign Engineer — ${assignReq?.id}`}
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setAssignReq(null)}>Cancel</Button>
          <Button size="sm" onClick={handleAssign} disabled={assignForm.engineers.length === 0}>Assign Engineer</Button>
        </>}
      >
        <div className="space-y-4">
          {/* Section 1 — Engineers */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Engineers <span className="text-red-500">*</span></p>

            {/* Selected chips */}
            {assignForm.engineers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {assignForm.engineers.map(name => (
                  <span key={name} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium">
                    {name}
                    <button type="button" onClick={() => toggleAssignEngineer(name)}
                      className="text-brand-blue/60 hover:text-brand-blue transition-colors leading-none">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative mb-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={engSearch}
                onChange={e => setEngSearch(e.target.value)}
                placeholder="Search engineer..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400 text-gray-800"
              />
            </div>

            {/* Filtered list */}
            {(() => {
              const filtered = ENGINEERS.filter(e =>
                e.name.toLowerCase().includes(engSearch.toLowerCase())
              )
              return (
                <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden max-h-[200px] overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No engineers found</p>
                  ) : filtered.map(eng => {
                    const selected = assignForm.engineers.includes(eng.name)
                    return (
                      <label key={eng.name}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                        <input type="checkbox"
                          checked={selected}
                          onChange={() => toggleAssignEngineer(eng.name)}
                          className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                        />
                        <div className={`w-6 h-6 rounded-full ${eng.color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
                          {eng.initials}
                        </div>
                        <span className="text-sm text-gray-700">{eng.name}</span>
                      </label>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* Section 3 — Priority */}
          <FormField label="Priority" required>
            <Select value={assignForm.priority} onChange={e => setAssignForm(f => ({ ...f, priority: e.target.value }))}>
              {['High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
            </Select>
          </FormField>

          {/* Section 4 — Internal Notes */}
          <FormField label="Internal Notes">
            <Textarea rows={2} placeholder="Any notes for the engineers…"
              value={assignForm.notes} onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))} />
          </FormField>

        </div>
      </Modal>

      {/* ── Hardware Requirements Modal ──────────────────────────── */}
      <Modal
        isOpen={!!hwReqId}
        onClose={() => setHwReqId(null)}
        title={`Hardware Requirements — ${hwReqId}`}
        size="md"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setHwReqId(null)}>Cancel</Button>
          <Button size="sm" onClick={handleSaveHw}>Save Requirements</Button>
        </>}
      >
        <div className="space-y-6">
          {/* Hardware Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hardware Items</p>
              <button type="button" onClick={addHwItem}
                className="flex items-center gap-1 text-xs font-medium text-brand-blue hover:text-blue-700 transition-colors">
                <Plus size={12} /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_72px_72px_28px] gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1">
                <span>Item Name</span><span>QTY</span><span>Unit</span><span />
              </div>
              {hwItems.map(row => (
                <div key={row.id} className="grid grid-cols-[1fr_72px_72px_28px] gap-2 items-center">
                  <input value={row.name} onChange={e => updateHwItem(row.id, 'name', e.target.value)}
                    placeholder="e.g. ONT Device" list="hw-suggestions"
                    className="px-2.5 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-800" />
                  <input type="number" min="0" value={row.qty} onChange={e => updateHwItem(row.id, 'qty', e.target.value)}
                    placeholder="0"
                    className="px-2.5 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-800 text-center" />
                  <input value={row.unit} onChange={e => updateHwItem(row.id, 'unit', e.target.value)}
                    placeholder="pcs"
                    className="px-2.5 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-800 text-center" />
                  <button type="button" onClick={() => removeHwItem(row.id)}
                    className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {hwItems.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3 border-2 border-dashed border-gray-200 rounded-lg">No items added</p>
              )}
            </div>
            <datalist id="hw-suggestions">
              {HW_ITEM_SUGGESTIONS.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>

          <div className="border-t border-surface-border" />

          {/* Wire / Cable */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Wire / Cable</p>
              <button type="button" onClick={addWireItem}
                className="flex items-center gap-1 text-xs font-medium text-brand-blue hover:text-blue-700 transition-colors">
                <Plus size={12} /> Add Wire
              </button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_72px_72px_28px] gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1">
                <span>Cable Name</span><span>QTY</span><span>Unit</span><span />
              </div>
              {wireItems.map(row => (
                <div key={row.id} className="grid grid-cols-[1fr_72px_72px_28px] gap-2 items-center">
                  <input value={row.name} onChange={e => updateWireItem(row.id, 'name', e.target.value)}
                    placeholder="e.g. Ethernet Cat6" list="wire-suggestions"
                    className="px-2.5 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-800" />
                  <input type="number" min="0" value={row.qty} onChange={e => updateWireItem(row.id, 'qty', e.target.value)}
                    placeholder="0"
                    className="px-2.5 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-800 text-center" />
                  <input value={row.unit} onChange={e => updateWireItem(row.id, 'unit', e.target.value)}
                    placeholder="m"
                    className="px-2.5 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-800 text-center" />
                  <button type="button" onClick={() => removeWireItem(row.id)}
                    className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {wireItems.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3 border-2 border-dashed border-gray-200 rounded-lg">No wires added</p>
              )}
            </div>
            <datalist id="wire-suggestions">
              {WIRE_ITEM_SUGGESTIONS.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
        </div>
      </Modal>

      {/* Approve modal */}
      <Modal
        isOpen={!!approveReq}
        onClose={() => setApproveReq(null)}
        title={`Approve Feasibility — ${approveReq?.leadId}`}
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setApproveReq(null)}>Cancel</Button>
          <Button size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleApprove}
            disabled={!approveForm.comment.trim() || !approveForm.fiberEstimate}
          >Approve</Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="Approval Comment" required>
            <Textarea rows={3} placeholder="Reason for approval…"
              value={approveForm.comment} onChange={e => setApproveForm(f => ({ ...f, comment: e.target.value }))} />
          </FormField>
          <FormField label="Estimated Fiber Requirement (meters)" required>
            <Input type="number" min="0" placeholder="e.g. 250"
              value={approveForm.fiberEstimate} onChange={e => setApproveForm(f => ({ ...f, fiberEstimate: e.target.value }))} />
          </FormField>
          <FormField label="Hardware Requirement Summary">
            <Textarea rows={2} placeholder="List required hardware…"
              value={approveForm.hardware} onChange={e => setApproveForm(f => ({ ...f, hardware: e.target.value }))} />
          </FormField>
          <FormField label="Installation Notes">
            <Textarea rows={2} placeholder="Any special installation instructions…"
              value={approveForm.installNotes} onChange={e => setApproveForm(f => ({ ...f, installNotes: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal
        isOpen={!!rejectReq}
        onClose={() => setRejectReq(null)}
        title={`Reject Feasibility — ${rejectReq?.leadId}`}
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setRejectReq(null)}>Cancel</Button>
          <Button size="sm"
            className="bg-red-600 hover:bg-red-700"
            onClick={handleReject}
            disabled={!rejectForm.reason || !rejectForm.remarks.trim()}
          >Reject</Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="Rejection Reason" required>
            <Select value={rejectForm.reason} onChange={e => setRejectForm(f => ({ ...f, reason: e.target.value }))}>
              <option value="">Select reason…</option>
              {REJECTION_REASONS.map(r => <option key={r}>{r}</option>)}
            </Select>
          </FormField>
          <FormField label="Remarks" required>
            <Textarea rows={3} placeholder="Additional remarks…"
              value={rejectForm.remarks} onChange={e => setRejectForm(f => ({ ...f, remarks: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      {/* ── Filter Drawer ─────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[1000]" onClick={() => setDrawerOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-80 bg-white z-[1001] shadow-2xl flex flex-col">

            {/* Drawer header */}
            <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
              <button onClick={() => setDrawerOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* Drawer body */}
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

              {/* Section 2 — Status (checkboxes) */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status</p>
                <div className="space-y-2.5">
                  {STATUSES.map(s => (
                    <label key={s} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox"
                        checked={draft.statuses.includes(s)}
                        onChange={() => toggleDraftStatus(s)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                      />
                      <Badge variant={STATUS_VARIANT[s] ?? 'gray'} size="sm">{s}</Badge>
                    </label>
                  ))}
                </div>
              </div>

              {/* Section 3 — Assigned Engineer */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Assigned Engineer</p>
                <select value={draft.engineer}
                  onChange={e => setDraft(d => ({ ...d, engineer: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700">
                  <option value="">All Engineers</option>
                  {ENGINEERS.map(e => <option key={e.name}>{e.name}</option>)}
                </select>
              </div>

              {/* Section 4 — Priority (radio) */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Priority</p>
                <div className="space-y-2">
                  {[{ val: '', label: 'All' }, { val: 'High', label: 'High' }, { val: 'Medium', label: 'Medium' }, { val: 'Low', label: 'Low' }].map(opt => (
                    <label key={opt.val} className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="fr-priority" value={opt.val}
                        checked={draft.priority === opt.val}
                        onChange={() => setDraft(d => ({ ...d, priority: opt.val }))}
                        className="w-4 h-4 text-brand-blue focus:ring-brand-blue/30"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Section 5 — Branch */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Branch</p>
                <select value={draft.branch}
                  onChange={e => setDraft(d => ({ ...d, branch: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700">
                  <option value="">All Branches</option>
                  {BRANCHES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>

            </div>

            {/* Drawer footer */}
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

      {/* Toast */}
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  List, Clock, CheckCircle2, XCircle, Loader2,
  Search, MoreVertical, X, UserCheck,
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

const ENGINEERS = ['Arjun Kumar', 'Preethi Nair', 'Anita Sharma', 'Suresh Babu']

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

  // Filters
  const [search,          setSearch]          = useState('')
  const [filterStatus,    setFilterStatus]    = useState('')
  const [filterEngineer,  setFilterEngineer]  = useState('')
  const [filterPriority,  setFilterPriority]  = useState('')
  const [filterBranch,    setFilterBranch]    = useState('')
  const [filterDateFrom,  setFilterDateFrom]  = useState('')
  const [filterDateTo,    setFilterDateTo]    = useState('')

  // Menu
  const [menuId,  setMenuId]  = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })

  // Modals
  const [assignReq,  setAssignReq]  = useState(null)
  const [approveReq, setApproveReq] = useState(null)
  const [rejectReq,  setRejectReq]  = useState(null)

  // Assign form
  const [assignForm, setAssignForm] = useState({ engineer: '', date: '', priority: 'Medium', notes: '' })

  // Approve form
  const [approveForm, setApproveForm] = useState({ comment: '', fiberEstimate: '', hardware: '', installNotes: '' })

  // Reject form
  const [rejectForm, setRejectForm] = useState({ reason: '', remarks: '' })

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
    setAssignForm({ engineer: req.assignedEngineer || '', date: '', priority: req.priority || 'Medium', notes: '' })
    setAssignReq(req); setMenuId(null)
  }

  function handleAssign() {
    updateFeasibilityStatus(assignReq.id, 'Assigned', {
      assignedEngineer: assignForm.engineer,
      priority: assignForm.priority,
    })
    setAssignReq(null)
  }

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

  function clearFilters() {
    setSearch(''); setFilterStatus(''); setFilterEngineer('')
    setFilterPriority(''); setFilterBranch(''); setFilterDateFrom(''); setFilterDateTo('')
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
    if (filterStatus   && r.feasibilityStatus !== filterStatus) return false
    if (filterEngineer && r.assignedEngineer  !== filterEngineer) return false
    if (filterPriority && r.priority          !== filterPriority) return false
    if (filterBranch   && r.assignedBranch    !== filterBranch) return false
    if (filterDateFrom && r.createdAt < filterDateFrom) return false
    if (filterDateTo   && r.createdAt > filterDateTo)   return false
    return true
  })

  const menuReq = requests.find(r => r.id === menuId) ?? null

  const selectCls = 'px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700'

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

        {/* Filters bar */}
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, lead ID, mobile, location..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
          </div>
          {/* Filter dropdowns */}
          <div className="flex flex-wrap gap-3 items-center">
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              className={`${selectCls} text-gray-500`} title="Date from" />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              className={`${selectCls} text-gray-500`} title="Date to" />

            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>

            <select value={filterEngineer} onChange={e => setFilterEngineer(e.target.value)} className={selectCls}>
              <option value="">All Engineers</option>
              {ENGINEERS.map(e => <option key={e}>{e}</option>)}
            </select>

            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={selectCls}>
              <option value="">All Priorities</option>
              {['High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
            </select>

            <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className={selectCls}>
              <option value="">All Branches</option>
              {BRANCHES.map(b => <option key={b}>{b}</option>)}
            </select>

            {(search || filterStatus || filterEngineer || filterPriority || filterBranch || filterDateFrom || filterDateTo) && (
              <button onClick={clearFilters}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-surface-border rounded-lg hover:bg-gray-50 transition-colors">
                Clear
              </button>
            )}
            <span className="text-xs text-gray-400 ml-auto">{visible.length} request{visible.length !== 1 ? 's' : ''}</span>
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
                    {['Req ID','Lead ID','Customer Name','Mobile','Village','Area','Locality','Sub Locality',
                      'Feasibility Reason','Assigned Engineer','Fiber Req (M)','Priority','Status','Created Date','Branch','Actions']
                      .map((h, i) => (
                        <th key={h} className={`px-4 py-3 text-left whitespace-nowrap ${i === 0 ? 'pl-6' : ''}`}>{h}</th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {visible.map(r => (
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
                        <span className="text-xs text-gray-700">{r.village || '—'}</span>
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
                      <td className="px-4 py-3 max-w-[180px]">
                        <span className="text-xs text-gray-600 line-clamp-2">{r.feasibilityReason || '—'}</span>
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
        </div>
      </div>

      {/* ⋮ Dropdown portal */}
      {menuReq && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
        >
          <button onClick={() => { navigate(`/sales/feasibility-requests/${menuReq.id}`); setMenuId(null) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <Search size={13} className="text-gray-400 shrink-0" /> View Details
          </button>
          <button onClick={() => { navigate(`/sales/leads/${menuReq.leadId}/overview`); setMenuId(null) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <List size={13} className="text-gray-400 shrink-0" /> View Lead
          </button>
          <button onClick={() => startAssign(menuReq)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <UserCheck size={13} className="text-brand-blue shrink-0" /> Assign Engineer
          </button>
          <div className="my-1 border-t border-surface-border" />
          <button onClick={() => startApprove(menuReq)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors">
            <CheckCircle2 size={13} className="shrink-0" /> Approve
          </button>
          <button onClick={() => startReject(menuReq)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors">
            <XCircle size={13} className="shrink-0" /> Reject
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
          <Button size="sm" onClick={handleAssign} disabled={!assignForm.engineer}>Assign Engineer</Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="Engineer Name" required>
            <Select value={assignForm.engineer} onChange={e => setAssignForm(f => ({ ...f, engineer: e.target.value }))}>
              <option value="">Select engineer…</option>
              {ENGINEERS.map(eng => <option key={eng}>{eng}</option>)}
            </Select>
          </FormField>
          <FormField label="Assignment Date">
            <Input type="date" value={assignForm.date} onChange={e => setAssignForm(f => ({ ...f, date: e.target.value }))} />
          </FormField>
          <FormField label="Priority" required>
            <Select value={assignForm.priority} onChange={e => setAssignForm(f => ({ ...f, priority: e.target.value }))}>
              {['High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
            </Select>
          </FormField>
          <FormField label="Internal Notes">
            <Textarea rows={3} placeholder="Any notes for the engineer…"
              value={assignForm.notes} onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))} />
          </FormField>
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

      {/* Toast */}
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}

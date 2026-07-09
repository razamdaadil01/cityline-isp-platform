import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Plus, Search, Filter, X, ChevronDown, MoreVertical,
  Users, Activity, CalendarDays, CheckCircle2, Eye, Edit3, Trash2, AlertTriangle,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import {
  getLeads, deleteLead, subscribeLeads, INTERCOM_STAGES, INTERCOM_STAFF,
} from '../data/intercomLeadsStore'

const STAGE_BADGE = {
  'New Inquiry': 'blue',
  'Feasibility': 'orange',
  'Booked':      'purple',
  'Converted':   'green',
  'Lost':        'red',
}

const TODAY_DMY = (() => {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
})()

function statusOf(stage) {
  return stage === 'Converted' || stage === 'Lost' ? 'Closed' : 'Active'
}

// ── Actions Dropdown ──────────────────────────────────────────────────────────

function ActionsMenu({ lead, onView, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
          open ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
        }`}
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-36 bg-white border border-surface-border rounded-xl shadow-lg py-1 text-sm">
          <button onClick={() => { setOpen(false); onView(lead) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <Eye size={13} className="text-gray-400 shrink-0" /> View
          </button>
          <button onClick={() => { setOpen(false); onEdit(lead) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <Edit3 size={13} className="text-gray-400 shrink-0" /> Edit
          </button>
          <div className="my-1 border-t border-surface-border" />
          <button onClick={() => { setOpen(false); onDelete(lead) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 size={13} className="shrink-0" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteConfirmModal({ lead, onClose, onConfirm }) {
  return (
    <Modal isOpen={!!lead} onClose={onClose} title="Delete this lead?" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Delete Lead</Button>
        </>
      }
    >
      <div className="text-center py-2">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          <span className="font-semibold text-gray-900">{lead?.leadName}</span>{' '}
          will be permanently removed from the intercom leads list.
        </p>
      </div>
    </Modal>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function IntercomLeads() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState(getLeads)
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filterStage, setFilterStage] = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => subscribeLeads(setLeads), [])

  function clearAllFilters() {
    setFilterStage(''); setFilterAssigned(''); setFilterStatus('')
    setFilterDateFrom(''); setFilterDateTo('')
  }

  const searchTrimmed = search.trim().toLowerCase()
  const filtered = leads.filter(l => {
    if (searchTrimmed &&
      !l.leadName.toLowerCase().includes(searchTrimmed) &&
      !l.customer.toLowerCase().includes(searchTrimmed) &&
      !l.mobile.includes(search.trim()) &&
      !l.id.toLowerCase().includes(searchTrimmed)
    ) return false
    if (filterStage && l.stage !== filterStage) return false
    if (filterAssigned && l.assigned !== filterAssigned) return false
    if (filterStatus && statusOf(l.stage) !== filterStatus) return false
    if (filterDateFrom && l.createdAt < filterDateFrom) return false
    if (filterDateTo && l.createdAt > filterDateTo) return false
    return true
  })

  const filterCount = [filterStage, filterAssigned, filterStatus, filterDateFrom || filterDateTo].filter(Boolean).length
  const hasActiveFilters = filterCount > 0

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const totalLeads      = leads.length
  const activeCount     = leads.filter(l => statusOf(l.stage) === 'Active').length
  const todayFollowUps  = leads.filter(l => l.followUp === TODAY_DMY).length
  const convertedCount  = leads.filter(l => l.stage === 'Converted').length

  function confirmDelete() {
    if (deleteTarget) { deleteLead(deleteTarget.id); setDeleteTarget(null) }
  }

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Intercom Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage intercom service leads</p>
        </div>
        <Button icon={<Plus size={14} />} onClick={() => navigate('/intercom/leads/new')}>
          New Lead
        </Button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Leads',           value: totalLeads,     icon: Users,        color: 'text-brand-blue',  bg: 'bg-brand-blue/10' },
          { label: 'Active',                value: activeCount,    icon: Activity,     color: 'text-emerald-700', bg: 'bg-emerald-100'   },
          { label: 'Today Follow-ups',      value: todayFollowUps, icon: CalendarDays, color: 'text-brand-orange',bg: 'bg-brand-orange/10' },
          { label: 'Converted This Month',  value: convertedCount, icon: CheckCircle2, color: 'text-purple-700',  bg: 'bg-purple-100'    },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl border border-surface-border shadow-card px-4 py-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                <Icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-[11px] text-gray-500 leading-tight">{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Search + Filter ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search leads…"
              className="pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white w-full focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className={`relative flex items-center justify-center w-9 h-9 rounded-lg border transition-all shrink-0 ${
              hasActiveFilters
                ? 'border-purple-500 bg-purple-50 text-purple-600 hover:bg-purple-100'
                : 'border-surface-border bg-white text-gray-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50'
            }`}
            title="Open filters"
          >
            <Filter size={15} />
            {filterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-purple-600 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                {filterCount}
              </span>
            )}
          </button>
        </div>

        {(hasActiveFilters || search.trim()) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={11} className="text-purple-400 shrink-0" />
            {search.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                "{search}"
                <button onClick={() => setSearch('')} className="hover:text-gray-900 ml-0.5"><X size={10} /></button>
              </span>
            )}
            {filterStage && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {filterStage}
                <button onClick={() => setFilterStage('')} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            {filterAssigned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {filterAssigned}
                <button onClick={() => setFilterAssigned('')} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            {filterStatus && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {filterStatus}
                <button onClick={() => setFilterStatus('')} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            {(filterDateFrom || filterDateTo) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                Date: {filterDateFrom || '…'} → {filterDateTo || '…'}
                <button onClick={() => { setFilterDateFrom(''); setFilterDateTo('') }} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            <button onClick={() => { clearAllFilters(); setSearch('') }}
              className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors ml-0.5">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                {['Lead ID', 'Customer', 'Mobile', 'Stage', 'Assigned', 'Follow-up Date', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No intercom leads found</td>
                </tr>
              ) : (
                paged.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-mono font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {lead.id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-blue to-navy flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {lead.customer.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <Link to={`/intercom/leads/${lead.id}`} className="block font-semibold text-sm text-brand-blue hover:underline truncate">
                            {lead.customer}
                          </Link>
                          <p className="text-xs text-gray-400 truncate">{lead.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">{lead.mobile}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STAGE_BADGE[lead.stage] ?? 'gray'} size="sm">{lead.stage}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${lead.assignedColor}`}>
                          {lead.assignedInitials}
                        </span>
                        <span className="text-xs text-gray-600">{lead.assigned}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{lead.followUp || '—'}</td>
                    <td className="px-4 py-3">
                      <ActionsMenu
                        lead={lead}
                        onView={l => navigate(`/intercom/leads/${l.id}`)}
                        onEdit={l => navigate(`/intercom/leads/${l.id}?edit=1`)}
                        onDelete={l => setDeleteTarget(l)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Records per page</span>
            <select value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="text-xs border border-surface-border rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
              {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <span className="text-xs text-gray-500">
            Page {currentPage} of {totalPages} &nbsp;|&nbsp; Total {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                  p === currentPage ? 'bg-brand-blue text-white' : 'border border-surface-border hover:bg-white text-gray-600'
                }`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Delete Confirm ───────────────────────────────────────────────────── */}
      <DeleteConfirmModal lead={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} />

      {/* ── Filter Drawer ────────────────────────────────────────────────────── */}
      <div className={`fixed top-14 left-0 right-0 bottom-0 z-50 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>

          {/* Drawer header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-purple-600" />
              <h2 className="text-sm font-bold text-gray-900">Filters</h2>
              {filterCount > 0 && (
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">
                  {filterCount} active
                </span>
              )}
            </div>
            <button onClick={() => setDrawerOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* Drawer body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* Stage */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Stage</label>
              <div className="relative">
                <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All Stages</option>
                  {INTERCOM_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Assigned User */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned User</label>
              <div className="relative">
                <select value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All Users</option>
                  {INTERCOM_STAFF.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
              <div className="relative">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All</option>
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Created Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Created Date</label>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-400 mb-1">From</p>
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">To</p>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700" />
                </div>
              </div>
            </div>

          </div>

          {/* Drawer footer */}
          <div className="shrink-0 px-5 py-4 border-t border-surface-border bg-gray-50 flex items-center gap-3">
            <button onClick={clearAllFilters}
              className="flex-1 py-2.5 text-sm font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl transition-colors bg-white">
              Clear All Filters
            </button>
            <button onClick={() => { setPage(1); setDrawerOpen(false) }}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm">
              Apply Filters
            </button>
          </div>

        </div>
      </div>

    </div>
  )
}

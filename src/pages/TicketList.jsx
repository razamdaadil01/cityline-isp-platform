import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, Search, Filter, X, ChevronDown, Download, UserCog, Wrench,
  Flag, LayoutList, Sparkles, UserX, Loader2, AlertTriangle, MoreVertical,
  Phone, MessageSquare,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import CallModal from '../components/ui/CallModal'
import AssignTeamModal from '../components/ui/AssignTeamModal'
import ColumnManager, { useColumnPrefs } from '../components/table/ColumnManager'
import {
  getTickets, subscribeTickets, assignTechnician, changePriority, addCommunication, assignTeamMembers, slaStatusOf,
  TICKET_STATUSES, CLOSED_STATUSES, PRIORITIES, PRIORITY_LABEL, CATEGORIES, AREAS, AGENTS, TECHNICIANS,
} from '../data/ticketsStore'

const CURRENT_USER = 'Admin User'

// Ticket List table's Show/Hide Columns default set. Ticket No is locked
// (unlike the other tables in this rollout) so the table can never end up
// with no ticket identifier visible.
const SUPPORT_TICKETS_COLUMNS = [
  { key: 'ticketNo',      label: 'Ticket No',      visible: true, defaultVisible: true, locked: true },
  { key: 'customerName',  label: 'Customer Name',  visible: true, defaultVisible: true },
  { key: 'category',      label: 'Category',       visible: true, defaultVisible: true },
  { key: 'priority',      label: 'Priority',       visible: true, defaultVisible: true },
  { key: 'status',        label: 'Status',         visible: true, defaultVisible: true },
  { key: 'assignedAgent', label: 'Assigned Agent', visible: true, defaultVisible: true },
  { key: 'branch',        label: 'Branch',         visible: true, defaultVisible: true },
  { key: 'created',       label: 'Created',        visible: true, defaultVisible: true },
  { key: 'actions',       label: 'Actions',        visible: true, defaultVisible: true },
]

const STATUS_BADGE = {
  'New': 'blue',
  'Assigned': 'cyan',
  'In Progress': 'orange',
  'Waiting for Customer': 'purple',
  'Waiting for Technician': 'yellow',
  'Waiting for NOC': 'navy',
  'Waiting for Billing': 'purple',
  'Resolved': 'green',
  'Closed': 'gray',
  'Reopened': 'red',
  'Cancelled': 'gray',
  'Duplicate': 'gray',
}

const PRIORITY_BADGE = { P1: 'red', P2: 'orange', P3: 'yellow', P4: 'gray' }

const SLA_BADGE = { 'On Track': 'green', 'Due Soon': 'yellow', 'Breached': 'red', 'Met': 'gray' }

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

// ── Bulk action modal (shared shell for Assign Agent / Assign Technician / Change Priority) ──

function BulkActionModal({ open, onClose, title, options, optionLabel, value, onChange, onApply, ticket }) {
  return (
    <Modal isOpen={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onApply} disabled={!value}>Apply</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          Applying to <span className="font-mono font-semibold text-gray-800">{ticket?.id}</span>.
        </p>
        <div className="relative">
          <select value={value} onChange={e => onChange(e.target.value)}
            className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700 cursor-pointer">
            <option value="">Select…</option>
            {options.map(o => <option key={o} value={o}>{optionLabel ? optionLabel(o) : o}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>
    </Modal>
  )
}

// ── Per-row kebab menu (Assign Team / Assign Technician / Change Priority) ──

function RowActionsMenu({ ticket, onAssignTeam, onAssignTechnician, onChangePriority, onSendMessage }) {
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
        <div className="absolute right-0 z-20 mt-1 w-44 bg-white border border-surface-border rounded-xl shadow-lg py-1 text-sm">
          <button onClick={() => { setOpen(false); onAssignTeam(ticket) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <UserCog size={13} className="text-gray-400 shrink-0" /> Assign Team
          </button>
          <button onClick={() => { setOpen(false); onAssignTechnician(ticket) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <Wrench size={13} className="text-gray-400 shrink-0" /> Assign Technician
          </button>
          <button onClick={() => { setOpen(false); onChangePriority(ticket) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <Flag size={13} className="text-gray-400 shrink-0" /> Change Priority
          </button>
          <button onClick={() => { setOpen(false); onSendMessage(ticket) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors border-t border-surface-border">
            <MessageSquare size={13} className="text-gray-400 shrink-0" /> Send Message
          </button>
        </div>
      )}
    </div>
  )
}

// ── Send Customer Message modal (stub — stores the message as a Communication entry) ──

function CustomerMessageModal({ open, onClose, ticket, onSend }) {
  const [message, setMessage] = useState('')

  function handleSend() {
    if (!message.trim()) return
    onSend(message.trim())
    setMessage('')
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Send Customer Message" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={!message.trim()}>Send</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          Sending to <span className="font-semibold text-gray-800">{ticket?.customerName}</span>
          {ticket && <span className="font-mono text-gray-400"> · {ticket.phone}</span>}
        </p>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          placeholder="Type a message to send to the customer…"
          className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
        />
        <p className="text-[11px] text-gray-400">
          No messaging provider is connected yet — this stores the message in the ticket's Communication tab as sent.
        </p>
      </div>
    </Modal>
  )
}

export default function TicketList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qp = (key, allowed) => {
    const v = searchParams.get(key)
    return allowed.includes(v) ? v : ''
  }

  const [tickets, setTickets] = useState(getTickets)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [tableColumns, setTableColumns] = useColumnPrefs('columnPrefs:supportTicketsTable', SUPPORT_TICKETS_COLUMNS)
  const visibleCols = new Set(tableColumns.filter(c => c.visible).map(c => c.key))

  const [fStatus, setFStatus] = useState(() => qp('status', TICKET_STATUSES))
  const [fPriority, setFPriority] = useState(() => qp('priority', PRIORITIES))
  const [fCategory, setFCategory] = useState(() => qp('category', CATEGORIES))
  const [fArea, setFArea] = useState(() => qp('area', AREAS))
  const [fAgent, setFAgent] = useState(() => qp('agent', AGENTS))
  const [fTechnician, setFTechnician] = useState(() => qp('technician', TECHNICIANS))
  const [fSlaStatus, setFSlaStatus] = useState(() => qp('slaStatus', ['On Track', 'Due Soon', 'Breached', 'Met']))
  const [fDateFrom, setFDateFrom] = useState(() => searchParams.get('dateFrom') ?? '')
  const [fDateTo, setFDateTo] = useState(() => searchParams.get('dateTo') ?? '')
  const [fOutage, setFOutage] = useState(() => qp('outageLinked', ['Yes', 'No']))
  const [fReopened, setFReopened] = useState(() => qp('reopened', ['Yes', 'No']))
  const [fUnassigned, setFUnassigned] = useState(() => searchParams.get('unassigned') === '1')
  const [fOpenOnly, setFOpenOnly] = useState(() => searchParams.get('view') === 'open')

  const [actionTicket, setActionTicket] = useState(null)
  const [assignTeamOpen, setAssignTeamOpen] = useState(false)
  const [assignTechOpen, setAssignTechOpen] = useState(false)
  const [assignTechValue, setAssignTechValue] = useState('')
  const [changePriorityOpen, setChangePriorityOpen] = useState(false)
  const [changePriorityValue, setChangePriorityValue] = useState('')
  const [callModal, setCallModal] = useState({ open: false, name: '', phone: '' })
  const [messageOpen, setMessageOpen] = useState(false)

  useEffect(() => subscribeTickets(setTickets), [])

  function clearAllFilters() {
    setFStatus(''); setFPriority(''); setFCategory(''); setFArea(''); setFAgent(''); setFTechnician('')
    setFSlaStatus(''); setFDateFrom(''); setFDateTo(''); setFOutage(''); setFReopened('')
    setFUnassigned(false); setFOpenOnly(false)
  }

  const searchTrimmed = search.trim().toLowerCase()
  const filtered = useMemo(() => tickets.filter(t => {
    if (searchTrimmed &&
      !t.id.toLowerCase().includes(searchTrimmed) &&
      !t.customerName.toLowerCase().includes(searchTrimmed) &&
      !t.phone.includes(search.trim()) &&
      !t.accountNumber.toLowerCase().includes(searchTrimmed)
    ) return false
    if (fStatus && t.status !== fStatus) return false
    if (fPriority && t.priority !== fPriority) return false
    if (fCategory && t.category !== fCategory) return false
    if (fArea && t.area !== fArea) return false
    if (fAgent && t.assignedAgent !== fAgent) return false
    if (fTechnician && t.assignedTechnician !== fTechnician) return false
    if (fSlaStatus && slaStatusOf(t) !== fSlaStatus) return false
    if (fDateFrom && t.createdAt.slice(0, 10) < fDateFrom) return false
    if (fDateTo && t.createdAt.slice(0, 10) > fDateTo) return false
    if (fOutage && (t.outageLinked ? 'Yes' : 'No') !== fOutage) return false
    if (fReopened && (t.reopened ? 'Yes' : 'No') !== fReopened) return false
    if (fUnassigned && t.assignedAgent) return false
    if (fOpenOnly && ['Resolved', 'Closed', 'Cancelled'].includes(t.status)) return false
    return true
  }), [tickets, searchTrimmed, search, fStatus, fPriority, fCategory, fArea, fAgent, fTechnician, fSlaStatus, fDateFrom, fDateTo, fOutage, fReopened, fUnassigned, fOpenOnly])

  const filterCount = [fStatus, fPriority, fCategory, fArea, fAgent, fTechnician, fSlaStatus, fDateFrom || fDateTo, fOutage, fReopened, fUnassigned, fOpenOnly].filter(Boolean).length
  const hasActiveFilters = filterCount > 0

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const stats = useMemo(() => ({
    total: tickets.length,
    new: tickets.filter(t => t.status === 'New').length,
    unassigned: tickets.filter(t => !t.assignedAgent).length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    slaBreached: tickets.filter(t => slaStatusOf(t) === 'Breached').length,
  }), [tickets])

  const pagedIds = paged.map(t => t.id)
  const allPagedSelected = pagedIds.length > 0 && pagedIds.every(id => selected.has(id))

  function toggleAll() {
    setSelected(s => {
      const next = new Set(s)
      if (allPagedSelected) pagedIds.forEach(id => next.delete(id))
      else pagedIds.forEach(id => next.add(id))
      return next
    })
  }

  function toggleOne(id) {
    setSelected(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleExport() {
    const cols = ['Ticket Number', 'Customer Name', 'Phone', 'Category', 'Priority', 'Status', 'Assigned Agent', 'Assigned Technician', 'Area', 'Created Date', 'Last Update', 'SLA Deadline']
    const rows = filtered.map(t => [
      t.id, t.customerName, t.phone, t.category, t.priority, t.status,
      t.assignedAgent ?? '', t.assignedTechnician ?? '', t.area,
      formatDate(t.createdAt), formatDate(t.updatedAt), formatDate(t.slaDeadline),
    ])
    const csv = [cols, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tickets-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function openAssignTeamFor(ticket) { setActionTicket(ticket); setAssignTeamOpen(true) }
  function openAssignTechFor(ticket) { setActionTicket(ticket); setAssignTechValue(''); setAssignTechOpen(true) }
  function openChangePriorityFor(ticket) { setActionTicket(ticket); setChangePriorityValue(''); setChangePriorityOpen(true) }
  function openSendMessageFor(ticket) { setActionTicket(ticket); setMessageOpen(true) }

  function applyAssignTeam(agents, teams) {
    if (actionTicket) assignTeamMembers([actionTicket.id], { agents, teams }, CURRENT_USER)
    setAssignTeamOpen(false); setActionTicket(null)
  }
  function applyAssignTech() {
    if (actionTicket) assignTechnician([actionTicket.id], assignTechValue)
    setAssignTechOpen(false); setAssignTechValue(''); setActionTicket(null)
  }
  function applyChangePriority() {
    if (actionTicket) changePriority([actionTicket.id], changePriorityValue)
    setChangePriorityOpen(false); setChangePriorityValue(''); setActionTicket(null)
  }
  function applySendMessage(text) {
    if (actionTicket) addCommunication(actionTicket.id, { channel: 'SMS', text }, CURRENT_USER)
    setMessageOpen(false); setActionTicket(null)
  }

  const selectedCount = selected.size

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ticket List</h1>
          <p className="text-sm text-gray-500 mt-0.5">All customer complaints and support tickets in one place</p>
        </div>
        <Button icon={<Plus size={14} />} onClick={() => navigate('/support/tickets/new')}>Create Ticket</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Tickets', value: stats.total, icon: LayoutList, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
          { label: 'New', value: stats.new, icon: Sparkles, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Unassigned', value: stats.unassigned, icon: UserX, color: 'text-gray-600', bg: 'bg-gray-100' },
          { label: 'In Progress', value: stats.inProgress, icon: Loader2, color: 'text-brand-orange', bg: 'bg-brand-orange/10' },
          { label: 'SLA Breached', value: stats.slaBreached, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
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

      {/* Search + Filter + Bulk actions */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search ticket #, customer, phone, account #…"
              className="pl-9 pr-8 py-2 text-sm border border-surface-border rounded-lg bg-white w-full focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
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
                ? 'border-brand-blue bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20'
                : 'border-surface-border bg-white text-gray-500 hover:border-brand-blue/40 hover:text-brand-blue hover:bg-brand-blue/5'
            }`}
            title="Open filters"
          >
            <Filter size={15} />
            {filterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-brand-blue text-white text-[10px] font-bold rounded-full px-1 leading-none">
                {filterCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-1.5 ml-auto">
            <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={handleExport}>
              Export
            </Button>
            <ColumnManager columns={tableColumns} onChange={setTableColumns} />
          </div>
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-brand-blue font-medium">
            <span className="bg-brand-blue/10 px-2 py-0.5 rounded-full">{selectedCount} selected</span>
            <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-gray-600">Clear selection</button>
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={11} className="text-brand-blue/60 shrink-0" />
            {[
              ['Status', fStatus, setFStatus],
              ['Priority', fPriority, setFPriority],
              ['Category', fCategory, setFCategory],
              ['Area', fArea, setFArea],
              ['Agent', fAgent, setFAgent],
              ['Technician', fTechnician, setFTechnician],
              ['SLA', fSlaStatus, setFSlaStatus],
              ['Outage', fOutage, setFOutage],
              ['Reopened', fReopened, setFReopened],
            ].filter(([, v]) => v).map(([label, v, setter]) => (
              <span key={label} className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-blue/10 text-brand-blue rounded-full text-xs font-medium">
                {label}: {v}
                <button onClick={() => setter('')} className="ml-0.5 hover:text-brand-blue-dark"><X size={10} /></button>
              </span>
            ))}
            {fUnassigned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-blue/10 text-brand-blue rounded-full text-xs font-medium">
                Unassigned only
                <button onClick={() => setFUnassigned(false)} className="ml-0.5 hover:text-brand-blue-dark"><X size={10} /></button>
              </span>
            )}
            {fOpenOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-blue/10 text-brand-blue rounded-full text-xs font-medium">
                Open tickets only
                <button onClick={() => setFOpenOnly(false)} className="ml-0.5 hover:text-brand-blue-dark"><X size={10} /></button>
              </span>
            )}
            {(fDateFrom || fDateTo) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-blue/10 text-brand-blue rounded-full text-xs font-medium">
                Date: {fDateFrom || '…'} → {fDateTo || '…'}
                <button onClick={() => { setFDateFrom(''); setFDateTo('') }} className="ml-0.5 hover:text-brand-blue-dark"><X size={10} /></button>
              </span>
            )}
            <button onClick={() => { clearAllFilters(); setSearch('') }}
              className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors ml-0.5">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                <th className="px-4 py-3 w-9">
                  <input type="checkbox" checked={allPagedSelected} onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30 cursor-pointer" />
                </th>
                {visibleCols.has('ticketNo') && <th className="text-left px-4 py-3 whitespace-nowrap">Ticket Number</th>}
                <th className="text-left px-4 py-3 whitespace-nowrap w-72">Description</th>
                {visibleCols.has('customerName') && <th className="text-left px-4 py-3 whitespace-nowrap">Customer Name</th>}
                <th className="text-left px-4 py-3 whitespace-nowrap">Phone Number</th>
                {visibleCols.has('category') && <th className="text-left px-4 py-3 whitespace-nowrap">Category</th>}
                {visibleCols.has('branch') && <th className="text-left px-4 py-3 whitespace-nowrap">Branch</th>}
                <th className="text-left px-4 py-3 whitespace-nowrap">Customer Type</th>
                {visibleCols.has('priority') && <th className="text-left px-4 py-3 whitespace-nowrap">Priority</th>}
                {visibleCols.has('status') && <th className="text-left px-4 py-3 whitespace-nowrap">Status</th>}
                {visibleCols.has('assignedAgent') && <th className="text-left px-4 py-3 whitespace-nowrap">Assigned Agent</th>}
                <th className="text-left px-4 py-3 whitespace-nowrap">Area</th>
                {visibleCols.has('created') && <th className="text-left px-4 py-3 whitespace-nowrap">Created Date</th>}
                <th className="text-left px-4 py-3 whitespace-nowrap">Last Update</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">SLA Deadline</th>
                {visibleCols.has('actions') && <th className="text-left px-4 py-3 whitespace-nowrap">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7 + visibleCols.size} className="text-center py-12 text-gray-400 text-sm">No tickets match your filters.</td>
                </tr>
              ) : paged.map(t => {
                const sla = slaStatusOf(t)
                return (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/support/tickets/${t.id}/documents`)}>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleOne(t.id)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30 cursor-pointer" />
                    </td>
                    {visibleCols.has('ticketNo') && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-brand-blue">{t.id}</span>
                        {t.reopened && <p className="text-[10px] text-red-500 font-semibold mt-0.5">Reopened</p>}
                      </td>
                    )}
                    <td className="px-4 py-3 w-72 max-w-72">
                      <span className="block text-xs text-gray-600 truncate" title={t.description}>{t.description}</span>
                    </td>
                    {visibleCols.has('customerName') && (
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">{t.customerName}</td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setCallModal({ open: true, name: t.customerName, phone: t.phone })}
                        className="flex items-center gap-1.5 font-mono text-xs text-gray-600 hover:text-emerald-600 transition-colors group"
                      >
                        <Phone size={11} className="text-gray-400 group-hover:text-emerald-500 shrink-0" />
                        {t.phone}
                      </button>
                    </td>
                    {visibleCols.has('category') && (
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-700 font-medium">{t.category}</p>
                        <p className="text-[11px] text-gray-400">{t.subcategory}</p>
                      </td>
                    )}
                    {visibleCols.has('branch') && (
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{t.branch ?? '—'}</td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={t.customerType === 'Enterprise' ? 'purple' : 'blue'} size="sm">{t.customerType ?? '—'}</Badge>
                    </td>
                    {visibleCols.has('priority') && (
                      <td className="px-4 py-3">
                        <Badge variant={PRIORITY_BADGE[t.priority]} size="sm" dot>{t.priority}</Badge>
                      </td>
                    )}
                    {visibleCols.has('status') && (
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE[t.status] ?? 'gray'} size="sm">{t.status}</Badge>
                      </td>
                    )}
                    {visibleCols.has('assignedAgent') && (
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{t.assignedAgent ?? '—'}</td>
                    )}
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{t.area}</td>
                    {visibleCols.has('created') && (
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                    )}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(t.updatedAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs text-gray-500">{formatDate(t.slaDeadline)}</p>
                      <Badge variant={SLA_BADGE[sla]} size="sm" className="mt-0.5">{sla}</Badge>
                    </td>
                    {visibleCols.has('actions') && (
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <RowActionsMenu
                          ticket={t}
                          onAssignTeam={openAssignTeamFor}
                          onAssignTechnician={openAssignTechFor}
                          onChangePriority={openChangePriorityFor}
                          onSendMessage={openSendMessageFor}
                        />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

      {/* Filter Drawer */}
      <div className={`fixed top-14 left-0 right-0 bottom-0 z-50 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>

          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-brand-blue" />
              <h2 className="text-sm font-bold text-gray-900">Filters</h2>
              {filterCount > 0 && (
                <span className="px-1.5 py-0.5 bg-brand-blue/10 text-brand-blue text-[10px] font-bold rounded-full">
                  {filterCount} active
                </span>
              )}
            </div>
            <button onClick={() => setDrawerOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {[
              ['Status', fStatus, setFStatus, TICKET_STATUSES],
              ['Priority', fPriority, setFPriority, PRIORITIES],
              ['Category', fCategory, setFCategory, CATEGORIES],
              ['Area', fArea, setFArea, AREAS],
              ['Agent', fAgent, setFAgent, AGENTS],
              ['Technician', fTechnician, setFTechnician, TECHNICIANS],
              ['SLA Status', fSlaStatus, setFSlaStatus, ['On Track', 'Due Soon', 'Breached', 'Met']],
              ['Outage Linked', fOutage, setFOutage, ['Yes', 'No']],
              ['Reopened Ticket', fReopened, setFReopened, ['Yes', 'No']],
            ].map(([label, value, setter, options]) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</label>
                <div className="relative">
                  <select value={value} onChange={e => setter(e.target.value)}
                    className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700 cursor-pointer">
                    <option value="">All</option>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Created Date</label>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-400 mb-1">From</p>
                  <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">To</p>
                  <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700" />
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 px-5 py-4 border-t border-surface-border bg-gray-50 flex items-center gap-3">
            <button onClick={clearAllFilters}
              className="flex-1 py-2.5 text-sm font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl transition-colors bg-white">
              Clear All Filters
            </button>
            <button onClick={() => { setPage(1); setDrawerOpen(false) }}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark rounded-xl transition-colors shadow-sm">
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Row action modals */}
      <AssignTeamModal
        open={assignTeamOpen} onClose={() => setAssignTeamOpen(false)} ticket={actionTicket}
        onApply={applyAssignTeam}
      />
      <BulkActionModal
        open={assignTechOpen} onClose={() => setAssignTechOpen(false)} title="Assign Technician"
        options={TECHNICIANS} value={assignTechValue} onChange={setAssignTechValue}
        onApply={applyAssignTech} ticket={actionTicket}
      />
      <BulkActionModal
        open={changePriorityOpen} onClose={() => setChangePriorityOpen(false)} title="Change Priority"
        options={PRIORITIES} optionLabel={p => PRIORITY_LABEL[p]} value={changePriorityValue} onChange={setChangePriorityValue}
        onApply={applyChangePriority} ticket={actionTicket}
      />
      <CustomerMessageModal
        open={messageOpen} onClose={() => setMessageOpen(false)} ticket={actionTicket}
        onSend={applySendMessage}
      />
      <CallModal
        isOpen={callModal.open}
        onClose={() => setCallModal({ open: false, name: '', phone: '' })}
        customerName={callModal.name}
        phoneNumber={callModal.phone}
        onCallInitiated={() => setCallModal({ open: false, name: '', phone: '' })}
      />
    </div>
  )
}

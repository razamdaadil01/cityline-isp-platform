import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import {
  ArrowLeft, MessageSquare, Lock, RotateCcw, CheckCircle2, FileText, CalendarPlus,
  Phone, Mail, User, Activity, Wrench, PhoneCall,
  Globe, Play, ChevronDown, RefreshCw, UserCog, Trash2,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import {
  getTicket, subscribeTickets, updateTicketStatus, addInternalNote,
  resolveTicket, closeTicket, reopenTicket, scheduleTechnicianVisit, technicianWorkload,
  findTicketsOnSamePort, assignAgent, assignTechnician,
  TICKET_STATUSES, GATED_STATUSES, PRIORITY_LABEL, RESOLUTION_TYPES, TECH_VISIT_STATUSES,
  TECHNICIAN_PROFILES, TECHNICIAN_SKILLS, AGENTS, TECHNICIANS, slaStatusOf,
} from '../data/ticketsStore'

const CURRENT_USER = 'Admin User'

const STATUS_BADGE = {
  'New': 'blue', 'Assigned': 'cyan', 'In Progress': 'orange',
  'Waiting for Customer': 'purple', 'Waiting for Technician': 'yellow', 'Waiting for NOC': 'navy',
  'Waiting for Billing': 'purple', 'Resolved': 'green', 'Closed': 'gray',
  'Reopened': 'red', 'Cancelled': 'gray', 'Duplicate': 'gray',
}
const STATUS_DOT_COLOR = {
  blue: 'bg-blue-400', cyan: 'bg-cyan-400', orange: 'bg-orange-400', purple: 'bg-purple-400',
  yellow: 'bg-amber-400', navy: 'bg-navy', green: 'bg-emerald-400', gray: 'bg-gray-300', red: 'bg-red-400',
}
const PRIORITY_BADGE = { P1: 'red', P2: 'orange', P3: 'yellow', P4: 'gray' }
const SLA_BADGE = { 'On Track': 'green', 'Due Soon': 'yellow', 'Breached': 'red', 'Met': 'gray' }
const SLA_LABEL = { 'On Track': 'ON Track', 'Due Soon': 'Due Soon', 'Breached': 'Breached', 'Met': 'Met' }
const VISIT_STATUS_BADGE = {
  'Visit Scheduled': 'blue', 'Technician Travelling': 'cyan', 'Technician Reached': 'orange',
  'Work Started': 'orange', 'Work Completed': 'green', 'Follow-up Required': 'yellow',
}
// Call is the only channel the mock feed seeds today; Portal stays mapped since
// live actions (resolving a ticket, scheduling a technician visit) still add
// Portal-channel entries automatically.
const CHANNEL_BADGE = { Call: 'purple', Portal: 'gray', SMS: 'blue' }
const CHANNEL_ICON = { Call: PhoneCall, Portal: Globe, SMS: MessageSquare }

const H = 3600000 // 1 hour in ms

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="140">'
  + '<rect width="100%" height="100%" fill="#f1f5f9"/>'
  + '<text x="50%" y="50%" font-size="12" fill="#94a3b8" text-anchor="middle" dominant-baseline="middle">Preview</text>'
  + '</svg>'
)

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initialsOf(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function daysOpenOf(ticket) {
  const end = ['Resolved', 'Closed'].includes(ticket.status) && ticket.resolution?.resolvedAt
    ? new Date(ticket.resolution.resolvedAt).getTime()
    : Date.now()
  return Math.max(0, Math.floor((end - new Date(ticket.createdAt).getTime()) / 86400000))
}

function slaRemainingLabel(ticket) {
  const diff = new Date(ticket.slaDeadline).getTime() - Date.now()
  const abs = Math.abs(diff)
  const hh = String(Math.floor(abs / H)).padStart(2, '0')
  const mm = String(Math.floor((abs % H) / 60000)).padStart(2, '0')
  return `${hh}h ${mm}m ${diff >= 0 ? 'Left' : 'Over'}`
}

// Deterministic mock size label for attachments seeded as plain filenames (no real file bytes on hand).
function mockFileSize(name) {
  const sum = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  const kb = 40 + (sum % 900)
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`
}

// ── Left-sidebar / right-sidebar row style — matches SalesLeadDetail.jsx's InfoRow ──

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 shrink-0 w-24">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right">
        {value === undefined || value === null || value === '' ? <span className="text-gray-300">—</span> : value}
      </span>
    </div>
  )
}

function ContactRow({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-600">
      <Icon size={13} className="text-gray-400 shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  )
}

// ── Resolve Ticket Modal ──────────────────────────────────────────────────────

function ResolveModal({ isOpen, onClose, onSubmit }) {
  const [rootCause, setRootCause] = useState('')
  const [resolutionDetails, setResolutionDetails] = useState('')
  const [resolutionType, setResolutionType] = useState('')
  const [customerUpdate, setCustomerUpdate] = useState('')

  const valid = rootCause.trim() && resolutionDetails.trim() && resolutionType

  function handleSubmit() {
    if (!valid) return
    onSubmit({ rootCause: rootCause.trim(), resolutionDetails: resolutionDetails.trim(), resolutionType, customerUpdate: customerUpdate.trim() })
    setRootCause(''); setResolutionDetails(''); setResolutionType(''); setCustomerUpdate('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resolve Ticket" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!valid}>Mark as Resolved</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Root Cause" required>
          <Textarea value={rootCause} onChange={e => setRootCause(e.target.value)} rows={2} placeholder="What caused this issue?" />
        </FormField>
        <FormField label="Resolution Details" required>
          <Textarea value={resolutionDetails} onChange={e => setResolutionDetails(e.target.value)} rows={2} placeholder="What was done to fix it?" />
        </FormField>
        <FormField label="Resolution Type" required>
          <Select value={resolutionType} onChange={e => setResolutionType(e.target.value)}>
            <option value="">Select type…</option>
            {RESOLUTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormField>
        <FormField label="Customer Update" hint="Becomes a customer-visible note in Communication History">
          <Textarea value={customerUpdate} onChange={e => setCustomerUpdate(e.target.value)} rows={2} placeholder="What should the customer be told?" />
        </FormField>
      </div>
    </Modal>
  )
}

// ── Reopen Ticket Modal ────────────────────────────────────────────────────────

function ReopenModal({ isOpen, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const valid = reason.trim()

  function handleSubmit() {
    if (!valid) return
    onSubmit(reason.trim())
    setReason('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reopen Ticket" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleSubmit} disabled={!valid}>Reopen Ticket</Button>
        </>
      }
    >
      <FormField label="Reason for reopening" required>
        <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Why is this ticket being reopened?" />
      </FormField>
    </Modal>
  )
}

// ── Schedule Technician Visit Modal ────────────────────────────────────────────

function ScheduleTechnicianModal({ isOpen, onClose, onSubmit, ticket }) {
  const [requiredSkill, setRequiredSkill] = useState('')
  const [technician, setTechnician] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [visitTime, setVisitTime] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [error, setError] = useState('')

  const candidates = requiredSkill
    ? TECHNICIAN_PROFILES.filter(p => p.skills.includes(requiredSkill))
    : TECHNICIAN_PROFILES

  function reset() {
    setRequiredSkill(''); setTechnician(''); setVisitDate(''); setVisitTime(''); setSpecialInstructions(''); setError('')
  }

  function handleClose() { reset(); onClose() }

  function handleSubmit() {
    if (!requiredSkill || !technician || !visitDate || !visitTime) {
      setError('Please fill in all required fields.')
      return
    }
    const profile = TECHNICIAN_PROFILES.find(p => p.name === technician)
    if (!profile || !profile.active) {
      setError('Selected technician is not active.')
      return
    }
    const visitDateTime = new Date(`${visitDate}T${visitTime}`)
    if (Number.isNaN(visitDateTime.getTime()) || visitDateTime.getTime() < Date.now()) {
      setError('Visit date/time cannot be in the past.')
      return
    }
    onSubmit({ technician, visitDate, visitTime, requiredSkill, specialInstructions: specialInstructions.trim() })
    reset()
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Schedule Technician Visit" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Schedule Visit</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">{error}</div>}

        <FormField label="Required Technician Skill" required>
          <Select value={requiredSkill} onChange={e => { setRequiredSkill(e.target.value); setTechnician('') }}>
            <option value="">Select skill…</option>
            {TECHNICIAN_SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>

        <FormField label="Technician" required
          hint={requiredSkill ? `Showing technicians with ${requiredSkill}, with their current active job count` : 'Select a skill to narrow this list'}>
          <Select value={technician} onChange={e => setTechnician(e.target.value)}>
            <option value="">Select technician…</option>
            {candidates.map(p => (
              <option key={p.name} value={p.name}>
                {p.name} ({technicianWorkload(p.name)} active job{technicianWorkload(p.name) !== 1 ? 's' : ''})
              </option>
            ))}
          </Select>
          {requiredSkill && candidates.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">No technicians have this skill on file.</p>
          )}
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Visit Date" required>
            <Input type="date" min={todayStr} value={visitDate} onChange={e => setVisitDate(e.target.value)} />
          </FormField>
          <FormField label="Visit Time" required>
            <Input type="time" value={visitTime} onChange={e => setVisitTime(e.target.value)} />
          </FormField>
        </div>

        <FormField label="Customer Address"><Input value={ticket.customerAddress ?? ticket.area ?? '—'} disabled /></FormField>
        <FormField label="Customer Phone Number"><Input value={ticket.phone} disabled /></FormField>
        <FormField label="Complaint Summary"><Textarea value={ticket.description} disabled rows={2} /></FormField>

        <FormField label="Special Instructions" hint="Optional">
          <Textarea value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} rows={2} placeholder="Access notes, gate code, parking, etc." />
        </FormField>
      </div>
    </Modal>
  )
}

// ── Assign Modal (Assignment Overview → Assign) ────────────────────────────────

function AssignModal({ isOpen, onClose, ticket }) {
  const [agent, setAgent] = useState('')
  const [technician, setTechnician] = useState('')

  useEffect(() => {
    if (isOpen) { setAgent(ticket.assignedAgent ?? ''); setTechnician(ticket.assignedTechnician ?? '') }
  }, [isOpen, ticket.assignedAgent, ticket.assignedTechnician])

  function handleApply() {
    if (agent !== (ticket.assignedAgent ?? '')) assignAgent([ticket.id], agent)
    if (technician !== (ticket.assignedTechnician ?? '')) assignTechnician([ticket.id], technician)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Ticket" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Assigning <span className="font-mono font-semibold text-gray-800">{ticket.id}</span>.
        </p>
        <FormField label="Individual Agent">
          <Select value={agent} onChange={e => setAgent(e.target.value)}>
            <option value="">Unassigned</option>
            {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
          </Select>
        </FormField>
        <FormField label="Technician">
          <Select value={technician} onChange={e => setTechnician(e.target.value)}>
            <option value="">Unassigned</option>
            {TECHNICIANS.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormField>
      </div>
    </Modal>
  )
}

// ── Header "Actions" dropdown (Close / Reopen) ──────────────────────────────────

function HeaderActionsMenu({ canClose, canReopen, onClose, onReopen }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" onClick={() => setOpen(o => !o)} iconRight={<ChevronDown size={14} />}>
        Actions
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 bg-white border border-surface-border rounded-xl shadow-lg py-1 text-sm">
          <button
            onClick={() => { setOpen(false); onClose() }}
            disabled={!canClose}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Lock size={13} className="text-gray-400 shrink-0" /> Close Ticket
          </button>
          {canReopen && (
            <button
              onClick={() => { setOpen(false); onReopen() }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              <RotateCcw size={13} className="shrink-0" /> Reopen Ticket
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Network / Connection Status card (TR-069) ───────────────────────────────────

function NetworkStatusCard({ ticket }) {
  const [refreshing, setRefreshing] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState(null)

  const isOnline = ticket.networkStatus === 'Online'
  const opticalOutOfRange = ticket.opticalPower != null && (ticket.opticalPower < -27 || ticket.opticalPower > -8)
  const lastOutageLabel = ticket.outageLinked ? 'Live Outage' : (ticket.lastOutageAt ? formatDate(ticket.lastOutageAt) : 'None on file')

  function handleRefresh() {
    setRefreshing(true)
    setTimeout(() => { setRefreshing(false); setRefreshedAt(new Date()) }, 700)
  }

  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className={`text-sm font-bold ${isOnline ? 'text-emerald-600' : 'text-red-600'}`}>{isOnline ? 'Online' : 'Offline'}</span>
          <span className="text-[11px] text-gray-400">· via TR-069</span>
        </div>
        <Button size="sm" variant="secondary" icon={<RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />} onClick={handleRefresh} disabled={refreshing}>
          Refresh Status
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-surface-border">
        <div>
          <p className={`text-sm font-bold ${opticalOutOfRange ? 'text-red-600' : 'text-gray-800'}`}>
            {ticket.opticalPower != null ? `${ticket.opticalPower} dBm` : '—'}
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-1">Optical Power</p>
          <p className="text-[10px] text-gray-400">normal: -8 to -27</p>
        </div>
        <div>
          <p className={`text-sm font-bold ${ticket.outageLinked ? 'text-red-600' : 'text-gray-800'}`}>{lastOutageLabel}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-1">Last Outage</p>
          <p className="text-[10px] text-gray-400">this node</p>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">{ticket.planExpireDate ? formatDate(ticket.planExpireDate) : 'N/A'}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-1">Plan Expire Date</p>
          <p className="text-[10px] text-gray-400">subscribed</p>
        </div>
      </div>

      {refreshedAt && (
        <p className="text-[10px] text-gray-300 mt-3">Last refreshed {refreshedAt.toLocaleTimeString('en-IN')}</p>
      )}
    </div>
  )
}

// ── Assignment Overview card ─────────────────────────────────────────────────────

function AssignmentOverviewCard({ ticket, onAssign }) {
  const agents = ticket.assignedAgents?.length ? ticket.assignedAgents : (ticket.assignedAgent ? [ticket.assignedAgent] : [])
  const teams = ticket.assignedTeams?.length ? ticket.assignedTeams : (ticket.officeTeam ? [ticket.officeTeam] : [])
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-800">Assignment Overview</p>
        <Button size="sm" variant="secondary" icon={<UserCog size={13} />} onClick={onAssign}>Assign</Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Individual Agent{agents.length > 1 ? 's' : ''}</p>
          {agents.length ? (
            <div className="flex flex-wrap gap-1">
              {agents.map(a => <Badge key={a} variant="navy" size="sm">{a}</Badge>)}
            </div>
          ) : <span className="text-xs text-gray-300">—</span>}
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Office Team{teams.length > 1 ? 's' : ''}</p>
          {teams.length ? (
            <div className="flex flex-wrap gap-1">
              {teams.map(tm => <Badge key={tm} variant="cyan" size="sm">{tm}</Badge>)}
            </div>
          ) : <span className="text-xs text-gray-300">—</span>}
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Branch</p>
          {ticket.branch ? <Badge variant="purple" size="sm">{ticket.branch}</Badge> : <span className="text-xs text-gray-300">—</span>}
        </div>
      </div>
    </div>
  )
}

// ── Middle-column tabs ──────────────────────────────────────────────────────

const MIDDLE_TABS = [
  { key: 'overview', slug: 'overview', label: 'Overview', icon: User },
  { key: 'communication', slug: 'communication', label: 'Communication', icon: MessageSquare },
  { key: 'internal', slug: 'internal-notes', label: 'Notes', icon: Lock },
  { key: 'activity', slug: 'activity-log', label: 'Activity Log', icon: Activity },
]

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SupportTicketDetail() {
  const { id, tab: tabSlug } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(() => getTicket(id))

  useEffect(() => setTicket(getTicket(id)), [id])
  useEffect(() => subscribeTickets(() => setTicket(getTicket(id))), [id])

  const [leftTab, setLeftTab] = useState('customer')
  const [resolveOpen, setResolveOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [internalText, setInternalText] = useState('')

  if (!tabSlug) {
    return <Navigate to={`/support/tickets/${id}/overview`} replace />
  }

  const activeTab = MIDDLE_TABS.find(t => t.slug === tabSlug)?.key ?? 'overview'

  if (!ticket) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/support/tickets')} className="text-sm text-brand-blue hover:underline flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Ticket List
        </button>
        <p className="text-sm text-gray-400 mt-4">Ticket {id} was not found.</p>
      </div>
    )
  }

  const sla = slaStatusOf(ticket)
  const isGatedStatus = ['Resolved', 'Closed'].includes(ticket.status)
  const selectableStatuses = TICKET_STATUSES.filter(s => !GATED_STATUSES.includes(s))
  const statusOptions = selectableStatuses.includes(ticket.status) ? selectableStatuses : [ticket.status, ...selectableStatuses]

  const canResolve = !isGatedStatus
  const canClose = ticket.status === 'Resolved'
  const canReopen = isGatedStatus
  const scheduleBlocked = ['Closed', 'Cancelled'].includes(ticket.status)

  const relatedOnPort = findTicketsOnSamePort(ticket.nasPortId, ticket.id)

  function handleAddInternalNote() {
    if (!internalText.trim()) return
    addInternalNote(ticket.id, internalText.trim(), CURRENT_USER)
    setInternalText('')
  }

  return (
    <div className="p-6 space-y-5">

      {/* Top header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900 min-w-0 truncate">
          <span className="text-gray-400 font-mono">#</span> <span className="font-mono">{ticket.id}</span>
          <span className="text-gray-400"> : </span>{ticket.subject}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <HeaderActionsMenu
            canClose={canClose}
            canReopen={canReopen}
            onClose={() => closeTicket(ticket.id, CURRENT_USER)}
            onReopen={() => setReopenOpen(true)}
          />
          <Button icon={<CheckCircle2 size={15} />} disabled={!canResolve} onClick={() => setResolveOpen(true)}>
            Resolve
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-surface-border shadow-card p-5 space-y-4">

            {/* Avatar + name */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-blue to-navy flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-md">
                {ticket.customerName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{ticket.customerName}</p>
              </div>
            </div>

            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="navy" size="sm">{ticket.category}</Badge>
              <Badge variant={STATUS_BADGE[ticket.status] ?? 'gray'} size="sm">{ticket.status}</Badge>
            </div>

            {/* Contact block */}
            <div className="border-t border-surface-border pt-3 space-y-2">
              <ContactRow icon={User}>{ticket.customerName}</ContactRow>
              <ContactRow icon={Phone}>{ticket.phone}</ContactRow>
              {ticket.email && <ContactRow icon={Mail}>{ticket.email}</ContactRow>}
            </div>

            {/* Assigned agent */}
            <div className="border-t border-surface-border pt-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1.5">Assigned Agent</p>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold bg-brand-blue shrink-0">
                  {initialsOf(ticket.assignedAgent)}
                </div>
                <span className="text-xs font-medium text-gray-700">
                  {ticket.assignedAgent ?? <span className="text-gray-300 font-normal">Unassigned</span>}
                </span>
              </div>
            </div>

            {/* Mini tab switcher: Customer Info / Address Info */}
            <div className="border-t border-surface-border pt-3">
              <div className="flex gap-1 mb-2">
                {[{ key: 'customer', label: 'Customer Info' }, { key: 'address', label: 'Address Info' }].map(t => (
                  <button key={t.key} onClick={() => setLeftTab(t.key)}
                    className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${
                      leftTab === t.key ? 'bg-brand-blue text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {leftTab === 'customer' ? (
                <div>
                  <InfoRow label="Account #" value={<span className="font-mono">{ticket.accountNumber}</span>} />
                  <InfoRow label="Plan" value={ticket.plan} />
                  <InfoRow label="Customer Type" value={ticket.customerType} />
                  <InfoRow label="Billing" value={<Badge variant={ticket.billingStatus === 'Overdue' ? 'yellow' : 'green'} size="sm">{ticket.billingStatus ?? '—'}</Badge>} />
                  <InfoRow label="Connection" value={<Badge variant={ticket.connectionStatus === 'Connected' ? 'green' : 'red'} size="sm">{ticket.connectionStatus ?? '—'}</Badge>} />
                </div>
              ) : (
                <div>
                  <InfoRow label="Address" value={ticket.customerAddress ?? ticket.area} />
                  <InfoRow label="Area / Zone" value={ticket.area} />
                  <InfoRow label="Phone" value={ticket.phone} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── MIDDLE COLUMN ────────────────────────────────────────────────── */}
        <div className="lg:col-span-6 space-y-4">

          <NetworkStatusCard ticket={ticket} />

          <AssignmentOverviewCard ticket={ticket} onAssign={() => setAssignOpen(true)} />

          <div className="bg-white rounded-xl border border-surface-border shadow-card">

            {/* Tab nav */}
            <div className="flex overflow-x-auto border-b border-surface-border scrollbar-none rounded-t-xl">
              {MIDDLE_TABS.map(tab => {
                const Icon = tab.icon
                return (
                  <button key={tab.key} onClick={() => navigate(`/support/tickets/${id}/${tab.slug}`)}
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-3.5 text-xs font-medium transition-all border-b-2 -mb-px whitespace-nowrap
                      ${activeTab === tab.key
                        ? 'border-brand-blue text-brand-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                      }`}>
                    <Icon size={14} /> {tab.label}
                  </button>
                )
              })}
            </div>

            <div className="p-5">

              {/* ─── Overview (Complaint Information) ───────────────────── */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-gray-700">{ticket.description}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Attachments / Screenshots</p>
                    {(ticket.attachments ?? []).length === 0 ? (
                      <p className="text-sm text-gray-400">No attachments.</p>
                    ) : (
                      <div className="space-y-2">
                        {ticket.attachments.map((name, i) => (
                          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-surface-border bg-gray-50">
                            <FileText size={16} className="text-gray-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-gray-700 truncate">{name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-gray-400 shrink-0">{mockFileSize(name)}</span>
                                <div className="flex-1 h-1 max-w-[100px] bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: '100%' }} />
                                </div>
                                <span className="text-[10px] text-emerald-600 font-semibold shrink-0">100%</span>
                              </div>
                            </div>
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                            <button
                              type="button"
                              onClick={() => console.log('Remove attachment — coming soon')}
                              className="text-gray-400 hover:text-red-500 shrink-0 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Customer-visible Note</p>
                    <p className="text-sm text-gray-700">{ticket.customerNote?.trim() || <span className="text-gray-400">None on file.</span>}</p>
                  </div>
                </div>
              )}

              {/* ─── Communication ──────────────────────────────────────── */}
              {activeTab === 'communication' && (
                <div>
                  <p className="text-[11px] text-gray-400 mb-3">
                    Visible to customer · IVR call log and outbound messages
                  </p>
                  <div className="space-y-3 max-h-[32rem] overflow-y-auto">
                    {(ticket.communicationLog ?? []).length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No communication yet.</p>
                    ) : ticket.communicationLog.map((entry, i) => {
                      const Icon = CHANNEL_ICON[entry.channel] ?? Globe
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <Badge variant={CHANNEL_BADGE[entry.channel] ?? 'gray'} size="sm" className="shrink-0 mt-0.5">
                            <Icon size={11} /> {entry.channel}
                          </Badge>
                          <div className="min-w-0">
                            <p className="text-sm text-gray-700">{entry.text}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{entry.actor} · {formatDateTime(entry.time)}</p>
                            {entry.channel === 'Call' && (
                              <button
                                type="button"
                                onClick={() => console.log('Recording playback coming soon')}
                                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:text-purple-800 transition-colors"
                              >
                                <Play size={11} className="fill-current" /> Play Recording
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ─── Notes (Internal) ───────────────────────────────────── */}
              {activeTab === 'internal' && (
                <div>
                  <div className="flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 w-fit">
                    <Lock size={12} className="text-amber-600" />
                    <span className="text-[11px] text-amber-700 font-semibold">Internal — not visible to customer</span>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto mb-3">
                    {(ticket.internalNotesLog ?? []).length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No internal notes yet.</p>
                    ) : ticket.internalNotesLog.map((entry, i) => (
                      <div key={i}>
                        <p className="text-sm text-gray-700">{entry.text}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{entry.actor} · {formatDateTime(entry.time)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-surface-border flex items-start gap-2">
                    <Textarea value={internalText} onChange={e => setInternalText(e.target.value)} rows={1} placeholder="Add an internal note…" className="flex-1" />
                    <Button size="sm" variant="secondary" icon={<Lock size={13} />} onClick={handleAddInternalNote} disabled={!internalText.trim()}>Add Internal Note</Button>
                  </div>
                </div>
              )}

              {/* ─── Activity Log ───────────────────────────────────────── */}
              {activeTab === 'activity' && (
                (ticket.activityLog ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No activity recorded yet.</p>
                ) : (
                  <div className="space-y-0">
                    {[...ticket.activityLog].reverse().map((entry, i, arr) => (
                      <div key={i} className="flex gap-4 pb-5 relative">
                        {i < arr.length - 1 && (
                          <div className="absolute left-3.5 top-7 bottom-0 w-px bg-gray-200" />
                        )}
                        <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shrink-0 z-10">
                          <Activity size={12} className="text-gray-400" />
                        </div>
                        <div className="pt-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium">{entry.action}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            by <span className="font-medium text-gray-600">{entry.actor}</span> · {formatDateTime(entry.time)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Resolution SLA */}
          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card flex flex-col items-center">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider self-start mb-4">Resolution SLA</p>
            <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center ${
              sla === 'Breached' ? 'border-red-300' : sla === 'Due Soon' ? 'border-amber-300' : sla === 'Met' ? 'border-gray-200' : 'border-emerald-300'
            }`}>
              <p className={`text-xs font-bold text-center px-2 ${
                sla === 'Breached' ? 'text-red-600' : sla === 'Due Soon' ? 'text-amber-600' : sla === 'Met' ? 'text-gray-500' : 'text-emerald-600'
              }`}>
                {slaRemainingLabel(ticket)}
              </p>
            </div>
            <Badge variant={SLA_BADGE[sla]} size="md" className="mt-3">{SLA_LABEL[sla]}</Badge>
            <p className="text-[11px] text-gray-400 mt-2">{daysOpenOf(ticket)} day{daysOpenOf(ticket) !== 1 ? 's' : ''} open</p>
          </div>

          {/* Ticket Information */}
          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Ticket Information</p>
            <InfoRow label="Ticket No." value={<span className="font-mono text-brand-blue">{ticket.id}</span>} />
            <InfoRow label="Category" value={ticket.category} />
            <InfoRow label="Priority" value={<Badge variant={PRIORITY_BADGE[ticket.priority]} size="sm" dot>{PRIORITY_LABEL[ticket.priority]}</Badge>} />
            <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-50">
              <span className="text-xs text-gray-500 shrink-0 pt-1.5">Status</span>
              {isGatedStatus ? (
                <div className="text-right">
                  <Badge variant={STATUS_BADGE[ticket.status]} size="sm">{ticket.status}</Badge>
                  <p className="text-[10px] text-gray-400 mt-1">Use Actions ▸ Reopen to change this.</p>
                </div>
              ) : (
                <div className="w-32">
                  <Select value={ticket.status} onChange={e => updateTicketStatus(ticket.id, e.target.value, CURRENT_USER)}>
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
              )}
            </div>
            <InfoRow label="Created" value={formatDateTime(ticket.createdAt)} />
          </div>

          {/* NAS Port correlation */}
          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
              NAS Port ID: <span className="font-mono normal-case tracking-normal text-gray-600">{ticket.nasPortId ?? '—'}</span>
            </p>
            <p className="text-[11px] text-gray-400 mb-3">Other open tickets on this port</p>
            {relatedOnPort.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No other open tickets on this port.</p>
            ) : (
              <div className="space-y-2">
                {relatedOnPort.map(t => (
                  <button key={t.id} onClick={() => navigate(`/support/tickets/${t.id}/overview`)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-gray-50 border border-surface-border hover:bg-gray-100 transition-colors text-left">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT_COLOR[STATUS_BADGE[t.status]] ?? 'bg-gray-300'}`} />
                      <span className="font-mono text-xs text-brand-blue font-semibold shrink-0">{t.id}</span>
                    </div>
                    <span className="text-xs text-gray-500 truncate">{t.assignedAgent ?? 'Unassigned'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Technician Visit */}
          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                <Wrench size={14} className="text-orange-600" />
              </div>
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Technician Visit</p>
            </div>

            {!ticket.technicianVisit ? (
              <div className="text-center py-2">
                <p className="text-xs text-gray-400 mb-3">Not Scheduled</p>
                <span title={scheduleBlocked ? 'Cannot schedule a visit — ticket is Closed or Cancelled.' : undefined}>
                  <Button size="sm" className="w-full" icon={<CalendarPlus size={13} />} disabled={scheduleBlocked} onClick={() => setScheduleOpen(true)}>
                    Schedule Technician Visit
                  </Button>
                </span>
                <p className="text-[10px] text-gray-400 mt-2">A technician visit must be scheduled before this ticket can be resolved.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <InfoRow label="Technician" value={ticket.technicianVisit.technician} />
                <InfoRow label="Visit Slot" value={`${ticket.technicianVisit.visitDate} · ${ticket.technicianVisit.visitTime}`} />
                <InfoRow label="Status" value={<Badge variant={VISIT_STATUS_BADGE[ticket.technicianVisit.visitStatus] ?? 'gray'} size="sm">{ticket.technicianVisit.visitStatus}</Badge>} />
                {ticket.technicianVisit.requiredSkill && <InfoRow label="Skill" value={ticket.technicianVisit.requiredSkill} />}
                <InfoRow label="Materials" value={ticket.technicianVisit.materialsUsed?.length ? ticket.technicianVisit.materialsUsed.join(', ') : null} />
                {ticket.technicianVisit.specialInstructions && (
                  <InfoRow label="Instructions" value={ticket.technicianVisit.specialInstructions} />
                )}
                <InfoRow label="Notes" value={ticket.technicianVisit.notes || null} />
                <InfoRow label="Diagnosis" value={ticket.technicianVisit.diagnosis || null} />
                <InfoRow label="Completion" value={ticket.technicianVisit.completionDetails || null} />
                {ticket.technicianVisit.photos?.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-gray-500 mb-1.5">Photos</p>
                    <div className="flex flex-wrap gap-2">
                      {ticket.technicianVisit.photos.map((name, i) => (
                        <img key={i} src={PLACEHOLDER_IMAGE} alt={name} className="w-14 h-10 object-cover rounded-lg border border-surface-border" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ResolveModal isOpen={resolveOpen} onClose={() => setResolveOpen(false)}
        onSubmit={data => { resolveTicket(ticket.id, data, CURRENT_USER); setResolveOpen(false) }} />
      <ReopenModal isOpen={reopenOpen} onClose={() => setReopenOpen(false)}
        onSubmit={reason => { reopenTicket(ticket.id, reason, CURRENT_USER); setReopenOpen(false) }} />
      <ScheduleTechnicianModal isOpen={scheduleOpen} onClose={() => setScheduleOpen(false)} ticket={ticket}
        onSubmit={data => { scheduleTechnicianVisit(ticket.id, data, CURRENT_USER); setScheduleOpen(false) }} />
      <AssignModal isOpen={assignOpen} onClose={() => setAssignOpen(false)} ticket={ticket} />
    </div>
  )
}

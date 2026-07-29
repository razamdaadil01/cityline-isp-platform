import { useState, useEffect } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import {
  ArrowLeft, MessageSquare, Lock, RotateCcw, CheckCircle2, FileText, CalendarPlus,
  Phone, Mail, MapPin, User, Activity, Wrench, ShieldCheck, Clock, PhoneCall,
  Globe, Play,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import {
  getTicket, subscribeTickets, updateTicketStatus, addInternalNote,
  resolveTicket, closeTicket, reopenTicket, scheduleTechnicianVisit, technicianWorkload,
  TICKET_STATUSES, GATED_STATUSES, PRIORITY_LABEL, RESOLUTION_TYPES, TECH_VISIT_STATUSES,
  TECHNICIAN_PROFILES, TECHNICIAN_SKILLS, slaStatusOf,
} from '../data/ticketsStore'

const CURRENT_USER = 'Admin User'

const STATUS_BADGE = {
  'New': 'blue', 'Assigned': 'cyan', 'In Progress': 'orange',
  'Waiting for Customer': 'purple', 'Waiting for Technician': 'yellow', 'Waiting for NOC': 'navy',
  'Waiting for Billing': 'purple', 'Resolved': 'green', 'Closed': 'gray',
  'Reopened': 'red', 'Cancelled': 'gray', 'Duplicate': 'gray',
}
const PRIORITY_BADGE = { P1: 'red', P2: 'orange', P3: 'yellow', P4: 'gray' }
const SLA_BADGE = { 'On Track': 'green', 'Due Soon': 'yellow', 'Breached': 'red', 'Met': 'gray' }
const VISIT_STATUS_BADGE = {
  'Visit Scheduled': 'blue', 'Technician Travelling': 'cyan', 'Technician Reached': 'orange',
  'Work Started': 'orange', 'Work Completed': 'green', 'Follow-up Required': 'yellow',
}
// Call is the only channel the mock feed seeds today; Portal stays mapped since
// live actions (resolving a ticket, scheduling a technician visit) still add
// Portal-channel entries automatically.
const CHANNEL_BADGE = { Call: 'purple', Portal: 'gray' }
const CHANNEL_ICON = { Call: PhoneCall, Portal: Globe }

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="140">'
  + '<rect width="100%" height="100%" fill="#f1f5f9"/>'
  + '<text x="50%" y="50%" font-size="12" fill="#94a3b8" text-anchor="middle" dominant-baseline="middle">Preview</text>'
  + '</svg>'
)

function isImageName(name) { return /\.(jpg|jpeg|png|gif|webp)$/i.test(name ?? '') }

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  })
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

// ── Middle-column tabs ──────────────────────────────────────────────────────

const MIDDLE_TABS = [
  { key: 'overview', slug: 'overview', label: 'Overview', icon: User },
  { key: 'communication', slug: 'communication', label: 'Communication', icon: MessageSquare },
  { key: 'internal', slug: 'internal-notes', label: 'Internal Notes', icon: Lock },
  { key: 'activity', slug: 'activity-log', label: 'Activity Log', icon: Activity },
]

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SupportTicketDetail() {
  const { id, tab: tabSlug } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(() => getTicket(id))

  useEffect(() => setTicket(getTicket(id)), [id])
  useEffect(() => subscribeTickets(() => setTicket(getTicket(id))), [id])

  const [leftTab, setLeftTab] = useState('ticket')
  const [resolveOpen, setResolveOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
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

  function handleAddInternalNote() {
    if (!internalText.trim()) return
    addInternalNote(ticket.id, internalText.trim(), CURRENT_USER)
    setInternalText('')
  }

  return (
    <div className="p-6 space-y-5">

      {/* Top header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/support/tickets')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 font-mono">{ticket.id}</h1>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{ticket.category} / {ticket.subcategory}</p>
        </div>
        <Badge variant={STATUS_BADGE[ticket.status] ?? 'gray'} size="lg" className="ml-auto shrink-0">{ticket.status}</Badge>
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
                <p className="text-xs text-gray-400 font-mono truncate">{ticket.id}</p>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="navy" size="sm">{ticket.category}</Badge>
              <Badge variant={STATUS_BADGE[ticket.status] ?? 'gray'} size="sm">{ticket.status}</Badge>
            </div>

            {/* Quick contact info */}
            <div className="border-t border-surface-border pt-3 space-y-2">
              <ContactRow icon={Phone}>{ticket.phone}</ContactRow>
              {ticket.email && <ContactRow icon={Mail}>{ticket.email}</ContactRow>}
              <ContactRow icon={MapPin}>{ticket.customerAddress ?? ticket.area ?? '—'}</ContactRow>
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

            {/* Mini tab switcher: Ticket Info / Customer Info */}
            <div className="border-t border-surface-border pt-3">
              <div className="flex gap-1 mb-2">
                {[{ key: 'ticket', label: 'Ticket Info' }, { key: 'customer', label: 'Customer Info' }].map(t => (
                  <button key={t.key} onClick={() => setLeftTab(t.key)}
                    className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${
                      leftTab === t.key ? 'bg-brand-blue text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {leftTab === 'ticket' ? (
                <div>
                  <InfoRow label="Ticket #" value={<span className="font-mono text-brand-blue">{ticket.id}</span>} />
                  <InfoRow label="Category" value={ticket.category} />
                  <InfoRow label="Subcategory" value={ticket.subcategory} />
                  <InfoRow label="Priority" value={<Badge variant={PRIORITY_BADGE[ticket.priority]} size="sm" dot>{PRIORITY_LABEL[ticket.priority]}</Badge>} />
                  <InfoRow label="Created" value={formatDateTime(ticket.createdAt)} />
                  <InfoRow label="Agent" value={ticket.assignedAgent} />
                  <InfoRow label="Technician" value={ticket.assignedTechnician} />
                </div>
              ) : (
                <div>
                  <InfoRow label="Account #" value={<span className="font-mono">{ticket.accountNumber}</span>} />
                  <InfoRow label="Phone" value={ticket.phone} />
                  <InfoRow label="Address" value={ticket.customerAddress ?? ticket.area} />
                  <InfoRow label="Plan" value={ticket.plan} />
                  <InfoRow label="Billing" value={<Badge variant={ticket.billingStatus === 'Overdue' ? 'yellow' : 'green'} size="sm">{ticket.billingStatus ?? '—'}</Badge>} />
                  <InfoRow label="Connection" value={<Badge variant={ticket.connectionStatus === 'Connected' ? 'green' : 'red'} size="sm">{ticket.connectionStatus ?? '—'}</Badge>} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── MIDDLE COLUMN ────────────────────────────────────────────────── */}
        <div className="lg:col-span-6">
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
                      <div className="flex flex-wrap gap-3">
                        {ticket.attachments.map((name, i) => isImageName(name) ? (
                          <div key={i} className="w-24">
                            <img src={PLACEHOLDER_IMAGE} alt={name} className="w-24 h-16 object-cover rounded-lg border border-surface-border" />
                            <p className="text-[10px] text-gray-400 truncate mt-1">{name}</p>
                          </div>
                        ) : (
                          <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-surface-border bg-gray-50 text-xs text-gray-600">
                            <FileText size={12} className="text-gray-400" /> {name}
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
                    Visible to customer · automated feed (IVR calls)
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

              {/* ─── Internal Notes ─────────────────────────────────────── */}
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

          {/* Current Status */}
          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <Clock size={14} className="text-brand-blue" />
              </div>
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Current Status</p>
            </div>

            <div className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50">
              <span className="text-xs text-gray-500 shrink-0 pt-1.5">Status</span>
              {isGatedStatus ? (
                <div className="text-right">
                  <Badge variant={STATUS_BADGE[ticket.status]} size="sm">{ticket.status}</Badge>
                  <p className="text-[10px] text-gray-400 mt-1">Use Reopen below to change this.</p>
                </div>
              ) : (
                <div className="w-36">
                  <Select value={ticket.status} onChange={e => updateTicketStatus(ticket.id, e.target.value, CURRENT_USER)}>
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
              )}
            </div>
            <div className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50">
              <span className="text-xs text-gray-500 shrink-0">SLA Deadline</span>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-800">{formatDateTime(ticket.slaDeadline)}</p>
                <Badge variant={SLA_BADGE[sla]} size="sm" className="mt-1">{sla}</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1.5">
              <span className="text-xs text-gray-500">Days Open</span>
              <span className="text-xs font-semibold text-gray-800">{daysOpenOf(ticket)} day{daysOpenOf(ticket) !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Technician Visit — Installation-card style */}
          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                <Wrench size={14} className="text-orange-600" />
              </div>
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Technician Visit</p>
            </div>

            {!ticket.technicianVisit ? (
              <div className="text-center py-2">
                <p className="text-xs text-gray-400 mb-3">No technician visit scheduled yet.</p>
                <span title={scheduleBlocked ? 'Cannot schedule a visit — ticket is Closed or Cancelled.' : undefined}>
                  <Button size="sm" className="w-full" icon={<CalendarPlus size={13} />} disabled={scheduleBlocked} onClick={() => setScheduleOpen(true)}>
                    Schedule Technician Visit
                  </Button>
                </span>
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

          {/* Resolution — eKYC-style purple-bordered card */}
          <div className="bg-white rounded-xl border-2 border-purple-200 p-5 shadow-card">
            <div className="flex items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                  <ShieldCheck size={15} className="text-purple-600" />
                </div>
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Resolution</p>
              </div>
              <Badge variant={ticket.resolution ? (STATUS_BADGE[ticket.status] ?? 'gray') : 'gray'} size="sm">
                {ticket.resolution ? ticket.status : 'Not Resolved'}
              </Badge>
            </div>

            {ticket.resolution ? (
              <div className="space-y-1 mb-3">
                <InfoRow label="Type" value={ticket.resolution.resolutionType} />
                <InfoRow label="Root Cause" value={ticket.resolution.rootCause} />
                <InfoRow label="Details" value={ticket.resolution.resolutionDetails} />
                {ticket.resolution.customerUpdate && <InfoRow label="Customer Update" value={ticket.resolution.customerUpdate} />}
                <InfoRow label="Resolved By" value={ticket.resolution.resolvedBy} />
                <InfoRow label="Resolved At" value={formatDateTime(ticket.resolution.resolvedAt)} />
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-3">This ticket has not been resolved yet.</p>
            )}

            {ticket.reopenReason && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 mb-3">
                <span className="font-semibold">Reopen reason:</span> {ticket.reopenReason}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-purple-100">
              <Button size="sm" icon={<CheckCircle2 size={13} />} disabled={!canResolve} onClick={() => setResolveOpen(true)}>
                Resolve
              </Button>
              <Button size="sm" variant="secondary" icon={<Lock size={13} />} disabled={!canClose}
                onClick={() => closeTicket(ticket.id, CURRENT_USER)}>
                Close
              </Button>
              {canReopen && (
                <Button size="sm" variant="danger" icon={<RotateCcw size={13} />} onClick={() => setReopenOpen(true)}>
                  Reopen
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ResolveModal isOpen={resolveOpen} onClose={() => setResolveOpen(false)}
        onSubmit={data => { resolveTicket(ticket.id, data, CURRENT_USER); setResolveOpen(false) }} />
      <ReopenModal isOpen={reopenOpen} onClose={() => setReopenOpen(false)}
        onSubmit={reason => { reopenTicket(ticket.id, reason, CURRENT_USER); setReopenOpen(false) }} />
      <ScheduleTechnicianModal isOpen={scheduleOpen} onClose={() => setScheduleOpen(false)} ticket={ticket}
        onSubmit={data => { scheduleTechnicianVisit(ticket.id, data, CURRENT_USER); setScheduleOpen(false) }} />
    </div>
  )
}

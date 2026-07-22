import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MessageSquare, Lock, Send, RotateCcw, CheckCircle2, FileText,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Card, { CardHeader } from '../components/ui/Card'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import {
  getTicket, subscribeTickets, updateTicketStatus, addCommunication, addInternalNote,
  resolveTicket, closeTicket, reopenTicket,
  TICKET_STATUSES, GATED_STATUSES, PRIORITY_LABEL, RESOLUTION_TYPES, TECH_VISIT_STATUSES,
  CONTACT_METHODS, slaStatusOf,
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

function InfoField({ label, children }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-gray-800 font-medium">{children}</div>
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

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SupportTicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(() => getTicket(id))

  useEffect(() => setTicket(getTicket(id)), [id])
  useEffect(() => subscribeTickets(() => setTicket(getTicket(id))), [id])

  const [resolveOpen, setResolveOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [commChannel, setCommChannel] = useState('Phone')
  const [commText, setCommText] = useState('')
  const [internalText, setInternalText] = useState('')

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

  function handleAddCommunication() {
    if (!commText.trim()) return
    addCommunication(ticket.id, { channel: commChannel, text: commText.trim() }, CURRENT_USER)
    setCommText('')
  }

  function handleAddInternalNote() {
    if (!internalText.trim()) return
    addInternalNote(ticket.id, internalText.trim(), CURRENT_USER)
    setInternalText('')
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/support/tickets')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 font-mono">{ticket.id}</h1>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{ticket.customerName} · {ticket.category} / {ticket.subcategory}</p>
        </div>
        <Badge variant={STATUS_BADGE[ticket.status] ?? 'gray'} size="lg" className="ml-auto shrink-0">{ticket.status}</Badge>
      </div>

      {/* Section 1 — Ticket Information */}
      <Card>
        <CardHeader title="Ticket Information" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-4">
          <InfoField label="Ticket Number"><span className="font-mono">{ticket.id}</span></InfoField>
          <InfoField label="Category / Subcategory">{ticket.category} <span className="text-gray-400">/ {ticket.subcategory}</span></InfoField>
          <InfoField label="Priority"><Badge variant={PRIORITY_BADGE[ticket.priority]} size="sm" dot>{PRIORITY_LABEL[ticket.priority]}</Badge></InfoField>
          <InfoField label="Status">
            {isGatedStatus ? (
              <div>
                <Badge variant={STATUS_BADGE[ticket.status]} size="sm">{ticket.status}</Badge>
                <p className="text-[11px] text-gray-400 mt-1">Use Reopen Ticket below to change this.</p>
              </div>
            ) : (
              <Select value={ticket.status} onChange={e => updateTicketStatus(ticket.id, e.target.value, CURRENT_USER)}>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            )}
          </InfoField>
          <InfoField label="Created Date">{formatDateTime(ticket.createdAt)}</InfoField>
          <InfoField label="SLA Deadline">
            <p>{formatDateTime(ticket.slaDeadline)}</p>
            <Badge variant={SLA_BADGE[sla]} size="sm" className="mt-1">{sla}</Badge>
          </InfoField>
          <InfoField label="Assigned Agent">{ticket.assignedAgent ?? <span className="text-gray-300 font-normal">Unassigned</span>}</InfoField>
          <InfoField label="Assigned Technician">{ticket.assignedTechnician ?? <span className="text-gray-300 font-normal">Unassigned</span>}</InfoField>
        </div>
      </Card>

      {/* Section 2 — Customer Information */}
      <Card>
        <CardHeader title="Customer Information" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-4">
          <InfoField label="Customer Name">{ticket.customerName}</InfoField>
          <InfoField label="Phone Number">{ticket.phone}</InfoField>
          <InfoField label="Account Number"><span className="font-mono">{ticket.accountNumber}</span></InfoField>
          <InfoField label="Address">{ticket.customerAddress ?? ticket.area ?? '—'}</InfoField>
          <InfoField label="Plan">{ticket.plan ?? '—'}</InfoField>
          <InfoField label="Billing Status">
            <Badge variant={ticket.billingStatus === 'Overdue' ? 'yellow' : 'green'} size="sm">{ticket.billingStatus ?? '—'}</Badge>
          </InfoField>
          <InfoField label="Connection Status">
            <Badge variant={ticket.connectionStatus === 'Connected' ? 'green' : 'red'} size="sm">{ticket.connectionStatus ?? '—'}</Badge>
          </InfoField>
        </div>
      </Card>

      {/* Section 3 — Complaint Information */}
      <Card>
        <CardHeader title="Complaint Information" />
        <div className="space-y-4">
          <InfoField label="Description"><p className="font-normal text-gray-700">{ticket.description}</p></InfoField>
          <InfoField label="Attachments / Screenshots">
            {(ticket.attachments ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 font-normal">No attachments.</p>
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
          </InfoField>
          <InfoField label="Customer-visible Note">
            <p className="font-normal text-gray-700">{ticket.customerNote?.trim() || <span className="text-gray-400">None on file.</span>}</p>
          </InfoField>
        </div>
      </Card>

      {/* Section 5 — Communication History */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-surface-border flex items-center gap-2">
          <MessageSquare size={15} className="text-brand-blue" />
          <h3 className="text-sm font-semibold text-gray-800">Communication History</h3>
          <span className="text-[11px] text-gray-400">Visible to customer</span>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-80 overflow-y-auto">
          {(ticket.communicationLog ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No communication yet.</p>
          ) : ticket.communicationLog.map((entry, i) => (
            <div key={i} className="flex items-start gap-3">
              <Badge variant="blue" size="sm" className="shrink-0 mt-0.5">{entry.channel}</Badge>
              <div className="min-w-0">
                <p className="text-sm text-gray-700">{entry.text}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{entry.actor} · {formatDateTime(entry.time)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-surface-border flex items-start gap-2">
          <div className="w-32 shrink-0">
            <Select value={commChannel} onChange={e => setCommChannel(e.target.value)}>
              {CONTACT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
          </div>
          <Textarea value={commText} onChange={e => setCommText(e.target.value)} rows={1} placeholder="Log a customer communication…" className="flex-1" />
          <Button size="sm" icon={<Send size={13} />} onClick={handleAddCommunication} disabled={!commText.trim()}>Add</Button>
        </div>
      </Card>

      {/* Section 6 — Internal Notes */}
      <Card padding={false} className="border-amber-200">
        <div className="px-5 py-4 border-b border-amber-200 bg-amber-50/50 flex items-center gap-2 rounded-t-xl">
          <Lock size={14} className="text-amber-600" />
          <h3 className="text-sm font-semibold text-amber-800">Internal Notes</h3>
          <span className="text-[11px] text-amber-600 font-medium">Internal — not visible to customer</span>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-80 overflow-y-auto">
          {(ticket.internalNotesLog ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No internal notes yet.</p>
          ) : ticket.internalNotesLog.map((entry, i) => (
            <div key={i}>
              <p className="text-sm text-gray-700">{entry.text}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{entry.actor} · {formatDateTime(entry.time)}</p>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-surface-border flex items-start gap-2">
          <Textarea value={internalText} onChange={e => setInternalText(e.target.value)} rows={1} placeholder="Add an internal note…" className="flex-1" />
          <Button size="sm" variant="secondary" icon={<Lock size={13} />} onClick={handleAddInternalNote} disabled={!internalText.trim()}>Add Internal Note</Button>
        </div>
      </Card>

      {/* Section 7 — Technician Visit */}
      <Card>
        <CardHeader title="Technician Visit" />
        {!ticket.technicianVisit ? (
          <p className="text-sm text-gray-400 text-center py-6">No technician visit scheduled yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-4">
              <InfoField label="Technician">{ticket.technicianVisit.technician}</InfoField>
              <InfoField label="Visit Date & Time">{ticket.technicianVisit.visitDate} · {ticket.technicianVisit.visitTime}</InfoField>
              <InfoField label="Visit Status">
                <Badge variant={VISIT_STATUS_BADGE[ticket.technicianVisit.visitStatus] ?? 'gray'} size="sm">{ticket.technicianVisit.visitStatus}</Badge>
              </InfoField>
              <InfoField label="Materials Used">
                {ticket.technicianVisit.materialsUsed?.length ? ticket.technicianVisit.materialsUsed.join(', ') : <span className="text-gray-300 font-normal">None</span>}
              </InfoField>
            </div>
            <InfoField label="Technician Notes"><p className="font-normal text-gray-700">{ticket.technicianVisit.notes || '—'}</p></InfoField>
            <InfoField label="Diagnosis"><p className="font-normal text-gray-700">{ticket.technicianVisit.diagnosis || '—'}</p></InfoField>
            <InfoField label="Work Completion Details"><p className="font-normal text-gray-700">{ticket.technicianVisit.completionDetails || '—'}</p></InfoField>
            <InfoField label="Photos">
              {ticket.technicianVisit.photos?.length ? (
                <div className="flex flex-wrap gap-3">
                  {ticket.technicianVisit.photos.map((name, i) => (
                    <div key={i} className="w-24">
                      <img src={PLACEHOLDER_IMAGE} alt={name} className="w-24 h-16 object-cover rounded-lg border border-surface-border" />
                      <p className="text-[10px] text-gray-400 truncate mt-1">{name}</p>
                    </div>
                  ))}
                </div>
              ) : <span className="text-sm text-gray-300 font-normal">None</span>}
            </InfoField>
          </div>
        )}
      </Card>

      {/* Section 8 — Resolution */}
      <Card>
        <CardHeader title="Resolution" />
        <div className="space-y-4">
          {ticket.resolution ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-4">
              <InfoField label="Root Cause"><p className="font-normal text-gray-700">{ticket.resolution.rootCause}</p></InfoField>
              <InfoField label="Resolution Type"><Badge variant="green" size="sm">{ticket.resolution.resolutionType}</Badge></InfoField>
              <div className="col-span-2">
                <InfoField label="Resolution Details"><p className="font-normal text-gray-700">{ticket.resolution.resolutionDetails}</p></InfoField>
              </div>
              {ticket.resolution.customerUpdate && (
                <div className="col-span-2">
                  <InfoField label="Customer Update"><p className="font-normal text-gray-700">{ticket.resolution.customerUpdate}</p></InfoField>
                </div>
              )}
              <InfoField label="Resolved By">{ticket.resolution.resolvedBy}</InfoField>
              <InfoField label="Resolved At">{formatDateTime(ticket.resolution.resolvedAt)}</InfoField>
            </div>
          ) : (
            <p className="text-sm text-gray-400">This ticket has not been resolved yet.</p>
          )}

          {ticket.reopenReason && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              <span className="font-semibold">Reopen reason:</span> {ticket.reopenReason}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-border">
            <Button icon={<CheckCircle2 size={14} />} disabled={!canResolve} onClick={() => setResolveOpen(true)}>
              Resolve Ticket
            </Button>
            <Button variant="secondary" icon={<Lock size={14} />} disabled={!canClose}
              onClick={() => closeTicket(ticket.id, CURRENT_USER)}>
              Close Ticket
            </Button>
            {canReopen && (
              <Button variant="danger" icon={<RotateCcw size={14} />} onClick={() => setReopenOpen(true)}>
                Reopen Ticket
              </Button>
            )}
          </div>
        </div>
      </Card>

      <ResolveModal isOpen={resolveOpen} onClose={() => setResolveOpen(false)}
        onSubmit={data => { resolveTicket(ticket.id, data, CURRENT_USER); setResolveOpen(false) }} />
      <ReopenModal isOpen={reopenOpen} onClose={() => setReopenOpen(false)}
        onSubmit={reason => { reopenTicket(ticket.id, reason, CURRENT_USER); setReopenOpen(false) }} />
    </div>
  )
}

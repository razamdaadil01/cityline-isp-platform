import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Search, ClipboardList, UserCog, CheckCircle2,
  AlertTriangle, Upload, Paperclip, X, Wrench, Sparkles,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { getAllCustomers } from '../data/customersData'
import {
  getTickets, saveTicket, nextTicketNumber, computeSlaDeadline,
  CATEGORY_SUBCATEGORIES, CATEGORIES, PRIORITIES, PRIORITY_LABEL, CONTACT_METHODS,
  AGENTS, TECHNICIANS, CLOSED_STATUSES,
} from '../data/ticketsStore'

const CURRENT_USER = 'Admin User'

const ACCOUNT_STATUS_BADGE = { active: 'green', suspended: 'yellow', inactive: 'gray', expired: 'red' }
const ACCOUNT_STATUS_LABEL = { active: 'Active', suspended: 'Suspended', inactive: 'Inactive', expired: 'Expired' }
// The shared customer store only tracks a single lifecycle status — billing/connection are
// derived from it for display since the data model doesn't track them separately yet.
const BILLING_STATUS = { active: 'Paid up to date', suspended: 'Overdue', inactive: 'No active plan', expired: 'Overdue' }
const CONNECTION_STATUS = { active: 'Connected', suspended: 'Suspended', inactive: 'Disconnected', expired: 'Disconnected' }

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function SectionCard({ step, title, icon: Icon, locked, lockedHint, children }) {
  return (
    <div className={`bg-white rounded-2xl border border-surface-border shadow-card p-5 transition-opacity ${locked ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-6 h-6 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold flex items-center justify-center shrink-0">{step}</span>
        <Icon size={15} className="text-brand-blue" />
        <p className="text-sm font-bold text-gray-700">{title}</p>
        {locked && (
          <span className="ml-auto text-xs text-gray-400 font-medium">{lockedHint}</span>
        )}
      </div>
      <div className={locked ? 'pointer-events-none select-none' : ''}>
        {children}
      </div>
    </div>
  )
}

export default function TicketCreate() {
  const navigate = useNavigate()

  const [ticketNumber] = useState(() => nextTicketNumber())

  // ── Step 1 — Search Customer ──────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedConnectionId, setSelectedConnectionId] = useState(null)

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return getAllCustomers().filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(search.trim()) ||
      c.id.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [search])

  function selectCustomer(c) {
    setSelectedCustomer(c)
    setSelectedConnectionId(c.id)
    setSearch('')
  }

  // Data model today is strictly one connection per customer account — this always
  // resolves to a single-item list, but is shaped as a list so a real multi-connection
  // model can slot in later without changing this UI.
  const connections = selectedCustomer
    ? (selectedCustomer.connections?.length ? selectedCustomer.connections : [{ id: selectedCustomer.id, plan: selectedCustomer.plan }])
    : []

  // ── Step 2 — Check Existing Complaints ────────────────────────────────────
  const customerTickets = useMemo(() => {
    if (!selectedCustomer) return []
    return getTickets()
      .filter(t => t.phone === selectedCustomer.phone)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [selectedCustomer])

  const openTickets = customerTickets.filter(t => !CLOSED_STATUSES.includes(t.status))
  const last5Tickets = customerTickets.slice(0, 5)

  const [duplicateChoice, setDuplicateChoice] = useState(null) // { mode: 'duplicate'|'new', ticketId?, reason? }
  const [newReason, setNewReason] = useState('')

  const primaryOpenTicket = openTickets[0] ?? null
  const showDuplicateWarning = !!primaryOpenTicket && !duplicateChoice

  const step2Resolved = !primaryOpenTicket ||
    duplicateChoice?.mode === 'duplicate' ||
    (duplicateChoice?.mode === 'new' && newReason.trim())

  // ── Step 3 — Complaint Details ────────────────────────────────────────────
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [description, setDescription] = useState('')
  const [contactMethod, setContactMethod] = useState('')
  const [priority, setPriority] = useState('')
  const [attachments, setAttachments] = useState([])
  const [preferredVisitTime, setPreferredVisitTime] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const fileInputRef = useRef()

  function handleUpload(fileList) {
    const files = Array.from(fileList ?? [])
    if (!files.length) return
    setAttachments(a => [...files.map(f => ({ id: Date.now() + Math.random(), name: f.name, sizeLabel: fmtSize(f.size) })), ...a])
  }
  function removeAttachment(id) { setAttachments(a => a.filter(x => x.id !== id)) }

  // ── Step 4 — Assignment ───────────────────────────────────────────────────
  const [assignmentType, setAssignmentType] = useState('team') // 'field' | 'team'
  const [assignedAgent, setAssignedAgent] = useState('')
  const [assignedTechnician, setAssignedTechnician] = useState('')

  // ── Gating ─────────────────────────────────────────────────────────────────
  const step1Done = !!selectedCustomer
  const step3Locked = !step1Done || !step2Resolved
  const step4Locked = step3Locked || !category || !subcategory || !description.trim() || !contactMethod || !priority
  const step5Locked = step4Locked

  const canCreate = step1Done && step2Resolved && category && subcategory && description.trim() && contactMethod && priority

  function handleCategoryChange(v) {
    setCategory(v)
    setSubcategory('')
  }

  function handleCreate() {
    if (!canCreate) return
    const now = new Date().toISOString()
    const isDuplicate = duplicateChoice?.mode === 'duplicate'
    const status = isDuplicate ? 'Duplicate' : (assignedAgent ? 'Assigned' : 'New')

    const activityLog = [
      { time: now, actor: CURRENT_USER, action: 'Ticket created' },
      { time: now, actor: 'System', action: 'Notification sent to customer' },
    ]
    if (assignedAgent) activityLog.push({ time: now, actor: 'System', action: `Notification sent to ${assignedAgent} (agent)` })
    if (assignedTechnician) activityLog.push({ time: now, actor: 'System', action: `Notification sent to ${assignedTechnician} (technician)` })
    if (isDuplicate) activityLog.push({ time: now, actor: CURRENT_USER, action: `Linked as duplicate of ${duplicateChoice.ticketId}` })
    if (duplicateChoice?.mode === 'new') activityLog.push({ time: now, actor: CURRENT_USER, action: `Created despite existing complaint — reason: ${newReason.trim()}` })

    const ticket = {
      id: ticketNumber,
      customerName: selectedCustomer.name,
      phone: selectedCustomer.phone,
      accountNumber: selectedCustomer.id,
      customerId: selectedCustomer.id,
      category, subcategory,
      priority,
      status,
      assignedAgent: assignedAgent || null,
      assignedTechnician: assignedTechnician || null,
      area: selectedCustomer.zone ?? '—',
      createdAt: now,
      updatedAt: now,
      slaDeadline: computeSlaDeadline(now, priority),
      outageLinked: false,
      reopened: false,
      duplicateOf: isDuplicate ? duplicateChoice.ticketId : null,
      description: description.trim(),
      contactMethod,
      preferredVisitTime,
      customerNote,
      internalNote,
      attachments: attachments.map(a => a.name),
      assignmentType,
      activityLog,
    }

    const saved = saveTicket(ticket)
    navigate(`/support/tickets/${saved.id}`)
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/support/tickets')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Create Ticket</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            New support ticket · <span className="font-mono text-gray-700">{ticketNumber}</span>
          </p>
        </div>
      </div>

      {/* Step 1 — Search Customer */}
      <SectionCard step={1} title="Search Customer" icon={Search}>
        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by phone number, account number or customer name…"
              className="w-full pl-9 pr-9 py-2.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full border border-surface-border rounded-lg overflow-hidden shadow-lg bg-white">
                {searchResults.map(c => (
                  <button key={c.id} onClick={() => selectCustomer(c)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-brand-blue/5 transition-colors border-b border-surface-border last:border-0">
                    <span className="font-medium text-gray-800">{c.name}</span>
                    <span className="text-gray-400"> · {c.phone} · </span>
                    <span className="font-mono text-xs text-brand-blue">{c.id}</span>
                  </button>
                ))}
              </div>
            )}
            {search.trim() && searchResults.length === 0 && (
              <div className="absolute z-10 mt-1 w-full border border-surface-border rounded-lg shadow-lg bg-white px-4 py-3 text-sm text-gray-400">
                No customer matches "{search.trim()}"
              </div>
            )}
          </div>

          {selectedCustomer && (
            <div className="pt-2 border-t border-surface-border space-y-4">
              <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                <FormField label="Customer Name"><Input value={selectedCustomer.name} disabled /></FormField>
                <FormField label="Account Number"><Input value={selectedCustomer.id} disabled className="font-mono" /></FormField>
                <FormField label="Service Address"><Input value={selectedCustomer.zone ?? '—'} disabled /></FormField>
                <FormField label="Internet Plan"><Input value={selectedCustomer.plan ?? '—'} disabled /></FormField>
                <FormField label="Account Status">
                  <div><Badge variant={ACCOUNT_STATUS_BADGE[selectedCustomer.status] ?? 'gray'} size="sm">{ACCOUNT_STATUS_LABEL[selectedCustomer.status] ?? selectedCustomer.status}</Badge></div>
                </FormField>
                <FormField label="Billing Status">
                  <div><Badge variant={selectedCustomer.status === 'active' ? 'green' : 'yellow'} size="sm">{BILLING_STATUS[selectedCustomer.status] ?? '—'}</Badge></div>
                </FormField>
                <FormField label="Connection Status">
                  <div><Badge variant={selectedCustomer.status === 'active' ? 'green' : 'red'} size="sm">{CONNECTION_STATUS[selectedCustomer.status] ?? '—'}</Badge></div>
                </FormField>
              </div>

              <FormField label="Affected Connection" hint={connections.length <= 1 ? 'Only one connection is on file for this account.' : undefined}>
                <Select value={selectedConnectionId ?? ''} onChange={e => setSelectedConnectionId(e.target.value)} disabled={connections.length <= 1}>
                  {connections.map(c => <option key={c.id} value={c.id}>{c.plan} · {c.id}</option>)}
                </Select>
              </FormField>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Step 2 — Check Existing Complaints */}
      <SectionCard step={2} title="Check Existing Complaints" icon={ClipboardList}
        locked={!step1Done} lockedHint="Select a customer first">
        {step1Done && (
          <div className="space-y-4">
            {showDuplicateWarning && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">A similar complaint already exists</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      <span className="font-mono">{primaryOpenTicket.id}</span> is still open for this customer ({primaryOpenTicket.status}).
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="xs" variant="secondary" onClick={() => navigate(`/support/tickets/${primaryOpenTicket.id}`)}>
                    Open Existing Ticket
                  </Button>
                  <Button size="xs" variant="secondary" onClick={() => setDuplicateChoice({ mode: 'duplicate', ticketId: primaryOpenTicket.id })}>
                    Link as Duplicate
                  </Button>
                  <Button size="xs" variant="secondary" onClick={() => setDuplicateChoice({ mode: 'new' })}>
                    Create New Ticket
                  </Button>
                </div>
              </div>
            )}

            {duplicateChoice?.mode === 'duplicate' && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-center justify-between gap-2">
                <span>This ticket will be created and marked <strong>Duplicate</strong> of <span className="font-mono">{duplicateChoice.ticketId}</span>.</span>
                <button onClick={() => setDuplicateChoice(null)} className="text-blue-400 hover:text-blue-700"><X size={13} /></button>
              </div>
            )}

            {duplicateChoice?.mode === 'new' && (
              <FormField label="Reason for creating a new ticket" required
                hint="Required since an open complaint already exists for this customer.">
                <Textarea value={newReason} onChange={e => setNewReason(e.target.value)} rows={2}
                  placeholder="Explain why this needs a separate ticket…" />
              </FormField>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Open Tickets</p>
                {openTickets.length === 0 ? (
                  <p className="text-sm text-gray-400">No open tickets for this customer.</p>
                ) : (
                  <div className="space-y-1.5">
                    {openTickets.map(t => (
                      <div key={t.id} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 border border-surface-border">
                        <span className="font-mono text-brand-blue font-semibold">{t.id}</span>
                        <span className="text-gray-500 truncate mx-2 flex-1">{t.category}</span>
                        <Badge variant="orange" size="sm">{t.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Last 5 Complaints</p>
                {last5Tickets.length === 0 ? (
                  <p className="text-sm text-gray-400">No prior complaints on file.</p>
                ) : (
                  <div className="space-y-1.5">
                    {last5Tickets.map(t => (
                      <div key={t.id} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 border border-surface-border">
                        <span className="font-mono text-gray-600">{t.id}</span>
                        <span className="text-gray-400">{formatDateTime(t.createdAt).split(',')[0]}</span>
                        <Badge variant="gray" size="sm">{t.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Active Outage</p>
              <div className="flex items-center gap-2 text-sm text-gray-500 px-3 py-2 rounded-lg bg-gray-50 border border-surface-border">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                No active outage reported in {selectedCustomer.zone ?? 'this area'}.
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Step 3 — Complaint Details */}
      <SectionCard step={3} title="Complaint Details" icon={AlertTriangle}
        locked={step3Locked} lockedHint={!step1Done ? 'Select a customer first' : 'Resolve the existing complaint check above'}>
        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          <FormField label="Complaint Category" required>
            <Select value={category} onChange={e => handleCategoryChange(e.target.value)}>
              <option value="">Select category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormField>
          <FormField label="Complaint Subcategory" required>
            <Select value={subcategory} onChange={e => setSubcategory(e.target.value)} disabled={!category}>
              <option value="">{category ? 'Select subcategory…' : 'Select a category first'}</option>
              {(CATEGORY_SUBCATEGORIES[category] ?? []).map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>
          <div className="col-span-2">
            <FormField label="Description" required>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Describe the issue in detail…" />
            </FormField>
          </div>
          <FormField label="Contact Method" required>
            <Select value={contactMethod} onChange={e => setContactMethod(e.target.value)}>
              <option value="">Select method…</option>
              {CONTACT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
          </FormField>
          <FormField label="Priority" required>
            <Select value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="">Select priority…</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </Select>
          </FormField>

          <div className="col-span-2 pt-2 border-t border-surface-border" />

          <div className="col-span-2">
            <FormField label="Attachment / Screenshot" hint="Optional — up to a few files">
              <div className="space-y-2">
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => { handleUpload(e.target.files); e.target.value = '' }} />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-brand-blue bg-brand-blue/5 hover:bg-brand-blue/10 border border-brand-blue/20 rounded-lg transition-colors">
                  <Upload size={13} /> Upload files
                </button>
                {attachments.length > 0 && (
                  <div className="space-y-1.5">
                    {attachments.map(a => (
                      <div key={a.id} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-surface-border bg-gray-50 text-xs">
                        <Paperclip size={12} className="text-gray-400 shrink-0" />
                        <span className="flex-1 truncate text-gray-700">{a.name}</span>
                        <span className="text-gray-400">{a.sizeLabel}</span>
                        <button onClick={() => removeAttachment(a.id)} className="text-gray-400 hover:text-red-500"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormField>
          </div>

          <FormField label="Preferred Visit Time" hint="Optional">
            <Input type="datetime-local" value={preferredVisitTime} onChange={e => setPreferredVisitTime(e.target.value)} />
          </FormField>
          <div />
          <FormField label="Customer-visible Note" hint="Optional — shown to the customer">
            <Textarea value={customerNote} onChange={e => setCustomerNote(e.target.value)} rows={2} />
          </FormField>
          <FormField label="Internal Note" hint="Optional — internal only">
            <Textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} rows={2} />
          </FormField>
        </div>
      </SectionCard>

      {/* Step 4 — Assignment */}
      <SectionCard step={4} title="Assignment" icon={UserCog}
        locked={step4Locked} lockedHint="Complete complaint details first">
        <div className="space-y-4">
          <FormField label="Suggested Assignment Type">
            <div className="flex gap-3">
              <button type="button" onClick={() => setAssignmentType('team')}
                className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                  assignmentType === 'team' ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-surface-border text-gray-500 hover:border-gray-300'
                }`}>
                <Sparkles size={14} /> Team Assignment (Agent)
              </button>
              <button type="button" onClick={() => setAssignmentType('field')}
                className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                  assignmentType === 'field' ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-surface-border text-gray-500 hover:border-gray-300'
                }`}>
                <Wrench size={14} /> Field Assignment (Technician)
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Automatic suggestion logic isn't built yet — pick manually below for now.</p>
          </FormField>

          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            <FormField label="Assign Agent" hint="Optional for now">
              <Select value={assignedAgent} onChange={e => setAssignedAgent(e.target.value)}>
                <option value="">Unassigned</option>
                {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </Select>
            </FormField>
            <FormField label="Assign Technician" hint="Optional for now">
              <Select value={assignedTechnician} onChange={e => setAssignedTechnician(e.target.value)}>
                <option value="">Unassigned</option>
                {TECHNICIANS.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
          </div>
        </div>
      </SectionCard>

      {/* Step 5 — Create */}
      <div className="flex items-center justify-end gap-3 pb-2">
        <Button variant="secondary" onClick={() => navigate('/support/tickets')}>Cancel</Button>
        <Button onClick={handleCreate} disabled={!canCreate} icon={<CheckCircle2 size={15} />}>
          Create Ticket
        </Button>
      </div>
    </div>
  )
}

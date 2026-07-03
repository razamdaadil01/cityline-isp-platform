import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Phone, User, CalendarDays, Wifi, FileText, Trash2,
  Check, X, ClipboardCheck, CheckCircle2, XCircle, CalendarClock,
  UserPlus, Activity, AlertTriangle,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Card, { CardHeader } from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import {
  getLead, saveLead, deleteLead, subscribeLeads,
  INTERCOM_STAGES, INTERCOM_PLANS, INTERCOM_STAFF, INTERCOM_ENGINEERS,
} from '../data/intercomLeadsStore'

const STAGE_BADGE = {
  'New Inquiry': 'blue',
  'Feasibility': 'orange',
  'Booked':      'purple',
  'Converted':   'green',
  'Lost':        'red',
}

const STAGE_STEPS = ['New Inquiry', 'Feasibility', 'Booked', 'Converted']

const STAGE_ICON = {
  'New Inquiry': '📝',
  'Feasibility': '🔍',
  'Booked':      '📅',
  'Converted':   '✅',
  'Lost':        '❌',
}

const CURRENT_USER = 'Admin User'

function todayStr() { return new Date().toISOString().slice(0, 10) }
function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{value || '—'}</p>
      </div>
    </div>
  )
}

// ── Stage Progress Bar ────────────────────────────────────────────────────────

function StageProgressBar({ stage }) {
  const isLost = stage === 'Lost'
  const effectiveStage = isLost ? 'Feasibility' : stage
  const currentIdx = STAGE_STEPS.indexOf(effectiveStage)

  return (
    <div className="flex items-start">
      {STAGE_STEPS.map((s, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        return (
          <div key={s} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2 min-w-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                done   ? 'bg-brand-blue text-white' :
                active ? (isLost ? 'bg-red-500 text-white ring-4 ring-red-100' : 'bg-navy text-white ring-4 ring-navy/20') :
                         'bg-gray-100 text-gray-400'
              }`}>
                {done ? <Check size={15} /> : active && isLost ? <X size={15} /> : <span className="text-xs font-bold">{i + 1}</span>}
              </div>
              <span className={`text-[11px] font-semibold text-center leading-tight whitespace-nowrap ${
                active ? (isLost ? 'text-red-600' : 'text-navy') : done ? 'text-brand-blue' : 'text-gray-400'
              }`}>
                {s}
              </span>
            </div>
            {i < STAGE_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mt-[18px] mx-2 transition-all ${
                done ? 'bg-brand-blue' : 'bg-gray-200'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Request Feasibility Modal ─────────────────────────────────────────────────

function RequestFeasibilityModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState({ engineer: '', visitDate: '', visitTime: '', notes: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) { setForm({ engineer: '', visitDate: '', visitTime: '', notes: '' }); setErrors({}) }
  }, [isOpen])

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function handleSubmit() {
    const e = {}
    if (!form.engineer)  e.engineer  = 'Assign an engineer'
    if (!form.visitDate) e.visitDate = 'Visit date is required'
    if (!form.visitTime) e.visitTime = 'Visit time is required'
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit(form)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Feasibility" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={<ClipboardCheck size={14} />} onClick={handleSubmit}>Submit Request</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Assign Engineer" required error={errors.engineer}>
          <Select value={form.engineer} onChange={e => set('engineer', e.target.value)}>
            <option value="">Select engineer…</option>
            {INTERCOM_ENGINEERS.map(e => <option key={e}>{e}</option>)}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Visit Date" required error={errors.visitDate}>
            <Input type="date" value={form.visitDate} onChange={e => set('visitDate', e.target.value)} />
          </FormField>
          <FormField label="Visit Time" required error={errors.visitTime}>
            <Input type="time" value={form.visitTime} onChange={e => set('visitTime', e.target.value)} />
          </FormField>
        </div>
        <FormField label="Notes">
          <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Any details for the site visit…" />
        </FormField>
      </div>
    </Modal>
  )
}

// ── Not Feasible Reason Modal ─────────────────────────────────────────────────

function NotFeasibleModal({ isOpen, onClose, onSubmit }) {
  const [reason, setReason] = useState('')

  useEffect(() => { if (isOpen) setReason('') }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mark as Not Feasible" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" icon={<XCircle size={14} />} onClick={() => onSubmit(reason)}>Mark Not Feasible</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">This will move the lead to <strong>Lost</strong>.</p>
        </div>
        <FormField label="Reason">
          <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Why is this site not feasible?" />
        </FormField>
      </div>
    </Modal>
  )
}

// ── Confirm Booking Modal ─────────────────────────────────────────────────────

function ConfirmBookingModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState({ package: INTERCOM_PLANS[0], installDate: '', installTime: '', advancePayment: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) { setForm({ package: INTERCOM_PLANS[0], installDate: '', installTime: '', advancePayment: '' }); setErrors({}) }
  }, [isOpen])

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function handleSubmit() {
    const e = {}
    if (!form.package)     e.package     = 'Select a package'
    if (!form.installDate) e.installDate = 'Installation date is required'
    if (!form.installTime) e.installTime = 'Installation time is required'
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit(form)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Booking" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={<CalendarClock size={14} />} onClick={handleSubmit}>Confirm Booking</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Intercom Package" required error={errors.package}>
          <Select value={form.package} onChange={e => set('package', e.target.value)}>
            {INTERCOM_PLANS.map(p => <option key={p}>{p}</option>)}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Installation Date" required error={errors.installDate}>
            <Input type="date" value={form.installDate} onChange={e => set('installDate', e.target.value)} />
          </FormField>
          <FormField label="Installation Time" required error={errors.installTime}>
            <Input type="time" value={form.installTime} onChange={e => set('installTime', e.target.value)} />
          </FormField>
        </div>
        <FormField label="Advance Payment" hint="Optional">
          <Input type="number" min="0" value={form.advancePayment} onChange={e => set('advancePayment', e.target.value)} placeholder="e.g. 500" />
        </FormField>
      </div>
    </Modal>
  )
}

// ── Stage-based Actions ───────────────────────────────────────────────────────

function StageActions({ lead, onRequestFeasibility, onMarkFeasible, onMarkNotFeasible, onConfirmBooking, onCreateCustomer }) {
  if (lead.stage === 'New Inquiry') {
    return (
      <Button icon={<ClipboardCheck size={14} />} onClick={onRequestFeasibility}>Request Feasibility</Button>
    )
  }
  if (lead.stage === 'Feasibility') {
    if (lead.feasible) {
      return (
        <Button icon={<CalendarClock size={14} />} onClick={onConfirmBooking}>Confirm Booking</Button>
      )
    }
    return (
      <>
        <Button variant="danger" icon={<XCircle size={14} />} onClick={onMarkNotFeasible}>Mark Not Feasible</Button>
        <Button className="!bg-emerald-500 hover:!bg-emerald-600" icon={<CheckCircle2 size={14} />} onClick={onMarkFeasible}>Mark Feasible</Button>
      </>
    )
  }
  if (lead.stage === 'Booked') {
    return (
      <Button className="!bg-emerald-500 hover:!bg-emerald-600" icon={<UserPlus size={14} />} onClick={onCreateCustomer}>Create Intercom Customer</Button>
    )
  }
  return null
}

// ── Activity Log ──────────────────────────────────────────────────────────────

function ActivityLog({ history }) {
  const entries = [...history].reverse()
  return (
    <Card padding={false} className="col-span-2">
      <div className="px-5 py-4 border-b border-surface-border flex items-center gap-2">
        <Activity size={15} className="text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-800">Activity Log</h3>
      </div>
      <div className="px-5 py-5">
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No activity recorded yet.</p>
        ) : (
          <div className="space-y-0">
            {entries.map((entry, i) => (
              <div key={i} className="flex gap-4 pb-5 relative">
                {i < entries.length - 1 && (
                  <div className="absolute left-3.5 top-7 bottom-0 w-px bg-gray-200" />
                )}
                <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shrink-0 text-sm z-10">
                  {STAGE_ICON[entry.stage] ?? '•'}
                </div>
                <div className="pt-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium">
                    {entry.stage} <span className="text-gray-400 font-normal">— {entry.note}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    by <span className="font-medium text-gray-600">{entry.actor}</span> · {entry.date} {entry.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function IntercomLeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [lead, setLead] = useState(() => getLead(id))
  const [editing, setEditing] = useState(searchParams.get('edit') === '1')
  const [form, setForm] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [feasibilityModalOpen, setFeasibilityModalOpen] = useState(false)
  const [notFeasibleModalOpen, setNotFeasibleModalOpen] = useState(false)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)

  useEffect(() => subscribeLeads(() => setLead(getLead(id))), [id])
  useEffect(() => { setLead(getLead(id)) }, [id])
  useEffect(() => {
    if (searchParams.get('edit') === '1') { setEditing(true); setForm(lead) }
  }, [searchParams.get('edit')])

  function startEdit() {
    setForm(lead)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setForm(null)
    setSearchParams({})
  }

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function handleSave() {
    saveLead({ ...lead, ...form })
    setEditing(false)
    setForm(null)
    setSearchParams({})
  }

  function confirmDelete() {
    deleteLead(id)
    setDeleteOpen(false)
    navigate('/intercom/leads')
  }

  function addHistory(updated, note) {
    const entry = { stage: updated.stage, date: todayStr(), time: nowTime(), note, actor: CURRENT_USER }
    return { ...updated, stageHistory: [...(lead.stageHistory ?? []), entry] }
  }

  function handleRequestFeasibility(data) {
    const updated = {
      ...lead,
      stage: 'Feasibility',
      engineer: data.engineer,
      visitDate: data.visitDate,
      visitTime: data.visitTime,
      feasibilityNotes: data.notes,
      feasible: false,
    }
    saveLead(addHistory(updated, `Feasibility requested — engineer ${data.engineer}, visit ${data.visitDate} ${data.visitTime}`))
    setFeasibilityModalOpen(false)
  }

  function handleMarkFeasible() {
    const updated = { ...lead, feasible: true }
    saveLead(addHistory(updated, 'Marked Feasible'))
  }

  function handleMarkNotFeasible(reason) {
    const updated = { ...lead, stage: 'Lost', feasible: false, lostReason: reason || 'No reason provided' }
    saveLead(addHistory(updated, `Marked Not Feasible — ${reason || 'No reason provided'}`))
    setNotFeasibleModalOpen(false)
  }

  function handleConfirmBooking(data) {
    const updated = {
      ...lead,
      stage: 'Booked',
      package: data.package,
      installDate: data.installDate,
      installTime: data.installTime,
      advancePayment: data.advancePayment,
    }
    saveLead(addHistory(updated, `Booking confirmed — ${data.package}, install ${data.installDate} ${data.installTime}`))
    setBookingModalOpen(false)
  }

  function handleCreateCustomer() {
    navigate('/intercom/customers/new?leadId=' + lead.id)
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <p className="text-sm font-semibold text-gray-700">Lead not found</p>
        <p className="text-xs text-gray-400 mt-1 mb-4">This intercom lead may have been deleted.</p>
        <Button variant="secondary" onClick={() => navigate('/intercom/leads')}>Back to Leads</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-5 shrink-0 bg-white border-b border-surface-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/intercom/leads')}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{lead.leadName}</h1>
                <Badge variant={STAGE_BADGE[lead.stage] ?? 'gray'} size="sm">{lead.stage}</Badge>
              </div>
              <p className="text-sm text-gray-500 mt-0.5 font-mono">{lead.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button variant="secondary" onClick={cancelEdit}>Cancel</Button>
                <Button onClick={handleSave}>Save Changes</Button>
              </>
            ) : (
              <>
                <StageActions
                  lead={lead}
                  onRequestFeasibility={() => setFeasibilityModalOpen(true)}
                  onMarkFeasible={handleMarkFeasible}
                  onMarkNotFeasible={() => setNotFeasibleModalOpen(true)}
                  onConfirmBooking={() => setBookingModalOpen(true)}
                  onCreateCustomer={handleCreateCustomer}
                />
                <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => setDeleteOpen(true)}>Delete</Button>
                <Button onClick={startEdit}>Edit Lead</Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Stage Progress Bar ──────────────────────────────────────────── */}
      {!editing && (
        <div className="px-6 py-5 shrink-0 bg-white border-b border-surface-border">
          <StageProgressBar stage={lead.stage} />

          {lead.stage === 'Converted' && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg w-fit">
              <Badge variant="green" size="sm">Converted</Badge>
              <span className="text-xs text-emerald-700 font-medium">
                Customer ID: <span className="font-mono font-semibold">{lead.customerId ?? '—'}</span>
              </span>
            </div>
          )}
          {lead.stage === 'Lost' && (
            <div className="mt-4 flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg w-fit max-w-lg">
              <Badge variant="red" size="sm">Lost</Badge>
              <span className="text-xs text-red-700 font-medium">{lead.lostReason || 'No reason recorded'}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {!editing ? (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Customer Info" />
              <InfoRow icon={User} label="Customer" value={lead.customer} />
              <InfoRow icon={Phone} label="Mobile" value={lead.mobile} />
              <InfoRow icon={Wifi} label="Plan" value={lead.plan} />
            </Card>
            <Card>
              <CardHeader title="Assignment & Follow-up" />
              <div className="flex items-center gap-3 py-2.5 border-b border-gray-50">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${lead.assignedColor}`}>
                  {lead.assignedInitials}
                </span>
                <div>
                  <p className="text-[11px] text-gray-400">Assigned To</p>
                  <p className="text-sm font-medium text-gray-800">{lead.assigned || '—'}</p>
                </div>
              </div>
              <InfoRow icon={CalendarDays} label="Follow-up Date" value={lead.followUp} />
              <InfoRow icon={CalendarDays} label="Created" value={lead.createdAt} />
            </Card>
            <Card className="col-span-2">
              <CardHeader title="Notes" />
              <div className="flex items-start gap-3">
                <FileText size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes || 'No notes added.'}</p>
              </div>
            </Card>

            {/* ── Activity Log ────────────────────────────────────────── */}
            <ActivityLog history={lead.stageHistory ?? []} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5 max-w-2xl">
            <p className="text-sm font-bold text-gray-700 mb-4">Edit Lead Details</p>
            <div className="grid grid-cols-2 gap-x-5 gap-y-4">
              <FormField label="Customer Name">
                <Input value={form.customer} onChange={e => set('customer', e.target.value)} />
              </FormField>
              <FormField label="Mobile Number">
                <Input value={form.mobile} onChange={e => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} />
              </FormField>
              <FormField label="Plan">
                <Select value={form.plan} onChange={e => set('plan', e.target.value)}>
                  {INTERCOM_PLANS.map(p => <option key={p}>{p}</option>)}
                </Select>
              </FormField>
              <FormField label="Stage">
                <Select value={form.stage} onChange={e => set('stage', e.target.value)}>
                  {INTERCOM_STAGES.map(s => <option key={s}>{s}</option>)}
                </Select>
              </FormField>
              <FormField label="Assigned To">
                <Select value={form.assigned} onChange={e => set('assigned', e.target.value)}>
                  <option value="">Select user…</option>
                  {INTERCOM_STAFF.map(s => <option key={s.name}>{s.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Follow-up Date">
                <Input type="date" value={form.followUp} onChange={e => set('followUp', e.target.value)} />
              </FormField>
              <div className="col-span-2">
                <FormField label="Notes">
                  <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
                </FormField>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirm Modal ────────────────────────────────────────── */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete this lead?" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete Lead</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{lead.leadName}</span>{' '}
          will be permanently removed from the intercom leads list.
        </p>
      </Modal>

      {/* ── Stage Action Modals ─────────────────────────────────────────── */}
      <RequestFeasibilityModal
        isOpen={feasibilityModalOpen}
        onClose={() => setFeasibilityModalOpen(false)}
        onSubmit={handleRequestFeasibility}
      />
      <NotFeasibleModal
        isOpen={notFeasibleModalOpen}
        onClose={() => setNotFeasibleModalOpen(false)}
        onSubmit={handleMarkNotFeasible}
      />
      <ConfirmBookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        onSubmit={handleConfirmBooking}
      />

    </div>
  )
}

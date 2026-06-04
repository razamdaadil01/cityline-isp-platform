import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft, CalendarDays, User, MapPin, Package, Wrench,
  Phone, ChevronRight, Edit2, Plus, Trash2, CheckCircle2,
} from 'lucide-react'
import {
  getInstallations, saveInstallation, subscribeInstallations, FIELD_ENGINEERS,
} from '../data/installationsStore'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'

const TODAY = new Date().toISOString().split('T')[0]

const STATUS_CHIP = {
  'Pending':     'bg-gray-100 text-gray-500',
  'Assigned':    'bg-blue-100 text-blue-700',
  'Scheduled':   'bg-purple-100 text-purple-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  'Completed':   'bg-emerald-100 text-emerald-700',
  'Cancelled':   'bg-red-100 text-red-600',
}

const TIMELINE_STATUSES = ['Pending', 'Assigned', 'Scheduled', 'In Progress', 'Completed']

function formatDate(d) {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatSlotDate(d) {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  if (d === TODAY) return `Today — ${dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

// ── InfoRow ───────────────────────────────────────────────────────────────────

function InfoRow({ label, value, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 shrink-0 w-36">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right flex-1">{children ?? value ?? '—'}</span>
    </div>
  )
}

// ── EditSlotModal ─────────────────────────────────────────────────────────────

function EditSlotModal({ isOpen, onClose, inst, onSave }) {
  const [form, setForm] = useState({ date: '', time: '', notes: '' })
  useEffect(() => {
    if (isOpen && inst) setForm({ date: inst.slotDate, time: inst.slotTime, notes: inst.notes ?? '' })
  }, [isOpen, inst])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Installation Slot"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.date || !form.time}
            onClick={() => onSave({ ...inst, slotDate: form.date, slotTime: form.time, notes: form.notes })}>
            Update Slot
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Installation Date" required>
          <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </FormField>
        <FormField label="Installation Time" required>
          <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
        </FormField>
        <FormField label="Notes">
          <Textarea rows={3} placeholder="Any slot-specific notes..."
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </FormField>
      </div>
    </Modal>
  )
}

// ── AssignEngineerModal ───────────────────────────────────────────────────────

function AssignEngineerModal({ isOpen, onClose, inst, onSave }) {
  const [engineerId, setEngineerId] = useState('')
  const [notes, setNotes] = useState('')
  useEffect(() => {
    if (isOpen && inst) { setEngineerId(inst.engineerId ?? ''); setNotes('') }
  }, [isOpen, inst])

  const eng = FIELD_ENGINEERS.find(e => e.id === engineerId)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={inst?.engineerId ? 'Reassign Engineer' : 'Assign Engineer'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!engineerId} onClick={() => {
            const e = FIELD_ENGINEERS.find(x => x.id === engineerId)
            const updated = {
              ...inst,
              engineerId: e.id,
              engineerName: e.name,
              status: inst.status === 'Pending' ? 'Assigned' : inst.status,
              timeline: [
                ...inst.timeline,
                { status: inst.status === 'Pending' ? 'Assigned' : inst.status, date: TODAY, by: e.name },
              ],
            }
            onSave(updated)
          }}>
            {inst?.engineerId ? 'Reassign' : 'Assign'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Field Engineer" required>
          <Select value={engineerId} onChange={e => setEngineerId(e.target.value)}>
            <option value="">Select engineer…</option>
            {FIELD_ENGINEERS.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </Select>
        </FormField>
        {eng && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-surface-border">
            <div className={`w-9 h-9 rounded-full ${eng.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
              {eng.initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{eng.name}</p>
              <p className="text-xs text-gray-500">Field Engineer</p>
            </div>
          </div>
        )}
        <FormField label="Notes">
          <Textarea rows={2} placeholder="Optional assignment notes..."
            value={notes} onChange={e => setNotes(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  )
}

// ── HardwareModal ─────────────────────────────────────────────────────────────

function HardwareModal({ isOpen, onClose, inst, onSave }) {
  const [hwRequired, setHwRequired] = useState(false)
  const [hardware, setHardware] = useState([])
  const [wireRequired, setWireRequired] = useState(false)
  const [wires, setWires] = useState([])

  useEffect(() => {
    if (isOpen && inst) {
      setHwRequired(inst.hardwareRequired ?? false)
      setHardware(inst.hardware?.map(h => ({ ...h })) ?? [])
      setWireRequired(inst.wireRequired ?? false)
      setWires(inst.wires?.map(w => ({ ...w })) ?? [])
    }
  }, [isOpen, inst])

  function addItem(setter) { setter(prev => [...prev, { name: '', qty: 1 }]) }
  function removeItem(setter, idx) { setter(prev => prev.filter((_, i) => i !== idx)) }
  function updateItem(setter, idx, field, val) {
    setter(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hardware & Wire Requirements" size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({
            ...inst,
            hardwareRequired: hwRequired,
            hardware: hwRequired ? hardware.filter(h => h.name.trim()) : [],
            wireRequired,
            wires: wireRequired ? wires.filter(w => w.name.trim()) : [],
          })}>
            Save Requirements
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Hardware */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <label className="text-sm font-medium text-gray-700">Hardware Required</label>
            <button type="button"
              onClick={() => setHwRequired(v => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${hwRequired ? 'bg-brand-blue' : 'bg-gray-300'}`}
            >
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${hwRequired ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {hwRequired && (
            <div className="space-y-2">
              {hardware.map((h, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={h.name} placeholder="Item name"
                    onChange={e => updateItem(setHardware, i, 'name', e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                  <input type="number" min="1" value={h.qty}
                    onChange={e => updateItem(setHardware, i, 'qty', Number(e.target.value))}
                    className="w-16 px-2 py-1.5 text-sm border border-surface-border rounded-lg focus:outline-none text-center" />
                  <button onClick={() => removeItem(setHardware, i)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button onClick={() => addItem(setHardware)}
                className="flex items-center gap-1.5 text-xs text-brand-blue hover:text-brand-blue/80 font-medium mt-1">
                <Plus size={12} /> Add Item
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-surface-border pt-4">
          <div className="flex items-center gap-3 mb-3">
            <label className="text-sm font-medium text-gray-700">Wire/Cable Required</label>
            <button type="button"
              onClick={() => setWireRequired(v => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${wireRequired ? 'bg-brand-blue' : 'bg-gray-300'}`}
            >
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${wireRequired ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {wireRequired && (
            <div className="space-y-2">
              {wires.map((w, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={w.name} placeholder="Cable/wire name"
                    onChange={e => updateItem(setWires, i, 'name', e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                  <input type="number" min="1" value={w.qty}
                    onChange={e => updateItem(setWires, i, 'qty', Number(e.target.value))}
                    className="w-16 px-2 py-1.5 text-sm border border-surface-border rounded-lg focus:outline-none text-center" />
                  <button onClick={() => removeItem(setWires, i)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button onClick={() => addItem(setWires)}
                className="flex items-center gap-1.5 text-xs text-brand-blue hover:text-brand-blue/80 font-medium mt-1">
                <Plus size={12} /> Add Item
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function InstallationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [installations, setInstallations] = useState(getInstallations)
  const [noteText, setNoteText] = useState('')

  useEffect(() => subscribeInstallations(setInstallations), [])

  const action = searchParams.get('action')
  const editSlotOpen  = action === 'edit-slot'
  const assignOpen    = action === 'assign-engineer'
  const hwOpen        = action === 'add-hardware'
  const cancelOpen    = action === 'cancel'

  function openAction(a) { setSearchParams({ action: a }) }
  function closeAction()  { setSearchParams({}) }

  const inst = installations.find(i => i.id === id)

  if (!inst) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64">
        <p className="text-gray-500 text-sm">Installation not found.</p>
        <button onClick={() => navigate('/installations')} className="mt-3 text-brand-blue text-sm hover:underline">
          Back to Installations
        </button>
      </div>
    )
  }

  function handleSave(updated) {
    saveInstallation(updated)
    closeAction()
  }

  function handleCancel() {
    saveInstallation({
      ...inst,
      status: 'Cancelled',
      timeline: [...inst.timeline, { status: 'Cancelled', date: TODAY, by: 'Admin' }],
    })
    closeAction()
  }

  function handleAddNote() {
    if (!noteText.trim()) return
    saveInstallation({
      ...inst,
      notes: inst.notes ? `${inst.notes}\n${noteText.trim()}` : noteText.trim(),
    })
    setNoteText('')
  }

  const eng = FIELD_ENGINEERS.find(e => e.id === inst.engineerId)
  const totalHwItems = (inst.hardware?.length ?? 0) + (inst.wires?.length ?? 0)

  const completedStatuses = new Set(inst.timeline.map(t => t.status))
  const currentStatusIndex = TIMELINE_STATUSES.indexOf(inst.status)

  return (
    <div className="p-6 max-w-[1400px] space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/installations')}
            className="w-8 h-8 rounded-lg border border-surface-border flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">{inst.id}</h1>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_CHIP[inst.status]}`}>
                {inst.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{inst.customerName} · {inst.area}, {inst.city}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {inst.status !== 'Completed' && inst.status !== 'Cancelled' && (
            <Button variant="secondary" size="sm" icon={<Wrench size={14} />} onClick={() => openAction('add-hardware')}>
              Hardware
            </Button>
          )}
          {inst.status !== 'Completed' && inst.status !== 'Cancelled' && (
            <Button size="sm" icon={<Edit2 size={14} />} onClick={() => openAction('edit-slot')}>
              Edit Slot
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left Column ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Customer Details */}
          <div className="bg-white rounded-xl shadow-card border border-surface-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-brand-blue/10 rounded-lg flex items-center justify-center">
                <User size={14} className="text-brand-blue" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Customer Details</h2>
            </div>
            <InfoRow label="Customer Name" value={inst.customerName} />
            <InfoRow label="Phone">
              <a href={`tel:${inst.customerPhone}`} className="text-brand-blue hover:underline font-medium">
                {inst.customerPhone}
              </a>
            </InfoRow>
            <InfoRow label="Plan" value={inst.plan} />
            <InfoRow label="Created On" value={formatDate(inst.createdAt)} />
            {inst.leadId && (
              <InfoRow label="Lead ID">
                <Link to={`/sales/leads/${inst.leadId}/overview`}
                  className="text-brand-blue hover:underline font-medium flex items-center gap-1">
                  {inst.leadId} <ChevronRight size={12} />
                </Link>
              </InfoRow>
            )}
          </div>

          {/* Address Details */}
          <div className="bg-white rounded-xl shadow-card border border-surface-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                <MapPin size={14} className="text-emerald-600" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Address Details</h2>
            </div>
            <InfoRow label="Address" value={inst.address} />
            <InfoRow label="Area" value={inst.area} />
            <InfoRow label="City" value={inst.city} />
            <InfoRow label="Pincode" value={inst.pincode} />
          </div>

          {/* Hardware & Wire Requirements */}
          <div className="bg-white rounded-xl shadow-card border border-surface-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Package size={14} className="text-amber-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Hardware & Wire Requirements</h2>
              </div>
              {inst.status !== 'Completed' && inst.status !== 'Cancelled' && (
                <button onClick={() => openAction('add-hardware')}
                  className="text-xs text-brand-blue hover:underline font-medium flex items-center gap-1">
                  <Edit2 size={12} /> Edit
                </button>
              )}
            </div>

            {totalHwItems === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No hardware requirements added</p>
            ) : (
              <div className="space-y-3">
                {inst.hardwareRequired && inst.hardware.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Hardware</p>
                    <div className="space-y-1.5">
                      {inst.hardware.map((h, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-sm text-gray-700">{h.name}</span>
                          <span className="text-xs font-semibold bg-white border border-surface-border px-2 py-0.5 rounded-full text-gray-600">×{h.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {inst.wireRequired && inst.wires.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Wire / Cable</p>
                    <div className="space-y-1.5">
                      {inst.wires.map((w, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-sm text-gray-700">{w.name}</span>
                          <span className="text-xs font-semibold bg-white border border-surface-border px-2 py-0.5 rounded-full text-gray-600">×{w.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-card border border-surface-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center">
                <Edit2 size={14} className="text-purple-600" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Notes</h2>
            </div>
            {inst.notes ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{inst.notes}</p>
            ) : (
              <p className="text-xs text-gray-400 mb-3">No notes added yet.</p>
            )}
            {inst.status !== 'Completed' && inst.status !== 'Cancelled' && (
              <div className="flex gap-2">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add a note…"
                  rows={2}
                  className="flex-1 px-3 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue resize-none"
                />
                <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim()}>
                  Add
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-4">

          {/* Installation Slot */}
          <div className="bg-white rounded-xl shadow-card border border-surface-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                  <CalendarDays size={14} className="text-brand-blue" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Installation Slot</h2>
              </div>
              {inst.status !== 'Completed' && inst.status !== 'Cancelled' && (
                <button onClick={() => openAction('edit-slot')}
                  className="text-xs text-brand-blue hover:underline font-medium flex items-center gap-1">
                  <Edit2 size={12} /> Edit
                </button>
              )}
            </div>
            <div className="bg-brand-blue/5 rounded-xl p-4 border border-brand-blue/20 text-center">
              <p className="text-xs text-brand-blue/70 font-medium uppercase tracking-wide mb-1">Scheduled</p>
              <p className="text-base font-bold text-gray-900">{formatSlotDate(inst.slotDate)}</p>
              <p className="text-lg font-bold text-brand-blue mt-1">{inst.slotTime}</p>
            </div>
          </div>

          {/* Assigned Engineer */}
          <div className="bg-white rounded-xl shadow-card border border-surface-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-teal-50 rounded-lg flex items-center justify-center">
                  <User size={14} className="text-teal-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Assigned Engineer</h2>
              </div>
              {inst.status !== 'Completed' && inst.status !== 'Cancelled' && (
                <button onClick={() => openAction('assign-engineer')}
                  className="text-xs text-brand-blue hover:underline font-medium flex items-center gap-1">
                  <Edit2 size={12} /> {inst.engineerId ? 'Reassign' : 'Assign'}
                </button>
              )}
            </div>
            {eng ? (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-surface-border">
                <div className={`w-10 h-10 rounded-full ${eng.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                  {eng.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{eng.name}</p>
                  <p className="text-xs text-gray-500">Field Engineer</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                  <User size={18} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No engineer assigned</p>
                {inst.status !== 'Completed' && inst.status !== 'Cancelled' && (
                  <button onClick={() => openAction('assign-engineer')}
                    className="mt-2 text-xs text-brand-blue hover:underline font-medium">
                    Assign now
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Status Timeline */}
          <div className="bg-white rounded-xl shadow-card border border-surface-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
                <CheckCircle2 size={14} className="text-indigo-600" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Status Timeline</h2>
            </div>
            <div className="relative">
              <div className="absolute left-[13px] top-0 bottom-0 w-px bg-gray-100" />
              <div className="space-y-4">
                {TIMELINE_STATUSES.map((status, idx) => {
                  const entry = inst.timeline.find(t => t.status === status)
                  const isDone = completedStatuses.has(status)
                  const isCurrent = inst.status === status

                  return (
                    <div key={status} className="flex items-start gap-3 relative">
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${
                        isDone
                          ? isCurrent
                            ? 'border-brand-blue bg-brand-blue'
                            : 'border-emerald-500 bg-emerald-500'
                          : 'border-gray-200 bg-white'
                      }`}>
                        {isDone
                          ? <CheckCircle2 size={14} className="text-white" />
                          : <span className="w-2 h-2 rounded-full bg-gray-200" />
                        }
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className={`text-sm font-medium ${isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                          {status}
                        </p>
                        {entry && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(entry.date)} · {entry.by}
                          </p>
                        )}
                      </div>
                      {isCurrent && inst.status !== 'Completed' && (
                        <span className="text-[10px] font-semibold text-brand-blue bg-blue-50 px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                          Current
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditSlotModal isOpen={editSlotOpen} onClose={closeAction} inst={inst} onSave={handleSave} />
      <AssignEngineerModal isOpen={assignOpen} onClose={closeAction} inst={inst} onSave={handleSave} />
      <HardwareModal isOpen={hwOpen} onClose={closeAction} inst={inst} onSave={handleSave} />
      <Modal isOpen={cancelOpen} onClose={closeAction} title="Mark as Cancelled"
        footer={
          <>
            <Button variant="secondary" onClick={closeAction}>Keep Installation</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white border-red-600" onClick={handleCancel}>
              Confirm Cancellation
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Are you sure you want to cancel this installation for <span className="font-semibold">{inst.customerName}</span>?
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-xs text-red-700 font-medium">{inst.id} · {inst.area}, {inst.city}</p>
            <p className="text-xs text-red-600 mt-1">Slot: {inst.slotDate} at {inst.slotTime}</p>
          </div>
          <p className="text-xs text-gray-400">This action cannot be undone.</p>
        </div>
      </Modal>
    </div>
  )
}

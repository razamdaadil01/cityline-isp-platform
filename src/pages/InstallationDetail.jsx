import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, CalendarDays, Package, Wrench,
  ChevronRight, Plus, Trash2, CheckCircle2, Users, Truck,
  RefreshCw, XCircle, Play, AlertTriangle, Clock, ExternalLink,
} from 'lucide-react'
import {
  getInstallations, saveInstallation, subscribeInstallations,
  updateInstallationStatus, FIELD_ENGINEERS, INSTALLATION_TEAMS,
} from '../data/installationsStore'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Card, { CardHeader } from '../components/ui/Card'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'

/* ── Constants ─────────────────────────────────────────────────── */

const TODAY = new Date().toISOString().split('T')[0]

const STATUS_CHIP = {
  'Scheduled':                  'bg-blue-100 text-blue-700',
  'Assigned':                   'bg-purple-100 text-purple-700',
  'Hardware Collection Pending':'bg-amber-100 text-amber-700',
  'Dispatched':                 'bg-orange-100 text-orange-700',
  'In Progress':                'bg-amber-100 text-amber-700',
  'Completed':                  'bg-emerald-100 text-emerald-700',
  'Rescheduled':                'bg-yellow-100 text-yellow-700',
  'Cancelled':                  'bg-red-100 text-red-600',
}

const TIMELINE_STAGES = [
  'Scheduled',
  'Assigned',
  'Hardware Collection Pending',
  'Dispatched',
  'In Progress',
  'Completed',
]

const RESCHEDULE_REASONS = [
  'Customer Not Available',
  'Engineer Unavailable',
  'Hardware Not Ready',
  'Weather Conditions',
  'Other',
]

/* ── Helpers ────────────────────────────────────────────────────── */

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

/* ── Sub-components ─────────────────────────────────────────────── */

function SectionCard({ title, icon: Icon, iconBg, iconColor, children, action }) {
  return (
    <div className="bg-white rounded-xl shadow-card border border-surface-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 ${iconBg} rounded-lg flex items-center justify-center`}>
            <Icon size={14} className={iconColor} />
          </div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// Address Details' header-action Google Maps link — same technique as
// FeasibilityDetail.jsx's GoogleMapsLink (google.com/maps/search deep link,
// same icon/label styling, opens in a new tab), but built from the address
// text fields since installation records don't carry GPS coordinates the
// way feasibility requests do.
function GoogleMapsLink({ inst }) {
  const query = [inst.address, inst.locality, inst.area, inst.city, inst.pincode].filter(Boolean).join(', ')
  if (!query) return null

  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline shrink-0"
    >
      View on Google Map <ExternalLink size={12} />
    </a>
  )
}

// Grid-cell field — label above value — matching the pattern already used
// for Lead Detail's Basic/Customer/Address Details cards (SalesLeadDetail.jsx's
// InfoCell): two cells side by side per row via a `grid grid-cols-2` wrapper
// on the caller's side.
function InfoCell({ label, value, children, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xs font-medium mt-1 text-gray-800">
        {children ?? value ?? <span className="text-gray-300 font-normal">—</span>}
      </p>
    </div>
  )
}

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl">
      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
      {msg}
    </div>
  )
}

/* ── Assign Team Modal ──────────────────────────────────────────── */

function AssignTeamModal({ isOpen, onClose, inst, onSave }) {
  const [form, setForm] = useState({ team: '', engineers: [], date: '', slot: 'Morning', notes: '' })

  useEffect(() => {
    if (isOpen && inst) {
      setForm({
        team:      inst.assignedTeam || '',
        engineers: inst.engineerName ? inst.engineerName.split(', ').filter(Boolean) : [],
        date:      inst.slotDate || '',
        slot:      inst.slot || 'Morning',
        notes:     '',
      })
    }
  }, [isOpen, inst])

  function toggleEng(name) {
    setForm(f => ({
      ...f,
      engineers: f.engineers.includes(name) ? f.engineers.filter(e => e !== name) : [...f.engineers, name],
    }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Team — ${inst?.id}`} size="sm"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm"
          disabled={!form.team || form.engineers.length === 0 || !form.date}
          onClick={() => onSave({
            ...inst,
            assignedTeam: form.team,
            engineerName: form.engineers.join(', '),
            slotDate:     form.date,
            slot:         form.slot,
            status:       inst.status === 'Scheduled' ? 'Assigned' : inst.status,
            timeline: [...(inst.timeline || []), {
              status: inst.status === 'Scheduled' ? 'Assigned' : inst.status,
              date: TODAY, by: 'Admin',
              note: `Assigned to ${form.team} — ${form.engineers.join(', ')}`,
            }],
          })}>
          Assign Team
        </Button>
      </>}
    >
      <div className="space-y-4">
        <FormField label="Installation Team" required>
          <Select value={form.team} onChange={e => setForm(f => ({ ...f, team: e.target.value }))}>
            <option value="">Select team…</option>
            {INSTALLATION_TEAMS.map(t => <option key={t}>{t}</option>)}
          </Select>
        </FormField>
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Engineers <span className="text-red-500">*</span></p>
          <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden">
            {FIELD_ENGINEERS.map(eng => (
              <label key={eng.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                <input type="checkbox"
                  checked={form.engineers.includes(eng.name)}
                  onChange={() => toggleEng(eng.name)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                />
                <div className={`w-6 h-6 rounded-full ${eng.color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
                  {eng.initials}
                </div>
                <span className="text-sm text-gray-700">{eng.name}</span>
              </label>
            ))}
          </div>
        </div>
        <FormField label="Installation Date" required>
          <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </FormField>
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Installation Slot</p>
          <div className="flex gap-4">
            {['Morning','Afternoon','Evening'].map(s => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="detail-assign-slot" value={s}
                  checked={form.slot === s}
                  onChange={() => setForm(f => ({ ...f, slot: s }))}
                  className="w-4 h-4 text-brand-blue focus:ring-brand-blue/30"
                />
                <span className="text-sm text-gray-700">{s}</span>
              </label>
            ))}
          </div>
        </div>
        <FormField label="Internal Notes">
          <Textarea rows={2} placeholder="Notes for the team…"
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </FormField>
      </div>
    </Modal>
  )
}

/* ── Reschedule Modal ───────────────────────────────────────────── */

function RescheduleModal({ isOpen, onClose, inst, onSave }) {
  const [form, setForm] = useState({ date: '', slot: 'Morning', reason: '', remarks: '' })

  useEffect(() => {
    if (isOpen && inst) setForm({ date: inst.slotDate || '', slot: inst.slot || 'Morning', reason: '', remarks: '' })
  }, [isOpen, inst])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Reschedule — ${inst?.id}`} size="sm"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" disabled={!form.date || !form.reason}
          onClick={() => {
            const histEntry = {
              originalDate: inst.slotDate, originalSlot: inst.slot || '—',
              newDate: form.date, newSlot: form.slot,
              reason: form.reason, remarks: form.remarks,
              by: 'Admin', when: TODAY,
            }
            onSave({
              ...inst,
              slotDate: form.date, slot: form.slot,
              status: 'Rescheduled',
              rescheduleReason: form.reason,
              rescheduleRemarks: form.remarks,
              rescheduleHistory: [...(inst.rescheduleHistory || []), histEntry],
              timeline: [...(inst.timeline || []), {
                status: 'Rescheduled', date: TODAY, by: 'Admin',
                note: `Rescheduled to ${form.date} (${form.slot}) — ${form.reason}`,
              }],
            })
          }}>
          Reschedule
        </Button>
      </>}
    >
      <div className="space-y-4">
        <FormField label="New Installation Date" required>
          <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </FormField>
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">New Slot</p>
          <div className="flex gap-4">
            {['Morning','Afternoon','Evening'].map(s => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="resched-detail-slot" value={s}
                  checked={form.slot === s}
                  onChange={() => setForm(f => ({ ...f, slot: s }))}
                  className="w-4 h-4 text-brand-blue focus:ring-brand-blue/30"
                />
                <span className="text-sm text-gray-700">{s}</span>
              </label>
            ))}
          </div>
        </div>
        <FormField label="Reschedule Reason" required>
          <Select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
            <option value="">Select reason…</option>
            {RESCHEDULE_REASONS.map(r => <option key={r}>{r}</option>)}
          </Select>
        </FormField>
        <FormField label="Remarks">
          <Textarea rows={2} placeholder="Additional remarks…"
            value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
        </FormField>
      </div>
    </Modal>
  )
}

/* ── Hardware Modal ─────────────────────────────────────────────── */

function HardwareModal({ isOpen, onClose, inst, onSave }) {
  const [hardware, setHardware] = useState([])
  const [wires,    setWires]    = useState([])

  useEffect(() => {
    if (isOpen && inst) {
      setHardware(inst.hardware?.map(h => ({ ...h })) ?? [{ name: '', qty: 1, unit: 'pcs' }])
      setWires(inst.wires?.map(w => ({ ...w })) ?? [])
    }
  }, [isOpen, inst])

  function addHw()  { setHardware(p => [...p, { name: '', qty: 1, unit: 'pcs' }]) }
  function addWire(){ setWires(p => [...p, { name: '', qty: 1, unit: 'm' }]) }
  function updHw(i, k, v)   { setHardware(p => p.map((h, j) => j === i ? { ...h, [k]: v } : h)) }
  function updWire(i, k, v) { setWires(p => p.map((w, j) => j === i ? { ...w, [k]: v } : w)) }
  function remHw(i)   { setHardware(p => p.filter((_, j) => j !== i)) }
  function remWire(i) { setWires(p => p.filter((_, j) => j !== i)) }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hardware Requirements" size="lg"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave({
          ...inst,
          hardwareRequired: hardware.filter(h => h.name.trim()).length > 0,
          hardware: hardware.filter(h => h.name.trim()),
          wireRequired: wires.filter(w => w.name.trim()).length > 0,
          wires: wires.filter(w => w.name.trim()),
        })}>Save Requirements</Button>
      </>}
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Hardware Items</p>
            <button onClick={addHw} className="flex items-center gap-1 text-xs text-brand-blue font-medium hover:underline">
              <Plus size={11} /> Add Item
            </button>
          </div>
          {hardware.length === 0 ? (
            <p className="text-xs text-gray-400 py-3 text-center">No hardware items. Click "Add Item".</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_70px_80px_28px] gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1">
                <span>Item Name</span><span>Qty</span><span>Unit</span><span />
              </div>
              {hardware.map((h, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_80px_28px] gap-2 items-center">
                  <input value={h.name} placeholder="Item name"
                    onChange={e => updHw(i, 'name', e.target.value)}
                    className="px-3 py-1.5 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                  <input type="number" min="1" value={h.qty}
                    onChange={e => updHw(i, 'qty', Number(e.target.value))}
                    className="px-2 py-1.5 text-sm border border-surface-border rounded-lg focus:outline-none text-center" />
                  <input value={h.unit || 'pcs'} placeholder="pcs"
                    onChange={e => updHw(i, 'unit', e.target.value)}
                    className="px-2 py-1.5 text-sm border border-surface-border rounded-lg focus:outline-none" />
                  <button onClick={() => remHw(i)} className="text-gray-300 hover:text-red-500 transition-colors flex items-center justify-center">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-surface-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Wire / Cable</p>
            <button onClick={addWire} className="flex items-center gap-1 text-xs text-brand-blue font-medium hover:underline">
              <Plus size={11} /> Add Wire
            </button>
          </div>
          {wires.length === 0 ? (
            <p className="text-xs text-gray-400 py-3 text-center">No wire items added.</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_70px_80px_28px] gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1">
                <span>Cable Name</span><span>Qty</span><span>Unit</span><span />
              </div>
              {wires.map((w, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_80px_28px] gap-2 items-center">
                  <input value={w.name} placeholder="Cable name"
                    onChange={e => updWire(i, 'name', e.target.value)}
                    className="px-3 py-1.5 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
                  <input type="number" min="1" value={w.qty}
                    onChange={e => updWire(i, 'qty', Number(e.target.value))}
                    className="px-2 py-1.5 text-sm border border-surface-border rounded-lg focus:outline-none text-center" />
                  <input value={w.unit || 'm'} placeholder="m"
                    onChange={e => updWire(i, 'unit', e.target.value)}
                    className="px-2 py-1.5 text-sm border border-surface-border rounded-lg focus:outline-none" />
                  <button onClick={() => remWire(i)} className="text-gray-300 hover:text-red-500 transition-colors flex items-center justify-center">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

/* ── Main Component ─────────────────────────────────────────────── */

export default function InstallationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [installations, setInstallations] = useState(getInstallations)
  const [noteText, setNoteText] = useState('')
  const [toast, setToast] = useState('')

  /* Modal open state */
  const [assignOpen,    setAssignOpen]    = useState(false)
  const [reschedOpen,   setReschedOpen]   = useState(false)
  const [hwOpen,        setHwOpen]        = useState(false)
  const [completeOpen,  setCompleteOpen]  = useState(false)
  const [failOpen,      setFailOpen]      = useState(false)
  const [cancelOpen,    setCancelOpen]    = useState(false)
  const [dispatchOpen,  setDispatchOpen]  = useState(false)
  const [progressOpen,  setProgressOpen]  = useState(false)

  useEffect(() => subscribeInstallations(setInstallations), [])

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

  /* ── Save helpers ──────────────────────────────────────────────── */

  function save(updated) { saveInstallation(updated) }

  function doStatus(status, extra = {}) {
    return updateInstallationStatus(inst.id, status, extra)
  }

  function handleAddNote() {
    if (!noteText.trim()) return
    saveInstallation({ ...inst, notes: inst.notes ? `${inst.notes}\n${noteText.trim()}` : noteText.trim() })
    setNoteText('')
  }

  /* ── Derived ───────────────────────────────────────────────────── */

  const status = inst.status
  const isDone = status === 'Completed' || status === 'Cancelled' || status === 'Failed'
  const allHwItems = [...(inst.hardware || []), ...(inst.wires || [])]
  const hasTeam = !!(inst.assignedTeam || inst.engineerName)
  const reschedHistory = inst.rescheduleHistory || []
  const hasSingleReschedule = !reschedHistory.length && inst.rescheduleReason

  /* Build reschedule history display from both legacy field and new array */
  const reschedRows = reschedHistory.length > 0
    ? reschedHistory
    : hasSingleReschedule
      ? [{ originalDate: '—', originalSlot: '—', newDate: inst.slotDate, newSlot: inst.slot || '—',
           reason: inst.rescheduleReason, remarks: inst.rescheduleRemarks || '', by: 'Admin', when: '—' }]
      : []

  /* ── Status action buttons ─────────────────────────────────────── */

  const actionBtnCls = (variant) => {
    const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors'
    if (variant === 'blue')    return `${base} bg-blue-50 text-brand-blue border-brand-blue/30 hover:bg-blue-100`
    if (variant === 'amber')   return `${base} bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100`
    if (variant === 'orange')  return `${base} bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100`
    if (variant === 'green')   return `${base} bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100`
    if (variant === 'red')     return `${base} bg-red-50 text-red-600 border-red-200 hover:bg-red-100`
    if (variant === 'yellow')  return `${base} bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100`
    return `${base} bg-white text-gray-600 border-surface-border hover:bg-gray-50`
  }

  let actionButtons = null
  if (status === 'Scheduled' || status === 'Assigned' || status === 'Rescheduled') {
    actionButtons = (
      <>
        <button onClick={() => setAssignOpen(true)} className={actionBtnCls('blue')}>
          <Users size={13} /> Assign Team
        </button>
        <button onClick={() => setReschedOpen(true)} className={actionBtnCls('yellow')}>
          <RefreshCw size={13} /> Reschedule
        </button>
        <button onClick={() => setHwOpen(true)} className={actionBtnCls('default')}>
          <Package size={13} /> Add Hardware
        </button>
      </>
    )
  } else if (status === 'Hardware Collection Pending') {
    actionButtons = (
      <>
        <button onClick={() => setDispatchOpen(true)} className={actionBtnCls('orange')}>
          <Truck size={13} /> Move to Dispatch
        </button>
        <button onClick={() => setReschedOpen(true)} className={actionBtnCls('yellow')}>
          <RefreshCw size={13} /> Reschedule
        </button>
      </>
    )
  } else if (status === 'Dispatched') {
    actionButtons = (
      <>
        <button onClick={() => setProgressOpen(true)} className={actionBtnCls('amber')}>
          <Play size={13} /> Mark In Progress
        </button>
        <button onClick={() => setReschedOpen(true)} className={actionBtnCls('yellow')}>
          <RefreshCw size={13} /> Reschedule
        </button>
      </>
    )
  } else if (status === 'In Progress') {
    actionButtons = (
      <>
        <button onClick={() => setCompleteOpen(true)} className={actionBtnCls('green')}>
          <CheckCircle2 size={13} /> Mark Completed
        </button>
        <button onClick={() => setFailOpen(true)} className={actionBtnCls('red')}>
          <XCircle size={13} /> Mark Failed
        </button>
      </>
    )
  }

  /* ── Timeline helpers ──────────────────────────────────────────── */

  const timelineMap = {}
  ;(inst.timeline || []).forEach(t => {
    if (!timelineMap[t.status]) timelineMap[t.status] = t
  })

  const stageIndex    = TIMELINE_STAGES.indexOf(status)
  const isCompleted   = status === 'Completed'
  const isCancelled   = status === 'Cancelled' || status === 'Failed'

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/installations')}
            className="w-8 h-8 rounded-lg border border-surface-border flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-[12px] mb-0.5">
              <button onClick={() => navigate('/installations')} className="text-gray-400 hover:underline">Installations</button>
              <span className="text-gray-300">›</span>
              <span className="text-gray-500">{inst.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">{inst.id}</h1>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_CHIP[status] ?? 'bg-gray-100 text-gray-500'}`}>
                {status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{inst.customerName} · {inst.area}, {inst.city}</p>
          </div>
        </div>
        {actionButtons && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {actionButtons}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left Column ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Customer Details */}
          <Card className="px-4">
            <CardHeader title="Customer Details" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <InfoCell label="Customer Name" value={inst.customerName} />
              <InfoCell label="Phone">
                <a href={`tel:${inst.customerPhone}`} className="text-brand-blue hover:underline font-medium">{inst.customerPhone}</a>
              </InfoCell>
              <InfoCell label="Plan" value={inst.plan} />
              <InfoCell label="Priority">
                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  inst.priority === 'High'   ? 'bg-red-100 text-red-600' :
                  inst.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                               'bg-gray-100 text-gray-500'}`}>
                  {inst.priority || '—'}
                </span>
              </InfoCell>
              <InfoCell label="Branch" value={inst.branch} />
              <InfoCell label="Created On" value={formatDate(inst.createdAt)} />
              <InfoCell label="Created By" value={inst.createdBy} />
              {inst.leadId && (
                <InfoCell label="Lead ID">
                  <Link to={`/sales/leads/${inst.leadId}/overview`}
                    className="text-brand-blue hover:underline font-medium inline-flex items-center gap-1">
                    {inst.leadId} <ChevronRight size={12} />
                  </Link>
                </InfoCell>
              )}
              {inst.customerId && (
                <InfoCell label="Customer">
                  <Link to={`/customers/${inst.customerId}/profile`}
                    className="text-brand-blue hover:underline font-medium inline-flex items-center gap-1">
                    {inst.customerId} <ChevronRight size={12} />
                  </Link>
                </InfoCell>
              )}
            </div>
          </Card>

          {/* Address Details */}
          <Card className="px-4">
            <CardHeader title="Address Details" action={<GoogleMapsLink inst={inst} />} />
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <InfoCell label="Address"  value={inst.address} />
              <InfoCell label="Locality" value={inst.locality} />
              <InfoCell label="Area"     value={inst.area} />
              <InfoCell label="City"     value={inst.city} />
              <InfoCell label="Pincode"  value={inst.pincode} />
            </div>
          </Card>

          {/* Team Details (if assigned) */}
          {hasTeam && (
            <Card className="px-4">
              <CardHeader title="Team Details" action={
                !isDone && (
                  <button onClick={() => setAssignOpen(true)}
                    className="text-xs text-brand-blue hover:underline font-medium">
                    Reassign
                  </button>
                )
              } />
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <InfoCell label="Installation Team"   value={inst.assignedTeam} />
                <InfoCell label="Assigned Engineer(s)" value={inst.engineerName} />
                <InfoCell label="Installation Date"   value={formatSlotDate(inst.slotDate)} />
                <InfoCell label="Installation Slot">
                  {inst.slot && (
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      inst.slot === 'Morning'   ? 'bg-yellow-50 text-yellow-700' :
                      inst.slot === 'Afternoon' ? 'bg-orange-50 text-orange-600' :
                                                  'bg-indigo-50 text-indigo-600'}`}>
                      {inst.slot}
                    </span>
                  )}
                </InfoCell>
                {inst.timeline?.filter(t => t.status === 'Assigned').slice(-1).map((t, i) => (
                  <InfoCell key={i} label="Assigned By" value={`${t.by} · ${formatDate(t.date)}`} />
                ))}
              </div>
            </Card>
          )}

          {/* Hardware Requirements */}
          <Card className="px-4">
            <CardHeader title="Hardware Requirements" action={
              !isDone && (
                <button onClick={() => setHwOpen(true)}
                  className="flex items-center gap-1 text-xs text-brand-blue hover:underline font-medium">
                  <Plus size={11} /> Add Hardware
                </button>
              )
            } />
            {allHwItems.length === 0 ? (
              <div className="text-center py-5">
                <Package size={20} className="mx-auto text-gray-200 mb-2" />
                <p className="text-xs text-gray-400">No hardware requirements added</p>
                {!isDone && (
                  <button onClick={() => setHwOpen(true)}
                    className="mt-2 text-xs text-brand-blue hover:underline font-medium">
                    + Add hardware
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-surface-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-surface-border text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="px-3 py-2 text-left">Item Name</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-left">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {allHwItems.map((h, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 text-xs text-gray-800 font-medium">{h.name}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 text-center">{h.qty}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{h.unit || 'pcs'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Reschedule History (only if rescheduled at least once) */}
          {reschedRows.length > 0 && (
            <SectionCard title="Reschedule History" icon={RefreshCw} iconBg="bg-yellow-50" iconColor="text-yellow-600">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-surface-border bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      {['Original Date','Original Slot','New Date','New Slot','Reason','By','When'].map(h => (
                        <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {reschedRows.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.originalDate || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.originalSlot || '—'}</td>
                        <td className="px-3 py-2 text-gray-800 font-medium whitespace-nowrap">{r.newDate || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.newSlot || '—'}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.reason || '—'}</td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.by || '—'}</td>
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{r.when || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* Notes */}
          <Card className="px-4">
            <CardHeader title="Notes" />
            {inst.notes ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{inst.notes}</p>
            ) : (
              <p className="text-xs text-gray-400 mb-3">No notes added yet.</p>
            )}
            {!isDone && (
              <div className="flex gap-2">
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                  placeholder="Add a note…" rows={2}
                  className="flex-1 px-3 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue resize-none" />
                <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim()}>Add</Button>
              </div>
            )}
          </Card>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-4">

          {/* Installation Slot summary */}
          <SectionCard title="Installation Slot" icon={CalendarDays} iconBg="bg-blue-50" iconColor="text-brand-blue">
            <div className="bg-brand-blue/5 rounded-xl p-4 border border-brand-blue/20 text-center">
              <p className="text-xs text-brand-blue/70 font-medium uppercase tracking-wide mb-1">
                {inst.slot || 'Scheduled'}
              </p>
              <p className="text-base font-bold text-gray-900">{formatSlotDate(inst.slotDate)}</p>
              {inst.slotTime && <p className="text-lg font-bold text-brand-blue mt-1">{inst.slotTime}</p>}
            </div>
          </SectionCard>

          {/* Status Timeline — 7 stages */}
          <SectionCard title="Status Timeline" icon={CheckCircle2} iconBg="bg-indigo-50" iconColor="text-indigo-600">
            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-[13px] top-3 bottom-3 w-px bg-gray-100 z-0" />
              <div className="space-y-1">
                {TIMELINE_STAGES.map((stage, idx) => {
                  const entry = timelineMap[stage]
                  const isPast    = isCompleted ? true : !isCancelled && idx < stageIndex
                  const isCurrent = !isCancelled && stage === status
                  const isFuture  = !isPast && !isCurrent

                  return (
                    <div key={stage} className="flex items-start gap-3 relative py-1.5">
                      {/* Dot */}
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-all ${
                        isCurrent
                          ? 'border-brand-blue bg-brand-blue shadow-md shadow-brand-blue/30'
                          : isPast
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-gray-200 bg-white'
                      }`}>
                        {isPast && !isCurrent
                          ? <CheckCircle2 size={13} className="text-white" />
                          : isCurrent
                            ? <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                            : <span className="w-2 h-2 rounded-full bg-gray-200" />
                        }
                      </div>

                      {/* Label + meta */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className={`text-sm font-medium ${
                          isCurrent ? 'text-brand-blue' : isPast ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {stage}
                        </p>
                        {entry && (
                          <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                            {formatDate(entry.date)}{entry.by ? ` · ${entry.by}` : ''}
                            {entry.note ? <span className="block text-gray-300 truncate">{entry.note}</span> : null}
                          </p>
                        )}
                      </div>

                      {isCurrent && (
                        <span className="text-[9px] font-bold text-brand-blue bg-blue-50 border border-brand-blue/20 px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                          CURRENT
                        </span>
                      )}
                    </div>
                  )
                })}

                {/* Cancelled / Failed terminal state */}
                {isCancelled && (
                  <div className="flex items-start gap-3 relative py-1.5">
                    <div className="w-7 h-7 rounded-full border-2 border-red-400 bg-red-400 flex items-center justify-center shrink-0 z-10">
                      <XCircle size={13} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm font-medium text-red-600">{status}</p>
                      {timelineMap[status] && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {formatDate(timelineMap[status].date)} · {timelineMap[status].by}
                        </p>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                      {status.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────── */}

      <AssignTeamModal isOpen={assignOpen} onClose={() => setAssignOpen(false)}
        inst={inst} onSave={updated => { save(updated); setAssignOpen(false) }} />

      <RescheduleModal isOpen={reschedOpen} onClose={() => setReschedOpen(false)}
        inst={inst} onSave={updated => { save(updated); setReschedOpen(false) }} />

      <HardwareModal isOpen={hwOpen} onClose={() => setHwOpen(false)}
        inst={inst} onSave={updated => { save(updated); setHwOpen(false) }} />

      {/* Move to Dispatch */}
      <Modal isOpen={dispatchOpen} onClose={() => setDispatchOpen(false)} title="Move to Dispatch" size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setDispatchOpen(false)}>Cancel</Button>
          <Button size="sm" className="bg-orange-600 hover:bg-orange-700"
            onClick={() => { doStatus('Dispatched', { _note: 'Hardware collected — team dispatched' }); setDispatchOpen(false) }}>
            <Truck size={13} className="mr-1" /> Confirm — Dispatch
          </Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">Mark hardware collected and dispatch team for <span className="font-semibold">{inst.id}</span>?</p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
            <p className="text-xs text-orange-700 font-medium">{inst.customerName}</p>
            <p className="text-xs text-orange-600 mt-0.5">{inst.area} · {inst.assignedTeam || 'No team'}</p>
          </div>
          <p className="text-xs text-gray-400">Status will update to "Dispatched".</p>
        </div>
      </Modal>

      {/* Mark In Progress */}
      <Modal isOpen={progressOpen} onClose={() => setProgressOpen(false)} title="Mark In Progress" size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setProgressOpen(false)}>Cancel</Button>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700"
            onClick={() => { doStatus('In Progress', { _note: 'Installation in progress' }); setProgressOpen(false) }}>
            <Play size={13} className="mr-1" /> Mark In Progress
          </Button>
        </>}
      >
        <p className="text-sm text-gray-700">Mark <span className="font-semibold">{inst.id}</span> as In Progress?</p>
      </Modal>

      {/* Mark Completed */}
      <Modal isOpen={completeOpen} onClose={() => setCompleteOpen(false)} title="Mark as Completed" size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setCompleteOpen(false)}>Cancel</Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              const customer = doStatus('Completed', { _note: 'Installation completed successfully' })
              setCompleteOpen(false)
              setToast(customer ? `Installation completed — Customer record created: ${customer.id}` : 'Installation marked as Completed')
            }}>
            <CheckCircle2 size={13} className="mr-1" /> Mark Completed
          </Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">Mark <span className="font-semibold">{inst.id}</span> for <span className="font-semibold">{inst.customerName}</span> as completed?</p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <p className="text-xs text-emerald-700 font-medium">{inst.area} · {inst.plan}</p>
          </div>
        </div>
      </Modal>

      {/* Mark Failed */}
      <Modal isOpen={failOpen} onClose={() => setFailOpen(false)} title="Mark as Failed" size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setFailOpen(false)}>Cancel</Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700"
            onClick={() => { doStatus('Failed', { _note: 'Installation failed' }); setFailOpen(false) }}>
            <XCircle size={13} className="mr-1" /> Mark Failed
          </Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">Mark <span className="font-semibold">{inst.id}</span> as Failed?</p>
          <div className="flex items-start gap-2 text-xs text-gray-400">
            <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-400" />
            This will mark the installation as failed. Customer follow-up may be required.
          </div>
        </div>
      </Modal>

      {/* Mark Cancelled */}
      <Modal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} title="Mark as Cancelled" size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setCancelOpen(false)}>Keep Installation</Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700"
            onClick={() => { doStatus('Cancelled', { _note: 'Installation cancelled' }); setCancelOpen(false) }}>
            Confirm Cancellation
          </Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">Cancel the installation for <span className="font-semibold">{inst.customerName}</span>?</p>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-xs text-red-700 font-medium">{inst.id} · {inst.area}</p>
            <p className="text-xs text-red-600 mt-0.5">Slot: {inst.slotDate} — {inst.slot}</p>
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-400">
            <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-400" />
            This action cannot be undone.
          </div>
        </div>
      </Modal>

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}

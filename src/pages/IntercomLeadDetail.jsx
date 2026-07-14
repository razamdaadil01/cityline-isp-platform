import { useState, useEffect } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import {
  ArrowLeft, Phone, Mail, Building2, MapPin, CalendarDays, FileText,
  User, UserPlus, Activity, XCircle, MessageSquare, Paperclip, Send,
  Upload, Download, Trash2, Eye, FileImage, File as FileIcon, RefreshCw, IdCard, Wifi,
  Wrench, CheckCircle2, Search as SearchIcon, X, Cpu,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Card, { CardHeader } from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { getLead, saveLead, subscribeLeads, INTERCOM_STAFF } from '../data/intercomLeadsStore'
import {
  getInstallations, subscribeInstallations, addInstallation, nextInstallationId, INSTALLATION_ENGINEERS,
} from '../data/intercomInstallationsStore'
import {
  getHardware, subscribeHardware, assignHardwareToWorkOrder,
} from '../data/intercomHardwareStore'

const ALL_STAGES = [
  'New', 'Contacted', 'Requirement Confirmed', 'Site Verification Required',
  'Installation Scheduled', 'Installation In Progress', 'Installed', 'Active',
  'On Hold', 'Cancelled', 'Converted to Internet', 'Closed',
]

const TIME_SLOTS = ['Morning 9-12', 'Afternoon 12-3', 'Evening 3-6']
const VISIT_PRIORITIES = ['Normal', 'High', 'Urgent']

const INSTALL_STATUS_CFG = {
  pending:    { variant: 'orange', label: 'Pending' },
  inprogress: { variant: 'blue',   label: 'In Progress' },
  completed:  { variant: 'green',  label: 'Completed' },
  cancelled:  { variant: 'red',    label: 'Cancelled' },
}

const STAGE_BADGE = {
  'New':                       'blue',
  'Contacted':                 'cyan',
  'Requirement Confirmed':     'purple',
  'Site Verification Required':'navy',
  'Installation Scheduled':    'orange',
  'Installation In Progress':  'yellow',
  'Installed':                 'green',
  'Active':                    'green',
  'On Hold':                   'orange',
  'Cancelled':                 'red',
  'Converted to Internet':     'purple',
  'Closed':                    'gray',
}

const LOST_REASONS = ['Price too high', 'Chose competitor', 'Not interested', 'Other']

const STAGE_ICON = {
  'New':                        '📝',
  'Contacted':                  '📞',
  'Requirement Confirmed':      '📋',
  'Site Verification Required': '🔍',
  'Installation Scheduled':     '🗓️',
  'Installation In Progress':   '🔧',
  'Installed':                  '📦',
  'Active':                     '✅',
  'On Hold':                    '⏸️',
  'Cancelled':                  '❌',
  'Converted to Internet':      '🔄',
  'Closed':                     '🔒',
}

function formatLeadId(id) {
  if (!id) return '—'
  const legacy = id.match(/^IL-(\d{4})-(\d+)$/)
  if (legacy) return `IC-LEAD-${legacy[1]}-${String(legacy[2]).padStart(6, '0')}`
  return id
}

function leadTypeOf(lead) {
  if (lead.type) return lead.type
  return lead.relationshipType === 'Existing Internet Customer' ? 'Internet + Intercom' : 'Intercom Only'
}

const CURRENT_USER = 'Admin User'

const TABS = ['Profile', 'Comments', 'Attachments', 'Activity Log']
const TAB_SLUGS = { 'Profile': 'profile', 'Comments': 'comments', 'Attachments': 'attachments', 'Activity Log': 'activity' }
const SLUG_TO_TAB = Object.fromEntries(Object.entries(TAB_SLUGS).map(([k, v]) => [v, k]))

const MOCK_COMMENTS = [
  { id: 1, name: 'Preethi Nair', date: '2026-06-26', text: 'Follow-up done, customer confirmed interest' },
  { id: 2, name: 'Arjun Kumar',  date: '2026-06-25', text: 'Customer interested, will call back tomorrow' },
]

const MOCK_ATTACHMENTS = [
  { id: 1, name: 'site_photo.jpg',  sizeLabel: '1.2 MB', date: '2026-06-20', file: null },
  { id: 2, name: 'customer_id.pdf', sizeLabel: '0.8 MB', date: '2026-06-20', file: null },
]

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300">'
  + '<rect width="100%" height="100%" fill="#f1f5f9"/>'
  + '<text x="50%" y="50%" font-family="sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle" dy=".3em">Image preview not available in demo</text>'
  + '</svg>'
)

function todayStr() { return new Date().toISOString().slice(0, 10) }
function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageName(name) {
  return /\.(jpg|jpeg|png|gif|webp)$/.test(name.toLowerCase())
}

function fileIcon(name) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return { Icon: FileText, color: 'text-red-500', bg: 'bg-red-50' }
  if (isImageName(lower)) return { Icon: FileImage, color: 'text-brand-blue', bg: 'bg-brand-blue/10' }
  return { Icon: FileIcon, color: 'text-gray-500', bg: 'bg-gray-100' }
}

function staffMeta(name) {
  const staff = INTERCOM_STAFF.find(s => s.name === name)
  return { initials: staff?.initials ?? name?.charAt(0)?.toUpperCase() ?? '?', color: staff?.color ?? 'bg-gray-400' }
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

// ── Mark as Lost Modal ─────────────────────────────────────────────────────────

function MarkAsLostModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState({ lostReason: '', notes: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) { setForm({ lostReason: '', notes: '' }); setErrors({}) }
  }, [isOpen])

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function handleSubmit() {
    const e = {}
    if (!form.lostReason) e.lostReason = 'Select a reason'
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit(form)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mark as Lost / Cancel" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" icon={<XCircle size={14} />} onClick={handleSubmit}>Confirm</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Lost Reason" required error={errors.lostReason}>
          <Select value={form.lostReason} onChange={e => set('lostReason', e.target.value)}>
            <option value="">Select a reason…</option>
            {LOST_REASONS.map(r => <option key={r}>{r}</option>)}
          </Select>
        </FormField>
        <FormField label="Notes">
          <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Any additional details…" />
        </FormField>
      </div>
    </Modal>
  )
}

// ── Update Stage Modal ────────────────────────────────────────────────────────

function UpdateStageModal({ isOpen, currentStage, onClose, onSubmit }) {
  const [form, setForm] = useState({ newStage: '', remarks: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) { setForm({ newStage: '', remarks: '' }); setErrors({}) }
  }, [isOpen])

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function handleSubmit() {
    const e = {}
    if (!form.newStage) e.newStage = 'Select a new stage'
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit(form)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Stage" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Current Stage">
          <Input value={currentStage} disabled />
        </FormField>
        <FormField label="New Stage" required error={errors.newStage}>
          <Select value={form.newStage} onChange={e => set('newStage', e.target.value)}>
            <option value="">Select a stage…</option>
            {ALL_STAGES.map(s => <option key={s}>{s}</option>)}
          </Select>
        </FormField>
        <FormField label="Remarks">
          <Textarea value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={3} placeholder="Add remarks…" />
        </FormField>
      </div>
    </Modal>
  )
}

// ── Hardware Multi-Select ────────────────────────────────────────────────────

function HardwareMultiSelect({ selected, onChange }) {
  const [hardware, setHardware] = useState(getHardware())
  useEffect(() => subscribeHardware(setHardware), [])
  const [search, setSearch] = useState('')

  const available = hardware.filter(h => h.status === 'available')
  const filtered = available.filter(h =>
    `${h.deviceType} ${h.serial}`.toLowerCase().includes(search.toLowerCase())
  )

  function toggle(serial) {
    onChange(selected.includes(serial) ? selected.filter(s => s !== serial) : [...selected, serial])
  }

  return (
    <div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(serial => {
            const item = hardware.find(h => h.serial === serial)
            return (
              <span key={serial} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium">
                {item ? `${item.deviceType} — ${item.serial}` : serial}
                <button type="button" onClick={() => toggle(serial)}
                  className="text-brand-blue/60 hover:text-brand-blue transition-colors leading-none">
                  <X size={11} />
                </button>
              </span>
            )
          })}
        </div>
      )}

      <div className="relative mb-1">
        <SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search available hardware…"
          className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400 text-gray-800"
        />
      </div>

      <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden max-h-[160px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No available hardware found</p>
        ) : filtered.map(item => {
          const isSelected = selected.includes(item.serial)
          return (
            <label key={item.serial}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
              <input type="checkbox"
                checked={isSelected}
                onChange={() => toggle(item.serial)}
                className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
              />
              <div className="w-6 h-6 rounded-full bg-navy/10 text-navy flex items-center justify-center shrink-0">
                <Cpu size={12} />
              </div>
              <span className="text-sm text-gray-700">{item.deviceType} — <span className="font-mono text-xs">{item.serial}</span></span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ── Create Installation Visit Modal ─────────────────────────────────────────────

const INIT_VISIT_FORM = {
  technician: '', installDate: '', timeSlot: '', priority: 'Normal',
  assignedHardware: [], visitNotes: '', accessInstructions: '', altNumber: '',
}

function CreateInstallationVisitModal({ isOpen, lead, onClose, onSubmit }) {
  const [form, setForm] = useState(INIT_VISIT_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) { setForm(INIT_VISIT_FORM); setErrors({}) }
  }, [isOpen])

  function set(f, v) { setForm(p => ({ ...p, [f]: v })); setErrors(p => ({ ...p, [f]: '' })) }

  function handleSubmit() {
    const e = {}
    if (!form.technician) e.technician = 'Select a technician'
    if (!form.installDate) e.installDate = 'Installation date is required'
    if (!form.timeSlot) e.timeSlot = 'Select a time slot'
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit(form)
  }

  if (!lead) return null

  const customerType = leadTypeOf(lead) === 'Internet + Intercom' ? 'Existing Internet Customer' : 'Intercom Only'
  const areaLine = [lead.area, lead.locality, lead.subLocality].filter(Boolean).join(' / ') || '—'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Installation Visit" size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Visit</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <FormField label="Lead Number">
          <Input value={formatLeadId(lead.id)} disabled className="font-mono" />
        </FormField>
        <FormField label="Customer Name">
          <Input value={lead.leadName} disabled />
        </FormField>
        <FormField label="Customer Type">
          <Input value={customerType} disabled />
        </FormField>
        <FormField label="Area / Locality / Sub Locality">
          <Input value={areaLine} disabled />
        </FormField>
        <div className="col-span-2">
          <FormField label="Installation Address">
            <Textarea value={lead.installationAddress || '—'} disabled rows={2} />
          </FormField>
        </div>
        <FormField label="Assigned Technician" required error={errors.technician}>
          <Select value={form.technician} onChange={e => set('technician', e.target.value)}>
            <option value="">Select technician…</option>
            {INSTALLATION_ENGINEERS.map(eng => <option key={eng.id} value={eng.name}>{eng.name}</option>)}
          </Select>
        </FormField>
        <FormField label="Installation Date" required error={errors.installDate}>
          <Input type="date" value={form.installDate} onChange={e => set('installDate', e.target.value)} />
        </FormField>
        <FormField label="Time Slot" required error={errors.timeSlot}>
          <Select value={form.timeSlot} onChange={e => set('timeSlot', e.target.value)}>
            <option value="">Select slot…</option>
            {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
          </Select>
        </FormField>
        <FormField label="Visit Priority">
          <Select value={form.priority} onChange={e => set('priority', e.target.value)}>
            {VISIT_PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </Select>
        </FormField>
        <div className="col-span-2">
          <FormField label="Required Hardware" hint="Only units currently marked Available are shown">
            <HardwareMultiSelect selected={form.assignedHardware} onChange={v => set('assignedHardware', v)} />
          </FormField>
        </div>
        <div className="col-span-2">
          <FormField label="Visit Notes">
            <Textarea value={form.visitNotes} onChange={e => set('visitNotes', e.target.value)} rows={2} placeholder="Any additional notes for the visit…" />
          </FormField>
        </div>
        <div className="col-span-2">
          <FormField label="Access Instructions">
            <Textarea value={form.accessInstructions} onChange={e => set('accessInstructions', e.target.value)} rows={2} placeholder="Gate code, floor access, etc…" />
          </FormField>
        </div>
        <FormField label="Contact Number">
          <Input value={lead.mobile} disabled />
        </FormField>
        <FormField label="Alternative Number">
          <Input
            type="tel"
            value={form.altNumber}
            onChange={e => set('altNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="9876543210"
          />
        </FormField>
      </div>
    </Modal>
  )
}

// ── Stage-based Actions ───────────────────────────────────────────────────────

const STAGE_UPDATE_ONLY = ['New', 'Contacted', 'Requirement Confirmed', 'Site Verification Required', 'On Hold']

function StageActions({ lead, onUpdateStage, onMarkLost, onCreateVisit, onCreateCustomer }) {
  const stage = lead.stage

  if (STAGE_UPDATE_ONLY.includes(stage)) {
    return (
      <>
        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={onUpdateStage}>Update Stage</Button>
        <Button variant="danger" icon={<XCircle size={14} />} onClick={onMarkLost}>Mark as Lost/Cancel</Button>
      </>
    )
  }

  if (stage === 'Installation Scheduled') {
    return (
      <>
        <Button icon={<Wrench size={14} />} onClick={onCreateVisit}>Create Installation Visit</Button>
        <Button variant="danger" icon={<XCircle size={14} />} onClick={onMarkLost}>Mark as Lost/Cancel</Button>
      </>
    )
  }

  if (stage === 'Installation In Progress') {
    return <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={onUpdateStage}>Update Stage</Button>
  }

  if (stage === 'Installed') {
    return (
      <Button className="!bg-emerald-500 hover:!bg-emerald-600" icon={<UserPlus size={14} />} onClick={onCreateCustomer}>Create Intercom Customer</Button>
    )
  }

  // Active, Cancelled, Closed, Converted to Internet — no action buttons
  return null
}

// ── Tab: Profile ─────────────────────────────────────────────────────────────

function ProfileTab({ lead }) {
  const type = leadTypeOf(lead)
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader title="Customer Info" />
        <InfoRow icon={Phone} label="Mobile" value={lead.mobile} />
        <InfoRow icon={Mail} label="Email" value={lead.email} />
        <InfoRow icon={Building2} label="Project" value={lead.project} />
        <InfoRow icon={MapPin} label="Installation Address" value={lead.installationAddress} />
        <InfoRow icon={CalendarDays} label="Follow-up Date" value={lead.followUp} />
        {type === 'Internet + Intercom' ? (
          <>
            <InfoRow icon={IdCard} label="Internet Customer ID" value={lead.existingCustomerId} />
            <InfoRow icon={Wifi} label="Internet Package" value={lead.internetPackage} />
            <div className="flex items-start gap-3 py-2.5">
              <Activity size={14} className="text-gray-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-gray-400">Internet Status</p>
                <Badge variant="green" size="sm">{lead.internetStatus ?? 'Active'}</Badge>
              </div>
            </div>
          </>
        ) : (
          <InfoRow icon={Wifi} label="Internet Provider" value={lead.internetProvider} />
        )}
      </Card>

      <Card>
        <CardHeader title="Assignment" />
        <div className="flex items-center gap-3 py-2.5 border-b border-gray-50">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${lead.assignedColor}`}>
            {lead.assignedInitials}
          </span>
          <div>
            <p className="text-[11px] text-gray-400">Assigned To</p>
            <p className="text-sm font-medium text-gray-800">{lead.assigned || '—'}</p>
          </div>
        </div>
        <InfoRow icon={CalendarDays} label="Created Date" value={lead.createdAt} />
        <InfoRow icon={FileText} label="Lead ID" value={formatLeadId(lead.id)} />
        <div className="flex items-start gap-3 py-2.5">
          <Activity size={14} className="text-gray-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-gray-400">Stage</p>
            <Badge variant={STAGE_BADGE[lead.stage] ?? 'gray'} size="sm">{lead.stage}</Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ── Tab: Comments ────────────────────────────────────────────────────────────

function CommentsTab() {
  const [comments, setComments] = useState(MOCK_COMMENTS)
  const [draft, setDraft] = useState('')

  function addComment() {
    if (!draft.trim()) return
    setComments(c => [{ id: Date.now(), name: CURRENT_USER, date: todayStr(), text: draft.trim() }, ...c])
    setDraft('')
  }

  return (
    <Card>
      <CardHeader title="Comments" />
      <div className="flex items-start gap-3 pb-5 border-b border-gray-50">
        <Textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2}
          placeholder="Add a comment…" className="flex-1" />
        <Button size="sm" icon={<Send size={13} />} onClick={addComment}>Add Comment</Button>
      </div>
      <div className="divide-y divide-gray-50">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No comments yet.</p>
        ) : comments.map(c => {
          const { initials, color } = staffMeta(c.name)
          return (
            <div key={c.id} className="flex items-start gap-3 py-3.5">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${color}`}>
                {initials}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                  <span className="text-xs text-gray-400">{c.date}</span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5">{c.text}</p>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Tab: Attachments ─────────────────────────────────────────────────────────

function AttachmentsTab() {
  const [attachments, setAttachments] = useState(MOCK_ATTACHMENTS)
  const [previewEntry, setPreviewEntry] = useState(null)

  function handleUpload(fileList) {
    const files = Array.from(fileList ?? [])
    if (!files.length) return
    const newEntries = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      sizeLabel: fmtSize(file.size),
      date: todayStr(),
      file,
    }))
    setAttachments(a => [...newEntries, ...a])
  }

  function removeAttachment(id) {
    setAttachments(a => a.filter(x => x.id !== id))
  }

  function downloadAttachment(entry) {
    if (!entry.file) return
    const url = URL.createObjectURL(entry.file)
    const a = document.createElement('a')
    a.href = url
    a.download = entry.name
    a.click()
    URL.revokeObjectURL(url)
  }

  function viewAttachment(entry) {
    if (entry.file) {
      window.open(URL.createObjectURL(entry.file), '_blank')
    } else {
      setPreviewEntry(entry)
    }
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-700">Attachments</p>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark rounded-lg cursor-pointer transition-colors shadow-sm">
            <input type="file" multiple className="hidden" onChange={e => { handleUpload(e.target.files); e.target.value = '' }} />
            <Upload size={13} /> Upload
          </label>
        </div>
        {attachments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No attachments yet.</p>
        ) : (
          <div className="space-y-2">
            {attachments.map(entry => {
              const { Icon, color, bg } = fileIcon(entry.name)
              return (
                <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-surface-border bg-white">
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                    <Icon size={16} className={color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{entry.name}</p>
                    <p className="text-xs text-gray-400">{entry.sizeLabel} · {entry.date}</p>
                  </div>
                  <button type="button" onClick={() => viewAttachment(entry)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/5 transition-colors shrink-0">
                    <Eye size={14} />
                  </button>
                  <button type="button" onClick={() => downloadAttachment(entry)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/5 transition-colors shrink-0">
                    <Download size={14} />
                  </button>
                  <button type="button" onClick={() => removeAttachment(entry.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal isOpen={!!previewEntry} onClose={() => setPreviewEntry(null)} title={previewEntry?.name ?? 'Preview'} size="md">
        {previewEntry && isImageName(previewEntry.name) ? (
          <img src={PLACEHOLDER_IMAGE} alt={previewEntry.name} className="w-full rounded-lg border border-surface-border" />
        ) : (
          <div className="py-12 text-center text-sm text-gray-400">PDF Preview not available in demo</div>
        )}
      </Modal>
    </>
  )
}

// ── Tab: Activity Log ────────────────────────────────────────────────────────

function ActivityLogTab({ history }) {
  const entries = [...history].reverse()
  return (
    <Card padding={false}>
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
  const { id, tab } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(() => getLead(id))
  const [lostModalOpen, setLostModalOpen] = useState(false)
  const [updateStageOpen, setUpdateStageOpen] = useState(false)
  const [visitModalOpen, setVisitModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const [installations, setInstallations] = useState(getInstallations())
  useEffect(() => subscribeInstallations(setInstallations), [])
  const linkedInstallation = lead?.installationId
    ? installations.find(o => o.id === lead.installationId) ?? null
    : null

  const [hardware, setHardware] = useState(getHardware())
  useEffect(() => subscribeHardware(setHardware), [])
  const linkedHardware = linkedInstallation?.assignedHardware?.length
    ? hardware.filter(h => linkedInstallation.assignedHardware.includes(h.serial))
    : []

  useEffect(() => subscribeLeads(() => setLead(getLead(id))), [id])
  useEffect(() => { setLead(getLead(id)) }, [id])

  useEffect(() => {
    if (!successMessage) return
    const t = setTimeout(() => setSuccessMessage(''), 4000)
    return () => clearTimeout(t)
  }, [successMessage])

  function addHistory(updated, note) {
    const entry = { stage: updated.stage, date: todayStr(), time: nowTime(), note, actor: CURRENT_USER }
    return { ...updated, stageHistory: [...(lead.stageHistory ?? []), entry] }
  }

  function handleMarkLost(data) {
    const updated = { ...lead, stage: 'Cancelled', lostReason: data.lostReason, lostNotes: data.notes }
    saveLead(addHistory(updated, `Marked as Cancelled — ${data.lostReason}${data.notes ? ': ' + data.notes : ''}`))
    setLostModalOpen(false)
  }

  function handleUpdateStage(data) {
    const updated = { ...lead, stage: data.newStage }
    saveLead(addHistory(updated, `Stage updated to ${data.newStage}${data.remarks ? ' — ' + data.remarks : ''}`))
    setUpdateStageOpen(false)
  }

  function handleCreateCustomer() {
    navigate('/intercom/customers/new?leadId=' + lead.id)
  }

  function handleCreateVisit(form) {
    const now = new Date()
    const createdDate = now.toLocaleDateString('en-GB').split('/').join('-')
    const [y, m, d] = form.installDate.split('-')
    const workOrderId = nextInstallationId()
    addInstallation({
      id: workOrderId,
      leadId: lead.id,
      customer: lead.leadName,
      customerId: lead.existingCustomerId ?? '',
      phone: lead.mobile,
      circuitId: '',
      zone: lead.area ?? '',
      engineer: form.technician,
      installDate: `${d}-${m}-${y}`,
      installTime: form.timeSlot,
      priority: form.priority,
      assignedHardware: form.assignedHardware,
      accessInstructions: form.accessInstructions,
      altNumber: form.altNumber,
      createdDate,
      notes: form.visitNotes,
      status: 'pending',
    })
    if (form.assignedHardware.length) {
      assignHardwareToWorkOrder(form.assignedHardware, {
        workOrderId,
        assignedTo: lead.leadName,
        customerId: lead.existingCustomerId ?? '',
        zone: lead.area ?? '',
        assignedDate: createdDate,
      })
    }
    const updated = { ...lead, stage: 'Installation In Progress', installationId: workOrderId }
    saveLead(addHistory(updated, `Installation Visit created — Work Order ${workOrderId}`))
    setVisitModalOpen(false)
    setSuccessMessage('Installation Visit created successfully')
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

  if (!tab) return <Navigate to={`/intercom/leads/${id}/profile`} replace />

  const activeTab = SLUG_TO_TAB[tab] ?? 'Profile'

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
            {lead.avatarUrl ? (
              <img src={lead.avatarUrl} alt={lead.customer} className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-navy flex items-center justify-center text-white text-sm font-bold shrink-0">
                {lead.customer?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{lead.leadName}</h1>
                <Badge variant={STAGE_BADGE[lead.stage] ?? 'gray'} size="sm">{lead.stage}</Badge>
                {leadTypeOf(lead) === 'Internet + Intercom' ? (
                  <>
                    <Badge variant="blue" size="sm">Existing Internet Customer</Badge>
                    <Badge variant="cyan" size="sm">Intercom Lead</Badge>
                  </>
                ) : (
                  <>
                    <Badge variant="cyan" size="sm">Intercom-Only Lead</Badge>
                    <Badge variant="gray" size="sm">No Internet Service</Badge>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5 font-mono">{formatLeadId(lead.id)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {linkedInstallation && (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-blue/5 border border-brand-blue/20">
                  <Wrench size={13} className="text-brand-blue shrink-0" />
                  <span className="text-xs text-gray-700">
                    Installation Visit:{' '}
                    <button
                      onClick={() => navigate(`/intercom/installations/${linkedInstallation.id}`)}
                      className="font-mono font-semibold text-brand-blue hover:underline"
                    >
                      {linkedInstallation.id}
                    </button>
                  </span>
                  <Badge variant={(INSTALL_STATUS_CFG[linkedInstallation.status] ?? INSTALL_STATUS_CFG.pending).variant} size="sm" dot>
                    {(INSTALL_STATUS_CFG[linkedInstallation.status] ?? INSTALL_STATUS_CFG.pending).label}
                  </Badge>
                </div>
                {linkedHardware.length > 0 && (
                  <p className="text-[11px] text-gray-500 text-right max-w-xs">
                    {linkedHardware.map(h => `${h.deviceType} (${h.serial})`).join(', ')}
                  </p>
                )}
              </div>
            )}
            {lead.stage === 'Active' && lead.customerId && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <UserPlus size={13} className="text-emerald-600 shrink-0" />
                <span className="text-xs text-gray-700">
                  Intercom Customer:{' '}
                  <button
                    onClick={() => navigate(`/intercom/customers/${lead.customerId}`)}
                    className="font-mono font-semibold text-emerald-700 hover:underline"
                  >
                    {lead.customerId}
                  </button>
                </span>
              </div>
            )}
            <StageActions
              lead={lead}
              onUpdateStage={() => setUpdateStageOpen(true)}
              onMarkLost={() => setLostModalOpen(true)}
              onCreateVisit={() => setVisitModalOpen(true)}
              onCreateCustomer={handleCreateCustomer}
            />
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="mx-6 mt-4 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium flex items-center gap-2 shrink-0">
          <CheckCircle2 size={15} className="shrink-0" />
          {successMessage}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-surface-border shrink-0">
        <div className="flex overflow-x-auto scrollbar-none px-6">
          {TABS.map(t => {
            const Icon = t === 'Profile' ? User : t === 'Comments' ? MessageSquare : t === 'Attachments' ? Paperclip : Activity
            return (
              <button
                key={t}
                onClick={() => navigate(`/intercom/leads/${id}/${TAB_SLUGS[t]}`)}
                className={`flex items-center gap-1.5 shrink-0 px-4 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap
                  ${activeTab === t
                    ? 'border-brand-blue text-brand-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                  }`}
              >
                <Icon size={14} />
                {t}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {activeTab === 'Profile'      && <ProfileTab lead={lead} />}
        {activeTab === 'Comments'     && <CommentsTab />}
        {activeTab === 'Attachments'  && <AttachmentsTab />}
        {activeTab === 'Activity Log' && <ActivityLogTab history={lead.stageHistory ?? []} />}
      </div>

      {/* ── Stage Action Modals ─────────────────────────────────────────── */}
      <MarkAsLostModal
        isOpen={lostModalOpen}
        onClose={() => setLostModalOpen(false)}
        onSubmit={handleMarkLost}
      />
      <UpdateStageModal
        isOpen={updateStageOpen}
        currentStage={lead.stage}
        onClose={() => setUpdateStageOpen(false)}
        onSubmit={handleUpdateStage}
      />
      <CreateInstallationVisitModal
        isOpen={visitModalOpen}
        lead={lead}
        onClose={() => setVisitModalOpen(false)}
        onSubmit={handleCreateVisit}
      />

    </div>
  )
}

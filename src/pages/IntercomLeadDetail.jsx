import { useState, useEffect } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import {
  ArrowLeft, Phone, Mail, Building2, MapPin, CalendarDays, FileText,
  User, UserPlus, Activity, XCircle, MessageSquare, Paperclip, Send,
  Upload, Download, Trash2, FileImage, File as FileIcon,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Card, { CardHeader } from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { FormField, Select, Textarea } from '../components/ui/FormInputs'
import { getLead, saveLead, subscribeLeads, INTERCOM_STAFF } from '../data/intercomLeadsStore'

const STAGE_BADGE = {
  'New Inquiry': 'blue',
  'Converted':   'green',
  'Lost':        'red',
}

const LOST_REASONS = ['Price too high', 'Chose competitor', 'Not interested', 'Other']

const STAGE_ICON = {
  'New Inquiry': '📝',
  'Converted':   '✅',
  'Lost':        '❌',
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

function fileIcon(name) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return { Icon: FileText, color: 'text-red-500', bg: 'bg-red-50' }
  if (/\.(jpg|jpeg|png|gif|webp)$/.test(lower)) return { Icon: FileImage, color: 'text-brand-blue', bg: 'bg-brand-blue/10' }
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
    <Modal isOpen={isOpen} onClose={onClose} title="Mark as Lost" size="md"
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

// ── Stage-based Actions ───────────────────────────────────────────────────────

function StageActions({ lead, onMarkLost, onCreateCustomer }) {
  if (lead.stage === 'New Inquiry') {
    return (
      <>
        <Button className="!bg-emerald-500 hover:!bg-emerald-600" icon={<UserPlus size={14} />} onClick={onCreateCustomer}>Create Intercom Customer</Button>
        <Button variant="danger" icon={<XCircle size={14} />} onClick={onMarkLost}>Mark as Lost</Button>
      </>
    )
  }
  return null
}

// ── Tab: Profile ─────────────────────────────────────────────────────────────

function ProfileTab({ lead }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader title="Customer Info" />
        <div className="flex flex-col items-center pb-4 border-b border-gray-50">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-blue to-navy flex items-center justify-center text-white text-2xl font-bold shadow-md">
            {lead.customer?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <p className="text-sm font-semibold text-gray-900 mt-3">{lead.customer}</p>
        </div>
        <InfoRow icon={Phone} label="Mobile" value={lead.mobile} />
        <InfoRow icon={Mail} label="Email" value={lead.email} />
        <InfoRow icon={Building2} label="Project" value={lead.project} />
        <InfoRow icon={MapPin} label="Installation Address" value={lead.installationAddress} />
        <InfoRow icon={CalendarDays} label="Follow-up Date" value={lead.followUp} />
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
        <InfoRow icon={FileText} label="Lead ID" value={lead.id} />
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

  return (
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

  useEffect(() => subscribeLeads(() => setLead(getLead(id))), [id])
  useEffect(() => { setLead(getLead(id)) }, [id])

  function addHistory(updated, note) {
    const entry = { stage: updated.stage, date: todayStr(), time: nowTime(), note, actor: CURRENT_USER }
    return { ...updated, stageHistory: [...(lead.stageHistory ?? []), entry] }
  }

  function handleMarkLost(data) {
    const updated = { ...lead, stage: 'Lost', lostReason: data.lostReason, lostNotes: data.notes }
    saveLead(addHistory(updated, `Marked as Lost — ${data.lostReason}${data.notes ? ': ' + data.notes : ''}`))
    setLostModalOpen(false)
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
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{lead.leadName}</h1>
                <Badge variant={STAGE_BADGE[lead.stage] ?? 'gray'} size="sm">{lead.stage}</Badge>
              </div>
              <p className="text-sm text-gray-500 mt-0.5 font-mono">{lead.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StageActions
              lead={lead}
              onMarkLost={() => setLostModalOpen(true)}
              onCreateCustomer={handleCreateCustomer}
            />
          </div>
        </div>
      </div>

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

    </div>
  )
}

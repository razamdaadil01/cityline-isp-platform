import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Upload, Camera, FileText, FileImage, File as FileIcon, X,
  User, MapPin, CalendarClock, Paperclip, StickyNote,
} from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { saveLead, nextLeadId, INTERCOM_STAFF } from '../data/intercomLeadsStore'

const PROJECTS = ['Sunrise Apartments', 'Greenwood Residency', 'Metro Business Park', 'Palm Grove Society']

const INIT_FORM = {
  customer: '', mobile: '', email: '', project: '', installationAddress: '',
  followUp: '', assigned: '', profilePic: null, attachments: [], notes: '',
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(file) {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return { Icon: FileText, color: 'text-red-500', bg: 'bg-red-50' }
  }
  if (file.type.startsWith('image/')) {
    return { Icon: FileImage, color: 'text-brand-blue', bg: 'bg-brand-blue/10' }
  }
  return { Icon: FileIcon, color: 'text-gray-500', bg: 'bg-gray-100' }
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={15} className="text-brand-blue" />
        <p className="text-sm font-bold text-gray-700">{title}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-4">
        {children}
      </div>
    </div>
  )
}

export default function IntercomLeadNew() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INIT_FORM)
  const [errors, setErrors] = useState({})

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function handleProfilePic(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => set('profilePic', { name: file.name, preview: ev.target.result })
    reader.readAsDataURL(file)
  }

  function addAttachments(fileList) {
    const files = Array.from(fileList ?? [])
    if (!files.length) return
    setForm(p => ({ ...p, attachments: [...p.attachments, ...files] }))
  }

  function removeAttachment(idx) {
    setForm(p => ({ ...p, attachments: p.attachments.filter((_, i) => i !== idx) }))
  }

  function validate() {
    const e = {}
    if (!form.customer.trim())            e.customer = 'Customer name is required'
    if (!form.mobile.match(/^\d{10}$/))   e.mobile   = 'Enter a valid 10-digit number'
    if (!form.project)                    e.project  = 'Select a project'
    if (!form.installationAddress.trim()) e.installationAddress = 'Installation address is required'
    if (!form.assigned)                   e.assigned = 'Assign a sales executive'
    return e
  }

  function handleCreate() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    const id = nextLeadId()
    const lead = saveLead({
      id,
      leadName: form.customer.trim(),
      customer: form.customer.trim(),
      mobile: form.mobile,
      email: form.email,
      project: form.project,
      installationAddress: form.installationAddress,
      stage: 'New Inquiry',
      assigned: form.assigned,
      followUp: form.followUp,
      notes: form.notes,
      createdAt: new Date().toISOString().slice(0, 10),
    })
    navigate(`/intercom/leads/${lead.id}`)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-5 shrink-0 bg-white border-b border-surface-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/intercom/leads')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create Intercom Lead</h1>
            <p className="text-sm text-gray-500 mt-0.5">Fill in the details to add a new intercom service lead</p>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

        {/* Personal Info */}
        <SectionCard title="Personal Info" icon={User}>
          <FormField label="Customer Name" required>
            <Input
              value={form.customer}
              onChange={e => { set('customer', e.target.value); setErrors(p => ({ ...p, customer: '' })) }}
              placeholder="Ramesh Nair"
              className={errors.customer ? 'border-red-400 focus:ring-red-400/30' : ''}
            />
            {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
          </FormField>

          <FormField label="Mobile Number" required>
            <Input
              type="tel"
              value={form.mobile}
              onChange={e => {
                set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))
                setErrors(p => ({ ...p, mobile: '' }))
              }}
              placeholder="9876543210"
              className={errors.mobile ? 'border-red-400 focus:ring-red-400/30' : ''}
            />
            {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
          </FormField>

          <FormField label="Email">
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="ramesh@email.com" />
          </FormField>

          <FormField label="Project" required error={errors.project}>
            <Select
              value={form.project}
              onChange={e => { set('project', e.target.value); setErrors(p => ({ ...p, project: '' })) }}
            >
              <option value="">Select project…</option>
              {PROJECTS.map(p => <option key={p}>{p}</option>)}
            </Select>
          </FormField>
        </SectionCard>

        {/* Address */}
        <SectionCard title="Address" icon={MapPin}>
          <div className="col-span-2">
            <FormField label="Installation Address" required error={errors.installationAddress}>
              <Textarea
                value={form.installationAddress}
                onChange={e => { set('installationAddress', e.target.value); setErrors(p => ({ ...p, installationAddress: '' })) }}
                placeholder="House/Flat no., Street, Building name, Area" rows={2}
              />
            </FormField>
          </div>
        </SectionCard>

        {/* Follow-up & Assignment */}
        <SectionCard title="Follow-up & Assignment" icon={CalendarClock}>
          <FormField label="Follow-up Date">
            <Input type="date" value={form.followUp} onChange={e => set('followUp', e.target.value)} />
          </FormField>

          <FormField label="Assigned To" required>
            <Select
              value={form.assigned}
              onChange={e => { set('assigned', e.target.value); setErrors(p => ({ ...p, assigned: '' })) }}
              className={errors.assigned ? 'border-red-400 focus:ring-red-400/30' : ''}
            >
              <option value="">Select user…</option>
              {INTERCOM_STAFF.map(s => <option key={s.name}>{s.name}</option>)}
            </Select>
            {errors.assigned && <p className="text-xs text-red-500 mt-1">{errors.assigned}</p>}
          </FormField>
        </SectionCard>

        {/* Documents */}
        <SectionCard title="Documents" icon={Paperclip}>
          {/* Profile Picture */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">Profile Picture</p>
            <div className="flex items-center gap-4">
              <label className={`relative w-20 h-20 rounded-full flex items-center justify-center cursor-pointer shrink-0 overflow-hidden transition-colors ${
                form.profilePic ? '' : 'border-2 border-dashed border-surface-border bg-gray-50 hover:border-brand-blue/50 hover:bg-brand-blue/5'
              }`}>
                <input type="file" accept=".jpg,.jpeg,.png" className="hidden"
                  onChange={e => { handleProfilePic(e.target.files?.[0]); e.target.value = '' }} />
                {form.profilePic ? (
                  <img src={form.profilePic.preview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Camera size={20} className="text-gray-400" />
                    <span className="text-[9px] font-semibold text-gray-500">Upload Photo</span>
                  </div>
                )}
              </label>
              {form.profilePic && (
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{form.profilePic.name}</p>
                  <button type="button" onClick={() => set('profilePic', null)}
                    className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors mt-0.5">
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Attachment */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">Attachment</p>
            <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-surface-border bg-gray-50 hover:border-brand-blue/50 hover:bg-brand-blue/5 cursor-pointer transition-colors">
              <input type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" className="hidden"
                onChange={e => { addAttachments(e.target.files); e.target.value = '' }} />
              <Upload size={16} className="text-gray-400 shrink-0" />
              <span className="text-xs font-semibold text-gray-600">Click to upload · Any document type</span>
            </label>

            {form.attachments.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {form.attachments.map((file, i) => {
                  const { Icon, color, bg } = fileIcon(file)
                  return (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-surface-border bg-white">
                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                        <Icon size={14} className={color} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-700 truncate">{file.name}</p>
                        <p className="text-[10px] text-gray-400">{fmtSize(file.size)}</p>
                      </div>
                      <button type="button" onClick={() => removeAttachment(i)}
                        className="w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Notes */}
        <SectionCard title="Notes" icon={StickyNote}>
          <div className="col-span-2">
            <FormField label="Notes">
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Any additional notes about this lead…" rows={3} />
            </FormField>
          </div>
        </SectionCard>

      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 shrink-0 bg-white border-t border-surface-border flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Fields marked <span className="text-red-400 font-semibold">*</span> are required
        </p>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/intercom/leads')}>Cancel</Button>
          <Button onClick={handleCreate}>Create Lead</Button>
        </div>
      </div>

    </div>
  )
}

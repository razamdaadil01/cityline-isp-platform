import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, CheckCircle2 } from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { saveLead, nextLeadId, INTERCOM_STAFF } from '../data/intercomLeadsStore'

const PROJECTS = ['Sunrise Apartments', 'Greenwood Residency', 'Metro Business Park', 'Palm Grove Society']

const INIT_FORM = {
  customer: '', mobile: '', email: '', project: '', installationAddress: '',
  followUp: '', assigned: '', profilePic: null, attachment: null, notes: '',
}

export default function IntercomLeadNew() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INIT_FORM)
  const [errors, setErrors] = useState({})

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

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
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
          <p className="text-sm font-bold text-gray-700 mb-4">Lead Details</p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">

            {/* Row 1 */}
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

            {/* Row 2 */}
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

            {/* Row 3 */}
            <div className="col-span-2">
              <FormField label="Installation Address" required error={errors.installationAddress}>
                <Textarea
                  value={form.installationAddress}
                  onChange={e => { set('installationAddress', e.target.value); setErrors(p => ({ ...p, installationAddress: '' })) }}
                  placeholder="House/Flat no., Street, Building name, Area" rows={2}
                />
              </FormField>
            </div>

            {/* Row 4 */}
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

            {/* Row 5 */}
            <FormField label="Profile Picture">
              <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                form.profilePic ? 'border-emerald-400 bg-emerald-50' : 'border-surface-border bg-gray-50 hover:border-brand-blue/50 hover:bg-brand-blue/5'
              }`}>
                <input type="file" accept=".jpg,.jpeg,.png" className="hidden"
                  onChange={e => e.target.files?.[0] && set('profilePic', e.target.files[0])} />
                {form.profilePic ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span className="text-xs font-medium text-emerald-700 truncate">{form.profilePic.name}</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} className="text-gray-400 shrink-0" />
                    <span className="text-xs font-semibold text-gray-600">Click to upload · JPG or PNG</span>
                  </>
                )}
              </label>
            </FormField>

            <FormField label="Attachment">
              <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                form.attachment ? 'border-emerald-400 bg-emerald-50' : 'border-surface-border bg-gray-50 hover:border-brand-blue/50 hover:bg-brand-blue/5'
              }`}>
                <input type="file" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" className="hidden"
                  onChange={e => e.target.files?.[0] && set('attachment', e.target.files[0])} />
                {form.attachment ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span className="text-xs font-medium text-emerald-700 truncate">{form.attachment.name}</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} className="text-gray-400 shrink-0" />
                    <span className="text-xs font-semibold text-gray-600">Click to upload · Any document type</span>
                  </>
                )}
              </label>
            </FormField>

            {/* Row 6 */}
            <div className="col-span-2">
              <FormField label="Notes">
                <Textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="Any additional notes about this lead…" rows={3} />
              </FormField>
            </div>

          </div>
        </div>
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

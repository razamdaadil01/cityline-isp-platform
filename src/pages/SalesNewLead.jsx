import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, FileText, X, MapPin } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import {
  getStates, getDistricts, getAreasList, getLocalities, getSubLocalities, lookupSubLocality,
} from '../data/areaMappingStore'
import { saveFeasibilityRequest } from '../data/feasibilityStore'

// ── Shared constants (mirrors Sales.jsx) ────────────────────────────────────

const PIPELINES = {
  B2C: {
    label: 'Residential', labelFull: 'Residential',
    stages: ['New Inquiry', 'Contacted', 'Follow-up', 'Site Survey', 'Quotation Sent', 'Negotiation', 'Hardware Assignment', 'Won', 'Lost'],
  },
  B2B: {
    label: 'Corporate', labelFull: 'Corporate',
    stages: ['New Inquiry', 'Meeting Scheduled', 'Requirement Analysis', 'Technical Feasibility', 'Commercial Proposal', 'Negotiation', 'Legal/Agreement', 'Hardware Assignment', 'Won', 'Lost'],
  },
  Custom: {
    label: 'Custom', labelFull: 'Custom Pipeline',
    stages: ['New Inquiry', 'Contacted', 'Quotation', 'Won', 'Lost'],
  },
}

const PIPELINE_STYLE = {
  B2C:    { active: 'bg-brand-blue text-white',   border: 'border-brand-blue',   idle: 'text-gray-600 hover:bg-gray-100 border-surface-border' },
  B2B:    { active: 'bg-navy text-white',         border: 'border-navy',         idle: 'text-gray-600 hover:bg-gray-100 border-surface-border' },
  Custom: { active: 'bg-brand-orange text-white', border: 'border-brand-orange', idle: 'text-gray-600 hover:bg-gray-100 border-surface-border' },
}

const ACTIVE_BG = { B2C: '#0A8DCD', B2B: '#0F2744', Custom: '#E8541A' }

const STAFF = [
  { name: 'Arjun Kumar',  initials: 'AK', color: 'bg-brand-blue'   },
  { name: 'Preethi Nair', initials: 'PN', color: 'bg-purple-500'   },
  { name: 'Suresh Babu',  initials: 'SB', color: 'bg-emerald-500'  },
  { name: 'Anita Sharma', initials: 'AS', color: 'bg-brand-orange' },
]

const SOURCES = ['Walk-in', 'Referral', 'Website', 'Cold Call', 'Social Media']
const PLANS   = ['50 Mbps Starter', '100 Mbps Home', '200 Mbps Pro', '500 Mbps Ultra']
const CONNECTION_TYPES = ['FTTH', 'Sector', 'Village']

const INIT_FORM = {
  pipeline: 'B2C',
  name: '', phone: '', email: '',
  state: '', district: '', area: '', locality: '', subLocality: '',
  source: '', plan: '', assigned: '', followUp: '', notes: '',
  kycDocs: {},
  feasibilityRequired: false,
  feasibilityLocalityName: '', feasibilitySubLocalityName: '',
  feasibilityAddress: '', feasibilityLandmark: '',
  feasibilityRequirement: '', feasibilityRemarks: '',
  feasibilityConnectionType: 'FTTH', feasibilityBranch: '',
}

// ── KYC Document Upload ───────────────────────────────────────────────────────

function KycSection({ kycDocs = {}, onChange }) {
  const DOCS = [
    { key: 'aadhaar',       label: 'Aadhaar Card',   accept: 'image/*,.pdf' },
    { key: 'panCard',       label: 'PAN Card',        accept: 'image/*,.pdf' },
    { key: 'customerPhoto', label: 'Customer Photo',  accept: 'image/*'      },
  ]

  function handleFile(key, file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev =>
      onChange({ ...kycDocs, [key]: { name: file.name, size: file.size, type: file.type, preview: ev.target.result } })
    reader.readAsDataURL(file)
  }

  function remove(key) {
    const next = { ...kycDocs }
    delete next[key]
    onChange(next)
  }

  function fmtSize(b) {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {DOCS.map(({ key, label, accept }) => {
        const doc = kycDocs[key]
        const isPdf = doc?.type === 'application/pdf'
        return (
          <div key={key} className="relative border-2 border-dashed border-surface-border rounded-xl p-4 hover:border-brand-blue/40 transition-colors bg-gray-50/50">
            {doc ? (
              <>
                {isPdf ? (
                  <div className="w-full h-20 bg-red-50 rounded-lg flex items-center justify-center mb-3">
                    <FileText size={28} className="text-red-400" />
                  </div>
                ) : (
                  <img src={doc.preview} alt={label} className="w-full h-20 object-cover rounded-lg mb-3" />
                )}
                <p className="text-xs font-semibold text-gray-700 truncate">{doc.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{fmtSize(doc.size)}</p>
                <button type="button" onClick={() => remove(key)}
                  className="absolute top-3 right-3 w-6 h-6 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center transition-colors">
                  <X size={11} className="text-red-600" />
                </button>
              </>
            ) : (
              <label className="cursor-pointer block text-center py-2">
                <input type="file" accept={accept} className="sr-only"
                  onChange={e => handleFile(key, e.target.files?.[0])} />
                <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Upload size={18} className="text-brand-blue" />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-0.5">{label}</p>
                <p className="text-[11px] text-gray-400">{accept.includes('pdf') ? 'Image or PDF' : 'Image only'}</p>
                <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-xs font-semibold">
                  <Upload size={10} /> Browse file
                </div>
              </label>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SalesNewLead() {
  const navigate = useNavigate()
  const [form, setForm]     = useState({ ...INIT_FORM })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  const pl = PIPELINES[form.pipeline]

  function validate() {
    const e = {}
    if (!form.name.trim())                      e.name  = 'Full name is required'
    if (!form.phone.match(/^\d{10}$/))          e.phone = 'Enter a valid 10-digit number'
    return e
  }

  const states = getStates()
  const districts = form.state ? getDistricts(form.state) : []
  const areas = form.state && form.district ? getAreasList(form.state, form.district) : []
  const localities = form.state && form.district && form.area ? getLocalities(form.state, form.district, form.area) : []
  const subLocalities = form.state && form.district && form.area && form.locality
    ? getSubLocalities(form.state, form.district, form.area, form.locality)
    : []

  const isOther = form.subLocality === '__other__'
  const mappedSubLocality = form.subLocality && !isOther
    ? lookupSubLocality(form.state, form.district, form.area, form.locality, form.subLocality)
    : null

  function handleCreate() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    const leadId = `LD-${Date.now()}`

    if (form.feasibilityRequired && isOther) {
      saveFeasibilityRequest({
        leadId,
        customerName: form.name,
        phone: form.phone,
        area: form.area,
        localityName: form.feasibilityLocalityName || form.locality,
        subLocalityName: form.feasibilitySubLocalityName || form.subLocality,
        connectionType: form.feasibilityConnectionType,
        assignedBranch: form.feasibilityBranch,
        feasibilityStatus: 'Pending',
      })
    }

    const staff = STAFF.find(s => s.name === form.assigned)
    const newLead = {
      ...form,
      id:               leadId,
      stage:            pl.stages[0],
      daysInStage:      0,
      lastActivity:     'Lead created',
      assignedInitials: staff?.initials ?? '??',
      assignedColor:    staff?.color ?? 'bg-gray-400',
      priority:         'medium',
      ekycStatus:       null,
      hwAssigned:       null,
    }
    navigate('/sales', { state: { newLead } })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-5 shrink-0 bg-white border-b border-surface-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/sales')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create New Lead</h1>
            <p className="text-sm text-gray-500 mt-0.5">Fill in the details to add a new lead to the pipeline</p>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

        {/* Pipeline selector */}
        <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
          <p className="text-sm font-bold text-gray-700 mb-3">
            Pipeline <span className="text-red-400">*</span>
          </p>
          <div className="flex gap-2.5">
            {Object.keys(PIPELINES).map(key => {
              const isActive = form.pipeline === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => set('pipeline', key)}
                  style={isActive ? { backgroundColor: ACTIVE_BG[key], color: '#fff' } : {}}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    isActive ? 'shadow-sm border-transparent' : PIPELINE_STYLE[key].idle
                  }`}
                >
                  {PIPELINES[key].label}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
            <span className="font-semibold text-gray-600">{pl.labelFull}</span>
            <span>·</span>
            <span>{pl.stages.length} stages</span>
            <span>·</span>
            <span>starts at <strong className="text-gray-600">{pl.stages[0]}</strong></span>
          </p>
        </div>

        {/* Lead details card */}
        <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
          <p className="text-sm font-bold text-gray-700 mb-4">Lead Details</p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">

            <FormField label="Full Name" required>
              <Input
                value={form.name}
                onChange={e => { set('name', e.target.value); setErrors(p => ({ ...p, name: '' })) }}
                placeholder="Ramesh Nair"
                className={errors.name ? 'border-red-400 focus:ring-red-400/30' : ''}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </FormField>

            <FormField label="Phone Number" required>
              <Input
                type="tel"
                value={form.phone}
                onChange={e => { set('phone', e.target.value.replace(/\D/g, '').slice(0, 10)); setErrors(p => ({ ...p, phone: '' })) }}
                placeholder="9876543210"
                className={errors.phone ? 'border-red-400 focus:ring-red-400/30' : ''}
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </FormField>

            <FormField label="Email Address">
              <Input type="email" value={form.email}
                onChange={e => set('email', e.target.value)} placeholder="ramesh@email.com" />
            </FormField>

            <FormField label="State">
              <Select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value, district: '', area: '', locality: '', subLocality: '', feasibilityRequired: false }))}>
                <option value="">Select state…</option>
                {states.map(s => <option key={s}>{s}</option>)}
              </Select>
            </FormField>

            <FormField label="District">
              <Select value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value, area: '', locality: '', subLocality: '', feasibilityRequired: false }))} disabled={!form.state}>
                <option value="">Select district…</option>
                {districts.map(d => <option key={d}>{d}</option>)}
              </Select>
            </FormField>

            <FormField label="Area">
              <Select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value, locality: '', subLocality: '', feasibilityRequired: false }))} disabled={!form.district}>
                <option value="">Select area…</option>
                {areas.map(a => <option key={a}>{a}</option>)}
              </Select>
            </FormField>

            <FormField label="Locality">
              <Select value={form.locality} onChange={e => setForm(f => ({ ...f, locality: e.target.value, subLocality: '', feasibilityRequired: false }))} disabled={!form.area}>
                <option value="">Select locality…</option>
                {localities.map(l => <option key={l}>{l}</option>)}
              </Select>
            </FormField>

            <FormField label="Sub Locality">
              <Select value={form.subLocality} onChange={e => setForm(f => ({ ...f, subLocality: e.target.value, feasibilityRequired: false }))} disabled={!form.locality}>
                <option value="">Select sub locality…</option>
                {subLocalities.map(sl => <option key={sl.subLocality}>{sl.subLocality}</option>)}
                <option value="__other__">Other (not in list)</option>
              </Select>
            </FormField>

            {/* Auto-filled site info — only for mapped selections */}
            {mappedSubLocality && (
              <div className="flex items-center gap-3 col-span-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-brand-blue/20 rounded-lg">
                  <MapPin size={13} className="text-brand-blue shrink-0" />
                  <span className="text-xs text-gray-600">Site Type:</span>
                  <Badge variant="blue" size="sm">{mappedSubLocality.siteType}</Badge>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-brand-blue/20 rounded-lg">
                  <span className="text-xs text-gray-600">Branch Code:</span>
                  <span className="text-xs font-mono font-semibold text-navy">{mappedSubLocality.branchCode}</span>
                </div>
              </div>
            )}

            {/* Feasibility required — shown only when "Other (not in list)" is selected */}
            {isOther && (
              <div className="col-span-2 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.feasibilityRequired}
                    onChange={e => set('feasibilityRequired', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30" />
                  <span className="text-sm font-medium text-gray-700">This area requires feasibility check</span>
                </label>

                {form.feasibilityRequired && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
                    <p className="text-xs font-semibold text-amber-700">Feasibility Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Enter Locality Name">
                        <Input value={form.feasibilityLocalityName}
                          onChange={e => set('feasibilityLocalityName', e.target.value)}
                          placeholder={form.locality || 'Locality name'} />
                      </FormField>
                      <FormField label="Enter Sub Locality Name">
                        <Input value={form.feasibilitySubLocalityName}
                          onChange={e => set('feasibilitySubLocalityName', e.target.value)}
                          placeholder={form.subLocality || 'Sub locality name'} />
                      </FormField>
                      <div className="col-span-2">
                        <FormField label="Complete Address">
                          <Textarea value={form.feasibilityAddress}
                            onChange={e => set('feasibilityAddress', e.target.value)}
                            placeholder="Full address" rows={2} />
                        </FormField>
                      </div>
                      <FormField label="Landmark">
                        <Input value={form.feasibilityLandmark}
                          onChange={e => set('feasibilityLandmark', e.target.value)}
                          placeholder="Nearby landmark" />
                      </FormField>
                      <FormField label="Expected Connection Type">
                        <Select value={form.feasibilityConnectionType}
                          onChange={e => set('feasibilityConnectionType', e.target.value)}>
                          {CONNECTION_TYPES.map(t => <option key={t}>{t}</option>)}
                        </Select>
                      </FormField>
                      <div className="col-span-2">
                        <FormField label="Customer Requirement">
                          <Textarea value={form.feasibilityRequirement}
                            onChange={e => set('feasibilityRequirement', e.target.value)}
                            placeholder="Describe connectivity needs" rows={2} />
                        </FormField>
                      </div>
                      <FormField label="Assigned Branch">
                        <Input value={form.feasibilityBranch}
                          onChange={e => set('feasibilityBranch', e.target.value)}
                          placeholder="e.g. CNPL-001" />
                      </FormField>
                      <FormField label="Remarks">
                        <Input value={form.feasibilityRemarks}
                          onChange={e => set('feasibilityRemarks', e.target.value)}
                          placeholder="Any remarks" />
                      </FormField>
                      <div className="col-span-2 flex items-center gap-2 px-3 py-2 bg-amber-100 rounded-lg">
                        <span className="text-xs text-amber-700 font-medium">Feasibility Status will be set to:</span>
                        <Badge variant="yellow" size="sm">Pending</Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <FormField label="Lead Source">
              <Select value={form.source} onChange={e => set('source', e.target.value)}>
                <option value="">Select source…</option>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </FormField>

            <FormField label="Interested Plan">
              <Select value={form.plan} onChange={e => set('plan', e.target.value)}>
                <option value="">Select plan…</option>
                {PLANS.map(p => <option key={p}>{p}</option>)}
              </Select>
            </FormField>

            <FormField label="Assigned To">
              <Select value={form.assigned} onChange={e => set('assigned', e.target.value)}>
                <option value="">Select sales rep…</option>
                {STAFF.map(s => <option key={s.name}>{s.name}</option>)}
              </Select>
            </FormField>

            <FormField label="Follow-up Date">
              <Input type="date" value={form.followUp} onChange={e => set('followUp', e.target.value)} />
            </FormField>

            <div className="col-span-2">
              <FormField label="Notes">
                <Textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Any additional notes about this lead…"
                  rows={3}
                />
              </FormField>
            </div>

          </div>
        </div>

        {/* KYC Documents card */}
        <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={15} className="text-gray-500" />
            <p className="text-sm font-bold text-gray-700">KYC Documents</p>
            <span className="text-xs text-gray-400 font-normal">— optional, can be added later</span>
          </div>
          <KycSection
            kycDocs={form.kycDocs ?? {}}
            onChange={docs => set('kycDocs', docs)}
          />
          {(() => {
            const n = ['aadhaar', 'panCard', 'customerPhoto'].filter(k => form.kycDocs?.[k]).length
            if (!n) return null
            return (
              <p className={`text-xs font-medium mt-3 ${n === 3 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {n === 3 ? '✓ All 3 KYC documents uploaded' : `${n}/3 documents uploaded`}
              </p>
            )
          })()}
        </div>

      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 shrink-0 bg-white border-t border-surface-border flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Fields marked <span className="text-red-400 font-semibold">*</span> are required
        </p>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/sales')}>Cancel</Button>
          <Button onClick={handleCreate}>Create Lead</Button>
        </div>
      </div>

    </div>
  )
}

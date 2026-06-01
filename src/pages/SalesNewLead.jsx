import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, X, MapPin, CheckCircle, AlertTriangle, ChevronDown, Calendar } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import {
  getStates, getDistricts, getAreasList, getLocalities, getSubLocalities, lookupSubLocality,
} from '../data/areaMappingStore'
import { saveFeasibilityRequest } from '../data/feasibilityStore'
import { saveFollowup } from '../data/followupStore'
import { getLeads, saveLead } from '../data/leadsStore'
import { getPipelines, subscribePipelines } from '../data/pipelineStore'
import { getFormModules } from '../data/customFormStore'
import { getStageFields, subscribeStageFields } from '../data/stageFieldsStore'
import DynamicFieldInput, { isFieldFilled } from '../components/ui/DynamicFieldInput'

// ── Shared constants (mirrors Sales.jsx) ────────────────────────────────────

const PIPELINES = {
  B2C: {
    label: 'Residential', labelFull: 'Residential',
    stages: ['New Inquiry', 'Follow-up', 'Feasibility', 'Installation Visit', 'Won', 'Lost'],
  },
  B2B: {
    label: 'Corporate', labelFull: 'Corporate',
    stages: ['New Inquiry', 'Meeting Scheduled', 'Requirement Analysis', 'Technical Feasibility', 'Commercial Proposal', 'Negotiation', 'Legal/Agreement', 'Won', 'Lost'],
  },
  Custom: {
    label: 'Custom', labelFull: 'Custom Pipeline',
    stages: ['New Inquiry', 'Contacted', 'Quotation', 'Won', 'Lost'],
  },
  Enterprise: {
    label: 'Enterprise', labelFull: 'Enterprise Pipeline',
    stages: ['New Inquiry Filed', 'Discussion', 'Follow-up', 'Proposal', 'Won', 'Lost'],
  },
}

const STAFF = [
  { name: 'Arjun Kumar',  initials: 'AK', color: 'bg-brand-blue'   },
  { name: 'Preethi Nair', initials: 'PN', color: 'bg-purple-500'   },
  { name: 'Suresh Babu',  initials: 'SB', color: 'bg-emerald-500'  },
  { name: 'Anita Sharma', initials: 'AS', color: 'bg-brand-orange' },
]

const SOURCES         = ['Walk-in', 'Referral', 'Website', 'Cold Call', 'Social Media']
const PLANS           = ['50 Mbps Starter', '100 Mbps Home', '200 Mbps Pro', '500 Mbps Ultra']
const CONNECTION_TYPES = ['FTTH', 'Sector', 'Village']
const BRANCHES        = ['CNPL-001', 'CNPL-002', 'CNPL-003', 'CNPL-010', 'CNPL-011']
const NOTIFY_USERS    = STAFF.map(s => s.name)

const INIT_FORM = {
  pipeline: 'B2C',
  startingStage: PIPELINES.B2C.stages[0],
  leadName: '',
  name: '', phone: '', alternatePhone: '', email: '',
  addressLine: '', city: '', pincode: '',
  state: '', district: '', area: '', locality: '', subLocality: '',
  source: '', plan: '', assigned: '',
  notes: '',
  // Follow-up
  followUpEnabled: false,
  followUp: '',
  followUpTime: '',
  followUpNotes: '',
  followUpNotify: [],
  kycDocs: {},
  // Feasibility
  feasibilityRequired: false,
  feasibilityLocalityName: '', feasibilitySubLocalityName: '',
  feasibilityAddress: '', feasibilityLandmark: '',
  feasibilityRequirement: '', feasibilityRemarks: '',
  feasibilityConnectionType: 'FTTH', feasibilityBranch: '',
  // Enterprise
  companyName: '', gstRegistered: false, gstNumber: '', companyAddress: '',
}

const PIPELINE_MAP = { B2C: 'PL-001', B2B: 'PL-002', Enterprise: 'PL-003' }

// ── Duplicate Warning Banner ──────────────────────────────────────────────────

function DuplicateBanner({ lead, fieldLabel, onView, onContinue, onDismiss }) {
  const PIPELINE_LABEL = { B2C: 'Residential', B2B: 'Corporate', Custom: 'Custom', Enterprise: 'Enterprise' }
  return (
    <div className="shrink-0 flex items-center gap-4 px-6 py-3 bg-amber-50 border-b border-amber-300">
      <AlertTriangle size={18} className="text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-amber-900">Duplicate lead detected</p>
        <p className="text-xs text-amber-700 mt-0.5">
          A lead already exists with this {fieldLabel}:{' '}
          <span className="font-semibold text-amber-900">{lead.name}</span>
          {' — '}{PIPELINE_LABEL[lead.pipeline] ?? lead.pipeline}{' — '}{lead.stage}
          {' · Created '}{lead.createdAt}{' · Assigned to '}{lead.assigned || '—'}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onView}
          className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          View Existing Lead
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="px-3 py-1.5 text-xs font-semibold border border-amber-400 text-amber-700 bg-white rounded-lg hover:bg-amber-100 transition-colors"
        >
          Continue Anyway
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-amber-500 hover:bg-amber-100 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Multi-Select Dropdown ─────────────────────────────────────────────────────

function MultiSelectDropdown({ options, value = [], onChange, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggle(option) {
    onChange(value.includes(option) ? value.filter(v => v !== option) : [...value, option])
  }

  const displayText = value.length === 0
    ? null
    : value.length <= 2
      ? value.join(', ')
      : `${value.slice(0, 2).join(', ')} +${value.length - 2} more`

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
      >
        <span className={value.length === 0 ? 'text-gray-400' : 'text-gray-800'}>
          {displayText ?? placeholder}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-white border border-surface-border rounded-lg shadow-lg overflow-hidden">
          {options.map(option => (
            <label key={option} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={value.includes(option)}
                onChange={() => toggle(option)}
                className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SalesNewLead() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [form, setForm]             = useState({
    ...INIT_FORM,
    feasibilityRequired: searchParams.get('feasibility') === 'true',
  })
  const [errors, setErrors]         = useState({})
  const [submitted, setSubmitted]   = useState(false)
  const [pipelines, setPipelines]   = useState(getPipelines)
  const [stageFieldVals, setStageFieldVals] = useState({})
  const [stageErrors, setStageErrors]       = useState({})
  const [, setSfTick]               = useState(0)
  const [phoneDup, setPhoneDup]         = useState(null)
  const [altPhoneDup, setAltPhoneDup]   = useState(null)
  const [phoneContinued, setPhoneContinued]       = useState(false)
  const [altPhoneContinued, setAltPhoneContinued] = useState(false)

  useEffect(() => subscribePipelines(setPipelines), [])
  useEffect(() => subscribeStageFields(() => setSfTick(n => n + 1)), [])

  function set(f, v) {
    setForm(p => ({ ...p, [f]: v }))
    if (f === 'pipeline') { setStageFieldVals({}); setStageErrors({}) }
  }

  function findDuplicate(phoneNum) {
    if (!phoneNum || phoneNum.length !== 10) return null
    return getLeads().find(l => l.phone === phoneNum || l.alternateMobile === phoneNum) ?? null
  }

  function handlePhoneBlur() {
    if (form.phone.length === 10) {
      setPhoneDup(findDuplicate(form.phone))
      setPhoneContinued(false)
    }
  }

  function handleAltPhoneBlur() {
    if (form.alternatePhone.length === 10) {
      setAltPhoneDup(findDuplicate(form.alternatePhone))
      setAltPhoneContinued(false)
    }
  }

  const PIPELINE_STORE_IDS = { B2C: 'PL-001', B2B: 'PL-002', Enterprise: 'PL-003' }
  const activePipelineKeys = Object.keys(PIPELINES).filter(key => {
    const pid = PIPELINE_STORE_IDS[key]
    if (!pid) return true
    const p = pipelines.find(pl => pl.id === pid)
    return !p || p.active !== false
  })

  const pl = PIPELINES[form.pipeline]
  const activePipeline = pipelines.find(p => p.id === (PIPELINE_MAP[form.pipeline] ?? ''))
  const selectedStageName = form.startingStage || pl.stages[0]
  const firstStage = activePipeline?.stages.find(s => s.name === selectedStageName)
    ?? activePipeline?.stages[0]
  const firstStageFields = firstStage
    ? getStageFields(firstStage.id).filter(f => f.active !== false)
    : []
  const visibleStageFields = firstStageFields.filter(f =>
    !f.conditionalOn || stageFieldVals[f.conditionalOn.fieldId] === f.conditionalOn.value
  )

  function validate() {
    const e = {}
    if (!form.leadName.trim())         e.leadName = 'Lead name is required'
    if (!form.name.trim())             e.name     = form.pipeline === 'Enterprise' ? 'Contact person is required' : 'Full name is required'
    if (!form.phone.match(/^\d{10}$/)) e.phone    = 'Enter a valid 10-digit number'
    if (form.alternatePhone && !form.alternatePhone.match(/^\d{10}$/))
                                       e.alternatePhone = 'Enter a valid 10-digit number'
    if (form.pincode && !form.pincode.match(/^\d{6}$/))
                                       e.pincode = 'Enter a valid 6-digit pincode'
    if (form.pipeline === 'Enterprise') {
      if (!form.companyName.trim())    e.companyName = 'Company name is required'
      if (!form.source)                e.source      = 'Lead source is required'
      if (form.gstRegistered) {
        if (!form.gstNumber.trim())    e.gstNumber      = 'GST number is required'
        if (!form.companyAddress.trim()) e.companyAddress = 'Company address is required'
      }
    }

    if (form.followUpEnabled) {
      if (!form.followUp)     e.followUp     = 'Follow-up date is required'
      if (!form.followUpTime) e.followUpTime = 'Follow-up time is required'
      if (form.followUp && form.followUpTime) {
        const dt = new Date(`${form.followUp}T${form.followUpTime}`)
        if (dt <= new Date()) e.followUp = 'Date and time cannot be in the past'
      }
    }

    const se = {}
    visibleStageFields.filter(f => f.required).forEach(f => {
      if (!isFieldFilled(f, stageFieldVals[f.id])) se[f.id] = `${f.label} is required`
    })
    setStageErrors(se)
    return { ...e, ...se }
  }

  const states      = getStates()
  const districts   = form.state ? getDistricts(form.state) : []
  const areas       = form.state && form.district ? getAreasList(form.state, form.district) : []
  const localities  = form.state && form.district && form.area
    ? getLocalities(form.state, form.district, form.area) : []
  const subLocalities = form.state && form.district && form.area && form.locality
    ? getSubLocalities(form.state, form.district, form.area, form.locality)
    : []

  const showFollowUp = getFormModules()[form.pipeline]?.includeFollowUp !== false

  const isOther = form.subLocality === '__other__'
  const mappedSubLocality = form.subLocality && !isOther
    ? lookupSubLocality(form.state, form.district, form.area, form.locality, form.subLocality)
    : null

  // Fix 1: show auto-detected fields when a mapped sub locality is selected
  const showAutoDetect = !!form.subLocality && !isOther

  // Fix 2: show feasibility banner when sub locality is not in mapping
  const showFeasibilityBanner = isOther

  function handleCreate() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    const hasDuplicate = (phoneDup && phoneContinued) || (altPhoneDup && altPhoneContinued)

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

    if (form.followUpEnabled && form.followUp) {
      saveFollowup({
        id: `FU-${Date.now()}`,
        leadId,
        leadName: form.leadName || form.name,
        customer: form.name,
        pipeline: { B2C: 'Residential', B2B: 'Corporate', Enterprise: 'Enterprise' }[form.pipeline] ?? 'Custom',
        phone: form.phone,
        date: form.followUp,
        time: form.followUpTime,
        note: form.followUpNotes,
        stage: selectedStageName,
        assignedTo: form.assigned || '',
        notifyTo: form.followUpNotify,
        priority: 'medium',
        status: 'Pending',
      })
    }

    const staff = STAFF.find(s => s.name === form.assigned)
    const today = new Date().toISOString().slice(0, 10)
    const newLead = {
      ...form,
      id:               leadId,
      alternateMobile:  form.alternatePhone,
      ...(form.pipeline === 'Enterprise' ? { contactPerson: form.name } : {}),
      stage:            selectedStageName,
      daysInStage:      0,
      lastActivity:     'Lead created',
      createdAt:        today,
      createdBy:        'Admin User',
      assignedInitials: staff?.initials ?? '??',
      assignedColor:    staff?.color ?? 'bg-gray-400',
      priority:         'medium',
      ekycStatus:       null,
      hwAssigned:       null,
      stageHistory: [{
        stage:   selectedStageName,
        date:    today,
        movedBy: 'Admin User',
        fields:  Object.keys(stageFieldVals).length > 0 ? stageFieldVals : {},
      }],
      activityLog: hasDuplicate ? [{
        id:   Date.now(),
        icon: '⚠️',
        text: 'Created despite duplicate mobile number warning',
        user: 'Admin User',
        time: 'just now',
      }] : [],
    }
    saveLead(newLead)
    navigate(`/sales/leads/${leadId}`)
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

      {/* ── Duplicate banners ───────────────────────────────────────────── */}
      {phoneDup && !phoneContinued && (
        <DuplicateBanner
          lead={phoneDup}
          fieldLabel="mobile number"
          onView={() => navigate(`/sales/leads/${phoneDup.id}`)}
          onContinue={() => setPhoneContinued(true)}
          onDismiss={() => { setPhoneDup(null); setPhoneContinued(false) }}
        />
      )}
      {altPhoneDup && !altPhoneContinued && (
        <DuplicateBanner
          lead={altPhoneDup}
          fieldLabel="alternate number"
          onView={() => navigate(`/sales/leads/${altPhoneDup.id}`)}
          onContinue={() => setAltPhoneContinued(true)}
          onDismiss={() => { setAltPhoneDup(null); setAltPhoneContinued(false) }}
        />
      )}

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

        {/* Lead details card */}
        <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
          <p className="text-sm font-bold text-gray-700 mb-4">Lead Details</p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">

            <div className="col-span-2">
              <FormField label="Lead Name" required>
                <Input
                  value={form.leadName}
                  onChange={e => { set('leadName', e.target.value); setErrors(p => ({ ...p, leadName: '' })) }}
                  placeholder="e.g. Customer Name — Plan Interest"
                  className={errors.leadName ? 'border-red-400 focus:ring-red-400/30' : ''}
                />
                {errors.leadName && <p className="text-xs text-red-500 mt-1">{errors.leadName}</p>}
              </FormField>
            </div>

            {/* Enterprise: Company Name + GST fields */}
            {form.pipeline === 'Enterprise' && (
              <>
                <div className="col-span-2">
                  <FormField label="Company Name" required>
                    <Input
                      value={form.companyName}
                      onChange={e => { set('companyName', e.target.value); setErrors(p => ({ ...p, companyName: '' })) }}
                      placeholder="e.g. Acme Technologies Pvt Ltd"
                      className={errors.companyName ? 'border-red-400 focus:ring-red-400/30' : ''}
                    />
                    {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName}</p>}
                  </FormField>
                </div>
                <div className="col-span-2 flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-surface-border rounded-lg">
                  <span className="text-sm font-medium text-gray-700">GST Registered <span className="text-red-400">*</span></span>
                  <button
                    type="button"
                    onClick={() => { set('gstRegistered', !form.gstRegistered); setErrors(p => ({ ...p, gstNumber: '', companyAddress: '' })) }}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${form.gstRegistered ? 'bg-brand-blue' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${form.gstRegistered ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                {form.gstRegistered && (
                  <>
                    <FormField label="GST Number" required>
                      <Input
                        value={form.gstNumber}
                        onChange={e => { set('gstNumber', e.target.value.toUpperCase()); setErrors(p => ({ ...p, gstNumber: '' })) }}
                        placeholder="e.g. 29AABCT1332L1ZB"
                        className={`font-mono ${errors.gstNumber ? 'border-red-400 focus:ring-red-400/30' : ''}`}
                      />
                      {errors.gstNumber && <p className="text-xs text-red-500 mt-1">{errors.gstNumber}</p>}
                    </FormField>
                    <div className="col-span-2">
                      <FormField label="Company Address" required>
                        <Textarea
                          value={form.companyAddress}
                          onChange={e => { set('companyAddress', e.target.value); setErrors(p => ({ ...p, companyAddress: '' })) }}
                          placeholder="Registered company address"
                          rows={2}
                          className={errors.companyAddress ? 'border-red-400 focus:ring-red-400/30' : ''}
                        />
                        {errors.companyAddress && <p className="text-xs text-red-500 mt-1">{errors.companyAddress}</p>}
                      </FormField>
                    </div>
                  </>
                )}
              </>
            )}

            <FormField label={form.pipeline === 'Enterprise' ? 'Contact Person' : 'Full Name'} required>
              <Input
                value={form.name}
                onChange={e => { set('name', e.target.value); setErrors(p => ({ ...p, name: '' })) }}
                placeholder={form.pipeline === 'Enterprise' ? 'Primary contact name' : 'Ramesh Nair'}
                className={errors.name ? 'border-red-400 focus:ring-red-400/30' : ''}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </FormField>

            <FormField label="Phone Number" required>
              <Input
                type="tel"
                value={form.phone}
                onChange={e => {
                  set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))
                  setErrors(p => ({ ...p, phone: '' }))
                  setPhoneDup(null)
                  setPhoneContinued(false)
                }}
                onBlur={handlePhoneBlur}
                placeholder="9876543210"
                className={errors.phone ? 'border-red-400 focus:ring-red-400/30' : phoneDup && !phoneContinued ? 'border-amber-400 focus:ring-amber-400/30' : ''}
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </FormField>

            <FormField label="Alternate Number">
              <Input
                type="tel"
                value={form.alternatePhone}
                onChange={e => {
                  set('alternatePhone', e.target.value.replace(/\D/g, '').slice(0, 10))
                  setErrors(p => ({ ...p, alternatePhone: '' }))
                  setAltPhoneDup(null)
                  setAltPhoneContinued(false)
                }}
                onBlur={handleAltPhoneBlur}
                placeholder="9876543210"
                className={errors.alternatePhone ? 'border-red-400 focus:ring-red-400/30' : altPhoneDup && !altPhoneContinued ? 'border-amber-400 focus:ring-amber-400/30' : ''}
              />
              {errors.alternatePhone && <p className="text-xs text-red-500 mt-1">{errors.alternatePhone}</p>}
            </FormField>

            <FormField label="Email Address">
              <Input type="email" value={form.email}
                onChange={e => set('email', e.target.value)} placeholder="ramesh@email.com" />
            </FormField>

            {/* ── Address Section ─────────────────────────────────────────── */}

            <div className="col-span-2">
              <FormField label="Address Line">
                <Textarea
                  value={form.addressLine}
                  onChange={e => set('addressLine', e.target.value)}
                  placeholder={"House/Flat no., Street, Building name"}
                  rows={2}
                />
              </FormField>
            </div>

            <FormField label="City">
              <Input
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="e.g. Bangalore"
              />
            </FormField>

            <FormField label="Pincode">
              <Input
                value={form.pincode}
                onChange={e => {
                  set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))
                  setErrors(p => ({ ...p, pincode: '' }))
                }}
                placeholder="e.g. 560076"
                className={errors.pincode ? 'border-red-400 focus:ring-red-400/30' : ''}
              />
              {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
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

            {/* ── Fix 1: Auto-detected Site Type + Branch Code ────────────── */}
            {showAutoDetect && (
              <div className="col-span-2 space-y-2">
                <p className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                  <MapPin size={11} className="text-brand-blue" />
                  Auto-detected from area mapping
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Site Type">
                    <Input
                      value={mappedSubLocality?.siteType ?? 'Not mapped'}
                      disabled
                      readOnly
                      className="bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200"
                    />
                  </FormField>
                  <FormField label="Branch Code">
                    <Input
                      value={mappedSubLocality?.branchCode ?? 'Not mapped'}
                      disabled
                      readOnly
                      className="bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200 font-mono"
                    />
                  </FormField>
                </div>
              </div>
            )}

            {/* ── Fix 2: Feasibility Required Banner ──────────────────────── */}
            {showFeasibilityBanner && (
              <div className="col-span-2 space-y-3">
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">Selected area is not fully mapped.</p>
                    <p className="text-xs text-amber-700 mt-0.5">Mark as feasibility required?</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={form.feasibilityRequired}
                      onChange={e => {
                        set('feasibilityRequired', e.target.checked)
                        if (e.target.checked) {
                          setSearchParams({ feasibility: 'true' })
                        } else {
                          setSearchParams({})
                        }
                      }}
                      className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-400/30"
                    />
                    <span className="text-sm font-semibold text-amber-800">Feasibility Required</span>
                  </label>
                </div>

                {form.feasibilityRequired && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Feasibility Details</p>
                    <div className="grid grid-cols-2 gap-4">

                      <FormField label="Enter Locality Name">
                        <Input value={form.feasibilityLocalityName}
                          onChange={e => set('feasibilityLocalityName', e.target.value)}
                          placeholder={form.locality || 'Locality name'} />
                      </FormField>

                      <FormField label="Enter Sub Locality Name">
                        <Input value={form.feasibilitySubLocalityName}
                          onChange={e => set('feasibilitySubLocalityName', e.target.value)}
                          placeholder="Sub locality name" />
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
                        <Select value={form.feasibilityBranch}
                          onChange={e => set('feasibilityBranch', e.target.value)}>
                          <option value="">Select branch…</option>
                          {BRANCHES.map(b => <option key={b}>{b}</option>)}
                        </Select>
                      </FormField>

                      <div className="col-span-2">
                        <FormField label="Remarks">
                          <Textarea value={form.feasibilityRemarks}
                            onChange={e => set('feasibilityRemarks', e.target.value)}
                            placeholder="Any remarks" rows={2} />
                        </FormField>
                      </div>

                      <div className="col-span-2 flex items-center gap-2 px-3 py-2 bg-amber-100 rounded-lg">
                        <span className="text-xs text-amber-700 font-medium">Feasibility Status will be set to:</span>
                        <Badge variant="yellow" size="sm">Pending</Badge>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lead meta */}
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

            <div className="col-span-2">
              <FormField label="Assigned To">
                <Select value={form.assigned} onChange={e => set('assigned', e.target.value)}>
                  <option value="">Select sales rep…</option>
                  {STAFF.map(s => <option key={s.name}>{s.name}</option>)}
                </Select>
              </FormField>
            </div>

          </div>
        </div>

        {/* Pipeline selector */}
        <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
          <div className="grid grid-cols-2 gap-5">
            <FormField label="Pipeline" required>
              <Select
                value={form.pipeline}
                onChange={e => {
                  const key = e.target.value
                  setForm(p => ({ ...p, pipeline: key, startingStage: PIPELINES[key]?.stages[0] ?? '' }))
                  setStageFieldVals({})
                  setStageErrors({})
                }}
              >
                {activePipelineKeys.map(key => (
                  <option key={key} value={key}>{PIPELINES[key].label}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Starting Stage" required hint="Lead will start at this stage">
              <Select
                value={selectedStageName}
                onChange={e => set('startingStage', e.target.value)}
              >
                {pl.stages.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </FormField>
          </div>
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
            <span className="font-semibold text-gray-600">{pl.labelFull}</span>
            <span>·</span>
            <span>{pl.stages.length} stages</span>
            <span>·</span>
            <span>starts at <strong className="text-gray-600">{selectedStageName}</strong></span>
          </p>
        </div>

        {/* Stage Fields card — dynamic fields for first stage */}
        {firstStageFields.length > 0 && (
          <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-gray-700">
                  Fields for{' '}
                  <span className="text-brand-blue">{firstStage?.name}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Configured in Pipeline Builder · {visibleStageFields.filter(f => f.required).length} required
                </p>
              </div>
              <span className="text-[11px] text-gray-500 font-medium bg-surface rounded-full px-2.5 py-1 border border-surface-border">
                {visibleStageFields.filter(f => isFieldFilled(f, stageFieldVals[f.id])).length}/{visibleStageFields.length} filled
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-4">
              {visibleStageFields.map(f => {
                const isWide = ['Textarea', 'Multi-select', 'Radio', 'File Upload'].includes(f.type)
                return (
                  <div key={f.id} className={isWide ? 'col-span-2' : ''}>
                    <FormField
                      label={f.label}
                      required={f.required}
                      hint={f.help || undefined}
                      error={stageErrors[f.id]}
                    >
                      <DynamicFieldInput
                        field={f}
                        value={stageFieldVals[f.id]}
                        onChange={val => {
                          setStageFieldVals(p => ({ ...p, [f.id]: val }))
                          if (stageErrors[f.id]) setStageErrors(p => ({ ...p, [f.id]: '' }))
                        }}
                      />
                    </FormField>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {firstStageFields.length === 0 && activePipeline && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
            <CheckCircle size={14} className="text-emerald-500 shrink-0" />
            No additional fields configured for <strong className="ml-1">{firstStage?.name ?? pl.stages[0]}</strong>
          </div>
        )}

        {/* Set Follow-up section */}
        {showFollowUp && <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0">
                <Calendar size={15} className="text-brand-blue" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">Set Follow-up</p>
                <p className="text-xs text-gray-400 mt-0.5">Schedule a follow-up reminder for this lead</p>
              </div>
            </div>
            {/* Toggle switch */}
            <button
              type="button"
              role="switch"
              aria-checked={form.followUpEnabled}
              onClick={() => {
                if (form.followUpEnabled) {
                  setForm(p => ({ ...p, followUpEnabled: false, followUp: '', followUpTime: '', followUpNotes: '', followUpNotify: [] }))
                  setErrors(p => ({ ...p, followUp: '', followUpTime: '' }))
                } else {
                  set('followUpEnabled', true)
                }
              }}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-1 ${
                form.followUpEnabled ? 'bg-brand-blue' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  form.followUpEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {form.followUpEnabled && (
            <div className="mt-4 pt-4 border-t border-surface-border grid grid-cols-2 gap-x-5 gap-y-4">

              <FormField label="Follow-up Date" required>
                <Input
                  type="date"
                  value={form.followUp}
                  onChange={e => { set('followUp', e.target.value); setErrors(p => ({ ...p, followUp: '' })) }}
                  className={errors.followUp ? 'border-red-400 focus:ring-red-400/30' : ''}
                />
                {errors.followUp && <p className="text-xs text-red-500 mt-1">{errors.followUp}</p>}
              </FormField>

              <FormField label="Follow-up Time" required>
                <Input
                  type="time"
                  value={form.followUpTime}
                  onChange={e => { set('followUpTime', e.target.value); setErrors(p => ({ ...p, followUpTime: '' })) }}
                  className={errors.followUpTime ? 'border-red-400 focus:ring-red-400/30' : ''}
                />
                {errors.followUpTime && <p className="text-xs text-red-500 mt-1">{errors.followUpTime}</p>}
              </FormField>

              <div className="col-span-2">
                <FormField label="Notes">
                  <Textarea
                    value={form.followUpNotes}
                    onChange={e => set('followUpNotes', e.target.value)}
                    placeholder="Follow-up agenda or notes…"
                    rows={2}
                  />
                </FormField>
              </div>

              <div className="col-span-2">
                <FormField label="Notify Users">
                  <MultiSelectDropdown
                    options={NOTIFY_USERS}
                    value={form.followUpNotify}
                    onChange={v => set('followUpNotify', v)}
                    placeholder="Select team members to notify…"
                  />
                  {form.followUpNotify.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                      <AlertTriangle size={11} className="shrink-0" />
                      No notifiers selected — at least one is recommended
                    </p>
                  )}
                </FormField>
              </div>

            </div>
          )}
        </div>}

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

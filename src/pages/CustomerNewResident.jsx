import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, User, Link2, MapPin, Package, AlertTriangle, ChevronLeft, ChevronRight, Check,
} from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select } from '../components/ui/FormInputs'
import StepProgress from '../components/customer-type/StepProgress'
import ConnectionTypeStep, { EMPTY_CONNECTION_TYPE, isConnectionTypeValid } from '../components/customer-type/ConnectionTypeStep'
import AddressSectionStep, { EMPTY_ADDRESS_SECTION, isAddressSectionValid, isPackageStepBlocked } from '../components/customer-type/AddressSectionStep'
import PackageSelectionStep from '../components/customer-type/PackageSelectionStep'
import { getFieldConfig, subscribeFieldConfig } from '../data/fieldConfigStore'
import { getServiceTagsForType } from '../data/serviceTags'
import { saveLead, nextSalesLeadId } from '../data/leadsStore'
import { getFeasibilityRequests, subscribeFeasibility } from '../data/feasibilityStore'
import { getPlans } from '../data/packagesStore'

const STEPS = [
  { id: 1, label: 'Basic Details',    icon: User },
  { id: 2, label: 'Connection Type',  icon: Link2 },
  { id: 3, label: 'Address',          icon: MapPin },
  { id: 4, label: 'Package',          icon: Package },
]

const BRANCHES = ['CNPL-001', 'CNPL-002', 'CNPL-WHI-01', 'CNPL-MAR-01', 'CNPL-IND-01', 'CNPL-NOI-01']
const LEAD_SOURCES = ['Referral', 'Walk-in', 'Website', 'Field Survey', 'Campaign']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COLOR_PALETTE = ['bg-brand-blue', 'bg-purple-500', 'bg-emerald-500', 'bg-brand-orange', 'bg-teal-500', 'bg-pink-500']

// TODO: exact Branch → Sales Executive mapping isn't specified in the PRD
// (FR-6's note only says "filtered by selected Branch") — this mock mapping
// is a placeholder; confirm the real assignment rule with the BA.
const SALES_EXECUTIVES_BY_BRANCH = {
  'CNPL-001':    ['Arjun Kumar', 'Preethi Nair'],
  'CNPL-002':    ['Suresh Babu', 'Anita Sharma'],
  'CNPL-WHI-01': ['Arjun Kumar', 'Suresh Babu'],
  'CNPL-MAR-01': ['Preethi Nair', 'Anita Sharma'],
  'CNPL-IND-01': ['Arjun Kumar', 'Anita Sharma'],
  'CNPL-NOI-01': ['Suresh Babu', 'Preethi Nair'],
}

function initialsOf(name) {
  return (name || '??').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
function colorFor(name) {
  const idx = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % COLOR_PALETTE.length
  return COLOR_PALETTE[idx] || COLOR_PALETTE[0]
}

const EMPTY_FORM = {
  branch: '', firstName: '', lastName: '', primaryNumber: '', alternativeNumber: '', email: '',
  serviceTags: [], salesExecutive: '', leadSource: '',
  connectionType: { ...EMPTY_CONNECTION_TYPE },
  address: { ...EMPTY_ADDRESS_SECTION },
  package: null,
}

export default function CustomerNewResident() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [leadId] = useState(() => nextSalesLeadId('resident'))

  const [form, setForm] = useState(EMPTY_FORM)
  const [attempted, setAttempted] = useState(false)

  const [fieldConfig, setFieldConfig] = useState(() =>
    Object.fromEntries(getFieldConfig('resident').map(f => [f.fieldName, f])))
  useEffect(() => subscribeFieldConfig(() => {
    setFieldConfig(Object.fromEntries(getFieldConfig('resident').map(f => [f.fieldName, f])))
  }), [])

  const [feasibilityRecord, setFeasibilityRecord] = useState(() =>
    getFeasibilityRequests().find(r => r.leadId === leadId) ?? null)
  useEffect(() => subscribeFeasibility(() => {
    setFeasibilityRecord(getFeasibilityRequests().find(r => r.leadId === leadId) ?? null)
  }), [leadId])

  const activeTags = useMemo(
    () => getServiceTagsForType('resident').filter(t => t.status === 'Active'),
    [])

  function req(fieldName) { return fieldConfig[fieldName]?.mandatory !== false }

  const stepParam = Number(searchParams.get('step'))
  const step = [1, 2, 3, 4].includes(stepParam) ? stepParam : 1

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // ── Step validation ─────────────────────────────────────────────────────
  function isStep1Valid() {
    if (req('Branch') && !form.branch) return false
    if (req('First Name') && !form.firstName.trim()) return false
    if (req('Last Name') && !form.lastName.trim()) return false
    if (!/^\d{10}$/.test(form.primaryNumber)) return false // BR-5, always required (locked)
    if (form.alternativeNumber && !/^\d{10}$/.test(form.alternativeNumber)) return false
    if (req('Alternative Number') && !form.alternativeNumber) return false
    if (form.email && !EMAIL_REGEX.test(form.email)) return false // BR-6
    if (req('Email') && !form.email) return false
    if (req('Service Tag') && form.serviceTags.length === 0) return false
    if (req('Sales Executive') && !form.salesExecutive) return false
    if (req('Lead Source') && !form.leadSource) return false
    return true
  }
  function isStep2Valid() { return isConnectionTypeValid(form.connectionType) } // Connection Type is locked-mandatory
  function isStep3Valid() { return !req('Address Section') || isAddressSectionValid(form.address) }
  const packageBlocked = isPackageStepBlocked(form.address, feasibilityRecord)
  function isStep4Valid() { return !packageBlocked && (!req('Package Selection') || !!form.package) }

  const stepValid = { 1: isStep1Valid(), 2: isStep2Valid(), 3: isStep3Valid(), 4: isStep4Valid() }

  function isReachable(id) {
    if (id === 1) return true
    for (let i = 1; i < id; i++) if (!stepValid[i]) return false
    return true
  }

  function goTo(id) {
    setAttempted(false)
    setSearchParams({ step: String(id) })
  }
  function goNext() {
    if (!stepValid[step]) { setAttempted(true); return }
    setAttempted(false)
    setSearchParams({ step: String(Math.min(step + 1, 4)) })
  }
  function goBack() {
    setAttempted(false)
    setSearchParams({ step: String(Math.max(step - 1, 1)) })
  }

  function handleSubmit() {
    if (!isStep4Valid()) { setAttempted(true); return }
    const today = new Date().toISOString().slice(0, 10)
    const tagNames = activeTags.filter(t => form.serviceTags.includes(t.id)).map(t => t.name)
    const plans = getPlans()
    const planName = plans.find(p => p.id === form.package?.packageId)?.name || ''
    const name = `${form.firstName} ${form.lastName}`.trim()

    const newLead = {
      id: leadId,
      customerType: 'Resident',
      pipeline: 'B2C',
      stage: 'New Inquiry',
      name,
      phone: form.primaryNumber,
      alternateMobile: form.alternativeNumber,
      email: form.email,
      branchCode: form.branch,
      serviceTags: tagNames,
      source: form.leadSource,
      assigned: form.salesExecutive,
      assignedInitials: initialsOf(form.salesExecutive),
      assignedColor: colorFor(form.salesExecutive),
      daysInStage: 0,
      lastActivity: 'Customer created via Resident creation form',
      followUp: '',
      priority: 'medium',
      ekycStatus: null,
      hwAssigned: null,
      createdAt: today,
      createdBy: 'Admin User',
      connectionType: form.connectionType.connectionType,
      entityId: form.connectionType.connectionType === 'Own' ? form.connectionType.entityId : null,
      partnerId: form.connectionType.connectionType === 'Partner' ? form.connectionType.partnerId : null,
      billingTo: form.connectionType.connectionType === 'Partner' ? form.connectionType.billingTo : null,
      address: form.address,
      state: form.address.billing.state,
      district: form.address.billing.district,
      area: form.address.billing.area,
      locality: form.address.billing.locality,
      subLocality: form.address.billing.subLocality,
      pincode: form.address.billing.pincode,
      selectedPackage: form.package,
      plan: planName,
      stageHistory: [{ stage: 'New Inquiry', date: today, movedBy: 'Admin User', fields: {} }],
      activityLog: [],
    }
    saveLead(newLead)
    navigate(`/sales/leads/${leadId}`)
  }

  const branchExecutives = form.branch ? (SALES_EXECUTIVES_BY_BRANCH[form.branch] || []) : []

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 shrink-0 bg-white border-b border-surface-border">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate('/customers')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">New Resident Customer</h1>
            <p className="text-sm text-gray-500 mt-0.5">Customer Type — Resident · Lead ID {leadId}</p>
          </div>
        </div>
        <StepProgress steps={STEPS} current={step} isReachable={isReachable} onSelect={goTo} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">
          <div className="bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-5">
            {attempted && !stepValid[step] && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Please complete all mandatory fields correctly before continuing.
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Branch" required={req('Branch')}>
                    <Select value={form.branch} onChange={e => { set('branch', e.target.value); set('salesExecutive', '') }}>
                      <option value="">Select branch...</option>
                      {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Sales Executive" required={req('Sales Executive')} hint={!form.branch ? 'Select a branch first' : undefined}>
                    <Select disabled={!form.branch} value={form.salesExecutive} onChange={e => set('salesExecutive', e.target.value)}>
                      <option value="">Select...</option>
                      {branchExecutives.map(n => <option key={n} value={n}>{n}</option>)}
                    </Select>
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="First Name" required={req('First Name')}>
                    <Input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Rajan" />
                  </FormField>
                  <FormField label="Last Name" required={req('Last Name')}>
                    <Input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Mehta" />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Primary Number" required>
                    <Input value={form.primaryNumber} maxLength={10} placeholder="9876543210"
                      onChange={e => set('primaryNumber', e.target.value.replace(/\D/g, ''))} />
                  </FormField>
                  <FormField label="Alternative Number" required={req('Alternative Number')}>
                    <Input value={form.alternativeNumber} maxLength={10} placeholder="9876543211"
                      onChange={e => set('alternativeNumber', e.target.value.replace(/\D/g, ''))} />
                  </FormField>
                </div>
                <FormField label="Email" required={req('Email')}>
                  <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="rajan@email.com" />
                </FormField>
                <FormField label="Lead Source" required={req('Lead Source')}>
                  <Select value={form.leadSource} onChange={e => set('leadSource', e.target.value)}>
                    <option value="">Select...</option>
                    {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </FormField>
                <FormField label="Service Tag" required={req('Service Tag')} hint="Resident-mapped, Active tags only (BR-2)">
                  <div className="flex flex-wrap gap-2">
                    {activeTags.map(tag => {
                      const selected = form.serviceTags.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => set('serviceTags', selected
                            ? form.serviceTags.filter(id => id !== tag.id)
                            : [...form.serviceTags, tag.id])}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                            ${selected ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-gray-600 border-surface-border hover:border-brand-blue/40'}`}
                        >
                          {tag.name}
                        </button>
                      )
                    })}
                    {activeTags.length === 0 && <p className="text-xs text-gray-400">No active Resident service tags configured.</p>}
                  </div>
                </FormField>
              </div>
            )}

            {step === 2 && (
              <ConnectionTypeStep value={form.connectionType} onChange={v => set('connectionType', v)} />
            )}

            {step === 3 && (
              <AddressSectionStep
                value={form.address}
                onChange={v => set('address', v)}
                leadId={leadId}
                customerName={`${form.firstName} ${form.lastName}`.trim() || 'Unnamed'}
                phone={form.primaryNumber}
                pipeline="B2C"
                branch={form.branch}
              />
            )}

            {step === 4 && (
              <PackageSelectionStep
                customerType="resident"
                value={form.package}
                onChange={v => set('package', v)}
                blocked={packageBlocked}
                feasibilityRecord={feasibilityRecord}
              />
            )}
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between mt-5">
            <Button variant="secondary" size="sm" icon={<ChevronLeft size={14} />} onClick={goBack} disabled={step === 1}>
              Back
            </Button>
            {step < 4 ? (
              <Button size="sm" iconRight={<ChevronRight size={14} />} onClick={goNext}>Continue</Button>
            ) : (
              <Button size="sm" icon={<Check size={14} />} onClick={handleSubmit} disabled={!stepValid[4]}>
                Create Customer
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

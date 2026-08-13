import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Building2, Users, Link2, MapPin, Package, AlertTriangle,
  ChevronLeft, ChevronRight, Check, Loader2, CheckCircle2,
} from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select } from '../components/ui/FormInputs'
import StepProgress from '../components/customer-type/StepProgress'
import ConnectionTypeStep, { EMPTY_CONNECTION_TYPE, isConnectionTypeValid } from '../components/customer-type/ConnectionTypeStep'
import AddressSectionStep, { EMPTY_ADDRESS_SECTION, isAddressSectionValid, isPackageStepBlocked } from '../components/customer-type/AddressSectionStep'
import PackageSelectionStep from '../components/customer-type/PackageSelectionStep'
import { getFieldConfig, subscribeFieldConfig } from '../data/fieldConfigStore'
import { getServiceTagsForType } from '../data/serviceTags'
import { getLeads, saveLead, nextSalesLeadId } from '../data/leadsStore'
import { getFeasibilityRequests, subscribeFeasibility } from '../data/feasibilityStore'
import { getPlans } from '../data/packagesStore'
import { GSTIN_REGEX } from '../data/companyEntities'
import { lookupGstin } from '../data/gstLookup'

const STEPS = [
  { id: 1, label: 'Company/GST',      icon: Building2 },
  { id: 2, label: 'Contacts',         icon: Users },
  { id: 3, label: 'Connection Type',  icon: Link2 },
  { id: 4, label: 'Address',          icon: MapPin },
  { id: 5, label: 'Package',          icon: Package },
]

const BRANCHES = ['CNPL-001', 'CNPL-002', 'CNPL-WHI-01', 'CNPL-MAR-01', 'CNPL-IND-01', 'CNPL-NOI-01']
const ASSIGNEES = ['Arjun Kumar', 'Preethi Nair', 'Suresh Babu', 'Anita Sharma']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\d{10}$/
const COLOR_PALETTE = ['bg-brand-blue', 'bg-purple-500', 'bg-emerald-500', 'bg-brand-orange', 'bg-teal-500', 'bg-pink-500']

function initialsOf(name) {
  return (name || '??').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
function colorFor(name) {
  const idx = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % COLOR_PALETTE.length
  return COLOR_PALETTE[idx] || COLOR_PALETTE[0]
}

const EMPTY_FORM = {
  branch: '', gstNumber: '', gstType: '', pan: '', legalName: '',
  contactPersonName: '', contactPersonEmail: '', primaryNumber: '',
  accountsEmail: '', accountsName: '', accountsPhone: '',
  technicalEmail: '', technicalName: '', technicalPhone: '',
  connectionType: { ...EMPTY_CONNECTION_TYPE },
  serviceTags: [], assignedTo: '',
  address: { ...EMPTY_ADDRESS_SECTION },
  package: null,
}

export default function CustomerNewCorporate() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [leadId] = useState(() => nextSalesLeadId('corporate'))

  const [form, setForm] = useState(EMPTY_FORM)
  const [attempted, setAttempted] = useState(false)

  // ── GST auto-fetch state (UI Checklist #7, AC-2/AC-4) ───────────────────
  const [gstStatus, setGstStatus] = useState('idle') // idle | loading | success | error
  const [gstError, setGstError] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState(null) // { lead, overrideReason } | null
  const [panError, setPanError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (form.gstNumber.length !== 15) { setGstStatus('idle'); return }
    setGstStatus('loading')
    lookupGstin(form.gstNumber).then(result => {
      if (cancelled) return
      if (!result.success) {
        setGstStatus('error')
        setGstError(result.error)
        return
      }
      setGstStatus('success')
      setForm(f => ({ ...f, gstType: result.data.gstType, pan: result.data.pan, legalName: result.data.legalName }))
      const match = getLeads().find(l =>
        l.pipeline === 'Enterprise' && l.gstNumber && l.gstNumber.toUpperCase() === form.gstNumber && l.stage !== 'Lost')
      setDuplicateWarning(match ? { lead: match, overrideReason: '' } : null) // BR-3
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.gstNumber])

  useEffect(() => {
    if (form.pan && form.gstNumber.length === 15) {
      const expected = form.gstNumber.slice(2, 12)
      setPanError(form.pan.toUpperCase() !== expected ? 'PAN does not match characters 3–12 of the GSTIN (BR-4).' : '')
    } else {
      setPanError('')
    }
  }, [form.pan, form.gstNumber])

  const [fieldConfig, setFieldConfig] = useState(() =>
    Object.fromEntries(getFieldConfig('corporate').map(f => [f.fieldName, f])))
  useEffect(() => subscribeFieldConfig(() => {
    setFieldConfig(Object.fromEntries(getFieldConfig('corporate').map(f => [f.fieldName, f])))
  }), [])

  const [feasibilityRecord, setFeasibilityRecord] = useState(() =>
    getFeasibilityRequests().find(r => r.leadId === leadId) ?? null)
  useEffect(() => subscribeFeasibility(() => {
    setFeasibilityRecord(getFeasibilityRequests().find(r => r.leadId === leadId) ?? null)
  }), [leadId])

  const activeTags = useMemo(
    () => getServiceTagsForType('corporate').filter(t => t.status === 'Active'),
    [])

  function req(fieldName) { return fieldConfig[fieldName]?.mandatory !== false }

  const stepParam = Number(searchParams.get('step'))
  const step = [1, 2, 3, 4, 5].includes(stepParam) ? stepParam : 1

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // ── Step validation ─────────────────────────────────────────────────────
  function isStep1Valid() {
    if (req('Branch') && !form.branch) return false
    if (req('GST Number') && !GSTIN_REGEX.test(form.gstNumber)) return false
    if (form.gstNumber && gstStatus === 'error') return false
    if (panError) return false
    if (req('GST Type') && !form.gstType) return false
    if (req('PAN') && !form.pan) return false
    if (req('Legal Company Name') && !form.legalName.trim()) return false
    return true
  }
  function isStep2Valid() {
    if (req('Contact Person Name') && !form.contactPersonName.trim()) return false
    if (form.contactPersonEmail && !EMAIL_REGEX.test(form.contactPersonEmail)) return false
    if (req('Contact Person Email') && !form.contactPersonEmail) return false
    if (!PHONE_REGEX.test(form.primaryNumber)) return false // locked, BR-5
    if (form.accountsEmail && !EMAIL_REGEX.test(form.accountsEmail)) return false
    if (req('Accounts Email') && !form.accountsEmail) return false
    if (req('Accounts Name') && !form.accountsName.trim()) return false
    if (form.accountsPhone && !PHONE_REGEX.test(form.accountsPhone)) return false
    if (req('Accounts Phone') && !form.accountsPhone) return false
    if (form.technicalEmail && !EMAIL_REGEX.test(form.technicalEmail)) return false
    if (req('Technical Email') && !form.technicalEmail) return false
    if (req('Technical Name') && !form.technicalName.trim()) return false
    if (form.technicalPhone && !PHONE_REGEX.test(form.technicalPhone)) return false
    if (req('Technical Phone') && !form.technicalPhone) return false
    return true
  }
  function isStep3Valid() {
    if (!isConnectionTypeValid(form.connectionType)) return false // locked, BR-7/BR-8
    if (req('Service Tag') && form.serviceTags.length === 0) return false
    if (req('Assigned To/Sales Executive') && !form.assignedTo) return false
    return true
  }
  function isStep4Valid() { return !req('Address Section') || isAddressSectionValid(form.address) }
  const packageBlocked = isPackageStepBlocked(form.address, feasibilityRecord)
  function isStep5Valid() { return !packageBlocked && (!req('Package Selection') || !!form.package) }

  const stepValid = { 1: isStep1Valid(), 2: isStep2Valid(), 3: isStep3Valid(), 4: isStep4Valid(), 5: isStep5Valid() }

  function isReachable(id) {
    if (id === 1) return true
    for (let i = 1; i < id; i++) if (!stepValid[i]) return false
    return true
  }

  function goTo(id) { setAttempted(false); setSearchParams({ step: String(id) }) }
  function goNext() {
    if (!stepValid[step]) { setAttempted(true); return }
    setAttempted(false)
    setSearchParams({ step: String(Math.min(step + 1, 5)) })
  }
  function goBack() { setAttempted(false); setSearchParams({ step: String(Math.max(step - 1, 1)) }) }

  function handleSubmit() {
    if (!isStep5Valid()) { setAttempted(true); return }
    const today = new Date().toISOString().slice(0, 10)
    const tagNames = activeTags.filter(t => form.serviceTags.includes(t.id)).map(t => t.name)
    const plans = getPlans()
    const planName = plans.find(p => p.id === form.package?.packageId)?.name || ''
    const billing = form.address.billing
    const companyAddress = [billing.addressLine, billing.locality, billing.area, billing.district, billing.state, billing.pincode]
      .filter(Boolean).join(', ')

    const newLead = {
      id: leadId,
      customerType: 'Corporate',
      pipeline: 'Enterprise',
      stage: 'New Inquiry Filed',
      name: form.contactPersonName,
      companyName: form.legalName,
      contactPerson: form.contactPersonName,
      phone: form.primaryNumber,
      email: form.contactPersonEmail,
      branchCode: form.branch,
      serviceTags: tagNames,
      assigned: form.assignedTo,
      assignedInitials: initialsOf(form.assignedTo),
      assignedColor: colorFor(form.assignedTo),
      daysInStage: 0,
      lastActivity: 'Customer created via Corporate creation form',
      followUp: '',
      priority: 'medium',
      ekycStatus: null,
      hwAssigned: null,
      createdAt: today,
      createdBy: 'Admin User',
      gstRegistered: true,
      gstNumber: form.gstNumber,
      gstType: form.gstType,
      pan: form.pan,
      gstOverrideReason: duplicateWarning ? duplicateWarning.overrideReason : '',
      companyAddress,
      accountsContact: { email: form.accountsEmail, name: form.accountsName, phone: form.accountsPhone },
      technicalContact: { email: form.technicalEmail, name: form.technicalName, phone: form.technicalPhone },
      connectionType: form.connectionType.connectionType,
      entityId: form.connectionType.connectionType === 'Own' ? form.connectionType.entityId : null,
      partnerId: form.connectionType.connectionType === 'Partner' ? form.connectionType.partnerId : null,
      billingTo: form.connectionType.connectionType === 'Partner' ? form.connectionType.billingTo : null,
      address: form.address,
      state: billing.state, district: billing.district, area: billing.area,
      locality: billing.locality, subLocality: billing.subLocality, pincode: billing.pincode,
      selectedPackage: form.package,
      plan: planName,
      stageHistory: [{ stage: 'New Inquiry Filed', date: today, movedBy: 'Admin User', fields: {} }],
      activityLog: [],
    }
    saveLead(newLead)
    navigate(`/sales/leads/${leadId}`)
  }

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
            <h1 className="text-xl font-bold text-gray-900">New Corporate Customer</h1>
            <p className="text-sm text-gray-500 mt-0.5">Customer Type — Corporate · Lead ID {leadId}</p>
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
                <FormField label="Branch" required={req('Branch')}>
                  <Select value={form.branch} onChange={e => set('branch', e.target.value)}>
                    <option value="">Select branch...</option>
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </Select>
                </FormField>

                <FormField
                  label="GSTIN"
                  required={req('GST Number')}
                  error={gstStatus === 'error' ? gstError : undefined}
                  hint={gstStatus !== 'error' ? '15-character GSTIN — GST Type, PAN and Legal Company Name auto-fill on a valid entry' : undefined}
                >
                  <Input
                    value={form.gstNumber}
                    maxLength={15}
                    placeholder="27AABCU9603R1ZM"
                    className="font-mono uppercase"
                    onChange={e => set('gstNumber', e.target.value.toUpperCase())}
                  />
                </FormField>
                {gstStatus === 'loading' && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 -mt-2">
                    <Loader2 size={12} className="animate-spin" /> Fetching GST details...
                  </p>
                )}
                {gstStatus === 'success' && (
                  <p className="text-xs text-green-600 flex items-center gap-1.5 -mt-2">
                    <CheckCircle2 size={12} /> GST details fetched — fields below are editable.
                  </p>
                )}

                {duplicateWarning && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <p className="text-xs text-amber-800 flex items-start gap-1.5">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                      This GSTIN is already registered to an active customer
                      ({duplicateWarning.lead.companyName || duplicateWarning.lead.name}, {duplicateWarning.lead.id}).
                      BR-3 allows proceeding with an override reason instead of a hard block.
                    </p>
                    <Input
                      placeholder="Override reason (e.g. new branch registration)"
                      value={duplicateWarning.overrideReason}
                      onChange={e => setDuplicateWarning(w => ({ ...w, overrideReason: e.target.value }))}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="GST Type" required={req('GST Type')}>
                    <Select value={form.gstType} onChange={e => set('gstType', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="Regular">Regular</option>
                      <option value="Composition">Composition</option>
                    </Select>
                  </FormField>
                  <FormField label="PAN" required={req('PAN')} error={panError}>
                    <Input value={form.pan} maxLength={10} className="font-mono uppercase" placeholder="AABCU9603R"
                      onChange={e => set('pan', e.target.value.toUpperCase())} />
                  </FormField>
                </div>
                <FormField label="Legal Company Name" required={req('Legal Company Name')}>
                  <Input value={form.legalName} onChange={e => set('legalName', e.target.value)} placeholder="Acme Technologies Pvt Ltd" />
                </FormField>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Contact Person Name" required={req('Contact Person Name')}>
                    <Input value={form.contactPersonName} onChange={e => set('contactPersonName', e.target.value)} placeholder="Sunil Mehta" />
                  </FormField>
                  <FormField label="Contact Person Email" required={req('Contact Person Email')}>
                    <Input type="email" value={form.contactPersonEmail} onChange={e => set('contactPersonEmail', e.target.value)} placeholder="sunil@company.in" />
                  </FormField>
                </div>
                <FormField label="Primary Number" required>
                  <Input value={form.primaryNumber} maxLength={10} placeholder="9812340001"
                    onChange={e => set('primaryNumber', e.target.value.replace(/\D/g, ''))} />
                </FormField>

                <div className="border border-surface-border rounded-xl p-4 space-y-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Accounts Contact</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Accounts Name" required={req('Accounts Name')}>
                      <Input value={form.accountsName} onChange={e => set('accountsName', e.target.value)} />
                    </FormField>
                    <FormField label="Accounts Email" required={req('Accounts Email')}>
                      <Input type="email" value={form.accountsEmail} onChange={e => set('accountsEmail', e.target.value)} />
                    </FormField>
                  </div>
                  <FormField label="Accounts Phone" required={req('Accounts Phone')}>
                    <Input value={form.accountsPhone} maxLength={10}
                      onChange={e => set('accountsPhone', e.target.value.replace(/\D/g, ''))} />
                  </FormField>
                </div>

                <div className="border border-surface-border rounded-xl p-4 space-y-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Technical Contact</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Technical Name" required={req('Technical Name')}>
                      <Input value={form.technicalName} onChange={e => set('technicalName', e.target.value)} />
                    </FormField>
                    <FormField label="Technical Email" required={req('Technical Email')}>
                      <Input type="email" value={form.technicalEmail} onChange={e => set('technicalEmail', e.target.value)} />
                    </FormField>
                  </div>
                  <FormField label="Technical Phone" required={req('Technical Phone')}>
                    <Input value={form.technicalPhone} maxLength={10}
                      onChange={e => set('technicalPhone', e.target.value.replace(/\D/g, ''))} />
                  </FormField>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <ConnectionTypeStep value={form.connectionType} onChange={v => set('connectionType', v)} />

                <FormField label="Service Tag" required={req('Service Tag')} hint="Corporate-mapped, Active tags only (BR-2/AC-5)">
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
                    {activeTags.length === 0 && <p className="text-xs text-gray-400">No active Corporate service tags configured.</p>}
                  </div>
                </FormField>

                <FormField label="Assigned To / Sales Executive" required={req('Assigned To/Sales Executive')}>
                  <Select value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)}>
                    <option value="">Select...</option>
                    {ASSIGNEES.map(n => <option key={n} value={n}>{n}</option>)}
                  </Select>
                </FormField>
              </div>
            )}

            {step === 4 && (
              <AddressSectionStep
                value={form.address}
                onChange={v => set('address', v)}
                leadId={leadId}
                customerName={form.legalName || form.contactPersonName || 'Unnamed'}
                phone={form.primaryNumber}
                pipeline="Enterprise"
                branch={form.branch}
              />
            )}

            {step === 5 && (
              <PackageSelectionStep
                customerType="corporate"
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
            {step < 5 ? (
              <Button size="sm" iconRight={<ChevronRight size={14} />} onClick={goNext}>Continue</Button>
            ) : (
              <Button size="sm" icon={<Check size={14} />} onClick={handleSubmit} disabled={!stepValid[5]}>
                Create Customer
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

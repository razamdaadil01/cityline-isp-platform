import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, X, AlertTriangle, ChevronDown, Calendar,
  User, Building2, Users, Link2, MapPin, Package, Loader2, CheckCircle2, Check, Camera, Lock,
} from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import ConnectionTypeStep, { EMPTY_CONNECTION_TYPE, isConnectionTypeValid } from '../components/customer-type/ConnectionTypeStep'
import AddressSectionStep, { EMPTY_ADDRESS_SECTION, isAddressSectionValid, isPackageStepBlocked } from '../components/customer-type/AddressSectionStep'
import PackageSelectionStep from '../components/customer-type/PackageSelectionStep'
import { getCustomerTypes } from '../data/customerTypes'
import { getFieldConfig, subscribeFieldConfig } from '../data/fieldConfigStore'
import { getServiceTagsForType } from '../data/serviceTags'
import { getLeads, saveLead, nextSalesLeadId } from '../data/leadsStore'
import { getFeasibilityRequests, subscribeFeasibility } from '../data/feasibilityStore'
import { saveFollowup } from '../data/followupStore'
import { getPlans } from '../data/packagesStore'
import { GSTIN_REGEX } from '../data/companyEntities'
import { lookupGstin } from '../data/gstLookup'

// ── Edit-mode locked Pipeline/Stage pill styling ──────────────────────────────
// Same lookup tables the previous, now-retired standalone SalesEditLead form
// used for its "Pipeline & Stage" locked card — reused verbatim here since
// this page now serves both Create and Edit.
const PIPELINE_COLORS = { B2C: '#0A8DCD', Enterprise: '#0ea5e9', Custom: '#E8541A' }
const PIPELINE_LABELS = { B2C: 'Residential', Enterprise: 'Enterprise', Custom: 'Custom Pipeline' }
const STAGE_CHIP = {
  'New Inquiry':           'bg-blue-100 text-blue-700',
  'Contacted':             'bg-cyan-100 text-cyan-700',
  'Follow-up':             'bg-purple-100 text-purple-700',
  'Site Survey':           'bg-amber-100 text-amber-700',
  'Quotation Sent':        'bg-orange-100 text-orange-700',
  'Negotiation':           'bg-pink-100 text-pink-700',
  'Installation Visit':    'bg-purple-100 text-purple-700',
  'Won':                   'bg-emerald-100 text-emerald-700',
  'Lost':                  'bg-red-100 text-red-600',
  'Meeting Scheduled':     'bg-sky-100 text-sky-700',
  'Requirement Analysis':  'bg-indigo-100 text-indigo-700',
  'Technical Feasibility': 'bg-teal-100 text-teal-700',
  'Commercial Proposal':   'bg-orange-100 text-orange-600',
  'Legal/Agreement':       'bg-slate-100 text-slate-700',
  'Quotation':             'bg-amber-100 text-amber-700',
  'New Inquiry Filed':     'bg-blue-100 text-blue-700',
}

// ────────────────────────────────────────────────────────────────────────────
// This page used to be a single long form covering Residential/Enterprise/
// Custom pipeline leads generically (Pipeline Builder-driven Stage Fields,
// an area-mapping "unmapped sub-locality → feasibility required" auto-trigger,
// a Zone picker, etc), then briefly became a multi-step wizard. It's now a
// single continuous scrolling page again (matching the original layout),
// restructured around the Resident/Corporate Customer Type field sets
// (FR-6/FR-7) — reusing the exact section components, validation and GST
// auto-fetch logic originally built for the (now unrouted)
// CustomerNewResident.jsx / CustomerNewCorporate.jsx.
//
// TODO(BA/PM confirmation needed) — things dropped or changed by the Customer
// Type restructure, not explicitly addressed by that request:
//  - "Zone" (custType-driven Cityline/Partner → Zone list) has no equivalent
//    in FR-6/FR-7's field list. Dropped rather than kept as a parallel,
//    undocumented field — Address Section's cascading
//    State→District→Area→Locality→Sub-Locality hierarchy plus each form's
//    "Branch" field appear to cover the same ground.
//  - "Customer Service Type" (Residential/Enterprise) and the "Custom"
//    pipeline + its Pipeline-Builder-driven Stage Fields are no longer
//    reachable from this page — Customer Type (Resident/Corporate) now
//    determines the pipeline (B2C/Enterprise) directly. There is currently no
//    page for creating a "Custom"-pipeline lead.
//  - The old auto-detect (Site Type/Branch Code from a mapped sub-locality)
//    and its "sub-locality not in mapping → Feasibility Required" auto-trigger
//    are replaced by AddressSectionStep's manual Feasibility toggle — feasibility
//    is now admin-opted-in rather than automatically inferred from area mapping.
// ────────────────────────────────────────────────────────────────────────────

// ── Constants ────────────────────────────────────────────────────────────────

const STAFF = [
  { name: 'Arjun Kumar',  initials: 'AK', color: 'bg-brand-blue'   },
  { name: 'Preethi Nair', initials: 'PN', color: 'bg-purple-500'   },
  { name: 'Suresh Babu',  initials: 'SB', color: 'bg-emerald-500'  },
  { name: 'Anita Sharma', initials: 'AS', color: 'bg-brand-orange' },
]
const NOTIFY_USERS = STAFF.map(s => s.name)
const ASSIGNEES = STAFF.map(s => s.name) // Corporate "Assigned To/Sales Executive"

// The Customer Type Master uses ids 'resident'/'corporate', but the
// ?customerType= URL param uses 'residential'/'corporate' — kept distinct
// from the internal id so the URL reads naturally without renaming the
// Master's own ids everywhere they're used.
const CUSTOMER_TYPE_URL_SLUG = { resident: 'residential', corporate: 'corporate' }
const CUSTOMER_TYPE_FROM_SLUG = { residential: 'resident', corporate: 'corporate' }

const BRANCHES = ['CNPL-001', 'CNPL-002', 'CNPL-WHI-01', 'CNPL-MAR-01', 'CNPL-IND-01', 'CNPL-NOI-01']
const LEAD_SOURCES = ['Referral', 'Walk-in', 'Website', 'Field Survey', 'Campaign'] // FR-6
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\d{10}$/
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

const EMPTY_RESIDENT_FORM = {
  branch: '', firstName: '', lastName: '', primaryNumber: '', alternativeNumber: '', email: '',
  serviceTags: [], salesExecutive: '', leadSource: '',
  // Own is the default Connection Type for Resident, so the Entity dropdown
  // shows immediately without requiring the user to click "Own" first.
  connectionType: { ...EMPTY_CONNECTION_TYPE, connectionType: 'Own' },
  address: { ...EMPTY_ADDRESS_SECTION },
  package: null,
}
const EMPTY_CORPORATE_FORM = {
  branch: '', gstNumber: '', gstType: '', pan: '', legalName: '',
  contactPersonName: '', contactPersonEmail: '', primaryNumber: '',
  accountsEmail: '', accountsName: '', accountsPhone: '',
  technicalEmail: '', technicalName: '', technicalPhone: '',
  // Own is the default Connection Type for Corporate too, so the Entity
  // dropdown shows immediately without requiring the user to click "Own" first.
  connectionType: { ...EMPTY_CONNECTION_TYPE, connectionType: 'Own' },
  serviceTags: [], assignedTo: '',
  address: { ...EMPTY_ADDRESS_SECTION },
  package: null,
}
const EMPTY_FOLLOWUP = { enabled: false, date: '', time: '', notes: '', notify: [] }

// ── Edit-mode prefill — reverse-maps an existing lead record back into this
// form's rForm/cForm shape (the mirror image of submitResident/submitCorporate
// below). Kept next to the EMPTY_*_FORM constants they parallel. ──────────────

function addressSectionFromLead(lead) {
  // Leads created via this page already store `address` in
  // AddressSectionStep's own { billing, installation, ... } shape — reuse it
  // directly. Older/legacy leads only have flat state/district/area/locality/
  // subLocality/pincode fields (no nested `address` object, or `address` as a
  // plain string) — best-effort backfill those into a single Billing block
  // rather than losing them entirely.
  if (lead.address && typeof lead.address === 'object' && lead.address.billing) {
    return lead.address
  }
  const flatBlock = {
    ...EMPTY_ADDRESS_SECTION.billing,
    state:       lead.state       || '',
    district:    lead.district    || '',
    area:        lead.area        || '',
    locality:    lead.locality    || '',
    subLocality: lead.subLocality || '',
    addressLine: typeof lead.address === 'string' ? lead.address : '',
    pincode:     lead.pincode     || '',
  }
  return { ...EMPTY_ADDRESS_SECTION, billing: flatBlock, installation: flatBlock, sameAsBilling: true }
}

function connectionTypeFromLead(lead) {
  return {
    connectionType: lead.connectionType || '',
    entityId:       lead.entityId       || '',
    partnerId:      lead.partnerId      || '',
    billingTo:      lead.billingTo      || '',
  }
}

// serviceTags is stored on the lead as tag NAMES (see submitResident/
// submitCorporate), but rForm/cForm.serviceTags is a list of tag IDs (what
// the Service Tag buttons toggle against) — map back via the same Active-tags
// list the buttons render from. A tag that's since been deactivated won't
// resolve to an id (it won't show as a selectable button either), so it's
// dropped from the id list here; it's only lost from the record if the form
// is then saved without re-selecting it.
function serviceTagIdsFromNames(names, tags) {
  return (names || []).map(name => tags.find(t => t.name === name)?.id).filter(Boolean)
}

function residentFormFromLead(lead) {
  const tagIds = serviceTagIdsFromNames(lead.serviceTags, getServiceTagsForType('resident'))
  const [firstName, ...rest] = (lead.name || '').trim().split(/\s+/)
  return {
    branch:             lead.branchCode      || '',
    firstName:          firstName            || '',
    lastName:           rest.join(' '),
    primaryNumber:      lead.phone           || '',
    alternativeNumber:  lead.alternateMobile || '',
    email:              lead.email           || '',
    serviceTags:        tagIds,
    salesExecutive:     lead.assigned        || '',
    leadSource:         lead.source          || '',
    connectionType:     connectionTypeFromLead(lead),
    address:            addressSectionFromLead(lead),
    package:            lead.selectedPackage || null,
  }
}

function corporateFormFromLead(lead) {
  const tagIds = serviceTagIdsFromNames(lead.serviceTags, getServiceTagsForType('corporate'))
  return {
    branch:             lead.branchCode                 || '',
    gstNumber:          lead.gstNumber                  || '',
    gstType:            lead.gstType                     || '',
    pan:                lead.pan                         || '',
    legalName:          lead.companyName                 || '',
    contactPersonName:  lead.contactPerson || lead.name  || '',
    contactPersonEmail: lead.email                        || '',
    primaryNumber:      lead.phone                        || '',
    accountsEmail:      lead.accountsContact?.email      || '',
    accountsName:       lead.accountsContact?.name       || '',
    accountsPhone:      lead.accountsContact?.phone      || '',
    technicalEmail:     lead.technicalContact?.email     || '',
    technicalName:      lead.technicalContact?.name      || '',
    technicalPhone:     lead.technicalContact?.phone     || '',
    connectionType:     connectionTypeFromLead(lead),
    serviceTags:        tagIds,
    assignedTo:         lead.assigned                     || '',
    address:            addressSectionFromLead(lead),
    package:            lead.selectedPackage              || null,
  }
}

// ── Section header (icon badge + title, matches the Follow-up card's style) ─

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-brand-blue" />
      </div>
      <p className="text-sm font-bold text-gray-700">{title}</p>
    </div>
  )
}

// ── Duplicate Warning Banner (kept from the previous single-page form) ──────

function DuplicateBanner({ lead, fieldLabel, onView, onContinue, onDismiss }) {
  const PIPELINE_LABEL = { B2C: 'Residential', Custom: 'Custom', Enterprise: 'Enterprise' }
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
        <button type="button" onClick={onView}
          className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
          View Existing Lead
        </button>
        <button type="button" onClick={onContinue}
          className="px-3 py-1.5 text-xs font-semibold border border-amber-400 text-amber-700 bg-white rounded-lg hover:bg-amber-100 transition-colors">
          Continue Anyway
        </button>
        <button type="button" onClick={onDismiss}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-amber-500 hover:bg-amber-100 transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Multi-Select Dropdown (kept, used by Follow-up "Notify Users") ─────────

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
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors">
        <span className={value.length === 0 ? 'text-gray-400' : 'text-gray-800'}>
          {displayText ?? placeholder}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-white border border-surface-border rounded-lg shadow-lg overflow-hidden">
          {options.map(option => (
            <label key={option} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors">
              <input type="checkbox" checked={value.includes(option)} onChange={() => toggle(option)}
                className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30" />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function initialsFromName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : ''
  return (first + last).toUpperCase()
}

// Sits to the left of Customer Type/Starting Stage in the Service
// Configuration card. Reuses the same FileReader.readAsDataURL upload
// pattern as KycSection's Customer Photo (Sales.jsx) — stores
// { name, size, type, preview } with preview as a data URL.
function ProfilePictureUpload({ name, value, onChange }) {
  const inputRef = useRef(null)
  const initials = initialsFromName(name)

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev =>
      onChange({ name: file.name, size: file.size, type: file.type, preview: ev.target.result })
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col items-center gap-2 shrink-0 sm:w-32">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-2 border-brand-blue/40 bg-blue-50 flex items-center justify-center overflow-hidden">
          {value?.preview ? (
            <img src={value.preview} alt="Profile" className="w-full h-full object-cover" />
          ) : initials ? (
            <span className="text-lg font-semibold text-brand-blue">{initials}</span>
          ) : (
            <User size={28} className="text-brand-blue/50" />
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center shadow-md border-2 border-white hover:bg-brand-blue/90 transition-colors"
        >
          <Camera size={13} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }}
        />
      </div>
      <p className="text-xs text-gray-500">Profile Picture</p>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

// `lead` is passed by SalesEditLead when editing an existing lead — its
// presence is the sole edit/create switch (isEdit = !!lead) so both routes
// render this exact same component/structure per the FR-6/FR-7 Customer Type
// field sets, instead of Edit maintaining its own separate, drifted form.
export default function SalesNewLead({ lead = null } = {}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isEdit = !!lead
  const [leadId] = useState(() => lead?.id ?? nextSalesLeadId())

  const customerTypes = useMemo(() => getCustomerTypes().filter(t => t.status === 'Active'), [])

  // Customer Type is driven by ?customerType= (residential|corporate) rather
  // than local-only state, so it's shareable/refresh-safe and survives
  // back/forward — same merge-safe setSearchParams(prev => new
  // URLSearchParams(prev)) pattern used by ?modal=/?step= elsewhere.
  // In edit mode Customer Type is locked to whatever the lead already is
  // (it drives Pipeline, which can't change after creation), so it's read
  // straight off the lead instead — the /edit route never carries this param.
  // `pipeline` ('B2C' | 'Enterprise') is checked first, not `customerType`
  // alone: every lead has `pipeline` (it's set by the Sales Kanban, Move
  // Stage, and every other lead-creation path this app has ever had), while
  // `customerType` ('Resident' | 'Corporate') only exists on leads created
  // via this Customer-Type-driven form. Keying off `customerType` alone left
  // every pre-existing Enterprise lead (which has no `customerType` field at
  // all) falling through to the 'resident' default — showing/prefilling the
  // wrong (Resident) field set for a Corporate lead like LD-305.
  const customerTypeSlug = searchParams.get('customerType')
  const customerTypeFromSlug = CUSTOMER_TYPE_FROM_SLUG[customerTypeSlug]
  const customerType = isEdit
    ? (lead.pipeline === 'Enterprise' || lead.customerType === 'Corporate' ? 'corporate' : 'resident')
    : (customerTypes.some(t => t.id === customerTypeFromSlug)
        ? customerTypeFromSlug
        : (customerTypes[0]?.id ?? 'resident'))
  const isCorporate = customerType === 'corporate'

  // On first load, if there's no (or an invalid) ?customerType= param,
  // default to Residential and write it into the URL via a history replace
  // (not push) so it doesn't add an extra back-button entry. Skipped in edit
  // mode — Customer Type there comes from the lead, not the URL.
  useEffect(() => {
    if (isEdit) return
    if (!CUSTOMER_TYPE_FROM_SLUG[searchParams.get('customerType')]) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.set('customerType', CUSTOMER_TYPE_URL_SLUG[customerType])
        return next
      }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Only the matching mapper ever touches the lead's data — prefilling the
  // *other* type's form from a mismatched-shape lead is both pointless
  // (that form never renders) and unnecessary risk, so it stays untouched.
  const [rForm, setRForm] = useState(() => isEdit && !isCorporate ? residentFormFromLead(lead) : EMPTY_RESIDENT_FORM)
  const [cForm, setCForm] = useState(() => isEdit && isCorporate ? corporateFormFromLead(lead) : EMPTY_CORPORATE_FORM)
  const [followUp, setFollowUp] = useState(EMPTY_FOLLOWUP)
  const [attempted, setAttempted] = useState(false)
  // Lives above the Resident/Corporate fork (Service Configuration card), so
  // it's kept as its own piece of state rather than duplicated into
  // rForm/cForm — it shouldn't reset when the Customer Type dropdown changes.
  const [profilePicture, setProfilePicture] = useState(() => lead?.profilePicture ?? null)

  function handleCustomerTypeChange(next) {
    setAttempted(false)
    setSearchParams(prev => {
      const nextParams = new URLSearchParams(prev)
      nextParams.set('customerType', CUSTOMER_TYPE_URL_SLUG[next] ?? next)
      return nextParams
    })
  }

  // ── Field Configuration (live, both types kept warm) ──────────────────────
  const [residentFieldConfig, setResidentFieldConfig] = useState(() =>
    Object.fromEntries(getFieldConfig('resident').map(f => [f.fieldName, f])))
  const [corporateFieldConfig, setCorporateFieldConfig] = useState(() =>
    Object.fromEntries(getFieldConfig('corporate').map(f => [f.fieldName, f])))
  useEffect(() => subscribeFieldConfig(() => {
    setResidentFieldConfig(Object.fromEntries(getFieldConfig('resident').map(f => [f.fieldName, f])))
    setCorporateFieldConfig(Object.fromEntries(getFieldConfig('corporate').map(f => [f.fieldName, f])))
  }), [])
  const fieldConfig = isCorporate ? corporateFieldConfig : residentFieldConfig
  function req(fieldName) { return fieldConfig[fieldName]?.mandatory !== false }

  // ── Feasibility (shared leadId across both forms) ─────────────────────────
  const [feasibilityRecord, setFeasibilityRecord] = useState(() =>
    getFeasibilityRequests().find(r => r.leadId === leadId) ?? null)
  useEffect(() => subscribeFeasibility(() => {
    setFeasibilityRecord(getFeasibilityRequests().find(r => r.leadId === leadId) ?? null)
  }), [leadId])

  // ── Active Service Tags ────────────────────────────────────────────────────
  const residentTags = useMemo(() => getServiceTagsForType('resident').filter(t => t.status === 'Active'), [])
  const corporateTags = useMemo(() => getServiceTagsForType('corporate').filter(t => t.status === 'Active'), [])

  // ── Duplicate phone detection (kept) ──────────────────────────────────────
  const [phoneDup, setPhoneDup]   = useState(null)
  const [altPhoneDup, setAltPhoneDup] = useState(null)
  const [phoneContinued, setPhoneContinued]       = useState(false)
  const [altPhoneContinued, setAltPhoneContinued] = useState(false)

  function findDuplicate(phoneNum) {
    if (!phoneNum || phoneNum.length !== 10) return null
    // Excludes the lead being edited itself — in create mode leadId is a
    // freshly-generated id that can't collide with anything, so this is a
    // no-op there.
    return getLeads().find(l => l.id !== leadId && (l.phone === phoneNum || l.alternateMobile === phoneNum)) ?? null
  }
  function handlePhoneBlur(phone) {
    if (phone.length === 10) { setPhoneDup(findDuplicate(phone)); setPhoneContinued(false) }
  }
  function handleAltPhoneBlur(phone) {
    if (phone.length === 10) { setAltPhoneDup(findDuplicate(phone)); setAltPhoneContinued(false) }
  }

  // ── GST auto-fetch (Corporate only) — UI Checklist #7, AC-2/AC-4 ─────────
  const [gstStatus, setGstStatus] = useState('idle') // idle | loading | success | error
  const [gstError, setGstError]   = useState('')
  const [duplicateGstWarning, setDuplicateGstWarning] = useState(null) // { lead, overrideReason } | null
  const [panError, setPanError]   = useState('')

  // In edit mode, cForm.gstNumber starts prefilled from the lead's own saved
  // GSTIN — without this guard, the effect below would immediately "auto-
  // fetch" on mount and overwrite the lead's actual gstType/pan/legalName
  // with lookupGstin's mock data (which falls back to a generic "Registered
  // Business (<PAN>)" placeholder for any GSTIN it doesn't specifically know
  // about). Skips exactly the first run of the effect; any GSTIN the user
  // then actually types triggers the normal auto-fetch, same as create mode.
  const skipInitialGstFetch = useRef(isEdit)

  useEffect(() => {
    let cancelled = false
    const skipThisRun = skipInitialGstFetch.current
    skipInitialGstFetch.current = false
    if (cForm.gstNumber.length !== 15) { setGstStatus('idle'); return }
    if (skipThisRun) { setGstStatus('idle'); return }
    setGstStatus('loading')
    lookupGstin(cForm.gstNumber).then(result => {
      if (cancelled) return
      if (!result.success) {
        setGstStatus('error')
        setGstError(result.error)
        return
      }
      setGstStatus('success')
      setCForm(f => ({ ...f, gstType: result.data.gstType, pan: result.data.pan, legalName: result.data.legalName }))
      const match = getLeads().find(l =>
        l.id !== leadId && l.pipeline === 'Enterprise' && l.gstNumber && l.gstNumber.toUpperCase() === cForm.gstNumber && l.stage !== 'Lost')
      setDuplicateGstWarning(match ? { lead: match, overrideReason: '' } : null) // BR-3
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cForm.gstNumber])

  useEffect(() => {
    if (cForm.pan && cForm.gstNumber.length === 15) {
      const expected = cForm.gstNumber.slice(2, 12)
      setPanError(cForm.pan.toUpperCase() !== expected ? 'PAN does not match characters 3–12 of the GSTIN (BR-4).' : '')
    } else {
      setPanError('')
    }
  }, [cForm.pan, cForm.gstNumber])

  function setR(k, v) { setRForm(f => ({ ...f, [k]: v })) }
  function setC(k, v) { setCForm(f => ({ ...f, [k]: v })) }

  // ── Validation — Resident (FR-6) ───────────────────────────────────────────
  function isRBasicValid() {
    if (req('Branch') && !rForm.branch) return false
    if (req('First Name') && !rForm.firstName.trim()) return false
    if (req('Last Name') && !rForm.lastName.trim()) return false
    if (!PHONE_REGEX.test(rForm.primaryNumber)) return false // BR-5, locked
    if (rForm.alternativeNumber && !PHONE_REGEX.test(rForm.alternativeNumber)) return false
    if (req('Alternative Number') && !rForm.alternativeNumber) return false
    if (rForm.email && !EMAIL_REGEX.test(rForm.email)) return false // BR-6
    if (req('Email') && !rForm.email) return false
    if (req('Service Tag') && rForm.serviceTags.length === 0) return false
    if (req('Sales Executive') && !rForm.salesExecutive) return false
    if (req('Lead Source') && !rForm.leadSource) return false
    return true
  }
  function isRConnectionValid() { return isConnectionTypeValid(rForm.connectionType) }
  function isRAddressValid() { return !req('Address Section') || isAddressSectionValid(rForm.address) }
  const rPackageBlocked = isPackageStepBlocked(rForm.address, feasibilityRecord)
  function isRPackageValid() { return !rPackageBlocked && (!req('Package Selection') || !!rForm.package) }
  const residentValid = isRBasicValid() && isRConnectionValid() && isRAddressValid() && isRPackageValid()

  // ── Validation — Corporate (FR-7) ──────────────────────────────────────────
  function isCCompanyValid() {
    if (req('Branch') && !cForm.branch) return false
    if (req('GST Number') && !GSTIN_REGEX.test(cForm.gstNumber)) return false
    if (cForm.gstNumber && gstStatus === 'error') return false
    if (panError) return false
    if (req('GST Type') && !cForm.gstType) return false
    if (req('PAN') && !cForm.pan) return false
    if (req('Legal Company Name') && !cForm.legalName.trim()) return false
    return true
  }
  function isCContactsValid() {
    if (req('Contact Person Name') && !cForm.contactPersonName.trim()) return false
    if (cForm.contactPersonEmail && !EMAIL_REGEX.test(cForm.contactPersonEmail)) return false
    if (req('Contact Person Email') && !cForm.contactPersonEmail) return false
    if (!PHONE_REGEX.test(cForm.primaryNumber)) return false // locked, BR-5
    if (cForm.accountsEmail && !EMAIL_REGEX.test(cForm.accountsEmail)) return false
    if (req('Accounts Email') && !cForm.accountsEmail) return false
    if (req('Accounts Name') && !cForm.accountsName.trim()) return false
    if (cForm.accountsPhone && !PHONE_REGEX.test(cForm.accountsPhone)) return false
    if (req('Accounts Phone') && !cForm.accountsPhone) return false
    if (cForm.technicalEmail && !EMAIL_REGEX.test(cForm.technicalEmail)) return false
    if (req('Technical Email') && !cForm.technicalEmail) return false
    if (req('Technical Name') && !cForm.technicalName.trim()) return false
    if (cForm.technicalPhone && !PHONE_REGEX.test(cForm.technicalPhone)) return false
    if (req('Technical Phone') && !cForm.technicalPhone) return false
    return true
  }
  function isCConnectionValid() {
    if (!isConnectionTypeValid(cForm.connectionType)) return false // locked, BR-7/BR-8
    if (req('Service Tag') && cForm.serviceTags.length === 0) return false
    if (req('Assigned To/Sales Executive') && !cForm.assignedTo) return false
    return true
  }
  function isCAddressValid() { return !req('Address Section') || isAddressSectionValid(cForm.address) }
  const cPackageBlocked = isPackageStepBlocked(cForm.address, feasibilityRecord)
  function isCPackageValid() { return !cPackageBlocked && (!req('Package Selection') || !!cForm.package) }
  const corporateValid = isCCompanyValid() && isCContactsValid() && isCConnectionValid() && isCAddressValid() && isCPackageValid()

  // ── Follow-up (kept, orthogonal to Customer Type) ─────────────────────────
  function isFollowUpValid() {
    if (!followUp.enabled) return true
    if (!followUp.date || !followUp.time) return false
    return new Date(`${followUp.date}T${followUp.time}`) > new Date()
  }
  function submitFollowUp(leadName, phone, assignedTo, stage, pipelineLabel) {
    if (followUp.enabled && followUp.date) {
      saveFollowup({
        id: `FU-${Date.now()}`, leadId, leadName, customer: leadName, pipeline: pipelineLabel,
        phone, date: followUp.date, time: followUp.time, note: followUp.notes,
        stage, assignedTo: assignedTo || '', notifyTo: followUp.notify, priority: 'medium', status: 'Pending',
      })
    }
  }

  const canSubmit = (isCorporate ? corporateValid : residentValid) && isFollowUpValid()
  const packageBlocked = isCorporate ? cPackageBlocked : rPackageBlocked

  const hasDuplicate = (phoneDup && phoneContinued) || (altPhoneDup && altPhoneContinued)
  function activityLogForDuplicate() {
    return hasDuplicate
      ? [{ id: Date.now(), icon: '⚠️', text: 'Created despite duplicate mobile number warning', user: 'Admin User', time: 'just now' }]
      : []
  }

  // The fields this form actually controls, for either mode — everything
  // else on an existing lead (pipeline, stage, stageHistory, ekycStatus,
  // hwAssigned, daysInStage, priority, createdAt/createdBy, customerType,
  // etc.) is preserved untouched by spreading `...lead` as the base in edit
  // mode below, rather than replacing the whole record.
  function residentPayload() {
    const tagNames = residentTags.filter(t => rForm.serviceTags.includes(t.id)).map(t => t.name)
    const planName = getPlans().find(p => p.id === rForm.package?.packageId)?.name || ''
    const name = `${rForm.firstName} ${rForm.lastName}`.trim()
    return {
      name,
      profilePicture,
      phone: rForm.primaryNumber,
      alternateMobile: rForm.alternativeNumber,
      email: rForm.email,
      branchCode: rForm.branch,
      serviceTags: tagNames,
      source: rForm.leadSource,
      assigned: rForm.salesExecutive,
      assignedInitials: initialsOf(rForm.salesExecutive),
      assignedColor: colorFor(rForm.salesExecutive),
      connectionType: rForm.connectionType.connectionType,
      entityId: rForm.connectionType.connectionType === 'Own' ? rForm.connectionType.entityId : null,
      partnerId: rForm.connectionType.connectionType === 'Partner' ? rForm.connectionType.partnerId : null,
      billingTo: rForm.connectionType.connectionType === 'Partner' ? rForm.connectionType.billingTo : null,
      address: rForm.address,
      state: rForm.address.billing.state,
      district: rForm.address.billing.district,
      area: rForm.address.billing.area,
      locality: rForm.address.billing.locality,
      subLocality: rForm.address.billing.subLocality,
      pincode: rForm.address.billing.pincode,
      selectedPackage: rForm.package,
      plan: planName,
    }
  }

  function corporatePayload() {
    const tagNames = corporateTags.filter(t => cForm.serviceTags.includes(t.id)).map(t => t.name)
    const planName = getPlans().find(p => p.id === cForm.package?.packageId)?.name || ''
    const billing = cForm.address.billing
    const companyAddress = [billing.addressLine, billing.locality, billing.area, billing.district, billing.state, billing.pincode]
      .filter(Boolean).join(', ')
    return {
      name: cForm.contactPersonName,
      profilePicture,
      companyName: cForm.legalName,
      contactPerson: cForm.contactPersonName,
      phone: cForm.primaryNumber,
      email: cForm.contactPersonEmail,
      branchCode: cForm.branch,
      serviceTags: tagNames,
      assigned: cForm.assignedTo,
      assignedInitials: initialsOf(cForm.assignedTo),
      assignedColor: colorFor(cForm.assignedTo),
      gstRegistered: true,
      gstNumber: cForm.gstNumber,
      gstType: cForm.gstType,
      pan: cForm.pan,
      gstOverrideReason: duplicateGstWarning ? duplicateGstWarning.overrideReason : '',
      companyAddress,
      accountsContact: { email: cForm.accountsEmail, name: cForm.accountsName, phone: cForm.accountsPhone },
      technicalContact: { email: cForm.technicalEmail, name: cForm.technicalName, phone: cForm.technicalPhone },
      connectionType: cForm.connectionType.connectionType,
      entityId: cForm.connectionType.connectionType === 'Own' ? cForm.connectionType.entityId : null,
      partnerId: cForm.connectionType.connectionType === 'Partner' ? cForm.connectionType.partnerId : null,
      billingTo: cForm.connectionType.connectionType === 'Partner' ? cForm.connectionType.billingTo : null,
      address: cForm.address,
      state: billing.state,
      district: billing.district,
      area: billing.area,
      locality: billing.locality,
      subLocality: billing.subLocality,
      pincode: billing.pincode,
      selectedPackage: cForm.package,
      plan: planName,
    }
  }

  function saveEdit(payload) {
    const activityEntry = {
      id: Date.now(), icon: '✏️', text: 'Lead details updated by Admin User', user: 'Admin User', time: 'just now',
    }
    saveLead({
      ...lead,
      ...payload,
      lastActivity: 'Lead details updated',
      activityLog: [activityEntry, ...(lead.activityLog ?? [])],
    })
    navigate(`/sales/leads/${leadId}`)
  }

  function submitResident() {
    const payload = residentPayload()
    if (isEdit) { saveEdit(payload); return }

    const today = new Date().toISOString().slice(0, 10)
    saveLead({
      id: leadId,
      customerType: 'Resident',
      pipeline: 'B2C',
      stage: 'New Inquiry',
      ...payload,
      daysInStage: 0,
      lastActivity: 'Lead created',
      followUp: followUp.enabled ? followUp.date : '',
      priority: 'medium',
      ekycStatus: null,
      hwAssigned: null,
      createdAt: today,
      createdBy: 'Admin User',
      stageHistory: [{ stage: 'New Inquiry', date: today, movedBy: 'Admin User', fields: {} }],
      activityLog: activityLogForDuplicate(),
    })
    submitFollowUp(payload.name, rForm.primaryNumber, rForm.salesExecutive, 'New Inquiry', 'Residential')
    navigate(`/sales/leads/${leadId}`)
  }

  function submitCorporate() {
    const payload = corporatePayload()
    if (isEdit) { saveEdit(payload); return }

    const today = new Date().toISOString().slice(0, 10)
    saveLead({
      id: leadId,
      customerType: 'Corporate',
      pipeline: 'Enterprise',
      stage: 'New Inquiry Filed',
      ...payload,
      daysInStage: 0,
      lastActivity: 'Lead created',
      followUp: followUp.enabled ? followUp.date : '',
      priority: 'medium',
      ekycStatus: null,
      hwAssigned: null,
      createdAt: today,
      createdBy: 'Admin User',
      stageHistory: [{ stage: 'New Inquiry Filed', date: today, movedBy: 'Admin User', fields: {} }],
      activityLog: activityLogForDuplicate(),
    })
    submitFollowUp(cForm.legalName || cForm.contactPersonName, cForm.primaryNumber, cForm.assignedTo, 'New Inquiry Filed', 'Enterprise')
    navigate(`/sales/leads/${leadId}`)
  }

  function handleSubmit() {
    if (!canSubmit) { setAttempted(true); return }
    if (isCorporate) submitCorporate(); else submitResident()
  }

  const branchExecutives = rForm.branch ? (SALES_EXECUTIVES_BY_BRANCH[rForm.branch] || []) : []

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-5 shrink-0 bg-white border-b border-surface-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(isEdit ? `/sales/leads/${leadId}` : '/sales')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Lead' : 'Create New Lead'}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEdit
                ? `Update lead information · ${lead.id}`
                : `Fill in the details to add a new lead to the pipeline · Lead ID ${leadId}`}
            </p>
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

        {/* Pipeline & Stage — locked, edit mode only. The Create form doesn't
            have this section (Pipeline/Stage aren't chosen the same way at
            creation), so it's added at the top only when editing, reusing the
            exact locked-pill treatment the previous standalone Edit Lead form
            used. */}
        {isEdit && (
          <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
            <p className="text-sm font-bold text-gray-700 mb-3">Pipeline &amp; Stage</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-surface-border rounded-lg">
                <Lock size={12} className="text-gray-400" />
                <span className="text-sm font-semibold" style={{ color: PIPELINE_COLORS[lead.pipeline] ?? '#0A8DCD' }}>
                  {PIPELINE_LABELS[lead.pipeline] ?? lead.pipeline}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-surface-border rounded-lg">
                <Lock size={12} className="text-gray-400" />
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STAGE_CHIP[lead.stage] ?? 'bg-gray-100 text-gray-700'}`}>
                  {lead.stage}
                </span>
              </div>
              <p className="text-xs text-gray-400 italic">Pipeline and stage cannot be changed after creation</p>
            </div>
          </div>
        )}

        {/* Service Configuration card */}
        <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
          <p className="text-sm font-bold text-gray-700 mb-1">Service Configuration</p>
          <p className="text-xs text-gray-400 mb-4">
            Customer Type determines which field set below applies (FR-6 for Resident, FR-7 for Corporate).
          </p>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <ProfilePictureUpload
              name={isCorporate ? cForm.contactPersonName : `${rForm.firstName} ${rForm.lastName}`}
              value={profilePicture}
              onChange={setProfilePicture}
            />
            <div className="hidden sm:block w-px self-stretch bg-surface-border shrink-0" />
            <div className="grid grid-cols-2 gap-x-5 gap-y-4 flex-1 w-full">
              <FormField label="Customer Type" required
                hint={isEdit ? 'Locked — cannot be changed after creation' : 'From Settings > System Configuration > Customer Type (Active only)'}>
                <Select disabled={isEdit} value={customerType} onChange={e => handleCustomerTypeChange(e.target.value)}>
                  {customerTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </FormField>
              <FormField label={isEdit ? 'Current Stage' : 'Starting Stage'}>
                <div className="flex items-center gap-2 h-[38px] px-3 bg-gray-50 border border-surface-border rounded-lg">
                  {isEdit
                    ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STAGE_CHIP[lead.stage] ?? 'bg-gray-100 text-gray-700'}`}>{lead.stage}</span>
                    : <><span className="w-2 h-2 rounded-full bg-brand-blue shrink-0" />
                        <span className="text-sm font-medium text-gray-700">{isCorporate ? 'New Inquiry Filed' : 'New Inquiry'}</span></>}
                </div>
              </FormField>
            </div>
          </div>
        </div>

        {attempted && !canSubmit && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            Please complete all mandatory fields correctly before creating this lead.
          </div>
        )}

        {/* ── Resident sections ────────────────────────────────────────────── */}
        {!isCorporate && (
          <>
            <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
              <SectionHeader icon={User} title="Basic Details" />
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Branch" required={req('Branch')}>
                    <Select value={rForm.branch} onChange={e => { setR('branch', e.target.value); setR('salesExecutive', '') }}>
                      <option value="">Select branch...</option>
                      {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Sales Executive" required={req('Sales Executive')} hint={!rForm.branch ? 'Select a branch first' : undefined}>
                    <Select disabled={!rForm.branch} value={rForm.salesExecutive} onChange={e => setR('salesExecutive', e.target.value)}>
                      <option value="">Select...</option>
                      {branchExecutives.map(n => <option key={n} value={n}>{n}</option>)}
                    </Select>
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="First Name" required={req('First Name')}>
                    <Input value={rForm.firstName} onChange={e => setR('firstName', e.target.value)} placeholder="Rajan" />
                  </FormField>
                  <FormField label="Last Name" required={req('Last Name')}>
                    <Input value={rForm.lastName} onChange={e => setR('lastName', e.target.value)} placeholder="Mehta" />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Primary Number" required>
                    <Input
                      value={rForm.primaryNumber}
                      maxLength={10}
                      placeholder="9876543210"
                      className={phoneDup && !phoneContinued ? 'border-amber-400 focus:ring-amber-400/30' : ''}
                      onChange={e => { setR('primaryNumber', e.target.value.replace(/\D/g, '')); setPhoneDup(null); setPhoneContinued(false) }}
                      onBlur={() => handlePhoneBlur(rForm.primaryNumber)}
                    />
                  </FormField>
                  <FormField label="Alternative Number" required={req('Alternative Number')}>
                    <Input
                      value={rForm.alternativeNumber}
                      maxLength={10}
                      placeholder="9876543211"
                      className={altPhoneDup && !altPhoneContinued ? 'border-amber-400 focus:ring-amber-400/30' : ''}
                      onChange={e => { setR('alternativeNumber', e.target.value.replace(/\D/g, '')); setAltPhoneDup(null); setAltPhoneContinued(false) }}
                      onBlur={() => handleAltPhoneBlur(rForm.alternativeNumber)}
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Email" required={req('Email')}>
                    <Input type="email" value={rForm.email} onChange={e => setR('email', e.target.value)} placeholder="rajan@email.com" />
                  </FormField>
                  <FormField label="Lead Source" required={req('Lead Source')}>
                    <Select value={rForm.leadSource} onChange={e => setR('leadSource', e.target.value)}>
                      <option value="">Select...</option>
                      {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </FormField>
                </div>
                <FormField label="Service Tag" required={req('Service Tag')}>
                  <div className="flex flex-wrap gap-2">
                    {residentTags.map(tag => {
                      const selected = rForm.serviceTags.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => setR('serviceTags', selected
                            ? rForm.serviceTags.filter(id => id !== tag.id)
                            : [...rForm.serviceTags, tag.id])}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                            ${selected ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-gray-600 border-surface-border hover:border-brand-blue/40'}`}
                        >
                          {tag.name}
                        </button>
                      )
                    })}
                    {residentTags.length === 0 && <p className="text-xs text-gray-400">No active Resident service tags configured.</p>}
                  </div>
                </FormField>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
              <SectionHeader icon={Link2} title="Connection Type" />
              <ConnectionTypeStep value={rForm.connectionType} onChange={v => setR('connectionType', v)} />
            </div>

            <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
              <SectionHeader icon={MapPin} title="Address" />
              <AddressSectionStep
                value={rForm.address}
                onChange={v => setR('address', v)}
                leadId={leadId}
                customerName={`${rForm.firstName} ${rForm.lastName}`.trim() || 'Unnamed'}
                phone={rForm.primaryNumber}
                pipeline="B2C"
                branch={rForm.branch}
              />
            </div>

            <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
              <SectionHeader icon={Package} title="Package Selection" />
              <PackageSelectionStep
                customerType="resident"
                value={rForm.package}
                onChange={v => setR('package', v)}
                blocked={rPackageBlocked}
                feasibilityRecord={feasibilityRecord}
              />
            </div>
          </>
        )}

        {/* ── Corporate sections ───────────────────────────────────────────── */}
        {isCorporate && (
          <>
            <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
              <SectionHeader icon={Building2} title="Company / GST Details" />
              <div className="space-y-4">
                <FormField label="Branch" required={req('Branch')}>
                  <Select value={cForm.branch} onChange={e => setC('branch', e.target.value)}>
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
                    value={cForm.gstNumber}
                    maxLength={15}
                    placeholder="27AABCU9603R1ZM"
                    className="font-mono uppercase"
                    onChange={e => setC('gstNumber', e.target.value.toUpperCase())}
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

                {duplicateGstWarning && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <p className="text-xs text-amber-800 flex items-start gap-1.5">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                      This GSTIN is already registered to an active customer
                      ({duplicateGstWarning.lead.companyName || duplicateGstWarning.lead.name}, {duplicateGstWarning.lead.id}).
                      BR-3 allows proceeding with an override reason instead of a hard block.
                    </p>
                    <Input
                      placeholder="Override reason (e.g. new branch registration)"
                      value={duplicateGstWarning.overrideReason}
                      onChange={e => setDuplicateGstWarning(w => ({ ...w, overrideReason: e.target.value }))}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="GST Type" required={req('GST Type')}>
                    <Select value={cForm.gstType} onChange={e => setC('gstType', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="Regular">Regular</option>
                      <option value="Composition">Composition</option>
                    </Select>
                  </FormField>
                  <FormField label="PAN" required={req('PAN')} error={panError}>
                    <Input value={cForm.pan} maxLength={10} className="font-mono uppercase" placeholder="AABCU9603R"
                      onChange={e => setC('pan', e.target.value.toUpperCase())} />
                  </FormField>
                </div>
                <FormField label="Legal Company Name" required={req('Legal Company Name')}>
                  <Input value={cForm.legalName} onChange={e => setC('legalName', e.target.value)} placeholder="Acme Technologies Pvt Ltd" />
                </FormField>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
              <SectionHeader icon={Users} title="Contacts" />
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Contact Person Name" required={req('Contact Person Name')}>
                    <Input value={cForm.contactPersonName} onChange={e => setC('contactPersonName', e.target.value)} placeholder="Sunil Mehta" />
                  </FormField>
                  <FormField label="Contact Person Email" required={req('Contact Person Email')}>
                    <Input type="email" value={cForm.contactPersonEmail} onChange={e => setC('contactPersonEmail', e.target.value)} placeholder="sunil@company.in" />
                  </FormField>
                </div>
                <FormField label="Primary Number" required>
                  <Input
                    value={cForm.primaryNumber}
                    maxLength={10}
                    placeholder="9812340001"
                    className={phoneDup && !phoneContinued ? 'border-amber-400 focus:ring-amber-400/30' : ''}
                    onChange={e => { setC('primaryNumber', e.target.value.replace(/\D/g, '')); setPhoneDup(null); setPhoneContinued(false) }}
                    onBlur={() => handlePhoneBlur(cForm.primaryNumber)}
                  />
                </FormField>

                <div className="border border-surface-border rounded-xl p-4 space-y-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Accounts Contact</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Accounts Name" required={req('Accounts Name')}>
                      <Input value={cForm.accountsName} onChange={e => setC('accountsName', e.target.value)} />
                    </FormField>
                    <FormField label="Accounts Email" required={req('Accounts Email')}>
                      <Input type="email" value={cForm.accountsEmail} onChange={e => setC('accountsEmail', e.target.value)} />
                    </FormField>
                  </div>
                  <FormField label="Accounts Phone" required={req('Accounts Phone')}>
                    <Input value={cForm.accountsPhone} maxLength={10}
                      onChange={e => setC('accountsPhone', e.target.value.replace(/\D/g, ''))} />
                  </FormField>
                </div>

                <div className="border border-surface-border rounded-xl p-4 space-y-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Technical Contact</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Technical Name" required={req('Technical Name')}>
                      <Input value={cForm.technicalName} onChange={e => setC('technicalName', e.target.value)} />
                    </FormField>
                    <FormField label="Technical Email" required={req('Technical Email')}>
                      <Input type="email" value={cForm.technicalEmail} onChange={e => setC('technicalEmail', e.target.value)} />
                    </FormField>
                  </div>
                  <FormField label="Technical Phone" required={req('Technical Phone')}>
                    <Input value={cForm.technicalPhone} maxLength={10}
                      onChange={e => setC('technicalPhone', e.target.value.replace(/\D/g, ''))} />
                  </FormField>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
              <SectionHeader icon={Link2} title="Connection Type" />
              <div className="space-y-5">
                <ConnectionTypeStep value={cForm.connectionType} onChange={v => setC('connectionType', v)} />

                <FormField label="Service Tag" required={req('Service Tag')} hint="Corporate-mapped, Active tags only (BR-2/AC-5)">
                  <div className="flex flex-wrap gap-2">
                    {corporateTags.map(tag => {
                      const selected = cForm.serviceTags.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => setC('serviceTags', selected
                            ? cForm.serviceTags.filter(id => id !== tag.id)
                            : [...cForm.serviceTags, tag.id])}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                            ${selected ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-gray-600 border-surface-border hover:border-brand-blue/40'}`}
                        >
                          {tag.name}
                        </button>
                      )
                    })}
                    {corporateTags.length === 0 && <p className="text-xs text-gray-400">No active Corporate service tags configured.</p>}
                  </div>
                </FormField>

                <FormField label="Assigned To / Sales Executive" required={req('Assigned To/Sales Executive')}>
                  <Select value={cForm.assignedTo} onChange={e => setC('assignedTo', e.target.value)}>
                    <option value="">Select...</option>
                    {ASSIGNEES.map(n => <option key={n} value={n}>{n}</option>)}
                  </Select>
                </FormField>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
              <SectionHeader icon={MapPin} title="Address" />
              <AddressSectionStep
                value={cForm.address}
                onChange={v => setC('address', v)}
                leadId={leadId}
                customerName={cForm.legalName || cForm.contactPersonName || 'Unnamed'}
                phone={cForm.primaryNumber}
                pipeline="Enterprise"
                branch={cForm.branch}
              />
            </div>

            <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
              <SectionHeader icon={Package} title="Package Selection" />
              <PackageSelectionStep
                customerType="corporate"
                value={cForm.package}
                onChange={v => setC('package', v)}
                blocked={cPackageBlocked}
                feasibilityRecord={feasibilityRecord}
              />
            </div>
          </>
        )}

        {/* Follow-up card — kept from the previous form, orthogonal to Customer
            Type. Only shown at creation — editing a lead has its own
            dedicated Follow-ups flow on the Lead Detail page, so this stays
            hidden in edit mode rather than risk creating a duplicate
            follow-up record every time the form is saved. */}
        {!isEdit && (
          <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
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
              <button
                type="button"
                role="switch"
                aria-checked={followUp.enabled}
                onClick={() => setFollowUp(f => f.enabled ? EMPTY_FOLLOWUP : { ...f, enabled: true })}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-1 ${
                  followUp.enabled ? 'bg-brand-blue' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    followUp.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {followUp.enabled && (
              <div className="mt-4 pt-4 border-t border-surface-border grid grid-cols-2 gap-x-5 gap-y-4">
                <FormField label="Follow-up Date" required>
                  <Input type="date" value={followUp.date} onChange={e => setFollowUp(f => ({ ...f, date: e.target.value }))} />
                </FormField>
                <FormField label="Follow-up Time" required>
                  <Input type="time" value={followUp.time} onChange={e => setFollowUp(f => ({ ...f, time: e.target.value }))} />
                </FormField>
                {attempted && (!followUp.date || !followUp.time) && (
                  <p className="col-span-2 text-xs text-red-500 -mt-2">Follow-up date and time are required.</p>
                )}
                {attempted && followUp.date && followUp.time && new Date(`${followUp.date}T${followUp.time}`) <= new Date() && (
                  <p className="col-span-2 text-xs text-red-500 -mt-2">Follow-up date/time cannot be in the past.</p>
                )}
                <div className="col-span-2">
                  <FormField label="Notes">
                    <Textarea value={followUp.notes} onChange={e => setFollowUp(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Follow-up agenda or notes…" rows={2} />
                  </FormField>
                </div>
                <div className="col-span-2">
                  <FormField label="Notify Users">
                    <MultiSelectDropdown
                      options={NOTIFY_USERS}
                      value={followUp.notify}
                      onChange={v => setFollowUp(f => ({ ...f, notify: v }))}
                      placeholder="Select team members to notify…"
                    />
                    {followUp.notify.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                        <AlertTriangle size={11} className="shrink-0" />
                        No notifiers selected — at least one is recommended
                      </p>
                    )}
                  </FormField>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 shrink-0 bg-white border-t border-surface-border flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">
            Fields marked <span className="text-red-400 font-semibold">*</span> are required
          </p>
          {packageBlocked && (
            <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
              <AlertTriangle size={11} className="shrink-0" />
              Package Selection is blocked by a pending Feasibility Work Order.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate(isEdit ? `/sales/leads/${leadId}` : '/sales')}>Cancel</Button>
          <span
            title={!canSubmit ? (packageBlocked ? 'Package Selection is blocked until Feasibility is approved' : 'Complete all mandatory fields to create this lead') : undefined}
            onClick={() => !canSubmit && setAttempted(true)}
          >
            <Button icon={<Check size={14} />} onClick={handleSubmit} disabled={!canSubmit}>{isEdit ? 'Save Changes' : 'Create Lead'}</Button>
          </span>
        </div>
      </div>

    </div>
  )
}

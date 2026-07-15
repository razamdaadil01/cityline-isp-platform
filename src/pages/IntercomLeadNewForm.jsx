import { useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Search, Loader2, User, MapPin, PhoneCall, ClipboardList, AlertTriangle, Cpu,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { saveLead, getLeads, INTERCOM_STAFF } from '../data/intercomLeadsStore'
import { getStates, getDistricts, getAreasList, getIntercomLocalities, getSubLocalities } from '../data/areaMappingStore'
import { getAllCustomers } from '../data/customersData'

const MOCK_DUPLICATE_LEADS = {
  '9876001890': { id: 'IC-LEAD-2026-000001', customerName: 'Ramesh Nair', stage: 'New', createdAt: '25-06-2026' },
  '9845123456': { id: 'IC-LEAD-2026-000002', customerName: 'Priya Sharma', stage: 'New', createdAt: '25-06-2026' },
}

const MOCK_DUPLICATE_CUSTOMER_IDS = {
  'RES-2026-0001': { id: 'IC-LEAD-2026-000001', customerName: 'Ramesh Nair', stage: 'New', createdAt: '25-06-2026' },
}

function findDuplicateLead({ mobile, customerId }) {
  const normalized = (mobile ?? '').replace(/\D/g, '')
  if (MOCK_DUPLICATE_LEADS[normalized]) return MOCK_DUPLICATE_LEADS[normalized]
  if (customerId && MOCK_DUPLICATE_CUSTOMER_IDS[customerId]) return MOCK_DUPLICATE_CUSTOMER_IDS[customerId]
  return null
}

function findInternetCustomerByMobile(mobile) {
  const normalized = (mobile ?? '').replace(/\D/g, '')
  if (!normalized) return null
  return getAllCustomers().find(c => c.type !== 'Intercom' && (c.phone ?? '').replace(/\D/g, '') === normalized) ?? null
}

function titleCase(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'
}

function toFoundCustomerShape(customer) {
  return {
    customerName: customer.name,
    customerId: customer.id,
    registrationNumber: customer.registrationNumber ?? '—',
    mobile: customer.phone,
    email: customer.email ?? '—',
    installationAddress: customer.installationAddress ?? '—',
    billingAddress: customer.billingAddress ?? '—',
    internetPackage: customer.plan ?? '—',
    internetStatus: titleCase(customer.status),
    customerStatus: titleCase(customer.status),
    area: customer.area ?? '—',
    locality: customer.locality ?? customer.zone ?? '—',
    subLocality: customer.subLocality ?? '—',
    assignedBranch: customer.assignedBranch ?? customer.branch ?? '—',
    hardware: customer.hardware ?? [],
  }
}

const CURRENT_USER = 'Admin User'

const INTERNET_PROVIDERS = ['Airtel', 'Jio', 'BSNL', 'ACT', 'Hathway', 'Other', 'Internet Not Using']
const INTERCOM_TYPES = ['Basic', 'Plus', 'Premium']
const TIME_SLOTS = ['Morning 9-12', 'Afternoon 12-3', 'Evening 3-6']
const LEAD_SOURCES = ['Walk-in', 'Reference', 'Call', 'Online', 'Field Visit']

const MOCK_CUSTOMER = {
  customerName: 'Rajan Mehta',
  customerId: 'RES-2026-0001',
  registrationNumber: 'REG-001',
  mobile: '98765 43210',
  email: 'rajan.mehta@gmail.com',
  installationAddress: 'Flat 302, Sai Darshan CHS, Andheri West',
  billingAddress: 'Flat 302, Sai Darshan CHS, Andheri West',
  internetPackage: 'FTTH 100Mbps',
  internetStatus: 'Active',
  customerStatus: 'Active',
  area: 'Andheri',
  locality: 'Andheri West',
  subLocality: 'Four Bungalows',
  assignedBranch: 'Andheri West Branch',
  hardware: [
    { device: 'ONT Device – Huawei HG8310M', serial: 'ONT-2026-0311' },
    { device: 'WiFi Router – TP-Link AC1200', serial: 'RTR-2026-0311' },
  ],
}

function lookupCustomerById(id) {
  if (!id) return null
  if (id === MOCK_CUSTOMER.customerId) return MOCK_CUSTOMER
  const real = getAllCustomers().find(c => c.id === id && c.type !== 'Intercom')
  return real ? toFoundCustomerShape(real) : null
}

const INIT_FORM_A_EXTRA = {
  altMobile: '', intercomType: '', installDate: '', timeSlot: '', customerRemarks: '', salesRemarks: '', specialAccess: '',
}

const INIT_FORM_B = {
  customerName: '', primaryMobile: '', altMobile: '', email: '', internetProvider: '',
  state: '', district: '', area: '', locality: '', subLocality: '',
  installationAddress: '', landmark: '',
  intercomType: '', preferredDate: '', timeSlot: '', customerRemarks: '', specialAccess: '',
  leadSource: '', assignedSales: '',
}

function nextIntercomLeadId() {
  const year = new Date().getFullYear()
  const nums = getLeads()
    .map(l => l.id.match(/^IC-LEAD-(\d{4})-(\d{6})$/))
    .filter(Boolean)
    .map(m => Number(m[2]))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `IC-LEAD-${year}-${String(next).padStart(6, '0')}`
}

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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

export default function IntercomLeadNewForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const relationship = location.pathname.endsWith('/existing') ? 'yes' : 'no'
  const prefillCustomer = location.state?.prefillCustomer ?? null
  const customerIdFromUrl = searchParams.get('customerId')

  const [leadId] = useState(() => nextIntercomLeadId())

  // Flow A — existing customer
  const [searchCustomerId, setSearchCustomerId] = useState(prefillCustomer?.customerId ?? customerIdFromUrl ?? '')
  const [searchRegNumber, setSearchRegNumber] = useState('')
  const [searchError, setSearchError] = useState('')
  const [finding, setFinding] = useState(false)
  const [foundCustomer, setFoundCustomer] = useState(() => {
    if (prefillCustomer) return prefillCustomer
    return customerIdFromUrl ? lookupCustomerById(customerIdFromUrl) : null
  })
  const [notFound, setNotFound] = useState(() => !prefillCustomer && !!customerIdFromUrl && !lookupCustomerById(customerIdFromUrl))
  const [formA, setFormA] = useState(INIT_FORM_A_EXTRA)

  // Flow B — new / intercom-only customer
  const [formB, setFormB] = useState(INIT_FORM_B)
  const [errorsB, setErrorsB] = useState({})

  // Duplicate check
  const [duplicateModal, setDuplicateModal] = useState(null)

  function setA(f, v) { setFormA(p => ({ ...p, [f]: v })) }

  function setB(f, v) {
    setFormB(p => {
      const next = { ...p, [f]: v }
      if (f === 'state') Object.assign(next, { district: '', area: '', locality: '', subLocality: '' })
      if (f === 'district') Object.assign(next, { area: '', locality: '', subLocality: '' })
      if (f === 'area') Object.assign(next, { locality: '', subLocality: '' })
      if (f === 'locality') next.subLocality = ''
      return next
    })
    setErrorsB(p => ({ ...p, [f]: '' }))
  }

  function handleFindCustomer() {
    if (!searchCustomerId.trim() && !searchRegNumber.trim()) {
      setSearchError('Enter at least one value')
      return
    }
    setSearchError('')
    setFinding(true)
    setFoundCustomer(null)
    setNotFound(false)
    setTimeout(() => {
      setFinding(false)
      const result = searchCustomerId.trim() ? lookupCustomerById(searchCustomerId.trim()) : MOCK_CUSTOMER
      if (result) {
        setFoundCustomer(result)
        setNotFound(false)
        setSearchParams({ customerId: result.customerId })
      } else {
        setFoundCustomer(null)
        setNotFound(true)
        setSearchParams({})
      }
    }, 1000)
  }

  function validateB() {
    const e = {}
    if (!formB.customerName.trim())             e.customerName = 'Customer name is required'
    if (!formB.primaryMobile.match(/^\d{10}$/))  e.primaryMobile = 'Enter a valid 10-digit number'
    if (!formB.internetProvider)                 e.internetProvider = 'Select an option'
    if (!formB.state)                            e.state = 'Select a state'
    if (!formB.district)                         e.district = 'Select a district'
    if (!formB.area)                             e.area = 'Select an area'
    if (!formB.locality)                         e.locality = 'Select a locality'
    if (!formB.installationAddress.trim())       e.installationAddress = 'Installation address is required'
    if (!formB.intercomType)                     e.intercomType = 'Select intercom type'
    if (!formB.assignedSales)                    e.assignedSales = 'Assign a sales executive'
    return e
  }

  function buildLeadPayload() {
    const today = new Date().toISOString().slice(0, 10)
    const stageHistory = [{ stage: 'New', date: today, time: nowTime(), note: 'Lead created', actor: CURRENT_USER }]

    if (relationship === 'yes') {
      if (!foundCustomer) return null
      return {
        id: leadId,
        leadName: foundCustomer.customerName,
        customer: foundCustomer.customerName,
        mobile: foundCustomer.mobile,
        email: foundCustomer.email,
        installationAddress: foundCustomer.installationAddress,
        stage: 'New',
        assigned: '',
        followUp: '',
        notes: formA.customerRemarks,
        createdAt: today,
        createdBy: CURRENT_USER,
        relationshipType: 'Existing Internet Customer',
        existingCustomerId: foundCustomer.customerId,
        registrationNumber: foundCustomer.registrationNumber,
        billingAddress: foundCustomer.billingAddress,
        internetPackage: foundCustomer.internetPackage,
        area: foundCustomer.area,
        locality: foundCustomer.locality,
        subLocality: foundCustomer.subLocality,
        assignedBranch: foundCustomer.assignedBranch,
        existingHardware: foundCustomer.hardware,
        altMobile: formA.altMobile,
        intercomType: formA.intercomType,
        installDate: formA.installDate,
        timeSlot: formA.timeSlot,
        customerRemarks: formA.customerRemarks,
        salesRemarks: formA.salesRemarks,
        specialAccess: formA.specialAccess,
        stageHistory,
      }
    }

    if (relationship === 'no') {
      return {
        id: leadId,
        leadName: formB.customerName.trim(),
        customer: formB.customerName.trim(),
        mobile: formB.primaryMobile,
        email: formB.email,
        installationAddress: formB.installationAddress,
        stage: 'New',
        assigned: formB.assignedSales,
        followUp: formB.preferredDate,
        notes: formB.customerRemarks,
        createdAt: today,
        createdBy: CURRENT_USER,
        relationshipType: 'New / Intercom-Only Customer',
        altMobile: formB.altMobile,
        internetProvider: formB.internetProvider,
        state: formB.state,
        district: formB.district,
        area: formB.area,
        locality: formB.locality,
        subLocality: formB.subLocality,
        landmark: formB.landmark,
        intercomType: formB.intercomType,
        timeSlot: formB.timeSlot,
        specialAccess: formB.specialAccess,
        leadSource: formB.leadSource,
        stageHistory,
      }
    }

    return null
  }

  function commitLead(payload) {
    const lead = saveLead(payload)
    navigate(`/intercom/leads/${lead.id}`)
  }

  function handleCreate() {
    if (relationship === 'yes' && !foundCustomer) return

    if (relationship === 'no') {
      const e = validateB()
      if (Object.keys(e).length) { setErrorsB(e); return }
    }

    const mobile = relationship === 'yes' ? foundCustomer.mobile : formB.primaryMobile
    const customerId = relationship === 'yes' ? foundCustomer.customerId : undefined
    const duplicateLead = findDuplicateLead({ mobile, customerId })

    const payload = buildLeadPayload()
    if (!payload) return

    if (duplicateLead) {
      setDuplicateModal({ kind: 'lead', ...duplicateLead, pendingPayload: payload })
      return
    }

    if (relationship === 'no') {
      const existingCustomer = findInternetCustomerByMobile(formB.primaryMobile)
      if (existingCustomer) {
        setDuplicateModal({ kind: 'internetCustomer', customer: existingCustomer, pendingPayload: payload })
        return
      }
    }

    commitLead(payload)
  }

  function handleContinueAnyway() {
    if (duplicateModal?.pendingPayload) commitLead(duplicateModal.pendingPayload)
    setDuplicateModal(null)
  }

  function handleViewExisting() {
    if (duplicateModal) navigate(`/intercom/leads/${duplicateModal.id}/profile`)
    setDuplicateModal(null)
  }

  function handleSwitchToFlowA(customer) {
    setDuplicateModal(null)
    navigate(`/intercom/leads/new/existing?customerId=${encodeURIComponent(customer.id)}`, {
      state: { prefillCustomer: toFoundCustomerShape(customer) },
      replace: true,
    })
  }

  const canCreate = relationship === 'yes' ? !!foundCustomer : relationship === 'no'

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-5 shrink-0 bg-white border-b border-surface-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/intercom/leads/new')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create Intercom Lead</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {relationship === 'yes' ? 'Existing Internet Customer' : 'New / Intercom-Only Customer'} · <span className="font-mono">{leadId}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

        {/* ── FLOW A — Existing Internet Customer ────────────────────────── */}
        {relationship === 'yes' && (
          <>
            <SectionCard title="Customer Verification" icon={Search}>
              <FormField label="Customer ID">
                <Input
                  value={searchCustomerId}
                  onChange={e => { setSearchCustomerId(e.target.value); setSearchError('') }}
                  placeholder="Enter Customer ID"
                />
              </FormField>
              <FormField label="Registration Number">
                <Input
                  value={searchRegNumber}
                  onChange={e => { setSearchRegNumber(e.target.value); setSearchError('') }}
                  placeholder="Enter Registration Number"
                />
              </FormField>
              <div className="col-span-2 flex items-center justify-between gap-3">
                <p className={`text-xs ${searchError ? 'text-red-500' : 'text-gray-500'}`}>
                  {searchError || 'Enter at least one value'}
                </p>
                <Button
                  onClick={handleFindCustomer}
                  disabled={finding}
                  icon={finding ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                >
                  {finding ? 'Searching…' : 'Find Customer'}
                </Button>
              </div>
            </SectionCard>

            {notFound && (
              <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">No customer found</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      No customer matches {searchCustomerId.trim() ? <span className="font-mono">{searchCustomerId.trim()}</span> : 'the details entered'}. Check the Customer ID and try again.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {foundCustomer && (
              <>
                <SectionCard title="Customer Details" icon={User}>
                  <FormField label="Customer Name">
                    <Input value={foundCustomer.customerName} disabled />
                  </FormField>
                  <FormField label="Customer ID">
                    <Input value={foundCustomer.customerId} disabled className="font-mono" />
                  </FormField>
                  <FormField label="Registration Number">
                    <Input value={foundCustomer.registrationNumber} disabled className="font-mono" />
                  </FormField>
                  <FormField label="Mobile">
                    <Input value={foundCustomer.mobile} disabled />
                  </FormField>
                  <FormField label="Email">
                    <Input value={foundCustomer.email} disabled />
                  </FormField>
                  <FormField label="Internet Package">
                    <Input value={foundCustomer.internetPackage} disabled />
                  </FormField>
                  <div className="col-span-2">
                    <FormField label="Installation Address">
                      <Textarea value={foundCustomer.installationAddress} disabled rows={2} />
                    </FormField>
                  </div>
                  <div className="col-span-2">
                    <FormField label="Billing Address">
                      <Textarea value={foundCustomer.billingAddress} disabled rows={2} />
                    </FormField>
                  </div>
                  <FormField label="Internet Status">
                    <div><Badge variant="green" size="sm">{foundCustomer.internetStatus}</Badge></div>
                  </FormField>
                  <FormField label="Customer Status">
                    <div><Badge variant="green" size="sm">{foundCustomer.customerStatus}</Badge></div>
                  </FormField>
                  <div className="col-span-2">
                    <FormField label="Area / Locality / Sub Locality">
                      <Input
                        value={[foundCustomer.area, foundCustomer.locality, foundCustomer.subLocality].filter(Boolean).join(' / ') || '—'}
                        disabled
                      />
                    </FormField>
                  </div>
                  <FormField label="Assigned Branch">
                    <Input value={foundCustomer.assignedBranch} disabled />
                  </FormField>
                  <div className="col-span-2">
                    <FormField label="Existing Hardware Details">
                      {foundCustomer.hardware?.length ? (
                        <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden">
                          {foundCustomer.hardware.map((h, i) => (
                            <div key={i} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50/60">
                              <div className="w-7 h-7 rounded-lg bg-navy/10 text-navy flex items-center justify-center shrink-0">
                                <Cpu size={13} />
                              </div>
                              <span className="text-sm text-gray-700">{h.device}</span>
                              <span className="text-xs font-mono text-gray-400 ml-auto">{h.serial}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Input value="None" disabled />
                      )}
                    </FormField>
                  </div>
                </SectionCard>

                <SectionCard title="Additional Intercom Details" icon={PhoneCall}>
                  <FormField label="Alternative Mobile">
                    <Input
                      type="tel"
                      value={formA.altMobile}
                      onChange={e => setA('altMobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                    />
                  </FormField>
                  <FormField label="Intercom Type">
                    <Select value={formA.intercomType} onChange={e => setA('intercomType', e.target.value)}>
                      <option value="">Select type…</option>
                      {INTERCOM_TYPES.map(t => <option key={t}>{t}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Required Installation Date">
                    <Input type="date" value={formA.installDate} onChange={e => setA('installDate', e.target.value)} />
                  </FormField>
                  <FormField label="Preferred Time Slot">
                    <Select value={formA.timeSlot} onChange={e => setA('timeSlot', e.target.value)}>
                      <option value="">Select slot…</option>
                      {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                    </Select>
                  </FormField>
                  <div className="col-span-2">
                    <FormField label="Customer Remarks">
                      <Textarea value={formA.customerRemarks} onChange={e => setA('customerRemarks', e.target.value)} rows={2} />
                    </FormField>
                  </div>
                  <div className="col-span-2">
                    <FormField label="Sales Remarks">
                      <Textarea value={formA.salesRemarks} onChange={e => setA('salesRemarks', e.target.value)} rows={2} />
                    </FormField>
                  </div>
                  <div className="col-span-2">
                    <FormField label="Special Access Instructions">
                      <Textarea value={formA.specialAccess} onChange={e => setA('specialAccess', e.target.value)} rows={2} placeholder="Gate code, floor access, etc…" />
                    </FormField>
                  </div>
                </SectionCard>
              </>
            )}
          </>
        )}

        {/* ── FLOW B — New / Intercom-Only Customer ──────────────────────── */}
        {relationship === 'no' && (
          <>
            <SectionCard title="Customer Info" icon={User}>
              <FormField label="Customer Name" required error={errorsB.customerName}>
                <Input value={formB.customerName} onChange={e => setB('customerName', e.target.value)} placeholder="Ramesh Nair" />
              </FormField>
              <FormField label="Primary Mobile" required error={errorsB.primaryMobile}>
                <Input
                  type="tel"
                  value={formB.primaryMobile}
                  onChange={e => setB('primaryMobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                />
              </FormField>
              <FormField label="Alternative Mobile">
                <Input
                  type="tel"
                  value={formB.altMobile}
                  onChange={e => setB('altMobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                />
              </FormField>
              <FormField label="Email">
                <Input type="email" value={formB.email} onChange={e => setB('email', e.target.value)} placeholder="ramesh@email.com" />
              </FormField>
              <div className="col-span-2">
                <FormField label="Which Internet Provider are they using?" required error={errorsB.internetProvider}>
                  <Select value={formB.internetProvider} onChange={e => setB('internetProvider', e.target.value)}>
                    <option value="">Select provider…</option>
                    {INTERNET_PROVIDERS.map(p => <option key={p}>{p}</option>)}
                  </Select>
                </FormField>
              </div>
            </SectionCard>

            <SectionCard title="Location" icon={MapPin}>
              <FormField label="State" required error={errorsB.state}>
                <Select value={formB.state} onChange={e => setB('state', e.target.value)}>
                  <option value="">Select state…</option>
                  {getStates().map(s => <option key={s}>{s}</option>)}
                </Select>
              </FormField>
              <FormField label="District" required error={errorsB.district}>
                <Select value={formB.district} onChange={e => setB('district', e.target.value)} disabled={!formB.state}>
                  <option value="">Select district…</option>
                  {getDistricts(formB.state).map(d => <option key={d}>{d}</option>)}
                </Select>
              </FormField>
              <FormField label="Area" required error={errorsB.area}>
                <Select value={formB.area} onChange={e => setB('area', e.target.value)} disabled={!formB.district}>
                  <option value="">Select area…</option>
                  {getAreasList(formB.state, formB.district).map(a => <option key={a}>{a}</option>)}
                </Select>
              </FormField>
              <FormField label="Locality" required error={errorsB.locality} hint="Only sites marked as Intercom Site are shown">
                <Select value={formB.locality} onChange={e => setB('locality', e.target.value)} disabled={!formB.area}>
                  <option value="">Select locality…</option>
                  {getIntercomLocalities(formB.state, formB.district, formB.area).map(l => <option key={l}>{l}</option>)}
                </Select>
              </FormField>
              <FormField label="Sub Locality">
                <Select value={formB.subLocality} onChange={e => setB('subLocality', e.target.value)} disabled={!formB.locality}>
                  <option value="">Select sub locality…</option>
                  {getSubLocalities(formB.state, formB.district, formB.area, formB.locality).map(sl => (
                    <option key={sl.subLocality}>{sl.subLocality}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Landmark">
                <Input value={formB.landmark} onChange={e => setB('landmark', e.target.value)} placeholder="Near…" />
              </FormField>
              <div className="col-span-2">
                <FormField label="Installation Address" required error={errorsB.installationAddress}>
                  <Textarea
                    value={formB.installationAddress}
                    onChange={e => setB('installationAddress', e.target.value)}
                    placeholder="House/Flat no., Street, Building name, Area" rows={2}
                  />
                </FormField>
              </div>
            </SectionCard>

            <SectionCard title="Intercom Requirement" icon={PhoneCall}>
              <FormField label="Intercom Type" required error={errorsB.intercomType}>
                <Select value={formB.intercomType} onChange={e => setB('intercomType', e.target.value)}>
                  <option value="">Select type…</option>
                  {INTERCOM_TYPES.map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Preferred Installation Date">
                <Input type="date" value={formB.preferredDate} onChange={e => setB('preferredDate', e.target.value)} />
              </FormField>
              <FormField label="Preferred Time Slot">
                <Select value={formB.timeSlot} onChange={e => setB('timeSlot', e.target.value)}>
                  <option value="">Select slot…</option>
                  {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <div className="col-span-2">
                <FormField label="Customer Remarks">
                  <Textarea value={formB.customerRemarks} onChange={e => setB('customerRemarks', e.target.value)} rows={2} />
                </FormField>
              </div>
              <div className="col-span-2">
                <FormField label="Special Access Instructions">
                  <Textarea value={formB.specialAccess} onChange={e => setB('specialAccess', e.target.value)} rows={2} />
                </FormField>
              </div>
            </SectionCard>

            <SectionCard title="Lead Info" icon={ClipboardList}>
              <FormField label="Lead Source">
                <Select value={formB.leadSource} onChange={e => setB('leadSource', e.target.value)}>
                  <option value="">Select source…</option>
                  {LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}
                </Select>
              </FormField>
              <FormField label="Assigned Sales Executive" required error={errorsB.assignedSales}>
                <Select value={formB.assignedSales} onChange={e => setB('assignedSales', e.target.value)}>
                  <option value="">Select executive…</option>
                  {INTERCOM_STAFF.map(s => <option key={s.name}>{s.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Lead Create By">
                <Input value={CURRENT_USER} disabled />
              </FormField>
            </SectionCard>
          </>
        )}

      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 shrink-0 bg-white border-t border-surface-border flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Fields marked <span className="text-red-400 font-semibold">*</span> are required
        </p>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/intercom/leads')}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!canCreate}>Create Lead</Button>
        </div>
      </div>

      {/* ── Duplicate Lead Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={!!duplicateModal}
        onClose={() => setDuplicateModal(null)}
        title={duplicateModal?.kind === 'internetCustomer' ? 'Existing Internet Customer Found' : 'Duplicate Lead Found'}
        size="sm"
        footer={
          duplicateModal?.kind === 'internetCustomer' ? (
            <>
              <Button variant="secondary" onClick={() => setDuplicateModal(null)}>Go Back</Button>
              <Button onClick={() => handleSwitchToFlowA(duplicateModal.customer)}>Switch to Flow A</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={handleViewExisting}>View Existing Lead</Button>
              <Button onClick={handleContinueAnyway}>Continue Anyway</Button>
            </>
          )
        }
      >
        {duplicateModal?.kind === 'internetCustomer' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">This mobile number already belongs to an existing Internet Customer:</p>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer ID</span>
                <span className="font-mono font-semibold text-gray-800">{duplicateModal.customer.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Customer Name</span>
                <span className="font-medium text-gray-800">{duplicateModal.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Plan</span>
                <span className="font-medium text-gray-800">{duplicateModal.customer.plan ?? '—'}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              This customer already has an internet connection. Please use "Yes — Existing Internet Customer" instead.
            </p>
          </div>
        )}

        {duplicateModal && duplicateModal.kind !== 'internetCustomer' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">A lead already exists with this mobile number:</p>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Lead ID</span>
                <span className="font-mono font-semibold text-gray-800">{duplicateModal.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Customer Name</span>
                <span className="font-medium text-gray-800">{duplicateModal.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Stage</span>
                <span className="font-medium text-gray-800">{duplicateModal.stage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="font-medium text-gray-800">{duplicateModal.createdAt}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, UserCheck, Search, Loader2, User, MapPin, PhoneCall, ClipboardList,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { saveLead, getLeads, INTERCOM_STAFF } from '../data/intercomLeadsStore'
import { getStates, getDistricts, getAreasList, getIntercomLocalities, getSubLocalities } from '../data/areaMappingStore'

const INTERNET_PROVIDERS = ['Airtel', 'Jio', 'BSNL', 'ACT', 'Hathway', 'Other', 'Not Using Internet']
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
}

const INIT_FORM_A_EXTRA = {
  altMobile: '', intercomType: '', installDate: '', timeSlot: '', customerRemarks: '', salesRemarks: '',
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

function RelationshipOption({ selected, onSelect, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-start gap-3 flex-1 text-left px-4 py-3.5 rounded-xl border-2 transition-colors ${
        selected ? 'border-brand-blue bg-brand-blue/5' : 'border-surface-border hover:border-gray-300'
      }`}
    >
      <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
        selected ? 'border-brand-blue' : 'border-gray-300'
      }`}>
        {selected && <span className="w-2 h-2 rounded-full bg-brand-blue" />}
      </span>
      <span>
        <span className="block text-sm font-semibold text-gray-800">{title}</span>
        <span className="block text-xs text-gray-500 mt-0.5">{subtitle}</span>
      </span>
    </button>
  )
}

export default function IntercomLeadNew() {
  const navigate = useNavigate()
  const [leadId] = useState(() => nextIntercomLeadId())
  const [relationship, setRelationship] = useState('')

  // Flow A — existing customer
  const [searchCustomerId, setSearchCustomerId] = useState('')
  const [searchRegNumber, setSearchRegNumber] = useState('')
  const [searchError, setSearchError] = useState('')
  const [finding, setFinding] = useState(false)
  const [foundCustomer, setFoundCustomer] = useState(null)
  const [formA, setFormA] = useState(INIT_FORM_A_EXTRA)

  // Flow B — new / intercom-only customer
  const [formB, setFormB] = useState(INIT_FORM_B)
  const [errorsB, setErrorsB] = useState({})

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

  function handleRelationshipChange(value) {
    setRelationship(value)
    setSearchCustomerId('')
    setSearchRegNumber('')
    setSearchError('')
    setFinding(false)
    setFoundCustomer(null)
    setFormA(INIT_FORM_A_EXTRA)
    setFormB(INIT_FORM_B)
    setErrorsB({})
  }

  function handleFindCustomer() {
    if (!searchCustomerId.trim() && !searchRegNumber.trim()) {
      setSearchError('Enter at least one value')
      return
    }
    setSearchError('')
    setFinding(true)
    setFoundCustomer(null)
    setTimeout(() => {
      setFinding(false)
      setFoundCustomer(MOCK_CUSTOMER)
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

  function handleCreate() {
    const today = new Date().toISOString().slice(0, 10)
    const stageHistory = [{ stage: 'New', date: today, time: nowTime(), note: 'Lead created', actor: 'Admin User' }]

    if (relationship === 'yes') {
      if (!foundCustomer) return
      const lead = saveLead({
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
        relationshipType: 'Existing Internet Customer',
        existingCustomerId: foundCustomer.customerId,
        registrationNumber: foundCustomer.registrationNumber,
        billingAddress: foundCustomer.billingAddress,
        internetPackage: foundCustomer.internetPackage,
        altMobile: formA.altMobile,
        intercomType: formA.intercomType,
        installDate: formA.installDate,
        timeSlot: formA.timeSlot,
        customerRemarks: formA.customerRemarks,
        salesRemarks: formA.salesRemarks,
        stageHistory,
      })
      navigate(`/intercom/leads/${lead.id}`)
      return
    }

    if (relationship === 'no') {
      const e = validateB()
      if (Object.keys(e).length) { setErrorsB(e); return }
      const lead = saveLead({
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
      })
      navigate(`/intercom/leads/${lead.id}`)
    }
  }

  const canCreate = relationship === 'yes' ? !!foundCustomer : relationship === 'no'

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
            <p className="text-sm text-gray-500 mt-0.5">
              Fill in the details to add a new intercom service lead · <span className="font-mono">{leadId}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

        {/* Section 1 — Customer Relationship Check */}
        <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck size={15} className="text-brand-blue" />
            <p className="text-sm font-bold text-gray-700">Customer Relationship Check</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <RelationshipOption
              selected={relationship === 'yes'}
              onSelect={() => handleRelationshipChange('yes')}
              title="Yes — Existing Internet Customer"
              subtitle="Link this lead to an existing internet customer account"
            />
            <RelationshipOption
              selected={relationship === 'no'}
              onSelect={() => handleRelationshipChange('no')}
              title="No — New / Intercom-Only Customer"
              subtitle="Create a fresh lead with full customer & location details"
            />
          </div>
        </div>

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

    </div>
  )
}

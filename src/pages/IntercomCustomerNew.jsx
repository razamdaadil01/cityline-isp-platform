import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, User, Building2, MapPin, Upload, Cable, ShieldCheck, Settings2, CheckCircle2,
} from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { getLead, saveLead, INTERCOM_PLANS, INTERCOM_STAFF } from '../data/intercomLeadsStore'
import { addCustomer, nextIntercomCustomerId } from '../data/customersData'

const PROJECTS = ['Sunrise Apartments', 'Greenwood Residency', 'Metro Business Park', 'Palm Grove Society']
const AREAS_ZONES = ['Koramangala', 'Indiranagar', 'Whitefield', 'HSR Layout', 'Electronic City', 'Marathahalli', 'BTM Layout']
const DOC_TYPES = ['Aadhaar', 'PAN', 'Passport', 'Voter ID']

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

export default function IntercomCustomerNew() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const leadId = searchParams.get('leadId')
  const lead = leadId ? getLead(leadId) : null

  const [customerId] = useState(() => nextIntercomCustomerId())

  const [form, setForm] = useState({
    customerName: lead?.customer ?? '',
    mobile: lead?.mobile ?? '',
    altMobile: '',
    email: '',
    project: '',
    areaZone: '',
    salesExec: lead?.assigned ?? '',
    billingAddress: '',
    installationAddress: '',
    sameAsBilling: false,
    circuitNumber: '',
    activationDate: '',
    docType: DOC_TYPES[0],
    docNumber: '',
    docFile: null,
    status: 'Pending Installation',
    plan: lead?.package ?? lead?.plan ?? INTERCOM_PLANS[0],
    installDate: lead?.installDate ?? '',
    notes: lead?.notes ?? '',
  })
  const [errors, setErrors] = useState({})

  function set(f, v) {
    setForm(p => {
      const next = { ...p, [f]: v }
      if (f === 'billingAddress' && p.sameAsBilling) next.installationAddress = v
      if (f === 'sameAsBilling' && v) next.installationAddress = p.billingAddress
      return next
    })
    setErrors(p => ({ ...p, [f]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.customerName.trim())            e.customerName = 'Customer name is required'
    if (!form.mobile.match(/^\d{10}$/))        e.mobile       = 'Enter a valid 10-digit number'
    if (!form.project)                         e.project      = 'Select a project'
    if (!form.areaZone)                        e.areaZone     = 'Select an area/zone'
    if (!form.salesExec)                       e.salesExec    = 'Select a sales executive'
    if (!form.billingAddress.trim())           e.billingAddress = 'Billing address is required'
    if (!form.installationAddress.trim())      e.installationAddress = 'Installation address is required'
    if (!form.circuitNumber.trim())            e.circuitNumber = 'Circuit/landline number is required'
    if (!form.activationDate)                  e.activationDate = 'Activation date is required'
    return e
  }

  function handleCreate() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    addCustomer({
      id: customerId,
      name: form.customerName,
      phone: form.mobile,
      services: ['Intercom'],
      plan: form.plan,
      zone: form.areaZone,
      area: form.areaZone,
      network: '—',
      expiry: '—',
      status: form.status === 'Active' ? 'active' : 'inactive',
      // ── all form field values ──
      altMobile: form.altMobile,
      email: form.email,
      sourceLeadId: lead?.id ?? null,
      project: form.project,
      areaZone: form.areaZone,
      salesExec: form.salesExec,
      billingAddress: form.billingAddress,
      installationAddress: form.installationAddress,
      circuitNumber: form.circuitNumber,
      activationDate: form.activationDate,
      docType: form.docType,
      docNumber: form.docNumber,
      installDate: form.installDate,
      notes: form.notes,
      circuit: {
        circuitId: form.circuitNumber,
        landlineNumber: form.mobile,
        activationDate: form.activationDate,
        serviceStatus: form.status,
      },
    })

    if (lead) {
      const now = new Date()
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      saveLead({
        ...lead,
        stage: 'Converted',
        customerId,
        stageHistory: [...(lead.stageHistory ?? []), {
          stage: 'Converted',
          date: now.toISOString().slice(0, 10),
          time,
          note: `Installation completed — customer account ${customerId} created`,
          actor: 'Admin User',
        }],
      })
    }

    navigate('/customers?type=intercom')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-5 shrink-0 bg-white border-b border-surface-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create Intercom Customer</h1>
            <p className="text-sm text-gray-500 mt-0.5">Fill in the details to create a new intercom customer</p>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 items-start">

          {/* ── LEFT PANEL — Customer Details ─────────────────────────── */}
          <div className="space-y-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer Details</p>

            {/* Personal Info */}
            <SectionCard title="Personal Info" icon={User}>
              <FormField label="Customer Name" required error={errors.customerName}>
                <Input value={form.customerName} onChange={e => set('customerName', e.target.value)} placeholder="Ramesh Nair" />
              </FormField>
              <FormField label="Mobile Number" required error={errors.mobile}>
                <Input type="tel" value={form.mobile}
                  onChange={e => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" />
              </FormField>
              <FormField label="Alternate Number">
                <Input type="tel" value={form.altMobile}
                  onChange={e => set('altMobile', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" />
              </FormField>
              <FormField label="Email">
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="ramesh@email.com" />
              </FormField>
            </SectionCard>

            {/* Service Info */}
            <SectionCard title="Service Info" icon={Building2}>
              <FormField label="Intercom Customer ID">
                <Input value={customerId} disabled className="bg-gray-50 text-gray-500 font-mono" />
              </FormField>
              <FormField label="Source Lead ID">
                <Input value={lead?.id ?? '—'} disabled className="bg-gray-50 text-gray-500 font-mono" />
              </FormField>
              <FormField label="Project" required error={errors.project}>
                <Select value={form.project} onChange={e => set('project', e.target.value)}>
                  <option value="">Select project…</option>
                  {PROJECTS.map(p => <option key={p}>{p}</option>)}
                </Select>
              </FormField>
              <FormField label="Area/Zone" required error={errors.areaZone}>
                <Select value={form.areaZone} onChange={e => set('areaZone', e.target.value)}>
                  <option value="">Select area/zone…</option>
                  {AREAS_ZONES.map(a => <option key={a}>{a}</option>)}
                </Select>
              </FormField>
              <div className="col-span-2">
                <FormField label="Sales Executive" required error={errors.salesExec}>
                  <Select value={form.salesExec} onChange={e => set('salesExec', e.target.value)}>
                    <option value="">Select sales executive…</option>
                    {INTERCOM_STAFF.map(s => <option key={s.name}>{s.name}</option>)}
                  </Select>
                </FormField>
              </div>
            </SectionCard>

            {/* Address */}
            <SectionCard title="Address" icon={MapPin}>
              <div className="col-span-2">
                <FormField label="Billing Address" required error={errors.billingAddress}>
                  <Textarea value={form.billingAddress} onChange={e => set('billingAddress', e.target.value)}
                    placeholder="House/Flat no., Street, Building name, Area" rows={2} />
                </FormField>
              </div>
              <div className="col-span-2">
                <FormField label="Installation Address" required error={errors.installationAddress}>
                  <Textarea value={form.installationAddress} onChange={e => set('installationAddress', e.target.value)}
                    placeholder="House/Flat no., Street, Building name, Area" rows={2}
                    disabled={form.sameAsBilling} className={form.sameAsBilling ? 'bg-gray-50 text-gray-500' : ''} />
                </FormField>
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.sameAsBilling}
                    onChange={e => set('sameAsBilling', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30" />
                  <span className="text-sm text-gray-700">Same as Billing Address</span>
                </label>
              </div>
            </SectionCard>

            {/* Circuit */}
            <SectionCard title="Circuit" icon={Cable}>
              <FormField label="Circuit/Landline Number" required error={errors.circuitNumber}>
                <Input value={form.circuitNumber} onChange={e => set('circuitNumber', e.target.value)} placeholder="IC-2026-0001" className="font-mono" />
              </FormField>
              <FormField label="Activation Date" required error={errors.activationDate}>
                <Input type="date" value={form.activationDate} onChange={e => set('activationDate', e.target.value)} />
              </FormField>
            </SectionCard>

            {/* KYC */}
            <SectionCard title="KYC" icon={ShieldCheck}>
              <FormField label="Document Type">
                <Select value={form.docType} onChange={e => set('docType', e.target.value)}>
                  {DOC_TYPES.map(d => <option key={d}>{d}</option>)}
                </Select>
              </FormField>
              <FormField label="Document Number">
                <Input value={form.docNumber} onChange={e => set('docNumber', e.target.value)} placeholder="Document number" />
              </FormField>
              <div className="col-span-2">
                <FormField label="Upload Document">
                  <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                    form.docFile ? 'border-emerald-400 bg-emerald-50' : 'border-surface-border bg-gray-50 hover:border-brand-blue/50 hover:bg-brand-blue/5'
                  }`}>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                      onChange={e => e.target.files?.[0] && set('docFile', e.target.files[0])} />
                    {form.docFile ? (
                      <>
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        <span className="text-xs font-medium text-emerald-700 truncate">{form.docFile.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} className="text-gray-400 shrink-0" />
                        <span className="text-xs font-semibold text-gray-600">Click to upload · JPG, PNG or PDF</span>
                      </>
                    )}
                  </label>
                </FormField>
              </div>
            </SectionCard>
          </div>

          {/* ── RIGHT PANEL — Service Settings ────────────────────────── */}
          <div className="space-y-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Service Settings</p>
            <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Settings2 size={15} className="text-brand-blue" />
                <p className="text-sm font-bold text-gray-700">Service Settings</p>
              </div>

              <FormField label="Customer Status">
                <div className="flex gap-2">
                  {['Pending Installation', 'Active'].map(s => (
                    <button key={s} type="button" onClick={() => set('status', s)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        form.status === s
                          ? 'bg-brand-blue text-white border-transparent shadow-sm'
                          : 'border-surface-border text-gray-600 hover:border-brand-blue/40'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField label="Plan">
                <Select value={form.plan} onChange={e => set('plan', e.target.value)}>
                  {INTERCOM_PLANS.map(p => <option key={p}>{p}</option>)}
                </Select>
              </FormField>

              <FormField label="Installation Date">
                <Input type="date" value={form.installDate} onChange={e => set('installDate', e.target.value)} />
              </FormField>

              <FormField label="Notes">
                <Textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="Any additional notes about this customer…" rows={4} />
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
          <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Customer</Button>
        </div>
      </div>

    </div>
  )
}

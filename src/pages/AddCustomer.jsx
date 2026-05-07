import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, MapPin, Wifi, FileText, CheckCircle2, ChevronLeft, ChevronRight,
  Upload, Smartphone, Check, ShieldCheck, AlertCircle, FileCheck, X
} from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import Badge from '../components/ui/Badge'

// ── Static data ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Personal Info', icon: User },
  { id: 2, label: 'Address', icon: MapPin },
  { id: 3, label: 'Service', icon: Wifi },
  { id: 4, label: 'KYC Docs', icon: FileText },
  { id: 5, label: 'Review', icon: CheckCircle2 },
]

const PLANS = [
  { id: 'p1', name: '50 Mbps Starter',  speed: '50 / 25 Mbps',   price: 499,  fup: '100 GB FUP', best: false },
  { id: 'p2', name: '100 Mbps Home',    speed: '100 / 50 Mbps',  price: 799,  fup: '200 GB FUP', best: true  },
  { id: 'p3', name: '200 Mbps Pro',     speed: '200 / 100 Mbps', price: 1199, fup: 'Unlimited',  best: false },
  { id: 'p4', name: '500 Mbps Ultra',   speed: '500 / 500 Mbps', price: 1999, fup: 'Unlimited',  best: false },
]

const AREAS_MAP = {
  'Koramangala':   ['1st Block', '2nd Block', '3rd Block', '4th Block', '5th Block'],
  'Indiranagar':   ['12th Main', '100 Feet Road', 'HAL 2nd Stage', '4th Cross'],
  'Whitefield':    ['Main Road', 'ITPL Road', 'Kadugodi', 'Varthur Main Road'],
  'HSR Layout':    ['Sector 1', 'Sector 2', 'Sector 3', 'Sector 4', 'Sector 5'],
  'Electronic City': ['Phase 1', 'Phase 2', 'Neeladri Nagar'],
  'Marathahalli':  ['Bridge Area', 'Old Airport Road', 'Outer Ring Road'],
  'BTM Layout':    ['1st Stage', '2nd Stage', 'Madiwala', 'Silk Board'],
}

const ZONES = [
  'Zone A – North', 'Zone B – South', 'Zone C – East',
  'Zone D – West',  'Zone E – Central',
]

const INIT_FORM = {
  firstName: '', lastName: '', phone: '', email: '', dob: '', gender: '', altPhone: '',
  companyName: '', gstNo: '', poNumber: '',
  area: '', subArea: '', boxNo: '', street: '', building: '', zone: '', landmark: '', pincode: '',
  planId: '', installDate: '', staticIp: false, routerModel: '',
  aadhaarNo: '', aadhaarVerified: false, panNo: '',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ children }) {
  return (
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 pb-2 border-b border-surface-border">
      {children}
    </p>
  )
}

function StepProgress({ current }) {
  return (
    <div className="flex items-start">
      {STEPS.map((s, i) => {
        const done   = s.id < current
        const active = s.id === current
        const Icon   = s.icon
        return (
          <div key={s.id} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2 min-w-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                done   ? 'bg-brand-blue text-white' :
                active ? 'bg-navy text-white ring-4 ring-navy/20' :
                         'bg-gray-100 text-gray-400'
              }`}>
                {done ? <Check size={15} /> : <Icon size={15} />}
              </div>
              <span className={`text-[11px] font-semibold text-center leading-tight whitespace-nowrap ${
                active ? 'text-navy' : done ? 'text-brand-blue' : 'text-gray-400'
              }`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mt-[18px] mx-2 transition-all ${
                done ? 'bg-brand-blue' : 'bg-gray-200'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function FileUploadBox({ label, file, onFile, accept = '.jpg,.jpeg,.png,.pdf' }) {
  return (
    <label className={`flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
      file
        ? 'border-emerald-400 bg-emerald-50'
        : 'border-surface-border bg-gray-50 hover:border-brand-blue/50 hover:bg-brand-blue/5'
    }`}>
      <input
        type="file"
        className="hidden"
        accept={accept}
        onChange={e => e.target.files[0] && onFile(e.target.files[0])}
      />
      {file ? (
        <>
          <CheckCircle2 size={24} className="text-emerald-500" />
          <span className="text-xs font-medium text-emerald-700 text-center break-all line-clamp-2">{file.name}</span>
        </>
      ) : (
        <>
          <Upload size={22} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-600 text-center">{label}</span>
          <span className="text-[10px] text-gray-400">JPG, PNG or PDF</span>
        </>
      )}
    </label>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AddCustomer() {
  const navigate = useNavigate()
  const [step, setStep]     = useState(1)
  const [ctype, setCtype]   = useState('B2C')
  const [form, setForm]     = useState(INIT_FORM)
  const [errors, setErrors] = useState({})

  const [otpSent,    setOtpSent]    = useState(false)
  const [otpValue,   setOtpValue]   = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError,   setOtpError]   = useState('')

  const [docs, setDocs] = useState({ aadhaarFront: null, aadhaarBack: null, photo: null, gstCert: null })

  const [submitted, setSubmitted] = useState(false)
  const [cafNo,     setCafNo]     = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  function validate() {
    const e = {}
    if (step === 1) {
      if (!form.firstName.trim())                              e.firstName   = 'First name is required'
      if (!form.lastName.trim())                               e.lastName    = 'Last name is required'
      if (!form.phone.match(/^\d{10}$/))                       e.phone       = 'Enter a valid 10-digit mobile number'
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address'
      if (ctype === 'B2B' && !form.companyName.trim())         e.companyName = 'Company name is required for B2B'
    }
    if (step === 2) {
      if (!form.area)         e.area   = 'Please select an area'
      if (!form.street.trim()) e.street = 'Street / road is required'
      if (!form.zone)         e.zone   = 'Please select a zone'
    }
    if (step === 3) {
      if (!form.planId)       e.planId      = 'Please select a service plan'
      if (!form.installDate)  e.installDate = 'Installation date is required'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() { if (validate()) setStep(s => Math.min(s + 1, 5)) }
  function prev() { setStep(s => Math.max(s - 1, 1)) }

  async function sendOtp() {
    if (!form.aadhaarNo.match(/^\d{12}$/)) {
      setErrors(e => ({ ...e, aadhaarNo: 'Enter a valid 12-digit Aadhaar number' }))
      return
    }
    setOtpLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setOtpLoading(false)
    setOtpSent(true)
    setOtpError('')
  }

  async function verifyOtp() {
    setOtpLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setOtpLoading(false)
    if (otpValue === '123456') {
      set('aadhaarVerified', true)
      setOtpError('')
    } else {
      setOtpError('Invalid OTP. Use 123456 for demo.')
    }
  }

  function handleSubmit() {
    const year = new Date().getFullYear()
    const seq  = String(Math.floor(Math.random() * 99999)).padStart(5, '0')
    setCafNo(`CAF-${year}${seq}`)
    setSubmitted(true)
  }

  function resetForm() {
    setSubmitted(false)
    setStep(1)
    setForm(INIT_FORM)
    setDocs({ aadhaarFront: null, aadhaarBack: null, photo: null, gstCert: null })
    setOtpSent(false)
    setOtpValue('')
    setOtpError('')
    setErrors({})
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    const plan = PLANS.find(p => p.id === form.planId)
    return (
      <div className="p-6 flex justify-center">
        <div className="w-full max-w-lg mt-6 bg-white rounded-2xl shadow-card border border-surface-border p-10 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={42} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Registered!</h2>
          <p className="text-gray-500 mb-7">
            {form.firstName} {form.lastName} has been successfully added to Cityline Networks.
          </p>
          <div className="bg-navy rounded-xl p-5 mb-7">
            <p className="text-[11px] text-white/60 mb-1 font-semibold tracking-wider uppercase">
              Customer Application Form
            </p>
            <p className="text-3xl font-mono font-bold text-white tracking-widest">{cafNo}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-left mb-8">
            {[
              ['Customer', `${form.firstName} ${form.lastName}`],
              ['Plan', plan?.name],
              ['Area', form.area],
              ['Install Date', form.installDate],
            ].map(([l, v]) => (
              <div key={l} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">{l}</p>
                <p className="font-semibold text-gray-800">{v}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => navigate('/customers')}>
              View Customers
            </Button>
            <Button className="flex-1" onClick={resetForm}>
              Add Another
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const subAreas    = AREAS_MAP[form.area] ?? []
  const selectedPlan = PLANS.find(p => p.id === form.planId)

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl">

      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/customers')}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Add New Customer</h1>
          <p className="text-sm text-gray-500 mt-0.5">Register a new subscriber on Cityline Networks platform</p>
        </div>
        {/* B2C / B2B toggle */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
          {['B2C', 'B2B'].map(t => (
            <button
              key={t}
              onClick={() => setCtype(t)}
              className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${
                ctype === t
                  ? t === 'B2B'
                    ? 'bg-navy text-white shadow-sm'
                    : 'bg-brand-blue text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Step indicator */}
      <div className="bg-white rounded-2xl shadow-card border border-surface-border px-8 py-6 mb-4">
        <StepProgress current={step} />
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl shadow-card border border-surface-border overflow-hidden">
        <div className="px-8 py-7">

          {/* ── Step 1: Personal Info ─────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              {ctype === 'B2B' && (
                <div className="bg-navy/5 border border-navy/20 rounded-xl p-5">
                  <SectionHeading>Company Details</SectionHeading>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField label="Company Name" required error={errors.companyName}>
                      <Input
                        value={form.companyName}
                        onChange={e => set('companyName', e.target.value)}
                        placeholder="Acme Technologies Pvt Ltd"
                        error={errors.companyName}
                      />
                    </FormField>
                    <FormField label="GST Number" error={errors.gstNo}>
                      <Input
                        value={form.gstNo}
                        onChange={e => set('gstNo', e.target.value.toUpperCase())}
                        placeholder="29AABCU9603R1ZX"
                        error={errors.gstNo}
                      />
                    </FormField>
                    <FormField label="PO Number">
                      <Input
                        value={form.poNumber}
                        onChange={e => set('poNumber', e.target.value)}
                        placeholder="PO-2026-00123"
                      />
                    </FormField>
                  </div>
                </div>
              )}

              <div>
                <SectionHeading>Contact Person</SectionHeading>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="First Name" required error={errors.firstName}>
                    <Input
                      value={form.firstName}
                      onChange={e => set('firstName', e.target.value)}
                      placeholder="Rajan"
                      error={errors.firstName}
                    />
                  </FormField>
                  <FormField label="Last Name" required error={errors.lastName}>
                    <Input
                      value={form.lastName}
                      onChange={e => set('lastName', e.target.value)}
                      placeholder="Mehta"
                      error={errors.lastName}
                    />
                  </FormField>
                  <FormField label="Mobile Number" required error={errors.phone}>
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      error={errors.phone}
                    />
                  </FormField>
                  <FormField label="Alternate Number">
                    <Input
                      type="tel"
                      value={form.altPhone}
                      onChange={e => set('altPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543211"
                    />
                  </FormField>
                  <FormField label="Email Address" error={errors.email}>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      placeholder="rajan@email.com"
                      error={errors.email}
                    />
                  </FormField>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Date of Birth">
                      <Input
                        type="date"
                        value={form.dob}
                        onChange={e => set('dob', e.target.value)}
                      />
                    </FormField>
                    <FormField label="Gender">
                      <Select value={form.gender} onChange={e => set('gender', e.target.value)}>
                        <option value="">Select</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                        <option>Prefer not to say</option>
                      </Select>
                    </FormField>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Address ────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <SectionHeading>Service Address — 6-Level Hierarchy</SectionHeading>
              <div className="grid grid-cols-3 gap-4">
                {/* Level 1 – Area */}
                <FormField label="Area" required error={errors.area}
                  hint="Level 1 — Network coverage area">
                  <Select
                    value={form.area}
                    onChange={e => { set('area', e.target.value); set('subArea', '') }}
                    error={errors.area}
                  >
                    <option value="">Select Area</option>
                    {Object.keys(AREAS_MAP).map(a => <option key={a}>{a}</option>)}
                  </Select>
                </FormField>

                {/* Level 2 – Sub-Area */}
                <FormField label="Sub-Area" hint="Level 2 — Locality / block">
                  <Select
                    value={form.subArea}
                    onChange={e => set('subArea', e.target.value)}
                    disabled={!form.area}
                  >
                    <option value="">Select Sub-Area</option>
                    {subAreas.map(s => <option key={s}>{s}</option>)}
                  </Select>
                </FormField>

                {/* Level 3 – Box */}
                <FormField label="Box / ONT No." hint="Level 3 — Distribution box">
                  <Input
                    value={form.boxNo}
                    onChange={e => set('boxNo', e.target.value)}
                    placeholder="BOX-KRM-042"
                  />
                </FormField>

                {/* Level 4 – Street */}
                <div className="col-span-2">
                  <FormField label="Street / Road" required error={errors.street}
                    hint="Level 4 — Street or road name">
                    <Input
                      value={form.street}
                      onChange={e => set('street', e.target.value)}
                      placeholder="12th Main Road, Near Apollo Hospital"
                      error={errors.street}
                    />
                  </FormField>
                </div>

                {/* Level 5 – Building */}
                <FormField label="Building / House No." hint="Level 5 — Apartment or house">
                  <Input
                    value={form.building}
                    onChange={e => set('building', e.target.value)}
                    placeholder="Flat 4B, Sunflower Apts"
                  />
                </FormField>

                {/* Level 6 – Zone */}
                <FormField label="Zone" required error={errors.zone}
                  hint="Level 6 — Network zone">
                  <Select
                    value={form.zone}
                    onChange={e => set('zone', e.target.value)}
                    error={errors.zone}
                  >
                    <option value="">Select Zone</option>
                    {ZONES.map(z => <option key={z}>{z}</option>)}
                  </Select>
                </FormField>

                <FormField label="Landmark">
                  <Input
                    value={form.landmark}
                    onChange={e => set('landmark', e.target.value)}
                    placeholder="Near Main Market"
                  />
                </FormField>

                <FormField label="PIN Code">
                  <Input
                    value={form.pincode}
                    onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="560095"
                  />
                </FormField>
              </div>

              {form.area && (
                <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-4 flex items-start gap-3">
                  <MapPin size={15} className="text-brand-blue mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-800 mb-0.5">Address Preview</p>
                    <p className="text-gray-500">
                      {[form.building, form.street, form.subArea, form.area, form.zone, form.pincode]
                        .filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Service Selection ──────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <SectionHeading>Select a Service Plan</SectionHeading>

              {errors.planId && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <AlertCircle size={15} className="shrink-0" />
                  {errors.planId}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {PLANS.map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => set('planId', plan.id)}
                    className={`relative text-left rounded-xl border-2 p-5 transition-all focus:outline-none ${
                      form.planId === plan.id
                        ? 'border-brand-blue bg-brand-blue/5 shadow-md'
                        : 'border-surface-border bg-white hover:border-brand-blue/40 hover:shadow-sm'
                    }`}
                  >
                    {plan.best && (
                      <span className="absolute top-3 right-3 bg-brand-blue text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        POPULAR
                      </span>
                    )}
                    {form.planId === plan.id && (
                      <div className="absolute top-3 left-3 w-5 h-5 bg-brand-blue rounded-full flex items-center justify-center">
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                    <div className={form.planId === plan.id ? 'pl-7' : ''}>
                      <p className="font-bold text-gray-900">{plan.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{plan.speed}</p>
                      <div className="mt-3 flex items-end gap-1">
                        <span className="text-2xl font-bold text-navy">₹{plan.price}</span>
                        <span className="text-sm text-gray-500 mb-0.5">/month</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{plan.fup}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 pt-1">
                <FormField label="Installation Date" required error={errors.installDate}>
                  <Input
                    type="date"
                    value={form.installDate}
                    onChange={e => set('installDate', e.target.value)}
                    error={errors.installDate}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </FormField>
                <FormField label="Router Model">
                  <Select value={form.routerModel} onChange={e => set('routerModel', e.target.value)}>
                    <option value="">Will be assigned on install</option>
                    <option>TP-Link AX3000</option>
                    <option>Netgear R7000</option>
                    <option>D-Link DIR-825</option>
                    <option>Asus RT-AX88U</option>
                    <option>Customer's own device</option>
                  </Select>
                </FormField>
                <FormField label="Static IP">
                  <div className="flex items-center gap-3 mt-1.5">
                    <button
                      type="button"
                      onClick={() => set('staticIp', !form.staticIp)}
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                        form.staticIp ? 'bg-brand-blue' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                        form.staticIp ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                    <span className="text-sm text-gray-600">
                      {form.staticIp ? 'Enabled (+₹200/mo)' : 'Not required'}
                    </span>
                  </div>
                </FormField>
              </div>
            </div>
          )}

          {/* ── Step 4: KYC Documents ─────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-7">

              {/* Aadhaar eKYC */}
              <div>
                <SectionHeading>Aadhaar eKYC Verification</SectionHeading>
                <div className={`rounded-xl border-2 p-5 transition-colors ${
                  form.aadhaarVerified ? 'border-emerald-400 bg-emerald-50' : 'border-surface-border bg-white'
                }`}>
                  {form.aadhaarVerified ? (
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                        <ShieldCheck size={22} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-800">eKYC Verified Successfully</p>
                        <p className="text-sm text-emerald-600 mt-0.5">
                          Aadhaar: XXXX XXXX {form.aadhaarNo.slice(-4)}
                        </p>
                      </div>
                      <button
                        className="ml-auto text-xs text-emerald-600 hover:underline"
                        onClick={() => { set('aadhaarVerified', false); setOtpSent(false); setOtpValue('') }}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <FormField label="Aadhaar Number" required error={errors.aadhaarNo}
                            hint="12-digit Aadhaar number">
                            <Input
                              value={form.aadhaarNo}
                              onChange={e => set('aadhaarNo', e.target.value.replace(/\D/g, '').slice(0, 12))}
                              placeholder="1234 5678 9012"
                              error={errors.aadhaarNo}
                              disabled={otpSent}
                            />
                          </FormField>
                        </div>
                        {!otpSent && (
                          <Button
                            variant="navy"
                            icon={<Smartphone size={15} />}
                            onClick={sendOtp}
                            disabled={otpLoading || form.aadhaarNo.length < 12}
                          >
                            {otpLoading ? 'Sending…' : 'Send OTP'}
                          </Button>
                        )}
                      </div>

                      {otpSent && (
                        <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Smartphone size={15} className="text-brand-blue" />
                            <p className="text-sm font-medium text-brand-blue">
                              OTP sent to mobile linked with Aadhaar
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <Input
                                value={otpValue}
                                onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit OTP"
                              />
                              <p className="text-xs text-gray-400 mt-1">Demo OTP: 123456</p>
                              {otpError && <p className="text-xs text-red-500 mt-1">{otpError}</p>}
                            </div>
                            <Button
                              onClick={verifyOtp}
                              disabled={otpLoading || otpValue.length < 6}
                            >
                              {otpLoading ? 'Verifying…' : 'Verify OTP'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Document uploads */}
              <div>
                <SectionHeading>Document Upload</SectionHeading>
                <div className={`grid gap-4 ${ctype === 'B2B' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  <FileUploadBox
                    label="Aadhaar Front"
                    file={docs.aadhaarFront}
                    onFile={f => setDocs(d => ({ ...d, aadhaarFront: f }))}
                  />
                  <FileUploadBox
                    label="Aadhaar Back"
                    file={docs.aadhaarBack}
                    onFile={f => setDocs(d => ({ ...d, aadhaarBack: f }))}
                  />
                  <FileUploadBox
                    label="Passport Photo"
                    file={docs.photo}
                    onFile={f => setDocs(d => ({ ...d, photo: f }))}
                    accept=".jpg,.jpeg,.png"
                  />
                  {ctype === 'B2B' && (
                    <FileUploadBox
                      label="GST Certificate"
                      file={docs.gstCert}
                      onFile={f => setDocs(d => ({ ...d, gstCert: f }))}
                    />
                  )}
                </div>
              </div>

              {/* Optional PAN */}
              <div>
                <SectionHeading>Additional Identity (Optional)</SectionHeading>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="PAN Number">
                    <Input
                      value={form.panNo}
                      onChange={e => set('panNo', e.target.value.toUpperCase().slice(0, 10))}
                      placeholder="ABCDE1234F"
                    />
                  </FormField>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 5: Review & Submit ────────────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-4">
              <SectionHeading>Review All Details Before Submission</SectionHeading>

              {/* Personal block */}
              <ReviewBlock title="Personal Information" onEdit={() => setStep(1)}>
                <ReviewGrid items={[
                  ['Name',    `${form.firstName} ${form.lastName}`],
                  ['Phone',   form.phone],
                  ['Email',   form.email || '—'],
                  ['DOB',     form.dob || '—'],
                  ['Gender',  form.gender || '—'],
                  ['Type',    <Badge variant={ctype === 'B2B' ? 'navy' : 'blue'} size="sm">{ctype}</Badge>],
                  ...(ctype === 'B2B' ? [
                    ['Company', form.companyName],
                    ['GST No',  form.gstNo || '—'],
                    ['PO No',   form.poNumber || '—'],
                  ] : []),
                ]} />
              </ReviewBlock>

              {/* Address block */}
              <ReviewBlock title="Address" onEdit={() => setStep(2)}>
                <ReviewGrid items={[
                  ['Area',      form.area || '—'],
                  ['Sub-Area',  form.subArea || '—'],
                  ['Box/ONT',   form.boxNo || '—'],
                  ['Street',    form.street || '—'],
                  ['Building',  form.building || '—'],
                  ['Zone',      form.zone || '—'],
                  ['Landmark',  form.landmark || '—'],
                  ['PIN Code',  form.pincode || '—'],
                ]} />
              </ReviewBlock>

              {/* Service block */}
              {selectedPlan && (
                <ReviewBlock title="Service Plan" onEdit={() => setStep(3)}>
                  <ReviewGrid items={[
                    ['Plan',        selectedPlan.name],
                    ['Speed',       selectedPlan.speed],
                    ['Monthly',     `₹${selectedPlan.price + (form.staticIp ? 200 : 0)}`],
                    ['FUP',         selectedPlan.fup],
                    ['Install',     form.installDate],
                    ['Static IP',   form.staticIp ? 'Yes (+₹200/mo)' : 'No'],
                    ['Router',      form.routerModel || 'To be assigned'],
                  ]} />
                </ReviewBlock>
              )}

              {/* KYC status block */}
              <ReviewBlock title="KYC Status" onEdit={() => setStep(4)}>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    ['Aadhaar eKYC',  form.aadhaarVerified],
                    ['Aadhaar Front', !!docs.aadhaarFront],
                    ['Aadhaar Back',  !!docs.aadhaarBack],
                    ['Photo',         !!docs.photo],
                    ...(ctype === 'B2B' ? [['GST Cert', !!docs.gstCert]] : []),
                  ].map(([l, ok]) => (
                    <div key={l} className={`flex items-center gap-2 text-xs font-semibold rounded-lg px-3 py-2.5 ${
                      ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {ok ? <Check size={13} /> : <AlertCircle size={13} />}
                      {l}
                    </div>
                  ))}
                </div>
              </ReviewBlock>

              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Submitting will auto-generate a CAF number and mark this customer as pending activation.
                  All team leads will be notified.
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-surface-border bg-gray-50/50">
          <Button
            variant="secondary"
            onClick={prev}
            disabled={step === 1}
            icon={<ChevronLeft size={16} />}
          >
            Back
          </Button>

          <div className="flex items-center gap-1.5">
            {STEPS.map(s => (
              <div
                key={s.id}
                className={`rounded-full transition-all duration-300 ${
                  s.id === step ? 'bg-navy w-6 h-2' :
                  s.id < step  ? 'bg-brand-blue w-2 h-2' :
                                 'bg-gray-200 w-2 h-2'
                }`}
              />
            ))}
          </div>

          {step < 5 ? (
            <Button onClick={next} iconRight={<ChevronRight size={16} />}>
              Next Step
            </Button>
          ) : (
            <Button variant="orange" onClick={handleSubmit} icon={<FileCheck size={16} />}>
              Submit &amp; Generate CAF
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Review helpers ────────────────────────────────────────────────────────────

function ReviewBlock({ title, onEdit, children }) {
  return (
    <div className="rounded-xl border border-surface-border overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-surface-border flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</p>
        <button onClick={onEdit} className="text-xs text-brand-blue hover:underline font-semibold">Edit</button>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}

function ReviewGrid({ items }) {
  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-3">
      {items.map(([label, value]) => (
        <div key={label}>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
        </div>
      ))}
    </div>
  )
}

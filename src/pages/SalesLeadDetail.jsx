import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Edit3, TrendingUp, Bell, MessageSquare, ArrowLeft,
  Activity, Plus, CheckCircle2, XCircle, CalendarDays,
  Phone, Mail, MapPin, User, Clock, ChevronDown, ChevronRight,
  CheckCircle, Send, Loader2,
  Wrench, Wifi, Package, CreditCard, Copy, AlertTriangle, Zap, Smartphone,
  Fingerprint, Search, FileText, PhoneCall, X, Trash2, Download, MoreVertical, RotateCcw, Banknote,
  // Eye, // PROFORMA INVOICE — disabled; only used by the commented-out PI "View" buttons below.
} from 'lucide-react'
import { getLeads, saveLead, subscribeLeads } from '../data/leadsStore'
import { findEkycRecord } from '../data/ekycRecordsStore'
import { saveFeasibilityRequest, getFeasibilityRequests, subscribeFeasibility } from '../data/feasibilityStore'
import {
  getInstallations, subscribeInstallations, saveInstallation, nextInstallationId,
  FIELD_ENGINEERS, INSTALLATION_TEAMS,
} from '../data/installationsStore'
import { MOCK_PLANS, SERVICE_BADGE, BILLING_TYPES, MOCK_ADDONS } from '../data/packagesStore'
import { saveFollowup } from '../data/followupStore'
import { getPipelines, subscribePipelines } from '../data/pipelineStore'
import { getStageFields } from '../data/stageFieldsStore'
import { getCompanyEntity, getCompanyEntities } from '../data/companyEntities'
import { getPartner } from '../data/partners'
import { addCustomer, getNextCustomerId } from '../data/customersData'
import { buildCustomerFromLead } from '../data/leadConversion'
import { getCustomerType, getPPPoEId, getAppPassword, applyPattern, buildCredentialTokens } from '../data/customerTypes'
import { displayFieldValue } from '../components/ui/DynamicFieldInput'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Card, { CardHeader } from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import CallModal from '../components/ui/CallModal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import MoveStageModal, { STAFF, findStageId } from '../components/leads/MoveStageModal'

const PIPELINES = {
  B2C:        { label: 'Residential', labelFull: 'Residential',         color: '#0A8DCD', stages: ['New Inquiry','Follow-up','Feasibility','Installation Visit','Won','Lost'] },
  Custom:     { label: 'Custom',      labelFull: 'Custom Pipeline',     color: '#E8541A', stages: ['New Inquiry','Contacted','Quotation','Won','Lost'] },
  Enterprise: { label: 'Enterprise',  labelFull: 'Enterprise Pipeline', color: '#0284C7', stages: ['New Inquiry Filed','Discussion','Follow-up','Proposal','Won','Lost'] },
}

const STAGE_STYLES = {
  'New Inquiry':           { chip: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500'    },
  'Follow-up':             { chip: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-500'  },
  'Feasibility':           { chip: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500'   },
  'Installation Visit':    { chip: 'bg-orange-100 text-orange-700',  dot: 'bg-orange-500'  },
  // Legacy stage styles (retained for stage history rendering)
  'Contacted':             { chip: 'bg-cyan-100 text-cyan-700',      dot: 'bg-cyan-500'    },
  'Site Survey':           { chip: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500'   },
  'Quotation Sent':        { chip: 'bg-orange-100 text-orange-700',  dot: 'bg-orange-500'  },
  'Negotiation':           { chip: 'bg-pink-100 text-pink-700',      dot: 'bg-pink-500'    },
  'Won':                   { chip: 'bg-emerald-100 text-emerald-700',dot: 'bg-emerald-500' },
  'Lost':                  { chip: 'bg-red-100 text-red-600',        dot: 'bg-red-400'     },
  'Meeting Scheduled':     { chip: 'bg-sky-100 text-sky-700',        dot: 'bg-sky-500'     },
  'Requirement Analysis':  { chip: 'bg-indigo-100 text-indigo-700',  dot: 'bg-indigo-500'  },
  'Technical Feasibility': { chip: 'bg-teal-100 text-teal-700',      dot: 'bg-teal-500'    },
  'Commercial Proposal':   { chip: 'bg-orange-100 text-orange-600',  dot: 'bg-orange-400'  },
  'Legal/Agreement':       { chip: 'bg-slate-100 text-slate-700',    dot: 'bg-slate-500'   },
  'Quotation':             { chip: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500'   },
  // Enterprise specific
  'New Inquiry Filed':     { chip: 'bg-blue-100 text-blue-800',      dot: 'bg-blue-600'    },
  'Discussion':            { chip: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-500'  },
  'Proposal':              { chip: 'bg-teal-100 text-teal-700',      dot: 'bg-teal-500'    },
}

const PLANS = ['50 Mbps Starter', '100 Mbps Home', '200 Mbps Pro', '500 Mbps Ultra']

function getFieldLabel(pipelines, pipelineKey, stageName, fieldId) {
  const stageId = findStageId(pipelines, pipelineKey, stageName)
  if (stageId) {
    const f = getStageFields(stageId).find(x => x.id === fieldId)
    if (f) return f.label
  }
  return fieldId
}

const TODAY = new Date().toISOString().split('T')[0]

function daysBetween(a, b) {
  const ms = new Date(b) - new Date(a)
  return Math.floor(ms / 86400000)
}

function timeAgo(daysAgo, hoursAgo) {
  if (hoursAgo !== undefined) return hoursAgo === 0 ? 'just now' : `${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`
  if (daysAgo === 0) return 'today'
  if (daysAgo === 1) return '1 day ago'
  return `${daysAgo} days ago`
}

function formatTimer(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function maskPhone(phone) {
  if (!phone || phone.length < 3) return phone
  return 'X'.repeat(phone.length - 3) + phone.slice(-3)
}

const EKYC_TAB_STATUS_BADGE = {
  'Not Started': 'gray',
  'Link Sent':   'yellow',
  'Verified':    'green',
}

function formatEkycTimestamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// PROFORMA INVOICE — disabled per request (Package tab). Only used by the
// commented-out handleGeneratePi()/ProformaInvoicePreviewModal below.
// Uncomment to re-enable.
// // PI-{year}-{6-digit sequence}, globally unique across all leads — same
// // incrementing pattern as nextInstallationId() in intercomInstallationsStore.js
// function nextPiNumber(allLeads) {
//   const year = new Date().getFullYear()
//   const nums = allLeads
//     .flatMap(l => l.proformaInvoices ?? [])
//     .map(pi => pi.piNumber.match(/^PI-(\d{4})-(\d+)$/))
//     .filter(Boolean)
//     .map(m => Number(m[2]))
//   const next = (nums.length ? Math.max(...nums) : 0) + 1
//   return `PI-${year}-${String(next).padStart(6, '0')}`
// }

// ── OTPModal ──────────────────────────────────────────────────────────────────

function OTPModal({ isOpen, onClose, phone, onVerified }) {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) { setOtp(''); setError(''); setResent(false) }
  }, [isOpen])

  function handleVerify() {
    if (otp.length !== 6) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      if (otp === '123456') {
        onVerified()
        onClose()
      } else {
        setError('Invalid OTP. Please try again.')
      }
    }, 800)
  }

  function handleResend() {
    setResent(true)
    setError('')
    setTimeout(() => setResent(false), 3000)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Verify Customer" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleResend} disabled={loading || resent}>
            {resent ? 'OTP Sent!' : 'Resend OTP'}
          </Button>
          <Button
            icon={loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            onClick={handleVerify}
            disabled={otp.length !== 6 || loading}
          >
            {loading ? 'Verifying…' : 'Verify & Start'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col items-center py-4">
          <div className="w-14 h-14 bg-brand-blue/10 rounded-full flex items-center justify-center mb-3">
            <Smartphone size={24} className="text-brand-blue" />
          </div>
          <p className="text-sm text-gray-600 text-center leading-relaxed">
            An OTP has been sent to the customer's registered mobile
          </p>
          <p className="text-base font-bold text-gray-900 mt-2 font-mono tracking-widest">
            {maskPhone(phone)}
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2 text-center">Enter 6-digit OTP</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
            placeholder="• • • • • •"
            className="w-full text-center text-2xl font-mono tracking-[0.6em] px-4 py-3 border-2 border-surface-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-gray-50 placeholder-gray-300"
          />
          {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}
          <p className="text-[11px] text-gray-400 mt-2 text-center">Demo: use OTP <span className="font-mono font-bold">123456</span></p>
        </div>
      </div>
    </Modal>
  )
}

// ── HardwareAssignmentModal ───────────────────────────────────────────────────

function HardwareAssignmentModal({ isOpen, onClose, lead, onConfirm }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    deviceType: 'ONT', deviceModel: '', serialNumber: '',
    macAddress: '', condition: 'New',
    cableType: 'Fiber Optic', cableLength: '', drumNumber: '',
  })

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setForm({ deviceType: 'ONT', deviceModel: '', serialNumber: '', macAddress: '', condition: 'New', cableType: 'Fiber Optic', cableLength: '', drumNumber: '' })
    }
  }, [isOpen])

  const canNext = form.serialNumber.trim() && form.macAddress.trim()

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  const cableSummary = [form.cableType, form.cableLength ? `${form.cableLength}m` : '', form.drumNumber ? `Drum ${form.drumNumber}` : ''].filter(Boolean).join(' — ')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hardware Assignment" size="lg"
      footer={
        step === 1 ? (
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button iconRight={<ChevronRight size={14} />} onClick={() => setStep(2)} disabled={!canNext}>
              Next: Confirm
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button icon={<CheckCircle2 size={14} />} onClick={() => onConfirm(form)}>
              Confirm & Complete
            </Button>
          </>
        )
      }
    >
      {step === 1 ? (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">Assign equipment before completing installation</p>

          {/* ONT / Router section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package size={13} className="text-gray-500" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">ONT / Router</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Device Type">
                <Select value={form.deviceType} onChange={e => set('deviceType', e.target.value)}>
                  {['ONT', 'Router', 'ONU', 'Switch'].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Device Model">
                <Input value={form.deviceModel} onChange={e => set('deviceModel', e.target.value)} placeholder="e.g. Huawei HG8310M" />
              </FormField>
              <FormField label="Serial Number" required>
                <Input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} placeholder="e.g. HW2024001234" />
              </FormField>
              <FormField label="MAC Address" required>
                <Input value={form.macAddress} onChange={e => set('macAddress', e.target.value)} placeholder="e.g. 123450A1B2C3D4" />
              </FormField>
              <FormField label="Condition">
                <Select value={form.condition} onChange={e => set('condition', e.target.value)}>
                  <option>New</option>
                  <option>Refurbished</option>
                </Select>
              </FormField>
            </div>
          </div>

          {/* Wire / Cable section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={13} className="text-gray-500" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Wire / Cable</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Cable Type">
                <Select value={form.cableType} onChange={e => set('cableType', e.target.value)}>
                  {['Fiber Optic', 'CAT6', 'Coaxial'].map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Cable Length (meters)">
                <Input type="number" value={form.cableLength} onChange={e => set('cableLength', e.target.value)} placeholder="e.g. 50" />
              </FormField>
              <FormField label="Drum Number">
                <Input value={form.drumNumber} onChange={e => set('drumNumber', e.target.value)} placeholder="e.g. DR-2024-001" />
              </FormField>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gray-50 border border-surface-border rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Summary</p>
            <div className="space-y-0">
              <InfoRow label="Customer" value={lead?.name} />
              <InfoRow label="Device"   value={`${form.deviceType}${form.deviceModel ? ` — ${form.deviceModel}` : ''}`} />
              {form.serialNumber && <InfoRow label="Serial"   value={form.serialNumber} highlight />}
              {form.macAddress   && <InfoRow label="MAC"      value={form.macAddress}   highlight />}
              {form.condition    && <InfoRow label="Condition" value={form.condition} />}
              {cableSummary      && <InfoRow label="Cable"    value={cableSummary} />}
            </div>
          </div>

          {/* Warning banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-800 mb-2.5">This will:</p>
            <div className="space-y-2">
              {[
                'Link device to customer account',
                'Generate PPPoE credentials',
                'Mark lead as Won',
                'Create customer account',
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-xs text-amber-700">
                  <CheckCircle size={12} className="text-amber-600 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── PaymentModal ──────────────────────────────────────────────────────────────

function PaymentModal({ isOpen, onClose, lead, data, onPaymentConfirmed }) {
  const [paymentType, setPaymentType] = useState('received')
  const [form, setForm] = useState({ amount: '', mode: 'Cash', reference: '', sendVia: 'WhatsApp' })
  const [copied, setCopied] = useState(null)
  const [advancePaymentNotRequired, setAdvancePaymentNotRequired] = useState(false)
  const [manualUsername, setManualUsername] = useState('')
  const [manualAppPassword, setManualAppPassword] = useState('')

  useEffect(() => {
    if (isOpen) {
      setPaymentType('received')
      setForm({ amount: '', mode: 'Cash', reference: '', sendVia: 'WhatsApp' })
      setCopied(null)
      setAdvancePaymentNotRequired(false)
      setManualUsername(data?.username ?? '')
      setManualAppPassword(data?.appPassword ?? '')
    }
  }, [isOpen, data])

  const amountMissing = !advancePaymentNotRequired && !form.amount.trim()

  // Customer Type-scoped generation mode — when a type's PPPoE ID / App
  // Password config is "Manual Entry" (customerTypes.js), the agent types
  // the value in here instead of it being auto-generated.
  const customerTypeId = lead?.pipeline === 'Enterprise' ? 'corporate' : 'resident'
  const customerType = getCustomerType(customerTypeId)
  const pppoeMode = customerType?.pppoeIdConfig?.mode ?? 'auto'
  const appPasswordMode = customerType?.appPasswordConfig?.mode ?? 'auto'

  function handleCopy(text, key) {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const credentialItems = [
    { key: 'customerId', label: 'Customer ID', value: data?.customerId, editable: false },
    { key: 'plan',       label: 'Plan',        value: data?.plan,       editable: false },
    { key: 'username',   label: 'PPPoE Username', value: pppoeMode === 'manual' ? manualUsername : data?.username, editable: pppoeMode === 'manual', onChange: setManualUsername },
    { key: 'pppoePassword', label: 'PPPoE Password', value: data?.pppoePassword, editable: false },
    { key: 'appPassword', label: 'App Password', value: appPasswordMode === 'manual' ? manualAppPassword : data?.appPassword, editable: appPasswordMode === 'manual', onChange: setManualAppPassword },
  ]

  // Final values to hand back on confirm — the manually-typed value when
  // that Customer Type's mode is Manual Entry, otherwise the auto-generated
  // one already on `data`.
  const finalCredentials = {
    username: pppoeMode === 'manual' ? manualUsername : data?.username,
    appPassword: appPasswordMode === 'manual' ? manualAppPassword : data?.appPassword,
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customer Account Created" size="lg">
      <div className="space-y-5">

        {/* Account Credentials */}
        <div className="bg-navy/5 border border-navy/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wifi size={13} className="text-navy" />
            <p className="text-xs font-bold text-navy uppercase tracking-wider">Account Credentials</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {credentialItems.map(({ key, label, value, editable, onChange }) => (
              <div key={key} className="bg-white rounded-lg border border-surface-border p-3">
                <p className="text-[10px] text-gray-400 mb-1">{label}</p>
                {editable ? (
                  <input
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder={`Enter ${label}`}
                    className="w-full text-sm font-mono font-bold text-gray-900 bg-transparent border-b border-dashed border-gray-300 focus:border-brand-blue outline-none"
                  />
                ) : (
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-mono font-bold text-gray-900 truncate">{value}</p>
                    <button onClick={() => handleCopy(value ?? '', label)} className="shrink-0 text-gray-400 hover:text-brand-blue transition-colors">
                      {copied === label ? <CheckCircle size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payment Status */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={13} className="text-gray-500" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Status</p>
          </div>

          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input type="checkbox" checked={advancePaymentNotRequired}
              onChange={e => setAdvancePaymentNotRequired(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30" />
            <span className="text-sm text-gray-700">Advance Payment Not Required</span>
          </label>

          <div className="space-y-3">
            {/* Option A — Payment Received */}
            <div
              onClick={() => setPaymentType('received')}
              className={`border rounded-xl p-4 cursor-pointer transition-all ${paymentType === 'received' ? 'border-brand-blue bg-brand-blue/5' : 'border-surface-border hover:border-brand-blue/30'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${paymentType === 'received' ? 'border-brand-blue' : 'border-gray-300'}`}>
                  {paymentType === 'received' && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Payment Already Received</p>
                  <p className="text-xs text-gray-500">Customer has paid in advance</p>
                  {paymentType === 'received' && (
                    <div className="mt-3 space-y-3" onClick={e => e.stopPropagation()}>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="Amount Paid" required={!advancePaymentNotRequired}>
                          <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 3500" disabled={advancePaymentNotRequired} />
                        </FormField>
                        <FormField label="Payment Mode">
                          <Select value={form.mode} onChange={e => setForm(p => ({ ...p, mode: e.target.value }))}>
                            {['Cash', 'UPI', 'Bank Transfer', 'Cheque'].map(m => <option key={m}>{m}</option>)}
                          </Select>
                        </FormField>
                      </div>
                      <FormField label="Reference Number">
                        <Input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} placeholder="Transaction ID or Cheque no." />
                      </FormField>
                      <Button className="w-full" icon={<CheckCircle2 size={14} />} disabled={amountMissing} onClick={() => onPaymentConfirmed(advancePaymentNotRequired, finalCredentials)}>
                        Confirm Payment
                      </Button>
                      {amountMissing && (
                        <p className="text-xs text-red-500">Amount is required, or check "Advance Payment Not Required" above.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Option B — Payment Pending */}
            <div
              onClick={() => setPaymentType('pending')}
              className={`border rounded-xl p-4 cursor-pointer transition-all ${paymentType === 'pending' ? 'border-brand-blue bg-brand-blue/5' : 'border-surface-border hover:border-brand-blue/30'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${paymentType === 'pending' ? 'border-brand-blue' : 'border-gray-300'}`}>
                  {paymentType === 'pending' && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Payment Pending</p>
                  <p className="text-xs text-gray-500">Send payment request to customer</p>
                  {paymentType === 'pending' && (
                    <div className="mt-3 space-y-3" onClick={e => e.stopPropagation()}>
                      <FormField label="Amount Due" required={!advancePaymentNotRequired}>
                        <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 3500" disabled={advancePaymentNotRequired} />
                      </FormField>
                      <FormField label="Payment Link (auto-generated)">
                        <div className="flex items-center gap-2">
                          <Input value="https://pay.cityline.in/inv-001" readOnly className="bg-gray-50 text-gray-500 text-xs" />
                          <button
                            onClick={() => handleCopy('https://pay.cityline.in/inv-001', 'paylink')}
                            className="shrink-0 p-2 border border-surface-border rounded-lg text-gray-400 hover:text-brand-blue hover:border-brand-blue/40 transition-colors"
                          >
                            {copied === 'paylink' ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </FormField>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Send via</p>
                        <div className="flex gap-2">
                          {['WhatsApp', 'Email', 'SMS'].map(via => (
                            <button
                              key={via}
                              onClick={() => setForm(p => ({ ...p, sendVia: via }))}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${form.sendVia === via ? 'border-brand-blue bg-brand-blue/10 text-brand-blue' : 'border-surface-border text-gray-600 hover:border-brand-blue/40'}`}
                            >
                              {via}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button className="w-full" icon={<Send size={14} />} disabled={amountMissing} onClick={() => onPaymentConfirmed(advancePaymentNotRequired, finalCredentials)}>
                        Send Payment Request
                      </Button>
                      {amountMissing && (
                        <p className="text-xs text-red-500">Amount is required, or check "Advance Payment Not Required" above.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── ActivationSuccessModal ────────────────────────────────────────────────────

function ActivationSuccessModal({ isOpen, onClose, data }) {
  const [copied, setCopied] = useState(null)

  function handleCopy(text, key) {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Activation Complete" size="lg"
      footer={
        <div className="flex gap-3 w-full">
          <Button variant="secondary" className="flex-1" icon={<MessageSquare size={14} />}>
            Send via WhatsApp
          </Button>
          <Button variant="secondary" className="flex-1" icon={<Mail size={14} />}>
            Send via Email
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="text-center py-4">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Internet Service Activated!</h2>
          <p className="text-sm text-gray-500">The customer's internet service is now live.</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <div className="space-y-3">
            {[
              { label: 'Customer ID',    value: data?.customerId    },
              { label: 'PPPoE Username', value: data?.username      },
              { label: 'PPPoE Password', value: data?.pppoePassword },
              { label: 'App Password',   value: data?.appPassword   },
              { label: 'Plan',           value: data?.plan          },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-700">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-bold text-emerald-900">{value}</span>
                  <button onClick={() => handleCopy(value ?? '', label)} className="text-emerald-600 hover:text-emerald-800 transition-colors">
                    {copied === label ? <CheckCircle size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── VisitInstallationModal ───────────────────────────────────────────────────────
// Reuses the exact same searchable Assign-Engineer picker + Hardware-toggle pattern
// as Installations.jsx's "Assign Team" modal ("Internet Assign Team Modal"), as a
// creation flow for scheduling an installation directly from a lead. If a
// Feasibility request is already linked to this lead, its hardware list pre-fills
// here too — mirroring how Installations.jsx's own Assign Team modal pre-fills
// hardware from a linked feasibilityId.

const INST_HW_SUGGESTIONS   = ['ONT Device', 'Drop Wire', 'Splitter', 'ONU', 'Patch Cord', 'Other']
const INST_WIRE_SUGGESTIONS = ['Ethernet Cat6', 'Fiber Cable', 'Drop Wire', 'Other']
function newInstHwRow(name = '', qty = '', unit = 'pcs') { return { id: Date.now() + Math.random(), name, qty, unit } }
function newInstWireRow(name = '', qty = '', unit = 'm')  { return { id: Date.now() + Math.random(), name, qty, unit } }

function VisitInstallationModal({ isOpen, onClose, lead, linkedFeasibility, onCreated }) {
  const [form, setForm] = useState({ slotDate: '', slot: 'Morning', team: '', engineers: [], notes: '' })
  const [engSearch, setEngSearch] = useState('')
  const [hwToggle, setHwToggle] = useState(false)
  const [hwItems, setHwItems] = useState([])
  const [wireItems, setWireItems] = useState([])

  useEffect(() => {
    if (!isOpen) return
    setForm({ slotDate: '', slot: 'Morning', team: '', engineers: [], notes: '' })
    setEngSearch('')
    const preHw   = linkedFeasibility?.hwItems?.length ? linkedFeasibility.hwItems : []
    const preWire = linkedFeasibility?.wireItems?.length ? linkedFeasibility.wireItems : []
    setHwItems(preHw); setWireItems(preWire); setHwToggle(preHw.length > 0 || preWire.length > 0)
  }, [isOpen, linkedFeasibility])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function toggleEngineer(name) {
    setForm(f => ({ ...f, engineers: f.engineers.includes(name) ? f.engineers.filter(e => e !== name) : [...f.engineers, name] }))
  }
  function addHwItem()   { setHwItems(r => [...r, newInstHwRow()]) }
  function addWireItem() { setWireItems(r => [...r, newInstWireRow()]) }
  function removeHwItem(rid)   { setHwItems(r => r.filter(x => x.id !== rid)) }
  function removeWireItem(rid) { setWireItems(r => r.filter(x => x.id !== rid)) }
  function updateHwItem(rid, field, val)   { setHwItems(r => r.map(x => x.id === rid ? { ...x, [field]: val } : x)) }
  function updateWireItem(rid, field, val) { setWireItems(r => r.map(x => x.id === rid ? { ...x, [field]: val } : x)) }

  const filteredEngineers = FIELD_ENGINEERS.filter(e => e.name.toLowerCase().includes(engSearch.toLowerCase()))
  const canCreate = form.slotDate && form.engineers.length > 0

  function handleCreate() {
    const actor = lead.assigned ?? 'Arjun Kumar'
    const primaryEngineer = FIELD_ENGINEERS.find(e => e.name === form.engineers[0])
    const slotTime = form.slot === 'Morning' ? '09:00' : form.slot === 'Afternoon' ? '14:00' : '18:00'
    saveInstallation({
      id: nextInstallationId(),
      leadId: lead.id,
      feasibilityId: linkedFeasibility?.id ?? null,
      customerName: lead.name, customerPhone: lead.phone, mobile: lead.phone,
      address: lead.address ?? '', area: lead.area ?? '', locality: lead.locality ?? lead.area ?? '',
      city: lead.city ?? '', pincode: lead.pincode ?? '',
      plan: lead.plan ?? '',
      slotDate: form.slotDate, slotTime, slot: form.slot,
      assignedTeam: form.team,
      engineerId: primaryEngineer?.id ?? '',
      engineerName: form.engineers.join(', '),
      branch: lead.branchCode ?? '',
      createdBy: actor,
      priority: lead.priority ? lead.priority[0].toUpperCase() + lead.priority.slice(1) : 'Medium',
      status: 'Assigned',
      hardwareRequired: hwToggle,
      hardware: hwToggle ? hwItems.map(r => ({ name: r.name, qty: r.qty })) : [],
      wireRequired: hwToggle,
      wires: hwToggle ? wireItems.map(r => ({ name: r.name, qty: r.qty })) : [],
      notes: form.notes,
      createdAt: TODAY,
      timeline: [
        { status: 'Scheduled', date: TODAY, by: actor, note: `Installation scheduled from lead ${lead.id}` },
        { status: 'Assigned', date: TODAY, by: actor, note: `Assigned to ${form.engineers.join(', ')}` },
      ],
    })
    onCreated()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Visit Installation — ${lead?.name ?? ''}`} size="md"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleCreate} disabled={!canCreate}>Schedule Installation</Button>
      </>}
    >
      <div className="space-y-4">
        <FormField label="Installation Date" required>
          <Input type="date" value={form.slotDate} onChange={e => set('slotDate', e.target.value)} />
        </FormField>

        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Slot</p>
          <div className="flex gap-3">
            {['Morning', 'Afternoon', 'Evening'].map(s => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="lead-inst-slot" value={s} checked={form.slot === s}
                  onChange={() => set('slot', s)} className="w-4 h-4 text-brand-blue focus:ring-brand-blue/30" />
                <span className="text-sm text-gray-700">{s}</span>
              </label>
            ))}
          </div>
        </div>

        <FormField label="Team">
          <Select value={form.team} onChange={e => set('team', e.target.value)}>
            <option value="">Select…</option>
            {INSTALLATION_TEAMS.map(t => <option key={t}>{t}</option>)}
          </Select>
        </FormField>

        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Engineers <span className="text-red-500">*</span></p>
          {form.engineers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.engineers.map(name => (
                <span key={name} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium">
                  {name}
                  <button type="button" onClick={() => toggleEngineer(name)}
                    className="text-brand-blue/60 hover:text-brand-blue transition-colors leading-none">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="relative mb-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input value={engSearch} onChange={e => setEngSearch(e.target.value)} placeholder="Search engineer..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400 text-gray-800" />
          </div>
          <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden max-h-[160px] overflow-y-auto">
            {filteredEngineers.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No engineers found</p>
            ) : filteredEngineers.map(eng => {
              const selected = form.engineers.includes(eng.name)
              return (
                <label key={eng.id}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={selected} onChange={() => toggleEngineer(eng.name)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30" />
                  <div className={`w-6 h-6 rounded-full ${eng.color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
                    {eng.initials}
                  </div>
                  <span className="text-sm text-gray-700">{eng.name}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="border border-surface-border rounded-xl overflow-hidden">
          <button type="button" onClick={() => setHwToggle(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2">
              <Wrench size={14} className="text-gray-500" />
              Add Hardware Requirements
            </div>
            <div className={`w-9 h-5 rounded-full transition-colors relative ${hwToggle ? 'bg-brand-blue' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${hwToggle ? 'left-4' : 'left-0.5'}`} />
            </div>
          </button>
          {hwToggle && (
            <div className="px-4 pb-4 pt-1 border-t border-surface-border space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2 pt-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hardware Items</p>
                  <button type="button" onClick={addHwItem}
                    className="flex items-center gap-1 text-xs font-medium text-brand-blue hover:text-blue-700 transition-colors">
                    <Plus size={12} /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_64px_64px_28px] gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1">
                    <span>Item Name</span><span>QTY</span><span>Unit</span><span />
                  </div>
                  {hwItems.map(row => (
                    <div key={row.id} className="grid grid-cols-[1fr_64px_64px_28px] gap-2 items-center">
                      <input value={row.name} onChange={e => updateHwItem(row.id, 'name', e.target.value)}
                        placeholder="e.g. ONT Device" list="lead-inst-hw-suggestions"
                        className="px-2.5 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-800" />
                      <input type="number" min="0" value={row.qty} onChange={e => updateHwItem(row.id, 'qty', e.target.value)}
                        placeholder="0"
                        className="px-2 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-800 text-center" />
                      <input value={row.unit} onChange={e => updateHwItem(row.id, 'unit', e.target.value)}
                        placeholder="pcs"
                        className="px-2 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-800 text-center" />
                      <button type="button" onClick={() => removeHwItem(row.id)}
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {hwItems.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2 border-2 border-dashed border-gray-200 rounded-lg">No items added</p>
                  )}
                </div>
                <datalist id="lead-inst-hw-suggestions">
                  {INST_HW_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Wire / Cable</p>
                  <button type="button" onClick={addWireItem}
                    className="flex items-center gap-1 text-xs font-medium text-brand-blue hover:text-blue-700 transition-colors">
                    <Plus size={12} /> Add Wire
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_64px_64px_28px] gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1">
                    <span>Cable Name</span><span>QTY</span><span>Unit</span><span />
                  </div>
                  {wireItems.map(row => (
                    <div key={row.id} className="grid grid-cols-[1fr_64px_64px_28px] gap-2 items-center">
                      <input value={row.name} onChange={e => updateWireItem(row.id, 'name', e.target.value)}
                        placeholder="e.g. Ethernet Cat6" list="lead-inst-wire-suggestions"
                        className="px-2.5 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-800" />
                      <input type="number" min="0" value={row.qty} onChange={e => updateWireItem(row.id, 'qty', e.target.value)}
                        placeholder="0"
                        className="px-2 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-800 text-center" />
                      <input value={row.unit} onChange={e => updateWireItem(row.id, 'unit', e.target.value)}
                        placeholder="m"
                        className="px-2 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-800 text-center" />
                      <button type="button" onClick={() => removeWireItem(row.id)}
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {wireItems.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2 border-2 border-dashed border-gray-200 rounded-lg">No wires added</p>
                  )}
                </div>
                <datalist id="lead-inst-wire-suggestions">
                  {INST_WIRE_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
            </div>
          )}
        </div>

        <FormField label="Notes">
          <Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes for the engineers…" />
        </FormField>
      </div>
    </Modal>
  )
}

// ── SetFollowupModal ──────────────────────────────────────────────────────────

function SetFollowupModal({ isOpen, onClose, lead, onSave }) {
  const [form, setForm] = useState({ date: '', time: '10:00', note: '', notifyTo: [] })
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function toggleNotify(name) {
    setForm(p => ({ ...p, notifyTo: p.notifyTo.includes(name) ? p.notifyTo.filter(n => n !== name) : [...p.notifyTo, name] }))
  }

  function handleSave() {
    if (!form.date) return
    onSave({ id: `FU-${Date.now()}`, leadId: lead.id, leadName: lead.name, phone: lead.phone, date: form.date, time: form.time, note: form.note, stage: lead.stage, assignedTo: lead.assigned, notifyTo: form.notifyTo, priority: lead.priority ?? 'medium', status: 'Pending' })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Set Follow-up — ${lead?.name}`} size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={<Bell size={14} />} onClick={handleSave} disabled={!form.date}>Set Follow-up</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-surface-border">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${lead?.assignedColor ?? 'bg-gray-400'}`}>
            {lead?.assignedInitials ?? '??'}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">{lead?.name}</p>
            <p className="text-xs text-gray-500">{lead?.stage} · {lead?.phone}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Follow-up Date" required>
            <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </FormField>
          <FormField label="Time">
            <Input type="time" value={form.time} onChange={e => set('time', e.target.value)} />
          </FormField>
        </div>
        <FormField label="Note">
          <Textarea value={form.note} onChange={e => set('note', e.target.value)} placeholder="Context for this follow-up…" rows={3} />
        </FormField>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Notify To</p>
          <div className="flex flex-wrap gap-2">
            {STAFF.slice(0, 4).map(s => (
              <button key={s.name} type="button" onClick={() => toggleNotify(s.name)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  form.notifyTo.includes(s.name) ? 'border-brand-blue bg-brand-blue/10 text-brand-blue' : 'border-surface-border bg-white text-gray-600 hover:border-brand-blue/40'
                }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${s.color}`}>{s.initials}</div>
                {s.name}
                {form.notifyTo.includes(s.name) && <CheckCircle2 size={12} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── WonConversionModal ────────────────────────────────────────────────────────

function WonConversionModal({ isOpen, onClose, lead, onConfirm }) {
  const [loading, setLoading] = useState(false)

  function handleConfirm() {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      const docs = lead?.kycDocs ?? {}
      const kycComplete = ['aadhaar', 'panCard', 'customerPhoto'].every(k => docs[k])
      const customer = buildCustomerFromLead(lead)
      addCustomer(customer)
      onConfirm({
        customerName: customer.name,
        customerId:   customer.id,
        ticketId:     `TK-${2880 + Math.floor(Math.random() * 50)}`,
        kycStatus:    kycComplete ? 'Completed' : 'Pending',
      })
    }, 1400)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mark as Won?" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            icon={loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Converting…' : 'Confirm & Convert'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 font-medium">This will automatically:</p>
        <div className="space-y-2.5">
          {['Create customer record', 'Trigger CAF form', 'Check KYC status', 'Create installation ticket'].map(item => (
            <div key={item} className="flex items-center gap-3 text-sm text-gray-700">
              <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle size={12} className="text-emerald-600" />
              </div>
              {item}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function WonSuccessModal({ isOpen, onClose, lead, data }) {
  const navigate = useNavigate()
  const cards = [
    { title: 'Customer Created',    desc: `${data?.customerName ?? ''} — ${data?.customerId ?? ''}`,   action: 'View Customer', bg: 'bg-blue-50 border-blue-200'    },
    { title: 'CAF Form',            desc: 'Ready to fill',                                              action: 'Open CAF',      bg: 'bg-purple-50 border-purple-200' },
    { title: 'KYC Status',          desc: data?.kycStatus === 'Completed' ? 'Completed ✅' : 'Pending ⚠️', action: data?.kycStatus === 'Completed' ? 'View KYC' : 'Complete KYC', bg: data?.kycStatus === 'Completed' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200' },
    { title: 'Installation Ticket', desc: `#${data?.ticketId ?? ''} Created`,                           action: 'View Ticket',   bg: 'bg-orange-50 border-orange-200' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Conversion Complete" size="lg"
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <div className="text-center py-3 mb-5 border-b border-surface-border">
        <div className="text-4xl mb-2">🎉</div>
        <h2 className="text-lg font-bold text-gray-900">Lead Converted Successfully!</h2>
        <p className="text-sm text-gray-500 mt-1">{lead?.name} has been marked as Won and a customer record created.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map(card => (
          <div key={card.title} className={`border rounded-xl p-4 ${card.bg}`}>
            <p className="font-semibold text-sm text-gray-900 mb-1">{card.title}</p>
            <p className="text-xs text-gray-600 mb-3 break-words">{card.desc}</p>
            <Button
              variant="secondary" size="sm" className="w-full"
              onClick={card.title === 'Customer Created' ? () => navigate(`/customers/${data?.customerId}/profile`) : undefined}
            >
              {card.action}
            </Button>
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ── InfoRow helper ────────────────────────────────────────────────────────────

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 shrink-0 w-36">{label}</span>
      <span className={`text-xs font-medium text-right ${highlight ? 'text-brand-blue' : 'text-gray-800'}`}>
        {value || <span className="text-gray-300">—</span>}
      </span>
    </div>
  )
}

// Grid-cell variant of InfoRow — label above value instead of side-by-side —
// used by the Overview tab's Basic/Customer/Address Details cards' 2-col grid.
function InfoCell({ label, value, highlight, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xs font-medium mt-1 ${highlight ? 'text-brand-blue' : 'text-gray-800'}`}>
        {value || <span className="text-gray-300 font-normal">—</span>}
      </p>
    </div>
  )
}

// Overview cards' collapse/expand toggle — sits in CardHeader's action slot.
function CardCollapseToggle({ collapsed, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="text-gray-400 hover:text-gray-600 transition-colors"
      title={collapsed ? 'Expand' : 'Collapse'}>
      <ChevronDown size={16} className={`transition-transform ${collapsed ? '' : 'rotate-180'}`} />
    </button>
  )
}

// Left sidebar's compact key-value field — label above value (as opposed to
// InfoRow's side-by-side layout), matching Customer Detail page's InfoField.
function SidebarField({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 font-bold mt-0.5">{value || <span className="text-gray-300 font-medium">—</span>}</p>
    </div>
  )
}

// ── ReopenModal ───────────────────────────────────────────────────────────────

function ReopenModal({ isOpen, onClose, lead, firstStage, onConfirm }) {
  const [loading, setLoading] = useState(false)

  function handleConfirm() {
    setLoading(true)
    setTimeout(() => { setLoading(false); onConfirm() }, 500)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reopen this lead?" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            icon={loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Reopening…' : 'Reopen Lead'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Lead will be moved back to <strong>{firstStage}</strong> and marked as <strong>Open</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{lead?.name}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">{lead?.stage}</span>
        </div>
      </div>
    </Modal>
  )
}

// ── EkycModal ──────────────────────────────────────────────────────────────────
// The "Send eKYC" popup opened from the right sidebar's eKYC Verification card —
// carries the exact same send/verify + check-existing flow that used to live on
// its own eKYC tab, just presented in a modal instead of a page.

function EkycModal({
  isOpen, onClose, leadName,
  identifier, onIdentifierChange,
  status, sentAt, verifiedAt, docType, docNumberMasked,
  onSend, onMarkVerified,
  checkResult, onCheckExisting, onReuseVerification,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`eKYC Verification — ${leadName}`}
      size="md"
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="space-y-5">
        <div>
          <FormField label="Mobile Number or Email">
            <Input
              value={identifier}
              onChange={e => onIdentifierChange(e.target.value)}
              placeholder="e.g. 9876001122 or name@email.com"
              disabled={status !== 'Not Started'}
            />
          </FormField>

          <div className="flex items-center gap-2 mt-3 mb-4">
            <span className="text-xs font-medium text-gray-500">Status:</span>
            <Badge variant={EKYC_TAB_STATUS_BADGE[status] ?? 'gray'} size="sm">{status}</Badge>
            {status === 'Link Sent' && sentAt && (
              <span className="text-[11px] text-gray-400">sent {formatEkycTimestamp(sentAt)}</span>
            )}
            {status === 'Verified' && verifiedAt && (
              <span className="text-[11px] text-gray-400">verified {formatEkycTimestamp(verifiedAt)}</span>
            )}
          </div>

          {status === 'Not Started' && (
            <Button className="w-full" icon={<Send size={14} />} disabled={!identifier.trim()} onClick={onSend}>
              Send to eKYC
            </Button>
          )}

          {status === 'Link Sent' && (
            <Button className="w-full" icon={<CheckCircle2 size={14} />} onClick={onMarkVerified}>
              Mark as Verified
            </Button>
          )}

          {status === 'Verified' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                <CheckCircle size={13} /> Document Fetched
              </div>
              <p className="text-xs text-gray-600">
                Document Type: <span className="font-semibold text-gray-800">{docType ?? 'Aadhaar'}</span>
              </p>
              <p className="text-xs text-gray-600">
                Document Number: <span className="font-mono font-semibold text-gray-800">{docNumberMasked ?? 'XXXX-XXXX-1234'}</span>
              </p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-surface-border">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Check Existing eKYC</p>
          <p className="text-xs text-gray-500 mb-3">
            Look up whether this mobile number or email already has a verified eKYC record on file from a previous verification.
          </p>
          <Button variant="secondary" className="w-full" icon={<Search size={14} />} disabled={!identifier.trim()} onClick={onCheckExisting}>
            Check Existing eKYC
          </Button>

          {checkResult && (
            <div className="mt-3">
              {checkResult.found ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-emerald-700">
                    Existing Verification Found — Verified on {formatEkycTimestamp(checkResult.record.verifiedAt)}, Document: {checkResult.record.docType} {checkResult.record.docNumberMasked}
                  </p>
                  <Button size="sm" className="w-full" icon={<CheckCircle2 size={13} />} onClick={onReuseVerification}>
                    Reuse This Verification
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-gray-500">No existing verification found for this identifier.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Package components ────────────────────────────────────────────────────────

const APPROVAL_CHIP = {
  'Not Sent': 'bg-gray-100 text-gray-500',
  'Pending':  'bg-amber-100 text-amber-700',
  'Approved': 'bg-emerald-100 text-emerald-700',
  'Rejected': 'bg-red-100 text-red-600',
}
const APPROVAL_LABEL = {
  'Not Sent': 'Not Sent',
  'Pending':  'Pending ⏳',
  'Approved': 'Approved ✅',
  'Rejected': 'Rejected ❌',
}

const APPROVER_OPTIONS = ['Regional Manager', 'Zonal Manager', 'Director', 'Admin']

// Bound/add-on packages included with the plan itself — the OTT bundle row (if any)
// plus whatever's modeled on the package (e.g. Installation Charge).
function boundPackagesOf(plan) {
  return [
    ...(plan.ottName ? [{ name: plan.ottName, code: 'OTT_BUNDLE', price: 0 }] : []),
    ...(plan.boundPackages ?? []),
  ]
}

function ResidentialPackageCard({ plan, pkg, editPrice, customPriceVal, onToggleEditPrice, onCustomPriceChange, onSave, onRemove, customerType }) {
  const displayPrice = editPrice && customPriceVal !== ''
    ? (parseFloat(customPriceVal) || plan.price)
    : (pkg.customPrice ?? plan.price)

  const boundPackages = boundPackagesOf(plan)
  const boundPackagesTotal = boundPackages.reduce((sum, bp) => sum + (Number(bp.price) || 0), 0)
  // No separate first-invoice/due-amount calculation exists elsewhere yet —
  // both are base price + bound package charges, per the same formula.
  const firstInvoiceAmount = displayPrice + boundPackagesTotal
  const dueAmount = firstInvoiceAmount
  const tenureLabel = plan.tenure ? plan.tenure.toUpperCase() : (plan.validity ? `${plan.validity} DAYS` : 'ONE-TIME')

  return (
    <div className="bg-white border border-surface-border rounded-xl shadow-card overflow-hidden">
      <div className="p-4 space-y-4">

        {/* Package row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={SERVICE_BADGE[plan.serviceType] || 'gray'} size="sm" className="uppercase tracking-wide">
                {plan.serviceType}
              </Badge>
              <p className="text-base font-bold text-gray-900 leading-snug">{plan.name}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Code: <span className="font-medium text-gray-700">{plan.code ?? '—'}</span>
              <span className="mx-1.5 text-gray-300">|</span>
              Speed: <span className="font-medium text-gray-700">{plan.speed ?? '—'}</span>
              <span className="mx-1.5 text-gray-300">|</span>
              Radius ID: <span className="font-medium text-gray-700">{plan.radiusId ?? '—'}</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-gray-900">
              ₹{displayPrice.toLocaleString('en-IN')}
              {pkg.customPrice && !editPrice && (
                <span className="ml-1 text-[10px] text-amber-600 font-normal align-top">(custom)</span>
              )}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">PER {tenureLabel}</p>
          </div>
        </div>

        {/* Included bound packages */}
        {boundPackages.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Included Bound Packages</p>
            <div className="space-y-1.5">
              {boundPackages.map((bp, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-800">
                    <span className="font-medium">{bp.name}</span>{' '}
                    <span className="text-gray-400 text-xs">({bp.code})</span>
                  </span>
                  <span className="font-semibold text-gray-800">
                    {bp.price > 0 ? `₹${Number(bp.price).toLocaleString('en-IN')}` : 'Included'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer row */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <Badge variant={plan.staticIp ? 'green' : 'gray'} size="sm">Static IP: {plan.staticIp ? 'Yes' : 'No'}</Badge>
            <Badge variant={plan.landline ? 'green' : 'gray'} size="sm">Landline: {plan.landline ? 'Yes' : 'No'}</Badge>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-brand-blue">FIRST INVOICE: ₹{firstInvoiceAmount.toLocaleString('en-IN')}</p>
            {/* Due Amount moved to the Payment section's header for Enterprise
                (see the Package tab's "Payment" card) — kept here for Residential/Custom. */}
            {customerType !== 'Enterprise' && (
              <p className="text-xs font-semibold text-red-500 mt-0.5">DUE AMOUNT: ₹{dueAmount.toLocaleString('en-IN')}</p>
            )}
          </div>
        </div>

        {/*
          USE CUSTOM PRICE / REMOVE PACKAGE — commented out per request. Previously
          shown for any customerType !== 'Residential' (i.e. Enterprise); now hidden
          for every customer type, same treatment as the Add-ons section above.
          Uncomment and re-add a customerType condition here to re-enable for a
          future customer type.

        <div className="pt-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Use Custom Price</span>
            <button type="button" onClick={onToggleEditPrice}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${editPrice ? 'bg-brand-blue' : 'bg-gray-300'}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${editPrice ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {editPrice && (
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
                <input type="number" min="0" value={customPriceVal}
                  onChange={e => onCustomPriceChange(e.target.value)}
                  placeholder={String(plan.price)}
                  className="w-full pl-7 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue" />
              </div>
              <button type="button" onClick={onSave}
                className="w-full py-2 text-sm font-semibold bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors">
                Save
              </button>
            </div>
          )}
          {onRemove && (
            <button type="button" onClick={onRemove}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
              <XCircle size={11} /> Remove Package
            </button>
          )}
        </div>
        */}
      </div>
    </div>
  )
}

function EnterprisePackageCard({ plan, pkg, editPrice, customPriceVal, onToggleEditPrice, onCustomPriceChange, onChange, onSave, onSendApproval, approverVal, onApproverChange }) {
  const displayPrice = editPrice && customPriceVal !== ''
    ? (parseFloat(customPriceVal) || plan.price)
    : (pkg.customPrice ?? plan.price)
  const status = pkg.approvalStatus
  const canSendApproval = !editPrice || customPriceVal.trim() !== ''

  return (
    <div className="bg-white border border-surface-border rounded-xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-3 border-b border-surface-border">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{plan.name}</p>
          <button type="button" onClick={onChange}
            className="flex items-center gap-1 text-xs text-brand-blue hover:text-blue-700 font-medium shrink-0 transition-colors">
            <Edit3 size={11} /> Change
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={SERVICE_BADGE[plan.serviceType] || 'gray'} size="sm">{plan.serviceType}</Badge>
          <Badge variant="gray" size="sm">{plan.billingType}</Badge>
          <Badge variant="gray" size="sm">{plan.server}</Badge>
          {plan.packageType === 'Private' && <Badge variant="navy" size="sm">Private</Badge>}
          {plan.offer && <Badge variant="orange" size="sm">Offer</Badge>}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Speed</span>
          <span className="font-medium text-gray-800">{plan.speed}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Validity</span>
          <span className="font-medium text-gray-800">{plan.validity ? `${plan.validity} days` : 'One-time'}</span>
        </div>
        {plan.ottBundle && (
          <div className="flex items-center gap-1.5 text-xs text-purple-700 font-medium bg-purple-50 rounded-lg px-2.5 py-1.5">
            <span>📺</span> OTT Bundle Included
          </div>
        )}

        {/* Price + custom price toggle */}
        <div className="pt-1.5 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Price</span>
            <span className="font-bold text-gray-900">
              ₹{displayPrice.toLocaleString('en-IN')}
              {pkg.customPrice && !editPrice && (
                <span className="ml-1 text-[10px] text-amber-600 font-normal">(custom)</span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Use Custom Price</span>
            <button type="button" onClick={onToggleEditPrice}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${editPrice ? 'bg-brand-blue' : 'bg-gray-300'}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${editPrice ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {editPrice && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
              <input type="number" min="0" value={customPriceVal}
                onChange={e => onCustomPriceChange(e.target.value)}
                placeholder={String(plan.price)}
                className="w-full pl-7 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue" />
            </div>
          )}
        </div>

        {/* Approval status */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <span className="text-xs text-gray-500">Approval Status</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${APPROVAL_CHIP[status] ?? 'bg-gray-100 text-gray-500'}`}>
            {APPROVAL_LABEL[status] ?? status}
          </span>
        </div>

        {/* Approver selector (editable before send, read-only after) */}
        {status === 'Not Sent' ? (
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <span className="text-xs text-gray-500 shrink-0">Approver</span>
            <select
              value={approverVal}
              onChange={e => onApproverChange(e.target.value)}
              className="text-xs border border-surface-border rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue/30 font-medium text-gray-700"
            >
              {APPROVER_OPTIONS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
        ) : (
          pkg.approver && (
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <span className="text-xs text-gray-500 shrink-0">Approver</span>
              <span className="text-xs font-medium text-gray-700">{pkg.approver}</span>
            </div>
          )
        )}

        {/* Action */}
        <div className="pt-0.5">
          {editPrice ? (
            <button type="button" disabled={!canSendApproval} onClick={onSendApproval}
              className="w-full py-2 text-sm font-semibold bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              Save & Send for Approval
            </button>
          ) : (
            <button type="button" onClick={onSave}
              className="w-full py-2 text-sm font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Save
            </button>
          )}
        </div>

        {/* Approval details */}
        {status !== 'Not Sent' && (
          <div className="pt-2 border-t border-gray-100 space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Approval Details</p>
            {pkg.requestedBy && (
              <div className="flex items-center justify-between text-xs gap-3">
                <span className="text-gray-500 shrink-0">Requested by</span>
                <span className="font-medium text-gray-700 text-right">{pkg.requestedBy}{pkg.requestedAt ? ` · ${pkg.requestedAt}` : ''}</span>
              </div>
            )}
            {pkg.resolvedBy && (
              <div className="flex items-center justify-between text-xs gap-3">
                <span className="text-gray-500 shrink-0">{status === 'Approved' ? 'Approved by' : 'Rejected by'}</span>
                <span className="font-medium text-gray-700 text-right">{pkg.resolvedBy}{pkg.resolvedAt ? ` · ${pkg.resolvedAt}` : ''}</span>
              </div>
            )}
            {pkg.notes && (
              <div className="flex items-start justify-between text-xs gap-3">
                <span className="text-gray-500 shrink-0">Notes</span>
                <span className="font-medium text-gray-700 text-right">{pkg.notes}</span>
              </div>
            )}
            {status === 'Rejected' && pkg.rejectionReason && (
              <div className="mt-1 rounded-lg bg-red-50 border border-red-200 px-3 py-2 space-y-0.5">
                <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Rejection Reason</p>
                <p className="text-xs text-red-700 font-medium">{pkg.rejectionReason}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PackageSelectModal({ isOpen, onClose, onSelect, title }) {
  const [search, setSearch] = useState('')
  const [filterBilling, setFilterBilling] = useState('')

  useEffect(() => {
    if (isOpen) { setSearch(''); setFilterBilling('') }
  }, [isOpen])

  // Only Bandwidth-type plans are selectable here — this modal is used
  // exclusively for the lead's Bandwidth Package assignment.
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return MOCK_PLANS.filter(p => {
      if (p.status !== 'Active') return false
      if (p.serviceType !== 'Bandwidth') return false
      const matchSearch = !q || p.name.toLowerCase().includes(q)
      const matchBilling = !filterBilling || p.billingType === filterBilling
      return matchSearch && matchBilling
    })
  }, [search, filterBilling])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title ?? 'Select Package'} size="xl">
      {/* Filters */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Search plans..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white w-full focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={filterBilling} onChange={e => setFilterBilling(e.target.value)}
            className="px-3 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-700">
            <option value="">All Billing Types</option>
            {BILLING_TYPES.map(b => <option key={b}>{b}</option>)}
          </select>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} plan{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Package size={24} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">No plans found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto pr-0.5">
          {filtered.map(plan => (
            <div key={plan.id} className="bg-white border border-surface-border rounded-xl p-4 hover:border-brand-blue/40 hover:shadow-sm transition-all flex flex-col">
              <div className="mb-2">
                <p className="text-sm font-semibold text-gray-900 mb-1.5 leading-snug">{plan.name}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={SERVICE_BADGE[plan.serviceType] || 'gray'} size="sm">{plan.serviceType}</Badge>
                  {plan.packageType === 'Private' && <Badge variant="navy" size="sm">Private</Badge>}
                  {plan.offer && <Badge variant="orange" size="sm">Offer</Badge>}
                </div>
              </div>
              <div className="space-y-1 mb-3 text-xs flex-1">
                <div className="flex justify-between"><span className="text-gray-400">Speed</span><span className="font-medium text-gray-700">{plan.speed}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Validity</span><span className="font-medium text-gray-700">{plan.validity ? `${plan.validity} days` : 'One-time'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Billing</span><span className="font-medium text-gray-700">{plan.billingType}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Server</span><span className="font-medium text-gray-700">{plan.server}</span></div>
              </div>
              {plan.ottBundle && (
                <div className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 rounded px-2 py-1 mb-3">
                  <span>📺</span> OTT Bundle
                </div>
              )}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                <p className="text-base font-bold text-gray-900">₹{plan.price.toLocaleString('en-IN')}</p>
                <button type="button" onClick={() => onSelect(plan)}
                  className="px-3 py-1.5 text-xs font-semibold bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Select
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ── AddonSelectModal ───────────────────────────────────────────────────────────

function AddonSelectModal({ isOpen, onClose, addons, selectedIds, onSelect }) {
  const available = addons.filter(a => !selectedIds.includes(a.id))
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Add-on" size="sm">
      {available.length === 0 ? (
        <div className="text-center py-10">
          <Package size={22} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">All available add-ons have been added</p>
        </div>
      ) : (
        <div className="space-y-2">
          {available.map(addon => (
            <div key={addon.id} className="flex items-center justify-between px-4 py-3 border border-surface-border rounded-lg hover:border-brand-blue/40 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-800">{addon.name}</p>
                <p className="text-xs text-gray-500">₹{addon.price.toLocaleString('en-IN')}/month</p>
              </div>
              <button type="button" onClick={() => onSelect(addon)}
                className="px-3 py-1.5 text-xs font-semibold bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors">
                + Add
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ── Quotation components ──────────────────────────────────────────────────────

const QUOTATION_COMPANIES = [
  'Technosoft Solutions Pvt Ltd',
  'Bizoutlet India Ltd',
  'RapidNet Enterprises',
  'Cloudify Systems',
]
const QUOTATION_TEMPLATES = [
  'Standard Quotation Template',
  'Enterprise Quotation Template',
  'Custom Quotation Template',
]

function QuotationPreviewModal({ isOpen, onClose, lead, formData, onSend }) {
  const today = new Date().toISOString().split('T')[0]
  const validTill = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const ref = String(Date.now()).slice(-6)

  const pkgRows = [
    lead?.bandwidthPackage ? { slot: 'Bandwidth', pkg: lead.bandwidthPackage } : null,
  ].filter(Boolean)

  const total = pkgRows.reduce((s, { pkg }) => {
    const plan = MOCK_PLANS.find(p => p.id === pkg.packageId)
    return s + (pkg.customPrice ?? plan?.price ?? 0)
  }, 0)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quotation Preview" size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button icon={<Send size={14} />} onClick={onSend}>Send Now</Button>
        </>
      }
    >
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden text-sm">
        {/* Letterhead bar */}
        <div className="h-1.5 bg-gradient-to-r from-navy via-brand-blue to-brand-orange" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-base font-black text-navy tracking-tight">CITYLINE</p>
            <p className="text-xs text-gray-400">Internet Service Provider</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-800">QUOTATION</p>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">QT-{lead?.id}-{ref}</p>
          </div>
        </div>

        {/* Meta */}
        <div className="px-6 py-4 border-b border-gray-100 grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <span className="text-gray-400 w-16 shrink-0">To</span>
              <span className="font-semibold text-gray-800">{formData?.company || '—'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 w-16 shrink-0">Lead ID</span>
              <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{lead?.id}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 w-16 shrink-0">Contact</span>
              <span className="text-gray-700">{lead?.name}</span>
            </div>
          </div>
          <div className="text-right space-y-1.5">
            <div>
              <p className="text-gray-400 text-xs">Date</p>
              <p className="font-semibold text-gray-800">{today}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Valid till</p>
              <p className="font-semibold text-brand-blue">{validTill}</p>
            </div>
          </div>
        </div>

        {/* Package rows */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Package Details</p>
          <div className="divide-y divide-gray-100">
            {pkgRows.map(({ slot, pkg }) => {
              const plan = MOCK_PLANS.find(p => p.id === pkg.packageId)
              if (!plan) return null
              const price = pkg.customPrice ?? plan.price
              return (
                <div key={slot} className="flex items-start justify-between py-2.5">
                  <div>
                    <p className="font-semibold text-gray-800">{plan.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{plan.serviceType} · {plan.speed} · {plan.billingType} · {slot} Package</p>
                    {plan.ottBundle && <p className="text-xs text-purple-600 mt-0.5">📺 OTT Bundle Included</p>}
                  </div>
                  <p className="font-bold text-gray-900 shrink-0 ml-4">₹{price.toLocaleString('en-IN')}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Total */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-600">Total</span>
          <span className="text-xl font-black text-gray-900">₹{total.toLocaleString('en-IN')}</span>
        </div>

        {/* Notes + meta footer */}
        {formData?.notes && (
          <div className="px-6 py-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-gray-600">{formData.notes}</p>
          </div>
        )}
        <div className="px-6 py-2.5 border-t border-gray-100 bg-gray-50/60">
          <p className="text-xs text-gray-400">
            Template: {formData?.template} · Send to: {formData?.notifierEmail}
          </p>
        </div>
      </div>
    </Modal>
  )
}

function SendQuotationModal({ isOpen, onClose, lead, onSend }) {
  const [form, setForm] = useState({
    company: '',
    template: 'Enterprise Quotation Template',
    notifierEmail: '',
    notes: '',
  })
  const [errors, setErrors] = useState({})
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm({
        company: lead?.companyName && QUOTATION_COMPANIES.includes(lead.companyName)
          ? lead.companyName
          : QUOTATION_COMPANIES[0],
        template: 'Enterprise Quotation Template',
        notifierEmail: lead?.email || '',
        notes: '',
      })
      setErrors({})
      setPreviewOpen(false)
    }
  }, [isOpen])

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function validate() {
    const e = {}
    if (!form.company)                        e.company       = 'Company is required'
    if (!form.template)                       e.template      = 'Template is required'
    if (!form.notifierEmail.trim())           e.notifierEmail = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.notifierEmail))
                                              e.notifierEmail = 'Invalid email format'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const pkgRows = [
    lead?.bandwidthPackage ? { slot: 'Bandwidth', pkg: lead.bandwidthPackage } : null,
  ].filter(Boolean)

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Send Quotation" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="secondary" onClick={() => { if (validate()) setPreviewOpen(true) }}>
              Preview Quotation
            </Button>
            <Button icon={<Send size={14} />} onClick={() => { if (validate()) onSend(form) }}>
              Send Quotation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 -mt-1 mb-1">Generate and send a quotation to the customer.</p>

          {/* Company */}
          <FormField label="Company" required error={errors.company}>
            <Select value={form.company} onChange={e => setField('company', e.target.value)}>
              {QUOTATION_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormField>

          {/* Template */}
          <FormField label="Template" required error={errors.template}>
            <Select value={form.template} onChange={e => setField('template', e.target.value)}>
              {QUOTATION_TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FormField>

          {/* Notifier Email */}
          <FormField label="Notifier Email" required error={errors.notifierEmail}>
            <Input type="email" placeholder="recipient@company.com"
              value={form.notifierEmail} onChange={e => setField('notifierEmail', e.target.value)} />
          </FormField>

          {/* Package Summary */}
          {pkgRows.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Package Summary</p>
              <div className="space-y-2">
                {pkgRows.map(({ slot, pkg }) => {
                  const plan = MOCK_PLANS.find(p => p.id === pkg.packageId)
                  if (!plan) return null
                  const price = pkg.customPrice ?? plan.price
                  return (
                    <div key={slot} className="flex items-center justify-between p-3 bg-gray-50 border border-surface-border rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{plan.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{plan.speed} · {slot} Package</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">₹{price.toLocaleString('en-IN')}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${APPROVAL_CHIP[pkg.approvalStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                          {APPROVAL_LABEL[pkg.approvalStatus] ?? pkg.approvalStatus}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <FormField label="Notes">
            <Textarea placeholder="Additional notes for the quotation..." rows={3}
              value={form.notes} onChange={e => setField('notes', e.target.value)} />
          </FormField>
        </div>
      </Modal>

      <QuotationPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        lead={lead}
        formData={form}
        onSend={() => { setPreviewOpen(false); onSend(form) }}
      />
    </>
  )
}

// PROFORMA INVOICE — disabled per request (Package tab). This whole component
// is unused while disabled. Uncomment to re-enable.
// // ── ProformaInvoicePreviewModal ────────────────────────────────────────────────
// // Read-only snapshot viewer for a single PI history entry. Separate from
// // QuotationPreviewModal on purpose — quotations and PIs are distinct concepts.
//
// function ProformaInvoicePreviewModal({ isOpen, onClose, lead, pi }) {
//   if (!pi) return null
//   const effectivePrice = pi.customPrice ?? pi.basePrice
//
//   return (
//     <Modal isOpen={isOpen} onClose={onClose} title="Proforma Invoice" size="lg"
//       footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
//     >
//       <div className="bg-white border border-gray-200 rounded-xl overflow-hidden text-sm">
//         {/* Letterhead bar */}
//         <div className="h-1.5 bg-gradient-to-r from-navy via-brand-blue to-brand-orange" />
//
//         {/* Header */}
//         <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
//           <div>
//             <p className="text-base font-black text-navy tracking-tight">CITYLINE</p>
//             <p className="text-xs text-gray-400">Internet Service Provider</p>
//           </div>
//           <div className="text-right">
//             <p className="text-lg font-bold text-gray-800">PROFORMA INVOICE</p>
//             <p className="text-xs text-gray-400 mt-0.5 font-mono">{pi.piNumber}</p>
//           </div>
//         </div>
//
//         {/* Meta */}
//         <div className="px-6 py-4 border-b border-gray-100 grid grid-cols-2 gap-4">
//           <div className="space-y-1.5">
//             <div className="flex gap-2">
//               <span className="text-gray-400 w-20 shrink-0">Lead ID</span>
//               <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{lead?.id}</span>
//             </div>
//             <div className="flex gap-2">
//               <span className="text-gray-400 w-20 shrink-0">Customer</span>
//               <span className="text-gray-700">{lead?.companyName || lead?.name}</span>
//             </div>
//           </div>
//           <div className="text-right space-y-1.5">
//             <div>
//               <p className="text-gray-400 text-xs">Generated</p>
//               <p className="font-semibold text-gray-800">{formatEkycTimestamp(pi.generatedAt)}</p>
//             </div>
//             <div>
//               <p className="text-gray-400 text-xs">Status</p>
//               <p className={`font-semibold ${pi.status === 'Current' ? 'text-emerald-600' : 'text-gray-400'}`}>{pi.status}</p>
//             </div>
//           </div>
//         </div>
//
//         {/* Package + add-on rows */}
//         <div className="px-6 py-4">
//           <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Package Details</p>
//           <div className="divide-y divide-gray-100">
//             <div className="flex items-start justify-between py-2.5">
//               <div>
//                 <p className="font-semibold text-gray-800">{pi.packageName}</p>
//                 <p className="text-xs text-gray-500 mt-0.5">Base Price ₹{pi.basePrice.toLocaleString('en-IN')}</p>
//                 {pi.discount > 0 && (
//                   <p className="text-xs text-emerald-600 mt-0.5">Discount applied: ₹{pi.discount.toLocaleString('en-IN')}</p>
//                 )}
//               </div>
//               <p className="font-bold text-gray-900 shrink-0 ml-4">₹{effectivePrice.toLocaleString('en-IN')}</p>
//             </div>
//             {(pi.addons ?? []).map(a => (
//               <div key={a.id} className="flex items-start justify-between py-2.5">
//                 <p className="text-gray-700">{a.name}</p>
//                 <p className="font-medium text-gray-800 shrink-0 ml-4">₹{a.price.toLocaleString('en-IN')}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//
//         {/* Total */}
//         <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
//           <span className="font-semibold text-gray-600">Total Amount</span>
//           <span className="text-xl font-black text-gray-900">₹{pi.totalAmount.toLocaleString('en-IN')}</span>
//         </div>
//       </div>
//     </Modal>
//   )
// }

// ── Tab routing ───────────────────────────────────────────────────────────────

const TAB_PATH_TO_KEY = {
  'overview':      'overview',
  'followups':     'followups',
  'comments':      'comments',
  'stage-history': 'stageHistory',
  'activity-log':  'activity',
  'package':       'package',
}

// ── EditFuModal ────────────────────────────────────────────────────────────────

function EditFuModal({ isOpen, onClose, fu, onSave }) {
  const [form, setForm] = useState({ date: '', time: '', note: '', notifyTo: [] })

  useEffect(() => {
    if (isOpen && fu) {
      setForm({ date: fu.date, time: fu.time, note: fu.note ?? '', notifyTo: fu.notifyTo ?? [] })
    }
  }, [isOpen, fu])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function toggleNotify(name) {
    setForm(p => ({
      ...p,
      notifyTo: p.notifyTo.includes(name) ? p.notifyTo.filter(n => n !== name) : [...p.notifyTo, name],
    }))
  }

  const isInPast = form.date && form.date < TODAY

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Follow-up" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!form.date || !form.time || isInPast}
            onClick={() => onSave({ ...fu, date: form.date, time: form.time, note: form.note, notifyTo: form.notifyTo })}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Follow-up Date" required>
            <Input type="date" min={TODAY} value={form.date} onChange={e => set('date', e.target.value)} />
          </FormField>
          <FormField label="Follow-up Time" required>
            <Input type="time" value={form.time} onChange={e => set('time', e.target.value)} />
          </FormField>
        </div>
        {isInPast && (
          <p className="text-xs text-red-500 -mt-2">Date cannot be in the past.</p>
        )}
        <FormField label="Note">
          <Textarea rows={3} placeholder="Context or reminder…" value={form.note} onChange={e => set('note', e.target.value)} />
        </FormField>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Notify To</p>
          <div className="flex flex-wrap gap-2">
            {STAFF.map(s => (
              <button key={s.name} type="button" onClick={() => toggleNotify(s.name)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  form.notifyTo.includes(s.name)
                    ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                    : 'border-surface-border bg-white text-gray-600 hover:border-brand-blue/40'
                }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${s.color}`}>
                  {s.initials}
                </div>
                {s.name}
                {form.notifyTo.includes(s.name) && <CheckCircle2 size={12} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── InvoiceModal ─────────────────────────────────────────────────────────────
// Simple read-only invoice summary for the Active Package Details card (Enterprise
// "Invoice" button) — pulls the same displayPrice/boundPackages/firstInvoice/dueAmount
// figures already shown in the card, via the same boundPackagesOf() helper. Download/
// Print is a UI stub for now, no real PDF generation.
// TODO: this modal doesn't display/assign an invoice number at all yet — once
// it does, pull it via getNextInvoiceNumber(entityId) from
// src/data/companyEntities.js rather than inventing another ad-hoc scheme.

// Bandwidth packages/add-ons (packagesStore.js) don't carry their own HSN
// code, unlike billingData.js's per-service HSN — 9984 (Telecommunication
// Services) is the SAC code every seeded invoice already uses, so it's
// reused here as the line-item HSN shown when a lead's linked entity has
// showPackageNameOnInvoice off.
const DEFAULT_SERVICE_HSN = '9984'

function InvoiceModal({ isOpen, onClose, plan, pkg, lead }) {
  if (!plan || !pkg) return null
  const displayPrice = pkg.customPrice ?? plan.price
  const boundPackages = boundPackagesOf(plan)
  const boundPackagesTotal = boundPackages.reduce((sum, bp) => sum + (Number(bp.price) || 0), 0)
  const firstInvoiceAmount = displayPrice + boundPackagesTotal
  const dueAmount = firstInvoiceAmount
  // "Own" Connection Type links the lead to a Company/Entity
  // (companyEntities.js) whose showPackageNameOnInvoice setting decides
  // whether an HSN code shows alongside each line item here too — same
  // logic as InvoicePDF.jsx's Service Details table.
  //
  // Many seeded leads (e.g. LD-305/Vikram Enterprises) predate the
  // Connection Type/entityId fields entirely, or simply never had Connection
  // Type set to "Own" — with no fallback, `entity` was always null for them,
  // so showHsnColumn silently always fell back to the default (package name,
  // no HSN column) no matter what any real entity's toggle was set to.
  // Falling back to the first/primary Company/Entity when no entity is
  // actually linked gives the toggle something real to read instead.
  const linkedEntity = lead?.connectionType === 'Own' && lead?.entityId != null ? getCompanyEntity(lead.entityId) : null
  const entity = linkedEntity ?? getCompanyEntities()[0] ?? null
  const showHsnColumn = !(entity?.showPackageNameOnInvoice ?? true)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Invoice — ${lead?.name ?? ''}`} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button icon={<FileText size={14} />} onClick={() => {}}>
            Download / Print
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between pb-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {plan.code ? `${plan.code} · ` : ''}{plan.speed}
              {showHsnColumn && ` · HSN: ${DEFAULT_SERVICE_HSN}`}
            </p>
          </div>
          <p className="text-sm font-bold text-gray-900">₹{displayPrice.toLocaleString('en-IN')}</p>
        </div>

        {boundPackages.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Included Bound Packages</p>
            <div className="space-y-1.5">
              {boundPackages.map((bp, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-800">
                    <span className="font-medium">{bp.name}</span>{' '}
                    <span className="text-gray-400 text-xs">({bp.code})</span>
                    {showHsnColumn && (
                      <span className="text-gray-400 text-xs"> · HSN: {DEFAULT_SERVICE_HSN}</span>
                    )}
                  </span>
                  <span className="font-semibold text-gray-800">
                    {bp.price > 0 ? `₹${Number(bp.price).toLocaleString('en-IN')}` : 'Included'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-brand-blue">FIRST INVOICE</span>
          <span className="text-sm font-bold text-brand-blue">₹{firstInvoiceAmount.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex items-center justify-between -mt-2">
          <span className="text-xs font-semibold text-red-500">DUE AMOUNT</span>
          <span className="text-sm font-bold text-red-500">₹{dueAmount.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </Modal>
  )
}

// ── AddPaymentModal ──────────────────────────────────────────────────────────
// Fields mirror the Payment table's own columns (Package tab, Enterprise). Receipt
// No. is auto-generated by the caller on save, not editable here.

const PAYMENT_MODES = ['Bank Transfer', 'Online', 'Cash', 'Cheque']
const PAYMENT_STATUSES = ['Complete', 'Pending']

function AddPaymentModal({ isOpen, onClose, onSave, nextReceiptNo }) {
  const [form, setForm] = useState({ invoiceNo: '', paymentDate: TODAY, mode: 'Bank Transfer', total: '', paid: '', status: 'Complete', orderNo: '' })

  useEffect(() => {
    if (isOpen) setForm({ invoiceNo: '', paymentDate: TODAY, mode: 'Bank Transfer', total: '', paid: '', status: 'Complete', orderNo: '' })
  }, [isOpen])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const valid = form.paymentDate && form.total !== '' && form.paid !== ''

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Payment" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!valid}>Save Payment</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Receipt No.">
          <Input value={nextReceiptNo} disabled />
        </FormField>
        <FormField label="Invoice No.">
          <Input value={form.invoiceNo} onChange={e => set('invoiceNo', e.target.value)} placeholder="Optional" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Payment Date" required>
            <Input type="date" value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)} />
          </FormField>
          <FormField label="Mode">
            <Select value={form.mode} onChange={e => set('mode', e.target.value)}>
              {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Total Amount" required>
            <Input type="number" min="0" value={form.total} onChange={e => set('total', e.target.value)} placeholder="0" />
          </FormField>
          <FormField label="Paid Amount" required>
            <Input type="number" min="0" value={form.paid} onChange={e => set('paid', e.target.value)} placeholder="0" />
          </FormField>
        </div>
        <FormField label="Payment Status">
          <Select value={form.status} onChange={e => set('status', e.target.value)}>
            {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
          </Select>
        </FormField>
        <FormField label="Order No. / Cheque No.">
          <Input value={form.orderNo} onChange={e => set('orderNo', e.target.value)} placeholder="Optional" />
        </FormField>
      </div>
    </Modal>
  )
}

// ── RefundPaymentModal ───────────────────────────────────────────────────────
// Opened from a Payment row's "⋮" -> Refund. Refund Amount is prefilled from that
// row's Paid amount but editable. Confirming sets the row's status to 'Refunded'.

function RefundPaymentModal({ isOpen, onClose, payment, onConfirm }) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (isOpen && payment) {
      setAmount(String(payment.paid ?? ''))
      setReason('')
    }
  }, [isOpen, payment])

  const valid = amount !== '' && parseFloat(amount) > 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Refund Payment ${payment?.receiptNo ?? ''}?`} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => onConfirm(parseFloat(amount) || 0, reason.trim())} disabled={!valid}>
            Confirm Refund
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Refund Amount" required>
          <Input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} />
        </FormField>
        <FormField label="Reason">
          <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this payment being refunded?" />
        </FormField>
      </div>
    </Modal>
  )
}

// ── ManualPaymentModal / PackageRefundModal ─────────────────────────────────
// Opened from Active Package Details' "⋮" menu (next to Send Payment Link).
// No backend to hook into yet, so Save/Confirm just closes the modal and
// shows a placeholder success toast — same pattern as the Payment table's
// Add Payment/Refund actions above.

const PACKAGE_PAYMENT_MODES = ['Cash', 'Cheque', 'Bank Transfer', 'UPI']

function ManualPaymentModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({ amount: '', mode: 'Cash', date: TODAY, reference: '', notes: '' })

  useEffect(() => {
    if (isOpen) setForm({ amount: '', mode: 'Cash', date: TODAY, reference: '', notes: '' })
  }, [isOpen])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const valid = form.amount !== '' && parseFloat(form.amount) > 0 && !!form.date

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Manual Payment" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!valid}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Amount" required>
            <Input type="number" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" />
          </FormField>
          <FormField label="Payment Mode">
            <Select value={form.mode} onChange={e => set('mode', e.target.value)}>
              {PACKAGE_PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
            </Select>
          </FormField>
        </div>
        <FormField label="Payment Date" required>
          <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </FormField>
        <FormField label="Reference / Transaction ID">
          <Input value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Optional" />
        </FormField>
        <FormField label="Notes">
          <Textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes…" />
        </FormField>
      </div>
    </Modal>
  )
}

function PackageRefundModal({ isOpen, onClose, onConfirm }) {
  const [form, setForm] = useState({ amount: '', reason: '', mode: 'Bank Transfer', notes: '' })

  useEffect(() => {
    if (isOpen) setForm({ amount: '', reason: '', mode: 'Bank Transfer', notes: '' })
  }, [isOpen])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const valid = form.amount !== '' && parseFloat(form.amount) > 0 && form.reason.trim() !== ''

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Refund" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => onConfirm(form)} disabled={!valid}>Confirm Refund</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Refund Amount" required>
            <Input type="number" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" />
          </FormField>
          <FormField label="Refund Mode">
            <Select value={form.mode} onChange={e => set('mode', e.target.value)}>
              {PACKAGE_PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
            </Select>
          </FormField>
        </div>
        <FormField label="Reason" required>
          <Textarea rows={2} value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="Why is this refund being issued?" />
        </FormField>
        <FormField label="Notes">
          <Textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes…" />
        </FormField>
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SalesLeadDetail() {
  const { id, tab: tabParam } = useParams()
  const navigate = useNavigate()
  const [leads, setLeads]             = useState(getLeads)
  const [installations, setInstallations] = useState(getInstallations)
  const [feasibilityRequests, setFeasibilityRequests] = useState(getFeasibilityRequests)
  const [pipelines, setPipelines]   = useState(getPipelines)
  const activeTab = TAB_PATH_TO_KEY[tabParam] ?? 'overview'
  const [actionsOpen, setActionsOpen] = useState(false)
  const [actionsPos, setActionsPos]   = useState({ top: 0, right: 0 })
  const actionsRef = useRef(null)
  // Overview tab's cards can each be collapsed independently — expanded by default.
  const [collapsedCards, setCollapsedCards] = useState(new Set())
  function toggleCardCollapsed(key) {
    setCollapsedCards(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  // Left sidebar's compact "Basic Details" / "Address Info" summary sub-tabs.
  const [sidebarSubTab, setSidebarSubTab] = useState('basic')
  const [searchParams, setSearchParams] = useSearchParams()
  const moveStageOpen = searchParams.get('action') === 'move-stage'
  const [moveStageInitial, setMoveStageInitial] = useState('')

  function openMoveStage(initial = '') {
    setMoveStageInitial(initial)
    setSearchParams({ action: 'move-stage' })
  }
  function closeMoveStage() {
    setMoveStageInitial('')
    setSearchParams({})
  }

  // ?modal=send-ekyc opens the eKYC Verification popup (formerly a
  // dedicated tab) from the right sidebar's eKYC card — same
  // merge-with-existing-params pattern as FeasibilityDetail's
  // ?modal=edit-stage-fields, so it doesn't clobber other query params.
  const ekycModalOpen = searchParams.get('modal') === 'send-ekyc'

  function openEkycModal() {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('modal', 'send-ekyc')
      return next
    })
  }
  function closeEkycModal() {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('modal')
      return next
    })
  }

  // ?modal=manual-payment / ?modal=refund-package — opened from Active Package
  // Details' "⋮" menu, same merge-with-existing-params pattern as eKYC above.
  const manualPaymentModalOpen = searchParams.get('modal') === 'manual-payment'
  const packageRefundModalOpen = searchParams.get('modal') === 'refund-package'

  function openManualPaymentModal() {
    setPkgActionsOpen(false)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('modal', 'manual-payment')
      return next
    })
  }
  function closeManualPaymentModal() {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('modal')
      return next
    })
  }
  function openPackageRefundModal() {
    setPkgActionsOpen(false)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('modal', 'refund-package')
      return next
    })
  }
  function closePackageRefundModal() {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('modal')
      return next
    })
  }
  function handleManualPayment() {
    closeManualPaymentModal()
    setLinkToast('Payment recorded')
    setTimeout(() => setLinkToast(null), 3000)
  }
  function handlePackageRefund() {
    closePackageRefundModal()
    setLinkToast('Refund processed')
    setTimeout(() => setLinkToast(null), 3000)
  }
  const [followupOpen, setFollowupOpen]       = useState(false)
  const [reopenOpen, setReopenOpen]           = useState(false)
  const [reopenToast, setReopenToast]         = useState(false)
  const [visitInstallationOpen, setVisitInstallationOpen] = useState(false)
  const [expandedStages, setExpandedStages] = useState({})
  const [newComment, setNewComment] = useState('')
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQ, setMentionQ]     = useState('')
  const [replyTo, setReplyTo]       = useState(null)
  const [replyText, setReplyText]   = useState('')
  const commentRef = useRef(null)

  // Installation flow state
  const [installStatus, setInstallStatus]         = useState('not_started')
  const [installStartedAt, setInstallStartedAt]   = useState('')
  const [elapsed, setElapsed]                     = useState(0)
  const [hwModalOpen, setHwModalOpen]             = useState(false)
  const [activationData, setActivationData]       = useState(null)
  const [activationModalOpen, setActivationModalOpen]   = useState(false)
  const [activationSuccessOpen, setActivationSuccessOpen] = useState(false)

  // Quotation state
  const [quotationOpen, setQuotationOpen]   = useState(false)
  const [quotationToast, setQuotationToast] = useState(null)

  // Package tab state
  const [pkgModalOpen, setPkgModalOpen]     = useState(false)
  const [bwEditPrice, setBwEditPrice]       = useState(false)
  const [bwCustomPrice, setBwCustomPrice]   = useState('')
  const [paymentLinkToast, setPaymentLinkToast] = useState(null)
  const [bwApprover, setBwApprover]         = useState('Regional Manager')

  // Package tab — Add-ons
  const [addonModalOpen, setAddonModalOpen] = useState(false)

  // Package tab — Enterprise Payment table, Invoice modal, Add Payment
  const [leadPayments, setLeadPayments]     = useState([])
  const [invoiceOpen, setInvoiceOpen]       = useState(false)
  const [paymentMenuOpen, setPaymentMenuOpen] = useState(false)
  const paymentMenuRef = useRef(null)
  const [addPaymentOpen, setAddPaymentOpen] = useState(false)

  // Payment table row "⋮" menu (Refund) — only one row's menu open at a time,
  // same single-ref click-outside pattern as paymentMenuRef above.
  const [refundMenuId, setRefundMenuId]     = useState(null)
  const refundMenuRef = useRef(null)
  const [refundTarget, setRefundTarget]     = useState(null)

  // Active Package Details card's "⋮" menu (Manual Payment / Refund)
  const [pkgActionsOpen, setPkgActionsOpen] = useState(false)
  const pkgActionsRef = useRef(null)

  // PROFORMA INVOICE — disabled per request (Package tab). Uncomment to re-enable.
  // const [piPreview, setPiPreview] = useState(null)

  // eKYC tab — local (non-persisted) UI state; verification status/results live on lead.ekyc
  const [ekycIdentifier, setEkycIdentifier] = useState('')
  const [ekycCheckResult, setEkycCheckResult] = useState(null)
  const [editingFu, setEditingFu] = useState(null)
  const [fuToast, setFuToast] = useState(null)
  const [expandedRemarks, setExpandedRemarks] = useState(new Set())
  const [remarkInputs, setRemarkInputs] = useState({})
  const [callModal, setCallModal] = useState({ open: false, name: '', phone: '' })
  const [callToast, setCallToast] = useState(null)
  const [linkToast, setLinkToast] = useState(null)

  useEffect(() => subscribeLeads(setLeads), [])
  useEffect(() => subscribeInstallations(setInstallations), [])
  useEffect(() => subscribeFeasibility(setFeasibilityRequests), [])
  useEffect(() => subscribePipelines(setPipelines), [])

  // Live installation timer
  useEffect(() => {
    if (installStatus !== 'in_progress') return
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [installStatus])

  // Close actions dropdown on outside click
  useEffect(() => {
    if (!actionsOpen) return
    function handler(e) {
      if (!actionsRef.current?.contains(e.target)) setActionsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [actionsOpen])

  // Close Active Package Details' "⋮" menu (Manual Payment / Refund) on
  // outside click or Escape
  useEffect(() => {
    if (!pkgActionsOpen) return
    function handleClick(e) {
      if (!pkgActionsRef.current?.contains(e.target)) setPkgActionsOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') setPkgActionsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [pkgActionsOpen])

  // Close the Payment table's "⋮" menu on outside click
  useEffect(() => {
    if (!paymentMenuOpen) return
    function handler(e) {
      if (!paymentMenuRef.current?.contains(e.target)) setPaymentMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [paymentMenuOpen])

  // Close a Payment row's "⋮" (Refund) menu on outside click
  useEffect(() => {
    if (!refundMenuId) return
    function handler(e) {
      if (!refundMenuRef.current?.contains(e.target)) setRefundMenuId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [refundMenuId])

  const lead = leads.find(l => l.id === id)

  // eKYC status derives from the persisted lead.ekyc object, not local state
  const ekycStatus = lead?.ekyc?.status ?? 'Not Started'
  const ekycVerifiedAt = lead?.ekyc?.verifiedAt ?? null

  // Prefill the eKYC identifier input from the lead's phone/email once, without clobbering user edits
  useEffect(() => {
    if (lead && !ekycIdentifier) setEkycIdentifier(lead.phone || lead.email || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id])

  // Seed the Package tab's Payment table (Enterprise only) with representative mock
  // rows when the lead changes, so "Add Payment" can append to real state instead of
  // recomputing fresh mock data (and losing anything added) on every render.
  useEffect(() => {
    if (!lead) return
    const plan = lead.bandwidthPackage ? MOCK_PLANS.find(p => p.id === lead.bandwidthPackage.packageId) : null
    setLeadPayments([
      { id: 1, receiptNo: `RC-${lead.id}-01`, invoiceNo: plan ? `ENT/26-27/${lead.id}` : '—', paymentDate: TODAY, date: `${TODAY} 11:20:00`, mode: 'Bank Transfer', total: plan?.price ?? 0, paid: plan?.price ?? 0, status: 'Complete', orderNo: `ORD-${lead.id}-01`, chequeBCh: 0, addBy: lead.assigned ?? 'Admin', comment: 'Complete' },
      { id: 2, receiptNo: `RC-${lead.id}-02`, invoiceNo: '—', paymentDate: TODAY, date: `${TODAY} 09:05:00`, mode: 'Online', total: 0, paid: 0, status: 'Pending', orderNo: '—', chequeBCh: 0, addBy: lead.assigned ?? 'Admin', comment: 'Awaiting confirmation' },
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id])

  function handleAddPayment(form) {
    if (!lead) return
    const nextNo = String(leadPayments.length + 1).padStart(2, '0')
    setLeadPayments(p => [...p, {
      id: Date.now(),
      receiptNo: `RC-${lead.id}-${nextNo}`,
      invoiceNo: form.invoiceNo.trim() || '—',
      paymentDate: form.paymentDate,
      date: `${form.paymentDate} ${new Date().toTimeString().slice(0, 8)}`,
      mode: form.mode,
      total: parseFloat(form.total) || 0,
      paid: parseFloat(form.paid) || 0,
      status: form.status,
      orderNo: form.orderNo.trim() || '—',
      chequeBCh: 0,
      addBy: lead.assigned ?? 'Admin',
      comment: form.status,
    }])
    setAddPaymentOpen(false)
    setLinkToast('Payment added successfully')
    setTimeout(() => setLinkToast(null), 3000)
  }

  function handleConfirmRefund(refundAmount, reason) {
    if (!refundTarget) return
    setLeadPayments(p => p.map(pay => pay.id === refundTarget.id
      ? { ...pay, status: 'Refunded', refundAmount, refundReason: reason, comment: 'Refunded' }
      : pay))
    setRefundTarget(null)
    setLinkToast('Payment refunded successfully')
    setTimeout(() => setLinkToast(null), 3000)
  }

  function handleSendToEkyc() {
    if (!lead || !ekycIdentifier.trim()) return
    saveLead({
      ...lead,
      ekyc: {
        identifier: ekycIdentifier.trim(),
        status: 'Link Sent',
        sentAt: new Date().toISOString(),
        verifiedAt: null,
        docType: null,
        docNumberMasked: null,
        documentFetched: false,
        source: 'manual',
      },
      ekycStatus: 'Sent',
    })
  }

  function handleMarkEkycVerified() {
    if (!lead) return
    saveLead({
      ...lead,
      ekyc: {
        ...lead.ekyc,
        status: 'Verified',
        verifiedAt: new Date().toISOString(),
        docType: 'Aadhaar',
        docNumberMasked: 'XXXX-XXXX-1234',
        documentFetched: true,
        source: 'manual',
      },
      ekycStatus: 'Completed',
    })
  }

  function handleCheckExistingEkyc() {
    const record = findEkycRecord(ekycIdentifier.trim())
    setEkycCheckResult(record ? { found: true, record } : { found: false, record: null })
  }

  function handleReuseEkycVerification() {
    if (!lead || !ekycCheckResult?.record) return
    const record = ekycCheckResult.record
    saveLead({
      ...lead,
      ekyc: {
        identifier: ekycIdentifier.trim(),
        status: 'Verified',
        sentAt: lead.ekyc?.sentAt ?? null,
        verifiedAt: record.verifiedAt,
        docType: record.docType,
        docNumberMasked: record.docNumberMasked,
        documentFetched: true,
        source: 'reused',
      },
      ekycStatus: 'Completed',
    })
    setEkycCheckResult(null)
  }

  const PIPELINE_LABEL = { B2C: 'Residential', Custom: 'Custom', Enterprise: 'Enterprise' }
  // Same Customer Type pill treatment used on the Sales Pipeline table and
  // Customer List table (Residential = blue, Corporate/Enterprise = fuchsia).
  const customerTypePillStyle = lead.pipeline === 'Enterprise' ? 'bg-fuchsia-50 text-fuchsia-600' : 'bg-blue-50 text-blue-600'

  // Installation visit data from stage history
  const installVisitEntry = lead?.stageHistory?.find(sh => sh.stage === 'Installation Visit')
  const installDate   = installVisitEntry?.fields?.['s5d-f1'] ?? '—'
  const installTime   = installVisitEntry?.fields?.['s5d-f2'] ?? '—'
  const engineerName  = installVisitEntry?.fields?.['s5d-f3'] ?? 'Ravi Technician (ENG-001)'

  const linkedInstallation = lead ? installations.find(i => i.leadId === lead.id) : null
  const linkedFeasibility  = lead ? feasibilityRequests.find(r => r.leadId === lead.id) : null


  // Mock follow-ups for this lead
  const [followups, setFollowups] = useState(() => {
    const base = getLeads().find(l => l.id === id)
    if (!base) return []
    return [
      { id: 'FU-1', date: '2026-05-25', time: '10:00', note: 'Follow-up call to confirm installation slot', status: 'Upcoming', assignedTo: base.assigned, notifyTo: ['Arjun Kumar'],
        remarks: [
          { id: 'R1-1', author: 'Arjun Kumar', initials: 'AK', color: 'bg-brand-blue', text: 'Called customer — line busy', timeLabel: '2h ago' },
          { id: 'R1-2', author: 'Arjun Kumar', initials: 'AK', color: 'bg-brand-blue', text: 'Sent WhatsApp message', timeLabel: '1h ago' },
        ],
      },
      { id: 'FU-2', date: '2026-05-22', time: '11:30', note: 'Check feasibility status with field team', status: 'Due Today', assignedTo: base.assigned, notifyTo: [],
        remarks: [
          { id: 'R2-1', author: 'Arjun Kumar', initials: 'AK', color: 'bg-brand-blue', text: 'Customer confirmed for tomorrow', timeLabel: '3h ago' },
        ],
      },
      { id: 'FU-3', date: '2026-05-18', time: '09:00', note: 'Called customer — will call again tomorrow', status: 'Completed', assignedTo: base.assigned, notifyTo: ['Preethi Nair'],
        remarks: [],
      },
    ]
  })

  // Mock comments
  const [comments, setComments] = useState([
    { id: 'C3', author: 'Arjun Kumar', initials: 'AK', color: 'bg-brand-blue',   text: 'Feasibility confirmed. Moving to site survey.',                            timeLabel: '5 hours ago',  replies: [] },
    { id: 'C2', author: 'Preethi Nair', initials: 'PN', color: 'bg-purple-500', text: '@Arjun Kumar please check feasibility for this area.',                      timeLabel: '1 day ago',    replies: [] },
    { id: 'C1', author: 'Arjun Kumar', initials: 'AK', color: 'bg-brand-blue',   text: 'Called customer — interested in 100 Mbps plan. Will follow up tomorrow.', timeLabel: '2 days ago',   replies: [] },
  ])

  // Activity log
  const activityLog = [
    ...(lead?.activityLog ?? []),
    { id: 7, icon: '🟡', text: 'Follow-up rescheduled to 25 May', user: lead?.assigned ?? 'Arjun Kumar', time: '5 hours ago' },
    { id: 6, icon: '🔵', text: `Stage moved: Contacted → Follow-up`, user: lead?.assigned ?? 'Arjun Kumar', time: '1 day ago' },
    { id: 5, icon: '💬', text: 'Comment added', user: 'Preethi Nair', time: '1 day ago' },
    { id: 4, icon: '🔵', text: 'Stage moved: New Inquiry → Contacted', user: lead?.assigned ?? 'Arjun Kumar', time: '3 days ago' },
    { id: 3, icon: '🟡', text: 'Follow-up set for 22 May', user: lead?.assigned ?? 'Arjun Kumar', time: '4 days ago' },
    { id: 2, icon: '🔵', text: `Assigned to ${lead?.assigned ?? 'Arjun Kumar'}`, user: 'Admin', time: '5 days ago' },
    { id: 1, icon: '🟢', text: 'Lead Created', user: lead?.createdBy ?? 'Arjun Kumar', time: '5 days ago' },
  ]

  // Stage history
  const stageHistory = lead?.stageHistory ?? (() => {
    if (!lead) return []
    const pl = PIPELINES[lead.pipeline] ?? PIPELINES.B2C
    const idx = pl.stages.indexOf(lead.stage)
    const visited = pl.stages.slice(0, idx + 1).filter(s => s !== 'Won' && s !== 'Lost')
    return visited.map((s, i) => ({
      stage: s,
      date: `2026-05-${String(17 + i).padStart(2, '0')}`,
      movedBy: i === 0 ? (lead.createdBy ?? 'Arjun Kumar') : lead.assigned,
      fields: {},
    }))
  })()


  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <p className="text-lg font-semibold text-gray-900 mb-2">Lead not found</p>
        <p className="text-sm text-gray-500 mb-6">The lead ID <code className="bg-gray-100 px-2 py-0.5 rounded">{id}</code> does not exist.</p>
        <Button onClick={() => navigate('/sales')}>Back to Sales Pipeline</Button>
      </div>
    )
  }

  const pl = PIPELINES[lead.pipeline] ?? PIPELINES.B2C
  const stageStyle = STAGE_STYLES[lead.stage] ?? STAGE_STYLES['New Inquiry']
  const status = lead.stage === 'Won' ? 'Won' : lead.stage === 'Lost' ? 'Lost' : 'Open'
  const daysCreated = lead.createdAt ? daysBetween(lead.createdAt, TODAY) : 0
  const isOverdue = lead.followUp && lead.followUp < TODAY
  const staff = STAFF.find(s => s.name === lead.assigned)
  const leadDisplayName = lead.leadName || `${lead.name}${lead.plan ? ` — ${lead.plan}` : ''}`

  // lead.address is a plain string on older/seeded leads, but the Residential
  // Create Lead form (SalesNewLead.jsx) saves the whole nested billing/
  // installation address object instead — read the billing address line out
  // of either shape so Address Details always renders text, never an object.
  const billingAddress  = lead.address && typeof lead.address === 'object' ? lead.address.billing : null
  const leadAddressLine = billingAddress ? billingAddress.addressLine : (typeof lead.address === 'string' ? lead.address : undefined)
  const leadLandmark    = billingAddress?.landmark

  // Quotation button state
  const allPkgs = [lead.bandwidthPackage].filter(Boolean)
  const quotDisabledReason = lead.pipeline === 'Enterprise'
    ? (allPkgs.length === 0
        ? 'Please select a package first'
        : allPkgs.filter(p => p.customPrice !== null).some(p => p.approvalStatus === 'Rejected')
          ? 'Package approval was rejected. Please update the package.'
          : allPkgs.filter(p => p.customPrice !== null).some(p => p.approvalStatus === 'Pending')
            ? 'Waiting for package approval'
            : '')
    : (allPkgs.length === 0 ? 'Please select a package first' : '')

  function handleSendQuotation(formData) {
    const today = new Date().toISOString().split('T')[0]
    saveLead({
      ...lead,
      activityLog: [
        { id: Date.now(), icon: '📄', text: `Quotation sent to ${formData.notifierEmail}`, user: lead.assigned, time: 'just now' },
        ...(lead.activityLog ?? []),
      ],
    })
    setQuotationOpen(false)
    setQuotationToast(formData.notifierEmail)
    setTimeout(() => setQuotationToast(null), 3500)
  }

  function handleMoveStage(targetStage, fieldVals, fuData) {
    const filledCount = Object.values(fieldVals).filter(Boolean).length
    const newHistoryEntry = {
      stage: targetStage,
      date: TODAY,
      movedBy: lead.assigned ?? 'Arjun Kumar',
      fields: fieldVals,
    }
    const updatedHistory = [...stageHistory, newHistoryEntry]
    const newActivityEntry = {
      id: Date.now(),
      icon: '🔵',
      text: `Stage moved to ${targetStage}${filledCount > 0 ? ` with ${filledCount} field${filledCount !== 1 ? 's' : ''} filled` : ''}`,
      user: lead.assigned ?? 'Arjun Kumar',
      time: 'just now',
    }
    const updatedLead = {
      ...lead,
      stage: targetStage,
      daysInStage: 0,
      lastActivity: `Moved to ${targetStage}`,
      ...(targetStage === 'Feasibility' ? { feasibilityRequired: true } : {}),
      stageHistory: updatedHistory,
      activityLog: [newActivityEntry, ...(lead.activityLog ?? [])],
    }
    saveLead(updatedLead)
    if (targetStage === 'Feasibility') {
      const existing = getFeasibilityRequests().find(r => r.leadId === lead.id)
      saveFeasibilityRequest({
        ...(existing ?? {}),
        leadId:                   lead.id,
        customerName:             lead.name,
        mobile:                   lead.phone,
        area:                     lead.area ?? '',
        pipeline:                 lead.pipeline ?? '',
        stage:                    targetStage,
        feasibilityStatus:        existing?.feasibilityStatus ?? 'Pending',
        localityName:             fieldVals['s4-f1'] || existing?.localityName || '',
        subLocalityName:          fieldVals['s4-f2'] || existing?.subLocalityName || '',
        completeAddress:          fieldVals['s4-f3'] || existing?.completeAddress || '',
        landmark:                 fieldVals['s4-f4'] || existing?.landmark || '',
        connectionType:           fieldVals['s4-f5'] || existing?.connectionType || '',
        customerRequirementNotes: fieldVals['s4-f6'] || existing?.customerRequirementNotes || '',
        assignedBranch:           fieldVals['s4-f7'] || existing?.assignedBranch || '',
      })
    }
    if (fuData?.date) {
      saveFollowup({ id: `FU-${Date.now()}`, leadId: lead.id, leadName: lead.name, phone: lead.phone, date: fuData.date, time: fuData.time, note: fuData.note, stage: targetStage, assignedTo: lead.assigned, notifyTo: fuData.notifyTo, priority: lead.priority ?? 'medium', status: 'Pending' })
    }
  }

  function handleSaveFollowup(fu) {
    saveFollowup(fu)
    saveLead({ ...lead, followUp: fu.date, lastActivity: `Follow-up set: ${fu.date}` })
    setFollowups(p => [{ id: fu.id, date: fu.date, time: fu.time, note: fu.note, status: 'Upcoming', assignedTo: fu.assignedTo, notifyTo: fu.notifyTo }, ...p])
  }

  function handleReopen() {
    const firstStage = pl.stages[0]
    const reopenEntry = {
      id: Date.now(),
      icon: '🔄',
      text: `Lead reopened by Admin`,
      user: 'Admin',
      time: 'just now',
    }
    saveLead({
      ...lead,
      stage:       firstStage,
      daysInStage: 0,
      lastActivity: 'Lead reopened',
      followUp:    '',
      activityLog: [reopenEntry, ...(lead.activityLog ?? [])],
      stageHistory: [...(lead.stageHistory ?? []), { stage: firstStage, date: TODAY, movedBy: 'Admin', fields: {} }],
    })
    setReopenOpen(false)
    setReopenToast(true)
    setTimeout(() => setReopenToast(false), 3000)
  }

  function handlePostComment() {
    if (!newComment.trim()) return
    const staff = STAFF.find(s => s.name === lead.assigned) ?? STAFF[0]
    setComments(p => [{ id: `C${Date.now()}`, author: staff.name, initials: staff.initials, color: staff.color, text: newComment, timeLabel: 'just now', replies: [] }, ...p])
    setNewComment('')
  }

  function handleCommentInput(val) {
    setNewComment(val)
    const atIdx = val.lastIndexOf('@')
    if (atIdx >= 0 && atIdx === val.length - 1) {
      setMentionOpen(true)
      setMentionQ('')
    } else if (atIdx >= 0 && val.slice(atIdx + 1).match(/^\w*$/)) {
      setMentionOpen(true)
      setMentionQ(val.slice(atIdx + 1).toLowerCase())
    } else {
      setMentionOpen(false)
    }
  }

  function insertMention(name) {
    const atIdx = newComment.lastIndexOf('@')
    setNewComment(newComment.slice(0, atIdx) + `@${name} `)
    setMentionOpen(false)
    commentRef.current?.focus()
  }

  function handleMarkFollowupComplete(fuId) {
    setFollowups(p => p.map(f => f.id === fuId ? { ...f, status: 'Completed' } : f))
  }

  function handleCancelFollowup(fuId) {
    setFollowups(p => p.map(f => f.id === fuId ? { ...f, status: 'Cancelled' } : f))
  }

  function handleEditFuSave(updated) {
    setFollowups(p => p.map(f => f.id === updated.id ? updated : f))
    setEditingFu(null)
    setFuToast('Follow-up updated')
    setTimeout(() => setFuToast(null), 3000)
  }

  function handleCallInitiated({ number }) {
    const entry = {
      id: Date.now(),
      icon: '📞',
      text: `Call initiated to ${number}`,
      user: lead.assigned ?? 'Arjun Kumar',
      time: 'just now',
    }
    saveLead({ ...lead, lastActivity: `Call initiated to ${number}`, activityLog: [entry, ...(lead.activityLog ?? [])] })
    setCallToast('Call initiated successfully')
    setTimeout(() => setCallToast(null), 3000)
  }

  function toggleRemarks(fuId) {
    setExpandedRemarks(prev => {
      const next = new Set(prev)
      if (next.has(fuId)) next.delete(fuId)
      else next.add(fuId)
      return next
    })
  }

  function addRemark(fuId) {
    const text = remarkInputs[fuId]?.trim()
    if (!text) return
    setFollowups(prev => prev.map(f => {
      if (f.id !== fuId) return f
      return {
        ...f,
        remarks: [...(f.remarks ?? []), {
          id: `R-${Date.now()}`,
          author: 'Arjun Kumar',
          initials: 'AK',
          color: 'bg-brand-blue',
          text,
          timeLabel: 'just now',
        }],
      }
    }))
    setRemarkInputs(prev => ({ ...prev, [fuId]: '' }))
  }


  function handleHardwareConfirm(hwFormData) {
    // TODO: existing customers keep their original Customer ID / PPPoE
    // credentials; only new customer creation (this Won-conversion flow)
    // uses the Customer Type-configured generators below.
    const customerTypeId = lead.pipeline === 'Enterprise' ? 'corporate' : 'resident'
    const customerId = getNextCustomerId(customerTypeId)
    const customerLike = { name: lead.name, id: customerId }
    const username = getPPPoEId(customerLike, customerTypeId)
    // PPPoE Password isn't one of the 3 configurable ID types in
    // customerTypes.js (Customer ID / PPPoE ID / App Password) — it's a
    // simple locally-generated starting value, freely editable afterwards
    // from the Customer Profile page's Connection Details card.
    const pppoePassword = applyPattern('{customerid}#Pass', buildCredentialTokens(customerLike))
    const appPassword = getAppPassword(customerLike, customerTypeId)

    const newHistoryEntry = { stage: 'Won', date: TODAY, movedBy: lead.assigned ?? 'Arjun Kumar', fields: {} }
    const newActivityEntry = { id: Date.now(), icon: '🏆', text: 'Installation completed — Lead marked as Won', user: lead.assigned ?? 'Arjun Kumar', time: 'just now' }
    saveLead({
      ...lead,
      stage: 'Won',
      daysInStage: 0,
      lastActivity: 'Installation completed',
      stageHistory: [...(lead.stageHistory ?? []), newHistoryEntry],
      activityLog: [newActivityEntry, ...(lead.activityLog ?? [])],
    })

    setActivationData({ customerId, username, pppoePassword, appPassword, plan: lead.plan ?? '100 Mbps Home', customerName: lead.name })
    setHwModalOpen(false)
    setActivationModalOpen(true)
  }

  const mentionFiltered = STAFF.filter(s => s.name.toLowerCase().includes(mentionQ))

  function openPkgModal() {
    setPkgModalOpen(true)
  }

  function handleSelectPkg(plan) {
    const newPkg = lead.pipeline === 'Enterprise'
      ? { packageId: plan.id, customPrice: null, approvalStatus: 'Not Sent', requestedBy: null, requestedAt: null, approver: null, resolvedBy: null, resolvedAt: null, notes: '' }
      : { packageId: plan.id, customPrice: null } // Residential / Custom — no approval
    saveLead({ ...lead, bandwidthPackage: newPkg })
    setPkgModalOpen(false)
  }

  function handleSaveEnterprisePkg(sendForApproval) {
    const today = new Date().toISOString().split('T')[0]
    const updated = {
      ...lead.bandwidthPackage,
      customPrice: bwEditPrice && bwCustomPrice !== '' ? parseFloat(bwCustomPrice) || null : null,
      ...(sendForApproval ? { approvalStatus: 'Pending', requestedBy: lead.assigned, requestedAt: today, approver: bwApprover, resolvedBy: null, resolvedAt: null, notes: '' } : {}),
    }
    saveLead({ ...lead, bandwidthPackage: updated })
    setBwEditPrice(false); setBwCustomPrice('')
  }

  function handleSaveResidentialPkg() {
    const updated = {
      ...lead.bandwidthPackage,
      customPrice: bwEditPrice && bwCustomPrice !== '' ? parseFloat(bwCustomPrice) || null : null,
    }
    saveLead({ ...lead, bandwidthPackage: updated })
    setBwEditPrice(false); setBwCustomPrice('')
  }

  function handleRemovePkg() {
    saveLead({ ...lead, bandwidthPackage: null })
    setBwEditPrice(false); setBwCustomPrice('')
  }

  // Stub — no real SMS/payment-gateway provider is wired up yet.
  function handleSendPaymentLink() {
    setPaymentLinkToast(lead.phone)
    setTimeout(() => setPaymentLinkToast(null), 3500)
  }

  function handleAddAddon(addon) {
    const existing = lead.addons ?? []
    if (existing.some(a => a.id === addon.id)) return
    saveLead({ ...lead, addons: [...existing, { id: addon.id, name: addon.name, price: addon.price }] })
  }

  function handleRemoveAddon(addonId) {
    saveLead({ ...lead, addons: (lead.addons ?? []).filter(a => a.id !== addonId) })
  }

  // PROFORMA INVOICE — disabled per request (Package tab). Only called by the
  // commented-out "Generate Proforma Invoice" buttons below. Uncomment to re-enable.
  // function handleGeneratePi() {
  //   if (!lead.bandwidthPackage) return
  //   const plan = MOCK_PLANS.find(p => p.id === lead.bandwidthPackage.packageId)
  //   if (!plan) return
  //
  //   const basePrice = plan.price
  //   const customPrice = lead.bandwidthPackage.customPrice ?? null
  //   const effectivePrice = customPrice ?? basePrice
  //   const discount = customPrice != null && customPrice < basePrice ? basePrice - customPrice : 0
  //   const addons = (lead.addons ?? []).map(a => ({ id: a.id, name: a.name, price: Number(a.price) || 0 }))
  //   const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0)
  //
  //   const newPi = {
  //     piNumber: nextPiNumber(leads),
  //     generatedAt: new Date().toISOString(),
  //     status: 'Current',
  //     packageName: plan.name,
  //     basePrice,
  //     customPrice,
  //     discount,
  //     addons,
  //     addonsTotal,
  //     totalAmount: effectivePrice + addonsTotal,
  //   }
  //
  //   const supersededHistory = (lead.proformaInvoices ?? []).map(pi =>
  //     pi.status === 'Current' ? { ...pi, status: 'Superseded' } : pi
  //   )
  //   saveLead({ ...lead, proformaInvoices: [newPi, ...supersededHistory] })
  // }

  const TABS = [
    { key: 'overview',     path: 'overview',      label: 'Overview',      icon: User },
    { key: 'followups',    path: 'followups',     label: 'Follow-ups',    icon: Bell },
    { key: 'comments',     path: 'comments',      label: 'Comments',      icon: MessageSquare },
    { key: 'stageHistory', path: 'stage-history', label: 'Stage History', icon: TrendingUp },
    { key: 'activity',     path: 'activity-log',  label: 'Activity Log',  icon: Activity },
    { key: 'package',      path: 'package',       label: 'Package',       icon: Package },
  ]

  const FU_STATUS_STYLE = {
    'Upcoming':   'bg-blue-100 text-blue-700',
    'Due Today':  'bg-brand-orange/15 text-brand-orange font-semibold',
    'Overdue':    'bg-red-100 text-red-600',
    'Completed':  'bg-emerald-100 text-emerald-700',
    'Cancelled':  'bg-gray-100 text-gray-500',
  }

  return (
    <>
      {/* ── Top bar (white, full width, sits directly below the app header) ── */}
      <div className="bg-white border-b border-surface-border shadow-sm px-4 py-2">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/sales')}
            className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={15} /> Back to leads
          </button>

          {/* Tab nav — centered within the space between the back link and the
              right-side buttons; scrolls horizontally instead of wrapping if
              it doesn't fit. */}
          <div className="flex-1 min-w-0 flex justify-center overflow-x-auto scrollbar-none">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button key={tab.key} onClick={() => navigate(`/sales/leads/${id}/${tab.path}`)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-3.5 lg:px-3 xl:px-4 text-xs lg:text-xs xl:text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap
                    ${activeTab === tab.key
                      ? 'border-brand-blue text-brand-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                    }`}>
                  <Icon size={14} /> {tab.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {lead.stage !== 'Won' && lead.stage !== 'Lost' ? (
              <Button variant="danger" size="sm" icon={<XCircle size={14} />}
                onClick={() => openMoveStage('Lost')}>
                Mark as Lost
              </Button>
            ) : (
              <Button variant="secondary" size="sm" icon={<TrendingUp size={14} />}
                onClick={() => setReopenOpen(true)}
                className="border-amber-300 text-amber-700 hover:bg-amber-50">
                Reopen Lead
              </Button>
            )}
            {/* More options — folds in what used to be the standalone "Send
                Quotation" button and the "Actions" dropdown's items. */}
            <div className="relative" ref={actionsRef}>
              <button
                onClick={() => {
                  const rect = actionsRef.current.getBoundingClientRect()
                  setActionsPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
                  setActionsOpen(v => !v)
                }}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-surface-border bg-white text-gray-500 hover:bg-gray-50 transition-colors"
                title="More options"
              >
                <MoreVertical size={16} />
              </button>
              {actionsOpen && (
                <div
                  style={{ top: actionsPos.top, right: actionsPos.right }}
                  className="fixed z-[9999] bg-white border border-surface-border rounded-xl shadow-xl overflow-hidden min-w-[210px] w-max"
                >
                  <span title={quotDisabledReason || undefined}>
                    <button
                      onClick={() => { setQuotationOpen(true); setActionsOpen(false) }}
                      disabled={!!quotDisabledReason}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white">
                      <FileText size={14} className="text-gray-400 shrink-0" /> Send Quotation
                    </button>
                  </span>
                  <button
                    onClick={() => { navigate(`/sales/leads/${lead.id}/edit`); setActionsOpen(false) }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap">
                    <Edit3 size={14} className="text-gray-400 shrink-0" /> Edit Lead
                  </button>
                  <button
                    onClick={() => { openMoveStage('Feasibility'); setActionsOpen(false) }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap">
                    <Search size={14} className="text-gray-400 shrink-0" /> Check for Feasibility
                  </button>
                  <button
                    onClick={() => { setVisitInstallationOpen(true); setActionsOpen(false) }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap">
                    <Wrench size={14} className="text-gray-400 shrink-0" /> Visit Installation
                  </button>
                  <button
                    onClick={() => { setFollowupOpen(true); setActionsOpen(false) }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap">
                    <Bell size={14} className="text-gray-400 shrink-0" /> Add Follow-up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    <div className="pt-2 pb-6 px-4 space-y-3">

      {/* Quotation sent toast */}
      {quotationToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle2 size={16} className="shrink-0" />
          Quotation sent successfully to {quotationToast}
        </div>
      )}
      {/* Payment link sent toast */}
      {paymentLinkToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle2 size={16} className="shrink-0" />
          Payment link sent to {paymentLinkToast}
        </div>
      )}
      {/* Follow-up updated toast */}
      {fuToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle2 size={16} className="shrink-0" />
          {fuToast}
        </div>
      )}

      {/* Reopen toast */}
      {reopenToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-brand-blue text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle2 size={16} className="shrink-0" />
          Lead reopened and moved to {pl.stages[0]}
        </div>
      )}

      {/* ── Converted from Intercom banner ── */}
      {lead.sourceType === 'Intercom Conversion' && lead.convertedFromIntercomId && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <Badge variant="cyan" size="sm">Intercom</Badge>
          <p className="text-sm text-cyan-800">
            Converted from Intercom:{' '}
            <button
              onClick={() => navigate(`/intercom/customers/${lead.convertedFromIntercomId}/profile`)}
              className="font-semibold text-brand-blue hover:underline"
            >
              {lead.convertedFromIntercomId}
            </button>
          </p>
        </div>
      )}

      {/* ── 3-column layout: left sidebar | main content | right sidebar ──
          Note: no overflow-hidden on any ancestor here — it breaks position:
          sticky for any descendant that uses it, since it becomes the
          containing block instead of the page's real scroll container
          (<main> in Layout.jsx). The right sidebar below relies on this. */}
      <div className="flex flex-col lg:flex-row items-start gap-4">

        {/* ── LEFT SIDEBAR ── */}
        <div className="w-full lg:w-72 shrink-0 bg-white rounded-xl border border-surface-border shadow-card py-5 px-4">
          <div className="flex flex-col items-center text-center">
            {/* Avatar — shows the profile picture captured at lead creation
                (lead.profilePicture.preview, a data URL) when present, else
                falls back to the existing colored-initials treatment. */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-blue to-navy flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-md overflow-hidden">
              {lead.profilePicture?.preview
                ? <img src={lead.profilePicture.preview} alt="" className="w-full h-full object-cover" />
                : lead.name.charAt(0)}
            </div>
            <h1 className="text-base font-bold text-gray-900 mt-3">{leadDisplayName}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-2 ${customerTypePillStyle}`}>
              {PIPELINE_LABEL[lead.pipeline]}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-2 ${stageStyle.chip}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${stageStyle.dot}`} />
              {lead.stage}
            </span>
            {status !== 'Open' && (
              <Badge variant={status === 'Won' ? 'green' : 'red'} size="sm" className="mt-2">{status}</Badge>
            )}
          </div>

          <div className="border-t border-surface-border my-4" />

          {/* Contact block */}
          <div className="space-y-2.5 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <User size={14} className="text-gray-400 shrink-0" />
              <span className="truncate">{lead.name}</span>
            </div>
            <button
              onClick={() => setCallModal({ open: true, name: lead.name, phone: lead.phone })}
              className="flex items-center gap-2 hover:text-brand-blue transition-colors w-full text-left"
            >
              <Phone size={14} className="text-gray-400 shrink-0" />
              <span className="truncate">{lead.phone}</span>
            </button>
            {lead.email && (
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-gray-400 shrink-0" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {(lead.area || lead.city) && (
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-gray-400 shrink-0" />
                <span className="truncate">{[lead.area, lead.city].filter(Boolean).join(', ')}</span>
              </div>
            )}
            {lead.assigned && (
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${staff?.color ?? 'bg-gray-400'}`}>
                  {staff?.initials ?? '?'}
                </div>
                <span className="truncate">{lead.assigned}</span>
              </div>
            )}
          </div>

          <div className="border-t border-surface-border my-4" />

          {/* Sub-tabs */}
          <div className="flex items-center gap-4 mb-3">
            {[{ key: 'basic', label: 'Basic Details' }, { key: 'address', label: 'Address Info' }].map(t => (
              <button key={t.key} onClick={() => setSidebarSubTab(t.key)}
                className={`text-xs font-semibold pb-1.5 border-b-2 transition-colors ${
                  sidebarSubTab === t.key
                    ? 'border-brand-blue text-brand-blue'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {sidebarSubTab === 'basic' ? (
            <div className="space-y-3">
              <SidebarField label="Lead ID" value={lead.id} />
              <SidebarField label="Assigned To" value={lead.assigned} />
              <SidebarField label="Created On" value={lead.createdAt} />
              <SidebarField label="Lead Source" value={lead.source} />
            </div>
          ) : (
            <div className="space-y-3">
              <SidebarField label="Address" value={leadAddressLine} />
              <SidebarField label="Area" value={lead.area} />
              <SidebarField label="Locality" value={lead.locality} />
              <SidebarField label="Sub Locality" value={lead.subLocality} />
              <SidebarField label="City" value={lead.city} />
              <SidebarField label="District" value={lead.district} />
              <SidebarField label="State" value={lead.state} />
              <SidebarField label="Pincode" value={lead.pincode} />
              <SidebarField label="Site Type" value={lead.siteType} />
              <SidebarField label="Branch Code" value={lead.branchCode} />
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 min-w-0 space-y-3">

      {/* ── Tab content (each card below renders its own white background;
          this wrapper only handles layout, not a second nested card) ── */}
      <div>

          {/* ─── OVERVIEW ─────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <Card className="px-4">
                <CardHeader title="Basic Details" action={
                  <CardCollapseToggle collapsed={collapsedCards.has('basic')} onClick={() => toggleCardCollapsed('basic')} />
                } />
                {!collapsedCards.has('basic') && (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    <InfoCell label="Lead ID"      value={lead.id} highlight />
                    <InfoCell label="Lead Name"    value={leadDisplayName} />
                    <InfoCell label="Lead Source"  value={lead.source} />
                    <InfoCell label="Created By"   value={lead.createdBy ?? 'Admin'} />
                    <InfoCell label="Created Date" value={lead.createdAt} />
                    <InfoCell label="Assigned To"  value={lead.assigned} />
                    <InfoCell label="Customer Type"   value={lead.customerType} />
                    <InfoCell label="Connection Type" value={lead.connectionType} />
                    {lead.connectionType === 'Own' && lead.entityId != null && (
                      <InfoCell label="Entity" value={getCompanyEntity(lead.entityId)?.name} />
                    )}
                    {lead.connectionType === 'Partner' && lead.partnerId != null && (
                      <InfoCell label="Partner" value={getPartner(lead.partnerId)?.name} />
                    )}
                    {lead.connectionType === 'Partner' && lead.billingTo && (
                      <InfoCell label="Billing To" value={lead.billingTo} />
                    )}
                    <InfoCell label="Package"         value={lead.plan} />
                    <InfoCell label="Follow-up Date"  value={lead.followUp} />
                  </div>
                )}
              </Card>

              <Card className="px-4">
                <CardHeader title="Customer Details" action={
                  <CardCollapseToggle collapsed={collapsedCards.has('customer')} onClick={() => toggleCardCollapsed('customer')} />
                } />
                {!collapsedCards.has('customer') && (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    <InfoCell label="Customer Name"    value={lead.name} />
                    <InfoCell label="Service Tag"      value={lead.serviceTags?.length ? lead.serviceTags.join(', ') : undefined} />
                    <div>
                      <p className="text-xs text-gray-500">Mobile Number</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-brand-blue">{lead.phone || <span className="text-gray-300 font-normal">—</span>}</span>
                        {lead.phone && (
                          <button
                            onClick={() => setCallModal({ open: true, name: lead.name, phone: lead.phone })}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
                          >
                            <PhoneCall size={9} /> Call
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Alternate Number</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-gray-800">{lead.alternateMobile || <span className="text-gray-300 font-normal">—</span>}</span>
                        {lead.alternateMobile && (
                          <button
                            onClick={() => setCallModal({ open: true, name: lead.name, phone: lead.alternateMobile })}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
                          >
                            <PhoneCall size={9} /> Call
                          </button>
                        )}
                      </div>
                    </div>
                    <InfoCell label="Email Address"    value={lead.email} />
                  </div>
                )}
              </Card>

              {lead.pipeline === 'Enterprise' && (
                <Card className="px-4">
                  <CardHeader title="Company Information" action={
                    <CardCollapseToggle collapsed={collapsedCards.has('company')} onClick={() => toggleCardCollapsed('company')} />
                  } />
                  {!collapsedCards.has('company') && (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                      <InfoCell label="Company Name"    value={lead.companyName} />
                      <InfoCell label="Contact Person"  value={lead.contactPerson} />
                      <div>
                        <p className="text-xs text-gray-500">GST Registered</p>
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${lead.gstRegistered ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {lead.gstRegistered ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {lead.gstRegistered && (
                        <>
                          <InfoCell label="GST Number"      value={lead.gstNumber} highlight />
                          <InfoCell label="Company Address" value={lead.companyAddress} className="col-span-2" />
                        </>
                      )}
                    </div>
                  )}
                </Card>
              )}

              <Card className="px-4">
                <CardHeader title="Address Details" action={
                  <CardCollapseToggle collapsed={collapsedCards.has('address')} onClick={() => toggleCardCollapsed('address')} />
                } />
                {!collapsedCards.has('address') && (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    {leadAddressLine  && <InfoCell label="Address"      value={leadAddressLine} />}
                    {leadLandmark     && <InfoCell label="Landmark"     value={leadLandmark} />}
                    {lead.area        && <InfoCell label="Area"         value={lead.area} />}
                    {lead.locality    && <InfoCell label="Locality"     value={lead.locality} />}
                    {lead.subLocality && <InfoCell label="Sub Locality" value={lead.subLocality} />}
                    {lead.city        && <InfoCell label="City"         value={lead.city} />}
                    {lead.district    && <InfoCell label="District"     value={lead.district} />}
                    {lead.state       && <InfoCell label="State"        value={lead.state} />}
                    {lead.pincode     && <InfoCell label="Pincode"      value={lead.pincode} />}
                    {lead.siteType    && (
                      <InfoCell label="Site Type" value={
                        <span className="flex items-center gap-1.5">
                          {lead.siteType}
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">Auto</span>
                        </span>
                      } />
                    )}
                    {lead.branchCode  && (
                      <InfoCell label="Branch Code" value={
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono">{lead.branchCode}</span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">Auto</span>
                        </span>
                      } />
                    )}
                  </div>
                )}
              </Card>

            </div>
          )}

          {/* ─── FOLLOW-UPS ───────────────────────────────────────────── */}
          {activeTab === 'followups' && (
            <Card>
              <CardHeader title="All Follow-ups" action={
                <Button size="sm" icon={<Plus size={14} />} onClick={() => setFollowupOpen(true)}>Add Follow-up</Button>
              } />
              <div className="divide-y divide-surface-border">
                {followups.map(fu => {
                  const remarkCount = fu.remarks?.length ?? 0
                  const isRemarksExpanded = expandedRemarks.has(fu.id)
                  return (
                    <div key={fu.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CalendarDays size={13} className="text-brand-blue shrink-0" />
                            <span className="text-sm font-semibold text-gray-900">{fu.date} at {fu.time}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${FU_STATUS_STYLE[fu.status] ?? 'bg-gray-100 text-gray-600'}`}>{fu.status}</span>
                          </div>
                          {fu.note && <p className="text-xs text-gray-600 mb-2">{fu.note}</p>}
                          <div className="flex items-center gap-3 text-[11px] text-gray-400">
                            <span>Assigned: {fu.assignedTo}</span>
                            {fu.notifyTo?.length > 0 && <span>Notifiers: {fu.notifyTo.join(', ')}</span>}
                          </div>
                        </div>
                        {!['Completed','Cancelled'].includes(fu.status) && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button size="xs" icon={<Edit3 size={10} />} variant="secondary" onClick={() => setEditingFu(fu)}>Edit</Button>
                            <Button size="xs" onClick={() => handleMarkFollowupComplete(fu.id)}>Complete</Button>
                            <Button size="xs" variant="secondary" onClick={() => setFollowupOpen(true)}>Reschedule</Button>
                            <Button size="xs" variant="danger" onClick={() => handleCancelFollowup(fu.id)}>Cancel</Button>
                          </div>
                        )}
                      </div>

                      {/* Remarks */}
                      <div className="mt-2">
                        <button
                          onClick={() => toggleRemarks(fu.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <ChevronRight size={12} className={`transition-transform duration-150 ${isRemarksExpanded ? 'rotate-90' : ''}`} />
                          Remarks{remarkCount > 0 ? ` (${remarkCount})` : ''}
                        </button>
                        {isRemarksExpanded && (
                          <div className="pt-2 space-y-2">
                            {remarkCount === 0 && (
                              <p className="text-xs text-gray-400 py-1">No remarks yet.</p>
                            )}
                            {fu.remarks?.map(r => (
                              <div key={r.id} className="flex items-start gap-2.5 bg-gray-50 rounded-lg p-2.5">
                                <div className={`w-6 h-6 rounded-full ${r.color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
                                  {r.initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-xs font-semibold text-gray-700">{r.author}</span>
                                    <span className="text-[10px] text-gray-400">{r.timeLabel}</span>
                                  </div>
                                  <p className="text-xs text-gray-600">{r.text}</p>
                                </div>
                              </div>
                            ))}
                            <div className="flex gap-2 pt-1">
                              <input
                                type="text"
                                value={remarkInputs[fu.id] ?? ''}
                                onChange={e => setRemarkInputs(prev => ({ ...prev, [fu.id]: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') addRemark(fu.id) }}
                                placeholder="Add a remark..."
                                className="flex-1 text-xs px-3 py-1.5 border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
                              />
                              <button
                                onClick={() => addRemark(fu.id)}
                                disabled={!remarkInputs[fu.id]?.trim()}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {followups.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <Bell size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No follow-ups yet</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ─── COMMENTS ─────────────────────────────────────────────── */}
          {activeTab === 'comments' && (
            <Card>
              <CardHeader title="All Comments" action={
                <Button size="sm" icon={<Plus size={14} />} onClick={() => commentRef.current?.focus()}>Add Comment</Button>
              } />

              <div className="relative pb-4 mb-4 border-b border-surface-border">
                <textarea
                  ref={commentRef}
                  value={newComment}
                  onChange={e => handleCommentInput(e.target.value)}
                  placeholder="Add a comment… use @ to mention"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white resize-none placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue mb-3"
                />
                {mentionOpen && (
                  <div className="absolute left-4 z-20 bg-white border border-surface-border rounded-xl shadow-lg overflow-hidden"
                    style={{ bottom: '70px' }}>
                    {mentionFiltered.map(s => (
                      <button key={s.name} onClick={() => insertMention(s.name)}
                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 w-full text-left text-sm text-gray-700">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${s.color}`}>{s.initials}</div>
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button size="sm" icon={<Send size={13} />} onClick={handlePostComment} disabled={!newComment.trim()}>
                    Post Comment
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-surface-border">
                {comments.map(c => (
                  <div key={c.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${c.color}`}>
                        {c.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">{c.author}</span>
                          <span className="text-xs text-gray-400">{c.timeLabel}</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {c.text.split(/(@\w+ \w+)/).map((part, i) =>
                            part.startsWith('@')
                              ? <span key={i} className="text-brand-blue font-medium">{part}</span>
                              : part
                          )}
                        </p>
                        <button
                          onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                          className="text-xs text-gray-400 hover:text-brand-blue mt-2 transition-colors">
                          Reply
                        </button>
                        {replyTo === c.id && (
                          <div className="mt-2 flex gap-2">
                            <input
                              autoFocus
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              placeholder="Write a reply…"
                              className="flex-1 text-xs border border-surface-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                            />
                            <Button size="xs" onClick={() => {
                              if (!replyText.trim()) return
                              setComments(p => p.map(x => x.id === c.id
                                ? { ...x, replies: [...(x.replies ?? []), { id: `R${Date.now()}`, text: replyText, author: lead.assigned, timeLabel: 'just now' }] }
                                : x
                              ))
                              setReplyText('')
                              setReplyTo(null)
                            }}>Send</Button>
                          </div>
                        )}
                        {c.replies?.map(r => (
                          <div key={r.id} className="mt-2 ml-2 pl-3 border-l-2 border-surface-border">
                            <span className="text-xs font-semibold text-gray-700 mr-1">{r.author}</span>
                            <span className="text-xs text-gray-600">{r.text}</span>
                            <span className="text-[10px] text-gray-400 ml-1">{r.timeLabel}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ─── STAGE HISTORY ────────────────────────────────────────── */}
          {activeTab === 'stageHistory' && (
            <div>
              <Card padding={false}>
                <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Stage History</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {stageHistory.length} stage{stageHistory.length !== 1 ? 's' : ''} traversed
                    </p>
                  </div>
                  <Badge variant={status === 'Won' ? 'green' : status === 'Lost' ? 'red' : 'blue'} dot size="sm">
                    {status}
                  </Badge>
                </div>
                <div className="px-5 py-5">
                  {stageHistory.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No stage history recorded</p>
                  ) : (
                    <div className="space-y-0">
                      {stageHistory.map((sh, i) => {
                        const ss = STAGE_STYLES[sh.stage] ?? STAGE_STYLES['New Inquiry']
                        const filledFields = Object.entries(sh.fields ?? {}).filter(([, v]) => v)
                        const isExpanded = expandedStages[`hist_${i}`] ?? false
                        const isLatest = i === stageHistory.length - 1
                        return (
                          <div key={i} className="flex gap-4 pb-6 relative">
                            {i < stageHistory.length - 1 && (
                              <div className="absolute left-3 top-8 bottom-0 w-px bg-gray-200" />
                            )}
                            <div className={`w-6 h-6 rounded-full shrink-0 mt-1.5 z-10 flex items-center justify-center ${ss.dot} ${isLatest ? 'ring-2 ring-offset-2 ring-gray-200' : ''}`}>
                              {isLatest && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => setExpandedStages(p => ({ ...p, [`hist_${i}`]: !p[`hist_${i}`] }))}
                                className="w-full text-left"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${ss.chip}`}>{sh.stage}</span>
                                    {isLatest && (
                                      <span className="text-[10px] font-semibold text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full">
                                        Current
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {filledFields.length > 0 && (
                                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {filledFields.length} field{filledFields.length !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                    <ChevronDown size={14} className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                                  </div>
                                </div>
                                <p className="text-xs text-gray-400">{sh.date} · by {sh.movedBy}</p>
                              </button>

                              {isExpanded && (
                                <div className="mt-3 mb-2">
                                  {filledFields.length > 0 ? (
                                    <div className="bg-gray-50 rounded-xl border border-surface-border p-4">
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                                        Captured Fields
                                      </p>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {filledFields.map(([key, val]) => (
                                          <div key={key} className="bg-white rounded-lg border border-surface-border p-3">
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
                                              {getFieldLabel(pipelines, lead.pipeline, sh.stage, key)}
                                            </p>
                                            <p className="text-xs font-semibold text-gray-800 break-all">
                                              {displayFieldValue(val)}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-surface-border rounded-xl">
                                      <span className="text-xs text-gray-400 italic">
                                        No fields recorded for this stage
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ─── ACTIVITY LOG ─────────────────────────────────────────── */}
          {activeTab === 'activity' && (
            <div>
              <Card padding={false}>
                <div className="px-5 py-4 border-b border-surface-border">
                  <h3 className="text-sm font-semibold text-gray-800">Audit Trail</h3>
                </div>
                <div className="px-5 py-5">
                  <div className="space-y-0">
                    {activityLog.map((entry, i) => (
                      <div key={entry.id} className="flex gap-4 pb-5 relative">
                        {i < activityLog.length - 1 && (
                          <div className="absolute left-3.5 top-7 bottom-0 w-px bg-gray-200" />
                        )}
                        <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shrink-0 text-sm z-10">
                          {entry.icon}
                        </div>
                        <div className="pt-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium">{entry.text}</p>
                          <p className="text-xs text-gray-400 mt-0.5">by <span className="font-medium text-gray-600">{entry.user}</span> · {entry.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ─── PACKAGE ──────────────────────────────────────────────── */}
          {activeTab === 'package' && (
            <div>
              {(() => {
                /* Same base Active Package Details card for every customer type;
                   customerType-gated sections below add/remove pieces per type
                   (see customerType checks throughout this block). */
                const bwPlan = lead.bandwidthPackage ? MOCK_PLANS.find(p => p.id === lead.bandwidthPackage.packageId) : null
                const addons = lead.addons ?? []
                const customerType = PIPELINE_LABEL[lead.pipeline]
                // Same displayPrice + boundPackagesTotal formula as ResidentialPackageCard's
                // own dueAmount, computed here too so the Payment section's header (Enterprise)
                // can show it without reaching into that card's internals.
                const bwDueAmount = bwPlan
                  ? (lead.bandwidthPackage.customPrice ?? bwPlan.price) + boundPackagesOf(bwPlan).reduce((sum, bp) => sum + (Number(bp.price) || 0), 0)
                  : 0

                return (
                  <div className="space-y-4">

                    {/* Bandwidth Package */}
                    <Card padding={false}>
                      <div className="p-5 pb-4 flex items-center justify-between gap-3 flex-wrap border-b border-surface-border">
                        <h3 className="text-sm font-semibold text-gray-800">Active Package Details</h3>
                        {!bwPlan ? (
                          <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => openPkgModal()}>
                            Add Bandwidth Package
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0">
                            {customerType === 'Enterprise' && (
                              <Button size="sm" variant="secondary" icon={<Download size={13} />} onClick={() => setInvoiceOpen(true)}>
                                Invoice
                              </Button>
                            )}
                            <Button size="sm" variant="secondary" icon={<Edit3 size={13} />} onClick={() => openPkgModal()}>
                              Change Package
                            </Button>
                            <Button size="sm" icon={<CreditCard size={13} />} onClick={handleSendPaymentLink}>
                              Send Payment Link
                            </Button>
                            <div className="relative" ref={pkgActionsRef}>
                              <button
                                type="button"
                                onClick={() => setPkgActionsOpen(v => !v)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                                title="More payment options"
                              >
                                <MoreVertical size={14} />
                              </button>
                              {pkgActionsOpen && (
                                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-surface-border rounded-lg shadow-xl overflow-hidden w-44">
                                  <button
                                    onClick={openManualPaymentModal}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap">
                                    <Banknote size={13} className="text-gray-400 shrink-0" /> Manual Payment
                                  </button>
                                  <button
                                    onClick={openPackageRefundModal}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap">
                                    <RotateCcw size={13} className="text-gray-400 shrink-0" /> Refund
                                  </button>
                                </div>
                              )}
                            </div>
                            {customerType !== 'Residential' && (
                              <Button size="sm" icon={<FileText size={13} />} onClick={() => setQuotationOpen(true)}>
                                Generate Quotation
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        {!bwPlan ? (
                          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                            <Package size={18} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-sm text-gray-400">No bandwidth package selected</p>
                          </div>
                        ) : (
                          <ResidentialPackageCard
                            plan={bwPlan} pkg={lead.bandwidthPackage}
                            editPrice={bwEditPrice} customPriceVal={bwCustomPrice}
                            onToggleEditPrice={() => { setBwEditPrice(v => !v); setBwCustomPrice(String(lead.bandwidthPackage.customPrice ?? bwPlan.price)) }}
                            onCustomPriceChange={setBwCustomPrice}
                            onSave={() => handleSaveResidentialPkg()}
                            onRemove={() => handleRemovePkg()}
                            customerType={customerType}
                          />
                        )}
                      </div>
                    </Card>

                    {/* Payment — Enterprise only. Mirrors the exact table structure/
                        styling of Customer Detail's Finance tab -> Payments section
                        (CustomerDetail.jsx's FinanceTab, MOCK_PAYMENTS/payRows table) -
                        that tab itself is untouched, this just reuses its pattern.
                        leadPayments is real component state (seeded per-lead by the
                        effect above) rather than recomputed mock data, so "Add Payment"
                        can append a row that survives re-renders. */}
                    {customerType === 'Enterprise' && (
                        <Card padding={false}>
                          <div className="p-5 pb-4 border-b border-surface-border flex items-center justify-between gap-3 flex-wrap">
                            <h3 className="text-sm font-semibold text-gray-800">Payment</h3>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-red-500">Due Amount: ₹{bwDueAmount.toLocaleString('en-IN')}</span>
                              <div className="relative" ref={paymentMenuRef}>
                                <button type="button" onClick={() => setPaymentMenuOpen(v => !v)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
                                  <MoreVertical size={14} />
                                </button>
                                {paymentMenuOpen && (
                                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-surface-border rounded-lg shadow-xl overflow-hidden w-40">
                                    <button
                                      onClick={() => { setAddPaymentOpen(true); setPaymentMenuOpen(false) }}
                                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap">
                                      <Plus size={13} className="text-gray-400 shrink-0" /> Add Payment
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50/60 border-b border-surface-border">
                                  {['Receipt No', 'Payment Date', 'Mode', 'Total', 'Paid', 'Payment Status', 'Order No / Cheque No', 'Cheque B CH', 'Add By', 'Comment', 'Action'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-surface-border">
                                {leadPayments.map(pay => (
                                  <tr key={pay.id} className="hover:bg-gray-50/50">
                                    <td className="px-3 py-3 font-mono text-xs text-brand-blue font-semibold whitespace-nowrap">{pay.receiptNo}</td>
                                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{pay.paymentDate}</td>
                                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{pay.mode}</td>
                                    <td className="px-3 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">₹{pay.total.toFixed(2)}</td>
                                    <td className="px-3 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">₹{pay.paid.toFixed(2)}</td>
                                    <td className="px-3 py-3">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        pay.status === 'Complete' ? 'bg-green-100 text-green-700' :
                                        pay.status === 'Failed'   ? 'bg-red-100 text-red-600'    :
                                        pay.status === 'Refunded' ? 'bg-gray-200 text-gray-600'   :
                                        'bg-orange-100 text-orange-600'
                                      }`}>{pay.status}</span>
                                    </td>
                                    <td className="px-3 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{pay.orderNo}</td>
                                    <td className="px-3 py-3 text-xs text-gray-500">{pay.chequeBCh}</td>
                                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{pay.addBy}</td>
                                    <td className="px-3 py-3 text-xs text-gray-500">{pay.comment}</td>
                                    <td className="px-3 py-3">
                                      <div className="relative" ref={refundMenuId === pay.id ? refundMenuRef : null}>
                                        <button type="button" onClick={() => setRefundMenuId(v => v === pay.id ? null : pay.id)}
                                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                          <MoreVertical size={14} />
                                        </button>
                                        {refundMenuId === pay.id && (
                                          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-surface-border rounded-lg shadow-xl overflow-hidden w-32">
                                            <button
                                              onClick={() => { setRefundTarget(pay); setRefundMenuId(null) }}
                                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap">
                                              <RotateCcw size={13} className="shrink-0" /> Refund
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                {leadPayments.length === 0 && (
                                  <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400 text-sm">No payments found.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          <div className="px-5 py-3 border-t border-surface-border flex items-center gap-3 text-xs text-gray-500">
                            <span>Page 1 of 1</span>
                            <span className="text-gray-400">|</span>
                            <span>Total {leadPayments.length}</span>
                          </div>
                        </Card>
                    )}

                    {/*
                      ADD-ONS — commented out per request (Package tab). Previously shown
                      for any customerType !== 'Residential'; now hidden for every customer
                      type (Residential and Enterprise alike). Uncomment and re-add a
                      customerType condition here to re-enable for a future customer type.

                    <Card padding={false}>
                      <div className="p-5 pb-4 flex items-center justify-between border-b border-surface-border">
                        <h3 className="text-sm font-semibold text-gray-800">Add-ons</h3>
                        <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setAddonModalOpen(true)}>
                          Add Add-on
                        </Button>
                      </div>
                      <div className="p-5">
                        {addons.length === 0 ? (
                          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                            <Package size={18} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-sm text-gray-400">No add-ons added</p>
                          </div>
                        ) : (
                          <div className="max-w-md space-y-2">
                            {addons.map(addon => (
                              <div key={addon.id} className="flex items-center justify-between px-4 py-3 bg-white border border-surface-border rounded-xl shadow-card">
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{addon.name}</p>
                                  <p className="text-xs text-gray-500">₹{Number(addon.price).toLocaleString('en-IN')}/month</p>
                                </div>
                                <button type="button" onClick={() => handleRemoveAddon(addon.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                    */}

                    {/*
                      PROFORMA INVOICE — commented out per request (Package tab).
                      Uncomment this block (and the matching handleGeneratePi /
                      ProformaInvoicePreviewModal / piPreview state / nextPiNumber
                      above) to re-enable.

                    <Card padding={false}>
                      <div className="p-5 pb-4 flex items-center justify-between border-b border-surface-border">
                        <h3 className="text-sm font-semibold text-gray-800">Proforma Invoice</h3>
                        <Button size="sm" variant="secondary" icon={<FileText size={13} />} disabled={!lead.bandwidthPackage} onClick={handleGeneratePi}>
                          Generate Proforma Invoice
                        </Button>
                      </div>
                      <div className="p-5">
                        {(lead.proformaInvoices ?? []).length === 0 ? (
                          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                            <FileText size={18} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-sm text-gray-400">No Proforma Invoice generated yet</p>
                          </div>
                        ) : (
                          <div className="max-w-md space-y-2">
                            {lead.proformaInvoices.map(pi => (
                              <div key={pi.piNumber} className="flex items-center justify-between px-4 py-3 bg-white border border-surface-border rounded-xl shadow-card">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-semibold text-brand-blue">{pi.piNumber}</span>
                                    <Badge variant={pi.status === 'Current' ? 'green' : 'gray'} size="sm">{pi.status}</Badge>
                                  </div>
                                  <p className="text-sm font-medium text-gray-800 mt-1">
                                    {pi.packageName} · ₹{(pi.customPrice ?? pi.basePrice).toLocaleString('en-IN')}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Generated {formatEkycTimestamp(pi.generatedAt)}
                                    {pi.discount > 0 && (
                                      <span className="text-emerald-600"> · ₹{pi.discount.toLocaleString('en-IN')} discount</span>
                                    )}
                                  </p>
                                </div>
                                <button type="button" onClick={() => setPiPreview(pi)}
                                  className="shrink-0 flex items-center gap-1 text-xs text-brand-blue hover:text-blue-700 font-medium ml-3">
                                  <Eye size={13} /> View
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                    */}
                  </div>
                )
              })()}
            </div>
          )}
      </div>

        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="w-full lg:w-72 shrink-0 space-y-4 lg:sticky lg:top-4">

          {/* Installation — when lead is in Installation Visit stage */}
          {lead.stage === 'Installation Visit' && linkedInstallation && (
            <div className="bg-white rounded-xl border border-surface-border shadow-card py-5 px-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                  <Wrench size={14} className="text-orange-600" />
                </div>
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Installation</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50">
                  <span className="text-xs text-gray-500 shrink-0">ID</span>
                  <a
                    href={`/installations/${linkedInstallation.id}`}
                    className="text-xs font-semibold text-brand-blue hover:underline"
                    onClick={e => { e.preventDefault(); navigate(`/installations/${linkedInstallation.id}`) }}
                  >
                    {linkedInstallation.id}
                  </a>
                </div>
                <div className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50">
                  <span className="text-xs text-gray-500 shrink-0">Slot</span>
                  <span className="text-xs font-medium text-gray-800 text-right">
                    {linkedInstallation.slotDate} · {linkedInstallation.slotTime}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50">
                  <span className="text-xs text-gray-500 shrink-0">Engineer</span>
                  <span className="text-xs font-medium text-gray-800 text-right">
                    {linkedInstallation.engineerName ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-gray-500">Status</span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${{
                    'Pending':     'bg-gray-100 text-gray-500',
                    'Assigned':    'bg-blue-100 text-blue-700',
                    'Scheduled':   'bg-purple-100 text-purple-700',
                    'In Progress': 'bg-amber-100 text-amber-700',
                    'Completed':   'bg-emerald-100 text-emerald-700',
                    'Cancelled':   'bg-red-100 text-red-600',
                  }[linkedInstallation.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {linkedInstallation.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Current Stage Info — moved here from the main content column */}
          <div className="bg-white rounded-xl border border-surface-border shadow-card py-5 px-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <TrendingUp size={14} className="text-blue-600" />
              </div>
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Current Stage Info</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50">
                <span className="text-xs text-gray-500 shrink-0">Pipeline</span>
                <span className="text-xs font-medium text-gray-800 text-right">{PIPELINE_LABEL[lead.pipeline]}</span>
              </div>
              <div className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50">
                <span className="text-xs text-gray-500 shrink-0">Current Stage</span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${stageStyle.chip}`}>{lead.stage}</span>
              </div>
              <div className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50">
                <span className="text-xs text-gray-500 shrink-0">Stage Entered</span>
                <span className="text-xs font-medium text-gray-800 text-right">
                  {(() => { const d = new Date(); d.setDate(d.getDate() - lead.daysInStage); return d.toISOString().split('T')[0] })()}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs text-gray-500">Days in Stage</span>
                <span className="text-xs font-medium text-gray-800">
                  {`${lead.daysInStage} day${lead.daysInStage !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          </div>

          {/* eKYC Verification — opens the "Send eKYC" popup for the full flow */}
          <div className="bg-white rounded-xl border-2 border-purple-200 shadow-card py-5 px-4">
            <div className="flex items-center justify-between gap-2.5 mb-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                  <Fingerprint size={15} className="text-purple-600" />
                </div>
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">eKYC Verification</p>
              </div>
              <Badge variant={EKYC_TAB_STATUS_BADGE[ekycStatus] ?? 'gray'} size="sm">{ekycStatus}</Badge>
            </div>
            {ekycStatus === 'Verified' && ekycVerifiedAt ? (
              <p className="text-xs text-gray-500 mt-2">Verified {formatEkycTimestamp(ekycVerifiedAt)}</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openEkycModal}
                  className="w-full mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand-blue hover:bg-brand-blue-dark text-white shadow-sm transition-colors"
                >
                  Send eKYC
                </button>
                <p className="text-[11px] text-gray-400 text-center mt-2">
                  eKYC must be completed before Installation Done can be marked.
                </p>
              </>
            )}
          </div>
        </div>

      </div>

      {/* ── Package selection modal ─────────────────────────────────────── */}
      <PackageSelectModal
        isOpen={pkgModalOpen}
        onClose={() => setPkgModalOpen(false)}
        onSelect={handleSelectPkg}
        title="Select Bandwidth Package"
      />

      <AddonSelectModal
        isOpen={addonModalOpen}
        onClose={() => setAddonModalOpen(false)}
        addons={MOCK_ADDONS}
        selectedIds={(lead.addons ?? []).map(a => a.id)}
        onSelect={handleAddAddon}
      />

      {/* ── Send Quotation modal ───────────────────────────────────────── */}
      <SendQuotationModal
        isOpen={quotationOpen}
        onClose={() => setQuotationOpen(false)}
        lead={lead}
        onSend={handleSendQuotation}
      />

      {/*
        PROFORMA INVOICE — preview modal invocation commented out per request
        (Package tab). Uncomment along with the rest of the PI feature above
        to re-enable.

      <ProformaInvoicePreviewModal
        isOpen={!!piPreview}
        onClose={() => setPiPreview(null)}
        lead={lead}
        pi={piPreview}
      />
      */}

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <MoveStageModal
        isOpen={moveStageOpen}
        onClose={closeMoveStage}
        lead={lead}
        pipelines={pipelines}
        targetStage={moveStageInitial}
        onSave={handleMoveStage}
        title={moveStageInitial === 'Feasibility' ? `Feasibility Details — ${lead?.name}` : undefined}
      />
      <SetFollowupModal
        isOpen={followupOpen}
        onClose={() => setFollowupOpen(false)}
        lead={lead}
        onSave={handleSaveFollowup}
      />
      <VisitInstallationModal
        isOpen={visitInstallationOpen}
        onClose={() => setVisitInstallationOpen(false)}
        lead={lead}
        linkedFeasibility={linkedFeasibility}
        onCreated={() => {
          setVisitInstallationOpen(false)
          saveLead({
            ...lead,
            activityLog: [
              { id: Date.now(), icon: '🔧', text: 'Installation visit scheduled', user: lead.assigned ?? 'Arjun Kumar', time: 'just now' },
              ...(lead.activityLog ?? []),
            ],
          })
          setLinkToast('Installation scheduled')
          setTimeout(() => setLinkToast(null), 3000)
        }}
      />
      <InvoiceModal
        isOpen={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        lead={lead}
        pkg={lead?.bandwidthPackage}
        plan={lead?.bandwidthPackage ? MOCK_PLANS.find(p => p.id === lead.bandwidthPackage.packageId) : null}
      />
      <AddPaymentModal
        isOpen={addPaymentOpen}
        onClose={() => setAddPaymentOpen(false)}
        onSave={handleAddPayment}
        nextReceiptNo={lead ? `RC-${lead.id}-${String(leadPayments.length + 1).padStart(2, '0')}` : ''}
      />
      <RefundPaymentModal
        isOpen={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        payment={refundTarget}
        onConfirm={handleConfirmRefund}
      />
      <ManualPaymentModal
        isOpen={manualPaymentModalOpen}
        onClose={closeManualPaymentModal}
        onSave={handleManualPayment}
      />
      <PackageRefundModal
        isOpen={packageRefundModalOpen}
        onClose={closePackageRefundModal}
        onConfirm={handlePackageRefund}
      />
      <HardwareAssignmentModal
        isOpen={hwModalOpen}
        onClose={() => setHwModalOpen(false)}
        lead={lead}
        onConfirm={handleHardwareConfirm}
      />
      <PaymentModal
        isOpen={activationModalOpen}
        onClose={() => setActivationModalOpen(false)}
        lead={lead}
        data={activationData}
        onPaymentConfirmed={(advancePaymentNotRequired, credentials) => {
          saveLead({ ...lead, advancePaymentNotRequired })
          setActivationData(prev => ({ ...prev, ...credentials }))
          setActivationModalOpen(false)
          setActivationSuccessOpen(true)
        }}
      />
      <ActivationSuccessModal
        isOpen={activationSuccessOpen}
        onClose={() => setActivationSuccessOpen(false)}
        data={activationData}
      />
      <ReopenModal
        isOpen={reopenOpen}
        onClose={() => setReopenOpen(false)}
        lead={lead}
        firstStage={pl.stages[0]}
        onConfirm={handleReopen}
      />
      <EkycModal
        isOpen={ekycModalOpen}
        onClose={closeEkycModal}
        leadName={lead?.name}
        identifier={ekycIdentifier}
        onIdentifierChange={setEkycIdentifier}
        status={ekycStatus}
        sentAt={lead?.ekyc?.sentAt}
        verifiedAt={ekycVerifiedAt}
        docType={lead?.ekyc?.docType}
        docNumberMasked={lead?.ekyc?.docNumberMasked}
        onSend={handleSendToEkyc}
        onMarkVerified={handleMarkEkycVerified}
        checkResult={ekycCheckResult}
        onCheckExisting={handleCheckExistingEkyc}
        onReuseVerification={handleReuseEkycVerification}
      />
      <EditFuModal isOpen={!!editingFu} onClose={() => setEditingFu(null)} fu={editingFu} onSave={handleEditFuSave} />
      <CallModal
        isOpen={callModal.open}
        onClose={() => setCallModal({ open: false, name: '', phone: '' })}
        customerName={callModal.name}
        phoneNumber={callModal.phone}
        onCallInitiated={handleCallInitiated}
      />
      {callToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle2 size={16} className="shrink-0" />
          {callToast}
        </div>
      )}
      {linkToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          {linkToast}
        </div>
      )}
    </div>
    </>
  )
}

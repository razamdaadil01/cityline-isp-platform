import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Edit3, TrendingUp, Bell, MessageSquare,
  Activity, Plus, CheckCircle2, XCircle, CalendarDays,
  Phone, Mail, MapPin, User, Clock, ChevronDown, ChevronRight,
  CheckCircle, Send, Loader2,
  Wrench, Wifi, Package, CreditCard, Copy, AlertTriangle, Zap, Smartphone,
  Fingerprint, Search, FileText, PhoneCall,
} from 'lucide-react'
import { getLeads, saveLead, subscribeLeads } from '../data/leadsStore'
import { getInstallations, subscribeInstallations } from '../data/installationsStore'
import { MOCK_PLANS, SERVICE_BADGE, SERVICE_TYPES, BILLING_TYPES } from '../data/packagesStore'
import { saveFollowup } from '../data/followupStore'
import { getPipelines, subscribePipelines } from '../data/pipelineStore'
import { getStageFields } from '../data/stageFieldsStore'
import DynamicFieldInput, { isFieldFilled, displayFieldValue } from '../components/ui/DynamicFieldInput'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Card, { CardHeader } from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import CallModal from '../components/ui/CallModal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'

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

const STAFF = [
  { name: 'Arjun Kumar',  initials: 'AK', color: 'bg-brand-blue'   },
  { name: 'Preethi Nair', initials: 'PN', color: 'bg-purple-500'   },
  { name: 'Suresh Babu',  initials: 'SB', color: 'bg-emerald-500'  },
  { name: 'Anita Sharma', initials: 'AS', color: 'bg-brand-orange' },
  { name: 'Admin User',   initials: 'AU', color: 'bg-gray-500'     },
]

const PLANS = ['50 Mbps Starter', '100 Mbps Home', '200 Mbps Pro', '500 Mbps Ultra']

const PIPELINE_MAP = { B2C: 'PL-001', Enterprise: 'PL-003' }

function findStageId(pipelines, pipelineKey, stageName) {
  const pipeline = pipelines.find(p => p.id === (PIPELINE_MAP[pipelineKey] ?? ''))
  return pipeline?.stages.find(s => s.name === stageName)?.id ?? null
}

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

  useEffect(() => {
    if (isOpen) {
      setPaymentType('received')
      setForm({ amount: '', mode: 'Cash', reference: '', sendVia: 'WhatsApp' })
      setCopied(null)
    }
  }, [isOpen])

  function handleCopy(text, key) {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customer Account Created" size="lg">
      <div className="space-y-5">

        {/* PPPoE Credentials */}
        <div className="bg-navy/5 border border-navy/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wifi size={13} className="text-navy" />
            <p className="text-xs font-bold text-navy uppercase tracking-wider">PPPoE Credentials</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Customer ID', value: data?.customerId },
              { label: 'Plan',        value: data?.plan       },
              { label: 'Username',    value: data?.username   },
              { label: 'Password',    value: data?.password   },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-lg border border-surface-border p-3">
                <p className="text-[10px] text-gray-400 mb-1">{label}</p>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-mono font-bold text-gray-900 truncate">{value}</p>
                  <button onClick={() => handleCopy(value ?? '', label)} className="shrink-0 text-gray-400 hover:text-brand-blue transition-colors">
                    {copied === label ? <CheckCircle size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </button>
                </div>
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
                        <FormField label="Amount Paid">
                          <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 3500" />
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
                      <Button className="w-full" icon={<CheckCircle2 size={14} />} onClick={onPaymentConfirmed}>
                        Confirm Payment
                      </Button>
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
                      <FormField label="Amount Due">
                        <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 3500" />
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
                      <Button className="w-full" icon={<Send size={14} />} onClick={onPaymentConfirmed}>
                        Send Payment Request
                      </Button>
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
              { label: 'Customer ID', value: data?.customerId },
              { label: 'Username',    value: data?.username   },
              { label: 'Password',    value: data?.password   },
              { label: 'Plan',        value: data?.plan       },
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

// ── MoveStageModal ─────────────────────────────────────────────────────────────

function MoveStageModal({ isOpen, onClose, lead, pipelines, onSave, initialStage = '', onStageChange }) {
  const pl = PIPELINES[lead?.pipeline] ?? PIPELINES.B2C
  const availableStages = pl.stages.filter(s => s !== lead?.stage)
  const [targetStage, setTargetStage]         = useState(initialStage)
  const [fieldVals, setFieldVals]             = useState({})
  const [followupEnabled, setFollowupEnabled] = useState(false)
  const [fuForm, setFuForm]                   = useState({ date: '', time: '10:00', note: '', notifyTo: [] })
  const [loading, setLoading]                 = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTargetStage(initialStage ?? '')
      setFieldVals({})
      setFollowupEnabled(false)
      setFuForm({ date: '', time: '10:00', note: '', notifyTo: [] })
    }
  }, [isOpen, initialStage])

  const needsFeasConfirm = targetStage === 'Feasibility' && lead?.pipeline === 'B2C' && !lead?.feasibilityRequired
  const targetStageId  = findStageId(pipelines, lead?.pipeline, targetStage)
  const stageFields    = (!needsFeasConfirm && targetStageId ? getStageFields(targetStageId) : []).filter(f => f.active !== false)
  const visibleFields  = stageFields.filter(f => !f.conditionalOn || fieldVals[f.conditionalOn.fieldId] === f.conditionalOn.value)
  const requiredFields = visibleFields.filter(f => f.required)
  const requiredFilled = requiredFields.every(f => isFieldFilled(f, fieldVals[f.id]))
  const filledCount    = visibleFields.filter(f => isFieldFilled(f, fieldVals[f.id])).length

  function setField(id, val) { setFieldVals(p => ({ ...p, [id]: val })) }

  function toggleNotify(name) {
    setFuForm(p => ({ ...p, notifyTo: p.notifyTo.includes(name) ? p.notifyTo.filter(n => n !== name) : [...p.notifyTo, name] }))
  }

  function handleMove() {
    if (!targetStage || !requiredFilled) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onSave(targetStage, fieldVals, followupEnabled ? fuForm : null)
      onClose()
    }, 600)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Move Stage — ${lead?.name}`} size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button icon={loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
            onClick={handleMove} disabled={!targetStage || loading || !requiredFilled || needsFeasConfirm}>
            {loading ? 'Moving…' : 'Move Stage'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">

        {/* Stage selectors */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Current Stage">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-surface-border">
              <span className={`w-2 h-2 rounded-full ${STAGE_STYLES[lead?.stage]?.dot ?? 'bg-gray-400'}`} />
              <span className="text-sm text-gray-600 font-medium">{lead?.stage}</span>
            </div>
          </FormField>
          <FormField label="Move to Stage" required>
            <Select value={targetStage} onChange={e => { setTargetStage(e.target.value); setFieldVals({}); onStageChange?.(e.target.value) }}>
              <option value="">Select target stage…</option>
              {availableStages.map(s => (
                <option key={s} value={s}>
                  {s === 'Feasibility' && lead?.pipeline === 'B2C' && !lead?.feasibilityRequired
                    ? `${s} — Not required for this lead`
                    : s}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        {/* Feasibility hard block */}
        {needsFeasConfirm && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <XCircle size={16} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-800">Cannot Move to Feasibility</p>
                <p className="text-sm text-red-700 mt-1">This lead is not marked as Feasibility Required. You cannot move it to the Feasibility stage. To enable this stage, mark the lead as Feasibility Required first.</p>
              </div>
            </div>
            <button type="button" onClick={() => setTargetStage('')}
              className="w-full py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              OK
            </button>
          </div>
        )}

        {/* Dynamic stage fields */}
        {!needsFeasConfirm && targetStage && stageFields.length > 0 && (
          <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-brand-blue uppercase tracking-wider">
                Stage Fields — {targetStage}
              </p>
              <span className="text-[11px] text-gray-500 font-medium bg-white border border-surface-border rounded-full px-2 py-0.5">
                {filledCount}/{visibleFields.length} filled
                {requiredFields.length > 0 && ` · ${requiredFields.length} required`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {visibleFields.map(f => {
                const isWide = ['Textarea', 'Multi-select', 'Radio', 'File Upload'].includes(f.type)
                return (
                  <div key={f.id} className={isWide ? 'col-span-2' : ''}>
                    <FormField label={f.label} required={f.required} hint={f.help || undefined}>
                      <DynamicFieldInput
                        field={f}
                        value={fieldVals[f.id]}
                        onChange={val => setField(f.id, val)}
                      />
                    </FormField>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* No fields notice */}
        {!needsFeasConfirm && targetStage && stageFields.length === 0 && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
            <CheckCircle size={14} className="text-emerald-500 shrink-0" />
            No additional fields required for this stage.
          </div>
        )}

        {/* Follow-up toggle */}
        <div className="border border-surface-border rounded-xl overflow-hidden">
          <button type="button" onClick={() => setFollowupEnabled(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-brand-orange" />
              Set a follow-up after moving
            </div>
            <div className={`w-9 h-5 rounded-full transition-colors relative ${followupEnabled ? 'bg-brand-blue' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${followupEnabled ? 'left-4' : 'left-0.5'}`} />
            </div>
          </button>
          {followupEnabled && (
            <div className="px-4 pb-4 pt-1 border-t border-surface-border space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Date" required>
                  <Input type="date" value={fuForm.date} onChange={e => setFuForm(p => ({ ...p, date: e.target.value }))} />
                </FormField>
                <FormField label="Time">
                  <Input type="time" value={fuForm.time} onChange={e => setFuForm(p => ({ ...p, time: e.target.value }))} />
                </FormField>
              </div>
              <FormField label="Note">
                <Textarea value={fuForm.note} onChange={e => setFuForm(p => ({ ...p, note: e.target.value }))} rows={2} placeholder="Context for follow-up…" />
              </FormField>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Notifiers</p>
                <div className="flex flex-wrap gap-2">
                  {STAFF.slice(0, 4).map(s => (
                    <button key={s.name} type="button" onClick={() => toggleNotify(s.name)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                        fuForm.notifyTo.includes(s.name)
                          ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                          : 'border-surface-border text-gray-600 hover:border-brand-blue/40'
                      }`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${s.color}`}>{s.initials}</div>
                      {s.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
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
      onConfirm({
        customerName: lead?.name ?? '',
        customerId:   `CL-${1040 + Math.floor(Math.random() * 20)}`,
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
            <Button variant="secondary" size="sm" className="w-full">{card.action}</Button>
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

// ── EKycModal ─────────────────────────────────────────────────────────────────

function EKycModal({ isOpen, onClose, phone, onConfirm }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Initiate eKYC Verification" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={<Send size={14} />} onClick={onConfirm}>Send eKYC Link</Button>
        </>
      }
    >
      <div className="py-2">
        <p className="text-sm text-gray-600 leading-relaxed">
          A Digio verification link will be sent to{' '}
          <span className="font-semibold text-gray-900">{phone}</span>.
          The customer must complete Aadhaar-based verification before installation can proceed.
        </p>
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
  const [filterService, setFilterService] = useState('')
  const [filterBilling, setFilterBilling] = useState('')

  useEffect(() => {
    if (isOpen) { setSearch(''); setFilterService(''); setFilterBilling('') }
  }, [isOpen])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return MOCK_PLANS.filter(p => {
      if (p.status !== 'active') return false
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.serviceType.toLowerCase().includes(q)
      const matchService = !filterService || p.serviceType === filterService
      const matchBilling = !filterBilling || p.billingType === filterBilling
      return matchSearch && matchService && matchBilling
    })
  }, [search, filterService, filterBilling])

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
          <select value={filterService} onChange={e => setFilterService(e.target.value)}
            className="px-3 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-700">
            <option value="">All Service Types</option>
            {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
          </select>
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
    lead?.otherPackage     ? { slot: 'Other',     pkg: lead.otherPackage }     : null,
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
    lead?.otherPackage     ? { slot: 'Other',     pkg: lead.otherPackage }     : null,
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SalesLeadDetail() {
  const { id, tab: tabParam } = useParams()
  const navigate = useNavigate()
  const [leads, setLeads]             = useState(getLeads)
  const [installations, setInstallations] = useState(getInstallations)
  const [pipelines, setPipelines]   = useState(getPipelines)
  const activeTab = TAB_PATH_TO_KEY[tabParam] ?? 'overview'
  const [actionsOpen, setActionsOpen] = useState(false)
  const [actionsPos, setActionsPos]   = useState({ top: 0, right: 0 })
  const actionsRef = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const moveStageOpen = searchParams.get('action') === 'move-stage'
  const stageSlug     = searchParams.get('stage') ?? ''

  function stageToSlug(s) { return s.toLowerCase().replace(/\s+/g, '-') }
  function slugToStage(slug, lead) {
    if (!slug || !lead) return ''
    const pl = PIPELINES[lead.pipeline] ?? PIPELINES.B2C
    return pl.stages.find(s => stageToSlug(s) === slug) ?? ''
  }
  const moveStageInitial = moveStageOpen ? slugToStage(stageSlug, lead) : ''

  function openMoveStage(initial = '') {
    const params = { action: 'move-stage' }
    if (initial) params.stage = stageToSlug(initial)
    setSearchParams(params)
  }
  function closeMoveStage() { setSearchParams({}) }
  function handleMoveStageSelect(stage) {
    setSearchParams(stage
      ? { action: 'move-stage', stage: stageToSlug(stage) }
      : { action: 'move-stage' }
    )
  }
  const [wonConversionLead, setWonConversionLead] = useState(null)
  const [wonSuccessData, setWonSuccessData]   = useState(null)
  const [followupOpen, setFollowupOpen]       = useState(false)
  const [reopenOpen, setReopenOpen]           = useState(false)
  const [reopenToast, setReopenToast]         = useState(false)
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
  const [pkgModalFor, setPkgModalFor]       = useState(null) // null | 'bandwidth' | 'other'
  const [bwEditPrice, setBwEditPrice]       = useState(false)
  const [bwCustomPrice, setBwCustomPrice]   = useState('')
  const [otherEditPrice, setOtherEditPrice] = useState(false)
  const [otherCustomPrice, setOtherCustomPrice] = useState('')
  const [bwApprover, setBwApprover]         = useState('Regional Manager')
  const [otherApprover, setOtherApprover]   = useState('Regional Manager')

  // eKYC state
  const [ekycStatus, setEkycStatus]       = useState('not_started')
  const [ekycVerifiedAt, setEkycVerifiedAt] = useState(null)
  const [ekycModalOpen, setEkycModalOpen] = useState(false)
  const [editingFu, setEditingFu] = useState(null)
  const [fuToast, setFuToast] = useState(null)
  const [expandedRemarks, setExpandedRemarks] = useState(new Set())
  const [remarkInputs, setRemarkInputs] = useState({})
  const [callModal, setCallModal] = useState({ open: false, name: '', phone: '' })
  const [callToast, setCallToast] = useState(null)

  useEffect(() => subscribeLeads(setLeads), [])
  useEffect(() => subscribeInstallations(setInstallations), [])
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

  const lead = leads.find(l => l.id === id)

  const PIPELINE_LABEL = { B2C: 'Residential', Custom: 'Custom', Enterprise: 'Enterprise' }

  // Installation visit data from stage history
  const installVisitEntry = lead?.stageHistory?.find(sh => sh.stage === 'Installation Visit')
  const installDate   = installVisitEntry?.fields?.['s5d-f1'] ?? '—'
  const installTime   = installVisitEntry?.fields?.['s5d-f2'] ?? '—'
  const engineerName  = installVisitEntry?.fields?.['s5d-f3'] ?? 'Ravi Technician (ENG-001)'

  const linkedInstallation = lead ? installations.find(i => i.leadId === lead.id) : null


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

  // Quotation button state (Enterprise only)
  const entPkgs         = lead.pipeline === 'Enterprise' ? [lead.bandwidthPackage, lead.otherPackage].filter(Boolean) : []
  const editableEntPkgs = entPkgs.filter(p => p.customPrice !== null)
  const quotDisabledReason = entPkgs.length === 0
    ? 'Please select a package first'
    : editableEntPkgs.some(p => p.approvalStatus === 'Rejected')
      ? 'Package approval was rejected. Please update the package.'
      : editableEntPkgs.some(p => p.approvalStatus === 'Pending')
        ? 'Waiting for package approval'
        : ''

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
      stageHistory: updatedHistory,
      activityLog: [newActivityEntry, ...(lead.activityLog ?? [])],
    }
    saveLead(updatedLead)
    if (fuData?.date) {
      saveFollowup({ id: `FU-${Date.now()}`, leadId: lead.id, leadName: lead.name, phone: lead.phone, date: fuData.date, time: fuData.time, note: fuData.note, stage: targetStage, assignedTo: lead.assigned, notifyTo: fuData.notifyTo, priority: lead.priority ?? 'medium', status: 'Pending' })
    }
    if (targetStage === 'Won') {
      setWonConversionLead(updatedLead)
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
    const parts = lead.name.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/)
    const username = parts.join('_') + '_001'
    const firstName = parts[0] ?? 'customer'
    const password = `Cit@2024#${firstName.charAt(0).toUpperCase()}${firstName.slice(1, 3)}`
    const customerId = `CL-${1040 + Math.floor(Math.random() * 20)}`

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

    setActivationData({ customerId, username, password, plan: lead.plan ?? '100 Mbps Home', customerName: lead.name })
    setHwModalOpen(false)
    setActivationModalOpen(true)
  }

  const mentionFiltered = STAFF.filter(s => s.name.toLowerCase().includes(mentionQ))

  function openPkgModal(slot) {
    setPkgModalFor(slot)
    setPkgModalOpen(true)
  }

  function handleSelectPkg(plan) {
    if (lead.pipeline !== 'Enterprise') {
      saveLead({ ...lead, selectedPackage: { packageId: plan.id } })
    } else {
      const newPkg = { packageId: plan.id, customPrice: null, approvalStatus: 'Not Sent', requestedBy: null, requestedAt: null, approver: null, resolvedBy: null, resolvedAt: null, notes: '' }
      saveLead({ ...lead, [pkgModalFor === 'bandwidth' ? 'bandwidthPackage' : 'otherPackage']: newPkg })
    }
    setPkgModalOpen(false)
  }

  function handleSaveEnterprisePkg(slot, sendForApproval) {
    const pkgKey = slot === 'bandwidth' ? 'bandwidthPackage' : 'otherPackage'
    const editOn  = slot === 'bandwidth' ? bwEditPrice : otherEditPrice
    const cpStr   = slot === 'bandwidth' ? bwCustomPrice : otherCustomPrice
    const today   = new Date().toISOString().split('T')[0]
    const updated = {
      ...lead[pkgKey],
      customPrice: editOn && cpStr !== '' ? parseFloat(cpStr) || null : null,
      ...(sendForApproval ? { approvalStatus: 'Pending', requestedBy: lead.assigned, requestedAt: today, approver: slot === 'bandwidth' ? bwApprover : otherApprover, resolvedBy: null, resolvedAt: null, notes: '' } : {}),
    }
    saveLead({ ...lead, [pkgKey]: updated })
    if (slot === 'bandwidth') { setBwEditPrice(false); setBwCustomPrice('') }
    else { setOtherEditPrice(false); setOtherCustomPrice('') }
  }

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
    <div className="pt-2 pb-6 px-6 lg:px-6 xl:px-8 2xl:px-12 max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1900px] mx-auto space-y-3">

      {/* Quotation sent toast */}
      {quotationToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle2 size={16} className="shrink-0" />
          Quotation sent successfully to {quotationToast}
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

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-navy via-brand-blue to-brand-orange" />
        {/* Breadcrumb */}
        <div className="px-5 lg:px-6 xl:px-7 2xl:px-8 pt-3 pb-3 flex items-center gap-1.5 text-[12px]">
          <button onClick={() => navigate('/sales')} className="text-gray-400 hover:underline transition-colors">
            Sales Pipeline
          </button>
          <span className="text-gray-300">›</span>
          <span className="text-gray-500 truncate">{leadDisplayName}</span>
        </div>
        <div className="border-t border-surface-border" />
        <div className="p-5 lg:p-6 xl:p-7 2xl:p-8 pt-4">
          <div className="flex flex-wrap items-start gap-5">

            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-blue to-navy flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-md">
              {lead.name.charAt(0)}
            </div>

            {/* Core info */}
            <div className="flex-1 min-w-0">
              {/* Row 1: Lead name + stage badge */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{leadDisplayName}</h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${stageStyle.chip}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${stageStyle.dot}`} />
                  {lead.stage}
                </span>
                {status !== 'Open' && (
                  <Badge variant={status === 'Won' ? 'green' : 'red'} size="sm">{status}</Badge>
                )}
              </div>

              {/* Subtitle: customer name */}
              <p className="text-sm text-gray-500 font-medium mb-2">{lead.name}</p>

              {/* Row 2: Phone | Email | Location | Created | Assigned | Pipeline */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-500">
                <button
                  onClick={() => setCallModal({ open: true, name: lead.name, phone: lead.phone })}
                  className="flex items-center gap-1.5 hover:text-brand-blue transition-colors group"
                >
                  <Phone size={13} />
                  {lead.phone}
                  <span className="hidden group-hover:inline-flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                    Call
                  </span>
                </button>
                {lead.email && <span className="flex items-center gap-1.5"><Mail size={13} />{lead.email}</span>}
                {lead.area && <span className="flex items-center gap-1.5"><MapPin size={13} />{lead.area}</span>}
                <span className="flex items-center gap-1.5"><CalendarDays size={13} />Created {lead.createdAt ?? 'N/A'}</span>
                <span className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${staff?.color ?? 'bg-gray-400'}`}>
                    {staff?.initials ?? '?'}
                  </div>
                  {lead.assigned}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white shrink-0" style={{ backgroundColor: pl.color }}>
                  {PIPELINE_LABEL[lead.pipeline]}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">

              {/* Send Quotation — Enterprise pipeline only */}
              {lead.pipeline === 'Enterprise' && (
                <span title={quotDisabledReason || undefined}>
                  <Button size="sm" icon={<FileText size={14} />}
                    onClick={() => setQuotationOpen(true)}
                    disabled={!!quotDisabledReason}>
                    Send Quotation
                  </Button>
                </span>
              )}

              {/* Actions dropdown */}
              <div className="relative" ref={actionsRef}>
                <Button variant="secondary" size="sm" iconRight={<ChevronDown size={13} />}
                  onClick={() => {
                    const rect = actionsRef.current.getBoundingClientRect()
                    setActionsPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
                    setActionsOpen(v => !v)
                  }}>
                  Actions
                </Button>
                {actionsOpen && (
                  <div
                    style={{ top: actionsPos.top, right: actionsPos.right }}
                    className="fixed z-[9999] bg-white border border-surface-border rounded-xl shadow-xl overflow-hidden w-48"
                  >
                    <button
                      onClick={() => { navigate(`/sales/leads/${lead.id}/edit`); setActionsOpen(false) }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Edit3 size={14} className="text-gray-400" /> Edit Lead
                    </button>
                    <button
                      onClick={() => { openMoveStage(); setActionsOpen(false) }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <TrendingUp size={14} className="text-gray-400" /> Move Stage
                    </button>
                    <button
                      onClick={() => { setFollowupOpen(true); setActionsOpen(false) }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Bell size={14} className="text-gray-400" /> Add Follow-up
                    </button>
                  </div>
                )}
              </div>

              {/* Prominent standalone buttons */}
              {lead.stage !== 'Won' && lead.stage !== 'Lost' && (
                <>
                  <Button size="sm" icon={<CheckCircle2 size={14} />}
                    onClick={() => openMoveStage('Won')}>
                    Mark as Won
                  </Button>
                  <Button variant="danger" size="sm" icon={<XCircle size={14} />}
                    onClick={() => openMoveStage('Lost')}>
                    Mark as Lost
                  </Button>
                </>
              )}
              {(lead.stage === 'Won' || lead.stage === 'Lost') && (
                <Button variant="secondary" size="sm" icon={<TrendingUp size={14} />}
                  onClick={() => setReopenOpen(true)}
                  className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  Reopen Lead
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs + content card ── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">

        {/* Tab nav */}
        <div className="flex overflow-x-auto border-b border-surface-border scrollbar-none">
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

        <div className="p-5 lg:p-6 xl:p-8 2xl:p-10">

          {/* ─── OVERVIEW ─────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-3 gap-5">

              {/* Left 60% → lg:60% / xl:66% */}
              <div className="lg:col-span-3 xl:col-span-2 space-y-4">
                <Card>
                  <CardHeader title="Basic Details" />
                  <InfoRow label="Lead ID"      value={lead.id} highlight />
                  <InfoRow label="Lead Name"    value={leadDisplayName} />
                  <InfoRow label="Lead Source"  value={lead.source} />
                  <InfoRow label="Created By"   value={lead.createdBy ?? 'Admin'} />
                  <InfoRow label="Created Date" value={lead.createdAt} />
                  <InfoRow label="Assigned To"  value={lead.assigned} />
                </Card>

                <Card>
                  <CardHeader title="Customer Details" />
                  <InfoRow label="Customer Name"    value={lead.name} />
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-xs text-gray-500 shrink-0 w-36">Mobile Number</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-brand-blue">{lead.phone || <span className="text-gray-300">—</span>}</span>
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
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-xs text-gray-500 shrink-0 w-36">Alternate Number</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-800">{lead.alternateMobile || <span className="text-gray-300">—</span>}</span>
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
                  <InfoRow label="Email Address"    value={lead.email} />
                </Card>

                {lead.pipeline === 'Enterprise' && (
                  <Card>
                    <CardHeader title="Company Information" />
                    <InfoRow label="Company Name"    value={lead.companyName} />
                    <InfoRow label="Contact Person"  value={lead.contactPerson} />
                    <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-500 shrink-0 w-36">GST Registered</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lead.gstRegistered ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {lead.gstRegistered ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {lead.gstRegistered && (
                      <>
                        <InfoRow label="GST Number"      value={lead.gstNumber} highlight />
                        <InfoRow label="Company Address" value={lead.companyAddress} />
                      </>
                    )}
                  </Card>
                )}

                <Card>
                  <CardHeader title="Address Details" />
                  {lead.address     && <InfoRow label="Address"      value={lead.address} />}
                  {lead.area        && <InfoRow label="Area"         value={lead.area} />}
                  {lead.locality    && <InfoRow label="Locality"     value={lead.locality} />}
                  {lead.subLocality && <InfoRow label="Sub Locality" value={lead.subLocality} />}
                  {lead.city        && <InfoRow label="City"         value={lead.city} />}
                  {lead.district    && <InfoRow label="District"     value={lead.district} />}
                  {lead.state       && <InfoRow label="State"        value={lead.state} />}
                  {lead.pincode     && <InfoRow label="Pincode"      value={lead.pincode} />}
                  {lead.siteType    && (
                    <InfoRow label="Site Type" value={
                      <span className="flex items-center gap-1.5">
                        {lead.siteType}
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">Auto</span>
                      </span>
                    } />
                  )}
                  {lead.branchCode  && (
                    <InfoRow label="Branch Code" value={
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono">{lead.branchCode}</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">Auto</span>
                      </span>
                    } />
                  )}
                </Card>
              </div>

              {/* Right 40% */}
              {/* Right 40% → lg:40% / xl:34% */}
              <div className="lg:col-span-2 xl:col-span-1 space-y-4">

                <Card>
                  <CardHeader title="Current Stage Info" />
                  <InfoRow label="Pipeline" value={PIPELINE_LABEL[lead.pipeline]} />
                  <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-500 shrink-0 w-36">Current Stage</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stageStyle.chip}`}>{lead.stage}</span>
                  </div>
                  <InfoRow label="Stage Entered"
                    value={(() => { const d = new Date(); d.setDate(d.getDate() - lead.daysInStage); return d.toISOString().split('T')[0] })()} />
                  <InfoRow label="Days in Stage"
                    value={`${lead.daysInStage} day${lead.daysInStage !== 1 ? 's' : ''}`} />
                </Card>

                {/* Installation Card — when lead is in Installation Visit stage */}
                {lead.stage === 'Installation Visit' && linkedInstallation && (
                  <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
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

                {/* Installation Actions — only in Installation Visit stage */}
                {false && lead.stage === 'Installation Visit' && (
                  <div className="bg-white rounded-xl border-2 border-purple-200 p-5 shadow-card">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                        <Wrench size={15} className="text-purple-600" />
                      </div>
                      <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Installation Actions</p>
                    </div>

                    {installStatus === 'not_started' && (
                      <>
                        <div className="space-y-0 mb-3">
                          <InfoRow label="Install Date" value={installDate} />
                          <InfoRow label="Install Time" value={installTime} />
                          <InfoRow label="Engineer"     value={engineerName} />
                        </div>
                        <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                          <span className="text-xs font-medium text-gray-600">Installation Status</span>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-200 text-gray-500">Not Started</span>
                        </div>
                        <p className="text-[11px] text-gray-400 text-center mt-2">Managed by Field Engineer app</p>
                      </>
                    )}

                    {installStatus === 'in_progress' && (
                      <>
                        <div className="text-center py-4 mb-3 bg-purple-50 border border-purple-100 rounded-xl">
                          <p className="text-3xl font-mono font-bold text-purple-700 tabular-nums">{formatTimer(elapsed)}</p>
                          <p className="text-xs text-purple-500 mt-1">Installation in progress</p>
                        </div>
                        <div className="space-y-0 mb-3">
                          <InfoRow label="Started at" value={installStartedAt} />
                          <InfoRow label="Engineer"   value={engineerName} />
                        </div>
                        <div className="flex items-center justify-between px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                          <span className="text-xs font-medium text-amber-700">Installation Status</span>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-200 text-amber-700">In Progress</span>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-xs font-medium ${
                          ekycStatus === 'verified'
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            : 'bg-amber-50 border border-amber-200 text-amber-700'
                        }`}>
                          {ekycStatus === 'verified'
                            ? <CheckCircle size={13} className="shrink-0" />
                            : <AlertTriangle size={13} className="shrink-0" />
                          }
                          {ekycStatus === 'verified' ? '✅ eKYC Verified' : '⚠️ Complete eKYC before marking done'}
                        </div>
                        <button
                          disabled={ekycStatus !== 'verified'}
                          onClick={() => setHwModalOpen(true)}
                          className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400/40 ${
                            ekycStatus === 'verified'
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm cursor-pointer'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <CheckCircle2 size={14} />
                          Installation Done
                        </button>
                        {ekycStatus !== 'verified' && (
                          <p className="text-xs text-amber-600 text-center mt-2">Complete eKYC to enable this button</p>
                        )}
                        <p className="text-[11px] text-gray-400 text-center mt-2">Managed by Field Engineer app</p>
                      </>
                    )}
                  </div>
                )}

                {/* eKYC Verification — visible on all stages */}
                <div className="bg-white rounded-xl border-2 border-purple-200 p-5 shadow-card">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                      <Fingerprint size={15} className="text-purple-600" />
                    </div>
                    <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">eKYC Verification</p>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium text-gray-500">Status:</span>
                    {ekycStatus === 'not_started' && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-200 text-gray-500">Not Started</span>
                    )}
                    {ekycStatus === 'in_progress' && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">In Progress</span>
                    )}
                    {ekycStatus === 'verified' && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Verified ✓</span>
                    )}
                    {ekycStatus === 'failed' && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">Failed</span>
                    )}
                  </div>

                  {ekycStatus === 'verified' && ekycVerifiedAt && (
                    <p className="text-xs text-gray-500 mb-3">Verified at {ekycVerifiedAt}</p>
                  )}

                  {ekycStatus === 'failed' && (
                    <p className="text-xs text-red-500 mb-3">Verification failed. Please retry.</p>
                  )}

                  {(ekycStatus === 'not_started' || ekycStatus === 'failed') && (
                    <Button
                      className="w-full"
                      icon={<Fingerprint size={14} />}
                      onClick={() => setEkycModalOpen(true)}
                    >
                      {ekycStatus === 'failed' ? 'Retry eKYC' : 'Start eKYC'}
                    </Button>
                  )}

                  <p className="text-[11px] text-gray-400 text-center mt-3">
                    eKYC must be completed before Installation Done can be marked.
                  </p>
                </div>

                {/* <Card> */}
                {false && <Card>
                  <CardHeader title="Active Follow-up"
                    action={<Button size="xs" variant="ghost" icon={<Plus size={12} />} onClick={() => setFollowupOpen(true)}>Add</Button>} />
                  {lead.followUp ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <CalendarDays size={14} className={isOverdue ? 'text-red-500' : 'text-brand-blue'} />
                        <span className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                          {lead.followUp} {isOverdue && '⚠ Overdue'}
                        </span>
                      </div>
                      <InfoRow label="Time"        value="10:00 AM" />
                      <InfoRow label="Assigned to" value={lead.assigned} />
                      <InfoRow label="Notifiers"   value="Arjun Kumar" />
                      <div className="flex gap-2 mt-3">
                        <Button size="xs" className="flex-1" onClick={() => setFollowupOpen(true)}>Mark Complete</Button>
                        <Button size="xs" variant="secondary" className="flex-1" onClick={() => setFollowupOpen(true)}>Reschedule</Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-400 mb-3">No active follow-up</p>
                      <Button size="xs" icon={<Plus size={12} />} onClick={() => setFollowupOpen(true)}>Set Follow-up</Button>
                    </div>
                  )}
                </Card>}

                {false && <Card>
                  <CardHeader title="Quick Stats" />
                  {[
                    { label: 'Total Follow-ups',   value: followups.length },
                    { label: 'Completed',          value: followups.filter(f => f.status === 'Completed').length },
                    { label: 'Pending',            value: followups.filter(f => ['Upcoming','Due Today','Overdue'].includes(f.status)).length },
                    { label: 'Days Since Created', value: daysCreated },
                  ].map(stat => (
                    <div key={stat.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-500">{stat.label}</span>
                      <span className="text-sm font-bold text-gray-900">{stat.value}</span>
                    </div>
                  ))}
                </Card>}
              </div>
            </div>
          )}

          {/* ─── FOLLOW-UPS ───────────────────────────────────────────── */}
          {activeTab === 'followups' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-700">All Follow-ups</h2>
                <Button size="sm" icon={<Plus size={14} />} onClick={() => setFollowupOpen(true)}>Add Follow-up</Button>
              </div>
              <div className="space-y-3">
                {followups.map(fu => {
                  const remarkCount = fu.remarks?.length ?? 0
                  const isRemarksExpanded = expandedRemarks.has(fu.id)
                  return (
                    <div key={fu.id} className="bg-white rounded-xl border border-surface-border shadow-card">
                      <div className="p-4">
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
                      </div>

                      {/* Remarks */}
                      <div className="border-t border-surface-border">
                        <button
                          onClick={() => toggleRemarks(fu.id)}
                          className="w-full flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <ChevronRight size={12} className={`transition-transform duration-150 ${isRemarksExpanded ? 'rotate-90' : ''}`} />
                          Remarks{remarkCount > 0 ? ` (${remarkCount})` : ''}
                        </button>
                        {isRemarksExpanded && (
                          <div className="px-4 pb-4 space-y-2">
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
            </div>
          )}

          {/* ─── COMMENTS ─────────────────────────────────────────────── */}
          {activeTab === 'comments' && (
            <div>
              <div className="bg-white rounded-xl border border-surface-border p-4 shadow-card mb-5 relative">
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

              <div className="space-y-4">
                {comments.map(c => (
                  <div key={c.id} className="bg-white rounded-xl border border-surface-border p-4 shadow-card">
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
            </div>
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
            <div className="space-y-6">
              {lead.pipeline !== 'Enterprise' ? (
                /* Residential / Custom — single package slot */
                <div>
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold text-gray-800">Selected Package</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Assign a service plan to this lead</p>
                  </div>

                  {!lead.selectedPackage ? (
                    <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Package size={20} className="text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500 mb-1">No package selected yet</p>
                      <p className="text-xs text-gray-400 mb-4">Select a service plan to assign to this lead</p>
                      <Button size="sm" icon={<Plus size={13} />} onClick={() => openPkgModal(null)}>
                        Select Package
                      </Button>
                    </div>
                  ) : (() => {
                    const plan = MOCK_PLANS.find(p => p.id === lead.selectedPackage.packageId)
                    if (!plan) return null
                    const priceLabel = { Monthly: '/month', Quarterly: '/quarter', Yearly: '/year' }[plan.billingType] ?? ''
                    return (
                      <div className="max-w-sm">
                        <div className="bg-white border border-surface-border rounded-xl shadow-card overflow-hidden">
                          <div className="p-4 pb-3 border-b border-surface-border">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="text-sm font-semibold text-gray-900 leading-snug">{plan.name}</p>
                              <button type="button" onClick={() => openPkgModal(null)}
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
                          <div className="p-4 space-y-2">
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
                          </div>
                          <div className="px-4 py-3 bg-gray-50/70 border-t border-surface-border flex items-center justify-between rounded-b-xl">
                            <div>
                              <p className="text-[10px] text-gray-400">Price</p>
                              <p className="text-base font-bold text-gray-900">
                                ₹{plan.price.toLocaleString('en-IN')}
                                {priceLabel && <span className="text-xs font-normal text-gray-400">{priceLabel}</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                              <CheckCircle2 size={12} /> Saved
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                /* Enterprise — bandwidth + other */
                <div className="space-y-8">
                  {/* Bandwidth Package */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-800">Bandwidth Package</h3>
                      {!lead.bandwidthPackage && (
                        <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => openPkgModal('bandwidth')}>
                          Add Bandwidth Package
                        </Button>
                      )}
                    </div>
                    {!lead.bandwidthPackage ? (
                      <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                        <Package size={18} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400">No bandwidth package selected</p>
                      </div>
                    ) : (() => {
                      const plan = MOCK_PLANS.find(p => p.id === lead.bandwidthPackage.packageId)
                      if (!plan) return null
                      return (
                        <div className="max-w-md">
                          <EnterprisePackageCard
                            plan={plan} pkg={lead.bandwidthPackage}
                            editPrice={bwEditPrice} customPriceVal={bwCustomPrice}
                            onToggleEditPrice={() => { setBwEditPrice(v => !v); setBwCustomPrice(String(lead.bandwidthPackage.customPrice ?? plan.price)) }}
                            onCustomPriceChange={setBwCustomPrice}
                            onChange={() => openPkgModal('bandwidth')}
                            onSave={() => handleSaveEnterprisePkg('bandwidth', false)}
                            onSendApproval={() => handleSaveEnterprisePkg('bandwidth', true)}
                            approverVal={bwApprover}
                            onApproverChange={setBwApprover}
                          />
                        </div>
                      )
                    })()}
                  </div>

                  <div className="border-t border-surface-border" />

                  {/* Other Package */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-800">Other Package</h3>
                      {!lead.otherPackage && (
                        <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => openPkgModal('other')}>
                          Add Other Package
                        </Button>
                      )}
                    </div>
                    {!lead.otherPackage ? (
                      <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                        <Package size={18} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400">No other package selected</p>
                      </div>
                    ) : (() => {
                      const plan = MOCK_PLANS.find(p => p.id === lead.otherPackage.packageId)
                      if (!plan) return null
                      return (
                        <div className="max-w-md">
                          <EnterprisePackageCard
                            plan={plan} pkg={lead.otherPackage}
                            editPrice={otherEditPrice} customPriceVal={otherCustomPrice}
                            onToggleEditPrice={() => { setOtherEditPrice(v => !v); setOtherCustomPrice(String(lead.otherPackage.customPrice ?? plan.price)) }}
                            onCustomPriceChange={setOtherCustomPrice}
                            onChange={() => openPkgModal('other')}
                            onSave={() => handleSaveEnterprisePkg('other', false)}
                            onSendApproval={() => handleSaveEnterprisePkg('other', true)}
                            approverVal={otherApprover}
                            onApproverChange={setOtherApprover}
                          />
                        </div>
                      )
                    })()}
                  </div>

                  {/* Generate Quotation button */}
                  {(() => {
                    const pkgs = [lead.bandwidthPackage, lead.otherPackage].filter(Boolean)
                    if (pkgs.length === 0) return null
                    const pendingPkg = pkgs.find(p => p.approvalStatus === 'Pending' || p.approvalStatus === 'Rejected')
                    const allApproved = pkgs.every(p => p.approvalStatus === 'Approved')
                    const pendingPlan = pendingPkg ? MOCK_PLANS.find(p => p.id === pendingPkg.packageId) : null
                    const tooltipText = pendingPkg
                      ? `Approval pending for ${pendingPlan?.name ?? 'package'}`
                      : ''
                    return (
                      <div className="pt-2 border-t border-surface-border">
                        <button
                          type="button"
                          disabled={!allApproved}
                          title={tooltipText}
                          onClick={() => setQuotationOpen(true)}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                            allApproved
                              ? 'bg-brand-blue text-white hover:bg-blue-700'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <span>📄</span> Generate Quotation
                        </button>
                        {!allApproved && tooltipText && (
                          <p className="mt-1.5 text-xs text-amber-600">{tooltipText}</p>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Package selection modal ─────────────────────────────────────── */}
      <PackageSelectModal
        isOpen={pkgModalOpen}
        onClose={() => setPkgModalOpen(false)}
        onSelect={handleSelectPkg}
        title={pkgModalFor === 'bandwidth' ? 'Select Bandwidth Package' : pkgModalFor === 'other' ? 'Select Other Package' : 'Select Package'}
      />

      {/* ── Send Quotation modal ───────────────────────────────────────── */}
      <SendQuotationModal
        isOpen={quotationOpen}
        onClose={() => setQuotationOpen(false)}
        lead={lead}
        onSend={handleSendQuotation}
      />

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <MoveStageModal
        isOpen={moveStageOpen}
        onClose={closeMoveStage}
        lead={lead}
        pipelines={pipelines}
        initialStage={moveStageInitial}
        onSave={handleMoveStage}
        onStageChange={handleMoveStageSelect}
      />
      <SetFollowupModal
        isOpen={followupOpen}
        onClose={() => setFollowupOpen(false)}
        lead={lead}
        onSave={handleSaveFollowup}
      />
      {wonConversionLead && (
        <WonConversionModal
          isOpen={!!wonConversionLead}
          onClose={() => setWonConversionLead(null)}
          lead={wonConversionLead}
          onConfirm={data => {
            saveLead({ ...wonConversionLead, lastActivity: 'Converted to Customer' })
            setWonSuccessData({ ...data, leadRef: wonConversionLead })
            setWonConversionLead(null)
          }}
        />
      )}
      {wonSuccessData && (
        <WonSuccessModal
          isOpen={!!wonSuccessData}
          onClose={() => setWonSuccessData(null)}
          lead={wonSuccessData.leadRef}
          data={wonSuccessData}
        />
      )}
      <EKycModal
        isOpen={ekycModalOpen}
        onClose={() => setEkycModalOpen(false)}
        phone={lead.phone}
        onConfirm={() => {
          setEkycStatus('in_progress')
          setEkycModalOpen(false)
        }}
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
        onPaymentConfirmed={() => {
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
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit3, TrendingUp, Bell, MessageSquare,
  Activity, Plus, CheckCircle2, XCircle, CalendarDays,
  Phone, Mail, MapPin, User, Clock, ChevronDown, ChevronRight,
  CheckCircle, Send, Loader2,
  Wrench, Wifi, Package, CreditCard, Copy, AlertTriangle, Zap, Smartphone,
} from 'lucide-react'
import { getLeads, saveLead, subscribeLeads } from '../data/leadsStore'
import { saveFollowup } from '../data/followupStore'
import { getPipelines, subscribePipelines } from '../data/pipelineStore'
import { getStageFields } from '../data/stageFieldsStore'
import DynamicFieldInput, { isFieldFilled, displayFieldValue } from '../components/ui/DynamicFieldInput'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'

const PIPELINES = {
  B2C: { label: 'Residential', labelFull: 'Residential', color: '#0A8DCD', stages: ['New Inquiry','Contacted','Follow-up','Site Survey','Quotation Sent','Negotiation','Hardware Assignment','Installation Visit','Won','Lost'] },
  B2B: { label: 'Corporate',   labelFull: 'Corporate',   color: '#0F2744', stages: ['New Inquiry','Meeting Scheduled','Requirement Analysis','Technical Feasibility','Commercial Proposal','Negotiation','Legal/Agreement','Hardware Assignment','Won','Lost'], requiredStages: ['Technical Feasibility','Requirement Analysis','Commercial Proposal','Legal/Agreement'] },
  Custom: { label: 'Custom',   labelFull: 'Custom Pipeline', color: '#E8541A', stages: ['New Inquiry','Contacted','Quotation','Won','Lost'] },
}

const STAGE_STYLES = {
  'New Inquiry':           { chip: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500'    },
  'Contacted':             { chip: 'bg-cyan-100 text-cyan-700',      dot: 'bg-cyan-500'    },
  'Follow-up':             { chip: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-500'  },
  'Site Survey':           { chip: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500'   },
  'Quotation Sent':        { chip: 'bg-orange-100 text-orange-700',  dot: 'bg-orange-500'  },
  'Negotiation':           { chip: 'bg-pink-100 text-pink-700',      dot: 'bg-pink-500'    },
  'Hardware Assignment':   { chip: 'bg-violet-100 text-violet-700',  dot: 'bg-violet-500'  },
  'Installation Visit':    { chip: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-600'  },
  'Won':                   { chip: 'bg-emerald-100 text-emerald-700',dot: 'bg-emerald-500' },
  'Lost':                  { chip: 'bg-red-100 text-red-600',        dot: 'bg-red-400'     },
  'Meeting Scheduled':     { chip: 'bg-sky-100 text-sky-700',        dot: 'bg-sky-500'     },
  'Requirement Analysis':  { chip: 'bg-indigo-100 text-indigo-700',  dot: 'bg-indigo-500'  },
  'Technical Feasibility': { chip: 'bg-teal-100 text-teal-700',      dot: 'bg-teal-500'    },
  'Commercial Proposal':   { chip: 'bg-orange-100 text-orange-600',  dot: 'bg-orange-400'  },
  'Legal/Agreement':       { chip: 'bg-slate-100 text-slate-700',    dot: 'bg-slate-500'   },
  'Quotation':             { chip: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500'   },
}

const STAFF = [
  { name: 'Arjun Kumar',  initials: 'AK', color: 'bg-brand-blue'   },
  { name: 'Preethi Nair', initials: 'PN', color: 'bg-purple-500'   },
  { name: 'Suresh Babu',  initials: 'SB', color: 'bg-emerald-500'  },
  { name: 'Anita Sharma', initials: 'AS', color: 'bg-brand-orange' },
  { name: 'Admin User',   initials: 'AU', color: 'bg-gray-500'     },
]

const PLANS = ['50 Mbps Starter', '100 Mbps Home', '200 Mbps Pro', '500 Mbps Ultra']

const PIPELINE_MAP = { B2C: 'PL-001', B2B: 'PL-002' }

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

function MoveStageModal({ isOpen, onClose, lead, pipelines, onSave, initialStage = '' }) {
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

  const targetStageId  = findStageId(pipelines, lead?.pipeline, targetStage)
  const stageFields    = (targetStageId ? getStageFields(targetStageId) : []).filter(f => f.active !== false)
  const requiredFields = stageFields.filter(f => f.required)
  const requiredFilled = requiredFields.every(f => isFieldFilled(f, fieldVals[f.id]))
  const filledCount    = stageFields.filter(f => isFieldFilled(f, fieldVals[f.id])).length

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
            onClick={handleMove} disabled={!targetStage || loading || !requiredFilled}>
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
            <Select value={targetStage} onChange={e => { setTargetStage(e.target.value); setFieldVals({}) }}>
              <option value="">Select target stage…</option>
              {availableStages.map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
        </div>

        {/* Dynamic stage fields */}
        {targetStage && stageFields.length > 0 && (
          <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-brand-blue uppercase tracking-wider">
                Stage Fields — {targetStage}
              </p>
              <span className="text-[11px] text-gray-500 font-medium bg-white border border-surface-border rounded-full px-2 py-0.5">
                {filledCount}/{stageFields.length} filled
                {requiredFields.length > 0 && ` · ${requiredFields.length} required`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {stageFields.map(f => {
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
        {targetStage && stageFields.length === 0 && (
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SalesLeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [leads, setLeads]           = useState(getLeads)
  const [pipelines, setPipelines]   = useState(getPipelines)
  const [activeTab, setActiveTab]   = useState('overview')
  const [moveStageOpen, setMoveStageOpen]     = useState(false)
  const [moveStageInitial, setMoveStageInitial] = useState('')
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
  const [otpOpen, setOtpOpen]                     = useState(false)
  const [installStartedAt, setInstallStartedAt]   = useState('')
  const [elapsed, setElapsed]                     = useState(0)
  const [hwModalOpen, setHwModalOpen]             = useState(false)
  const [activationData, setActivationData]       = useState(null)
  const [activationModalOpen, setActivationModalOpen]   = useState(false)
  const [activationSuccessOpen, setActivationSuccessOpen] = useState(false)

  useEffect(() => subscribeLeads(setLeads), [])
  useEffect(() => subscribePipelines(setPipelines), [])

  // Live installation timer
  useEffect(() => {
    if (installStatus !== 'in_progress') return
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [installStatus])

  const lead = leads.find(l => l.id === id)

  const PIPELINE_LABEL = { B2C: 'Residential', B2B: 'Corporate', Custom: 'Custom' }

  // Installation visit data from stage history
  const installVisitEntry = lead?.stageHistory?.find(sh => sh.stage === 'Installation Visit')
  const installDate   = installVisitEntry?.fields?.['s5d-f1'] ?? '—'
  const installTime   = installVisitEntry?.fields?.['s5d-f2'] ?? '—'
  const engineerName  = installVisitEntry?.fields?.['s5d-f3'] ?? 'Ravi Technician (ENG-001)'

  // eKYC completeness check
  const eKycComplete = lead
    ? ['aadhaar', 'panCard', 'customerPhoto'].every(k => lead.kycDocs?.[k])
    : false

  // Mock follow-ups for this lead
  const [followups, setFollowups] = useState(() => {
    const base = getLeads().find(l => l.id === id)
    if (!base) return []
    return [
      { id: 'FU-1', date: '2026-05-25', time: '10:00', note: 'Follow-up call to confirm installation slot', status: 'Upcoming', assignedTo: base.assigned, notifyTo: ['Arjun Kumar'] },
      { id: 'FU-2', date: '2026-05-22', time: '11:30', note: 'Check feasibility status with field team', status: 'Due Today', assignedTo: base.assigned, notifyTo: [] },
      { id: 'FU-3', date: '2026-05-18', time: '09:00', note: 'Called customer — will call again tomorrow', status: 'Completed', assignedTo: base.assigned, notifyTo: ['Preethi Nair'] },
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

  function handleOTPVerified() {
    setInstallStatus('in_progress')
    const now = new Date()
    const h = now.getHours() % 12 || 12
    const m = String(now.getMinutes()).padStart(2, '0')
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM'
    setInstallStartedAt(`${h}:${m} ${ampm}`)
    setElapsed(0)
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

  const TABS = [
    { key: 'overview',   label: 'Overview',     icon: User },
    { key: 'followups',  label: 'Follow-ups',   icon: Bell },
    { key: 'comments',   label: 'Comments',     icon: MessageSquare },
    { key: 'activity',   label: 'Activity Log', icon: Activity },
  ]

  const FU_STATUS_STYLE = {
    'Upcoming':   'bg-blue-100 text-blue-700',
    'Due Today':  'bg-brand-orange/15 text-brand-orange font-semibold',
    'Overdue':    'bg-red-100 text-red-600',
    'Completed':  'bg-emerald-100 text-emerald-700',
    'Cancelled':  'bg-gray-100 text-gray-500',
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Reopen toast ────────────────────────────────────────────────── */}
      {reopenToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-brand-blue text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle2 size={16} className="shrink-0" />
          Lead reopened and moved to {pl.stages[0]}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 bg-white border-b border-surface-border shrink-0">
        <button onClick={() => navigate('/sales')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors">
          <ArrowLeft size={15} /> Back to Sales Pipeline
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-0.5">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {lead.leadName || `${lead.name}${lead.plan ? ` — ${lead.plan}` : ''}`}
              </h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${stageStyle.chip}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${stageStyle.dot}`} />
                {lead.stage}
              </span>
              {status !== 'Open' && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${status === 'Won' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {status}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500 mb-2">{lead.name}</p>

            <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
              <span className="flex items-center gap-1.5"><Phone size={13} /> {lead.phone}</span>
              {lead.email && <span className="flex items-center gap-1.5"><Mail size={13} /> {lead.email}</span>}
              <span className="flex items-center gap-1.5"><MapPin size={13} /> {lead.area}</span>
              <span className="flex items-center gap-1.5"><CalendarDays size={13} /> Created {lead.createdAt ?? 'N/A'}</span>
              <span className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${staff?.color ?? 'bg-gray-400'}`}>
                  {staff?.initials ?? '?'}
                </div>
                {lead.assigned}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: pl.color }}>
                {PIPELINE_LABEL[lead.pipeline]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Button variant="secondary" size="sm" icon={<Edit3 size={14} />} onClick={() => navigate(`/sales/leads/${lead.id}/edit`)}>
              Edit Lead
            </Button>
            <Button variant="secondary" size="sm" icon={<TrendingUp size={14} />} onClick={() => setMoveStageOpen(true)}>
              Move Stage
            </Button>
            <Button variant="secondary" size="sm" icon={<Bell size={14} />} onClick={() => setFollowupOpen(true)}>
              Add Follow-up
            </Button>
            {lead.stage !== 'Won' && lead.stage !== 'Lost' && (
              <>
                <Button size="sm" icon={<CheckCircle2 size={14} />}
                  onClick={() => { setMoveStageInitial('Won'); setMoveStageOpen(true) }}>
                  Mark as Won
                </Button>
                <Button variant="danger" size="sm" icon={<XCircle size={14} />}
                  onClick={() => { setMoveStageInitial('Lost'); setMoveStageOpen(true) }}>
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

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="px-6 bg-white border-b border-surface-border shrink-0">
        <div className="flex gap-0">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.key
                    ? 'border-brand-blue text-brand-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <Icon size={14} /> {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ─── OVERVIEW ─────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="p-6 grid grid-cols-3 gap-5">

            {/* Column 1 */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-surface-border p-4 shadow-card">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Basic Details</p>
                <InfoRow label="Lead ID"      value={lead.id}                                                      highlight />
                <InfoRow label="Lead Name"    value={lead.leadName || `${lead.name}${lead.plan ? ` — ${lead.plan}` : ''}`} />
                <InfoRow label="Lead Source"  value={lead.source} />
                <InfoRow label="Created By"   value={lead.createdBy ?? 'Admin'} />
                <InfoRow label="Created Date" value={lead.createdAt} />
                <InfoRow label="Assigned To"  value={lead.assigned} />
              </div>

              <div className="bg-white rounded-xl border border-surface-border p-4 shadow-card">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Customer Details</p>
                <InfoRow label="Customer Name"    value={lead.name} />
                <InfoRow label="Mobile Number"    value={lead.phone} highlight />
                <InfoRow label="Alternate Number" value={lead.alternateMobile} />
                <InfoRow label="Email Address"    value={lead.email} />
              </div>

              <div className="bg-white rounded-xl border border-surface-border p-4 shadow-card">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Address Details</p>
                <InfoRow label="Address" value={lead.address} />
                <InfoRow label="Area"    value={lead.area} />
                <InfoRow label="City"    value={lead.city} />
                <InfoRow label="Pincode" value={lead.pincode} />
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-surface-border p-4 shadow-card">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Current Stage Info</p>
                <InfoRow label="Pipeline"       value={PIPELINE_LABEL[lead.pipeline]} />
                <div className="flex items-start justify-between py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-500 w-36 shrink-0">Current Stage</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stageStyle.chip}`}>{lead.stage}</span>
                </div>
                <InfoRow label="Stage Entered"  value={(() => { const d = new Date(); d.setDate(d.getDate() - lead.daysInStage); return d.toISOString().split('T')[0] })()} />
                <InfoRow label="Days in Stage"  value={`${lead.daysInStage} day${lead.daysInStage !== 1 ? 's' : ''}`} />
              </div>

              <div className="bg-white rounded-xl border border-surface-border p-4 shadow-card">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Stage History</p>
                <div className="space-y-0">
                  {stageHistory.map((sh, i) => {
                    const ss = STAGE_STYLES[sh.stage] ?? STAGE_STYLES['New Inquiry']
                    const filledFields = Object.entries(sh.fields ?? {}).filter(([, v]) => v)
                    const isExpanded = expandedStages[i] ?? false
                    return (
                      <div key={i} className="flex gap-3 pb-3 relative">
                        {i < stageHistory.length - 1 && (
                          <div className="absolute left-2 top-5 bottom-0 w-px bg-gray-200" />
                        )}
                        <div className={`w-4 h-4 rounded-full shrink-0 mt-1 ${ss.dot} z-10`} />
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => setExpandedStages(p => ({ ...p, [i]: !p[i] }))}
                            className="w-full text-left group"
                          >
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ss.chip}`}>{sh.stage}</span>
                              <ChevronDown
                                size={11}
                                className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400">{sh.date} · by {sh.movedBy}</p>
                          </button>
                          {isExpanded && (
                            <div className="mt-1.5">
                              {filledFields.length > 0 ? (
                                <div className="bg-gray-50 rounded-lg border border-gray-100 p-2 space-y-1">
                                  {filledFields.map(([key, val]) => (
                                    <div key={key} className="flex items-start gap-1 text-[10px]">
                                      <span className="text-gray-400 shrink-0">{getFieldLabel(pipelines, lead.pipeline, sh.stage, key)}:</span>
                                      <span className="text-gray-700 font-medium break-all">{displayFieldValue(val)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-gray-400 italic px-1">No fields recorded for this stage</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-4">

              {/* ── Installation Actions Panel ────────────────────────── */}
              {lead.stage === 'Installation Visit' && (
                <div className="bg-white rounded-xl border-2 border-purple-200 p-4 shadow-card">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                      <Wrench size={15} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Installation Actions</p>
                    </div>
                  </div>

                  {/* STATE 1 — Not Started */}
                  {installStatus === 'not_started' && (
                    <>
                      <div className="space-y-0 mb-4">
                        <InfoRow label="Install Date" value={installDate} />
                        <InfoRow label="Install Time" value={installTime} />
                        <InfoRow label="Engineer"     value={engineerName} />
                      </div>
                      <Button className="w-full" icon={<Wrench size={14} />} onClick={() => setOtpOpen(true)}>
                        Start Installation
                      </Button>
                    </>
                  )}

                  {/* STATE 2 — In Progress */}
                  {installStatus === 'in_progress' && (
                    <>
                      {/* Live timer */}
                      <div className="text-center py-4 mb-3 bg-purple-50 border border-purple-100 rounded-xl">
                        <p className="text-3xl font-mono font-bold text-purple-700 tabular-nums">{formatTimer(elapsed)}</p>
                        <p className="text-xs text-purple-500 mt-1">Installation in progress</p>
                      </div>

                      <div className="space-y-0 mb-3">
                        <InfoRow label="Started at" value={installStartedAt} />
                        <InfoRow label="Engineer"   value={engineerName} />
                      </div>

                      {/* eKYC status */}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-xs font-medium ${
                        eKycComplete
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                          : 'bg-amber-50 border border-amber-200 text-amber-700'
                      }`}>
                        {eKycComplete
                          ? <CheckCircle size={13} className="shrink-0" />
                          : <AlertTriangle size={13} className="shrink-0" />
                        }
                        {eKycComplete ? '✅ eKYC Verified' : '⚠️ Complete eKYC before marking done'}
                      </div>

                      {/* Installation Done button (green when available) */}
                      <button
                        disabled={!eKycComplete}
                        onClick={() => setHwModalOpen(true)}
                        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400/40 ${
                          eKycComplete
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm cursor-pointer'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        Installation Done
                      </button>
                      {!eKycComplete && (
                        <p className="text-xs text-amber-600 text-center mt-2">Complete eKYC to enable this button</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Active Follow-up */}
              <div className="bg-white rounded-xl border border-surface-border p-4 shadow-card">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Active Follow-up</p>
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
              </div>

              <div className="bg-white rounded-xl border border-surface-border p-4 shadow-card">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Quick Stats</p>
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
              </div>
            </div>
          </div>
        )}

        {/* ─── FOLLOW-UPS ───────────────────────────────────────────── */}
        {activeTab === 'followups' && (
          <div className="p-6 max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-700">All Follow-ups</h2>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setFollowupOpen(true)}>Add Follow-up</Button>
            </div>
            <div className="space-y-3">
              {followups.map(fu => (
                <div key={fu.id} className="bg-white rounded-xl border border-surface-border p-4 shadow-card">
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
                        <Button size="xs" onClick={() => handleMarkFollowupComplete(fu.id)}>Complete</Button>
                        <Button size="xs" variant="secondary" onClick={() => setFollowupOpen(true)}>Reschedule</Button>
                        <Button size="xs" variant="danger" onClick={() => handleCancelFollowup(fu.id)}>Cancel</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
          <div className="p-6 max-w-3xl">
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

        {/* ─── ACTIVITY LOG ─────────────────────────────────────────── */}
        {activeTab === 'activity' && (
          <div className="p-6 max-w-2xl">
            <h2 className="text-sm font-bold text-gray-700 mb-4">Activity Log</h2>
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
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <MoveStageModal
        isOpen={moveStageOpen}
        onClose={() => { setMoveStageOpen(false); setMoveStageInitial('') }}
        lead={lead}
        pipelines={pipelines}
        initialStage={moveStageInitial}
        onSave={handleMoveStage}
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

      {/* Installation flow modals */}
      <OTPModal
        isOpen={otpOpen}
        onClose={() => setOtpOpen(false)}
        phone={lead.phone}
        onVerified={handleOTPVerified}
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
    </div>
  )
}

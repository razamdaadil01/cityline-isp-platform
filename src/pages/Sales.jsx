import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Phone, Edit3, Clock, TrendingUp,
  Users, CheckCircle2, XCircle, CalendarDays,
  PhoneCall, Search, X, HardDrive, Shield,
  Fingerprint, Send, AlertTriangle, Layers,
  CheckCircle, Loader2, Lock, Upload, FileText, BarChart2,
} from 'lucide-react'
import { getFormModules, subscribeFormModules } from '../data/customFormStore'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'

// ── Pipeline definitions ──────────────────────────────────────────────────────

const PIPELINES = {
  B2C: {
    label: 'B2C',
    labelFull: 'B2C Residential',
    stages: [
      'New Inquiry', 'Contacted', 'Follow-up', 'Site Survey',
      'Quotation Sent', 'Negotiation', 'Hardware Assignment', 'Won', 'Lost',
    ],
    tabActive: 'bg-brand-blue text-white',
    tabCount:  'bg-white/25 text-white',
    tabIdle:   'text-gray-600 hover:text-brand-blue',
  },
  B2B: {
    label: 'B2B',
    labelFull: 'B2B Corporate',
    stages: [
      'New Inquiry', 'Meeting Scheduled', 'Requirement Analysis',
      'Technical Feasibility', 'Commercial Proposal', 'Negotiation',
      'Legal/Agreement', 'Hardware Assignment', 'Won', 'Lost',
    ],
    // Required by default: Feasibility → Technical Feasibility, KYC → Requirement Analysis,
    // Package Assignment → Commercial Proposal, Advance Payment → Legal/Agreement
    requiredStages: ['Technical Feasibility', 'Requirement Analysis', 'Commercial Proposal', 'Legal/Agreement'],
    tabActive: 'bg-navy text-white',
    tabCount:  'bg-white/25 text-white',
    tabIdle:   'text-gray-600 hover:text-navy',
  },
  ILL: {
    label: 'ILL',
    labelFull: 'ILL Leased Line',
    stages: [
      'Inquiry', 'Site Survey', 'Feasibility Report', 'Pricing Approval',
      'SLA Agreement', 'Installation', 'Testing', 'Won', 'Lost',
    ],
    tabActive: 'bg-purple-600 text-white',
    tabCount:  'bg-white/25 text-white',
    tabIdle:   'text-gray-600 hover:text-purple-600',
  },
  Custom: {
    label: 'Custom',
    labelFull: 'Custom Pipeline',
    stages: ['New Inquiry', 'Contacted', 'Quotation', 'Won', 'Lost'],
    tabActive: 'bg-brand-orange text-white',
    tabCount:  'bg-white/25 text-white',
    tabIdle:   'text-gray-600 hover:text-brand-orange',
  },
}

// Visual style for every stage name used across all pipelines
const STAGE_STYLES = {
  'New Inquiry':           { colorBar: 'bg-blue-500',    chip: 'bg-blue-100 text-blue-700',      colBg: 'bg-blue-50/60',    border: 'border-blue-200'    },
  'Contacted':             { colorBar: 'bg-cyan-500',    chip: 'bg-cyan-100 text-cyan-700',      colBg: 'bg-cyan-50/60',    border: 'border-cyan-200'    },
  'Follow-up':             { colorBar: 'bg-purple-500',  chip: 'bg-purple-100 text-purple-700',  colBg: 'bg-purple-50/60',  border: 'border-purple-200'  },
  'Site Survey':           { colorBar: 'bg-amber-500',   chip: 'bg-amber-100 text-amber-700',    colBg: 'bg-amber-50/60',   border: 'border-amber-200'   },
  'Quotation Sent':        { colorBar: 'bg-orange-500',  chip: 'bg-orange-100 text-orange-700',  colBg: 'bg-orange-50/60',  border: 'border-orange-200'  },
  'Negotiation':           { colorBar: 'bg-pink-500',    chip: 'bg-pink-100 text-pink-700',      colBg: 'bg-pink-50/60',    border: 'border-pink-200'    },
  'Hardware Assignment':   { colorBar: 'bg-violet-500',  chip: 'bg-violet-100 text-violet-700',  colBg: 'bg-violet-50/60',  border: 'border-violet-200'  },
  'Won':                   { colorBar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700',colBg: 'bg-emerald-50/60', border: 'border-emerald-200' },
  'Lost':                  { colorBar: 'bg-red-400',     chip: 'bg-red-100 text-red-600',        colBg: 'bg-red-50/40',     border: 'border-red-200'     },
  // B2B specific
  'Meeting Scheduled':     { colorBar: 'bg-sky-500',     chip: 'bg-sky-100 text-sky-700',        colBg: 'bg-sky-50/60',     border: 'border-sky-200'     },
  'Requirement Analysis':  { colorBar: 'bg-indigo-500',  chip: 'bg-indigo-100 text-indigo-700',  colBg: 'bg-indigo-50/60',  border: 'border-indigo-200'  },
  'Technical Feasibility': { colorBar: 'bg-teal-500',    chip: 'bg-teal-100 text-teal-700',      colBg: 'bg-teal-50/60',    border: 'border-teal-200'    },
  'Commercial Proposal':   { colorBar: 'bg-orange-400',  chip: 'bg-orange-100 text-orange-600',  colBg: 'bg-orange-50/40',  border: 'border-orange-100'  },
  'Legal/Agreement':       { colorBar: 'bg-slate-500',   chip: 'bg-slate-100 text-slate-700',    colBg: 'bg-slate-50/60',   border: 'border-slate-200'   },
  // ILL specific
  'Inquiry':               { colorBar: 'bg-blue-400',    chip: 'bg-blue-100 text-blue-600',      colBg: 'bg-blue-50/40',    border: 'border-blue-100'    },
  'Feasibility Report':    { colorBar: 'bg-teal-400',    chip: 'bg-teal-100 text-teal-600',      colBg: 'bg-teal-50/40',    border: 'border-teal-100'    },
  'Pricing Approval':      { colorBar: 'bg-amber-400',   chip: 'bg-amber-100 text-amber-600',    colBg: 'bg-amber-50/40',   border: 'border-amber-100'   },
  'SLA Agreement':         { colorBar: 'bg-orange-500',  chip: 'bg-orange-100 text-orange-700',  colBg: 'bg-orange-50/60',  border: 'border-orange-200'  },
  'Installation':          { colorBar: 'bg-violet-400',  chip: 'bg-violet-100 text-violet-600',  colBg: 'bg-violet-50/40',  border: 'border-violet-100'  },
  'Testing':               { colorBar: 'bg-cyan-400',    chip: 'bg-cyan-100 text-cyan-600',      colBg: 'bg-cyan-50/40',    border: 'border-cyan-100'    },
  // Custom specific
  'Quotation':             { colorBar: 'bg-amber-500',   chip: 'bg-amber-100 text-amber-700',    colBg: 'bg-amber-50/60',   border: 'border-amber-200'   },
}

function getStageLabel(id) {
  if (id === 'Won')               return '🏆 Won'
  if (id === 'Hardware Assignment') return '🔧 HW Assignment'
  return id
}

// ── Other constants ───────────────────────────────────────────────────────────

const SOURCE_VARIANT = {
  'Walk-in':     'orange',
  'Referral':    'green',
  'Website':     'blue',
  'Cold Call':   'gray',
  'Social Media':'purple',
}

const STAFF = [
  { name: 'Arjun Kumar',  initials: 'AK', color: 'bg-brand-blue'   },
  { name: 'Preethi Nair', initials: 'PN', color: 'bg-purple-500'   },
  { name: 'Suresh Babu',  initials: 'SB', color: 'bg-emerald-500'  },
  { name: 'Anita Sharma', initials: 'AS', color: 'bg-brand-orange' },
]

const ENGINEERS = [
  { id: 'ENG-001', name: 'Ravi Technician',  dept: 'Field Engineering' },
  { id: 'ENG-002', name: 'Kumar Installer',  dept: 'Installation'      },
  { id: 'ENG-003', name: 'Sunil Networks',   dept: 'Networking'        },
  { id: 'ENG-004', name: 'Dinesh Fiber',     dept: 'Fiber Optics'      },
]

const EQUIPMENT = [
  { id: 'EQ-101', name: 'ONT Device – Huawei HG8310M', category: 'ONT',    stock: 12 },
  { id: 'EQ-102', name: 'WiFi Router – TP-Link AC1200', category: 'Router', stock: 8  },
  { id: 'EQ-103', name: 'ONU – ZTE F660',               category: 'ONU',    stock: 5  },
  { id: 'EQ-104', name: 'Cat6 Cable (50m roll)',         category: 'Cable',  stock: 20 },
  { id: 'EQ-105', name: 'Fiber Patch Panel 12-port',    category: 'Patch',  stock: 4  },
  { id: 'EQ-106', name: 'Media Converter – 1Gbps',      category: 'Switch', stock: 7  },
]

const PLANS   = ['50 Mbps Starter', '100 Mbps Home', '200 Mbps Pro', '500 Mbps Ultra']
const AREAS   = ['Koramangala', 'Indiranagar', 'Whitefield', 'HSR Layout', 'Electronic City', 'Marathahalli', 'BTM Layout']
const SOURCES = ['Walk-in', 'Referral', 'Website', 'Cold Call', 'Social Media']

// ── Initial leads (with pipeline field) ──────────────────────────────────────

const INIT_LEADS = [
  // B2C — 9 leads
  { id: 'LD-201', pipeline: 'B2C',    name: 'Ramesh Nair',     phone: '9876001122', email: '',                 area: 'Koramangala',     source: 'Website',      stage: 'New Inquiry',         plan: '100 Mbps Home',   assigned: 'Arjun Kumar',  assignedInitials: 'AK', assignedColor: 'bg-brand-blue',   daysInStage: 2,  lastActivity: 'Form submitted',       followUp: '2026-05-08', priority: 'high',   ekycStatus: null,       hwAssigned: null },
  { id: 'LD-202', pipeline: 'B2C',    name: 'Sunita Bose',     phone: '9765443322', email: 'sunita@email.com', area: 'Indiranagar',     source: 'Referral',     stage: 'Contacted',           plan: '200 Mbps Pro',    assigned: 'Preethi Nair', assignedInitials: 'PN', assignedColor: 'bg-purple-500',   daysInStage: 1,  lastActivity: 'Called – Interested',  followUp: '2026-05-09', priority: 'high',   ekycStatus: null,       hwAssigned: null },
  { id: 'LD-203', pipeline: 'B2C',    name: 'Harish Kulkarni', phone: '9988001133', email: '',                 area: 'Whitefield',      source: 'Walk-in',      stage: 'Site Survey',         plan: '50 Mbps Starter', assigned: 'Arjun Kumar',  assignedInitials: 'AK', assignedColor: 'bg-brand-blue',   daysInStage: 4,  lastActivity: 'Survey scheduled',     followUp: '2026-05-10', priority: 'medium', ekycStatus: 'Sent',     hwAssigned: null },
  { id: 'LD-205', pipeline: 'B2C',    name: 'Deepak Joshi',    phone: '9011556677', email: '',                 area: 'Electronic City', source: 'Cold Call',    stage: 'Follow-up',           plan: '100 Mbps Home',   assigned: 'Suresh Babu',  assignedInitials: 'SB', assignedColor: 'bg-emerald-500',  daysInStage: 6,  lastActivity: 'No answer – retry',    followUp: '2026-05-07', priority: 'medium', ekycStatus: null,       hwAssigned: null },
  { id: 'LD-206', pipeline: 'B2C',    name: 'Kavita Sharma',   phone: '9876543210', email: 'kavita@email.com', area: 'BTM Layout',      source: 'Referral',     stage: 'Quotation Sent',      plan: '200 Mbps Pro',    assigned: 'Anita Sharma', assignedInitials: 'AS', assignedColor: 'bg-brand-orange', daysInStage: 2,  lastActivity: 'Quote emailed',        followUp: '2026-05-11', priority: 'medium', ekycStatus: null,       hwAssigned: null },
  { id: 'LD-208', pipeline: 'B2C',    name: 'Lakshmi Devi',    phone: '9123456780', email: '',                 area: 'Koramangala',     source: 'Walk-in',      stage: 'Lost',                plan: '50 Mbps Starter', assigned: 'Preethi Nair', assignedInitials: 'PN', assignedColor: 'bg-purple-500',   daysInStage: 12, lastActivity: 'Not interested',       followUp: '',           priority: 'low',    ekycStatus: null,       hwAssigned: null },
  { id: 'LD-210', pipeline: 'B2C',    name: 'Rekha Menon',     phone: '9871234560', email: '',                 area: 'HSR Layout',      source: 'Referral',     stage: 'Contacted',           plan: '500 Mbps Ultra',  assigned: 'Anita Sharma', assignedInitials: 'AS', assignedColor: 'bg-brand-orange', daysInStage: 2,  lastActivity: 'WhatsApp sent',        followUp: '2026-05-09', priority: 'high',   ekycStatus: null,       hwAssigned: null },
  { id: 'LD-212', pipeline: 'B2C',    name: 'Pooja Nair',      phone: '9432109876', email: '',                 area: 'Electronic City', source: 'Social Media', stage: 'Follow-up',           plan: '100 Mbps Home',   assigned: 'Preethi Nair', assignedInitials: 'PN', assignedColor: 'bg-purple-500',   daysInStage: 5,  lastActivity: 'Missed call returned', followUp: '2026-05-07', priority: 'medium', ekycStatus: null,       hwAssigned: null },
  { id: 'LD-213', pipeline: 'B2C',    name: 'Mohan Das',       phone: '9345678901', email: 'mohan@email.com',  area: 'BTM Layout',      source: 'Walk-in',      stage: 'New Inquiry',         plan: '50 Mbps Starter', assigned: 'Suresh Babu',  assignedInitials: 'SB', assignedColor: 'bg-emerald-500',  daysInStage: 0,  lastActivity: 'Walked in today',      followUp: '2026-05-09', priority: 'medium', ekycStatus: null,       hwAssigned: null },
  // B2B — 3 leads
  { id: 'LD-204', pipeline: 'B2B',    name: 'Meena Iyer',      phone: '9123887766', email: 'meena@email.com',  area: 'HSR Layout',      source: 'Social Media', stage: 'Commercial Proposal', plan: '500 Mbps Ultra',  assigned: 'Preethi Nair', assignedInitials: 'PN', assignedColor: 'bg-purple-500',   daysInStage: 3,  lastActivity: 'Proposal reviewed',    followUp: '2026-05-07', priority: 'high',   ekycStatus: null,       hwAssigned: null },
  { id: 'LD-207', pipeline: 'B2B',    name: 'Arun Pillai',     phone: '9087654321', email: '',                 area: 'Marathahalli',    source: 'Website',      stage: 'Hardware Assignment', plan: '100 Mbps Home',   assigned: 'Arjun Kumar',  assignedInitials: 'AK', assignedColor: 'bg-brand-blue',   daysInStage: 1,  lastActivity: 'HW pending assignment',followUp: '',           priority: 'medium', ekycStatus: 'Completed', hwAssigned: null },
  { id: 'LD-214', pipeline: 'B2B',    name: 'Divya Krishnan',  phone: '9876001234', email: 'divya@email.com',  area: 'Koramangala',     source: 'Referral',     stage: 'Meeting Scheduled',  plan: '200 Mbps Pro',    assigned: 'Anita Sharma', assignedInitials: 'AS', assignedColor: 'bg-brand-orange', daysInStage: 1,  lastActivity: 'Meeting confirmed',    followUp: '2026-05-08', priority: 'high',   ekycStatus: null,       hwAssigned: null },
  // ILL — 2 leads
  { id: 'LD-211', pipeline: 'ILL',    name: 'Sanjay Rao',      phone: '9654321098', email: 'sanjay@email.com', area: 'Whitefield',      source: 'Website',      stage: 'Feasibility Report',  plan: '200 Mbps Pro',    assigned: 'Arjun Kumar',  assignedInitials: 'AK', assignedColor: 'bg-brand-blue',   daysInStage: 3,  lastActivity: 'Feasibility submitted',followUp: '2026-05-10', priority: 'high',   ekycStatus: null,       hwAssigned: null },
  { id: 'LD-215', pipeline: 'ILL',    name: 'Ravi Shankar',    phone: '9012345678', email: '',                 area: 'Marathahalli',    source: 'Cold Call',    stage: 'Testing',             plan: '500 Mbps Ultra',  assigned: 'Arjun Kumar',  assignedInitials: 'AK', assignedColor: 'bg-brand-blue',   daysInStage: 0,  lastActivity: 'Testing in progress',  followUp: '',           priority: 'low',    ekycStatus: 'Completed', hwAssigned: null },
  // Custom — 1 lead
  { id: 'LD-209', pipeline: 'Custom', name: 'Vinod Kumar',     phone: '9988776655', email: 'vinod@email.com',  area: 'Indiranagar',     source: 'Cold Call',    stage: 'Quotation',           plan: '200 Mbps Pro',    assigned: 'Suresh Babu',  assignedInitials: 'SB', assignedColor: 'bg-emerald-500',  daysInStage: 0,  lastActivity: 'Quotation sent',       followUp: '2026-05-08', priority: 'low',    ekycStatus: null,       hwAssigned: null },
]

const INIT_FORM = {
  pipeline: 'B2C',
  name: '', phone: '', email: '', area: '', source: '',
  plan: '', assigned: '', followUp: '', notes: '',
  kycDocs: {},
}

const EKYC_STATUS_BADGE = { Pending: 'yellow', Sent: 'blue', Completed: 'green', Failed: 'red' }

// ── eKYC Modal (Digio flow) ──────────────────────────────────────────────────

function EkycModal({ isOpen, onClose, lead, onSave }) {
  const [form, setForm] = useState({
    aadhaar: '',
    sendVia: 'Email',
    email: lead?.email ?? '',
    phone: lead?.phone ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function handleSend() {
    if (!form.aadhaar.replace(/\s/g, '').match(/^\d{12}$/)) return
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); setSent(true); onSave('Sent') }, 1500)
  }

  if (sent) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="eKYC Request Sent" size="sm"
        footer={<Button onClick={onClose}>Done</Button>}
      >
        <div className="text-center py-6">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-emerald-600" />
          </div>
          <p className="font-semibold text-gray-900 mb-1">eKYC Request Sent via Digio</p>
          <p className="text-sm text-gray-500">
            Sent to {lead?.name} via{' '}
            <strong>{form.sendVia === 'Email' ? form.email : form.phone}</strong>
          </p>
          <div className="mt-4 bg-gray-50 rounded-lg p-3 text-left">
            <p className="text-xs text-gray-500 font-semibold mb-1">Timeline</p>
            <div className="space-y-1">
              {[
                { time: 'Now',     event: 'Request created on Digio' },
                { time: 'Now',     event: `${form.sendVia} sent to customer` },
                { time: 'Pending', event: 'Customer completes Aadhaar OTP verification' },
                { time: 'Pending', event: 'Digio webhook confirmation received' },
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                  <span className={`font-semibold shrink-0 ${t.time === 'Now' ? 'text-emerald-600' : 'text-gray-400'}`}>{t.time}</span>
                  <span>{t.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`eKYC Request — ${lead?.name}`} size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            onClick={handleSend}
            disabled={submitting || !form.aadhaar.replace(/\s/g, '').match(/^\d{12}$/)}>
            {submitting ? 'Sending…' : 'Send eKYC Request'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-brand-blue/5 border border-brand-blue/20 rounded-lg">
          <Fingerprint size={18} className="text-brand-blue shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-brand-blue">Powered by Digio</p>
            <p className="text-xs text-gray-500">Customer will verify their Aadhaar via OTP through the Digio platform</p>
          </div>
        </div>
        <FormField label="Customer Name">
          <Input value={lead?.name ?? ''} disabled className="bg-gray-50 text-gray-500" />
        </FormField>
        <FormField label="Aadhaar Number" required>
          <Input
            value={form.aadhaar}
            onChange={e => {
              const raw = e.target.value.replace(/\D/g, '').slice(0, 12)
              set('aadhaar', raw.replace(/(\d{4})(?=\d)/g, '$1 ').trim())
            }}
            placeholder="XXXX XXXX XXXX"
            className="font-mono tracking-widest"
          />
          {form.aadhaar && !form.aadhaar.replace(/\s/g, '').match(/^\d{12}$/) && (
            <p className="text-xs text-red-500 mt-1">Enter a valid 12-digit Aadhaar number</p>
          )}
        </FormField>
        <FormField label="Send Via" required>
          <div className="flex gap-4 mt-1">
            {['Email', 'WhatsApp'].map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={opt} checked={form.sendVia === opt}
                  onChange={() => set('sendVia', opt)} className="accent-brand-blue" />
                <span className="text-sm font-medium text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        </FormField>
        {form.sendVia === 'Email' ? (
          <FormField label="Customer Email">
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="customer@email.com" />
          </FormField>
        ) : (
          <FormField label="Customer WhatsApp">
            <Input type="tel" value={form.phone}
              onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" />
          </FormField>
        )}
        {lead?.ekycStatus && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Current status:</span>
            <Badge variant={EKYC_STATUS_BADGE[lead.ekycStatus] ?? 'gray'} size="sm">{lead.ekycStatus}</Badge>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Hardware Assignment Modal ─────────────────────────────────────────────────

function HardwareAssignModal({ isOpen, onClose, lead, onConfirm }) {
  const [engineer, setEngineer]   = useState('')
  const [equipment, setEquipment] = useState('')
  const [confirming, setConfirming] = useState(false)

  const selectedEng = ENGINEERS.find(e => e.id === engineer)
  const selectedEq  = EQUIPMENT.find(e => e.id === equipment)

  function handleConfirm() {
    if (!engineer || !equipment) return
    onConfirm({
      engineerId:    engineer,
      engineerName:  selectedEng?.name,
      equipmentId:   equipment,
      equipmentName: selectedEq?.name,
      assignedAt:    new Date().toISOString(),
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Hardware — ${lead?.name}`} size="md"
      footer={!confirming ? (
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={<HardDrive size={14} />} onClick={() => setConfirming(true)} disabled={!engineer || !equipment}>Assign</Button>
        </>
      ) : (
        <>
          <Button variant="secondary" onClick={() => setConfirming(false)}>Back</Button>
          <Button variant="orange" icon={<CheckCircle2 size={14} />} onClick={handleConfirm}>Confirm Assignment</Button>
        </>
      )}
    >
      {!confirming ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-violet-50 border border-violet-200 rounded-lg">
            <Shield size={18} className="text-violet-600 shrink-0 mt-0.5" />
            <p className="text-xs text-violet-700 font-medium">
              Hardware assignment is restricted to Inventory role only. Engineer ID will be auto-tagged to the equipment record.
            </p>
          </div>
          <FormField label="Select Engineer" required>
            <Select value={engineer} onChange={e => setEngineer(e.target.value)}>
              <option value="">Choose engineer…</option>
              {ENGINEERS.map(eng => <option key={eng.id} value={eng.id}>{eng.name} ({eng.id}) — {eng.dept}</option>)}
            </Select>
          </FormField>
          <FormField label="Select Equipment" required>
            <Select value={equipment} onChange={e => setEquipment(e.target.value)}>
              <option value="">Choose equipment…</option>
              {EQUIPMENT.map(eq => <option key={eq.id} value={eq.id}>{eq.name} · Stock: {eq.stock}</option>)}
            </Select>
          </FormField>
          {engineer && equipment && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <p className="font-semibold text-gray-700 text-xs uppercase tracking-wider mb-2">Preview</p>
              {[['Engineer', `${selectedEng?.name} · ${engineer}`], ['Equipment', selectedEq?.name], ['Lead', `${lead?.name} (${lead?.id})`]].map(([l, v]) => (
                <div key={l} className="flex justify-between text-xs">
                  <span className="text-gray-500">{l}</span>
                  <span className="font-semibold text-gray-800">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">Please confirm — this will deduct equipment from inventory and notify the engineer.</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {[['Lead', `${lead?.name} (${lead?.id})`], ['Engineer', `${selectedEng?.name} · ${engineer}`], ['Department', selectedEng?.dept], ['Equipment', selectedEq?.name], ['Equipment ID', equipment]].map(([l, v]) => (
              <div key={l} className="flex justify-between text-sm">
                <span className="text-gray-500">{l}</span>
                <span className="font-semibold text-gray-900">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Lead card ─────────────────────────────────────────────────────────────────

function LeadCard({ lead, onDragStart, onDragEnd, isDragging, onEdit, onEkyc, onAssignHw, userRole }) {
  const urgentFollowUp = lead.followUp && lead.followUp <= '2026-05-15'
  const isHwStage  = lead.stage === 'Hardware Assignment'
  const canAssignHw = userRole === 'inventory'

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-xl border border-surface-border p-4 shadow-card cursor-grab active:cursor-grabbing select-none transition-all ${
        isDragging ? 'opacity-40 scale-95' : 'hover:shadow-card-hover hover:-translate-y-0.5'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{lead.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{lead.area}</p>
        </div>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${lead.assignedColor}`}>
          {lead.assignedInitials}
        </div>
      </div>

      <p className="text-xs font-mono text-gray-600 mb-3">{lead.phone}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <Badge variant={SOURCE_VARIANT[lead.source] ?? 'gray'} size="sm">{lead.source}</Badge>
        {lead.plan && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-navy/10 text-navy">{lead.plan}</span>
        )}
        {lead.ekycStatus && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            lead.ekycStatus === 'Completed' ? 'bg-emerald-100 text-emerald-700'
            : lead.ekycStatus === 'Failed'  ? 'bg-red-100 text-red-600'
            : lead.ekycStatus === 'Sent'    ? 'bg-blue-100 text-blue-700'
            : 'bg-yellow-100 text-yellow-700'
          }`}>
            <Fingerprint size={9} /> {lead.ekycStatus}
          </span>
        )}
        {(() => {
          const docs = lead.kycDocs ?? {}
          const n = ['aadhaar', 'panCard', 'customerPhoto'].filter(k => docs[k]).length
          if (!n) return null
          return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              n === 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <FileText size={9} /> {n === 3 ? 'KYC Docs ✓' : 'Docs Pending'}
            </span>
          )
        })()}
      </div>

      {lead.hwAssigned && (
        <div className="flex items-center gap-1.5 text-[11px] text-violet-600 bg-violet-50 rounded-lg px-2 py-1.5 mb-3 border border-violet-200">
          <HardDrive size={11} />
          <span className="font-medium truncate">{lead.hwAssigned.equipmentName}</span>
          <span className="text-violet-400">·</span>
          <span>{lead.hwAssigned.engineerName?.split(' ')[0]}</span>
        </div>
      )}

      <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {lead.daysInStage === 0 ? 'Today' : `${lead.daysInStage}d in stage`}
        </span>
        {lead.followUp && (
          <span className={`flex items-center gap-1 font-medium ${urgentFollowUp ? 'text-brand-orange' : 'text-gray-500'}`}>
            <CalendarDays size={11} /> {lead.followUp}
          </span>
        )}
      </div>

      <p className="text-[11px] text-gray-400 italic mb-3 truncate">{lead.lastActivity}</p>

      {isHwStage && (
        <div className={`mb-3 p-2 rounded-lg border text-center ${canAssignHw ? 'border-violet-200 bg-violet-50' : 'border-gray-200 bg-gray-50'}`}>
          {canAssignHw ? (
            <button onClick={e => { e.stopPropagation(); onAssignHw(lead) }}
              className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-violet-700 hover:text-violet-900 transition-colors">
              <HardDrive size={12} /> Assign Hardware
            </button>
          ) : (
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
              <Shield size={11} /> Inventory role only
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 pt-2 border-t border-surface-border">
        <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold text-gray-600 hover:text-brand-blue hover:bg-brand-blue/5 rounded-lg transition-colors">
          <Phone size={12} /> Call
        </a>
        <button onClick={e => { e.stopPropagation(); onEkyc(lead) }}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold text-gray-600 hover:text-brand-blue hover:bg-brand-blue/5 rounded-lg transition-colors">
          <Fingerprint size={12} /> eKYC
        </button>
        <button onClick={e => { e.stopPropagation(); onEdit(lead) }}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold text-gray-600 hover:text-brand-orange hover:bg-brand-orange/5 rounded-lg transition-colors">
          <Edit3 size={12} /> Edit
        </button>
      </div>
    </div>
  )
}

// ── Create / Edit Lead Modal ──────────────────────────────────────────────────

function LeadModal({ isOpen, onClose, onSave, initial, defaultPipeline, formModules = {} }) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState(
    initial
      ? { ...initial, kycDocs: initial.kycDocs ?? {} }
      : { ...INIT_FORM, pipeline: defaultPipeline ?? 'B2C', customData: {} }
  )

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function handlePipelineChange(pl) {
    setForm(p => ({ ...p, pipeline: pl }))
  }

  const pl = PIPELINES[form.pipeline] ?? PIPELINES.B2C

  function handleSave() {
    if (!form.name.trim() || !form.phone.match(/^\d{10}$/)) return
    const staff = STAFF.find(s => s.name === form.assigned)
    onSave({
      ...form,
      id:               isEdit ? initial.id : `LD-${Date.now()}`,
      stage:            isEdit ? initial.stage : pl.stages[0],
      daysInStage:      isEdit ? initial.daysInStage : 0,
      lastActivity:     isEdit ? initial.lastActivity : 'Lead created',
      assignedInitials: staff?.initials ?? '??',
      assignedColor:    staff?.color ?? 'bg-gray-400',
      priority:         'medium',
      ekycStatus:       isEdit ? initial.ekycStatus : null,
      hwAssigned:       isEdit ? initial.hwAssigned : null,
    })
    onClose()
  }

  const PIPELINE_TAB_STYLE = {
    B2C:    { active: 'bg-brand-blue text-white',   idle: 'text-gray-600 hover:bg-gray-100' },
    B2B:    { active: 'bg-navy text-white',         idle: 'text-gray-600 hover:bg-gray-100' },
    ILL:    { active: 'bg-purple-600 text-white',   idle: 'text-gray-600 hover:bg-gray-100' },
    Custom: { active: 'bg-brand-orange text-white', idle: 'text-gray-600 hover:bg-gray-100' },
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={isEdit ? `Edit Lead — ${initial.name}` : 'Create New Lead'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{isEdit ? 'Save Changes' : 'Create Lead'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* ── Pipeline selector ── */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Pipeline <span className="text-red-400">*</span></p>
          <div className="flex gap-2">
            {Object.keys(PIPELINES).map(key => {
              const style = PIPELINE_TAB_STYLE[key]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => !isEdit && handlePipelineChange(key)}
                  disabled={isEdit}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
                    form.pipeline === key
                      ? `${style.active} border-transparent shadow-sm`
                      : `${style.idle} border-surface-border ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}`
                  }`}
                >
                  {key}
                </button>
              )
            })}
          </div>
          {/* Pipeline hint */}
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            <span className="font-semibold text-gray-600">{pl.labelFull}</span>
            <span>·</span>
            <span>{pl.stages.length} stages</span>
            <span>·</span>
            <span>starts at <strong className="text-gray-600">{pl.stages[0]}</strong></span>
          </p>
        </div>

        {/* ── Lead fields ── */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Full Name" required>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ramesh Nair" />
          </FormField>
          <FormField label="Phone Number" required>
            <Input type="tel" value={form.phone}
              onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" />
          </FormField>
          <FormField label="Email Address">
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="ramesh@email.com" />
          </FormField>
          <FormField label="Area">
            <Select value={form.area} onChange={e => set('area', e.target.value)}>
              <option value="">Select Area</option>
              {AREAS.map(a => <option key={a}>{a}</option>)}
            </Select>
          </FormField>
          <FormField label="Lead Source">
            <Select value={form.source} onChange={e => set('source', e.target.value)}>
              <option value="">Select Source</option>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
          <FormField label="Interested Plan">
            <Select value={form.plan} onChange={e => set('plan', e.target.value)}>
              <option value="">Select Plan</option>
              {PLANS.map(p => <option key={p}>{p}</option>)}
            </Select>
          </FormField>
          <FormField label="Assigned To">
            <Select value={form.assigned} onChange={e => set('assigned', e.target.value)}>
              <option value="">Select Sales Rep</option>
              {STAFF.map(s => <option key={s.name}>{s.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Follow-up Date">
            <Input type="date" value={form.followUp} onChange={e => set('followUp', e.target.value)} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Notes">
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Any additional notes about this lead…" rows={3} />
            </FormField>
          </div>
        </div>

        {/* ── Custom form fields from Form Builder ── */}
        {(() => {
          const customFields = formModules[form.pipeline]?.fields ?? []
          if (customFields.length === 0) return null
          return (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px bg-surface-border" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
                  {form.pipeline} Custom Fields
                </span>
                <div className="flex-1 h-px bg-surface-border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {customFields.map(field => {
                  const val = form.customData?.[field.id] ?? ''
                  const setVal = v => setForm(p => ({ ...p, customData: { ...(p.customData ?? {}), [field.id]: v } }))
                  return (
                    <FormField key={field.id} label={field.label} required={field.required}>
                      {(field.type === 'Text' || field.type === 'Number' || field.type === 'Phone' || field.type === 'Email' || field.type === 'Date') && (
                        <Input
                          type={field.type === 'Number' ? 'number' : field.type === 'Phone' ? 'tel' : field.type === 'Email' ? 'email' : field.type === 'Date' ? 'date' : 'text'}
                          value={val}
                          onChange={e => setVal(e.target.value)}
                          placeholder={field.placeholder}
                        />
                      )}
                      {field.type === 'Textarea' && (
                        <Textarea value={val} onChange={e => setVal(e.target.value)} placeholder={field.placeholder} rows={2} />
                      )}
                      {(field.type === 'Dropdown' || field.type === 'Multi-select') && (
                        <Select value={val} onChange={e => setVal(e.target.value)}>
                          <option value="">Select…</option>
                          {(field.options ?? []).map(o => <option key={o}>{o}</option>)}
                        </Select>
                      )}
                      {field.type === 'Yes/No Toggle' && (
                        <div className="flex gap-2 mt-1">
                          {['Yes', 'No'].map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setVal(opt)}
                              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
                                val === opt
                                  ? 'bg-brand-blue text-white border-transparent'
                                  : 'border-surface-border text-gray-600 hover:border-brand-blue/40'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                      {field.type === 'File Upload' && (
                        <Input type="file" value={val} onChange={e => setVal(e.target.value)} />
                      )}
                    </FormField>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* ── KYC Documents ── */}
        <KycSection
          kycDocs={form.kycDocs ?? {}}
          onChange={docs => set('kycDocs', docs)}
        />
      </div>
    </Modal>
  )
}

// ── Required Stage Warning Modal ──────────────────────────────────────────────

function RequiredStageModal({ isOpen, onClose, stageName }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Required Stage Incomplete"
      size="sm"
      footer={<Button onClick={onClose}>Got it</Button>}
    >
      <div className="flex gap-3 items-start">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
          <AlertTriangle size={20} className="text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 mb-1">Cannot skip required stage</p>
          <p className="text-sm text-gray-600">
            Complete <strong className="text-navy">{stageName}</strong> before proceeding to the next stage.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Required stages ensure all mandatory checks are completed before a lead advances.
          </p>
        </div>
      </div>
    </Modal>
  )
}

// ── KYC Document Upload Section ───────────────────────────────────────────────

function KycSection({ kycDocs = {}, onChange }) {
  const DOCS = [
    { key: 'aadhaar',       label: 'Aadhaar Card',    accept: 'image/*,.pdf' },
    { key: 'panCard',       label: 'PAN Card',         accept: 'image/*,.pdf' },
    { key: 'customerPhoto', label: 'Customer Photo',   accept: 'image/*'      },
  ]

  function handleFile(key, file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev =>
      onChange({ ...kycDocs, [key]: { name: file.name, size: file.size, type: file.type, preview: ev.target.result } })
    reader.readAsDataURL(file)
  }

  function remove(key) {
    const next = { ...kycDocs }
    delete next[key]
    onChange(next)
  }

  function fmtSize(b) {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-px bg-surface-border" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 flex items-center gap-1.5">
          <FileText size={11} /> KYC Documents
        </span>
        <div className="flex-1 h-px bg-surface-border" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {DOCS.map(({ key, label, accept }) => {
          const doc = kycDocs[key]
          const isPdf = doc?.type === 'application/pdf'
          return (
            <div key={key} className="relative border-2 border-dashed border-surface-border rounded-xl p-3 hover:border-brand-blue/40 transition-colors">
              {doc ? (
                <>
                  {isPdf ? (
                    <div className="w-full h-16 bg-red-50 rounded-lg flex items-center justify-center mb-2">
                      <FileText size={24} className="text-red-400" />
                    </div>
                  ) : (
                    <img src={doc.preview} alt={label} className="w-full h-16 object-cover rounded-lg mb-2" />
                  )}
                  <p className="text-[11px] font-semibold text-gray-700 truncate">{doc.name}</p>
                  <p className="text-[10px] text-gray-400">{fmtSize(doc.size)}</p>
                  <button type="button" onClick={() => remove(key)}
                    className="absolute top-2 right-2 w-5 h-5 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center transition-colors">
                    <X size={10} className="text-red-600" />
                  </button>
                </>
              ) : (
                <label className="cursor-pointer block text-center">
                  <input type="file" accept={accept} className="sr-only"
                    onChange={e => handleFile(key, e.target.files?.[0])} />
                  <Upload size={20} className="text-gray-300 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-gray-700 mb-0.5">{label}</p>
                  <p className="text-[10px] text-gray-400">{accept.includes('pdf') ? 'Image / PDF' : 'Image only'}</p>
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-brand-blue/10 text-brand-blue rounded-full text-[10px] font-semibold">
                    <Upload size={9} /> Browse
                  </div>
                </label>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Won Conversion Modals ─────────────────────────────────────────────────────

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
    { title: 'Customer Created',    desc: `${data?.customerName ?? ''} — ${data?.customerId ?? ''}`,   action: 'View Customer', icon: '👤', bg: 'bg-blue-50 border-blue-200'                                                         },
    { title: 'CAF Form',            desc: 'Ready to fill',                                              action: 'Open CAF',      icon: '📋', bg: 'bg-purple-50 border-purple-200'                                                     },
    { title: 'KYC Status',          desc: data?.kycStatus === 'Completed' ? 'Completed ✅' : 'Pending ⚠️', action: data?.kycStatus === 'Completed' ? 'View KYC' : 'Complete KYC', icon: data?.kycStatus === 'Completed' ? '✅' : '⚠️', bg: data?.kycStatus === 'Completed' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200' },
    { title: 'Installation Ticket', desc: `#${data?.ticketId ?? ''} Created`,                           action: 'View Ticket',   icon: '🔧', bg: 'bg-orange-50 border-orange-200'                                                    },
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
            <div className="flex items-start gap-2.5 mb-3">
              <span className="text-2xl leading-none">{card.icon}</span>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900">{card.title}</p>
                <p className="text-xs text-gray-600 mt-0.5 break-words">{card.desc}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="w-full">{card.action}</Button>
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Sales() {
  const [leads, setLeads]               = useState(INIT_LEADS)
  const [activePipeline, setActivePipeline] = useState('B2C')
  const [draggingId, setDraggingId]     = useState(null)
  const [dragOverStage, setDragOverStage] = useState(null)
  const [showModal, setShowModal]       = useState(false)
  const [editLead, setEditLead]         = useState(null)
  const [ekycLead, setEkycLead]         = useState(null)
  const [hwLead, setHwLead]             = useState(null)
  const [search, setSearch]             = useState('')
  const [requiredStageWarning, setRequiredStageWarning] = useState(null) // { stageName }
  const [formModules, setFormModules]   = useState(getFormModules())
  const [wonConversionLead, setWonConversionLead] = useState(null)
  const [wonSuccessData, setWonSuccessData]       = useState(null)
  const navigate                        = useNavigate()
  const userRole                        = 'sales'

  useEffect(() => subscribeFormModules(setFormModules), [])

  const pl            = PIPELINES[activePipeline]
  const pipelineLeads = leads.filter(l => l.pipeline === activePipeline)
  console.log('[Sales] render — activePipeline:', activePipeline, '| pipelineLeads:', pipelineLeads.length)

  // ── Drag and drop ────────────────────────────────────────────────────────
  function handleDragStart(e, id) { setDraggingId(id); e.dataTransfer.effectAllowed = 'move' }
  function handleDragEnd()        { setDraggingId(null); setDragOverStage(null) }

  function handleDragOver(e, stageId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverStage !== stageId) setDragOverStage(stageId)
  }

  function handleDrop(e, targetStage) {
    e.preventDefault()
    if (draggingId) {
      const lead = leads.find(l => l.id === draggingId)
      if (lead && lead.stage !== targetStage) {
        const plDef = PIPELINES[lead.pipeline]
        const reqStages = plDef.requiredStages ?? []

        if (reqStages.length > 0) {
          const fromIdx = plDef.stages.indexOf(lead.stage)
          const toIdx   = plDef.stages.indexOf(targetStage)

          // Only block forward jumps that skip required stages
          if (toIdx > fromIdx + 1) {
            const skipped   = plDef.stages.slice(fromIdx + 1, toIdx)
            const blockedBy = skipped.find(s => reqStages.includes(s))
            if (blockedBy) {
              setRequiredStageWarning({ stageName: blockedBy })
              setDraggingId(null)
              setDragOverStage(null)
              return
            }
          }
        }

        // Intercept Won drops — show conversion confirmation
        if (targetStage === 'Won') {
          setWonConversionLead(lead)
          setDraggingId(null)
          setDragOverStage(null)
          return
        }
      }

      setLeads(prev => prev.map(l =>
        l.id === draggingId && l.stage !== targetStage
          ? { ...l, stage: targetStage, daysInStage: 0, lastActivity: `Moved to ${targetStage}` }
          : l
      ))
    }
    setDraggingId(null)
    setDragOverStage(null)
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStage(null)
  }

  // ── Lead CRUD ────────────────────────────────────────────────────────────
  function saveLead(lead) {
    setLeads(prev => {
      const exists = prev.find(l => l.id === lead.id)
      return exists ? prev.map(l => l.id === lead.id ? lead : l) : [lead, ...prev]
    })
  }

  function saveEkycStatus(leadId, status) {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ekycStatus: status, lastActivity: `eKYC ${status}` } : l))
  }

  function saveHwAssignment(leadId, hw) {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, hwAssigned: hw, lastActivity: `HW assigned: ${hw.equipmentName}` } : l))
  }

  // ── Derived stats (scoped to active pipeline) ────────────────────────────
  const wonCount       = pipelineLeads.filter(l => l.stage === 'Won').length
  const lostCount      = pipelineLeads.filter(l => l.stage === 'Lost').length
  const activeCount    = pipelineLeads.filter(l => !['Won', 'Lost'].includes(l.stage)).length
  const todayFollowUps = pipelineLeads.filter(l => l.followUp === '2026-05-15').length

  const filteredLeads = search.trim()
    ? pipelineLeads.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search) ||
        l.area.toLowerCase().includes(search.toLowerCase())
      )
    : pipelineLeads

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 space-y-4 shrink-0">

        {/* Title row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sales Pipeline</h1>
            <p className="text-sm text-gray-500 mt-0.5">Drag cards between stages to update lead progress</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Role toggle */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs">
              <button className="px-3 py-1 rounded-md font-semibold capitalize transition-all bg-white text-gray-900 shadow-sm">
                📊 Sales
              </button>
              <button onClick={() => navigate('/sales/hw-assignment')}
                className="px-3 py-1 rounded-md font-semibold capitalize transition-all text-gray-500 hover:text-gray-700">
                🔧 Inventory
              </button>
            </div>
            <Link to="/sales/followups">
              <Button variant="secondary" size="sm" icon={<PhoneCall size={14} />}>
                Follow-ups
                {todayFollowUps > 0 && (
                  <span className="ml-1 bg-brand-orange text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{todayFollowUps}</span>
                )}
              </Button>
            </Link>
            <Link to="/sales/pipelines">
              <Button variant="secondary" size="sm" icon={<Layers size={14} />}>Pipelines</Button>
            </Link>
            <Link to="/sales/analytics">
              <Button variant="secondary" size="sm" icon={<BarChart2 size={14} />}>Analytics</Button>
            </Link>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditLead(null); setShowModal(true) }}>
              Add Lead
            </Button>
          </div>
        </div>

        {/* ── Pipeline tabs ────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border-2 border-orange-500 w-fit shadow-sm">
          {Object.entries(PIPELINES).map(([key, config]) => {
            const count    = leads.filter(l => l.pipeline === key).length
            const isActive = activePipeline === key
            // Use inline styles for active bg to guarantee the custom brand
            // colors render regardless of Tailwind JIT class scanning
            const ACTIVE_BG = {
              B2C:    '#0A8DCD',
              B2B:    '#0F2744',
              ILL:    '#7c3aed',
              Custom: '#E8541A',
            }
            return (
              <button
                key={key}
                onClick={() => { setActivePipeline(key); setSearch(''); console.log('[Sales] activePipeline →', key) }}
                style={isActive ? { backgroundColor: ACTIVE_BG[key], color: '#fff' } : {}}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'shadow-sm text-white'
                    : 'bg-transparent text-gray-600 hover:bg-gray-100'
                }`}
              >
                {config.label}
                <span
                  style={isActive ? { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' } : {}}
                  className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                    isActive ? '' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── KPI cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total Leads',      value: pipelineLeads.length, icon: Users,        color: 'text-gray-700',     bg: 'bg-gray-100'        },
            { label: 'Active',           value: activeCount,          icon: TrendingUp,   color: 'text-brand-blue',   bg: 'bg-brand-blue/10'   },
            { label: 'Today Follow-ups', value: todayFollowUps,       icon: CalendarDays, color: 'text-brand-orange', bg: 'bg-brand-orange/10' },
            { label: 'Won This Month',   value: wonCount,             icon: CheckCircle2, color: 'text-emerald-700',  bg: 'bg-emerald-100'     },
            { label: 'Lost',             value: lostCount,            icon: XCircle,      color: 'text-red-600',      bg: 'bg-red-100'         },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-white rounded-xl border border-surface-border shadow-card px-4 py-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                  <Icon size={18} className={s.color} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-[11px] text-gray-500 leading-tight">{s.label}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Search ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${pl.label} leads…`}
              className="pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white w-full focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          {search && <span className="text-sm text-gray-500">{filteredLeads.length} result{filteredLeads.length !== 1 ? 's' : ''}</span>}
        </div>
      </div>

      {/* ── Kanban board ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6">
        <div className="flex gap-3 h-full" style={{ minWidth: `${pl.stages.length * 260}px` }}>
          {pl.stages.map(stageId => {
            const style      = STAGE_STYLES[stageId] ?? STAGE_STYLES['New Inquiry']
            const stageLeads = filteredLeads.filter(l => l.stage === stageId)
            const isOver     = dragOverStage === stageId
            const isHwStage  = stageId === 'Hardware Assignment'
            const isRequired = (pl.requiredStages ?? []).includes(stageId)

            return (
              <div key={stageId}
                className={`flex flex-col rounded-xl border transition-all duration-150 ${style.colBg} ${style.border} ${
                  isOver ? 'ring-2 ring-brand-blue/50 scale-[1.01]' : ''
                } ${isHwStage ? 'ring-1 ring-violet-300' : ''}`}
                style={{ width: 252, minWidth: 252 }}
                onDragOver={e => handleDragOver(e, stageId)}
                onDrop={e => handleDrop(e, stageId)}
                onDragLeave={handleDragLeave}
              >
                {/* Column header */}
                <div className="px-3 pt-3 pb-2.5 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${style.colorBar}`} />
                      <span className="text-xs font-bold text-gray-700">{getStageLabel(stageId)}</span>
                      {isRequired && (
                        <span title="Required stage — cannot be skipped" className="text-amber-500">
                          <Lock size={10} className="shrink-0" />
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.chip}`}>{stageLeads.length}</span>
                  </div>
                  {isHwStage && (
                    <p className="text-[10px] text-violet-500 mt-1 flex items-center gap-1">
                      <Shield size={10} /> Inventory role only
                    </p>
                  )}
                </div>

                {isOver && draggingId && (
                  <div className="mx-3 mb-2 h-1.5 rounded-full bg-brand-blue/40 animate-pulse" />
                )}

                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2.5 scrollbar-hide">
                  {stageLeads.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center py-8 text-center ${isOver ? 'opacity-0' : ''}`}>
                      <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center mb-2">
                        <Plus size={16} className="text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-400">Drop here</p>
                    </div>
                  ) : (
                    stageLeads.map(lead => (
                      <LeadCard key={lead.id} lead={lead}
                        onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                        isDragging={draggingId === lead.id}
                        onEdit={l => { setEditLead(l); setShowModal(true) }}
                        onEkyc={l => setEkycLead(l)}
                        onAssignHw={l => setHwLead(l)}
                        userRole={userRole}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {showModal && (
        <LeadModal isOpen={showModal}
          onClose={() => { setShowModal(false); setEditLead(null) }}
          onSave={saveLead}
          initial={editLead}
          defaultPipeline={activePipeline}
          formModules={formModules}
        />
      )}
      {ekycLead && (
        <EkycModal isOpen={!!ekycLead} onClose={() => setEkycLead(null)} lead={ekycLead}
          onSave={status => saveEkycStatus(ekycLead.id, status)} />
      )}
      {hwLead && (
        <HardwareAssignModal isOpen={!!hwLead} onClose={() => setHwLead(null)} lead={hwLead}
          onConfirm={hw => saveHwAssignment(hwLead.id, hw)} />
      )}
      {requiredStageWarning && (
        <RequiredStageModal
          isOpen={!!requiredStageWarning}
          onClose={() => setRequiredStageWarning(null)}
          stageName={requiredStageWarning.stageName}
        />
      )}
      {wonConversionLead && (
        <WonConversionModal
          isOpen={!!wonConversionLead}
          onClose={() => setWonConversionLead(null)}
          lead={wonConversionLead}
          onConfirm={data => {
            setLeads(prev => prev.map(l =>
              l.id === wonConversionLead.id
                ? { ...l, stage: 'Won', daysInStage: 0, lastActivity: 'Converted to Customer' }
                : l
            ))
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
    </div>
  )
}

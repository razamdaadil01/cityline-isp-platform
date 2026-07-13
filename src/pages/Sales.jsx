import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import {
  Plus, Phone, Edit3, Clock, TrendingUp,
  Users, CheckCircle2, XCircle, CalendarDays,
  PhoneCall, Search, X, HardDrive, Shield,
  Fingerprint, Send, AlertTriangle, Layers,
  CheckCircle, Loader2, Lock, Upload, FileText, BarChart2,
  Bell, ClipboardList, LayoutGrid, List, Eye, ChevronDown, Trophy,
  Download, Filter, MoreVertical,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { getFormModules, subscribeFormModules } from '../data/customFormStore'
import { saveFollowup } from '../data/followupStore'
import { getLeads, saveLead as saveLeadToStore, subscribeLeads } from '../data/leadsStore'
import { getPipelines, subscribePipelines } from '../data/pipelineStore'
import { getSalesPermission, subscribeSalesPermission, CURRENT_USER } from '../data/salesPermissionStore'
import { getStageFields, getStageMeta } from '../data/stageFieldsStore'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import CallModal from '../components/ui/CallModal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import DynamicFieldInput, { isFieldFilled } from '../components/ui/DynamicFieldInput'

// ── Pipeline definitions ──────────────────────────────────────────────────────

const PIPELINES = {
  B2C: {
    label: 'Residential',
    labelFull: 'Residential',
    stages: ['New Inquiry', 'Follow-up', 'Feasibility', 'Installation Visit', 'Won', 'Lost'],
    tabActive: 'bg-brand-blue text-white',
    tabCount:  'bg-white/25 text-white',
    tabIdle:   'text-gray-600 hover:text-brand-blue',
  },
  Custom: {
    label: 'Custom',
    labelFull: 'Custom Pipeline',
    stages: ['New Inquiry', 'Contacted', 'Quotation', 'Won', 'Lost'],
    tabActive: 'bg-brand-orange text-white',
    tabCount:  'bg-white/25 text-white',
    tabIdle:   'text-gray-600 hover:text-brand-orange',
  },
  Enterprise: {
    label: 'Enterprise',
    labelFull: 'Enterprise Pipeline',
    stages: ['New Inquiry Filed', 'Discussion', 'Follow-up', 'Proposal', 'Won', 'Lost'],
    tabActive: 'bg-sky-600 text-white',
    tabCount:  'bg-white/25 text-white',
    tabIdle:   'text-gray-600 hover:text-sky-600',
  },
}

// Visual style for every stage name used across all pipelines
const STAGE_STYLES = {
  'New Inquiry':           { colorBar: 'bg-blue-500',    chip: 'bg-blue-100 text-blue-700',      colBg: 'bg-blue-50/60',    border: 'border-blue-200'    },
  'Contacted':             { colorBar: 'bg-cyan-500',    chip: 'bg-cyan-100 text-cyan-700',      colBg: 'bg-cyan-50/60',    border: 'border-cyan-200'    },
  'Follow-up':             { colorBar: 'bg-purple-500',  chip: 'bg-purple-100 text-purple-700',  colBg: 'bg-purple-50/60',  border: 'border-purple-200'  },
  'Site Survey':           { colorBar: 'bg-amber-500',   chip: 'bg-amber-100 text-amber-700',    colBg: 'bg-amber-50/60',   border: 'border-amber-200'   },
  'Quotation Sent':        { colorBar: 'bg-orange-500',  chip: 'bg-orange-100 text-orange-700',  colBg: 'bg-orange-50/60',  border: 'border-orange-200'  },
  'Feasibility':           { colorBar: 'bg-amber-500',   chip: 'bg-amber-100 text-amber-700',    colBg: 'bg-amber-50/60',   border: 'border-amber-200'   },
  'Installation Visit':    { colorBar: 'bg-orange-500',  chip: 'bg-orange-100 text-orange-700',  colBg: 'bg-orange-50/60',  border: 'border-orange-200'  },
  'Negotiation':           { colorBar: 'bg-pink-500',    chip: 'bg-pink-100 text-pink-700',      colBg: 'bg-pink-50/60',    border: 'border-pink-200'    },
  'Won':                   { colorBar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700',colBg: 'bg-emerald-50/60', border: 'border-emerald-200' },
  'Lost':                  { colorBar: 'bg-red-400',     chip: 'bg-red-100 text-red-600',        colBg: 'bg-red-50/40',     border: 'border-red-200'     },
  // ILL specific
  'Inquiry':               { colorBar: 'bg-blue-400',    chip: 'bg-blue-100 text-blue-600',      colBg: 'bg-blue-50/40',    border: 'border-blue-100'    },
  'Feasibility Report':    { colorBar: 'bg-teal-400',    chip: 'bg-teal-100 text-teal-600',      colBg: 'bg-teal-50/40',    border: 'border-teal-100'    },
  'Pricing Approval':      { colorBar: 'bg-amber-400',   chip: 'bg-amber-100 text-amber-600',    colBg: 'bg-amber-50/40',   border: 'border-amber-100'   },
  'SLA Agreement':         { colorBar: 'bg-orange-500',  chip: 'bg-orange-100 text-orange-700',  colBg: 'bg-orange-50/60',  border: 'border-orange-200'  },
  'Installation':          { colorBar: 'bg-violet-400',  chip: 'bg-violet-100 text-violet-600',  colBg: 'bg-violet-50/40',  border: 'border-violet-100'  },
  'Testing':               { colorBar: 'bg-cyan-400',    chip: 'bg-cyan-100 text-cyan-600',      colBg: 'bg-cyan-50/40',    border: 'border-cyan-100'    },
  // Custom specific
  'Quotation':             { colorBar: 'bg-amber-500',   chip: 'bg-amber-100 text-amber-700',    colBg: 'bg-amber-50/60',   border: 'border-amber-200'   },
  // Enterprise specific
  'New Inquiry Filed':     { colorBar: 'bg-blue-600',    chip: 'bg-blue-100 text-blue-800',      colBg: 'bg-blue-50/60',    border: 'border-blue-200'    },
  'Discussion':            { colorBar: 'bg-purple-500',  chip: 'bg-purple-100 text-purple-700',  colBg: 'bg-purple-50/60',  border: 'border-purple-200'  },
  'Proposal':              { colorBar: 'bg-teal-500',    chip: 'bg-teal-100 text-teal-700',      colBg: 'bg-teal-50/60',    border: 'border-teal-200'    },
}

// Maps the hardcoded pipeline keys to pipelineStore IDs for stage config lookup
const PIPELINE_STORE_MAP = { B2C: 'PL-001', Enterprise: 'PL-003' }

// URL slug ↔ pipeline key
const PIPELINE_SLUG      = { B2C: 'residential', Custom: 'custom', Enterprise: 'enterprise' }
const PIPELINE_FROM_SLUG = { residential: 'B2C', custom: 'Custom', enterprise: 'Enterprise' }

function getStageConfig(pipelineKey, stageName, plStore) {
  const pid = PIPELINE_STORE_MAP[pipelineKey]
  if (!pid) return null
  const pipeline = plStore.find(p => p.id === pid)
  if (!pipeline) return null
  return pipeline.stages.find(s => s.name === stageName) ?? null
}

function getStageLabel(id) {
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
  { id: 'LD-202', pipeline: 'B2C',    name: 'Sunita Bose',     phone: '9765443322', email: 'sunita@email.com', area: 'Indiranagar',     source: 'Referral',     stage: 'Follow-up',           plan: '200 Mbps Pro',    assigned: 'Preethi Nair', assignedInitials: 'PN', assignedColor: 'bg-purple-500',   daysInStage: 1,  lastActivity: 'Called – Interested',  followUp: '2026-05-09', priority: 'high',   ekycStatus: null,       hwAssigned: null },
  { id: 'LD-203', pipeline: 'B2C',    name: 'Harish Kulkarni', phone: '9988001133', email: '',                 area: 'Whitefield',      source: 'Walk-in',      stage: 'Feasibility',         plan: '50 Mbps Starter', assigned: 'Arjun Kumar',  assignedInitials: 'AK', assignedColor: 'bg-brand-blue',   daysInStage: 4,  lastActivity: 'Survey scheduled',     followUp: '2026-05-10', priority: 'medium', ekycStatus: 'Sent',     hwAssigned: null },
  { id: 'LD-205', pipeline: 'B2C',    name: 'Deepak Joshi',    phone: '9011556677', email: '',                 area: 'Electronic City', source: 'Cold Call',    stage: 'Follow-up',           plan: '100 Mbps Home',   assigned: 'Suresh Babu',  assignedInitials: 'SB', assignedColor: 'bg-emerald-500',  daysInStage: 6,  lastActivity: 'No answer – retry',    followUp: '2026-05-07', priority: 'medium', ekycStatus: null,       hwAssigned: null },
  { id: 'LD-206', pipeline: 'B2C',    name: 'Kavita Sharma',   phone: '9876543210', email: 'kavita@email.com', area: 'BTM Layout',      source: 'Referral',     stage: 'Follow-up',           plan: '200 Mbps Pro',    assigned: 'Anita Sharma', assignedInitials: 'AS', assignedColor: 'bg-brand-orange', daysInStage: 2,  lastActivity: 'Quote emailed',        followUp: '2026-05-11', priority: 'medium', ekycStatus: null,       hwAssigned: null },
  { id: 'LD-208', pipeline: 'B2C',    name: 'Lakshmi Devi',    phone: '9123456780', email: '',                 area: 'Koramangala',     source: 'Walk-in',      stage: 'Lost',                plan: '50 Mbps Starter', assigned: 'Preethi Nair', assignedInitials: 'PN', assignedColor: 'bg-purple-500',   daysInStage: 12, lastActivity: 'Not interested',       followUp: '',           priority: 'low',    ekycStatus: null,       hwAssigned: null },
  { id: 'LD-210', pipeline: 'B2C',    name: 'Rekha Menon',     phone: '9871234560', email: '',                 area: 'HSR Layout',      source: 'Referral',     stage: 'Follow-up',           plan: '500 Mbps Ultra',  assigned: 'Anita Sharma', assignedInitials: 'AS', assignedColor: 'bg-brand-orange', daysInStage: 2,  lastActivity: 'WhatsApp sent',        followUp: '2026-05-09', priority: 'high',   ekycStatus: null,       hwAssigned: null },
  { id: 'LD-212', pipeline: 'B2C',    name: 'Pooja Nair',      phone: '9432109876', email: '',                 area: 'Electronic City', source: 'Social Media', stage: 'Follow-up',           plan: '100 Mbps Home',   assigned: 'Preethi Nair', assignedInitials: 'PN', assignedColor: 'bg-purple-500',   daysInStage: 5,  lastActivity: 'Missed call returned', followUp: '2026-05-07', priority: 'medium', ekycStatus: null,       hwAssigned: null },
  { id: 'LD-213', pipeline: 'B2C',    name: 'Mohan Das',       phone: '9345678901', email: 'mohan@email.com',  area: 'BTM Layout',      source: 'Walk-in',      stage: 'New Inquiry',         plan: '50 Mbps Starter', assigned: 'Suresh Babu',  assignedInitials: 'SB', assignedColor: 'bg-emerald-500',  daysInStage: 0,  lastActivity: 'Walked in today',      followUp: '2026-05-09', priority: 'medium', ekycStatus: null,       hwAssigned: null },
  // Custom — 1 lead
  { id: 'LD-209', pipeline: 'Custom', name: 'Vinod Kumar',     phone: '9988776655', email: 'vinod@email.com',  area: 'Indiranagar',     source: 'Cold Call',    stage: 'Quotation',           plan: '200 Mbps Pro',    assigned: 'Suresh Babu',  assignedInitials: 'SB', assignedColor: 'bg-emerald-500',  daysInStage: 0,  lastActivity: 'Quotation sent',       followUp: '2026-05-08', priority: 'low',    ekycStatus: null,       hwAssigned: null },
  // Enterprise — 2 leads
  { id: 'LD-401', pipeline: 'Enterprise', name: 'Vikram Enterprises', phone: '9900112233', email: '', area: 'Noida', source: 'Referral', stage: 'Proposal', plan: 'ILL 100 Mbps Monthly', assigned: 'Preethi Nair', assignedInitials: 'PN', assignedColor: 'bg-purple-500', daysInStage: 2, lastActivity: 'Proposal sent', followUp: '2026-06-02', priority: 'high', ekycStatus: null, hwAssigned: null },
  { id: 'LD-305', pipeline: 'Enterprise', name: 'Vikram Enterprises', phone: '9900112233', email: '', area: 'Noida', source: 'Referral', stage: 'Proposal', plan: 'ILL 100 Mbps Monthly', assigned: 'Preethi Nair', assignedInitials: 'PN', assignedColor: 'bg-purple-500', daysInStage: 2, lastActivity: 'Proposal sent', followUp: '2026-06-02', priority: 'high', ekycStatus: null, hwAssigned: null, createdAt: '2026-05-28' },
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

// ── Feasibility helpers ───────────────────────────────────────────────────────

const FEASIBILITY_INIT = {
  cableType: '', cableLength: '', buildingType: '', floorNumber: '',
  oltDistance: '', roofAccess: '', powerSource: '', wallDrilling: '', notes: '',
}

function YesNoButtons({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {['Yes', 'No'].map(opt => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
            value === opt
              ? 'bg-brand-blue text-white border-transparent'
              : 'border-surface-border text-gray-600 hover:border-brand-blue/40'
          }`}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function FeasibilityModal({ isOpen, onClose, lead, onSave }) {
  const [form, setForm] = useState(lead?.feasibility ?? FEASIBILITY_INIT)
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function handleSave() {
    onSave(form)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={`Feasibility Report — ${lead?.name}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={<ClipboardList size={14} />} onClick={handleSave}>Submit Feasibility</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Cable Type" required>
            <Select value={form.cableType} onChange={e => set('cableType', e.target.value)}>
              <option value="">Select type…</option>
              <option>Fiber Optic</option>
              <option>Copper</option>
              <option>Coaxial</option>
            </Select>
          </FormField>
          <FormField label="Cable Length (meters)">
            <Input type="number" value={form.cableLength} onChange={e => set('cableLength', e.target.value)} placeholder="e.g. 50" />
          </FormField>
          <FormField label="Building Type" required>
            <Select value={form.buildingType} onChange={e => set('buildingType', e.target.value)}>
              <option value="">Select type…</option>
              <option>Apartment</option>
              <option>Villa</option>
              <option>Independent House</option>
              <option>Office</option>
              <option>Shop</option>
              <option>Other</option>
            </Select>
          </FormField>
          <FormField label="Floor Number">
            <Input type="number" value={form.floorNumber} onChange={e => set('floorNumber', e.target.value)} placeholder="e.g. 3" />
          </FormField>
          <FormField label="OLT Distance (meters)">
            <Input type="number" value={form.oltDistance} onChange={e => set('oltDistance', e.target.value)} placeholder="e.g. 200" />
          </FormField>
          <div />
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Site Conditions</p>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Roof/Terrace Access">
              <YesNoButtons value={form.roofAccess} onChange={v => set('roofAccess', v)} />
            </FormField>
            <FormField label="Power Source Available">
              <YesNoButtons value={form.powerSource} onChange={v => set('powerSource', v)} />
            </FormField>
            <FormField label="Wall Drilling Required">
              <YesNoButtons value={form.wallDrilling} onChange={v => set('wallDrilling', v)} />
            </FormField>
          </div>
        </div>

        <FormField label="Special Notes">
          <Textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Any special requirements or observations…" rows={3} />
        </FormField>
      </div>
    </Modal>
  )
}

// ── Set Follow-up Modal (from lead card) ──────────────────────────────────────

function SetFollowupModal({ isOpen, onClose, lead, onSave }) {
  const [form, setForm] = useState({ date: '', time: '10:00', note: '', notifyTo: [] })
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function toggleNotify(name) {
    setForm(p => ({
      ...p,
      notifyTo: p.notifyTo.includes(name)
        ? p.notifyTo.filter(n => n !== name)
        : [...p.notifyTo, name],
    }))
  }

  function handleSave() {
    if (!form.date) return
    onSave({
      id:         `FU-${Date.now()}`,
      leadId:     lead.id,
      leadName:   lead.name,
      phone:      lead.phone,
      date:       form.date,
      time:       form.time,
      note:       form.note,
      stage:      lead.stage,
      assignedTo: lead.assigned,
      notifyTo:   form.notifyTo,
      priority:   lead.priority ?? 'medium',
      status:     'Pending',
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={`Set Follow-up — ${lead?.name}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={<Bell size={14} />} onClick={handleSave} disabled={!form.date}>
            Set Follow-up
          </Button>
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
          <Textarea value={form.note} onChange={e => set('note', e.target.value)}
            placeholder="Context or reminder for this follow-up…" rows={3} />
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

// ── Lead card ─────────────────────────────────────────────────────────────────

function LeadCard({ lead, onDragStart, onDragEnd, isDragging, onEdit, onEkyc, onAssignHw, onFeasibility, onFollowup, onSendToInventory, onView, onCall, userRole, followUpAllowed = true, isClosed = false }) {
  const TODAY_STR = new Date().toISOString().split('T')[0]
  const isOverdueFollowUp = lead.followUp && lead.followUp < TODAY_STR
  const isTodayFollowUp   = lead.followUp && lead.followUp === TODAY_STR
  const isSiteSurveyStage = lead.stage === 'Site Survey'

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
          <p className="font-semibold text-sm text-gray-900 truncate">{lead.companyName || lead.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{lead.companyName ? lead.name : lead.area}</p>
        </div>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${lead.assignedColor}`}>
          {lead.assignedInitials}
        </div>
      </div>

      <button
        onClick={e => { e.stopPropagation(); onCall?.(lead) }}
        className="flex items-center gap-1 text-xs font-mono text-gray-600 hover:text-emerald-600 mb-3 transition-colors group"
      >
        <Phone size={11} className="text-gray-400 group-hover:text-emerald-500" />
        {lead.phone}
      </button>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <Badge variant={SOURCE_VARIANT[lead.source] ?? 'gray'} size="sm">{lead.source}</Badge>
        {lead.sourceIntercomId && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-100 text-cyan-700">
            Converted from Intercom
          </span>
        )}
        {lead.plan && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-navy/10 text-navy">{lead.plan}</span>
        )}
        {isClosed && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
            Closed
          </span>
        )}
        {lead.ekycStatus && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            lead.ekycStatus === 'Completed' ? 'bg-emerald-100 text-emerald-700'
            : lead.ekycStatus === 'Failed'  ? 'bg-red-100 text-red-600'
            : lead.ekycStatus === 'Sent'    ? 'bg-sky-100 text-sky-600'
            : 'bg-yellow-100 text-yellow-700'
          }`}>
            <Fingerprint size={9} /> eKYC {lead.ekycStatus}
          </span>
        )}
        {lead.feasibility && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={9} /> Feasibility ✓
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
          <span className={`flex items-center gap-1 font-medium ${
            isOverdueFollowUp ? 'text-red-500'
            : isTodayFollowUp ? 'text-brand-orange'
            : 'text-gray-500'
          }`}>
            <CalendarDays size={11} /> {lead.followUp}
            {isOverdueFollowUp && ' ⚠'}
          </span>
        )}
      </div>

      <p className="text-[11px] text-gray-400 italic mb-3 truncate">{lead.lastActivity}</p>

      {isSiteSurveyStage && (
        <div className={`mb-3 p-2 rounded-lg border text-center ${
          lead.feasibility ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50/60'
        }`}>
          <button
            onClick={e => { e.stopPropagation(); onFeasibility(lead) }}
            className={`flex items-center justify-center gap-1.5 w-full text-xs font-semibold transition-colors ${
              lead.feasibility
                ? 'text-emerald-700 hover:text-emerald-900'
                : 'text-amber-700 hover:text-amber-900'
            }`}
          >
            {lead.feasibility
              ? <><CheckCircle2 size={12} /> View Feasibility</>
              : <><ClipboardList size={12} /> Feasibility</>
            }
          </button>
        </div>
      )}

      <div className="pt-2 border-t border-surface-border">
        <div className="flex items-center justify-around">
          <button onClick={e => { e.stopPropagation(); onCall?.(lead) }}
            title="Call"
            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
            <Phone size={14} />
          </button>
          <button onClick={e => { e.stopPropagation(); onEkyc(lead) }}
            title="eKYC"
            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
            <Fingerprint size={14} />
          </button>
          {followUpAllowed && (
            <button onClick={e => { e.stopPropagation(); onFollowup(lead) }}
              title="Add Follow-up"
              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
              <Bell size={14} />
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onEdit(lead) }}
            title="Edit Lead"
            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
            <Edit3 size={14} />
          </button>
          <button onClick={e => { e.stopPropagation(); onView(lead) }}
            title="View Lead"
            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
            <Eye size={14} />
          </button>
        </div>
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
    B2C:        { active: 'bg-brand-blue text-white',   idle: 'text-gray-600 hover:bg-gray-100' },
    Custom:     { active: 'bg-brand-orange text-white', idle: 'text-gray-600 hover:bg-gray-100' },
    Enterprise: { active: 'bg-sky-600 text-white',      idle: 'text-gray-600 hover:bg-gray-100' },
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
                  {PIPELINES[key]?.label ?? key}
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

// ── Move Stage Modal ──────────────────────────────────────────────────────────

function MoveStageModal({ lead, availableStages, plStore, onClose, onMove, initialStage = '' }) {
  const [targetStage, setTargetStage]         = useState(initialStage)
  const [fieldVals, setFieldVals]             = useState({})
  const [followupEnabled, setFollowupEnabled] = useState(false)
  const [fuForm, setFuForm]                   = useState({ date: '', time: '10:00', note: '', notifyTo: [] })
  const [loading, setLoading]                 = useState(false)
  const [wonNote, setWonNote]                 = useState('')
  useEffect(() => {
    setTargetStage(initialStage ?? '')
    setFieldVals({})
    setFollowupEnabled(false)
    setFuForm({ date: '', time: '10:00', note: '', notifyTo: [] })
    setWonNote('')
  }, [initialStage])

  const targetSC          = targetStage ? getStageConfig(lead.pipeline, targetStage, plStore) : null
  const targetStageId     = targetSC?.id ?? null
  const isWon             = targetSC?.statusType === 'Won' || targetStage === 'Won'
  const needsFeasConfirm  = false
  const stageMeta         = targetStageId ? getStageMeta(targetStageId) : {}
  const stageFields       = (!isWon && targetStageId ? getStageFields(targetStageId) : []).filter(f => f.active !== false)
  const visibleFields     = stageFields.filter(f => !f.conditionalOn || fieldVals[f.conditionalOn.fieldId] === f.conditionalOn.value)
  const requiredFields    = visibleFields.filter(f => f.required)
  const requiredFilled    = requiredFields.every(f => isFieldFilled(f, fieldVals[f.id]))
  const filledCount       = visibleFields.filter(f => isFieldFilled(f, fieldVals[f.id])).length
  const followUpAllowed   = targetSC?.followUpAllowed !== false

  function setField(id, val) { setFieldVals(p => ({ ...p, [id]: val })) }

  function toggleNotify(name) {
    setFuForm(p => ({ ...p, notifyTo: p.notifyTo.includes(name) ? p.notifyTo.filter(n => n !== name) : [...p.notifyTo, name] }))
  }

  function handleMove() {
    if (!targetStage || !requiredFilled) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onMove(
        targetStage,
        { ...fieldVals, ...(isWon && wonNote ? { _wonNote: wonNote } : {}) },
        followupEnabled && followUpAllowed ? fuForm : null
      )
    }, 500)
  }

  return (
    <Modal isOpen onClose={onClose} title={`Move Stage — ${lead.name}`} size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            icon={loading ? <Loader2 size={14} className="animate-spin" /> : (isWon ? <CheckCircle2 size={14} /> : <TrendingUp size={14} />)}
            onClick={handleMove}
            disabled={!targetStage || loading || !requiredFilled}
          >
            {loading ? (isWon ? 'Converting…' : 'Moving…') : (isWon ? 'Mark as Won' : 'Move Stage')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Stage selectors */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Current Stage">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-surface-border">
              <span className={`w-2 h-2 rounded-full ${STAGE_STYLES[lead.stage]?.colorBar ?? 'bg-gray-400'}`} />
              <span className="text-sm text-gray-600 font-medium">{lead.stage}</span>
            </div>
          </FormField>
          <FormField label="Move to Stage" required>
            <Select value={targetStage} onChange={e => { setTargetStage(e.target.value); setFieldVals({}); setWonNote('') }}>
              <option value="">Select target stage…</option>
              {availableStages.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </FormField>
        </div>

        {/* Won — simple closing UI */}
        {isWon && targetStage && (
          <>
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Marking as Won</p>
                <p className="text-xs text-emerald-600 mt-0.5">This will trigger customer creation, CAF form, and an installation ticket.</p>
              </div>
            </div>
            <FormField label="Closing Note">
              <Textarea value={wonNote} onChange={e => setWonNote(e.target.value)} rows={3}
                placeholder="Add a note about this conversion (optional)…" />
            </FormField>
          </>
        )}

        {/* Dynamic stage fields */}
        {!isWon && !needsFeasConfirm && targetStage && targetStage !== 'New Inquiry' && stageFields.length > 0 && (
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
            {stageMeta.showFeasibilityBanner && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 rounded-lg mt-3">
                <span className="text-xs text-amber-700 font-medium">Feasibility Status will be set to:</span>
                <span className="text-xs font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">Pending</span>
              </div>
            )}
          </div>
        )}

        {/* Follow-up toggle — hidden for closing stages */}
        {targetStage && followUpAllowed && (
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
                  <p className="text-xs font-medium text-gray-600 mb-2">Notify</p>
                  <div className="flex flex-wrap gap-2">
                    {STAFF.map(s => (
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
        )}
        {targetStage && !followUpAllowed && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-surface-border rounded-xl text-xs text-gray-500">
            <Bell size={12} className="text-gray-400 shrink-0" />
            Follow-ups are disabled for the <strong>{targetStage}</strong> stage.
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Sales() {
  const [leads, setLeads]               = useState(getLeads)
  const [plStore, setPlStore]           = useState(getPipelines)
  const [searchParams, setSearchParams] = useSearchParams()
  const activePipeline = PIPELINE_FROM_SLUG[searchParams.get('pipeline')] ?? 'B2C'
  const viewMode       = searchParams.get('view') === 'kanban' ? 'kanban' : 'table'
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
  const [feasibilityLead, setFeasibilityLead]     = useState(null)
  const [followupLead, setFollowupLead]           = useState(null)
  const [inventoryToast, setInventoryToast]       = useState(false)
  const [moveStageLeadId, setMoveStageLeadId]     = useState(null)
  const [moveStageInitial, setMoveStageInitial]   = useState('')
  const [tableStageFilter, setTableStageFilter]   = useState('')
  const [tableUserFilter, setTableUserFilter]     = useState('')
  const [tableStatusFilter, setTableStatusFilter] = useState('')
  const [tableDateFrom, setTableDateFrom]         = useState('')
  const [tableDateTo, setTableDateTo]             = useState('')
  const [tableFollowFrom, setTableFollowFrom]     = useState('')
  const [tableFollowTo, setTableFollowTo]         = useState('')
  const [tableSort, setTableSort]                 = useState({ by: 'createdAt', dir: 'desc' })
  const [tablePage, setTablePage]                 = useState(1)
  const [showExportMenu, setShowExportMenu]     = useState(false)
  const [exportToast, setExportToast]           = useState('')
  const [pipelineDropdownOpen, setPipelineDropdownOpen] = useState(false)
  const [callModal, setCallModal]               = useState({ open: false, name: '', phone: '' })
  const [callToast, setCallToast]               = useState(null)
  const [drawerOpen, setDrawerOpen]             = useState(false)
  const exportMenuRef       = useRef(null)
  const pipelineDropdownRef = useRef(null)
  const tableMenuRef        = useRef(null)
  const [tableMenuId, setTableMenuId]   = useState(null)
  const [tableMenuPos, setTableMenuPos] = useState({ top: 0, right: 0 })
  const TABLE_PAGE_SIZE = 10
  const navigate                        = useNavigate()
  const location                        = useLocation()
  const userRole                        = 'sales'

  const [salesPerm, setSalesPerm] = useState(getSalesPermission)

  useEffect(() => subscribeFormModules(setFormModules), [])
  useEffect(() => subscribeLeads(setLeads), [])
  useEffect(() => subscribePipelines(setPlStore), [])
  useEffect(() => subscribeSalesPermission(setSalesPerm), [])

  useEffect(() => {
    if (!showExportMenu) return
    function handler(e) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setShowExportMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showExportMenu])

  useEffect(() => {
    if (!pipelineDropdownOpen) return
    function handler(e) {
      if (pipelineDropdownRef.current && !pipelineDropdownRef.current.contains(e.target)) setPipelineDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pipelineDropdownOpen])

  useEffect(() => {
    if (!tableMenuId) return
    function handler(e) {
      if (tableMenuRef.current && !tableMenuRef.current.contains(e.target)) setTableMenuId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [tableMenuId])

  // Pick up a newly created lead passed back from /sales/leads/new
  useEffect(() => {
    if (location.state?.newLead) {
      const lead = location.state.newLead
      if (!getLeads().find(l => l.id === lead.id)) {
        saveLeadToStore(lead)
      }
      navigate('/sales', { replace: true, state: {} })
    }
  }, []) // eslint-disable-line

  const pl            = PIPELINES[activePipeline] ?? PIPELINES.B2C
  const pipelineLeads = leads
    .filter(l => l.pipeline === activePipeline)
    .filter(l => salesPerm !== 'view_my' || l.assigned === CURRENT_USER || (l.createdBy ?? '') === CURRENT_USER)

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
        // Block dropping onto inactive stages
        const targetSC = getStageConfig(lead.pipeline, targetStage, plStore)
        if (targetSC?.active === false) {
          setDraggingId(null)
          setDragOverStage(null)
          return
        }

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

        // Intercept Feasibility drops — route through MoveStageModal for field capture
        if (targetStage === 'Feasibility' && lead.pipeline === 'B2C') {
          setMoveStageLeadId(lead.id)
          setMoveStageInitial(targetStage)
          setDraggingId(null)
          setDragOverStage(null)
          return
        }

        // Intercept Won/Lost drops — route through MoveStageModal for field capture
        const dropSC = getStageConfig(lead.pipeline, targetStage, plStore)
        const isWonDrop  = targetStage === 'Won'  || dropSC?.statusType === 'Won'
        const isLostDrop = targetStage === 'Lost' || dropSC?.statusType === 'Lost'
        if (isWonDrop || isLostDrop) {
          setMoveStageLeadId(lead.id)
          setMoveStageInitial(targetStage)
          setDraggingId(null)
          setDragOverStage(null)
          return
        }
      }

      const movingLead = leads.find(l => l.id === draggingId)
      if (movingLead && movingLead.stage !== targetStage) {
        setMoveStageLeadId(movingLead.id)
        setMoveStageInitial(targetStage)
      }
    }
    setDraggingId(null)
    setDragOverStage(null)
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStage(null)
  }

  // ── Lead CRUD ────────────────────────────────────────────────────────────
  function handleSaveLead(lead) {
    saveLeadToStore(lead)
  }

  function saveEkycStatus(leadId, status) {
    const lead = leads.find(l => l.id === leadId)
    if (lead) saveLeadToStore({ ...lead, ekycStatus: status, lastActivity: `eKYC ${status}` })
  }

  function saveHwAssignment(leadId, hw) {
    const lead = leads.find(l => l.id === leadId)
    if (lead) saveLeadToStore({ ...lead, hwAssigned: hw, lastActivity: `HW assigned: ${hw.equipmentName}` })
  }

  function saveFeasibility(leadId, data) {
    const lead = leads.find(l => l.id === leadId)
    if (lead) saveLeadToStore({ ...lead, feasibility: data, lastActivity: 'Feasibility report submitted' })
  }

  function handleSaveFollowup(fu) {
    saveFollowup(fu)
    const lead = leads.find(l => l.id === fu.leadId)
    if (lead) saveLeadToStore({ ...lead, followUp: fu.date, lastActivity: `Follow-up set: ${fu.date}` })
  }

  function sendToInventory() {
    setInventoryToast(true)
    setTimeout(() => setInventoryToast(false), 3000)
  }

  function clearAllFilters() {
    setTableStageFilter('')
    setTableUserFilter('')
    setTableStatusFilter('')
    setTableDateFrom('')
    setTableDateTo('')
    setTableFollowFrom('')
    setTableFollowTo('')
    setTablePage(1)
  }

  const hasActiveFilters = !!(
    tableStageFilter || tableUserFilter || tableStatusFilter ||
    tableDateFrom || tableDateTo || tableFollowFrom || tableFollowTo
  )
  const filterCount = [
    tableStageFilter,
    tableUserFilter,
    tableStatusFilter,
    tableDateFrom || tableDateTo,
    tableFollowFrom || tableFollowTo,
  ].filter(Boolean).length

  function buildExportRows(rows) {
    const PIPELINE_LABEL_MAP = { B2C: 'Residential', Custom: 'Custom', Enterprise: 'Enterprise' }
    return rows.map(l => ({
      'Lead ID':       l.id,
      'Lead Name':     l.name,
      'Customer Name': l.name,
      'Mobile':        l.phone,
      'Pipeline':      PIPELINE_LABEL_MAP[l.pipeline] ?? l.pipeline,
      'Stage':         l.stage,
      'Assigned User': l.assigned ?? '',
      'Follow-up Date': l.followUp ?? '',
      'Status':        ['Won','Lost'].includes(l.stage) ? l.stage : 'Open',
      'Created Date':  l.createdAt ?? '',
    }))
  }

  function doExport(format) {
    const rows = buildExportRows(getFilteredTableLeads())
    const count = rows.length
    if (format === 'csv') {
      const headers = Object.keys(rows[0] ?? {})
      const csvLines = [
        headers.join(','),
        ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
      ]
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `leads-export-${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const ws  = XLSX.utils.json_to_sheet(rows)
      const wb  = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Leads')
      XLSX.writeFile(wb, `leads-export-${new Date().toISOString().slice(0,10)}.xlsx`)
    }
    setShowExportMenu(false)
    setExportToast(`Exported ${count} lead${count !== 1 ? 's' : ''} successfully`)
    setTimeout(() => setExportToast(''), 3000)
  }

  // ── Derived stats (scoped to active pipeline) ────────────────────────────
  const wonCount       = pipelineLeads.filter(l => l.stage === 'Won').length
  const lostCount      = pipelineLeads.filter(l => l.stage === 'Lost').length
  const activeCount    = pipelineLeads.filter(l => !['Won', 'Lost'].includes(l.stage)).length
  const todayFollowUps = pipelineLeads.filter(l => l.followUp === new Date().toISOString().split('T')[0]).length

  const filteredLeads = search.trim()
    ? pipelineLeads.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search) ||
        l.area.toLowerCase().includes(search.toLowerCase())
      )
    : pipelineLeads

  function getFilteredTableLeads() {
    return filteredLeads
      .filter(l => !tableStageFilter  || l.stage    === tableStageFilter)
      .filter(l => !tableUserFilter   || l.assigned === tableUserFilter)
      .filter(l => !tableStatusFilter || (['Won','Lost'].includes(l.stage) ? l.stage : 'Open') === tableStatusFilter)
      .filter(l => !tableDateFrom     || (l.createdAt ?? '') >= tableDateFrom)
      .filter(l => !tableDateTo       || (l.createdAt ?? '') <= tableDateTo)
      .filter(l => !tableFollowFrom   || (l.followUp  ?? '') >= tableFollowFrom)
      .filter(l => !tableFollowTo     || (l.followUp  ?? '') <= tableFollowTo)
      .sort((a, b) => {
        const av = a[tableSort.by] ?? ''
        const bv = b[tableSort.by] ?? ''
        return tableSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Inventory toast ─────────────────────────────────────────────── */}
      {inventoryToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle size={16} className="shrink-0" />
          Sent to Inventory team for HW Assignment
        </div>
      )}

      {/* ── Export toast ────────────────────────────────────────────────── */}
      {exportToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-brand-blue text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <Download size={16} className="shrink-0" />
          {exportToast}
        </div>
      )}

      {/* ── Call toast ──────────────────────────────────────────────────── */}
      {callToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle2 size={16} className="shrink-0" />
          {callToast}
        </div>
      )}

      <CallModal
        isOpen={callModal.open}
        onClose={() => setCallModal({ open: false, name: '', phone: '' })}
        customerName={callModal.name}
        phoneNumber={callModal.phone}
        onCallInitiated={({ number }) => {
          setCallModal({ open: false, name: '', phone: '' })
          setCallToast('Call initiated successfully')
          setTimeout(() => setCallToast(null), 3000)
        }}
      />

      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 space-y-4 shrink-0">

        {/* Title row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sales Pipeline</h1>
            <p className="text-sm text-gray-500 mt-0.5">Drag cards between stages to update lead progress</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center gap-0.5 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.set('view', 'kanban'); return n })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutGrid size={13} /> Kanban
              </button>
              <button
                onClick={() => { setSearchParams(p => { const n = new URLSearchParams(p); n.set('view', 'table'); return n }); setTablePage(1) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List size={13} /> Table
              </button>
            </div>

            {/* ── Pipeline dropdown ──────────────────────────────── */}
            <div className="relative" ref={pipelineDropdownRef}>
              {(() => {
                const label = PIPELINES[activePipeline]?.label ?? activePipeline
                const count = leads.filter(l => l.pipeline === activePipeline).length
                return (
                  <button
                    onClick={() => setPipelineDropdownOpen(o => !o)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-purple-500 bg-purple-50 text-purple-700 text-xs font-semibold transition-all hover:bg-purple-100"
                  >
                    <Layers size={13} />
                    {label}
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[20px] text-center bg-purple-200 text-purple-700">{count}</span>
                    <ChevronDown size={12} className={`transition-transform ${pipelineDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                )
              })()}
              {pipelineDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 bg-white border border-surface-border rounded-xl shadow-lg z-30 min-w-[180px] py-1 overflow-hidden">
                  {Object.entries(PIPELINES).map(([key, cfg]) => ({
                    key,
                    label: cfg.label,
                    count: leads.filter(l => l.pipeline === key).length,
                  })).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => { setSearchParams(p => { const n = new URLSearchParams(p); n.set('pipeline', PIPELINE_SLUG[opt.key] ?? opt.key); return n }); setSearch(''); setPipelineDropdownOpen(false) }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors ${
                        activePipeline === opt.key
                          ? 'bg-purple-50 text-purple-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[20px] text-center ${
                        activePipeline === opt.key ? 'bg-purple-200 text-purple-700' : 'bg-gray-200 text-gray-600'
                      }`}>{opt.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
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

        {/* ── Top bar: Search | Filter | Export | Add Lead ─────────────── */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setTablePage(1) }}
                placeholder="Search leads…"
                className="pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white w-full focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter icon button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className={`relative flex items-center justify-center w-9 h-9 rounded-lg border transition-all shrink-0 ${
                hasActiveFilters
                  ? 'border-purple-500 bg-purple-50 text-purple-600 hover:bg-purple-100'
                  : 'border-surface-border bg-white text-gray-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50'
              }`}
              title="Open filters"
            >
              <Filter size={15} />
              {filterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-purple-600 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                  {filterCount}
                </span>
              )}
            </button>

            {/* Export */}
            <div className="relative shrink-0" ref={exportMenuRef}>
              <Button variant="secondary" size="sm" icon={<Download size={14} />}
                onClick={() => setShowExportMenu(p => !p)}>
                Export <ChevronDown size={12} className="ml-1" />
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-surface-border rounded-xl shadow-xl z-30 overflow-hidden">
                  <button onClick={() => doExport('csv')}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <FileText size={14} className="text-gray-400" /> Export as CSV
                  </button>
                  <button onClick={() => doExport('excel')}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-surface-border">
                    <Download size={14} className="text-emerald-500" /> Export as Excel
                  </button>
                </div>
              )}
            </div>

            {/* Add Lead */}
            <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate('/sales/leads/new')} className="shrink-0">
              Add Lead
            </Button>
          </div>

          {/* Active filter pills */}
          {(hasActiveFilters || search.trim()) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter size={11} className="text-purple-400 shrink-0" />
              {search.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                  {search}
                  <button onClick={() => setSearch('')} className="hover:text-gray-900 ml-0.5"><X size={10} /></button>
                </span>
              )}
              {tableStageFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  {tableStageFilter}
                  <button onClick={() => { setTableStageFilter(''); setTablePage(1) }} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
                </span>
              )}
              {tableUserFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  {tableUserFilter}
                  <button onClick={() => { setTableUserFilter(''); setTablePage(1) }} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
                </span>
              )}
              {tableStatusFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  {tableStatusFilter}
                  <button onClick={() => { setTableStatusFilter(''); setTablePage(1) }} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
                </span>
              )}
              {(tableDateFrom || tableDateTo) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  Created: {tableDateFrom || '…'} → {tableDateTo || '…'}
                  <button onClick={() => { setTableDateFrom(''); setTableDateTo(''); setTablePage(1) }} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
                </span>
              )}
              {(tableFollowFrom || tableFollowTo) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  Follow-up: {tableFollowFrom || '…'} → {tableFollowTo || '…'}
                  <button onClick={() => { setTableFollowFrom(''); setTableFollowTo(''); setTablePage(1) }} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
                </span>
              )}
              <button onClick={() => { clearAllFilters(); setSearch('') }}
                className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors ml-0.5">
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Table view ─────────────────────────────────────────────────── */}
      {viewMode === 'table' && (() => {
        const TODAY_STR = new Date().toISOString().split('T')[0]
        const tableLeads = getFilteredTableLeads()
        const totalPages = Math.max(1, Math.ceil(tableLeads.length / TABLE_PAGE_SIZE))
        const pageLeads  = tableLeads.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE)

        return (
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="rounded-xl border border-surface-border shadow-card overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="text-sm table-fixed w-full" style={{ minWidth: 1250 }}>
                <thead>
                  <tr className="border-b border-surface-border bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    <th className="px-4 py-3 text-left" style={{ width: 90 }}>Lead ID</th>
                    <th className="px-4 py-3 text-left" style={{ width: 180 }}>Lead Name</th>
                    <th className="px-4 py-3 text-left" style={{ width: 140 }}>Customer</th>
                    <th className="px-4 py-3 text-left" style={{ width: 130 }}>Mobile</th>
                    <th className="px-4 py-3 text-left" style={{ width: 150 }}>Stage</th>
                    <th className="px-4 py-3 text-left" style={{ width: 130 }}>Assigned</th>
                    <th className="px-4 py-3 text-left" style={{ width: 130 }}>Follow-up</th>
                    <th className="px-4 py-3 text-left" style={{ width: 90 }}>Status</th>
                    <th className="px-4 py-3 text-left" style={{ width: 110 }}>Created</th>
                    <th className="px-4 py-3 text-left" style={{ width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {pageLeads.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-gray-400 text-sm">No leads found</td>
                    </tr>
                  )}
                  {pageLeads.map(lead => {
                    const ss = STAGE_STYLES[lead.stage] ?? STAGE_STYLES['New Inquiry']
                    const status = lead.stage === 'Won' ? 'Won' : lead.stage === 'Lost' ? 'Lost' : 'Open'
                    const fuOverdue = lead.followUp && lead.followUp < TODAY_STR
                    const STATUS_STYLE = { Won: 'bg-emerald-100 text-emerald-700', Lost: 'bg-red-100 text-red-600', Open: 'bg-blue-100 text-blue-700' }
                    const leadTitle = `${lead.name}${lead.plan ? ` — ${lead.plan}` : ''}`
                    return (
                      <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 overflow-hidden" title={lead.id}>
                          <span className="block truncate font-mono text-xs text-gray-500 font-semibold">{lead.id}</span>
                        </td>
                        <td className="px-4 py-3 overflow-hidden" title={leadTitle}>
                          <button
                            onClick={() => navigate(`/sales/leads/${lead.id}`)}
                            className="block w-full truncate font-semibold text-brand-blue hover:underline text-left text-xs"
                          >
                            {leadTitle}
                          </button>
                          {lead.sourceIntercomId && (
                            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-cyan-100 text-cyan-700">
                              Converted from Intercom
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 overflow-hidden" title={lead.name}>
                          <span className="block truncate text-xs text-gray-700">{lead.name}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={e => { e.stopPropagation(); setCallModal({ open: true, name: lead.name, phone: lead.phone }) }}
                            className="flex items-center gap-1.5 font-mono text-xs text-gray-600 hover:text-emerald-600 transition-colors group"
                          >
                            <Phone size={11} className="text-gray-400 group-hover:text-emerald-500 shrink-0" />
                            {lead.phone}
                          </button>
                        </td>
                        <td className="px-4 py-3 overflow-hidden" title={lead.stage}>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${ss.chip}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ss.colorBar}`} />
                            <span className="truncate">{lead.stage}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 overflow-hidden" title={lead.assigned}>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${lead.assignedColor}`}>
                              {lead.assignedInitials}
                            </div>
                            <span className="truncate text-xs text-gray-700">{lead.assigned}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {lead.followUp
                            ? <span className={`text-xs font-medium ${fuOverdue ? 'text-red-500' : 'text-gray-700'}`}>{lead.followUp}{fuOverdue && ' ⚠'}</span>
                            : <span className="text-gray-300 text-xs">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLE[status]}`}>{status}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{lead.createdAt ?? '—'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={e => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              const menuH = 220
                              setTableMenuPos({
                                top: window.innerHeight - rect.bottom < menuH ? rect.top - menuH : rect.bottom + 4,
                                right: window.innerWidth - rect.right,
                              })
                              setTableMenuId(prev => prev === lead.id ? null : lead.id)
                            }}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                              tableMenuId === lead.id
                                ? 'bg-gray-100 text-gray-700'
                                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <MoreVertical size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50">
                <span className="text-xs text-gray-500">
                  Showing {Math.min((tablePage - 1) * TABLE_PAGE_SIZE + 1, tableLeads.length)}–{Math.min(tablePage * TABLE_PAGE_SIZE, tableLeads.length)} of {tableLeads.length} leads
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setTablePage(p => Math.max(1, p - 1))} disabled={tablePage === 1}
                    className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors">
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setTablePage(p)}
                      className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${p === tablePage ? 'bg-brand-blue text-white' : 'border border-surface-border hover:bg-white text-gray-600'}`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setTablePage(p => Math.min(totalPages, p + 1))} disabled={tablePage === totalPages}
                    className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors">
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Kanban board ───────────────────────────────────────────────── */}
      {viewMode === 'kanban' && <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6">
        <div className="flex gap-3 h-full" style={{ minWidth: `${pl.stages.length * 260}px` }}>
          {pl.stages.map(stageId => {
            const sc         = getStageConfig(activePipeline, stageId, plStore)
            // Skip inactive stages in Kanban
            if (sc?.active === false) return null

            const style      = STAGE_STYLES[stageId] ?? STAGE_STYLES['New Inquiry']
            const stageLeads = getFilteredTableLeads().filter(l => l.stage === stageId)
            const isOver     = dragOverStage === stageId
            const isRequired = (pl.requiredStages ?? []).includes(stageId)
            const statusType = sc?.statusType ?? (stageId === 'Won' ? 'Won' : stageId === 'Lost' ? 'Lost' : 'Open')
            const isWonCol   = statusType === 'Won'
            const isLostCol  = statusType === 'Lost'
            const followUpAllowed = sc?.followUpAllowed !== false
            const isClosed   = isWonCol || isLostCol

            return (
              <div key={stageId}
                className={`flex flex-col rounded-xl border transition-all duration-150 ${style.colBg} ${style.border} ${
                  isOver ? 'ring-2 ring-brand-blue/50 scale-[1.01]' : ''
                }`}
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
                      {isWonCol && <Trophy size={12} className="text-emerald-500 shrink-0" title="Won stage" />}
                      {isLostCol && <XCircle size={12} className="text-red-400 shrink-0" title="Lost stage" />}
                      {isRequired && (
                        <span title="Required stage — cannot be skipped" className="text-amber-500">
                          <Lock size={10} className="shrink-0" />
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.chip}`}>{stageLeads.length}</span>
                  </div>
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
                        onFeasibility={l => setFeasibilityLead(l)}
                        onFollowup={l => setFollowupLead(l)}
                        onView={l => navigate(`/sales/leads/${l.id}`)}
                        onCall={l => setCallModal({ open: true, name: l.name, phone: l.phone })}
                        onSendToInventory={sendToInventory}
                        userRole={userRole}
                        followUpAllowed={followUpAllowed}
                        isClosed={isClosed}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>}

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {showModal && (
        <LeadModal isOpen={showModal}
          onClose={() => { setShowModal(false); setEditLead(null) }}
          onSave={handleSaveLead}
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
            saveLeadToStore({ ...wonConversionLead, lastActivity: 'Converted to Customer' })
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
      {feasibilityLead && (
        <FeasibilityModal
          isOpen={!!feasibilityLead}
          onClose={() => setFeasibilityLead(null)}
          lead={feasibilityLead}
          onSave={data => saveFeasibility(feasibilityLead.id, data)}
        />
      )}
      {followupLead && (
        <SetFollowupModal
          isOpen={!!followupLead}
          onClose={() => setFollowupLead(null)}
          lead={followupLead}
          onSave={handleSaveFollowup}
        />
      )}
      {moveStageLeadId && (() => {
        const msLead = leads.find(l => l.id === moveStageLeadId)
        if (!msLead) return null
        const pl2 = PIPELINES[msLead.pipeline] ?? PIPELINES.B2C
        // Filter out inactive stages and current stage
        const availableStages = pl2.stages.filter(s => {
          if (s === msLead.stage) return false
          const sc = getStageConfig(msLead.pipeline, s, plStore)
          if (sc?.active === false) return false
          return true
        })
        return (
          <MoveStageModal
            lead={msLead}
            availableStages={availableStages}
            plStore={plStore}
            initialStage={moveStageInitial}
            onClose={() => { setMoveStageLeadId(null); setMoveStageInitial('') }}
            onMove={(targetStage, fieldVals, fuData) => {
              const sc = getStageConfig(msLead.pipeline, targetStage, plStore)
              const isWonMove = targetStage === 'Won' || sc?.statusType === 'Won'
              const updatedLead = {
                ...msLead,
                stage: targetStage,
                daysInStage: 0,
                lastActivity: `Moved to ${targetStage}`,
                ...(targetStage === 'Feasibility' ? { feasibilityRequired: true } : {}),
                ...(fieldVals && Object.keys(fieldVals).length > 0
                  ? { stageFields: { ...(msLead.stageFields ?? {}), [targetStage]: fieldVals } }
                  : {}),
              }
              if (fuData?.date) updatedLead.followUp = fuData.date
              saveLeadToStore(updatedLead)
              if (isWonMove) setWonConversionLead(updatedLead)
              setMoveStageLeadId(null)
              setMoveStageInitial('')
            }}
          />
        )
      })()}

      {/* ── Filter Drawer ───────────────────────────────────────────────── */}
      {/* Overlay + panel — always in DOM for smooth CSS transition */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Semi-transparent backdrop */}
        <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />

        {/* Drawer panel */}
        <div
          className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-purple-600" />
              <h2 className="text-sm font-bold text-gray-900">Filters</h2>
              {filterCount > 0 && (
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">
                  {filterCount} active
                </span>
              )}
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* Stage */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Stage</label>
              <div className="relative">
                <select
                  value={tableStageFilter}
                  onChange={e => { setTableStageFilter(e.target.value); setTablePage(1) }}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer"
                >
                  <option value="">All Stages</option>
                  {pl.stages.map(s => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Assigned User */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned User</label>
              <div className="relative">
                <select
                  value={tableUserFilter}
                  onChange={e => { setTableUserFilter(e.target.value); setTablePage(1) }}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer"
                >
                  <option value="">All Users</option>
                  {['Arjun Kumar', 'Preethi Nair', 'Suresh Babu', 'Anita Sharma'].map(u => <option key={u}>{u}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
              <div className="relative">
                <select
                  value={tableStatusFilter}
                  onChange={e => { setTableStatusFilter(e.target.value); setTablePage(1) }}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer"
                >
                  <option value="">All Status</option>
                  <option>Open</option>
                  <option>Won</option>
                  <option>Lost</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Created Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Created Date</label>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-400 mb-1">From</p>
                  <input type="date" value={tableDateFrom}
                    onChange={e => { setTableDateFrom(e.target.value); setTablePage(1) }}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">To</p>
                  <input type="date" value={tableDateTo}
                    onChange={e => { setTableDateTo(e.target.value); setTablePage(1) }}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700" />
                </div>
              </div>
            </div>

            {/* Follow-up Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Follow-up Date</label>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-400 mb-1">From</p>
                  <input type="date" value={tableFollowFrom}
                    onChange={e => { setTableFollowFrom(e.target.value); setTablePage(1) }}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">To</p>
                  <input type="date" value={tableFollowTo}
                    onChange={e => { setTableFollowTo(e.target.value); setTablePage(1) }}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700" />
                </div>
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sort By</label>
              <div className="relative">
                <select
                  value={`${tableSort.by}:${tableSort.dir}`}
                  onChange={e => { const [by, dir] = e.target.value.split(':'); setTableSort({ by, dir }); setTablePage(1) }}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer"
                >
                  <option value="createdAt:desc">Created (Newest first)</option>
                  <option value="createdAt:asc">Created (Oldest first)</option>
                  <option value="followUp:asc">Follow-up (Earliest first)</option>
                  <option value="followUp:desc">Follow-up (Latest first)</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* Sticky footer */}
          <div className="shrink-0 px-5 py-4 border-t border-surface-border bg-gray-50 flex items-center gap-3">
            <button
              onClick={() => { clearAllFilters(); setTablePage(1) }}
              className="flex-1 py-2.5 text-sm font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl transition-colors bg-white"
            >
              Clear All Filters
            </button>
            <button
              onClick={() => setDrawerOpen(false)}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* ── Table row ⋮ dropdown portal ──────────────────────────────────────── */}
      {tableMenuId && (() => {
        const lead = leads.find(l => l.id === tableMenuId)
        if (!lead) return null
        const isWon  = lead.stage === 'Won'
        const isLost = lead.stage === 'Lost'
        return (
          <div
            ref={tableMenuRef}
            style={{ position: 'fixed', top: tableMenuPos.top, right: tableMenuPos.right, zIndex: 9999 }}
            className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
          >
            <button
              onClick={() => { navigate(`/sales/leads/${lead.id}`); setTableMenuId(null) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Eye size={13} className="text-purple-500 shrink-0" /> View Lead
            </button>
            <button
              onClick={() => { navigate(`/sales/leads/${lead.id}/edit`); setTableMenuId(null) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit3 size={13} className="text-gray-400 shrink-0" /> Edit Lead
            </button>
            <button
              onClick={() => { setMoveStageLeadId(lead.id); setTableMenuId(null) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <TrendingUp size={13} className="text-brand-blue shrink-0" /> Move Stage
            </button>
            {!isWon && !isLost && (
              <>
                <div className="my-1 border-t border-surface-border" />
                <button
                  onClick={() => { setMoveStageLeadId(lead.id); setMoveStageInitial('Won'); setTableMenuId(null) }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  <CheckCircle2 size={13} className="shrink-0" /> Mark as Won
                </button>
                <button
                  onClick={() => { setMoveStageLeadId(lead.id); setMoveStageInitial('Lost'); setTableMenuId(null) }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  <XCircle size={13} className="shrink-0" /> Mark as Lost
                </button>
              </>
            )}
          </div>
        )
      })()}

    </div>
  )
}

import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Phone, MessageSquare, Edit3, Clock, TrendingUp,
  Users, CheckCircle2, XCircle, CalendarDays, ChevronRight,
  ArrowUpRight, PhoneCall, Search, X, HardDrive, Shield,
  Fingerprint, Send, AlertTriangle, Layers, ChevronDown,
  CheckCircle, AlertCircle, Loader2
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'

// ── Static data ──────────────────────────────────────────────────────────────

const STAGES = [
  { id: 'New Inquiry',          label: 'New Inquiry',          colorBar: 'bg-blue-500',    chip: 'bg-blue-100 text-blue-700',      colBg: 'bg-blue-50/60',    border: 'border-blue-200'    },
  { id: 'Contacted',            label: 'Contacted',            colorBar: 'bg-cyan-500',    chip: 'bg-cyan-100 text-cyan-700',      colBg: 'bg-cyan-50/60',    border: 'border-cyan-200'    },
  { id: 'Follow-up',            label: 'Follow-up',            colorBar: 'bg-purple-500',  chip: 'bg-purple-100 text-purple-700',  colBg: 'bg-purple-50/60',  border: 'border-purple-200'  },
  { id: 'Site Survey',          label: 'Site Survey',          colorBar: 'bg-amber-500',   chip: 'bg-amber-100 text-amber-700',    colBg: 'bg-amber-50/60',   border: 'border-amber-200'   },
  { id: 'Quotation Sent',       label: 'Quotation Sent',       colorBar: 'bg-orange-500',  chip: 'bg-orange-100 text-orange-700',  colBg: 'bg-orange-50/60',  border: 'border-orange-200'  },
  { id: 'Negotiation',          label: 'Negotiation',          colorBar: 'bg-pink-500',    chip: 'bg-pink-100 text-pink-700',      colBg: 'bg-pink-50/60',    border: 'border-pink-200'    },
  { id: 'Hardware Assignment',  label: '🔧 HW Assignment',     colorBar: 'bg-violet-500',  chip: 'bg-violet-100 text-violet-700',  colBg: 'bg-violet-50/60',  border: 'border-violet-200'  },
  { id: 'Won',                  label: '🏆 Won',               colorBar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700',colBg: 'bg-emerald-50/60', border: 'border-emerald-200' },
  { id: 'Lost',                 label: 'Lost',                 colorBar: 'bg-red-400',     chip: 'bg-red-100 text-red-600',        colBg: 'bg-red-50/40',     border: 'border-red-200'     },
]

const SOURCE_VARIANT = {
  'Walk-in':    'orange',
  'Referral':   'green',
  'Website':    'blue',
  'Cold Call':  'gray',
  'Social Media': 'purple',
}

const STAFF = [
  { name: 'Arjun Kumar',   initials: 'AK', color: 'bg-brand-blue'    },
  { name: 'Preethi Nair',  initials: 'PN', color: 'bg-purple-500'    },
  { name: 'Suresh Babu',   initials: 'SB', color: 'bg-emerald-500'   },
  { name: 'Anita Sharma',  initials: 'AS', color: 'bg-brand-orange'  },
]

const ENGINEERS = [
  { id: 'ENG-001', name: 'Ravi Technician',   dept: 'Field Engineering' },
  { id: 'ENG-002', name: 'Kumar Installer',   dept: 'Installation'      },
  { id: 'ENG-003', name: 'Sunil Networks',    dept: 'Networking'        },
  { id: 'ENG-004', name: 'Dinesh Fiber',      dept: 'Fiber Optics'      },
]

const EQUIPMENT = [
  { id: 'EQ-101', name: 'ONT Device – Huawei HG8310M',  category: 'ONT',    stock: 12 },
  { id: 'EQ-102', name: 'WiFi Router – TP-Link AC1200',  category: 'Router', stock: 8  },
  { id: 'EQ-103', name: 'ONU – ZTE F660',                category: 'ONU',    stock: 5  },
  { id: 'EQ-104', name: 'Cat6 Cable (50m roll)',          category: 'Cable',  stock: 20 },
  { id: 'EQ-105', name: 'Fiber Patch Panel 12-port',     category: 'Patch',  stock: 4  },
  { id: 'EQ-106', name: 'Media Converter – 1Gbps',       category: 'Switch', stock: 7  },
]

const PLANS = ['50 Mbps Starter', '100 Mbps Home', '200 Mbps Pro', '500 Mbps Ultra']
const AREAS = ['Koramangala', 'Indiranagar', 'Whitefield', 'HSR Layout', 'Electronic City', 'Marathahalli', 'BTM Layout']
const SOURCES = ['Walk-in', 'Referral', 'Website', 'Cold Call', 'Social Media']

const INIT_LEADS = [
  { id: 'LD-201', name: 'Ramesh Nair',     phone: '9876001122', email: '',                 area: 'Koramangala',     source: 'Website',      stage: 'New Inquiry',         plan: '100 Mbps Home',   assigned: 'Arjun Kumar',  assignedInitials: 'AK', assignedColor: 'bg-brand-blue',   daysInStage: 2,  lastActivity: 'Form submitted',        followUp: '2026-05-08', priority: 'high',   ekycStatus: null,      hwAssigned: null },
  { id: 'LD-202', name: 'Sunita Bose',     phone: '9765443322', email: 'sunita@email.com', area: 'Indiranagar',     source: 'Referral',     stage: 'Contacted',           plan: '200 Mbps Pro',    assigned: 'Preethi Nair', assignedInitials: 'PN', assignedColor: 'bg-purple-500',   daysInStage: 1,  lastActivity: 'Called – Interested',   followUp: '2026-05-09', priority: 'high',   ekycStatus: null,      hwAssigned: null },
  { id: 'LD-203', name: 'Harish Kulkarni', phone: '9988001133', email: '',                 area: 'Whitefield',      source: 'Walk-in',      stage: 'Site Survey',         plan: '50 Mbps Starter', assigned: 'Arjun Kumar',  assignedInitials: 'AK', assignedColor: 'bg-brand-blue',   daysInStage: 4,  lastActivity: 'Survey scheduled',      followUp: '2026-05-10', priority: 'medium', ekycStatus: 'Sent',    hwAssigned: null },
  { id: 'LD-204', name: 'Meena Iyer',      phone: '9123887766', email: 'meena@email.com',  area: 'HSR Layout',      source: 'Social Media', stage: 'Negotiation',         plan: '500 Mbps Ultra',  assigned: 'Preethi Nair', assignedInitials: 'PN', assignedColor: 'bg-purple-500',   daysInStage: 3,  lastActivity: 'Price discussed',       followUp: '2026-05-07', priority: 'high',   ekycStatus: null,      hwAssigned: null },
  { id: 'LD-205', name: 'Deepak Joshi',    phone: '9011556677', email: '',                 area: 'Electronic City', source: 'Cold Call',    stage: 'Follow-up',           plan: '100 Mbps Home',   assigned: 'Suresh Babu',  assignedInitials: 'SB', assignedColor: 'bg-emerald-500',  daysInStage: 6,  lastActivity: 'No answer – retry',     followUp: '2026-05-07', priority: 'medium', ekycStatus: null,      hwAssigned: null },
  { id: 'LD-206', name: 'Kavita Sharma',   phone: '9876543210', email: 'kavita@email.com', area: 'BTM Layout',      source: 'Referral',     stage: 'Quotation Sent',      plan: '200 Mbps Pro',    assigned: 'Anita Sharma', assignedInitials: 'AS', assignedColor: 'bg-brand-orange', daysInStage: 2,  lastActivity: 'Quote emailed',         followUp: '2026-05-11', priority: 'medium', ekycStatus: null,      hwAssigned: null },
  { id: 'LD-207', name: 'Arun Pillai',     phone: '9087654321', email: '',                 area: 'Marathahalli',    source: 'Website',      stage: 'Hardware Assignment', plan: '100 Mbps Home',   assigned: 'Arjun Kumar',  assignedInitials: 'AK', assignedColor: 'bg-brand-blue',   daysInStage: 1,  lastActivity: 'HW pending assignment', followUp: '',           priority: 'medium', ekycStatus: 'Completed',hwAssigned: null },
  { id: 'LD-208', name: 'Lakshmi Devi',    phone: '9123456780', email: '',                 area: 'Koramangala',     source: 'Walk-in',      stage: 'Lost',                plan: '50 Mbps Starter', assigned: 'Preethi Nair', assignedInitials: 'PN', assignedColor: 'bg-purple-500',   daysInStage: 12, lastActivity: 'Not interested',        followUp: '',           priority: 'low',    ekycStatus: null,      hwAssigned: null },
  { id: 'LD-209', name: 'Vinod Kumar',     phone: '9988776655', email: 'vinod@email.com',  area: 'Indiranagar',     source: 'Cold Call',    stage: 'New Inquiry',         plan: '200 Mbps Pro',    assigned: 'Suresh Babu',  assignedInitials: 'SB', assignedColor: 'bg-emerald-500',  daysInStage: 0,  lastActivity: 'Lead created',          followUp: '2026-05-08', priority: 'low',    ekycStatus: null,      hwAssigned: null },
  { id: 'LD-210', name: 'Rekha Menon',     phone: '9871234560', email: '',                 area: 'HSR Layout',      source: 'Referral',     stage: 'Contacted',           plan: '500 Mbps Ultra',  assigned: 'Anita Sharma', assignedInitials: 'AS', assignedColor: 'bg-brand-orange', daysInStage: 2,  lastActivity: 'WhatsApp sent',         followUp: '2026-05-09', priority: 'high',   ekycStatus: null,      hwAssigned: null },
  { id: 'LD-211', name: 'Sanjay Rao',      phone: '9654321098', email: 'sanjay@email.com', area: 'Whitefield',      source: 'Website',      stage: 'Site Survey',         plan: '200 Mbps Pro',    assigned: 'Arjun Kumar',  assignedInitials: 'AK', assignedColor: 'bg-brand-blue',   daysInStage: 3,  lastActivity: 'Survey done',           followUp: '2026-05-10', priority: 'high',   ekycStatus: null,      hwAssigned: null },
  { id: 'LD-212', name: 'Pooja Nair',      phone: '9432109876', email: '',                 area: 'Electronic City', source: 'Social Media', stage: 'Follow-up',           plan: '100 Mbps Home',   assigned: 'Preethi Nair', assignedInitials: 'PN', assignedColor: 'bg-purple-500',   daysInStage: 5,  lastActivity: 'Missed call returned',  followUp: '2026-05-07', priority: 'medium', ekycStatus: null,      hwAssigned: null },
  { id: 'LD-213', name: 'Mohan Das',       phone: '9345678901', email: 'mohan@email.com',  area: 'BTM Layout',      source: 'Walk-in',      stage: 'New Inquiry',         plan: '50 Mbps Starter', assigned: 'Suresh Babu',  assignedInitials: 'SB', assignedColor: 'bg-emerald-500',  daysInStage: 0,  lastActivity: 'Walked in today',       followUp: '2026-05-09', priority: 'medium', ekycStatus: null,      hwAssigned: null },
  { id: 'LD-214', name: 'Divya Krishnan',  phone: '9876001234', email: 'divya@email.com',  area: 'Koramangala',     source: 'Referral',     stage: 'Negotiation',         plan: '200 Mbps Pro',    assigned: 'Anita Sharma', assignedInitials: 'AS', assignedColor: 'bg-brand-orange', daysInStage: 1,  lastActivity: 'Final offer sent',      followUp: '2026-05-08', priority: 'high',   ekycStatus: null,      hwAssigned: null },
  { id: 'LD-215', name: 'Ravi Shankar',    phone: '9012345678', email: '',                 area: 'Marathahalli',    source: 'Cold Call',    stage: 'Won',                 plan: '500 Mbps Ultra',  assigned: 'Arjun Kumar',  assignedInitials: 'AK', assignedColor: 'bg-brand-blue',   daysInStage: 0,  lastActivity: 'Deal closed',           followUp: '',           priority: 'low',    ekycStatus: 'Completed',hwAssigned: null },
]

const INIT_FORM = {
  name: '', phone: '', email: '', area: '', source: '',
  plan: '', assigned: '', followUp: '', notes: '',
}

const EKYC_STATUS_BADGE = {
  Pending:   'yellow',
  Sent:      'blue',
  Completed: 'green',
  Failed:    'red',
}

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
    // Simulate Digio API call
    setTimeout(() => {
      setSubmitting(false)
      setSent(true)
      onSave('Sent')
    }, 1500)
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
                { time: 'Now', event: 'Request created on Digio' },
                { time: 'Now', event: `${form.sendVia} sent to customer` },
                { time: 'Pending', event: 'Customer completes Aadhaar OTP verification' },
                { time: 'Pending', event: 'Digio webhook confirmation received' },
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                  <span className={`font-semibold shrink-0 ${t.time === 'Now' ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {t.time}
                  </span>
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`eKYC Request — ${lead?.name}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            icon={submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            onClick={handleSend}
            disabled={submitting || !form.aadhaar.replace(/\s/g, '').match(/^\d{12}$/)}
          >
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
              const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
              set('aadhaar', formatted)
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
                <input
                  type="radio"
                  value={opt}
                  checked={form.sendVia === opt}
                  onChange={() => set('sendVia', opt)}
                  className="accent-brand-blue"
                />
                <span className="text-sm font-medium text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        </FormField>

        {form.sendVia === 'Email' ? (
          <FormField label="Customer Email">
            <Input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="customer@email.com"
            />
          </FormField>
        ) : (
          <FormField label="Customer WhatsApp">
            <Input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="9876543210"
            />
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
  const [engineer, setEngineer] = useState('')
  const [equipment, setEquipment] = useState('')
  const [confirming, setConfirming] = useState(false)

  const selectedEng = ENGINEERS.find(e => e.id === engineer)
  const selectedEq  = EQUIPMENT.find(e => e.id === equipment)

  function handleConfirm() {
    if (!engineer || !equipment) return
    onConfirm({
      engineerId: engineer,
      engineerName: selectedEng?.name,
      equipmentId: equipment,
      equipmentName: selectedEq?.name,
      assignedAt: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Hardware — ${lead?.name}`}
      size="md"
      footer={
        !confirming ? (
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              icon={<HardDrive size={14} />}
              onClick={() => setConfirming(true)}
              disabled={!engineer || !equipment}
            >
              Assign
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>Back</Button>
            <Button variant="orange" icon={<CheckCircle2 size={14} />} onClick={handleConfirm}>
              Confirm Assignment
            </Button>
          </>
        )
      }
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
              {ENGINEERS.map(eng => (
                <option key={eng.id} value={eng.id}>
                  {eng.name} ({eng.id}) — {eng.dept}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Select Equipment" required>
            <Select value={equipment} onChange={e => setEquipment(e.target.value)}>
              <option value="">Choose equipment…</option>
              {EQUIPMENT.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} · Stock: {eq.stock}
                </option>
              ))}
            </Select>
          </FormField>

          {engineer && equipment && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1.5">
              <p className="font-semibold text-gray-700 text-xs uppercase tracking-wider mb-2">Assignment Preview</p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Engineer</span>
                <span className="font-semibold text-gray-800">{selectedEng?.name} · {engineer}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Equipment</span>
                <span className="font-semibold text-gray-800">{selectedEq?.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Lead</span>
                <span className="font-semibold text-gray-800">{lead?.name} ({lead?.id})</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              Please confirm the hardware assignment. This action will deduct equipment from inventory and notify the engineer.
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {[
              ['Lead',          `${lead?.name} (${lead?.id})`],
              ['Engineer',      `${selectedEng?.name} · ${engineer}`],
              ['Department',    selectedEng?.dept],
              ['Equipment',     selectedEq?.name],
              ['Equipment ID',  equipment],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-900">{value}</span>
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
  const isHwStage = lead.stage === 'Hardware Assignment'
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
      {/* Name + area */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{lead.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{lead.area}</p>
        </div>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${lead.assignedColor}`}>
          {lead.assignedInitials}
        </div>
      </div>

      {/* Phone */}
      <p className="text-xs font-mono text-gray-600 mb-3">{lead.phone}</p>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Badge variant={SOURCE_VARIANT[lead.source] ?? 'gray'} size="sm">{lead.source}</Badge>
        {lead.plan && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-navy/10 text-navy">
            {lead.plan}
          </span>
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
      </div>

      {/* HW assigned info */}
      {lead.hwAssigned && (
        <div className="flex items-center gap-1.5 text-[11px] text-violet-600 bg-violet-50 rounded-lg px-2 py-1.5 mb-3 border border-violet-200">
          <HardDrive size={11} />
          <span className="font-medium truncate">{lead.hwAssigned.equipmentName}</span>
          <span className="text-violet-400">·</span>
          <span>{lead.hwAssigned.engineerName?.split(' ')[0]}</span>
        </div>
      )}

      {/* Days in stage + follow-up */}
      <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {lead.daysInStage === 0 ? 'Today' : `${lead.daysInStage}d in stage`}
        </span>
        {lead.followUp && (
          <span className={`flex items-center gap-1 font-medium ${urgentFollowUp ? 'text-brand-orange' : 'text-gray-500'}`}>
            <CalendarDays size={11} />
            {lead.followUp}
          </span>
        )}
      </div>

      {/* Last activity */}
      <p className="text-[11px] text-gray-400 italic mb-3 truncate">{lead.lastActivity}</p>

      {/* Hardware Assignment stage — role-restricted action */}
      {isHwStage && (
        <div className={`mb-3 p-2 rounded-lg border text-center ${
          canAssignHw ? 'border-violet-200 bg-violet-50' : 'border-gray-200 bg-gray-50'
        }`}>
          {canAssignHw ? (
            <button
              onClick={e => { e.stopPropagation(); onAssignHw(lead) }}
              className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-violet-700 hover:text-violet-900 transition-colors"
            >
              <HardDrive size={12} /> Assign Hardware
            </button>
          ) : (
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
              <Shield size={11} /> Inventory role required
            </p>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-1 pt-2 border-t border-surface-border">
        <a
          href={`tel:${lead.phone}`}
          onClick={e => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold text-gray-600 hover:text-brand-blue hover:bg-brand-blue/5 rounded-lg transition-colors"
        >
          <Phone size={12} /> Call
        </a>
        <button
          onClick={e => { e.stopPropagation(); onEkyc(lead) }}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold text-gray-600 hover:text-brand-blue hover:bg-brand-blue/5 rounded-lg transition-colors"
        >
          <Fingerprint size={12} /> eKYC
        </button>
        <button
          onClick={e => { e.stopPropagation(); onEdit(lead) }}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold text-gray-600 hover:text-brand-orange hover:bg-brand-orange/5 rounded-lg transition-colors"
        >
          <Edit3 size={12} /> Edit
        </button>
      </div>
    </div>
  )
}

// ── Create / Edit Lead Modal ──────────────────────────────────────────────────

function LeadModal({ isOpen, onClose, onSave, initial }) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState(initial ?? INIT_FORM)

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function handleSave() {
    if (!form.name.trim() || !form.phone.match(/^\d{10}$/)) return
    const staff = STAFF.find(s => s.name === form.assigned)
    onSave({
      ...form,
      id: isEdit ? initial.id : `LD-${Date.now()}`,
      stage: isEdit ? initial.stage : 'New Inquiry',
      daysInStage: isEdit ? initial.daysInStage : 0,
      lastActivity: isEdit ? initial.lastActivity : 'Lead created',
      assignedInitials: staff?.initials ?? '??',
      assignedColor: staff?.color ?? 'bg-gray-400',
      priority: 'medium',
      ekycStatus: isEdit ? initial.ekycStatus : null,
      hwAssigned: isEdit ? initial.hwAssigned : null,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Lead — ${initial.name}` : 'Create New Lead'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{isEdit ? 'Save Changes' : 'Create Lead'}</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Full Name" required>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ramesh Nair" />
        </FormField>
        <FormField label="Phone Number" required>
          <Input
            type="tel"
            value={form.phone}
            onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="9876543210"
          />
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
            <Textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any additional notes about this lead…"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Sales() {
  const [leads, setLeads]               = useState(INIT_LEADS)
  const [draggingId, setDraggingId]     = useState(null)
  const [dragOverStage, setDragOverStage] = useState(null)
  const [showModal, setShowModal]       = useState(false)
  const [editLead, setEditLead]         = useState(null)
  const [ekycLead, setEkycLead]         = useState(null)
  const [hwLead, setHwLead]             = useState(null)
  const [search, setSearch]             = useState('')
  // Role toggle for demo — 'sales' | 'inventory'
  const [userRole, setUserRole]         = useState('sales')

  // ── Drag and drop ────────────────────────────────────────────────────────
  function handleDragStart(e, id) {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDragOverStage(null)
  }

  function handleDragOver(e, stageId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverStage !== stageId) setDragOverStage(stageId)
  }

  function handleDrop(e, stageId) {
    e.preventDefault()
    if (draggingId) {
      setLeads(prev => prev.map(l =>
        l.id === draggingId && l.stage !== stageId
          ? { ...l, stage: stageId, daysInStage: 0, lastActivity: `Moved to ${stageId}` }
          : l
      ))
    }
    setDraggingId(null)
    setDragOverStage(null)
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverStage(null)
    }
  }

  // ── Lead CRUD ────────────────────────────────────────────────────────────
  function saveLead(lead) {
    setLeads(prev => {
      const exists = prev.find(l => l.id === lead.id)
      return exists ? prev.map(l => l.id === lead.id ? lead : l) : [lead, ...prev]
    })
  }

  function openEdit(lead) {
    setEditLead(lead)
    setShowModal(true)
  }

  function saveEkycStatus(leadId, status) {
    setLeads(prev => prev.map(l =>
      l.id === leadId
        ? { ...l, ekycStatus: status, lastActivity: `eKYC ${status}` }
        : l
    ))
  }

  function saveHwAssignment(leadId, hw) {
    setLeads(prev => prev.map(l =>
      l.id === leadId
        ? { ...l, hwAssigned: hw, lastActivity: `HW assigned: ${hw.equipmentName}` }
        : l
    ))
  }

  // ── Derived stats ────────────────────────────────────────────────────────
  const wonCount       = leads.filter(l => l.stage === 'Won').length
  const lostCount      = leads.filter(l => l.stage === 'Lost').length
  const activeCount    = leads.filter(l => !['Won', 'Lost'].includes(l.stage)).length
  const todayFollowUps = leads.filter(l => l.followUp === '2026-05-15').length

  const filteredLeads = search.trim()
    ? leads.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search) ||
        l.area.toLowerCase().includes(search.toLowerCase())
      )
    : leads

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 space-y-5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sales Pipeline</h1>
            <p className="text-sm text-gray-500 mt-0.5">Drag cards between stages to update lead progress</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Role toggle for demo */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs">
              {['sales', 'inventory'].map(role => (
                <button
                  key={role}
                  onClick={() => setUserRole(role)}
                  className={`px-3 py-1 rounded-md font-semibold capitalize transition-all ${
                    userRole === role ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {role === 'inventory' ? '🔧' : '📊'} {role}
                </button>
              ))}
            </div>
            <Link to="/sales/followups">
              <Button variant="secondary" size="sm" icon={<PhoneCall size={14} />}>
                Follow-ups
                {todayFollowUps > 0 && (
                  <span className="ml-1 bg-brand-orange text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {todayFollowUps}
                  </span>
                )}
              </Button>
            </Link>
            <Link to="/sales/pipelines">
              <Button variant="secondary" size="sm" icon={<Layers size={14} />}>
                Pipelines
              </Button>
            </Link>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditLead(null); setShowModal(true) }}>
              Add Lead
            </Button>
          </div>
        </div>

        {/* Pipeline summary stats */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total Leads',     value: leads.length,    icon: Users,        color: 'text-gray-700',        bg: 'bg-gray-100'       },
            { label: 'Active',          value: activeCount,     icon: TrendingUp,   color: 'text-brand-blue',      bg: 'bg-brand-blue/10'  },
            { label: 'Today Follow-ups',value: todayFollowUps,  icon: CalendarDays, color: 'text-brand-orange',    bg: 'bg-brand-orange/10'},
            { label: 'Won This Month',  value: wonCount,        icon: CheckCircle2, color: 'text-emerald-700',     bg: 'bg-emerald-100'    },
            { label: 'Lost',            value: lostCount,       icon: XCircle,      color: 'text-red-600',         bg: 'bg-red-100'        },
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

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads by name, phone, area…"
              className="pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white w-full focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          {search && (
            <span className="text-sm text-gray-500">
              {filteredLeads.length} result{filteredLeads.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── Kanban board ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6">
        <div className="flex gap-3 h-full" style={{ minWidth: `${STAGES.length * 260}px` }}>
          {STAGES.map(stage => {
            const stageLeads = filteredLeads.filter(l => l.stage === stage.id)
            const isOver = dragOverStage === stage.id
            const isHwStage = stage.id === 'Hardware Assignment'

            return (
              <div
                key={stage.id}
                className={`flex flex-col rounded-xl border transition-all duration-150 ${stage.colBg} ${stage.border} ${
                  isOver ? 'ring-2 ring-brand-blue/50 scale-[1.01]' : ''
                } ${isHwStage ? 'ring-1 ring-violet-300' : ''}`}
                style={{ width: 252, minWidth: 252 }}
                onDragOver={e => handleDragOver(e, stage.id)}
                onDrop={e => handleDrop(e, stage.id)}
                onDragLeave={handleDragLeave}
              >
                {/* Column header */}
                <div className="px-3 pt-3 pb-2.5 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${stage.colorBar}`} />
                      <span className="text-xs font-bold text-gray-700">{stage.label}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stage.chip}`}>
                      {stageLeads.length}
                    </span>
                  </div>
                  {isHwStage && (
                    <p className="text-[10px] text-violet-500 mt-1 flex items-center gap-1">
                      <Shield size={10} />
                      {userRole === 'inventory' ? 'You can assign hardware' : 'Inventory role only'}
                    </p>
                  )}
                </div>

                {/* Drop zone indicator */}
                {isOver && draggingId && (
                  <div className="mx-3 mb-2 h-1.5 rounded-full bg-brand-blue/40 animate-pulse" />
                )}

                {/* Cards */}
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2.5 scrollbar-hide">
                  {stageLeads.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center py-8 text-center ${isOver ? 'opacity-0' : 'opacity-100'}`}>
                      <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center mb-2">
                        <Plus size={16} className="text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-400">Drop here</p>
                    </div>
                  ) : (
                    stageLeads.map(lead => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        isDragging={draggingId === lead.id}
                        onEdit={openEdit}
                        onEkyc={lead => setEkycLead(lead)}
                        onAssignHw={lead => setHwLead(lead)}
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
        <LeadModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setEditLead(null) }}
          onSave={saveLead}
          initial={editLead}
        />
      )}

      {ekycLead && (
        <EkycModal
          isOpen={!!ekycLead}
          onClose={() => setEkycLead(null)}
          lead={ekycLead}
          onSave={status => saveEkycStatus(ekycLead.id, status)}
        />
      )}

      {hwLead && (
        <HardwareAssignModal
          isOpen={!!hwLead}
          onClose={() => setHwLead(null)}
          lead={hwLead}
          onConfirm={hw => saveHwAssignment(hwLead.id, hw)}
        />
      )}
    </div>
  )
}

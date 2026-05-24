import { useState, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HardDrive, Shield, AlertTriangle, CheckCircle2, Clock,
  Package, User, ChevronDown, ChevronUp, Check, Loader2, BarChart3,
  Users, Timer, ClipboardList, X
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Select, Textarea } from '../components/ui/FormInputs'

// ── Constants ────────────────────────────────────────────────────────────────

const ENGINEERS = [
  { id: 'ENG-001', name: 'Ravi Technician',  dept: 'Field Engineering', available: 2 },
  { id: 'ENG-002', name: 'Kumar Installer',  dept: 'Installation',      available: 1 },
  { id: 'ENG-003', name: 'Sunil Networks',   dept: 'Networking',        available: 3 },
  { id: 'ENG-004', name: 'Dinesh Fiber',     dept: 'Fiber Optics',      available: 0 },
  { id: 'ENG-005', name: 'Pradeep Ops',      dept: 'Operations',        available: 1 },
]

const EQUIPMENT_LIST = [
  { id: 'EQ-101', name: 'ONT Device – Huawei HG8310M',   category: 'ONT',       stock: 12 },
  { id: 'EQ-102', name: 'WiFi Router – TP-Link AC1200',  category: 'Router',    stock: 8  },
  { id: 'EQ-103', name: 'ONU – ZTE F660',                category: 'ONU',       stock: 5  },
  { id: 'EQ-104', name: 'Cat6 Cable (50m roll)',          category: 'Cable',     stock: 20 },
  { id: 'EQ-105', name: 'Fiber Patch Cord (3m)',          category: 'Patch',     stock: 35 },
  { id: 'EQ-106', name: 'Optical Splitter 1×8',          category: 'Splitter',  stock: 7  },
  { id: 'EQ-107', name: 'Media Converter – 1Gbps',       category: 'Switch',    stock: 4  },
]

const PLAN_VARIANT = {
  '50 Mbps Starter':  'gray',
  '100 Mbps Home':    'blue',
  '200 Mbps Pro':     'purple',
  '500 Mbps Ultra':   'navy',
}

const STATUS_STYLE = {
  Pending:   { badge: 'yellow', row: ''                    },
  Assigned:  { badge: 'blue',   row: 'bg-blue-50/30'       },
  Completed: { badge: 'green',  row: 'bg-emerald-50/30'    },
}

const FILTERS = ['All', 'Pending', 'Assigned', 'Completed']

const TODAY = new Date().toISOString().split('T')[0]

const INIT_QUEUE = [
  {
    id: 'HW-001', leadId: 'LD-207', customerName: 'Arun Pillai',
    phone: '9087654321', area: 'Marathahalli', plan: '100 Mbps Home',
    salesAgent: 'Arjun Kumar', daysWaiting: 3,
    engineerId: null, engineerName: null,
    equipment: [], notes: '',
    status: 'Pending', ekycStatus: 'Completed',
    assignedAt: null,
    feasibility: { cableType: 'Fiber Optic', cableLength: 50, buildingType: 'Apartment', floorNumber: 3, oltDistance: 200, roofAccess: 'Yes', powerSource: 'Yes', wallDrilling: 'No', notes: '' },
  },
  {
    id: 'HW-002', leadId: 'LD-218', customerName: 'Balaji Reddy',
    phone: '9900112233', area: 'Koramangala', plan: '200 Mbps Pro',
    salesAgent: 'Preethi Nair', daysWaiting: 1,
    engineerId: null, engineerName: null,
    equipment: [], notes: '',
    status: 'Pending', ekycStatus: 'Sent',
    assignedAt: null,
    feasibility: null,
  },
  {
    id: 'HW-003', leadId: 'LD-219', customerName: 'Chitra Subramaniam',
    phone: '9123005566', area: 'HSR Layout', plan: '500 Mbps Ultra',
    salesAgent: 'Anita Sharma', daysWaiting: 0,
    engineerId: null, engineerName: null,
    equipment: [], notes: '',
    status: 'Pending', ekycStatus: 'Completed',
    assignedAt: null,
    feasibility: { cableType: 'Copper', cableLength: 75, buildingType: 'Office', floorNumber: 5, oltDistance: 320, roofAccess: 'No', powerSource: 'Yes', wallDrilling: 'Yes', notes: 'Building permission required for drilling' },
  },
  {
    id: 'HW-004', leadId: 'LD-220', customerName: 'Farhan Sheikh',
    phone: '9988001177', area: 'Indiranagar', plan: '100 Mbps Home',
    salesAgent: 'Suresh Babu', daysWaiting: 4,
    engineerId: null, engineerName: null,
    equipment: [], notes: '',
    status: 'Pending', ekycStatus: 'Completed',
    assignedAt: null,
    feasibility: null,
  },
  {
    id: 'HW-005', leadId: 'LD-221', customerName: 'Geeta Pillai',
    phone: '9765001234', area: 'Whitefield', plan: '200 Mbps Pro',
    salesAgent: 'Arjun Kumar', daysWaiting: 5,
    engineerId: null, engineerName: null,
    equipment: [], notes: '',
    status: 'Pending', ekycStatus: 'Completed',
    assignedAt: null,
    feasibility: null,
  },
  {
    id: 'HW-006', leadId: 'LD-222', customerName: 'Harsha Vardhan',
    phone: '9876554321', area: 'Electronic City', plan: '50 Mbps Starter',
    salesAgent: 'Preethi Nair', daysWaiting: 2,
    engineerId: null, engineerName: null,
    equipment: [], notes: '',
    status: 'Pending', ekycStatus: 'Pending',
    assignedAt: null,
    feasibility: null,
  },
  {
    id: 'HW-007', leadId: 'LD-223', customerName: 'Indira Krishnamurthy',
    phone: '9012334455', area: 'BTM Layout', plan: '100 Mbps Home',
    salesAgent: 'Anita Sharma', daysWaiting: 1,
    engineerId: null, engineerName: null,
    equipment: [], notes: '',
    status: 'Pending', ekycStatus: 'Completed',
    assignedAt: null,
    feasibility: null,
  },
  {
    id: 'HW-008', leadId: 'LD-224', customerName: 'Jayesh Patel',
    phone: '9900667788', area: 'Marathahalli', plan: '500 Mbps Ultra',
    salesAgent: 'Suresh Babu', daysWaiting: 0,
    engineerId: null, engineerName: null,
    equipment: [], notes: '',
    status: 'Pending', ekycStatus: 'Sent',
    assignedAt: null,
    feasibility: null,
  },
  {
    id: 'HW-009', leadId: 'LD-210', customerName: 'Karthik Iyer',
    phone: '9871001122', area: 'Koramangala', plan: '200 Mbps Pro',
    salesAgent: 'Arjun Kumar', daysWaiting: 0,
    engineerId: 'ENG-003', engineerName: 'Sunil Networks',
    equipment: [
      { id: 'EQ-101', name: 'ONT Device – Huawei HG8310M' },
      { id: 'EQ-102', name: 'WiFi Router – TP-Link AC1200' },
    ],
    notes: 'Priority install — customer requested morning slot',
    status: 'Assigned', ekycStatus: 'Completed',
    assignedAt: TODAY,
    feasibility: { cableType: 'Fiber Optic', cableLength: 60, buildingType: 'Apartment', floorNumber: 2, oltDistance: 180, roofAccess: 'Yes', powerSource: 'Yes', wallDrilling: 'No', notes: '' },
  },
  {
    id: 'HW-010', leadId: 'LD-211', customerName: 'Lakshmi Suresh',
    phone: '9123445566', area: 'Whitefield', plan: '100 Mbps Home',
    salesAgent: 'Preethi Nair', daysWaiting: 0,
    engineerId: 'ENG-001', engineerName: 'Ravi Technician',
    equipment: [
      { id: 'EQ-101', name: 'ONT Device – Huawei HG8310M' },
      { id: 'EQ-104', name: 'Cat6 Cable (50m roll)'        },
    ],
    notes: '',
    status: 'Assigned', ekycStatus: 'Completed',
    assignedAt: TODAY,
    feasibility: null,
  },
  {
    id: 'HW-011', leadId: 'LD-212', customerName: 'Mohan Rajan',
    phone: '9988771133', area: 'Indiranagar', plan: '200 Mbps Pro',
    salesAgent: 'Suresh Babu', daysWaiting: 0,
    engineerId: 'ENG-002', engineerName: 'Kumar Installer',
    equipment: [
      { id: 'EQ-103', name: 'ONU – ZTE F660'              },
      { id: 'EQ-105', name: 'Fiber Patch Cord (3m)'        },
      { id: 'EQ-106', name: 'Optical Splitter 1×8'         },
    ],
    notes: 'Fiber trench work required',
    status: 'Assigned', ekycStatus: 'Completed',
    assignedAt: TODAY,
    feasibility: null,
  },
  {
    id: 'HW-012', leadId: 'LD-205', customerName: 'Nalini Menon',
    phone: '9765441122', area: 'HSR Layout', plan: '500 Mbps Ultra',
    salesAgent: 'Anita Sharma', daysWaiting: 0,
    engineerId: 'ENG-004', engineerName: 'Dinesh Fiber',
    equipment: [
      { id: 'EQ-101', name: 'ONT Device – Huawei HG8310M' },
      { id: 'EQ-107', name: 'Media Converter – 1Gbps'     },
    ],
    notes: 'Installation completed and tested',
    status: 'Completed', ekycStatus: 'Completed',
    assignedAt: '2026-05-14',
    feasibility: { cableType: 'Fiber Optic', cableLength: 40, buildingType: 'Villa', floorNumber: 1, oltDistance: 150, roofAccess: 'Yes', powerSource: 'Yes', wallDrilling: 'No', notes: 'Outdoor cabinet nearby' },
  },
]

// ── Role toggle (shared across Sales pages) ──────────────────────────────────

function RoleToggle({ current }) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs">
      <button
        onClick={() => navigate('/sales')}
        className={`px-3 py-1 rounded-md font-semibold capitalize transition-all ${
          current === 'sales' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        📊 Sales
      </button>
      <button
        onClick={() => navigate('/sales/hw-assignment')}
        className={`px-3 py-1 rounded-md font-semibold capitalize transition-all ${
          current === 'inventory' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        🔧 Inventory
      </button>
    </div>
  )
}

// ── Assign Hardware Modal ─────────────────────────────────────────────────────

function AssignModal({ isOpen, onClose, item, onConfirm }) {
  const [engineer, setEngineer]   = useState('')
  const [equipment, setEquipment] = useState([])
  const [notes, setNotes]         = useState('')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving]       = useState(false)

  const selectedEng = ENGINEERS.find(e => e.id === engineer)

  function toggleEquipment(eq) {
    setEquipment(prev =>
      prev.find(e => e.id === eq.id)
        ? prev.filter(e => e.id !== eq.id)
        : [...prev, { id: eq.id, name: eq.name }]
    )
  }

  function handleConfirm() {
    setSaving(true)
    setTimeout(() => {
      onConfirm({
        engineerId: engineer,
        engineerName: selectedEng?.name,
        equipment,
        notes,
        assignedAt: TODAY,
      })
      setSaving(false)
      onClose()
    }, 900)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Hardware — ${item?.customerName}`}
      size="lg"
      footer={
        !confirming ? (
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              icon={<HardDrive size={14} />}
              onClick={() => setConfirming(true)}
              disabled={!engineer || equipment.length === 0}
            >
              Assign
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={saving}>Back</Button>
            <Button
              variant="orange"
              icon={saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              onClick={handleConfirm}
              disabled={saving}
            >
              {saving ? 'Assigning…' : 'Confirm Assignment'}
            </Button>
          </>
        )
      }
    >
      {!confirming ? (
        <div className="space-y-5">
          {/* Customer info — read only */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Customer Info</p>
            <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4 border border-surface-border">
              {[
                ['Name',  item?.customerName],
                ['Phone', item?.phone],
                ['Area',  item?.area],
                ['Plan',  item?.plan],
                ['Lead',  item?.leadId],
                ['eKYC',  item?.ekycStatus ?? '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Select Engineer */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Engineer</p>
            <div className="space-y-2">
              {ENGINEERS.map(eng => (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => setEngineer(eng.id)}
                  disabled={eng.available === 0}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    engineer === eng.id
                      ? 'border-brand-blue bg-brand-blue/5 ring-1 ring-brand-blue/30'
                      : eng.available === 0
                      ? 'border-surface-border bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-surface-border bg-white hover:border-brand-blue/40 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                      engineer === eng.id ? 'bg-brand-blue' : 'bg-gray-300'
                    }`}>
                      {eng.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{eng.name}</p>
                      <p className="text-xs text-gray-400">{eng.id} · {eng.dept}</p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      eng.available === 0
                        ? 'bg-red-100 text-red-600'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {eng.available === 0 ? 'Busy' : `${eng.available} free`}
                    </span>
                    {engineer === eng.id && <Check size={16} className="text-brand-blue" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Select Equipment — checklist */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Select Equipment <span className="text-gray-300 font-normal">(multi-select)</span>
            </p>
            <div className="space-y-2">
              {EQUIPMENT_LIST.map(eq => {
                const checked = !!equipment.find(e => e.id === eq.id)
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => toggleEquipment(eq)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${
                      checked
                        ? 'border-brand-blue bg-brand-blue/5 ring-1 ring-brand-blue/30'
                        : 'border-surface-border bg-white hover:border-brand-blue/40 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      checked ? 'border-brand-blue bg-brand-blue' : 'border-gray-300 bg-white'
                    }`}>
                      {checked && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{eq.name}</p>
                      <p className="text-xs text-gray-400">{eq.id} · {eq.category}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      eq.stock < 5 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {eq.stock} in stock
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Installation notes, special requirements…"
              rows={3}
              className="w-full text-sm border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue resize-none"
            />
          </div>
        </div>
      ) : (
        /* Confirmation step */
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              This will deduct selected equipment from inventory, tag the engineer ID to the record, and notify the engineer via the system.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl border border-surface-border p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assignment Summary</p>
            <div className="space-y-2.5">
              {[
                ['Customer',    `${item?.customerName} (${item?.leadId})`],
                ['Area',        item?.area],
                ['Plan',        item?.plan],
                ['Engineer',    `${selectedEng?.name} · ${engineer}`],
                ['Department',  selectedEng?.dept],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-900 text-right">{value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-surface-border">
                <p className="text-gray-500 text-sm mb-1.5">Equipment</p>
                <div className="space-y-1">
                  {equipment.map(eq => (
                    <div key={eq.id} className="flex items-center gap-2 text-xs text-gray-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0" />
                      {eq.name}
                    </div>
                  ))}
                </div>
              </div>
              {notes && (
                <div className="pt-2 border-t border-surface-border">
                  <p className="text-gray-500 text-sm mb-1">Notes</p>
                  <p className="text-xs text-gray-700 italic">{notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Equipment pill list ───────────────────────────────────────────────────────

function EquipmentPills({ items }) {
  if (!items || items.length === 0) return <span className="text-gray-300 text-xs">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(eq => (
        <span key={eq.id} className="text-[10px] bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium">
          {eq.name.split('–')[0].trim()}
        </span>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SalesHwAssignment() {
  const [queue, setQueue]           = useState(INIT_QUEUE)
  const [filter, setFilter]         = useState('All')
  const [assignItem, setAssignItem] = useState(null)
  const [expandedRows, setExpandedRows] = useState(new Set())

  function toggleExpand(id) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pendingCount   = queue.filter(i => i.status === 'Pending').length
  const assignedToday  = queue.filter(i => i.status === 'Assigned' && i.assignedAt === TODAY).length
  const availEngineers = ENGINEERS.filter(e => e.available > 0).length
  const avgTime        = 2.4

  const displayed = filter === 'All' ? queue : queue.filter(i => i.status === filter)

  function handleAssigned(id, data) {
    setQueue(prev => prev.map(item =>
      item.id === id
        ? {
            ...item,
            engineerId:   data.engineerId,
            engineerName: data.engineerName,
            equipment:    data.equipment,
            notes:        data.notes,
            assignedAt:   data.assignedAt,
            status:       'Assigned',
          }
        : item
    ))
  }

  function markCompleted(id) {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, status: 'Completed' } : item))
  }

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hardware Assignment</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pending assignments from Sales Pipeline</p>
        </div>
        <RoleToggle current="inventory" />
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: 'Pending Assignments', value: pendingCount,
            icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-100',
          },
          {
            label: 'Assigned Today', value: assignedToday,
            icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-100',
          },
          {
            label: 'Engineers Available', value: availEngineers,
            icon: Users, color: 'text-brand-blue', bg: 'bg-brand-blue/10',
          },
          {
            label: 'Avg Assignment Time', value: `${avgTime} hrs`,
            icon: Timer, color: 'text-brand-orange', bg: 'bg-brand-orange/10',
          },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl border border-surface-border shadow-card px-5 py-4 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                <Icon size={20} className={s.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 leading-tight mt-0.5">{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Filter tabs ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {FILTERS.map(f => {
          const count = f === 'All' ? queue.length : queue.filter(i => i.status === f).length
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                filter === f ? 'bg-brand-blue/10 text-brand-blue' : 'bg-gray-200 text-gray-500'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-surface-border">
                {[
                  'Lead / Customer', 'Area', 'Plan', 'Sales Agent',
                  'Days Waiting', 'Engineer', 'Equipment', 'Requirements', 'Status', 'Action',
                ].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-14 text-gray-400">
                    <HardDrive size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No assignments in this category</p>
                  </td>
                </tr>
              ) : (
                displayed.map(item => {
                  const style = STATUS_STYLE[item.status] ?? STATUS_STYLE.Pending
                  const overdueWait = item.daysWaiting > 2 && item.status === 'Pending'
                  const isExpanded = expandedRows.has(item.id)

                  return (
                    <Fragment key={item.id}>
                      <tr className={`border-b border-surface-border transition-colors hover:bg-gray-50/60 ${style.row} ${isExpanded ? 'border-b-0' : ''}`}>

                        {/* Lead / Customer */}
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{item.customerName}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{item.leadId}</p>
                        </td>

                        {/* Area */}
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.area}</td>

                        {/* Plan */}
                        <td className="px-4 py-3">
                          <Badge variant={PLAN_VARIANT[item.plan] ?? 'gray'} size="sm">{item.plan}</Badge>
                        </td>

                        {/* Sales Agent */}
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{item.salesAgent}</td>

                        {/* Days Waiting */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            overdueWait
                              ? 'bg-red-100 text-red-700'
                              : item.daysWaiting === 0
                              ? 'bg-gray-100 text-gray-500'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            <Clock size={11} />
                            {item.daysWaiting === 0 ? 'Today' : `${item.daysWaiting}d`}
                            {overdueWait && ' ⚠'}
                          </span>
                        </td>

                        {/* Engineer */}
                        <td className="px-4 py-3">
                          {item.engineerName ? (
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{item.engineerName}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{item.engineerId}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300 italic">Not assigned</span>
                          )}
                        </td>

                        {/* Equipment */}
                        <td className="px-4 py-3 max-w-[200px]">
                          <EquipmentPills items={item.equipment} />
                        </td>

                        {/* Requirements toggle */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                              item.feasibility
                                ? 'text-gray-600 hover:text-brand-blue'
                                : 'text-amber-500 hover:text-amber-700'
                            }`}
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            {item.feasibility ? 'View' : 'Pending ⚠'}
                          </button>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge variant={style.badge} size="sm">{item.status}</Badge>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3">
                          {item.status === 'Pending' && (
                            <Button
                              size="xs"
                              icon={<HardDrive size={12} />}
                              onClick={() => setAssignItem(item)}
                            >
                              Assign
                            </Button>
                          )}
                          {item.status === 'Assigned' && (
                            <Button
                              size="xs"
                              variant="secondary"
                              icon={<CheckCircle2 size={12} />}
                              onClick={() => markCompleted(item.id)}
                            >
                              Complete
                            </Button>
                          )}
                          {item.status === 'Completed' && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                              <CheckCircle2 size={14} /> Done
                            </span>
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className={`border-b border-surface-border ${item.feasibility ? 'bg-blue-50/20' : 'bg-amber-50/30'}`}>
                          <td colSpan={10} className="px-6 py-3">
                            {item.feasibility ? (
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                                {[
                                  ['Cable', `${item.feasibility.cableType} · ${item.feasibility.cableLength}m`],
                                  ['Building', item.feasibility.buildingType],
                                  ['Floor', item.feasibility.floorNumber],
                                  ['OLT', `${item.feasibility.oltDistance}m`],
                                  ['Roof', item.feasibility.roofAccess],
                                  ['Power', item.feasibility.powerSource],
                                  ['Drilling', item.feasibility.wallDrilling],
                                ].map(([label, value], i, arr) => (
                                  <span key={label} className="flex items-center gap-1">
                                    <span className="text-gray-500">{label}:</span>
                                    <span className="font-semibold text-gray-800">{value}</span>
                                    {i < arr.length - 1 && <span className="text-gray-300 ml-1">|</span>}
                                  </span>
                                ))}
                                {item.feasibility.notes && (
                                  <>
                                    <span className="text-gray-300">|</span>
                                    <span className="text-gray-500 italic">{item.feasibility.notes}</span>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                                <AlertTriangle size={12} /> Feasibility pending ⚠️
                              </span>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Assign Modal ───────────────────────────────────────────────── */}
      {assignItem && (
        <AssignModal
          isOpen={!!assignItem}
          onClose={() => setAssignItem(null)}
          item={assignItem}
          onConfirm={data => {
            handleAssigned(assignItem.id, data)
            setAssignItem(null)
          }}
        />
      )}
    </div>
  )
}

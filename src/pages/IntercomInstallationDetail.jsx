import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, Cpu, ClipboardList, Activity, UserCog, Search, X } from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card, { CardHeader } from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { FormField, Input } from '../components/ui/FormInputs'
import { getInstallation, updateInstallation, INSTALLATION_ENGINEERS } from '../data/intercomInstallationsStore'
import { getHardware } from '../data/intercomHardwareStore'

// ── Mock work order dataset ──────────────────────────────────────────────────

const MOCK_INSTALLATIONS = {
  'IWO-2026-0001': {
    id: 'IWO-2026-0001', customer: 'Mohan Das', customerId: 'IC-CUST-2026-000001', phone: '93456 78901',
    circuitId: 'IC-2026-0001', zone: 'Andheri West', address: 'Flat 302, Sai Darshan CHS, Andheri West',
    engineer: 'Suresh Babu', installDate: '20-06-2026', installTime: '10:00 AM', createdDate: '18-06-2026',
    notes: 'Standard intercom installation', status: 'completed',
    hardware: [
      { device: 'Intercom Panel Unit', serial: 'ICP-2026-0001', status: 'active' },
      { device: 'Handset Unit',        serial: 'ICH-2026-0001', status: 'active' },
      { device: 'Power Adapter',       serial: 'IPA-2026-0001', status: 'active' },
    ],
    activity: [
      { date: '18-06-2026', time: '10:00', event: 'Work order created', actor: 'Admin' },
      { date: '19-06-2026', time: '09:00', event: 'Engineer Suresh Babu assigned', actor: 'Admin' },
      { date: '20-06-2026', time: '11:30', event: 'Installation completed', actor: 'Suresh Babu' },
    ],
  },
  'IWO-2026-0002': {
    id: 'IWO-2026-0002', customer: 'Priya Nair', customerId: 'IC-CUST-2026-000002', phone: '98765 43210',
    circuitId: 'IC-2026-0002', zone: 'Bandra East', address: 'B-204, Greenwood Residency, Bandra East',
    engineer: 'Arjun Kumar', installDate: '22-06-2026', installTime: '11:00 AM', createdDate: '20-06-2026',
    notes: 'Plus plan installation with extended handset range', status: 'completed',
    hardware: [
      { device: 'Intercom Panel Unit', serial: 'ICP-2026-0002', status: 'active' },
    ],
    activity: [
      { date: '20-06-2026', time: '10:15', event: 'Work order created', actor: 'Admin' },
      { date: '21-06-2026', time: '09:30', event: 'Engineer Arjun Kumar assigned', actor: 'Admin' },
      { date: '22-06-2026', time: '12:00', event: 'Installation completed', actor: 'Arjun Kumar' },
    ],
  },
  'IWO-2026-0003': {
    id: 'IWO-2026-0003', customer: 'Suresh Patil', customerId: 'IC-CUST-2026-000003', phone: '99887 76655',
    circuitId: 'IC-2026-0003', zone: 'Goregaon', address: 'Shop 12, Metro Business Park, Goregaon',
    engineer: 'Preethi Nair', installDate: '25-06-2026', installTime: '02:00 PM', createdDate: '23-06-2026',
    notes: 'In progress — awaiting final signal test', status: 'inprogress',
    hardware: [
      { device: 'Intercom Panel Unit', serial: 'ICP-2026-0003', status: 'active' },
    ],
    activity: [
      { date: '23-06-2026', time: '10:00', event: 'Work order created', actor: 'Admin' },
      { date: '24-06-2026', time: '09:00', event: 'Engineer Preethi Nair assigned', actor: 'Admin' },
    ],
  },
  'IWO-2026-0004': {
    id: 'IWO-2026-0004', customer: 'Anita Desai', customerId: 'IC-CUST-2026-000004', phone: '91234 56789',
    circuitId: 'IC-2026-0004', zone: 'Versova', address: 'C-501, Palm Grove Society, Versova',
    engineer: 'Anita Sharma', installDate: '28-06-2026', installTime: '09:30 AM', createdDate: '26-06-2026',
    notes: 'Awaiting hardware dispatch', status: 'pending',
    hardware: [],
    activity: [
      { date: '26-06-2026', time: '11:00', event: 'Work order created', actor: 'Admin' },
      { date: '27-06-2026', time: '09:00', event: 'Engineer Anita Sharma assigned', actor: 'Admin' },
    ],
  },
  'IWO-2026-0005': {
    id: 'IWO-2026-0005', customer: 'Rajesh Kumar', customerId: 'IC-CUST-2026-000005', phone: '97654 32198',
    circuitId: 'IC-2026-0005', zone: 'Andheri East', address: 'Flat 108, Sunrise Apartments, Andheri East',
    engineer: 'Suresh Babu', installDate: '30-06-2026', installTime: '03:00 PM', createdDate: '29-06-2026',
    notes: 'Scheduled installation', status: 'pending',
    hardware: [],
    activity: [
      { date: '29-06-2026', time: '10:30', event: 'Work order created', actor: 'Admin' },
    ],
  },
}

function fromStoreOrder(o) {
  if (!o) return null
  const assignedSerials = o.assignedHardware ?? []
  const hardware = assignedSerials.length
    ? getHardware()
        .filter(h => assignedSerials.includes(h.serial))
        .map(h => ({ device: h.deviceType, serial: h.serial, status: 'active' }))
    : []
  return {
    id: o.id, customer: o.customer, customerId: o.customerId, phone: o.phone,
    circuitId: o.circuitId, zone: o.zone, address: '—',
    engineer: o.engineer, installDate: o.installDate, installTime: o.installTime,
    createdDate: o.createdDate, notes: o.notes, status: o.status,
    hardware,
    activity: [
      { date: o.createdDate, time: '—', event: 'Work order created', actor: 'Admin' },
    ],
  }
}

function makeUnknownOrder(id) {
  return {
    id, customer: 'Unknown Customer', customerId: null, phone: '—',
    circuitId: '—', zone: '—', address: '—', engineer: '—', installDate: '—',
    installTime: '—', createdDate: '—', notes: '', status: 'pending',
    hardware: [], activity: [],
  }
}

// ── Shared config ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:    { variant: 'orange', label: 'Pending' },
  inprogress: { variant: 'blue',   label: 'In Progress' },
  completed:  { variant: 'green',  label: 'Completed' },
  cancelled:  { variant: 'red',    label: 'Cancelled' },
}

const STAGE_STEPS = ['pending', 'inprogress', 'completed']
const STAGE_LABELS = { pending: 'Pending', inprogress: 'In Progress', completed: 'Completed' }

// ── Status Progress Bar ──────────────────────────────────────────────────────

function StatusProgressBar({ status }) {
  const currentIdx = STAGE_STEPS.indexOf(status)

  return (
    <div className="flex items-start">
      {STAGE_STEPS.map((s, i) => {
        const done = currentIdx >= 0 && i < currentIdx
        const active = i === currentIdx
        return (
          <div key={s} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2 min-w-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                done   ? 'bg-brand-blue text-white' :
                active ? 'bg-navy text-white ring-4 ring-navy/20' :
                         'bg-gray-100 text-gray-400'
              }`}>
                {done ? <Check size={15} /> : <span className="text-xs font-bold">{i + 1}</span>}
              </div>
              <span className={`text-[11px] font-semibold text-center leading-tight whitespace-nowrap ${
                active ? 'text-navy' : done ? 'text-brand-blue' : 'text-gray-400'
              }`}>
                {STAGE_LABELS[s]}
              </span>
            </div>
            {i < STAGE_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mt-[18px] mx-2 transition-all ${done ? 'bg-brand-blue' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function InfoField({ label, value, mono }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-sm text-gray-800 font-medium mt-0.5 ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
    </div>
  )
}

// dd-mm-yyyy <-> yyyy-mm-dd
function toISO(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('-')
  return `${y}-${m}-${d}`
}

function toDDMMYYYY(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

// ── Engineer avatars ─────────────────────────────────────────────────────────

function EngineerBadges({ value }) {
  const names = (value ?? '').split(',').map(n => n.trim()).filter(n => n && n !== '—')
  if (names.length === 0) return <p className="text-sm text-gray-800 font-medium mt-0.5">—</p>
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="flex items-center -space-x-1.5">
        {names.map(name => {
          const eng = INSTALLATION_ENGINEERS.find(e => e.name === name)
          return (
            <div key={name} title={name}
              className={`w-6 h-6 rounded-full ${eng?.color ?? 'bg-gray-400'} flex items-center justify-center text-white text-[9px] font-bold border-2 border-white shrink-0`}>
              {eng?.initials ?? name.charAt(0)}
            </div>
          )
        })}
      </div>
      <span className="text-sm text-gray-800 font-medium">{names.join(', ')}</span>
    </div>
  )
}

// ── Assign Engineer Modal ────────────────────────────────────────────────────

function AssignEngineerModal({ isOpen, onClose, order, onSubmit }) {
  const [engineers, setEngineers] = useState([])
  const [installDate, setInstallDate] = useState('')
  const [installTime, setInstallTime] = useState('')
  const [engSearch, setEngSearch] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen && order) {
      setEngineers((order.engineer ?? '').split(',').map(n => n.trim()).filter(n => n && n !== '—'))
      setInstallDate(order.installDate && order.installDate !== '—' ? toISO(order.installDate) : '')
      setInstallTime(order.installTime && order.installTime !== '—' ? order.installTime : '')
      setEngSearch('')
      setErrors({})
    }
  }, [isOpen, order])

  function toggleEngineer(name) {
    setEngineers(list => list.includes(name) ? list.filter(n => n !== name) : [...list, name])
    setErrors(p => ({ ...p, engineers: '' }))
  }

  function handleSubmit() {
    const e = {}
    if (engineers.length === 0) e.engineers = 'Select at least one engineer'
    if (!installDate) e.installDate = 'Installation date is required'
    if (!installTime) e.installTime = 'Installation time is required'
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit({ engineers, installDate, installTime })
  }

  const filtered = INSTALLATION_ENGINEERS.filter(e => e.name.toLowerCase().includes(engSearch.toLowerCase()))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Engineer — ${order?.id ?? ''}`} className="max-w-xl"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit}>Assign</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Engineer <span className="text-red-500">*</span></p>

          {engineers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {engineers.map(name => (
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
            <input
              value={engSearch}
              onChange={e => setEngSearch(e.target.value)}
              placeholder="Search engineer..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400 text-gray-800"
            />
          </div>

          <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden max-h-[200px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No engineers found</p>
            ) : filtered.map(eng => {
              const selected = engineers.includes(eng.name)
              return (
                <label key={eng.id}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox"
                    checked={selected}
                    onChange={() => toggleEngineer(eng.name)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <div className={`w-6 h-6 rounded-full ${eng.color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
                    {eng.initials}
                  </div>
                  <span className="text-sm text-gray-700">{eng.name}</span>
                </label>
              )
            })}
          </div>
          {errors.engineers && <p className="text-xs text-red-500 mt-1">{errors.engineers}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Installation Date" required error={errors.installDate}>
            <Input type="date" value={installDate}
              onChange={e => { setInstallDate(e.target.value); setErrors(p => ({ ...p, installDate: '' })) }} />
          </FormField>
          <FormField label="Installation Time" required error={errors.installTime}>
            <Input type="time" value={installTime}
              onChange={e => { setInstallTime(e.target.value); setErrors(p => ({ ...p, installTime: '' })) }} />
          </FormField>
        </div>
      </div>
    </Modal>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function IntercomInstallationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const order = MOCK_INSTALLATIONS[id] ?? fromStoreOrder(getInstallation(id)) ?? makeUnknownOrder(id)

  const [status, setStatus] = useState(order.status)
  const [remarks, setRemarks] = useState('')
  const [activity, setActivity] = useState(order.activity)
  const [engineer, setEngineer] = useState(order.engineer)
  const [installDate, setInstallDate] = useState(order.installDate)
  const [installTime, setInstallTime] = useState(order.installTime)
  const [assignModalOpen, setAssignModalOpen] = useState(false)

  const statusCfg = STATUS_CFG[status] ?? STATUS_CFG.pending
  const hasEngineer = !!engineer && engineer !== '—'

  function handleUpdateStatus() {
    const now = new Date()
    const date = now.toLocaleDateString('en-GB').split('/').join('-')
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setActivity(a => [...a, {
      date, time,
      event: `Status updated to ${STAGE_LABELS[status] ?? status}${remarks.trim() ? ` — ${remarks.trim()}` : ''}`,
      actor: 'Admin',
    }])
    setRemarks('')
  }

  function handleAssignSubmit({ engineers, installDate: newDate, installTime: newTime }) {
    const names = engineers.join(', ')
    const ddmmyyyy = toDDMMYYYY(newDate)
    const newStatus = status === 'pending' ? 'inprogress' : status
    const now = new Date()
    const date = now.toLocaleDateString('en-GB').split('/').join('-')
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    setEngineer(names)
    setInstallDate(ddmmyyyy)
    setInstallTime(newTime)
    setStatus(newStatus)
    setActivity(a => [...a, {
      date, time,
      event: `Engineer${engineers.length > 1 ? 's' : ''} ${names} assigned`,
      actor: 'Admin',
    }])

    updateInstallation(order.id, { engineer: names, installDate: ddmmyyyy, installTime: newTime, status: newStatus })
    setAssignModalOpen(false)
  }

  return (
    <div className="p-6 space-y-5">

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-navy via-brand-blue to-brand-orange" />

        {/* Breadcrumb */}
        <div className="px-5 lg:px-6 xl:px-7 2xl:px-8 pt-3 pb-3 flex items-center gap-1.5 text-[12px]">
          <span className="text-gray-400">Intercom</span>
          <span className="text-gray-300">›</span>
          <button onClick={() => navigate('/intercom/installations')} className="text-gray-400 hover:underline transition-colors">
            Installations
          </button>
          <span className="text-gray-300">›</span>
          <span className="text-gray-500 truncate">{order.id}</span>
        </div>
        <div className="border-t border-surface-border" />

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 font-mono">{order.id}</h1>
              <Badge variant={statusCfg.variant} dot>{statusCfg.label}</Badge>
            </div>
            <div className="flex gap-2">
              {!hasEngineer && (
                <Button size="sm" icon={<UserCog size={14} />} onClick={() => setAssignModalOpen(true)}>
                  Assign Engineer
                </Button>
              )}
              <Button variant="secondary" size="sm">Edit</Button>
              <Button variant="danger" size="sm">Close Work Order</Button>
            </div>
          </div>

          {/* Status Progress Bar */}
          <div className="mt-5 pt-5 border-t border-surface-border">
            <StatusProgressBar status={status} />
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Left — Work Order Details */}
        <Card>
          <CardHeader title="Work Order Details" />
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            <InfoField label="Work Order ID" value={order.id} mono />
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Customer Name</p>
              {order.customerId ? (
                <button
                  onClick={() => navigate(`/intercom/customers/${order.customerId}`)}
                  className="text-sm text-brand-blue font-semibold hover:underline mt-0.5"
                >
                  {order.customer}
                </button>
              ) : (
                <p className="text-sm text-gray-800 font-medium mt-0.5">{order.customer}</p>
              )}
            </div>
            <InfoField label="Customer ID" value={order.customerId} mono />
            <InfoField label="Phone" value={order.phone} mono />
            <InfoField label="Circuit ID" value={order.circuitId} mono />
            <InfoField label="Zone" value={order.zone} />
            <div className="col-span-2">
              <InfoField label="Installation Address" value={order.address} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Assigned Engineer</p>
              <EngineerBadges value={engineer} />
            </div>
            <InfoField label="Installation Date" value={installDate} />
            <InfoField label="Installation Time" value={installTime} />
            <InfoField label="Created Date" value={order.createdDate} />
            <div className="col-span-2">
              <InfoField label="Notes" value={order.notes} />
            </div>
          </div>
        </Card>

        {/* Right column */}
        <div className="space-y-5">

          {/* Hardware Assigned */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-gray-800">Hardware Assigned</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-surface-border">
                    {['Device Type', 'Serial No', 'Status'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {order.hardware.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">No hardware assigned yet.</td></tr>
                  ) : order.hardware.map((h, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-navy/10 text-navy flex items-center justify-center shrink-0">
                            <Cpu size={14} />
                          </div>
                          <span className="font-medium text-gray-800 whitespace-nowrap">{h.device}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{h.serial}</td>
                      <td className="px-4 py-3">
                        <Badge variant={h.status === 'active' ? 'green' : 'gray'} size="sm" dot>
                          {h.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Status Update */}
          <Card>
            <CardHeader title="Status Update" />
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Current Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700 cursor-pointer"
                >
                  <option value="pending">Pending</option>
                  <option value="inprogress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  rows={3}
                  placeholder="Add a remark for this status update…"
                  className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue resize-none"
                />
              </div>
              <Button size="sm" onClick={handleUpdateStatus} className="w-full justify-center">Update Status</Button>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Activity Log ── */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-surface-border flex items-center gap-2">
          <Activity size={15} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-800">Activity Log</h3>
        </div>
        <div className="px-5 py-5">
          {activity.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No activity recorded yet.</p>
          ) : (
            <div className="space-y-0">
              {activity.slice().reverse().map((entry, i) => (
                <div key={i} className="flex gap-4 pb-5 relative">
                  {i < activity.length - 1 && (
                    <div className="absolute left-3.5 top-7 bottom-0 w-px bg-gray-200" />
                  )}
                  <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shrink-0 text-brand-blue z-10">
                    <ClipboardList size={12} />
                  </div>
                  <div className="pt-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium">{entry.event}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      by <span className="font-medium text-gray-600">{entry.actor}</span> · {entry.date} {entry.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <AssignEngineerModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        order={{ id: order.id, engineer, installDate, installTime }}
        onSubmit={handleAssignSubmit}
      />

    </div>
  )
}

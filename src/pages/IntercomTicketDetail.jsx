import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Activity, ClipboardList } from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card, { CardHeader } from '../components/ui/Card'

// ── Mock ticket dataset ───────────────────────────────────────────────────────

const AGENTS = ['Suresh Babu', 'Arjun Kumar', 'Preethi Nair', 'Anita Sharma']

const MOCK_TICKETS = {
  'ITC-2026-0001': {
    id: 'ITC-2026-0001', customer: 'Mohan Das', customerId: 'INC-2026-0001', phone: '93456 78901',
    circuitId: 'IC-2026-0001', category: 'No Signal', priority: 'high', status: 'open',
    assignedTo: 'Suresh Babu', created: '01-07-2026', resolvedDate: null,
    description: 'Customer reporting no signal on intercom panel',
    activity: [
      { date: '01-07-2026', time: '10:00', event: 'Ticket created', actor: 'Admin' },
      { date: '01-07-2026', time: '11:00', event: 'Assigned to Suresh Babu', actor: 'Admin' },
      { date: '02-07-2026', time: '09:00', event: 'Status updated to In Progress', actor: 'Suresh Babu' },
    ],
  },
  'ITC-2026-0002': {
    id: 'ITC-2026-0002', customer: 'Priya Nair', customerId: 'INC-2026-0002', phone: '98765 43210',
    circuitId: 'IC-2026-0002', category: 'Hardware Issue', priority: 'medium', status: 'inprogress',
    assignedTo: 'Arjun Kumar', created: '02-07-2026', resolvedDate: null,
    description: 'Handset unit not receiving power',
    activity: [
      { date: '02-07-2026', time: '09:30', event: 'Ticket created', actor: 'Admin' },
      { date: '02-07-2026', time: '10:00', event: 'Assigned to Arjun Kumar', actor: 'Admin' },
      { date: '02-07-2026', time: '14:00', event: 'Status updated to In Progress', actor: 'Arjun Kumar' },
    ],
  },
  'ITC-2026-0003': {
    id: 'ITC-2026-0003', customer: 'Suresh Patil', customerId: 'INC-2026-0003', phone: '99887 76655',
    circuitId: 'IC-2026-0003', category: 'Line Fault', priority: 'critical', status: 'open',
    assignedTo: 'Preethi Nair', created: '03-07-2026', resolvedDate: null,
    description: 'Complete line fault — no dial tone on intercom circuit',
    activity: [
      { date: '03-07-2026', time: '08:00', event: 'Ticket created', actor: 'Admin' },
      { date: '03-07-2026', time: '08:30', event: 'Assigned to Preethi Nair', actor: 'Admin' },
    ],
  },
  'ITC-2026-0004': {
    id: 'ITC-2026-0004', customer: 'Anita Desai', customerId: 'INC-2026-0004', phone: '91234 56789',
    circuitId: 'IC-2026-0004', category: 'Billing', priority: 'low', status: 'resolved',
    assignedTo: 'Anita Sharma', created: '28-06-2026', resolvedDate: '29-06-2026',
    description: 'Billing discrepancy on intercom plan invoice',
    activity: [
      { date: '28-06-2026', time: '11:00', event: 'Ticket created', actor: 'Admin' },
      { date: '28-06-2026', time: '11:30', event: 'Assigned to Anita Sharma', actor: 'Admin' },
      { date: '29-06-2026', time: '15:00', event: 'Status updated to Resolved', actor: 'Anita Sharma' },
    ],
  },
  'ITC-2026-0005': {
    id: 'ITC-2026-0005', customer: 'Rajesh Kumar', customerId: 'INC-2026-0005', phone: '97654 32198',
    circuitId: 'IC-2026-0005', category: 'Other', priority: 'medium', status: 'closed',
    assignedTo: 'Suresh Babu', created: '25-06-2026', resolvedDate: '26-06-2026',
    description: 'General inquiry regarding intercom service pause',
    activity: [
      { date: '25-06-2026', time: '09:00', event: 'Ticket created', actor: 'Admin' },
      { date: '25-06-2026', time: '09:15', event: 'Assigned to Suresh Babu', actor: 'Admin' },
      { date: '25-06-2026', time: '16:00', event: 'Status updated to Resolved', actor: 'Suresh Babu' },
      { date: '26-06-2026', time: '10:00', event: 'Status updated to Closed', actor: 'Admin' },
    ],
  },
}

function makeUnknownTicket(id) {
  return {
    id, customer: 'Unknown Customer', customerId: null, phone: '—',
    circuitId: '—', category: '—', priority: 'low', status: 'open',
    assignedTo: '—', created: '—', resolvedDate: null, description: '',
    activity: [],
  }
}

// ── Shared config ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  open:       { variant: 'red',    label: 'Open' },
  inprogress: { variant: 'orange', label: 'In Progress' },
  resolved:   { variant: 'green',  label: 'Resolved' },
  closed:     { variant: 'gray',   label: 'Closed' },
}

const PRIORITY_CFG = {
  low:      { variant: 'gray',   label: 'Low' },
  medium:   { variant: 'blue',   label: 'Medium' },
  high:     { variant: 'orange', label: 'High' },
  critical: { variant: 'red',    label: 'Critical' },
}

function InfoField({ label, value, mono, wide }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-sm text-gray-800 font-medium mt-0.5 ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function IntercomTicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const ticket = MOCK_TICKETS[id] ?? makeUnknownTicket(id)

  const [status, setStatus] = useState(ticket.status)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [assignedTo, setAssignedTo] = useState(ticket.assignedTo)
  const [activity, setActivity] = useState(ticket.activity)

  const statusCfg = STATUS_CFG[status] ?? STATUS_CFG.open
  const priorityCfg = PRIORITY_CFG[ticket.priority] ?? PRIORITY_CFG.medium

  function nowStamp() {
    const now = new Date()
    const date = now.toLocaleDateString('en-GB').split('/').join('-')
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    return { date, time }
  }

  function handleUpdateStatus() {
    const { date, time } = nowStamp()
    setActivity(a => [...a, {
      date, time,
      event: `Status updated to ${STATUS_CFG[status]?.label ?? status}${resolutionNotes.trim() ? ` — ${resolutionNotes.trim()}` : ''}`,
      actor: 'Admin',
    }])
    setResolutionNotes('')
  }

  function handleUpdateAssignment() {
    const { date, time } = nowStamp()
    setActivity(a => [...a, { date, time, event: `Reassigned to ${assignedTo}`, actor: 'Admin' }])
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
          <button onClick={() => navigate('/intercom/tickets')} className="text-gray-400 hover:underline transition-colors">
            Tickets
          </button>
          <span className="text-gray-300">›</span>
          <span className="text-gray-500 truncate">{ticket.id}</span>
        </div>
        <div className="border-t border-surface-border" />

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 font-mono">{ticket.id}</h1>
              <Badge variant={priorityCfg.variant} size="sm" dot>{priorityCfg.label}</Badge>
              <Badge variant={statusCfg.variant} dot>{statusCfg.label}</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">Edit</Button>
              <Button variant="danger" size="sm">Close Ticket</Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Left — Ticket Details */}
        <Card>
          <CardHeader title="Ticket Details" />
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            <InfoField label="Ticket ID" value={ticket.id} mono />
            <InfoField label="Category" value={ticket.category} />
            <InfoField label="Priority" value={priorityCfg.label} />
            <InfoField label="Status" value={statusCfg.label} />
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Customer Name</p>
              {ticket.customerId ? (
                <button
                  onClick={() => navigate(`/intercom/customers/${ticket.customerId}`)}
                  className="text-sm text-brand-blue font-semibold hover:underline mt-0.5"
                >
                  {ticket.customer}
                </button>
              ) : (
                <p className="text-sm text-gray-800 font-medium mt-0.5">{ticket.customer}</p>
              )}
            </div>
            <InfoField label="Customer ID" value={ticket.customerId} mono />
            <InfoField label="Phone" value={ticket.phone} mono />
            <InfoField label="Circuit ID" value={ticket.circuitId} mono />
            <InfoField label="Assigned To" value={ticket.assignedTo} />
            <InfoField label="Created Date" value={ticket.created} />
            <InfoField label="Resolved Date" value={ticket.resolvedDate} />
            <div className="col-span-2">
              <InfoField label="Description" value={ticket.description} />
            </div>
          </div>
        </Card>

        {/* Right column */}
        <div className="space-y-5">

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
                  <option value="open">Open</option>
                  <option value="inprogress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Resolution Notes</label>
                <textarea
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  rows={3}
                  placeholder="Add resolution notes…"
                  className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue resize-none"
                />
              </div>
              <Button size="sm" onClick={handleUpdateStatus} className="w-full justify-center">Update</Button>
            </div>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader title="Assignment" />
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Assign To</label>
                <select
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700 cursor-pointer"
                >
                  {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <Button size="sm" onClick={handleUpdateAssignment} className="w-full justify-center">Update Assignment</Button>
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

    </div>
  )
}

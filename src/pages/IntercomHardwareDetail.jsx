import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card, { CardHeader } from '../components/ui/Card'

// ── Mock data ────────────────────────────────────────────────────────────────

const CUSTOMERS = [
  { id: 'IC-CUST-2026-000001', name: 'Mohan Das',    circuitId: 'IC-2026-0001' },
  { id: 'IC-CUST-2026-000002', name: 'Priya Nair',   circuitId: 'IC-2026-0002' },
  { id: 'IC-CUST-2026-000003', name: 'Suresh Patil', circuitId: 'IC-2026-0003' },
  { id: 'IC-CUST-2026-000004', name: 'Anita Desai',  circuitId: 'IC-2026-0004' },
  { id: 'IC-CUST-2026-000005', name: 'Rajesh Kumar', circuitId: 'IC-2026-0005' },
]

const MOCK_HARDWARE = {
  'IHW-2026-0001': {
    id: 'IHW-2026-0001', deviceType: 'Intercom Panel Unit', serial: 'ICP-2026-0001', brandModel: '—',
    purchaseDate: '01-01-2026', warrantyUntil: '01-01-2028', zone: 'Andheri West', status: 'assigned',
    assignedTo: 'Mohan Das', customerId: 'IC-CUST-2026-000001', circuitId: 'IC-2026-0001', assignedDate: '19-06-2026', assignedBy: 'Admin',
    history: [
      { customer: 'Mohan Das', circuitId: 'IC-2026-0001', assignedDate: '19-06-2026', returnedDate: null, condition: 'Good' },
    ],
  },
  'IHW-2026-0002': {
    id: 'IHW-2026-0002', deviceType: 'Handset Unit', serial: 'ICH-2026-0001', brandModel: '—',
    purchaseDate: '01-01-2026', warrantyUntil: '01-01-2027', zone: 'Andheri West', status: 'assigned',
    assignedTo: 'Mohan Das', customerId: 'IC-CUST-2026-000001', circuitId: 'IC-2026-0001', assignedDate: '19-06-2026', assignedBy: 'Admin',
    history: [
      { customer: 'Mohan Das', circuitId: 'IC-2026-0001', assignedDate: '19-06-2026', returnedDate: null, condition: 'Good' },
    ],
  },
  'IHW-2026-0003': {
    id: 'IHW-2026-0003', deviceType: 'Intercom Panel Unit', serial: 'ICP-2026-0002', brandModel: '—',
    purchaseDate: '05-01-2026', warrantyUntil: '05-01-2028', zone: 'Bandra East', status: 'assigned',
    assignedTo: 'Priya Nair', customerId: 'IC-CUST-2026-000002', circuitId: 'IC-2026-0002', assignedDate: '22-06-2026', assignedBy: 'Admin',
    history: [
      { customer: 'Priya Nair', circuitId: 'IC-2026-0002', assignedDate: '22-06-2026', returnedDate: null, condition: 'Good' },
    ],
  },
  'IHW-2026-0004': {
    id: 'IHW-2026-0004', deviceType: 'Handset Unit', serial: 'ICH-2026-0002', brandModel: '—',
    purchaseDate: '10-01-2026', warrantyUntil: '10-01-2027', zone: '—', status: 'available',
    assignedTo: null, customerId: null, circuitId: null, assignedDate: null, assignedBy: null,
    history: [],
  },
  'IHW-2026-0005': {
    id: 'IHW-2026-0005', deviceType: 'Power Adapter', serial: 'IPA-2026-0001', brandModel: '—',
    purchaseDate: '15-01-2026', warrantyUntil: '15-01-2027', zone: '—', status: 'damaged',
    assignedTo: null, customerId: null, circuitId: null, assignedDate: null, assignedBy: null,
    history: [
      { customer: 'Rajesh Kumar', circuitId: 'IC-2026-0005', assignedDate: '28-05-2026', returnedDate: '20-06-2026', condition: 'Damaged' },
    ],
  },
}

function makeUnknownDevice(id) {
  return {
    id, deviceType: '—', serial: '—', brandModel: '—', purchaseDate: '—', warrantyUntil: '—',
    zone: '—', status: 'available', assignedTo: null, customerId: null, circuitId: null,
    assignedDate: null, assignedBy: null, history: [],
  }
}

// ── Shared config ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  assigned:  { variant: 'blue',   label: 'Assigned' },
  available: { variant: 'green',  label: 'Available' },
  damaged:   { variant: 'orange', label: 'Damaged' },
  lost:      { variant: 'red',    label: 'Lost' },
}

function InfoField({ label, value, mono }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-sm text-gray-800 font-medium mt-0.5 ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
    </div>
  )
}

function todayDDMMYYYY() {
  const now = new Date()
  return now.toLocaleDateString('en-GB').split('/').join('-')
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function IntercomHardwareDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const device = MOCK_HARDWARE[id] ?? makeUnknownDevice(id)

  const [status, setStatus] = useState(device.status)
  const [remarks, setRemarks] = useState('')
  const [assignment, setAssignment] = useState({
    assignedTo: device.assignedTo, customerId: device.customerId,
    circuitId: device.circuitId, assignedDate: device.assignedDate, assignedBy: device.assignedBy,
  })
  const [history, setHistory] = useState(device.history)

  const [selectedCustomerId, setSelectedCustomerId] = useState(CUSTOMERS[0].id)
  const selectedCustomer = CUSTOMERS.find(c => c.id === selectedCustomerId) ?? CUSTOMERS[0]

  const statusCfg = STATUS_CFG[status] ?? STATUS_CFG.available

  function handleReassign() {
    const today = todayDDMMYYYY()
    setHistory(h => {
      const updated = [...h]
      if (assignment.assignedTo) {
        const lastIdx = updated.findIndex(row => row.returnedDate === null)
        if (lastIdx !== -1) updated[lastIdx] = { ...updated[lastIdx], returnedDate: today }
      }
      return [...updated, { customer: selectedCustomer.name, circuitId: selectedCustomer.circuitId, assignedDate: today, returnedDate: null, condition: 'Good' }]
    })
    setAssignment({
      assignedTo: selectedCustomer.name, customerId: selectedCustomer.id,
      circuitId: selectedCustomer.circuitId, assignedDate: today, assignedBy: 'Admin',
    })
    setStatus('assigned')
  }

  function handleUpdateStatus() {
    setRemarks('')
  }

  function handleMarkDamaged() { setStatus('damaged') }
  function handleMarkLost() { setStatus('lost') }

  return (
    <div className="p-6 space-y-5">

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-navy via-brand-blue to-brand-orange" />

        {/* Breadcrumb */}
        <div className="px-5 lg:px-6 xl:px-7 2xl:px-8 pt-3 pb-3 flex items-center gap-1.5 text-[12px]">
          <span className="text-gray-400">Intercom</span>
          <span className="text-gray-300">›</span>
          <button onClick={() => navigate('/intercom/hardware')} className="text-gray-400 hover:underline transition-colors">
            Hardware
          </button>
          <span className="text-gray-300">›</span>
          <span className="text-gray-500 truncate">{device.id}</span>
        </div>
        <div className="border-t border-surface-border" />

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 font-mono">{device.id}</h1>
              <Badge variant={statusCfg.variant} dot>{statusCfg.label}</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">Edit</Button>
              <Button variant="orange" size="sm" onClick={handleMarkDamaged}>Mark Damaged</Button>
              <Button variant="danger" size="sm" onClick={handleMarkLost}>Mark Lost</Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Left column */}
        <div className="space-y-5">

          {/* Device Details */}
          <Card>
            <CardHeader title="Device Details" />
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <InfoField label="Device ID" value={device.id} mono />
              <InfoField label="Device Type" value={device.deviceType} />
              <InfoField label="Serial No" value={device.serial} mono />
              <InfoField label="Brand/Model" value={device.brandModel} />
              <InfoField label="Purchase Date" value={device.purchaseDate} />
              <InfoField label="Warranty Until" value={device.warrantyUntil} />
              <InfoField label="Zone" value={device.zone} />
              <InfoField label="Current Status" value={statusCfg.label} />
            </div>
          </Card>

          {/* Current Assignment */}
          <Card>
            <CardHeader title="Current Assignment" />
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Assigned To</p>
                {assignment.assignedTo && assignment.customerId ? (
                  <button
                    onClick={() => navigate(`/intercom/customers/${assignment.customerId}`)}
                    className="text-sm text-brand-blue font-semibold hover:underline mt-0.5"
                  >
                    {assignment.assignedTo}
                  </button>
                ) : (
                  <p className="text-sm text-gray-800 font-medium mt-0.5">—</p>
                )}
              </div>
              <InfoField label="Customer ID" value={assignment.customerId} mono />
              <InfoField label="Circuit ID" value={assignment.circuitId} mono />
              <InfoField label="Assigned Date" value={assignment.assignedDate} />
              <InfoField label="Assigned By" value={assignment.assignedBy} />
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Reassign Device */}
          <Card>
            <CardHeader title="Reassign Device" />
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Select Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700 cursor-pointer"
                >
                  {CUSTOMERS.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Select Circuit</label>
                <select
                  value={selectedCustomer.circuitId}
                  disabled
                  className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-gray-50 text-gray-700 cursor-not-allowed"
                >
                  <option value={selectedCustomer.circuitId}>{selectedCustomer.circuitId}</option>
                </select>
              </div>
              <Button size="sm" onClick={handleReassign} className="w-full justify-center">Reassign</Button>
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
                  <option value="assigned">Assigned</option>
                  <option value="available">Available</option>
                  <option value="damaged">Damaged</option>
                  <option value="lost">Lost</option>
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

      {/* ── Assignment History ── */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-gray-800">Assignment History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-surface-border">
                {['Customer', 'Circuit ID', 'Assigned Date', 'Returned Date', 'Condition'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {history.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No assignment history.</td></tr>
              ) : history.slice().reverse().map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{row.customer}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{row.circuitId}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{row.assignedDate}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{row.returnedDate ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={row.condition === 'Good' ? 'green' : 'orange'} size="sm" dot>{row.condition}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  )
}

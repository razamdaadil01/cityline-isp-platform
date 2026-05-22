import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, CheckCircle2, Clock, XCircle, List } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Select } from '../components/ui/FormInputs'
import { getFeasibilityRequests, updateFeasibilityStatus, subscribeFeasibility } from '../data/feasibilityStore'

const STATUS_VARIANT = { Pending: 'yellow', Feasible: 'green', 'Not Feasible': 'red' }

const FILTERS = [
  { key: 'All',          icon: List,          color: 'text-gray-500'    },
  { key: 'Pending',      icon: Clock,         color: 'text-amber-500'   },
  { key: 'Feasible',     icon: CheckCircle2,  color: 'text-emerald-500' },
  { key: 'Not Feasible', icon: XCircle,       color: 'text-red-500'     },
]

export default function FeasibilityRequests() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState(getFeasibilityRequests())
  const [filter, setFilter]     = useState('All')
  const [editReq, setEditReq]   = useState(null)
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => subscribeFeasibility(setRequests), [])

  const counts = {
    All:           requests.length,
    Pending:       requests.filter(r => r.feasibilityStatus === 'Pending').length,
    Feasible:      requests.filter(r => r.feasibilityStatus === 'Feasible').length,
    'Not Feasible': requests.filter(r => r.feasibilityStatus === 'Not Feasible').length,
  }

  const visible = filter === 'All' ? requests : requests.filter(r => r.feasibilityStatus === filter)

  function openUpdate(req) {
    setEditReq(req)
    setNewStatus(req.feasibilityStatus)
  }

  function handleUpdate() {
    updateFeasibilityStatus(editReq.id, newStatus)
    setEditReq(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">

      {/* Header */}
      <div className="px-6 pt-6 pb-5 shrink-0 bg-white border-b border-surface-border">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/settings')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Feasibility Requests</h1>
            <p className="text-sm text-gray-500 mt-0.5">Leads requiring feasibility check for unmapped areas</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* KPI cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Requests',  value: counts.All,           color: 'text-navy',          bg: 'bg-navy/5',          icon: List          },
            { label: 'Pending',         value: counts.Pending,        color: 'text-amber-600',     bg: 'bg-amber-50',        icon: Clock         },
            { label: 'Feasible',        value: counts.Feasible,       color: 'text-emerald-600',   bg: 'bg-emerald-50',      icon: CheckCircle2  },
            { label: 'Not Feasible',    value: counts['Not Feasible'],color: 'text-red-500',       bg: 'bg-red-50',          icon: XCircle       },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="bg-white rounded-xl border border-surface-border p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white border border-surface-border rounded-xl p-1 w-fit">
          {FILTERS.map(({ key, icon: Icon, color }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === key
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}>
              <Icon size={13} className={filter === key ? 'text-white' : color} />
              {key}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                filter === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        {visible.length === 0 ? (
          <div className="bg-white rounded-xl border border-surface-border p-16 text-center">
            <p className="text-gray-400 text-sm">No {filter === 'All' ? '' : filter.toLowerCase() + ' '}requests found.</p>
            <p className="text-gray-300 text-xs mt-1">Requests appear when a lead is submitted with "Feasibility Required" checked.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
            {/* Header row */}
            <div className="grid gap-4 px-4 py-3 border-b border-surface-border bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wide"
              style={{ gridTemplateColumns: '80px 1fr 1fr auto auto auto' }}>
              <span>Req ID</span>
              <span>Lead / Customer</span>
              <span>Location</span>
              <span>Status</span>
              <span>Created</span>
              <span>Actions</span>
            </div>

            <div className="divide-y divide-surface-border">
              {visible.map(r => (
                <div key={r.id}
                  className="grid gap-4 px-4 py-3.5 items-center hover:bg-gray-50/50 transition-colors"
                  style={{ gridTemplateColumns: '80px 1fr 1fr auto auto auto' }}>

                  {/* Request ID */}
                  <span className="font-mono text-xs font-semibold text-gray-400">{r.id}</span>

                  {/* Lead / Customer */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.customerName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.leadId}</p>
                    {r.phone && <p className="text-xs text-gray-400">{r.phone}</p>}
                  </div>

                  {/* Location */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.subLocalityName}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{r.localityName} · {r.area}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="blue" size="sm">{r.connectionType}</Badge>
                      {r.assignedBranch && (
                        <span className="text-[11px] font-mono text-gray-500">{r.assignedBranch}</span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <Badge variant={STATUS_VARIANT[r.feasibilityStatus] || 'gray'} size="sm">
                    {r.feasibilityStatus}
                  </Badge>

                  {/* Created date */}
                  <span className="text-xs text-gray-500 whitespace-nowrap">{r.createdAt}</span>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <Button variant="secondary" size="xs" onClick={() => openUpdate(r)}>
                      Update
                    </Button>
                    <button
                      onClick={() => navigate(`/sales/leads/${r.leadId}`)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="View Lead">
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Update status modal */}
      <Modal
        isOpen={!!editReq}
        onClose={() => setEditReq(null)}
        title={`Update Status — ${editReq?.id}`}
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setEditReq(null)}>Cancel</Button>
          <Button size="sm" onClick={handleUpdate}>Save</Button>
        </>}>
        <div className="space-y-4">
          {editReq && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1.5">
              <p>
                <span className="text-gray-500">Customer: </span>
                <span className="font-medium text-gray-800">{editReq.customerName}</span>
              </p>
              <p>
                <span className="text-gray-500">Location: </span>
                <span className="font-medium text-gray-800">{editReq.subLocalityName} · {editReq.localityName}</span>
              </p>
              <p>
                <span className="text-gray-500">Type: </span>
                <span className="font-medium text-gray-800">{editReq.connectionType}</span>
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-gray-500">Current status:</span>
                <Badge variant={STATUS_VARIANT[editReq.feasibilityStatus] || 'gray'} size="sm">
                  {editReq.feasibilityStatus}
                </Badge>
              </div>
            </div>
          )}
          <FormField label="New Status">
            <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
              <option value="Pending">Pending</option>
              <option value="Feasible">Feasible</option>
              <option value="Not Feasible">Not Feasible</option>
            </Select>
          </FormField>
        </div>
      </Modal>
    </div>
  )
}

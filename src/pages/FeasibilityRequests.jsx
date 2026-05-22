import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, ChevronDown } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Select } from '../components/ui/FormInputs'
import { getFeasibilityRequests, updateFeasibilityStatus, subscribeFeasibility } from '../data/feasibilityStore'

const STATUS_VARIANT = { Pending: 'yellow', Feasible: 'green', 'Not Feasible': 'red' }

export default function FeasibilityRequests() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState(getFeasibilityRequests())
  const [editReq, setEditReq] = useState(null)
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => subscribeFeasibility(setRequests), [])

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
      <div className="flex-1 overflow-y-auto p-6">
        {requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-surface-border p-16 text-center">
            <p className="text-gray-400 text-sm">No feasibility requests yet.</p>
            <p className="text-gray-300 text-xs mt-1">They appear when a lead is submitted with "Feasibility Required" checked.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto_auto] gap-3 px-4 py-3 border-b border-surface-border bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>Request ID</span>
              <span>Lead / Customer</span>
              <span>Location</span>
              <span>Connection Type</span>
              <span>Branch</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            <div className="divide-y divide-surface-border">
              {requests.map(r => (
                <div key={r.id} className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto_auto] gap-3 px-4 py-3 items-center hover:bg-gray-50/50 text-sm">
                  <span className="font-mono text-xs text-gray-500 font-semibold">{r.id}</span>
                  <div>
                    <p className="font-medium text-gray-800">{r.customerName}</p>
                    <p className="text-xs text-gray-400">{r.leadId}</p>
                  </div>
                  <div>
                    <p className="text-gray-700">{r.subLocalityName}</p>
                    <p className="text-xs text-gray-400">{r.localityName} · {r.area}</p>
                  </div>
                  <Badge variant="blue" size="sm">{r.connectionType}</Badge>
                  <span className="text-xs text-gray-600 font-mono">{r.assignedBranch || '—'}</span>
                  <Badge variant={STATUS_VARIANT[r.feasibilityStatus] || 'gray'} size="sm">{r.feasibilityStatus}</Badge>
                  <div className="flex gap-1.5">
                    <Button variant="secondary" size="xs" onClick={() => openUpdate(r)}>
                      Update Status
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
      <Modal isOpen={!!editReq} onClose={() => setEditReq(null)} title={`Update Status — ${editReq?.id}`} size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setEditReq(null)}>Cancel</Button>
          <Button size="sm" onClick={handleUpdate}>Save</Button>
        </>}>
        <div className="space-y-4">
          {editReq && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <p><span className="text-gray-500">Customer:</span> <span className="font-medium">{editReq.customerName}</span></p>
              <p><span className="text-gray-500">Location:</span> <span className="font-medium">{editReq.localityName} · {editReq.subLocalityName}</span></p>
              <p><span className="text-gray-500">Type:</span> <span className="font-medium">{editReq.connectionType}</span></p>
            </div>
          )}
          <FormField label="Feasibility Status">
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

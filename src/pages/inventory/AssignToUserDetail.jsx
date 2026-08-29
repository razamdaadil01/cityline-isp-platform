import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import { getUserAssignment, subscribeUserAssignments } from '../../data/userAssignmentStore'

const STATUS_BADGE = { 'Handed Off': 'purple' }
const TYPE_LABEL = { new: 'New', replace: 'Replace', disconnection: 'Disconnection' }

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right">
        {value === undefined || value === null || value === '' ? <span className="text-gray-300">—</span> : value}
      </span>
    </div>
  )
}

export default function AssignToUserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [, forceRerender] = useState(0)
  useEffect(() => subscribeUserAssignments(() => forceRerender(n => n + 1)), [])

  const assignment = getUserAssignment(id)

  if (!assignment) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/inventory/assign-to-user')} className="text-sm text-brand-blue hover:underline flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Assign to User
        </button>
        <p className="text-sm text-gray-400 mt-4">Assignment {id} was not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/inventory/assign-to-user')}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900 font-mono">{assignment.assignmentNumber}</h1>
            <Badge variant={STATUS_BADGE[assignment.status] ?? 'gray'} size="sm" dot>{assignment.status}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {assignment.engineerName} → {assignment.customerName || assignment.workOrderLabel}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* LEFT: items + remarks */}
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-gray-800">Items Handed Off</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-3 py-2 font-semibold">Item</th>
                    <th className="text-right px-3 py-2 font-semibold">Qty</th>
                    <th className="text-left px-3 py-2 font-semibold">Serial / MAC / Drum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {assignment.items.length === 0 ? (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400">No items</td></tr>
                  ) : assignment.items.map((it, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-700">{it.productName}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">{it.serials.length + it.macs.length || it.qty}{it.drumNumber ? 'm' : ''}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono">
                        {it.serials.length ? `Serials: ${it.serials.join(', ')}`
                          : it.macs.length ? `MACs: ${it.macs.join(', ')}`
                          : it.drumNumber ? `Drum: ${it.drumNumber}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {assignment.returnedItem && (
            <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-surface-border">
                <h3 className="text-sm font-semibold text-gray-800">Unit Returned</h3>
              </div>
              <div className="px-5 py-4 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-800">{assignment.returnedItem.productName}</span>
                  <span className="font-mono text-gray-500 text-xs">{assignment.returnedItem.identifier}</span>
                </div>
                {assignment.returnedItem.remark && <p className="text-xs text-gray-500">{assignment.returnedItem.remark}</p>}
              </div>
            </div>
          )}

          {assignment.remarks && (
            <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-surface-border">
                <h3 className="text-sm font-semibold text-gray-800">Remarks</h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.remarks}</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: assignment info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Assignment Information</p>
            <InfoRow label="Assignment Number" value={<span className="font-mono text-brand-blue">{assignment.assignmentNumber}</span>} />
            <InfoRow label="Status" value={<Badge variant={STATUS_BADGE[assignment.status] ?? 'gray'} size="sm" dot>{assignment.status}</Badge>} />
            <InfoRow label="Engineer" value={assignment.engineerName} />
            <InfoRow label="Assignment Type" value={TYPE_LABEL[assignment.assignmentType] ?? 'New'} />
            <InfoRow label="Work Order Type" value={assignment.workOrderType} />
            <InfoRow label="Work Order" value={<span className="font-mono">{assignment.workOrderLabel}</span>} />
            <InfoRow label="Customer" value={assignment.customerName} />
            <InfoRow label="User Id" value={assignment.customerId} />
            <InfoRow label="Assigned By" value={assignment.assignedBy} />
            <InfoRow label="Assigned At" value={(assignment.assignedAt || '').slice(0, 16).replace('T', ' ')} />
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import { getAssignment, subscribeAssignments } from '../../data/assignmentStore'
import { getStore } from '../../data/storeStore'

const STATUS_BADGE = { Assigned: 'purple', Returned: 'gray' }

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

export default function AssignmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [, forceRerender] = useState(0)
  useEffect(() => subscribeAssignments(() => forceRerender(n => n + 1)), [])

  const assignment = getAssignment(id)

  if (!assignment) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/inventory/assign')} className="text-sm text-brand-blue hover:underline flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Assignments
        </button>
        <p className="text-sm text-gray-400 mt-4">Assignment {id} was not found.</p>
      </div>
    )
  }

  const store = getStore(assignment.storeId)

  return (
    <div className="p-6 space-y-5">

      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/inventory/assign')}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900 font-mono">{assignment.assignmentNumber}</h1>
            <Badge variant={STATUS_BADGE[assignment.status] ?? 'gray'} size="sm" dot>{assignment.status}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {assignment.engineerName} · Work Order: <span className="font-mono">{assignment.workOrderLabel}</span>
            {store && <span className="text-gray-400"> · {store.storeName}</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* LEFT: issued items + remarks */}
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-gray-800">Hardware Issued</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-3 py-2 font-semibold">Item</th>
                    <th className="text-right px-3 py-2 font-semibold">Required</th>
                    <th className="text-right px-3 py-2 font-semibold">Issued</th>
                    <th className="text-left px-3 py-2 font-semibold">Serial / MAC</th>
                    <th className="text-left px-3 py-2 font-semibold">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {assignment.hardwareLines.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No hardware issued</td></tr>
                  ) : assignment.hardwareLines.map(l => (
                    <tr key={l.id}>
                      <td className="px-3 py-2 text-gray-700">{l.productName}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{l.requiredQty}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">{l.assignedQty}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono">
                        {l.serials.length ? `Serials: ${l.serials.join(', ')}`
                          : l.macs.length ? `MACs: ${l.macs.join(', ')}`
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{l.remark || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-gray-800">Wire Issued</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-3 py-2 font-semibold">Item</th>
                    <th className="text-right px-3 py-2 font-semibold">Required (m)</th>
                    <th className="text-right px-3 py-2 font-semibold">Issued (m)</th>
                    <th className="text-left px-3 py-2 font-semibold">Drum</th>
                    <th className="text-left px-3 py-2 font-semibold">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {assignment.wireLines.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No wire issued</td></tr>
                  ) : assignment.wireLines.map(l => (
                    <tr key={l.id}>
                      <td className="px-3 py-2 text-gray-700">{l.productName}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{l.requiredMeters}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">{l.assignedMeters}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono">{l.drumNumber}</td>
                      <td className="px-3 py-2 text-gray-500">{l.remark || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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
            <InfoRow label="Work Order" value={<span className="font-mono">{assignment.workOrderLabel}</span>} />
            <InfoRow label="Branch" value={assignment.branchCode} />
            <InfoRow label="Store" value={store?.storeName} />
            <InfoRow label="Assigned By" value={assignment.assignedBy} />
            <InfoRow label="Assigned At" value={(assignment.assignedAt || '').slice(0, 16).replace('T', ' ')} />
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, XCircle, HardDrive, Wrench, Wallet, Eye as EyeIcon,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import ApprovalDecisionModal from '../components/ui/ApprovalDecisionModal'
import { getApproval, subscribeApprovals, approveApproval, rejectApproval } from '../data/approvalsStore'

const CURRENT_USER = 'Admin User'

const TYPE_BADGE = { Installation: 'blue', Payment: 'green', Visibility: 'purple', Hardware: 'orange' }
const STATUS_BADGE = { Pending: 'yellow', Approved: 'green', Rejected: 'red' }
const TYPE_ICON = { Installation: Wrench, Payment: Wallet, Visibility: EyeIcon, Hardware: HardDrive }

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function relatedRoute(approval) {
  if (!approval.relatedId) return null
  return approval.relatedType === 'ticket'
    ? `/support/tickets/${approval.relatedId}/documents`
    : `/customers/${approval.relatedId}`
}

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

// Same dot + connecting-line timeline row used by Ticket Detail's Activity Log.
function ActivityTimelineEntry({ entry, isLast }) {
  const isSystem = entry.actor === 'System'
  return (
    <div className="relative pb-5">
      {!isLast && <span aria-hidden="true" className="absolute left-[4px] top-[11px] bottom-0 w-px bg-gray-200" />}
      <div className="relative flex gap-4">
        <div className={`relative z-10 w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${isSystem ? 'bg-gray-400' : 'bg-brand-blue'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 font-medium">{entry.action}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            by <span className="font-medium text-gray-600">{entry.actor}</span> · {formatDateTime(entry.time)}
          </p>
        </div>
      </div>
    </div>
  )
}

function HardwareDetail({ approval, navigate }) {
  const totalCost = approval.items.reduce((sum, h) => sum + h.quantity * h.unitPrice, 0)
  const route = relatedRoute(approval)
  return (
    <div className="space-y-4">
      {route && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Linked Ticket</span>
          <button onClick={() => navigate(route)} className="font-mono font-semibold text-brand-blue hover:underline">
            {approval.relatedId}
          </button>
        </div>
      )}
      <div className="border border-surface-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
              <th className="text-left px-3 py-2 font-semibold">Item</th>
              <th className="text-right px-3 py-2 font-semibold">Qty</th>
              <th className="text-right px-3 py-2 font-semibold">Unit Price</th>
              <th className="text-right px-3 py-2 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {approval.items.map((h, i) => (
              <tr key={i}>
                <td className="px-3 py-2 text-gray-700">{h.name}</td>
                <td className="px-3 py-2 text-right text-gray-600">{h.quantity}</td>
                <td className="px-3 py-2 text-right text-gray-600">₹{h.unitPrice.toLocaleString('en-IN')}</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-800">₹{(h.quantity * h.unitPrice).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-surface-border bg-gray-50">
              <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Total Cost</td>
              <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">₹{totalCost.toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function InstallationDetail({ approval }) {
  const d = approval.installation
  return (
    <div className="space-y-3">
      <InfoRow label="Customer" value={d.customer} />
      <InfoRow label="Address" value={d.address} />
      <InfoRow label="Requested Equipment" value={d.requestedEquipment?.join(', ')} />
    </div>
  )
}

function PaymentDetail({ approval }) {
  const d = approval.payment
  return (
    <div className="space-y-3">
      <InfoRow label="Customer" value={d.customer} />
      <InfoRow label="Amount" value={`₹${d.amount.toLocaleString('en-IN')}`} />
      <InfoRow label="Reason" value={d.reason} />
    </div>
  )
}

function VisibilityDetail({ approval }) {
  const d = approval.visibility
  return (
    <div className="space-y-3">
      <InfoRow label="What's Being Made Visible" value={d.subject} />
      <InfoRow label="To Whom" value={d.visibleTo} />
      <InfoRow label="Reason" value={d.reason} />
    </div>
  )
}

export default function ApprovalDetail() {
  const { approvalId } = useParams()
  const navigate = useNavigate()
  const [approval, setApproval] = useState(() => getApproval(approvalId))
  const [decisionModal, setDecisionModal] = useState(null) // 'approve' | 'reject' | null

  useEffect(() => setApproval(getApproval(approvalId)), [approvalId])
  useEffect(() => subscribeApprovals(() => setApproval(getApproval(approvalId))), [approvalId])

  if (!approval) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/approvals')} className="text-sm text-brand-blue hover:underline flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Approvals
        </button>
        <p className="text-sm text-gray-400 mt-4">Approval {approvalId} was not found.</p>
      </div>
    )
  }

  const TypeIcon = TYPE_ICON[approval.type]
  const route = relatedRoute(approval)

  return (
    <div className="p-6 space-y-5">

      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/approvals')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 font-mono">{approval.id}</h1>
              <Badge variant={TYPE_BADGE[approval.type]} size="sm">{approval.type}</Badge>
              <Badge variant={STATUS_BADGE[approval.status]} size="sm" dot>{approval.status}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Requested by {approval.requestedBy} · {formatDateTime(approval.requestedDate)}</p>
          </div>
        </div>
        {approval.status === 'Pending' && (
          <div className="flex gap-2 shrink-0">
            <Button variant="danger" size="sm" icon={<XCircle size={14} />} onClick={() => setDecisionModal('reject')}>
              Reject
            </Button>
            <Button size="sm" icon={<CheckCircle2 size={14} />} onClick={() => setDecisionModal('approve')}>
              Approve
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* LEFT: type-specific detail + activity log */}
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-border flex items-center gap-2">
              {TypeIcon && <TypeIcon size={15} className="text-gray-400" />}
              <h3 className="text-sm font-semibold text-gray-800">{approval.type} Details</h3>
            </div>
            <div className="px-5 py-4">
              {approval.type === 'Hardware' && <HardwareDetail approval={approval} navigate={navigate} />}
              {approval.type === 'Installation' && <InstallationDetail approval={approval} />}
              {approval.type === 'Payment' && <PaymentDetail approval={approval} />}
              {approval.type === 'Visibility' && <VisibilityDetail approval={approval} />}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-gray-800">Activity / Comment Log</h3>
            </div>
            <div className="px-5 py-4">
              {approval.activityLog.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No activity recorded yet.</p>
              ) : (
                [...approval.activityLog].reverse().map((entry, i, arr) => (
                  <ActivityTimelineEntry key={i} entry={entry} isLast={i === arr.length - 1} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: request info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Request Information</p>
            <InfoRow label="Request ID" value={<span className="font-mono text-brand-blue">{approval.id}</span>} />
            <InfoRow label="Type" value={<Badge variant={TYPE_BADGE[approval.type]} size="sm">{approval.type}</Badge>} />
            <InfoRow label="Status" value={<Badge variant={STATUS_BADGE[approval.status]} size="sm" dot>{approval.status}</Badge>} />
            <InfoRow label="Requested By" value={approval.requestedBy} />
            <InfoRow label="Requested Date" value={formatDateTime(approval.requestedDate)} />
            <InfoRow label="Related To" value={
              route ? (
                <button onClick={() => navigate(route)} className="font-mono text-brand-blue hover:underline">
                  {approval.relatedLabel}
                </button>
              ) : (approval.relatedLabel ?? null)
            } />
            {approval.amount != null && <InfoRow label="Amount" value={`₹${approval.amount.toLocaleString('en-IN')}`} />}
          </div>

          {approval.status !== 'Pending' && (
            <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Decision</p>
              <InfoRow label="Decided By" value={approval.decidedBy} />
              <InfoRow label="Decided At" value={formatDateTime(approval.decidedAt)} />
              <InfoRow label="Comment" value={approval.decisionComment} />
            </div>
          )}
        </div>
      </div>

      <ApprovalDecisionModal
        isOpen={!!decisionModal}
        onClose={() => setDecisionModal(null)}
        decision={decisionModal}
        approval={approval}
        onConfirm={comment => {
          if (decisionModal === 'approve') approveApproval(approval.id, comment, CURRENT_USER)
          else rejectApproval(approval.id, comment, CURRENT_USER)
          setDecisionModal(null)
        }}
      />
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, ChevronDown, ShieldCheck, Clock, CheckCircle2, XCircle, Eye,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import ApprovalDecisionModal from '../components/ui/ApprovalDecisionModal'
import {
  getApprovals, subscribeApprovals, approveApproval, rejectApproval, APPROVAL_TYPES,
} from '../data/approvalsStore'

const CURRENT_USER = 'Admin User'

const TYPE_BADGE = { Installation: 'blue', Payment: 'green', Visibility: 'purple', Hardware: 'orange', 'Purchase Order': 'cyan' }
const STATUS_BADGE = { Pending: 'yellow', Approved: 'green', Rejected: 'red' }

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function relatedRoute(approval) {
  if (!approval.relatedId) return null
  if (approval.relatedType === 'ticket') return `/support/tickets/${approval.relatedId}/documents`
  if (approval.relatedType === 'purchase-order') return `/inventory/purchase-orders/${approval.relatedId}`
  return `/customers/${approval.relatedId}`
}

export default function Approvals() {
  const navigate = useNavigate()
  const [approvals, setApprovals] = useState(getApprovals)
  const [statusTab, setStatusTab] = useState('') // '' | 'Pending' | 'Approved' | 'Rejected'
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [decisionModal, setDecisionModal] = useState(null) // { approval, decision }

  useEffect(() => subscribeApprovals(setApprovals), [])

  const stats = useMemo(() => ({
    total: approvals.length,
    pending: approvals.filter(a => a.status === 'Pending').length,
    approved: approvals.filter(a => a.status === 'Approved').length,
    rejected: approvals.filter(a => a.status === 'Rejected').length,
  }), [approvals])

  const filtered = approvals.filter(a => {
    if (statusTab && a.status !== statusTab) return false
    if (typeFilter && a.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const haystack = `${a.id} ${a.relatedLabel ?? ''} ${a.relatedId ?? ''} ${a.requestedBy}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  }).sort((a, b) => new Date(b.requestedDate) - new Date(a.requestedDate))

  function handleDecision(approval, decision) {
    setDecisionModal({ approval, decision })
  }

  function handleConfirmDecision(comment) {
    const { approval, decision } = decisionModal
    if (decision === 'approve') approveApproval(approval.id, comment, CURRENT_USER)
    else rejectApproval(approval.id, comment, CURRENT_USER)
    setDecisionModal(null)
  }

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Approvals</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and action pending approval requests across the platform</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: ShieldCheck, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
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

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {['', 'Pending', 'Approved', 'Rejected'].map(v => (
            <button key={v || 'all'} onClick={() => setStatusTab(v)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                statusTab === v ? 'bg-navy text-white shadow-sm' : 'bg-white border border-surface-border text-gray-500 hover:bg-gray-50'
              }`}>
              {v || 'All'}
            </button>
          ))}
        </div>

        <div className="relative">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-white border border-surface-border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer">
            <option value="">All Types</option>
            {APPROVAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by request ID, related ticket/customer…"
            className="pl-9 pr-8 py-2 text-sm border border-surface-border rounded-lg bg-white w-full focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                {['Request ID', 'Type', 'Related To', 'Requested By', 'Requested Date', 'Amount', 'Status', 'Actions'].map(h => (
                  <th key={h} className={`text-left px-4 py-3 whitespace-nowrap ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">No approval requests match your filters.</td></tr>
              ) : filtered.map(a => {
                const route = relatedRoute(a)
                return (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/approvals/${a.id}`)}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-brand-blue">{a.id}</span>
                    </td>
                    <td className="px-4 py-3"><Badge variant={TYPE_BADGE[a.type]} size="sm">{a.type}</Badge></td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {route ? (
                        <button onClick={e => { e.stopPropagation(); navigate(route) }}
                          className="text-brand-blue font-medium hover:underline">
                          {a.relatedLabel}
                        </button>
                      ) : <span className="text-gray-400">{a.relatedLabel ?? '—'}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{a.requestedBy}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(a.requestedDate)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {a.amount != null ? `₹${a.amount.toLocaleString('en-IN')}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3"><Badge variant={STATUS_BADGE[a.status]} size="sm" dot>{a.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={e => { e.stopPropagation(); navigate(`/approvals/${a.id}`) }}
                          title="View"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors">
                          <Eye size={14} />
                        </button>
                        {a.status === 'Pending' && (
                          <>
                            <button onClick={e => { e.stopPropagation(); handleDecision(a, 'approve') }}
                              title="Approve"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                              <CheckCircle2 size={14} />
                            </button>
                            <button onClick={e => { e.stopPropagation(); handleDecision(a, 'reject') }}
                              title="Reject"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ApprovalDecisionModal
        isOpen={!!decisionModal}
        onClose={() => setDecisionModal(null)}
        decision={decisionModal?.decision}
        approval={decisionModal?.approval}
        onConfirm={handleConfirmDecision}
      />
    </div>
  )
}

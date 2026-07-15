import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UserCheck } from 'lucide-react'

function RelationshipOption({ onSelect, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-start gap-3 flex-1 text-left px-4 py-3.5 rounded-xl border-2 border-surface-border hover:border-brand-blue hover:bg-brand-blue/5 transition-colors"
    >
      <span className="mt-0.5 w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0" />
      <span>
        <span className="block text-sm font-semibold text-gray-800">{title}</span>
        <span className="block text-xs text-gray-500 mt-0.5">{subtitle}</span>
      </span>
    </button>
  )
}

export default function IntercomLeadNew() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-5 shrink-0 bg-white border-b border-surface-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/intercom/leads')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create Intercom Lead</h1>
            <p className="text-sm text-gray-500 mt-0.5">Choose how this lead relates to an existing internet connection</p>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5 max-w-3xl">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck size={15} className="text-brand-blue" />
            <p className="text-sm font-bold text-gray-700">Customer Relationship Check</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <RelationshipOption
              onSelect={() => navigate('/intercom/leads/new/existing')}
              title="Yes — Existing Internet Customer"
              subtitle="Link this lead to an existing internet customer account"
            />
            <RelationshipOption
              onSelect={() => navigate('/intercom/leads/new/intercom-only')}
              title="No — New / Intercom-Only Customer"
              subtitle="Create a fresh lead with full customer & location details"
            />
          </div>
        </div>
      </div>

    </div>
  )
}

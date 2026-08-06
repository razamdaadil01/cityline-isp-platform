import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Lock, ExternalLink, Search } from 'lucide-react'
import { getPlans } from '../../data/packagesStore'

// TODO: confirm exact FR-10 spec with BA — section referenced in PRD but not
// present in document body. Built from the field-table note ("Navigation to
// Package module") and BR-1. Reuses the same packagesStore data as the Lead
// Detail Package tab (Active Package Details / Add Bandwidth Package), but as
// a lighter-weight picker here: SalesLeadDetail's ResidentialPackageCard /
// EnterprisePackageCard / PackageSelectModal aren't exported/modularized from
// that file, so this first pass doesn't reuse those components directly —
// worth extracting them into a shared component in a follow-up.

const ZONE_BY_CUSTOMER_TYPE = { resident: 'Residential', corporate: 'Enterprise' }

export default function PackageSelectionStep({ customerType, value, onChange, blocked, feasibilityRecord }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const zone = ZONE_BY_CUSTOMER_TYPE[customerType]
  const plans = useMemo(
    () => getPlans().filter(p => p.status === 'Active' && (p.zone === zone || p.zone === 'Both')),
    [zone])

  if (blocked) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center space-y-3">
        <Lock size={22} className="mx-auto text-amber-500" />
        <p className="text-sm font-semibold text-amber-800">Package Selection is blocked</p>
        <p className="text-xs text-amber-700 max-w-md mx-auto">
          A Feasibility Work Order linked to this address hasn't been approved yet (BR-14).
          {feasibilityRecord && ` Current status: ${feasibilityRecord.feasibilityStatus}.`}
        </p>
        {feasibilityRecord && (
          <button
            type="button"
            onClick={() => navigate(`/sales/feasibility-requests/${feasibilityRecord.id}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:underline"
          >
            View Feasibility Request <ExternalLink size={13} />
          </button>
        )}
      </div>
    )
  }

  const q = search.trim().toLowerCase()
  const filtered = q
    ? plans.filter(p => p.name.toLowerCase().includes(q) || (p.speed ?? p.serviceType ?? '').toLowerCase().includes(q))
    : plans

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Select a package to complete this Customer Type record (BR-1 — Customer Type locks after this step).</p>

      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search package name or speed..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400 text-gray-800"
        />
      </div>

      <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden max-h-[280px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">
            {plans.length === 0 ? 'No active packages available for this customer type.' : 'No packages found'}
          </p>
        ) : filtered.map(plan => {
          const selected = value?.packageId === plan.id
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onChange({ packageId: plan.id })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <span className="text-sm text-gray-800 font-medium flex-1 min-w-0 truncate">{plan.name}</span>
              <span className="text-xs text-gray-500 shrink-0">{plan.speed ? plan.speed : plan.serviceType}</span>
              <span className="text-xs text-gray-500 shrink-0">
                ₹{plan.price.toLocaleString('en-IN')}/{plan.billingType === 'Monthly' ? 'mo' : 'yr'}
              </span>
              <span className="w-4 shrink-0">
                {selected && <CheckCircle2 size={16} className="text-brand-blue" />}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

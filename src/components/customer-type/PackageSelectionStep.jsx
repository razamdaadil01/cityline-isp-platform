import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Lock, ExternalLink } from 'lucide-react'
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

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Select a package to complete this Customer Type record (BR-1 — Customer Type locks after this step).</p>
      <div className="grid grid-cols-2 gap-3">
        {plans.map(plan => {
          const selected = value?.packageId === plan.id
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onChange({ packageId: plan.id })}
              className={`text-left rounded-xl border p-4 transition-colors
                ${selected ? 'border-brand-blue bg-brand-blue/5' : 'border-surface-border hover:border-brand-blue/40'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                {selected && <CheckCircle2 size={16} className="text-brand-blue shrink-0" />}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {plan.speed ? plan.speed : plan.serviceType} · ₹{plan.price.toLocaleString('en-IN')}/{plan.billingType === 'Monthly' ? 'mo' : 'yr'}
              </p>
            </button>
          )
        })}
        {plans.length === 0 && (
          <p className="col-span-2 text-sm text-gray-400 text-center py-8">No active packages available for this customer type.</p>
        )}
      </div>
    </div>
  )
}

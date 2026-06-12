import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit2 } from 'lucide-react'
import Badge from '../components/ui/Badge'
import { getPlans, subscribePlans, updatePlanStatus } from '../data/packagesStore'

const SERVER_TYPE_COLORS = {
  CNPL_B2C: 'bg-navy text-white',
  CNPL_B2B: 'bg-brand-blue text-white',
  CNPL_WHI: 'bg-purple-700 text-white',
}

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}-${m}-${y}`
}

function fmtPrice(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value ?? '—'}</p>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-card border border-surface-border">
      <div className="px-6 py-4 border-b border-surface-border">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

export default function PackageDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [plans, setPlans] = useState(getPlans)

  useEffect(() => subscribePlans(setPlans), [])

  const plan = plans.find(p => String(p.id) === String(id))

  if (!plan) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/packages')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Package Not Found</h1>
          </div>
        </div>
        <p className="text-sm text-gray-500">No package with ID "{id}" exists.</p>
      </div>
    )
  }

  const pkgType = plan.ottBundle ? 'Plan+OTT' : plan.serviceType === 'Other Package' ? 'Other Package' : 'Plan'
  const isActive = plan.status === 'active'
  const serverColor = SERVER_TYPE_COLORS[plan.serverType] || 'bg-gray-700 text-white'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/packages')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[12px] mb-0.5">
            <button onClick={() => navigate('/packages')} className="text-gray-400 hover:underline transition-colors">
              Packages
            </button>
            <span className="text-gray-300">›</span>
            <span className="text-gray-500 truncate">{plan.name}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 truncate">{plan.name}</h1>
        </div>
        <Badge variant={isActive ? 'green' : 'gray'} dot>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
        <button
          onClick={() => navigate(`/packages/${id}/edit`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-brand-blue/40 text-brand-blue hover:bg-blue-50 transition-colors shrink-0"
        >
          <Edit2 size={13} /> Edit Plan
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column — stacked cards */}
        <div className="xl:col-span-2 space-y-6">

          {/* Section 1 — Basic Info */}
          <Card title="Basic Info">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
              <InfoRow label="Package Name" value={plan.name} />
              <InfoRow label="Package Type" value={pkgType} />
              <InfoRow label="B/W Package ID" value={plan.bwPackageId} />
              <div className="flex flex-col gap-0.5">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Server Type</p>
                {plan.serverType
                  ? <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide w-fit ${serverColor}`}>{plan.serverType}</span>
                  : <p className="text-sm text-gray-800 font-medium">—</p>}
              </div>
              <InfoRow label="Pipeline" value={plan.pipeline || '—'} />
              <InfoRow label="Sort Order" value={plan.sortOrder ?? '—'} />
              <InfoRow label="Created Date" value={fmtDate(plan.createdAt)} />
              <InfoRow label="Added By" value={plan.addedBy || 'Admin'} />
            </div>
          </Card>

          {/* Section 2 — Pricing */}
          <Card title="Pricing">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
              <InfoRow label="Price" value={fmtPrice(plan.price)} />
              <InfoRow label="Tenure" value={plan.validity ? `${plan.validity} days` : 'One Time'} />
              <InfoRow label="Billing Type" value={plan.billingType} />
              <InfoRow label="No. of Recharge" value={plan.noOfRecharge ?? 1} />
              <InfoRow label="Multiple Month Pricing" value={plan.multipleMonthPricing ? 'Yes' : 'No'} />
            </div>

            {plan.multipleMonthPricing && plan.mmpRows?.length > 0 && (
              <div className="mt-5">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Pricing Rows</p>
                <div className="border border-surface-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-surface-border text-xs text-gray-500 font-semibold uppercase tracking-wider">
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Billing Type</th>
                        <th className="px-4 py-2 text-left">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {plan.mmpRows.map((row, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-xs text-gray-700">{row.name}</td>
                          <td className="px-4 py-2 text-xs text-gray-700">{row.billingType}</td>
                          <td className="px-4 py-2 text-xs text-gray-700">{fmtPrice(row.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>

          {/* Section 3 — Settings */}
          <Card title="Settings">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
              <InfoRow label="Package Available" value={plan.packageAvailable || 'Yes'} />
              <InfoRow label="Offer Package" value={plan.offerPackage || (plan.offer ? 'Yes' : 'No')} />
              <InfoRow label="Bundle with OTT" value={plan.bundleOTT || plan.ottBundle ? 'Yes' : 'No'} />
              {(plan.bundleOTT || plan.ottBundle) && (
                <>
                  <InfoRow label="OTT Type" value={plan.ottType || '—'} />
                  <InfoRow label="OTT Package" value={plan.ottPackage || '—'} />
                </>
              )}
              <InfoRow label="Do Not Include in Calc" value={plan.doNotIncludeInCalc ? 'Yes' : 'No'} />
            </div>
          </Card>

        </div>

        {/* Right column — Status card */}
        <div>
          <Card title="Status">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Active</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isActive ? 'This plan is currently live' : 'This plan is inactive'}
                </p>
              </div>
              <button
                onClick={() => updatePlanStatus(plan.id, isActive ? 'inactive' : 'active')}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  isActive ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isActive ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

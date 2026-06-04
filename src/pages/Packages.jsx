import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Zap, Calendar } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { getPlans, subscribePlans, updatePlanStatus, SERVICE_BADGE, BILLING_TYPES } from '../data/packagesStore'

const PAGE_SERVICE_TYPES = ['Plan', 'Other Package']
const PIPELINES = ['Residential', 'Enterprise']

export default function Packages() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState(getPlans)
  const [search, setSearch] = useState('')
  const [filterService, setFilterService] = useState('')
  const [filterPipeline, setFilterPipeline] = useState('')
  const [filterBilling, setFilterBilling] = useState('')

  useEffect(() => subscribePlans(setPlans), [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return plans.filter(p => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.serviceType.toLowerCase().includes(q)
      const matchService = !filterService || p.serviceType === filterService
      const matchPipeline = !filterPipeline || p.pipeline === filterPipeline
      const matchBilling = !filterBilling || p.billingType === filterBilling
      return matchSearch && matchService && matchPipeline && matchBilling
    })
  }, [plans, search, filterService, filterPipeline, filterBilling])

  function handleStatusToggle(id) {
    const plan = plans.find(p => p.id === id)
    if (plan) updatePlanStatus(id, plan.status === 'active' ? 'inactive' : 'active')
  }

  function clearFilters() {
    setSearch('')
    setFilterService('')
    setFilterPipeline('')
    setFilterBilling('')
  }

  const hasFilters = search || filterService || filterPipeline || filterBilling

  return (
    <div className="p-6 space-y-6 max-w-[1600px]">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Package & Plan List</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage service plans, pricing, and billing configurations</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate('/packages/add')}>
          Add Plan
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Total Plans',   value: plans.length,                                              cls: 'text-gray-900' },
          { label: 'Active',        value: plans.filter(p => p.status === 'active').length,           cls: 'text-emerald-600' },
          { label: 'Inactive',      value: plans.filter(p => p.status === 'inactive').length,         cls: 'text-gray-400' },
          { label: 'Offer Plans',   value: plans.filter(p => p.offer).length,                         cls: 'text-brand-orange' },
          { label: 'Other Plans',   value: plans.filter(p => p.serviceType === 'Other Package').length, cls: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-card border border-surface-border">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1.5 ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl shadow-card border border-surface-border p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search plans..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white w-full focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
            />
          </div>
          <select
            value={filterService}
            onChange={e => setFilterService(e.target.value)}
            className="px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700"
          >
            <option value="">All Service Types</option>
            {PAGE_SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select
            value={filterPipeline}
            onChange={e => setFilterPipeline(e.target.value)}
            className="px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700"
          >
            <option value="">All Pipelines</option>
            {PIPELINES.map(p => <option key={p}>{p}</option>)}
          </select>
          <select
            value={filterBilling}
            onChange={e => setFilterBilling(e.target.value)}
            className="px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700"
          >
            <option value="">All Billing Types</option>
            {BILLING_TYPES.map(b => <option key={b}>{b}</option>)}
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-surface-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} plan{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Plan Cards Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-base font-medium">No plans found</p>
          <p className="text-sm mt-1">Try adjusting your filters or add a new plan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(plan => (
            <PlanCard key={plan.id} plan={plan} onStatusToggle={handleStatusToggle} />
          ))}
        </div>
      )}

    </div>
  )
}

function PlanCard({ plan, onStatusToggle }) {
  const isActive = plan.status === 'active'

  return (
    <div
      className={`bg-white rounded-xl shadow-card border border-surface-border flex flex-col transition-all duration-200 hover:shadow-card-hover ${
        !isActive ? 'opacity-65' : ''
      }`}
    >
      {/* Header */}
      <div className="p-4 pb-3 border-b border-surface-border">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-gray-900 leading-snug flex-1">{plan.name}</p>
          <button
            onClick={() => onStatusToggle(plan.id)}
            title={isActive ? 'Deactivate' : 'Activate'}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              isActive ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                isActive ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={SERVICE_BADGE[plan.serviceType] || 'gray'} size="sm">
            {plan.serviceType}
          </Badge>
          {plan.pipeline === 'Residential' && <Badge variant="blue" size="sm">Residential</Badge>}
          {plan.pipeline === 'Enterprise' && <Badge variant="purple" size="sm">Enterprise</Badge>}
          {plan.packageType === 'Private' && <Badge variant="navy" size="sm">Private</Badge>}
          {plan.offer && <Badge variant="orange" size="sm">Offer</Badge>}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 space-y-2.5">
        <InfoRow icon={<Zap size={12} className="text-brand-blue" />} label="Speed" value={plan.speed} />
        <InfoRow
          icon={<Calendar size={12} className="text-gray-400" />}
          label="Validity"
          value={plan.validity ? `${plan.validity} days` : 'One-time'}
        />
        <InfoRow
          icon={<span className="text-xs">🔄</span>}
          label="Billing"
          value={plan.billingType}
        />
        {plan.ottBundle && (
          <div className="flex items-center gap-1.5 text-xs text-purple-700 font-medium bg-purple-50 rounded-lg px-2.5 py-1.5">
            <span>📺</span> OTT Bundle Included
          </div>
        )}
      </div>

      {/* Price Footer */}
      <div className="px-4 py-3 bg-gray-50/70 rounded-b-xl border-t border-surface-border flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Price</p>
          <p className="text-lg font-bold text-gray-900">₹{plan.price.toLocaleString('en-IN')}</p>
        </div>
        <Badge variant={isActive ? 'green' : 'gray'} size="sm" dot>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-xs text-gray-500">
        {icon}
        {label}
      </span>
      <span className="text-xs font-medium text-gray-700 text-right">{value}</span>
    </div>
  )
}

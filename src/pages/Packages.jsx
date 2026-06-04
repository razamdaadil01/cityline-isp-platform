import { useState, useMemo } from 'react'
import { Plus, Search, Zap, Calendar, Server } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { MOCK_PLANS, SERVICE_BADGE, SERVICE_TYPES, BILLING_TYPES } from '../data/packagesStore'

const SERVERS = [
  'Jaze-01', 'Jaze-02', 'Jaze-03', 'Jaze-04', 'Jaze-05',
  'Jaze-06', 'Jaze-07', 'Jaze-08', 'Jaze-09', 'Jaze-10',
  'IPACCAT-01', 'IPACCAT-02', 'IPACCAT-03', 'IPACCAT-04',
  'Mikrotik-01', 'Mikrotik-02',
]

const VALIDITY_DEFAULTS = {
  'One Time': 0,
  'Monthly': 30,
  'Quarterly': 90,
  'Half Yearly': 180,
  'Yearly': 365,
  '1+1': 60,
  '3+1': 120,
  '6+1': 210,
  '12+1': 395,
  '12+2': 420,
  'Diwali Dhamaka': 30,
}

const PLAN_BILLING_TYPES = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'One Time']

const EMPTY_FORM = {
  serviceType: 'Plan',
  // Plan-only
  pipeline: '',
  bandwidthPackageId: '',
  // Always
  packageType: 'Public',
  multipleMonthPricing: false,
  name: '',
  billingType: 'Monthly',
  price: '',
  packageInfo: '',
  sortOrder: '',
  speed: '',
  packageAvailable: 'Yes',
  offerPackage: 'No',
  bundleOTT: false,
  doNotIncludeInCalc: false,
}

export default function Packages() {
  const [plans, setPlans] = useState(MOCK_PLANS)
  const [search, setSearch] = useState('')
  const [filterService, setFilterService] = useState('')
  const [filterBilling, setFilterBilling] = useState('')
  const [filterServer, setFilterServer] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return plans.filter(p => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.serviceType.toLowerCase().includes(q)
      const matchService = !filterService || p.serviceType === filterService
      const matchBilling = !filterBilling || p.billingType === filterBilling
      const matchServer = !filterServer || p.server === filterServer
      return matchSearch && matchService && matchBilling && matchServer
    })
  }, [plans, search, filterService, filterBilling, filterServer])

  function setField(key, val) {
    setForm(f => {
      const next = { ...f, [key]: val }
      if (key === 'billingType') {
        next.validity = String(VALIDITY_DEFAULTS[val] ?? 30)
      }
      return next
    })
  }

  function handleStatusToggle(id) {
    setPlans(prev => prev.map(p =>
      p.id === id ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p
    ))
  }

  function handleSubmit() {
    const newPlan = {
      ...form,
      id: Date.now(),
      price: Number(form.price),
      sortOrder: form.sortOrder ? Number(form.sortOrder) : null,
      offer: form.offerPackage === 'Yes',
      ottBundle: form.bundleOTT,
      status: 'active',
    }
    setPlans(prev => [newPlan, ...prev])
    setShowModal(false)
    setForm(EMPTY_FORM)
  }

  function clearFilters() {
    setSearch('')
    setFilterService('')
    setFilterBilling('')
    setFilterServer('')
  }

  const hasFilters = search || filterService || filterBilling || filterServer

  return (
    <div className="p-6 space-y-6 max-w-[1600px]">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Package & Plan List</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage service plans, pricing, and billing configurations</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowModal(true)}>
          Add Plan
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Plans', value: plans.length, cls: 'text-gray-900' },
          { label: 'Active', value: plans.filter(p => p.status === 'active').length, cls: 'text-emerald-600' },
          { label: 'Inactive', value: plans.filter(p => p.status === 'inactive').length, cls: 'text-gray-400' },
          { label: 'Offer Plans', value: plans.filter(p => p.offer).length, cls: 'text-brand-orange' },
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
            {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select
            value={filterBilling}
            onChange={e => setFilterBilling(e.target.value)}
            className="px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700"
          >
            <option value="">All Billing Types</option>
            {BILLING_TYPES.map(b => <option key={b}>{b}</option>)}
          </select>
          <select
            value={filterServer}
            onChange={e => setFilterServer(e.target.value)}
            className="px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700"
          >
            <option value="">All Servers</option>
            {SERVERS.map(s => <option key={s}>{s}</option>)}
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

      {/* Add Plan Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setForm(EMPTY_FORM) }}
        title="Add New Plan"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowModal(false); setForm(EMPTY_FORM) }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name.trim() || !form.price}
            >
              Save Plan
            </Button>
          </>
        }
      >
        <div className="space-y-6">

          {/* ── Section 1: Basic Info ─────────────────────────── */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Basic Info</p>
            <div className="grid grid-cols-2 gap-x-5 gap-y-4">

              <FormField label="Service Type" required>
                <Select value={form.serviceType} onChange={e => setField('serviceType', e.target.value)}>
                  <option value="Plan">Plan</option>
                  <option value="Other Package">Other Package</option>
                </Select>
              </FormField>

              {form.serviceType === 'Plan' ? (
                <FormField label="Pipeline" required>
                  <Select value={form.pipeline} onChange={e => setField('pipeline', e.target.value)}>
                    <option value="">Select pipeline…</option>
                    <option value="Residential">Residential</option>
                    <option value="Enterprise">Enterprise</option>
                  </Select>
                </FormField>
              ) : (
                <div />
              )}

              {/* Package Type radio + Multiple Month Pricing checkbox */}
              <FormField label="Package Type" required>
                <div className="flex items-center gap-5 py-1.5">
                  {['Public', 'Private'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="packageType"
                        value={opt}
                        checked={form.packageType === opt}
                        onChange={() => setField('packageType', opt)}
                        className="w-4 h-4 border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                      />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </FormField>

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="multipleMonth"
                  checked={form.multipleMonthPricing}
                  onChange={e => setField('multipleMonthPricing', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                />
                <label htmlFor="multipleMonth" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                  Multiple Month Pricing
                </label>
              </div>

              {form.serviceType === 'Plan' && (
                <div className="col-span-2">
                  <FormField label="Bandwidth Package ID">
                    <Input
                      placeholder="e.g. PKG-001"
                      value={form.bandwidthPackageId}
                      onChange={e => setField('bandwidthPackageId', e.target.value)}
                    />
                  </FormField>
                </div>
              )}

            </div>
          </div>

          {/* ── Section 2: Package Details ────────────────────── */}
          <div className="border-t border-surface-border pt-5">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Package Details</p>
            <div className="grid grid-cols-2 gap-x-5 gap-y-4">

              <div className="col-span-2">
                <FormField label="Package Name" required>
                  <Input
                    placeholder="e.g. 100 Mbps Monthly FTTH"
                    value={form.name}
                    onChange={e => setField('name', e.target.value)}
                  />
                </FormField>
              </div>

              <FormField label="Billing Type" required>
                <Select value={form.billingType} onChange={e => setField('billingType', e.target.value)}>
                  {PLAN_BILLING_TYPES.map(b => <option key={b}>{b}</option>)}
                </Select>
              </FormField>

              <FormField label="Price (₹)" required>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.price}
                  onChange={e => setField('price', e.target.value)}
                />
              </FormField>

              <FormField label="Sort Order">
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.sortOrder}
                  onChange={e => setField('sortOrder', e.target.value)}
                />
              </FormField>

              <FormField label="Speed">
                <Input
                  placeholder="e.g. 100 Mbps"
                  value={form.speed}
                  onChange={e => setField('speed', e.target.value)}
                />
              </FormField>

              <div className="col-span-2">
                <FormField label="Package Info">
                  <Textarea
                    rows={2}
                    placeholder="Comment"
                    value={form.packageInfo}
                    onChange={e => setField('packageInfo', e.target.value)}
                  />
                </FormField>
              </div>

            </div>
          </div>

          {/* ── Section 3: Settings ───────────────────────────── */}
          <div className="border-t border-surface-border pt-5">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Settings</p>
            <div className="grid grid-cols-2 gap-x-5 gap-y-4">

              <FormField label="Package available" required>
                <div className="flex items-center gap-5 py-1">
                  {['Yes', 'No'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="packageAvailable"
                        value={opt}
                        checked={form.packageAvailable === opt}
                        onChange={() => setField('packageAvailable', opt)}
                        className="w-4 h-4 border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                      />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
                {form.packageAvailable === 'No' && (
                  <p className="text-xs text-amber-600 mt-1.5">This package not available for new account</p>
                )}
              </FormField>

              <FormField label="Offer Package" required>
                <div className="flex items-center gap-5 py-1">
                  {['Yes', 'No'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="offerPackage"
                        value={opt}
                        checked={form.offerPackage === opt}
                        onChange={() => setField('offerPackage', opt)}
                        className="w-4 h-4 border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                      />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
                {form.offerPackage === 'Yes' && (
                  <p className="text-xs text-amber-600 mt-1.5">This package will applicable only once</p>
                )}
              </FormField>

              <div className="col-span-2 flex flex-col gap-3 pt-1">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.bundleOTT}
                    onChange={e => setField('bundleOTT', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <span className="text-sm font-medium text-gray-700">Bundle with OTT</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.doNotIncludeInCalc}
                    onChange={e => setField('doNotIncludeInCalc', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <span className="text-sm font-medium text-gray-700">Do not include package amount in calculation</span>
                </label>
              </div>

            </div>
          </div>

        </div>
      </Modal>
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
        <InfoRow
          icon={<Server size={12} className="text-gray-400" />}
          label="Server"
          value={plan.server}
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

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-brand-blue' : 'bg-gray-300'
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

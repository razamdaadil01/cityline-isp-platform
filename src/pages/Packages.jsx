import { useState, useMemo } from 'react'
import { Plus, Search, Zap, Calendar, Server } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select } from '../components/ui/FormInputs'

const SERVICE_TYPES = ['FTTH', 'FTTB', 'Wireless', 'P2P', 'Leased Line', 'ILL']
const BILLING_TYPES = [
  'One Time', 'Monthly', 'Quarterly', 'Half Yearly', 'Yearly',
  '1+1', '3+1', '6+1', '12+1', '12+2', 'Diwali Dhamaka',
]
const SERVERS = [
  'Jaze-01', 'Jaze-02', 'Jaze-03', 'Jaze-04', 'Jaze-05',
  'Jaze-06', 'Jaze-07', 'IPACCAT-01', 'IPACCAT-02',
]

const SERVICE_BADGE = {
  FTTH: 'blue',
  FTTB: 'cyan',
  Wireless: 'purple',
  P2P: 'orange',
  'Leased Line': 'navy',
  ILL: 'gray',
}

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

const MOCK_PLANS = [
  {
    id: 1, name: '50 Mbps Monthly', serviceType: 'FTTH', server: 'Jaze-01',
    packageType: 'Public', billingType: 'Monthly', price: 699,
    speed: '50 Mbps', validity: 30, ottBundle: false, offer: false, status: 'active',
  },
  {
    id: 2, name: '100 Mbps Monthly', serviceType: 'FTTH', server: 'Jaze-01',
    packageType: 'Public', billingType: 'Monthly', price: 899,
    speed: '100 Mbps', validity: 30, ottBundle: true, offer: false, status: 'active',
  },
  {
    id: 3, name: '200 Mbps Quarterly', serviceType: 'FTTH', server: 'Jaze-02',
    packageType: 'Public', billingType: 'Quarterly', price: 2499,
    speed: '200 Mbps', validity: 90, ottBundle: true, offer: false, status: 'active',
  },
  {
    id: 4, name: '500 Mbps Half Yearly', serviceType: 'FTTH', server: 'Jaze-01',
    packageType: 'Private', billingType: 'Half Yearly', price: 5999,
    speed: '500 Mbps', validity: 180, ottBundle: false, offer: true, status: 'active',
  },
  {
    id: 5, name: '30 Mbps Monthly', serviceType: 'Wireless', server: 'Jaze-03',
    packageType: 'Public', billingType: 'Monthly', price: 499,
    speed: '30 Mbps', validity: 30, ottBundle: false, offer: false, status: 'active',
  },
  {
    id: 6, name: '50 Mbps Yearly', serviceType: 'Wireless', server: 'Jaze-03',
    packageType: 'Public', billingType: 'Yearly', price: 5500,
    speed: '50 Mbps', validity: 365, ottBundle: false, offer: true, status: 'inactive',
  },
  {
    id: 7, name: '100 Mbps P2P Monthly', serviceType: 'P2P', server: 'Jaze-02',
    packageType: 'Private', billingType: 'Monthly', price: 1999,
    speed: '100 Mbps', validity: 30, ottBundle: false, offer: false, status: 'active',
  },
  {
    id: 8, name: 'FTTB 20 Mbps Monthly', serviceType: 'FTTB', server: 'Jaze-01',
    packageType: 'Public', billingType: 'Monthly', price: 599,
    speed: '20 Mbps', validity: 30, ottBundle: false, offer: false, status: 'active',
  },
  {
    id: 9, name: '1 Gbps Yearly', serviceType: 'FTTH', server: 'Jaze-01',
    packageType: 'Private', billingType: 'Yearly', price: 11999,
    speed: '1 Gbps', validity: 365, ottBundle: true, offer: true, status: 'active',
  },
  {
    id: 10, name: 'Leased 10 Mbps Monthly', serviceType: 'Leased Line', server: 'IPACCAT-01',
    packageType: 'Private', billingType: 'Monthly', price: 4999,
    speed: '10 Mbps', validity: 30, ottBundle: false, offer: false, status: 'active',
  },
  {
    id: 11, name: 'ILL 100 Mbps Monthly', serviceType: 'ILL', server: 'IPACCAT-01',
    packageType: 'Private', billingType: 'Monthly', price: 15000,
    speed: '100 Mbps', validity: 30, ottBundle: false, offer: false, status: 'active',
  },
  {
    id: 12, name: '75 Mbps 12+2 Offer', serviceType: 'FTTH', server: 'Jaze-02',
    packageType: 'Public', billingType: '12+2', price: 8500,
    speed: '75 Mbps', validity: 420, ottBundle: true, offer: true, status: 'active',
  },
  {
    id: 13, name: '50 Mbps Diwali Dhamaka', serviceType: 'FTTH', server: 'Jaze-01',
    packageType: 'Public', billingType: 'Diwali Dhamaka', price: 599,
    speed: '50 Mbps', validity: 30, ottBundle: true, offer: true, status: 'inactive',
  },
  {
    id: 14, name: '100 Mbps 3+1 Offer', serviceType: 'FTTH', server: 'Jaze-02',
    packageType: 'Public', billingType: '3+1', price: 2699,
    speed: '100 Mbps', validity: 120, ottBundle: false, offer: true, status: 'active',
  },
  {
    id: 15, name: 'Wireless 20 Mbps 6+1', serviceType: 'Wireless', server: 'Jaze-03',
    packageType: 'Public', billingType: '6+1', price: 3200,
    speed: '20 Mbps', validity: 210, ottBundle: false, offer: true, status: 'active',
  },
]

const EMPTY_FORM = {
  name: '',
  serviceType: 'FTTH',
  server: 'Jaze-01',
  packageType: 'Public',
  billingType: 'Monthly',
  price: '',
  speed: '',
  validity: '30',
  ottBundle: false,
  offer: false,
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
      validity: Number(form.validity),
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
              disabled={!form.name.trim() || !form.price || !form.speed.trim()}
            >
              Save Plan
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Service Type" required>
            <Select value={form.serviceType} onChange={e => setField('serviceType', e.target.value)}>
              {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>

          <FormField label="Server / Network" required>
            <Select value={form.server} onChange={e => setField('server', e.target.value)}>
              {SERVERS.map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>

          <FormField label="Package Type" required>
            <Select value={form.packageType} onChange={e => setField('packageType', e.target.value)}>
              <option>Public</option>
              <option>Private</option>
            </Select>
          </FormField>

          <FormField label="Package Name" required>
            <Input
              placeholder="e.g. 100 Mbps Monthly"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
            />
          </FormField>

          <FormField label="Billing Type" required>
            <Select value={form.billingType} onChange={e => setField('billingType', e.target.value)}>
              {BILLING_TYPES.map(b => <option key={b}>{b}</option>)}
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

          <FormField label="Speed" required hint="e.g. 50 Mbps, 1 Gbps">
            <Input
              placeholder="100 Mbps"
              value={form.speed}
              onChange={e => setField('speed', e.target.value)}
            />
          </FormField>

          <FormField label="Validity (days)" hint="Auto-filled from billing type">
            <Input
              type="number"
              min="0"
              placeholder="30"
              value={form.validity}
              onChange={e => setField('validity', e.target.value)}
            />
          </FormField>

          <div className="col-span-2 border-t border-surface-border pt-4 flex flex-col gap-4">
            <ToggleRow
              label="Bundle with OTT"
              hint="Include OTT streaming services with this plan"
              checked={form.ottBundle}
              onChange={() => setField('ottBundle', !form.ottBundle)}
            />
            <ToggleRow
              label="Offer Package"
              hint="Mark this plan as a promotional / limited-time offer"
              checked={form.offer}
              onChange={() => setField('offer', !form.offer)}
            />
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

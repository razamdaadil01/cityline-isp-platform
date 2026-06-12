import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, LayoutGrid, List, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { getPlans, subscribePlans, updatePlanStatus, SERVICE_BADGE, BILLING_TYPES } from '../data/packagesStore'

const PAGE_SERVICE_TYPES = ['Plan', 'Other Package']
const PIPELINES = ['Residential', 'Enterprise']

const TABLE_PAGE_SIZE_OPTIONS = [10, 25, 50]

export default function Packages() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [plans, setPlans] = useState(getPlans)
  const view = searchParams.get('view') === 'table' ? 'table' : 'card'
  const [search, setSearch] = useState('')
  const [filterService, setFilterService] = useState('')
  const [filterPipeline, setFilterPipeline] = useState('')
  const [filterBilling, setFilterBilling] = useState('')
  const [tablePage, setTablePage] = useState(1)
  const [tablePageSize, setTablePageSize] = useState(10)

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
    setTablePage(1)
  }

  const hasFilters = search || filterService || filterPipeline || filterBilling

  const selectCls = 'px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700'

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Package & Plan List</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage service plans, pricing, and billing configurations</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-surface-border overflow-hidden">
            <button
              onClick={() => setSearchParams({ view: 'card' })}
              title="Card view"
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                view === 'card'
                  ? 'bg-navy text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid size={14} />
              <span>Card</span>
            </button>
            <button
              onClick={() => setSearchParams({ view: 'table' })}
              title="Table view"
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border-l border-surface-border transition-colors ${
                view === 'table'
                  ? 'bg-navy text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              <List size={14} />
              <span>Table</span>
            </button>
          </div>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate('/packages/add')}>
            Add Plan
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Total Plans',  value: plans.length,                                               cls: 'text-gray-900' },
          { label: 'Active',       value: plans.filter(p => p.status === 'active').length,            cls: 'text-emerald-600' },
          { label: 'Inactive',     value: plans.filter(p => p.status === 'inactive').length,          cls: 'text-gray-400' },
          { label: 'Offer Plans',  value: plans.filter(p => p.offer).length,                          cls: 'text-brand-orange' },
          { label: 'Other Plans',  value: plans.filter(p => p.serviceType === 'Other Package').length, cls: 'text-purple-600' },
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
          <select value={filterService}  onChange={e => setFilterService(e.target.value)}  className={selectCls}>
            <option value="">All Service Types</option>
            {PAGE_SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterPipeline} onChange={e => setFilterPipeline(e.target.value)} className={selectCls}>
            <option value="">All Pipelines</option>
            {PIPELINES.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={filterBilling}  onChange={e => setFilterBilling(e.target.value)}  className={selectCls}>
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

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-base font-medium">No plans found</p>
          <p className="text-sm mt-1">Try adjusting your filters or add a new plan</p>
        </div>
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(plan => (
            <PlanCard key={plan.id} plan={plan} onStatusToggle={handleStatusToggle} />
          ))}
        </div>
      ) : (
        <PlansTable
          plans={filtered}
          onStatusToggle={handleStatusToggle}
          tablePage={tablePage}
          setTablePage={setTablePage}
          tablePageSize={tablePageSize}
          setTablePageSize={v => { setTablePageSize(v); setTablePage(1) }}
        />
      )}
    </div>
  )
}

/* ── Card view ────────────────────────────────────────────── */

const SERVER_TYPE_COLORS_CARD = {
  CNPL_B2C: 'bg-navy text-white',
  CNPL_B2B: 'bg-brand-blue text-white',
  CNPL_WHI: 'bg-purple-700 text-white',
}

function fmtDateCard(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}-${m}-${y}`
}

function fmtPriceCard(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function CardDetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-xs font-medium text-gray-800 truncate">{value || '—'}</span>
    </div>
  )
}

function PlanCard({ plan, onStatusToggle }) {
  const navigate = useNavigate()
  const isActive = plan.status === 'active'
  const serverColor = SERVER_TYPE_COLORS_CARD[plan.serverType] || 'bg-gray-600 text-white'

  return (
    <div
      onClick={() => navigate(`/packages/${plan.id}`)}
      className={`bg-white rounded-xl shadow-card border border-surface-border flex flex-col transition-all duration-200 hover:shadow-lg hover:border-brand-blue/30 cursor-pointer ${
        !isActive ? 'opacity-65' : ''
      }`}
    >
      {/* Header */}
      <div className="p-4 pb-3 border-b border-surface-border">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <p className="text-sm font-bold text-gray-900 leading-snug flex-1">{plan.name}</p>
          <button
            onClick={e => { e.stopPropagation(); onStatusToggle(plan.id) }}
            title={isActive ? 'Deactivate' : 'Activate'}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              isActive ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          >
            <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={SERVICE_BADGE[plan.serviceType] || 'gray'} size="sm">{plan.serviceType}</Badge>
          {plan.pipeline === 'Residential' && <Badge variant="blue" size="sm">Residential</Badge>}
          {plan.pipeline === 'Enterprise' && <Badge variant="purple" size="sm">Enterprise</Badge>}
          {plan.packageType === 'Private' && <Badge variant="navy" size="sm">Private</Badge>}
          {plan.offer && <Badge variant="orange" size="sm">Offer</Badge>}
          {plan.ottBundle && <Badge variant="purple" size="sm">OTT Bundle</Badge>}
        </div>
      </div>

      {/* Details grid */}
      <div className="p-4 flex-1">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <CardDetailRow label="Speed"           value={plan.speed} />
          <CardDetailRow label="Tenure"          value={plan.validity ? `${plan.validity} days` : 'One-time'} />
          <CardDetailRow label="Billing Type"    value={plan.billingType} />
          <CardDetailRow label="Price"           value={fmtPriceCard(plan.price)} />
          <CardDetailRow label="Sort Order"      value={plan.sortOrder ?? '—'} />
          <CardDetailRow label="No. of Recharge" value={plan.noOfRecharge ?? 1} />
          <CardDetailRow label="B/W Package ID"  value={plan.bwPackageId || '0'} />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Server Type</span>
            {plan.serverType
              ? <span className={`inline-flex items-center self-start px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${serverColor}`}>{plan.serverType}</span>
              : <span className="text-xs font-medium text-gray-800">—</span>}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50/70 rounded-b-xl border-t border-surface-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900">{fmtPriceCard(plan.price)}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {plan.createdAt && (
                <span className="text-[10px] text-gray-400">{fmtDateCard(plan.createdAt)}</span>
              )}
              {plan.addedBy && (
                <span className="text-[10px] text-gray-400">· {plan.addedBy}</span>
              )}
            </div>
          </div>
          <Badge variant={isActive ? 'green' : 'gray'} size="sm" dot>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>
    </div>
  )
}

/* ── Table view ───────────────────────────────────────────── */

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

function PlansTable({ plans, onStatusToggle, tablePage, setTablePage, tablePageSize, setTablePageSize }) {
  const TH = 'px-3 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap'
  const totalPages = Math.max(1, Math.ceil(plans.length / tablePageSize))
  const pagePlans = plans.slice((tablePage - 1) * tablePageSize, tablePage * tablePageSize)
  const from = plans.length === 0 ? 0 : (tablePage - 1) * tablePageSize + 1
  const to = Math.min(tablePage * tablePageSize, plans.length)

  return (
    <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-sm w-full" style={{ minWidth: 1400 }}>
          <thead>
            <tr className="border-b border-surface-border bg-gray-50">
              <th className={`${TH} pl-6`}>Package Type</th>
              <th className={TH}>Package Name</th>
              <th className={TH}>Sub Plan Name</th>
              <th className={TH}>B/W Package ID</th>
              <th className={TH}>Server Type</th>
              <th className={TH}>Price</th>
              <th className={TH}>Tenure</th>
              <th className={TH}>Sort Order</th>
              <th className={TH}>No. of Recharge</th>
              <th className={TH}>Date</th>
              <th className={TH}>Added</th>
              <th className={TH}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {pagePlans.length === 0 && (
              <tr>
                <td colSpan={12} className="py-12 text-center text-gray-400 text-sm">No plans found</td>
              </tr>
            )}
            {pagePlans.map(plan => (
              <TableRow key={plan.id} plan={plan} onStatusToggle={onStatusToggle} />
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            Showing {from}–{to} of {plans.length} plan{plans.length !== 1 ? 's' : ''}
          </span>
          <select
            value={tablePageSize}
            onChange={e => setTablePageSize(Number(e.target.value))}
            className="text-xs border border-surface-border rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            {TABLE_PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s} / page</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTablePage(p => Math.max(1, p - 1))}
            disabled={tablePage === 1}
            className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setTablePage(p)}
              className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                p === tablePage ? 'bg-brand-blue text-white' : 'border border-surface-border hover:bg-white text-gray-600'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
            disabled={tablePage === totalPages}
            className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

function TableRow({ plan, onStatusToggle }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const isActive = plan.status === 'active'

  const pkgType = plan.ottBundle ? 'Plan+OTT' : plan.serviceType === 'Other Package' ? 'Other Package' : 'Plan'
  const serverColor = SERVER_TYPE_COLORS[plan.serverType] || 'bg-gray-700 text-white'

  useEffect(() => {
    if (!menuOpen) return
    function handle(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  return (
    <tr className={`hover:bg-gray-50 transition-colors ${!isActive ? 'opacity-60' : ''}`}>
      <td className="pl-6 pr-3 py-2.5 whitespace-nowrap">
        <span className="text-xs text-gray-700">{pkgType}</span>
      </td>
      <td className="px-3 py-2.5">
        <button
          onClick={() => navigate(`/packages/${plan.id}`)}
          className="block truncate text-xs font-semibold text-brand-blue hover:underline text-left w-full"
        >
          {plan.name}
        </button>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="text-xs text-gray-600">{plan.subPlanName || <span className="text-gray-300">—</span>}</span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="font-mono text-xs text-gray-600">{plan.bwPackageId || '0'}</span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        {plan.serverType
          ? <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${serverColor}`}>{plan.serverType}</span>
          : <span className="text-gray-300 text-xs">—</span>}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="text-xs font-semibold text-gray-900">{fmtPrice(plan.price)}</span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="text-xs text-gray-700">{plan.validity ? `${plan.validity} days` : 'One Time'}</span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-center">
        <span className="text-xs text-gray-700">{plan.sortOrder ?? '—'}</span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-center">
        <span className="text-xs text-gray-700">{plan.noOfRecharge ?? 1}</span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="text-xs text-gray-600">{fmtDate(plan.createdAt)}</span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="text-xs text-gray-600">{plan.addedBy || 'Admin'}</span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-xl shadow-lg border border-surface-border py-1">
              <button
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Pencil size={13} className="text-gray-400" /> Edit
              </button>
              <button
                onClick={() => { onStatusToggle(plan.id); setMenuOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className={`w-3 h-3 rounded-full ${isActive ? 'bg-gray-400' : 'bg-emerald-500'}`} />
                {isActive ? 'Deactivate' : 'Activate'}
              </button>
              <div className="my-1 border-t border-surface-border" />
              <button
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

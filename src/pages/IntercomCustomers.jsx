import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Download, Search, Filter, X, ChevronDown, Users, Activity,
  Ban, UserX, MoreVertical, Eye, Edit2, PowerOff,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

// ── Mock data ────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  active:    { variant: 'green',  label: 'Active' },
  suspended: { variant: 'orange', label: 'Suspended' },
  inactive:  { variant: 'gray',   label: 'Inactive' },
}

const PROJECTS = ['Sunrise Apartments', 'Greenwood Residency', 'Metro Business Park', 'Palm Grove Society']

export const INTERCOM_CUSTOMERS = [
  { id: 'IC-CUST-2026-000001', name: 'Mohan Das',    phone: '93456 78901', circuitId: 'IC-2026-0001', plan: 'Intercom Basic', zone: 'Andheri West', area: 'Andheri',  project: 'Sunrise Apartments',  status: 'active',    createdAt: '2026-06-20', depositSettlementStatus: 'Not Applicable' },
  { id: 'IC-CUST-2026-000002', name: 'Priya Nair',   phone: '98765 43210', circuitId: 'IC-2026-0002', plan: 'Intercom Plus',  zone: 'Bandra East',  area: 'Bandra',   project: 'Greenwood Residency', status: 'active',    createdAt: '2026-06-18', depositSettlementStatus: 'Not Applicable' },
  { id: 'IC-CUST-2026-000003', name: 'Suresh Patil', phone: '99887 76655', circuitId: 'IC-2026-0003', plan: 'Intercom Basic', zone: 'Goregaon',     area: 'Goregaon', project: 'Metro Business Park', status: 'suspended', createdAt: '2026-06-10', depositSettlementStatus: 'Pending' },
  { id: 'IC-CUST-2026-000004', name: 'Anita Desai',  phone: '91234 56789', circuitId: 'IC-2026-0004', plan: 'Intercom Plus',  zone: 'Versova',      area: 'Andheri',  project: 'Palm Grove Society',  status: 'active',    createdAt: '2026-06-05', depositSettlementStatus: 'Pending' },
  { id: 'IC-CUST-2026-000005', name: 'Rajesh Kumar', phone: '97654 32198', circuitId: 'IC-2026-0005', plan: 'Intercom Basic', zone: 'Andheri East', area: 'Andheri',  project: 'Sunrise Apartments',  status: 'inactive',  createdAt: '2026-05-28', depositSettlementStatus: 'Settled' },
]

const ZONES = [...new Set(INTERCOM_CUSTOMERS.map(c => c.zone))].sort()
const AREAS = [...new Set(INTERCOM_CUSTOMERS.map(c => c.area))].sort()

// ── Actions Menu ───────────────────────────────────────────────────────────────

function ActionsMenu({ customer, pos, onView, onEdit, onSuspend, onTerminate }) {
  return (
    <div
      style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
      className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
    >
      <button onClick={() => onView(customer)}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
        <Eye size={13} className="text-brand-blue shrink-0" /> View
      </button>
      <button onClick={() => onEdit(customer)}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
        <Edit2 size={13} className="text-gray-400 shrink-0" /> Edit
      </button>
      <div className="my-1 border-t border-surface-border" />
      <button onClick={() => onSuspend(customer)}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-amber-600 hover:bg-amber-50 transition-colors">
        <Ban size={13} className="shrink-0" /> Suspend
      </button>
      <button onClick={() => onTerminate(customer)}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors">
        <UserX size={13} className="shrink-0" /> Terminate
      </button>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function IntercomCustomers() {
  const navigate = useNavigate()
  const menuRef = useRef(null)

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuId, setMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [filterStatus, setFilterStatus] = useState('')
  const [filterZone, setFilterZone] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const EMPTY_DRAFT = { status: '', zone: '', project: '', area: '', dateFrom: '', dateTo: '' }
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  useEffect(() => {
    if (!menuId) return
    function handleClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuId])

  function openMenu(e, id) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setMenuId(id)
  }

  function openDrawer() {
    setDraft({
      status: filterStatus, zone: filterZone, project: filterProject,
      area: filterArea, dateFrom: filterDateFrom, dateTo: filterDateTo,
    })
    setDrawerOpen(true)
  }

  function applyDrawer() {
    setFilterStatus(draft.status)
    setFilterZone(draft.zone)
    setFilterProject(draft.project)
    setFilterArea(draft.area)
    setFilterDateFrom(draft.dateFrom)
    setFilterDateTo(draft.dateTo)
    setPage(1)
    setDrawerOpen(false)
  }

  function clearAllFilters() {
    setFilterStatus(''); setFilterZone(''); setFilterProject('')
    setFilterArea(''); setFilterDateFrom(''); setFilterDateTo('')
    setDraft(EMPTY_DRAFT)
    setPage(1)
  }

  const filterCount = [filterStatus, filterZone, filterProject, filterArea, filterDateFrom || filterDateTo].filter(Boolean).length
  const hasActiveFilters = filterCount > 0

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return INTERCOM_CUSTOMERS.filter(c => {
      if (q && !c.name.toLowerCase().includes(q) && !c.phone.includes(search.trim()) && !c.id.toLowerCase().includes(q)) return false
      if (filterStatus && c.status !== filterStatus.toLowerCase()) return false
      if (filterZone && c.zone !== filterZone) return false
      if (filterProject && c.project !== filterProject) return false
      if (filterArea && c.area !== filterArea) return false
      if (filterDateFrom && c.createdAt < filterDateFrom) return false
      if (filterDateTo && c.createdAt > filterDateTo) return false
      return true
    })
  }, [search, filterStatus, filterZone, filterProject, filterArea, filterDateFrom, filterDateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const stats = useMemo(() => ({
    total:     INTERCOM_CUSTOMERS.length,
    active:    INTERCOM_CUSTOMERS.filter(c => c.status === 'active').length,
    suspended: INTERCOM_CUSTOMERS.filter(c => c.status === 'suspended').length,
    inactive:  INTERCOM_CUSTOMERS.filter(c => c.status === 'inactive').length,
  }), [])

  const menuCustomer = INTERCOM_CUSTOMERS.find(c => c.id === menuId) ?? null

  function handleView(c) { navigate(`/intercom/customers/${c.id}`); setMenuId(null) }
  function handleEdit(c) { navigate(`/intercom/customers/${c.id}`); setMenuId(null) }
  function handleSuspend() { setMenuId(null) }
  function handleTerminate() { setMenuId(null) }

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Intercom Customers</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage intercom service customers</p>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Customers', value: stats.total,     icon: Users,    color: 'text-brand-blue',  bg: 'bg-brand-blue/10' },
          { label: 'Active',          value: stats.active,    icon: Activity, color: 'text-emerald-700', bg: 'bg-emerald-100'   },
          { label: 'Suspended',       value: stats.suspended, icon: Ban,      color: 'text-brand-orange',bg: 'bg-brand-orange/10' },
          { label: 'Inactive',        value: stats.inactive,  icon: PowerOff, color: 'text-gray-500',    bg: 'bg-gray-100'      },
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

      {/* ── Search + Filter ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name, phone, customer ID…"
              className="pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white w-full focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={openDrawer}
            className={`relative flex items-center justify-center w-9 h-9 rounded-lg border transition-all shrink-0 ${
              hasActiveFilters
                ? 'border-purple-500 bg-purple-50 text-purple-600 hover:bg-purple-100'
                : 'border-surface-border bg-white text-gray-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50'
            }`}
            title="Open filters"
          >
            <Filter size={15} />
            {filterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-purple-600 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                {filterCount}
              </span>
            )}
          </button>
          <Button variant="secondary" size="sm" icon={<Download size={14} />}>Export</Button>
        </div>

        {(hasActiveFilters || search.trim()) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={11} className="text-purple-400 shrink-0" />
            {search.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                "{search}"
                <button onClick={() => setSearch('')} className="hover:text-gray-900 ml-0.5"><X size={10} /></button>
              </span>
            )}
            {filterStatus && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {filterStatus}
                <button onClick={() => setFilterStatus('')} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            {filterZone && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {filterZone}
                <button onClick={() => setFilterZone('')} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            {filterProject && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {filterProject}
                <button onClick={() => setFilterProject('')} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            {filterArea && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {filterArea}
                <button onClick={() => setFilterArea('')} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            {(filterDateFrom || filterDateTo) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                Date: {filterDateFrom || '…'} → {filterDateTo || '…'}
                <button onClick={() => { setFilterDateFrom(''); setFilterDateTo('') }} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
              </span>
            )}
            <button onClick={() => { clearAllFilters(); setSearch('') }}
              className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors ml-0.5">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                {['Customer ID', 'Name', 'Phone', 'Circuit ID', 'Plan', 'Zone', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-14 text-gray-400 text-sm">
                    <Users size={32} className="mx-auto mb-2 text-gray-200" />
                    No intercom customers found
                  </td>
                </tr>
              ) : (
                paged.map(c => {
                  const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.inactive
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/intercom/customers/${c.id}`)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-brand-blue font-semibold">{c.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue to-navy flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {c.name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-800 whitespace-nowrap">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">{c.phone}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">{c.circuitId}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{c.plan}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{c.zone}</td>
                      <td className="px-4 py-3">
                        <Badge variant={cfg.variant} dot size="sm">{cfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => openMenu(e, c.id)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                            menuId === c.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <MoreVertical size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Records per page</span>
            <select value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="text-xs border border-surface-border rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
              {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <span className="text-xs text-gray-500">
            Page {currentPage} of {totalPages} &nbsp;|&nbsp; Total {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                  p === currentPage ? 'bg-brand-blue text-white' : 'border border-surface-border hover:bg-white text-gray-600'
                }`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── 3-dot dropdown portal ──────────────────────────────────────────── */}
      {menuCustomer && (
        <div ref={menuRef}>
          <ActionsMenu
            customer={menuCustomer}
            pos={menuPos}
            onView={handleView}
            onEdit={handleEdit}
            onSuspend={handleSuspend}
            onTerminate={handleTerminate}
          />
        </div>
      )}

      {/* ── Filter Drawer ────────────────────────────────────────────────────── */}
      <div className={`fixed top-14 left-0 right-0 bottom-0 z-50 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>

          {/* Drawer header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-purple-600" />
              <h2 className="text-sm font-bold text-gray-900">Filters</h2>
              {filterCount > 0 && (
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">
                  {filterCount} active
                </span>
              )}
            </div>
            <button onClick={() => setDrawerOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* Drawer body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
              <div className="relative">
                <select value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Zone */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Zone</label>
              <div className="relative">
                <select value={draft.zone} onChange={e => setDraft(d => ({ ...d, zone: e.target.value }))}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All Zones</option>
                  {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Project */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Project</label>
              <div className="relative">
                <select value={draft.project} onChange={e => setDraft(d => ({ ...d, project: e.target.value }))}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All Projects</option>
                  {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Area */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Area</label>
              <div className="relative">
                <select value={draft.area} onChange={e => setDraft(d => ({ ...d, area: e.target.value }))}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700 cursor-pointer">
                  <option value="">All Areas</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Created Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Created Date</label>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-400 mb-1">From</p>
                  <input type="date" value={draft.dateFrom} onChange={e => setDraft(d => ({ ...d, dateFrom: e.target.value }))}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">To</p>
                  <input type="date" value={draft.dateTo} onChange={e => setDraft(d => ({ ...d, dateTo: e.target.value }))}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 text-gray-700" />
                </div>
              </div>
            </div>

          </div>

          {/* Drawer footer */}
          <div className="shrink-0 px-5 py-4 border-t border-surface-border bg-gray-50 flex items-center gap-3">
            <button onClick={clearAllFilters}
              className="flex-1 py-2.5 text-sm font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl transition-colors bg-white">
              Clear All Filters
            </button>
            <button onClick={applyDrawer}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm">
              Apply Filters
            </button>
          </div>

        </div>
      </div>

    </div>
  )
}

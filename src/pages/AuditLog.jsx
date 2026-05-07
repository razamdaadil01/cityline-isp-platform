import { useState, useMemo } from 'react'
import {
  Shield, Download, X, Search, Filter, ChevronLeft, ChevronRight,
  Lock, PlusCircle, Edit3, Trash2, LogIn, Info, ChevronDown
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

// ── Mock data ────────────────────────────────────────────────────────────────

const MODULES = ['Customers', 'Billing', 'Resellers', 'Packages', 'Network', 'Support', 'Settings', 'Auth', 'Inventory']
const ACTIONS = ['Create', 'Edit', 'Delete', 'Login', 'Logout', 'Export', 'View']
const USERS   = ['admin@cityline.in', 'rahul.ops@cityline.in', 'billing@cityline.in', 'support@cityline.in']
const DEVICES = ['Chrome / Windows', 'Safari / macOS', 'Firefox / Linux', 'Chrome / Android', 'Edge / Windows']
const IPS     = ['192.168.1.10', '103.25.44.81', '49.37.128.55', '10.0.0.5', '203.197.12.44']

const ACTION_CFG = {
  Create:  { color: 'bg-emerald-100 text-emerald-700', icon: PlusCircle, variant: 'green' },
  Edit:    { color: 'bg-blue-100 text-blue-700',       icon: Edit3,      variant: 'blue'  },
  Delete:  { color: 'bg-red-100 text-red-700',         icon: Trash2,     variant: 'red'   },
  Login:   { color: 'bg-gray-100 text-gray-600',       icon: LogIn,      variant: 'gray'  },
  Logout:  { color: 'bg-gray-100 text-gray-500',       icon: LogIn,      variant: 'gray'  },
  Export:  { color: 'bg-purple-100 text-purple-700',   icon: Download,   variant: 'purple'},
  View:    { color: 'bg-sky-100 text-sky-700',         icon: Info,       variant: 'cyan'  },
}

const DETAILS_MAP = {
  'Customers-Create':   ['Added new customer Rajan Mehta (CL-1031)', 'Created account for Priya Sharma', 'New residential customer onboarded'],
  'Customers-Edit':     ['Updated plan for CL-1005 to FTTH 200Mbps', 'Changed contact number for CL-1012', 'Modified expiry date for CL-1023'],
  'Customers-Delete':   ['Deleted inactive account CL-1016', 'Removed duplicate entry CL-1004'],
  'Billing-Create':     ['Invoice INV-2026-0451 generated', 'Receipt issued for payment ₹999'],
  'Billing-Edit':       ['Updated invoice INV-2026-0440 due date', 'Corrected amount on INV-2026-0388'],
  'Resellers-Create':   ['Added reseller: Raj Networks (RS-001)', 'New reseller DigiLink onboarded'],
  'Resellers-Edit':     ['Updated profit margin for RS-007 to 25%', 'Wallet top-up ₹10,000 for RS-002'],
  'Packages-Create':    ['Created package FTTH 300Mbps ₹1,399/mo', 'Added OTT bundle package'],
  'Packages-Edit':      ['Updated price for FTTB 50Mbps to ₹649', 'Modified validity period for Wireless plans'],
  'Packages-Delete':    ['Deprecated package Wireless 10Mbps'],
  'Network-Edit':       ['Updated OLT-AW-01 configuration', 'Changed port mapping on JAZE-MUM-01'],
  'Settings-Edit':      ['Modified SMTP settings', 'Updated SMS gateway credentials', 'Changed system timezone to Asia/Kolkata'],
  'Support-Create':     ['Ticket TK-2026-0189 opened by Sunita Joshi', 'New escalation created for CL-1007'],
  'Support-Edit':       ['Ticket TK-2026-0180 status changed to Resolved', 'Assigned ticket to support team'],
  'Auth-Login':         ['Successful login from Chrome / Windows', 'Login from new device detected'],
  'Auth-Logout':        ['User session ended normally'],
  'Inventory-Create':   ['Added 20 units of ONU TP-Link XS-010X-Q to stock'],
  'Inventory-Edit':     ['Updated stock count for Cat6 cable to 450m'],
}

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randomDetails(module, action) {
  const key = `${module}-${action}`
  const pool = DETAILS_MAP[key] || [`${action} performed on ${module} module`]
  return randomFrom(pool)
}

const SEED_LOGS = Array.from({ length: 120 }, (_, i) => {
  const action = randomFrom(ACTIONS)
  const module = action === 'Login' || action === 'Logout' ? 'Auth' : randomFrom(MODULES.filter(m => m !== 'Auth'))
  const d      = new Date(2026, 4, 7 - Math.floor(i / 15), 23 - (i % 12), (i * 7) % 60, (i * 13) % 60)
  return {
    id:        `LOG-${String(i + 1).padStart(5, '0')}`,
    timestamp: d.toISOString().replace('T', ' ').slice(0, 19),
    user:      action === 'Login' || action === 'Logout' ? randomFrom(USERS) : randomFrom(USERS),
    action,
    module,
    details:   randomDetails(module, action),
    ip:        randomFrom(IPS),
    device:    randomFrom(DEVICES),
  }
}).sort((a, b) => b.timestamp.localeCompare(a.timestamp))

const PAGE_SIZE = 20

// ── Sub-components ───────────────────────────────────────────────────────────

function ActionBadge({ action }) {
  const cfg = ACTION_CFG[action] ?? ACTION_CFG.View
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon size={11} />
      {action}
    </span>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-white border border-surface-border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer"
      >
        <option value="">{label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AuditLog() {
  const [search,      setSearch]      = useState('')
  const [filterUser,  setFilterUser]  = useState('')
  const [filterMod,   setFilterMod]   = useState('')
  const [filterAction,setFilterAction]= useState('')
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [page,        setPage]        = useState(1)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return SEED_LOGS.filter(log => {
      if (q && !log.details.toLowerCase().includes(q) && !log.user.includes(q) && !log.id.includes(q)) return false
      if (filterUser   && log.user   !== filterUser)   return false
      if (filterMod    && log.module !== filterMod)    return false
      if (filterAction && log.action !== filterAction) return false
      if (dateFrom     && log.timestamp.slice(0, 10) < dateFrom) return false
      if (dateTo       && log.timestamp.slice(0, 10) > dateTo)   return false
      return true
    })
  }, [search, filterUser, filterMod, filterAction, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeFilterCount = [filterUser, filterMod, filterAction, dateFrom, dateTo].filter(Boolean).length

  function clearFilters() {
    setFilterUser(''); setFilterMod(''); setFilterAction(''); setDateFrom(''); setDateTo('')
    setPage(1)
  }

  const actionCounts = useMemo(() => {
    const c = {}
    ACTIONS.forEach(a => { c[a] = SEED_LOGS.filter(l => l.action === a).length })
    return c
  }, [])

  return (
    <div className="p-6 space-y-5 max-w-[1600px]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-navy/10 rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-navy" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">
              <Lock size={11} className="text-emerald-600" />
              <span className="text-xs font-medium text-emerald-600">Immutable</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 ml-10">{filtered.length} of {SEED_LOGS.length} activity records</p>
        </div>
        <Button variant="secondary" size="sm" icon={<Download size={14} />}>Export to Excel</Button>
      </div>

      {/* ── Action counts ── */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(ACTION_CFG).map(([action, cfg]) => (
          <div key={action} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${cfg.color} border-current/20`}>
            <cfg.icon size={12} />
            {action}
            <span className="opacity-70">({actionCounts[action] ?? 0})</span>
          </div>
        ))}
      </div>

      {/* ── Search + filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search details, user, log ID…"
            className="pl-9 pr-8 py-1.5 text-sm w-72 bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(v => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors font-medium ${showFilters || activeFilterCount > 0 ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-gray-700 border-surface-border hover:bg-gray-50'}`}
        >
          <Filter size={13} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-white/30 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">{activeFilterCount}</span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1">
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-white rounded-xl border border-surface-border shadow-card">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="px-3 py-1.5 text-sm bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="px-3 py-1.5 text-sm bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>
          <div className="flex items-end">
            <FilterSelect label="All Users"    value={filterUser}   onChange={v => { setFilterUser(v);   setPage(1) }} options={USERS}   />
          </div>
          <div className="flex items-end">
            <FilterSelect label="All Modules"  value={filterMod}    onChange={v => { setFilterMod(v);    setPage(1) }} options={MODULES} />
          </div>
          <div className="flex items-end">
            <FilterSelect label="All Actions"  value={filterAction} onChange={v => { setFilterAction(v); setPage(1) }} options={ACTIONS} />
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Log ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Module</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-sm text-gray-400">
                    <Shield size={32} className="mx-auto mb-2 text-gray-200" />
                    No audit records found
                  </td>
                </tr>
              ) : paginated.map(log => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{log.id}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">{log.timestamp}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-blue to-navy flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {log.user.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-600 truncate max-w-[140px]">{log.user}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs rounded font-medium bg-navy/8 text-navy">{log.module}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[280px]">{log.details}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.ip}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{log.device}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50/40">
          <p className="text-xs text-gray-500">
            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} records
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`e-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-all ${p === page ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, MoreVertical, ClipboardCheck, Clock, CheckCircle, XCircle, Eye, PackageOpen,
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import { getQARecords, subscribeQARecords, QA_STATUSES } from '../../data/qaStore'

const STATUS_BADGE = {
  Pending: 'yellow',
  'In Progress': 'blue',
  Passed: 'green',
  Failed: 'red',
  'Partially Passed': 'purple',
}

const PAGE_SIZE = 10

export default function QAInspection() {
  const navigate = useNavigate()
  const [records, setRecords] = useState(getQARecords)
  useEffect(() => subscribeQARecords(setRecords), [])

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)

  const [menuId, setMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const menuRef = useRef(null)

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

  const stats = useMemo(() => ({
    total: records.length,
    pending: records.filter(r => r.status === 'Pending').length,
    passed: records.filter(r => r.status === 'Passed').length,
    failed: records.filter(r => r.status === 'Failed').length,
  }), [records])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return records.filter(r => {
      if (q && !r.id.toLowerCase().includes(q) && !r.purchaseNumber.toLowerCase().includes(q) && !r.vendorName.toLowerCase().includes(q)) return false
      if (filterStatus && r.status !== filterStatus) return false
      return true
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [records, search, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, filtered.length)

  function handleSearchChange(v) { setSearch(v); setPage(1) }
  function handleStatusChange(v) { setFilterStatus(v); setPage(1) }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QA Inspection</h1>
        <p className="text-sm text-gray-500 mt-0.5">Inspect received goods before releasing to stock</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Inspections', value: stats.total,   icon: ClipboardCheck, color: 'text-brand-blue',  bg: 'bg-brand-blue/10' },
          { label: 'Pending',           value: stats.pending, icon: Clock,          color: 'text-amber-600',   bg: 'bg-amber-50' },
          { label: 'Passed',            value: stats.passed,  icon: CheckCircle,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Failed',            value: stats.failed,  icon: XCircle,        color: 'text-red-500',     bg: 'bg-red-50' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl border border-surface-border shadow-card px-4 py-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                <Icon size={18} className={s.color} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-[11px] text-gray-500 leading-tight">{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search QA ID, purchase number, vendor…"
            className="pl-9 pr-8 py-1.5 text-sm w-80 bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
          {search && (
            <button onClick={() => handleSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={filterStatus}
            onChange={e => handleStatusChange(e.target.value)}
            className="appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-700 cursor-pointer"
          >
            <option value="">All Statuses</option>
            {QA_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▾</span>
        </div>

        {(search || filterStatus) && (
          <button onClick={() => { handleSearchChange(''); handleStatusChange('') }} className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[140px]">QA ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Purchase No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Store</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Received Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="px-4 py-3 w-12 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-sm text-gray-400">
                    <ClipboardCheck size={32} className="mx-auto mb-2 text-gray-200" />
                    {records.length === 0
                      ? 'No QA inspections yet. Inspections are created automatically when a purchase is confirmed.'
                      : 'No QA inspections match the current filters.'}
                  </td>
                </tr>
              ) : paged.map(r => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/inventory/qa/${r.id}`)}
                  className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-brand-blue">{r.id}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{r.purchaseNumber}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{r.vendorName}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{r.storeName}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                    {r.items.length} item{r.items.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.purchaseDate || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={STATUS_BADGE[r.status] ?? 'gray'} dot size="sm">{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3 w-12 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => openMenu(e, r.id)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto ${menuId === r.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    >
                      <MoreVertical size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50/40">
          <p className="text-xs text-gray-500">Showing {from}–{to} of {filtered.length} inspection{filtered.length !== 1 ? 's' : ''}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${p === page ? 'bg-brand-blue text-white' : 'border border-surface-border hover:bg-white text-gray-600'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Actions menu */}
      {menuId && (() => {
        const r = records.find(x => x.id === menuId)
        if (!r) return null
        return (
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
          >
            <button
              onClick={() => { navigate(`/inventory/qa/${r.id}`); setMenuId(null) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Eye size={13} className="text-brand-blue shrink-0" /> Inspect
            </button>
            <button
              onClick={() => { navigate(`/inventory/purchases/${r.purchaseId}`); setMenuId(null) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <PackageOpen size={13} className="text-gray-400 shrink-0" /> View Purchase
            </button>
          </div>
        )
      })()}
    </div>
  )
}

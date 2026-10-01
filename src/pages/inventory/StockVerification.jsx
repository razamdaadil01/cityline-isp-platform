import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Download, ChevronDown, MoreVertical,
} from 'lucide-react'
import { getAssignments, subscribeAssignments } from '../../data/assignmentStore'
import { getUserAssignments, subscribeUserAssignments } from '../../data/userAssignmentStore'

// ─── Ownership derivation ─────────────────────────────────────────────────────
function deriveOwnership(assignment) {
  if (assignment.status === 'Reversed') return 'Recovered'
  if (assignment.assignmentType === 'disconnection') return 'Recovered'
  if (assignment.recoveryOutcome === 'missing') return 'Missing'
  if (assignment.customerName) return 'Customer'
  return 'Company'
}

// ─── Flatten both stores into unified rows ────────────────────────────────────
function buildRows(assignments, userAssignments) {
  const rows = []

  for (const a of assignments) {
    for (const line of (a.hardwareLines || [])) {
      rows.push({
        id: `${a.id}-hw-${line.id}`,
        date: a.assignedAt ? a.assignedAt.slice(0, 10) : '',
        engineer: a.engineerName,
        type: 'Hardware',
        product: line.productName,
        serials: line.serials || [],
        macs: line.macs || [],
        qty: line.assignedQty,
        user: '—',
        installationRef: '—',
        ownership: 'Company',
        assignmentNumber: a.assignmentNumber,
        sourceId: a.id,
        source: 'engineer',
      })
    }
    for (const line of (a.wireLines || [])) {
      rows.push({
        id: `${a.id}-wire-${line.id}`,
        date: a.assignedAt ? a.assignedAt.slice(0, 10) : '',
        engineer: a.engineerName,
        type: 'Wire',
        product: line.productName,
        serials: [],
        macs: [],
        qty: `${line.assignedMeters}m`,
        user: '—',
        installationRef: '—',
        ownership: 'Company',
        assignmentNumber: a.assignmentNumber,
        sourceId: a.id,
        source: 'engineer',
      })
    }
  }

  for (const a of userAssignments) {
    for (const item of (a.items || [])) {
      rows.push({
        id: `${a.id}-item-${item.id}`,
        date: a.assignedAt ? a.assignedAt.slice(0, 10) : '',
        engineer: a.engineerName,
        type: item.drumNumber ? 'Wire' : 'Hardware',
        product: item.productName,
        serials: item.serials || [],
        macs: item.macs || [],
        qty: item.qty,
        user: a.customerName || '—',
        installationRef: a.workOrderLabel || '—',
        ownership: deriveOwnership(a),
        assignmentNumber: a.assignmentNumber,
        sourceId: a.id,
        source: 'user',
      })
    }
  }

  return rows
}

// ─── Badge helpers ────────────────────────────────────────────────────────────
const TYPE_BADGE = {
  Hardware: 'bg-blue-100 text-blue-700',
  Wire:     'bg-teal-100 text-teal-700',
}

const OWNERSHIP_COLORS = {
  Customer:  'bg-green-100 text-green-700',
  Company:   'bg-blue-100 text-blue-700',
  Recovered: 'bg-amber-100 text-amber-700',
  Missing:   'bg-red-100 text-red-700',
}

const OWNERSHIP_OPTIONS = ['Customer', 'Company', 'Recovered', 'Missing']

const PAGE_SIZES = [10, 25, 50]

// ─── Ownership dropdown per row ───────────────────────────────────────────────
function OwnershipCell({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${OWNERSHIP_COLORS[value] || 'bg-gray-100 text-gray-600'}`}
      >
        {value}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-surface-border rounded-xl shadow-lg z-20 min-w-[130px] py-1">
          {OWNERSHIP_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-surface-hover transition-colors ${opt === value ? 'bg-surface-hover' : ''}`}
            >
              <span className={`inline-block px-2 py-0.5 rounded-full ${OWNERSHIP_COLORS[opt]}`}>{opt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Three-dot actions menu ───────────────────────────────────────────────────
function ActionsMenu({ row }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function viewAssignment() {
    const path = row.source === 'engineer'
      ? `/inventory/assign/${row.sourceId}`
      : `/inventory/assign-to-user/${row.sourceId}`
    navigate(path)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-surface-hover transition-colors"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-surface-border rounded-xl shadow-lg z-20 min-w-[160px] py-1">
          <button
            type="button"
            onClick={viewAssignment}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-surface-hover transition-colors"
          >
            View Assignment
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Searchable engineer dropdown ─────────────────────────────────────────────
function EngineerFilter({ value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const filtered = options.filter(o => o.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="h-9 px-3 pr-8 border border-surface-border rounded-lg text-sm text-gray-700 bg-white hover:border-gray-400 transition-colors text-left min-w-[150px] relative"
      >
        <span className="truncate">{value || 'All Engineers'}</span>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-surface-border rounded-xl shadow-lg z-20 w-56 py-1">
          <div className="px-2 pt-2 pb-1">
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search engineer..."
              className="w-full h-8 px-2.5 border border-surface-border rounded-lg text-xs focus:outline-none focus:border-brand-blue"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-surface-hover ${!value ? 'font-semibold' : ''}`}
            >
              All Engineers
            </button>
            {filtered.map(eng => (
              <button
                key={eng}
                type="button"
                onClick={() => { onChange(eng); setOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-surface-hover ${value === eng ? 'font-semibold' : ''}`}
              >
                {eng}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CSV export ───────────────────────────────────────────────────────────────
function exportCSV(rows) {
  const header = ['S.No', 'Date', 'Engineer', 'Type', 'Product', 'Serial/MAC', 'User', 'Installation Ref', 'Qty', 'Ownership']
  const lines = [header.join(',')]
  rows.forEach((r, i) => {
    const serialMac = r.serials.length ? r.serials[0] : r.macs.length ? r.macs[0] : '—'
    const row = [
      i + 1,
      r.date,
      `"${r.engineer}"`,
      r.type,
      `"${r.product}"`,
      serialMac,
      `"${r.user}"`,
      `"${r.installationRef}"`,
      r.qty,
      r.ownership,
    ]
    lines.push(row.join(','))
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `stock-verification-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StockVerification() {
  const [assignments,     setAssignments]     = useState(() => getAssignments())
  const [userAssignments, setUserAssignments] = useState(() => getUserAssignments())

  useEffect(() => {
    const u1 = subscribeAssignments(list => setAssignments(list))
    const u2 = subscribeUserAssignments(list => setUserAssignments(list))
    return () => { u1(); u2() }
  }, [])

  // Base flat rows derived from both stores
  const baseRows = useMemo(() => buildRows(assignments, userAssignments), [assignments, userAssignments])

  // Per-row ownership overrides (local state, no store write)
  const [ownershipOverrides, setOwnershipOverrides] = useState({})

  function setRowOwnership(id, value) {
    setOwnershipOverrides(prev => ({ ...prev, [id]: value }))
  }

  // Rows with overrides applied
  const rows = useMemo(() =>
    baseRows.map(r => ({ ...r, ownership: ownershipOverrides[r.id] ?? r.ownership })),
    [baseRows, ownershipOverrides]
  )

  // Unique engineer names for filter
  const engineerOptions = useMemo(() => {
    const set = new Set(rows.map(r => r.engineer).filter(Boolean))
    return [...set].sort()
  }, [rows])

  // Filter state
  const [search,          setSearch]          = useState('')
  const [dateFrom,        setDateFrom]        = useState('')
  const [dateTo,          setDateTo]          = useState('')
  const [filterType,      setFilterType]      = useState('')
  const [filterOwnership, setFilterOwnership] = useState('')
  const [filterEngineer,  setFilterEngineer]  = useState('')
  // Applied filters (only committed on "Search" click)
  const [applied, setApplied] = useState({
    search: '', dateFrom: '', dateTo: '', type: '', ownership: '', engineer: '',
  })

  // Pagination
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(10)

  function applyFilters() {
    setApplied({ search, dateFrom, dateTo, type: filterType, ownership: filterOwnership, engineer: filterEngineer })
    setPage(1)
  }

  function resetFilters() {
    setSearch(''); setDateFrom(''); setDateTo('')
    setFilterType(''); setFilterOwnership(''); setFilterEngineer('')
    setApplied({ search: '', dateFrom: '', dateTo: '', type: '', ownership: '', engineer: '' })
    setPage(1)
  }

  const filtered = useMemo(() => {
    const q = applied.search.toLowerCase()
    return rows.filter(r => {
      if (applied.dateFrom && r.date < applied.dateFrom) return false
      if (applied.dateTo   && r.date > applied.dateTo)   return false
      if (applied.type     && r.type !== applied.type)   return false
      if (applied.ownership && r.ownership !== applied.ownership) return false
      if (applied.engineer && r.engineer !== applied.engineer) return false
      if (q) {
        const serialMatch = r.serials.some(s => s.toLowerCase().includes(q))
        const macMatch    = r.macs.some(m => m.toLowerCase().includes(q))
        return (
          r.assignmentNumber.toLowerCase().includes(q) ||
          r.engineer.toLowerCase().includes(q) ||
          r.product.toLowerCase().includes(q) ||
          r.user.toLowerCase().includes(q) ||
          serialMatch || macMatch
        )
      }
      return true
    })
  }, [rows, applied])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged       = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Page number buttons
  function pageButtons() {
    const btns = []
    const start = Math.max(1, currentPage - 2)
    const end   = Math.min(totalPages, currentPage + 2)
    for (let i = start; i <= end; i++) btns.push(i)
    return btns
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Stock Verification</h1>
        <button
          type="button"
          onClick={() => exportCSV(filtered)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-border bg-white text-sm font-medium text-gray-700 hover:bg-surface-hover transition-colors shadow-sm"
        >
          <Download size={15} />
          Download as Excel
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') applyFilters() }}
          placeholder="Search assignment number, engineer, product, serial/MAC, user..."
          className="w-full h-10 pl-10 pr-4 border border-surface-border rounded-xl text-sm focus:outline-none focus:border-brand-blue transition-colors"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-end gap-3 bg-white border border-surface-border rounded-xl p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="h-9 px-3 border border-surface-border rounded-lg text-sm focus:outline-none focus:border-brand-blue"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="h-9 px-3 border border-surface-border rounded-lg text-sm focus:outline-none focus:border-brand-blue"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Type</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="h-9 px-3 border border-surface-border rounded-lg text-sm focus:outline-none focus:border-brand-blue bg-white"
          >
            <option value="">All Types</option>
            <option value="Hardware">Hardware</option>
            <option value="Wire">Wire</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Ownership</label>
          <select
            value={filterOwnership}
            onChange={e => setFilterOwnership(e.target.value)}
            className="h-9 px-3 border border-surface-border rounded-lg text-sm focus:outline-none focus:border-brand-blue bg-white"
          >
            <option value="">All Ownership</option>
            {OWNERSHIP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Engineer</label>
          <EngineerFilter value={filterEngineer} options={engineerOptions} onChange={setFilterEngineer} />
        </div>
        <div className="flex items-end gap-2 ml-auto">
          <button
            type="button"
            onClick={applyFilters}
            className="h-9 px-5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue/90 transition-colors"
          >
            Search
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="h-9 px-4 rounded-xl border border-surface-border text-sm font-medium text-gray-600 hover:bg-surface-hover transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted border-b border-surface-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Engineer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ownership</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400 text-sm">
                    No records found
                  </td>
                </tr>
              ) : paged.map(r => {
                return (
                  <tr key={r.id} className="hover:bg-surface-hover/40 transition-colors">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{r.date || '—'}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{r.engineer}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${TYPE_BADGE[r.type] || 'bg-gray-100 text-gray-600'}`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 max-w-[200px]">
                      <p className="truncate">{r.product}</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.user === '—' ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <div>
                          <p className="text-gray-900 font-medium leading-snug">{r.user}</p>
                          {r.installationRef !== '—' && (
                            <p className="text-gray-400 text-xs leading-snug mt-0.5">{r.installationRef}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{r.qty}</td>
                    <td className="px-4 py-3">
                      <OwnershipCell
                        value={r.ownership}
                        onChange={v => setRowOwnership(r.id, v)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <ActionsMenu row={r} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Records per page:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="h-8 px-2 border border-surface-border rounded-lg text-sm focus:outline-none focus:border-brand-blue bg-white"
            >
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages} &nbsp;|&nbsp; Total {filtered.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-8 px-3 rounded-lg border border-surface-border text-sm text-gray-600 hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            {pageButtons().map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`h-8 w-8 rounded-lg border text-sm font-medium transition-colors ${
                  n === currentPage
                    ? 'bg-brand-blue text-white border-brand-blue'
                    : 'border-surface-border text-gray-600 hover:bg-surface-hover'
                }`}
              >
                {n}
              </button>
            ))}
            {totalPages > currentPage + 2 && (
              <>
                <span className="text-gray-400 px-1">…</span>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  className="h-8 w-8 rounded-lg border border-surface-border text-sm text-gray-600 hover:bg-surface-hover transition-colors"
                >
                  {totalPages}
                </button>
              </>
            )}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="h-8 px-3 rounded-lg border border-surface-border text-sm text-gray-600 hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(totalPages)}
              className="h-8 px-3 rounded-lg border border-surface-border text-sm text-gray-600 hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

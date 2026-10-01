import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Search, Download, ChevronDown, MoreVertical, SlidersHorizontal, X,
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
function ActionsMenu({ row, onAction }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function act(ownership, message) {
    onAction(row.id, ownership, message)
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
        <div className="absolute right-0 top-full mt-1 bg-white border border-surface-border rounded-xl shadow-lg z-20 min-w-[180px] py-1">
          <button
            type="button"
            onClick={() => act('Company', 'Marked as returned to engineer')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-surface-hover transition-colors"
          >
            Back to Engineer
          </button>
          <button
            type="button"
            onClick={() => act('Company', 'Marked as returned to store')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-surface-hover transition-colors"
          >
            Back to Store
          </button>
          <button
            type="button"
            onClick={() => act('Customer', 'Marked as approved')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-surface-hover transition-colors"
          >
            Approved
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Filters side drawer ──────────────────────────────────────────────────────
function FiltersDrawer({ open, onClose, engineerOptions, onApply, onClear, initial }) {
  const [dateFrom,        setDateFrom]        = useState(initial.dateFrom)
  const [dateTo,          setDateTo]          = useState(initial.dateTo)
  const [filterType,      setFilterType]      = useState(initial.filterType)
  const [filterOwnership, setFilterOwnership] = useState(initial.filterOwnership)
  const [filterEngineer,  setFilterEngineer]  = useState(initial.filterEngineer)
  const [engQ,            setEngQ]            = useState('')

  // Sync draft state when drawer opens with current applied values
  useEffect(() => {
    if (open) {
      setDateFrom(initial.dateFrom)
      setDateTo(initial.dateTo)
      setFilterType(initial.filterType)
      setFilterOwnership(initial.filterOwnership)
      setFilterEngineer(initial.filterEngineer)
      setEngQ('')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredEngineers = engineerOptions.filter(o => o.toLowerCase().includes(engQ.toLowerCase()))

  function handleApply() {
    onApply({ dateFrom, dateTo, filterType, filterOwnership, filterEngineer })
    onClose()
  }

  function handleClear() {
    setDateFrom(''); setDateTo(''); setFilterType(''); setFilterOwnership(''); setFilterEngineer('')
    onClear()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onClose}
        />
      )}
      {/* Drawer */}
      <div className={`
        fixed top-0 right-0 h-full w-80 bg-white z-50 shadow-2xl flex flex-col
        transition-transform duration-300
        ${open ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-surface-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9 px-3 border border-surface-border rounded-lg text-sm focus:outline-none focus:border-brand-blue w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-9 px-3 border border-surface-border rounded-lg text-sm focus:outline-none focus:border-brand-blue w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="h-9 px-3 border border-surface-border rounded-lg text-sm focus:outline-none focus:border-brand-blue bg-white w-full"
            >
              <option value="">All Types</option>
              <option value="Hardware">Hardware</option>
              <option value="Wire">Wire</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ownership</label>
            <select
              value={filterOwnership}
              onChange={e => setFilterOwnership(e.target.value)}
              className="h-9 px-3 border border-surface-border rounded-lg text-sm focus:outline-none focus:border-brand-blue bg-white w-full"
            >
              <option value="">All Ownership</option>
              {OWNERSHIP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Engineer</label>
            <input
              value={engQ}
              onChange={e => setEngQ(e.target.value)}
              placeholder="Search engineer..."
              className="h-8 px-2.5 border border-surface-border rounded-lg text-xs focus:outline-none focus:border-brand-blue w-full"
            />
            <div className="border border-surface-border rounded-lg overflow-hidden max-h-44 overflow-y-auto">
              <button
                type="button"
                onClick={() => setFilterEngineer('')}
                className={`w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-surface-hover border-b border-surface-border transition-colors ${!filterEngineer ? 'bg-surface-hover font-semibold' : ''}`}
              >
                All Engineers
              </button>
              {filteredEngineers.map(eng => (
                <button
                  key={eng}
                  type="button"
                  onClick={() => setFilterEngineer(eng)}
                  className={`w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-surface-hover border-b border-surface-border last:border-0 transition-colors ${filterEngineer === eng ? 'bg-surface-hover font-semibold' : ''}`}
                >
                  {eng}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-surface-border flex gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 h-9 rounded-xl border border-surface-border text-sm font-medium text-gray-600 hover:bg-surface-hover transition-colors"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 h-9 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue/90 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
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

  // Search bar (live)
  const [search, setSearch] = useState('')

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Applied filters (committed when user clicks Apply Filters)
  const [applied, setApplied] = useState({
    dateFrom: '', dateTo: '', filterType: '', filterOwnership: '', filterEngineer: '',
  })

  const activeFilterCount = [
    applied.dateFrom, applied.dateTo, applied.filterType,
    applied.filterOwnership, applied.filterEngineer,
  ].filter(Boolean).length

  // Toast
  const [toast, setToast] = useState('')
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // Pagination
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(10)

  function handleApplyFilters(values) {
    setApplied(values)
    setPage(1)
  }

  function handleClearFilters() {
    setApplied({ dateFrom: '', dateTo: '', filterType: '', filterOwnership: '', filterEngineer: '' })
    setPage(1)
  }

  function handleAction(id, ownership, message) {
    setRowOwnership(id, ownership)
    setToast(message)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const { dateFrom, dateTo, filterType, filterOwnership, filterEngineer } = applied
    return rows.filter(r => {
      if (dateFrom       && r.date < dateFrom)           return false
      if (dateTo         && r.date > dateTo)             return false
      if (filterType     && r.type !== filterType)       return false
      if (filterOwnership && r.ownership !== filterOwnership) return false
      if (filterEngineer  && r.engineer !== filterEngineer)   return false
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
  }, [rows, search, applied])

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
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
      {/* Drawer */}
      <FiltersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        engineerOptions={engineerOptions}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        initial={applied}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Stock Verification</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-border bg-white text-sm font-medium text-gray-700 hover:bg-surface-hover transition-colors shadow-sm"
          >
            <SlidersHorizontal size={15} />
            {activeFilterCount > 0 ? `Filters · ${activeFilterCount}` : 'Filters'}
          </button>
          <button
            type="button"
            onClick={() => exportCSV(filtered)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-border bg-white text-sm font-medium text-gray-700 hover:bg-surface-hover transition-colors shadow-sm"
          >
            <Download size={15} />
            Download as Excel
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search assignment number, engineer, product, serial/MAC, user..."
          className="w-full h-10 pl-10 pr-4 border border-surface-border rounded-xl text-sm focus:outline-none focus:border-brand-blue transition-colors"
        />
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
                      <ActionsMenu row={r} onAction={handleAction} />
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

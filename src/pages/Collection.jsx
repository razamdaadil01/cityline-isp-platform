import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, SlidersHorizontal, X, CheckCircle, IndianRupee, Clock, ChevronDown } from 'lucide-react'
import {
  getCollections, subscribeCollections, updateCollection, getCollection,
  getTotalAmount, getTotalReceived, getTotalPending,
} from '../data/collectionStore'

const PAYMENT_MODES = ['Cash', 'UPI', 'NEFT', 'Cheque']
const PAGE_SIZE = 10

function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN')
}

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, bg }) {
  return (
    <div className="bg-white rounded-xl border border-surface-border p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <span className={color}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────
function RecordPaymentModal({ record, onClose, onSave }) {
  const [amount, setAmount]   = useState(String(record.due))
  const [mode, setMode]       = useState('')
  const [date, setDate]       = useState(new Date().toISOString().slice(0, 10))
  const [remarks, setRemarks] = useState('')
  const [errors, setErrors]   = useState({})
  const [saved, setSaved]     = useState(false)

  function validate() {
    const e = {}
    const n = Number(amount)
    if (!amount || isNaN(n) || n <= 0) e.amount = 'Enter a valid amount'
    else if (n > record.due) e.amount = `Cannot exceed due amount ₹${record.due}`
    if (!mode) e.mode = 'Select payment mode'
    if (!date) e.date = 'Required'
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    const collected = Number(amount)
    const newPaid = record.paid + collected
    const newDue  = record.due  - collected
    const newStatus = newDue <= 0 ? 'Paid' : 'Partial'
    onSave(record.id, {
      paid: newPaid,
      due:  Math.max(0, newDue),
      status: newStatus,
      paymentMode: mode,
      remarks,
    })
    setSaved(true)
    setTimeout(onClose, 1200)
  }

  const inputCls = err =>
    `w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue ${err ? 'border-red-400' : 'border-surface-border'}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border shrink-0">
          <h2 className="text-base font-bold text-gray-900">Record Collection Payment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Ref ID</span>
              <span className="font-mono font-semibold text-gray-900">{record.refId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Customer</span>
              <span className="font-medium text-gray-900">{record.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Engineer</span>
              <span className="text-gray-700 text-right">{record.engineerName}</span>
            </div>
            <div className="border-t border-surface-border pt-2 mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-400">Total Amount</p>
                <p className="font-semibold text-gray-900">{fmt(record.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Already Paid</p>
                <p className="font-semibold text-emerald-600">{fmt(record.paid)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Balance Due</p>
                <p className="font-semibold text-red-500">{fmt(record.due)}</p>
              </div>
            </div>
          </div>

          {saved ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle size={36} className="text-emerald-500" />
              <p className="text-sm font-semibold text-gray-900">Payment recorded successfully</p>
            </div>
          ) : (
            <>
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount to Collect <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" min="1" max={record.due} step="1"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setErrors(v => ({ ...v, amount: '' })) }}
                  className={inputCls(errors.amount)}
                />
                {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PAYMENT_MODES.map(m => (
                    <button
                      key={m} type="button"
                      onClick={() => { setMode(m); setErrors(v => ({ ...v, mode: '' })) }}
                      className={`py-2 text-sm font-medium rounded-lg border transition-colors ${
                        mode === m
                          ? 'bg-brand-blue text-white border-brand-blue'
                          : 'bg-white text-gray-700 border-surface-border hover:border-brand-blue hover:text-brand-blue'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {errors.mode && <p className="text-xs text-red-500 mt-1">{errors.mode}</p>}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date" value={date}
                  onChange={e => { setDate(e.target.value); setErrors(v => ({ ...v, date: '' })) }}
                  className={inputCls(errors.date)}
                />
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  rows={2} value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer — sticky, hidden after save */}
        {!saved && (
          <div className="shrink-0 px-6 py-4 border-t border-surface-border flex gap-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2 text-sm font-medium border border-surface-border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button" onClick={handleSave}
              className="flex-1 py-2 text-sm font-semibold bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Filters Drawer ───────────────────────────────────────────────────────────
function FiltersDrawer({ filters, allCollections, onApply, onClose }) {
  const [engineer, setEngineer] = useState(filters.engineer)
  const [engSearch, setEngSearch] = useState('')
  const [refType, setRefType]   = useState(filters.refType)
  const [from, setFrom]         = useState(filters.from)
  const [to, setTo]             = useState(filters.to)
  const [status, setStatus]     = useState(filters.status)

  const allEngineers = useMemo(() => {
    const names = new Set()
    allCollections.forEach(c => c.engineerName.split(',').forEach(n => names.add(n.trim())))
    return [...names].sort()
  }, [allCollections])

  const visibleEngineers = engSearch.trim()
    ? allEngineers.filter(n => n.toLowerCase().includes(engSearch.trim().toLowerCase()))
    : allEngineers

  const selCls = 'w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-80 h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h3 className="font-bold text-gray-900">Filters</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Engineer</label>
            <input
              type="text"
              placeholder="Search engineer…"
              value={engSearch}
              onChange={e => setEngSearch(e.target.value)}
              className={selCls + ' mb-2'}
            />
            <select value={engineer} onChange={e => setEngineer(e.target.value)} className={selCls}>
              <option value="">All</option>
              {visibleEngineers.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ref Type</label>
            <select value={refType} onChange={e => setRefType(e.target.value)} className={selCls}>
              <option value="">All</option>
              <option value="Installation">Installation</option>
              <option value="Ticket">Ticket</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={selCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className={selCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={selCls}>
              <option value="">All</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
            </select>
          </div>
        </div>
        <div className="p-5 border-t border-surface-border flex gap-2">
          <button
            onClick={() => { setEngineer(''); setEngSearch(''); setRefType(''); setFrom(''); setTo(''); setStatus('') }}
            className="flex-1 py-2 text-sm font-medium border border-surface-border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => { onApply({ engineer, refType, from, to, status }); onClose() }}
            className="flex-1 py-2 text-sm font-semibold bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Collection() {
  const [collections, setCollections] = useState(getCollections)
  const [totalAmount,   setTotalAmount]   = useState(getTotalAmount)
  const [totalReceived, setTotalReceived] = useState(getTotalReceived)
  const [totalPending,  setTotalPending]  = useState(getTotalPending)

  const [searchParams, setSearchParams] = useSearchParams()
  const modalParam = searchParams.get('modal')
  const idParam    = searchParams.get('id')
  const modal = modalParam === 'record-payment' && idParam
    ? (getCollection(idParam) ?? null)
    : null

  const [tab,        setTab]        = useState('all')     // 'all' | 'paid' | 'pending'
  const [search,     setSearch]     = useState('')
  const [filters,    setFilters]    = useState({ engineer: '', refType: '', from: '', to: '', status: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [selected,   setSelected]   = useState(new Set())
  const [page,       setPage]       = useState(1)
  const [perPage,    setPerPage]    = useState(10)

  function openModal(record) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('modal', 'record-payment')
      next.set('id', record.id)
      return next
    }, { replace: true })
  }

  function closeModal() {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('modal')
      next.delete('id')
      return next
    }, { replace: true })
  }

  useEffect(() => subscribeCollections(records => {
    setCollections(records)
    setTotalAmount(records.reduce((s, c) => s + c.amount, 0))
    setTotalReceived(records.reduce((s, c) => s + c.paid, 0))
    setTotalPending(records.reduce((s, c) => s + c.due, 0))
  }), [])

  const filtered = useMemo(() => {
    let rows = collections

    // Quick tab
    if (tab === 'paid')    rows = rows.filter(r => r.status === 'Paid')
    if (tab === 'pending') rows = rows.filter(r => r.status === 'Pending' || r.status === 'Partial')

    // Search
    const q = search.trim().toLowerCase()
    if (q) rows = rows.filter(r =>
      r.customerName.toLowerCase().includes(q) ||
      r.refId.toLowerCase().includes(q) ||
      r.engineerName.toLowerCase().includes(q)
    )

    // Filters
    if (filters.engineer) rows = rows.filter(r => r.engineerName.split(',').map(n => n.trim()).includes(filters.engineer))
    if (filters.refType) rows = rows.filter(r => r.refType === filters.refType)
    if (filters.status)  rows = rows.filter(r => r.status === filters.status)
    if (filters.from)    rows = rows.filter(r => r.date >= filters.from)
    if (filters.to)      rows = rows.filter(r => r.date <= filters.to)

    return rows
  }, [collections, tab, search, filters])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage    = Math.min(page, totalPages)
  const pageRows    = filtered.slice((safePage - 1) * perPage, safePage * perPage)
  const allSelected = pageRows.length > 0 && pageRows.every(r => selected.has(r.id))

  function toggleAll() {
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) pageRows.forEach(r => next.delete(r.id))
      else             pageRows.forEach(r => next.add(r.id))
      return next
    })
  }

  function toggleRow(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function handleSavePayment(id, fields) {
    updateCollection(id, fields)
  }

  function exportCSV() {
    const header = 'ID,Ref ID,Ref Type,Customer Name,Team,Engineer,Amount,Paid,Due,Date,Status,Payment Mode'
    const rows = filtered.map(r =>
      [r.id, r.refId, r.refType, r.customerName, r.team, r.engineerName, r.amount, r.paid, r.due, r.date, r.status, r.paymentMode].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'collection.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Collection</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage Collection</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-surface-border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={() => setShowFilters(true)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg transition-colors ${
              activeFilterCount > 0
                ? 'border-brand-blue bg-brand-blue/5 text-brand-blue'
                : 'border-surface-border text-gray-700 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-brand-blue text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Amount"  value={fmt(totalAmount)}   icon={<IndianRupee size={20} />} color="text-[#0A8DCD]"     bg="bg-blue-50" />
        <StatCard label="Received"      value={fmt(totalReceived)} icon={<CheckCircle  size={20} />} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard label="Pending"       value={fmt(totalPending)}  icon={<Clock        size={20} />} color="text-amber-600"   bg="bg-amber-50" />
      </div>

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <input
          type="text" placeholder="Search by customer, ref ID, team, engineer…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 min-w-0 px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
        />

        {/* Quick tab */}
        <div className="flex rounded-lg border border-surface-border overflow-hidden shrink-0">
          {[['all', 'All'], ['paid', 'Paid'], ['pending', 'Pending']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setPage(1) }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === key ? 'bg-brand-blue text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-surface-border">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30" />
                </th>
                {['TICKET ID / INS ID', 'ENGINEER', 'AMOUNT', 'PAID', 'DUE', 'DATE', 'ACTION'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400 text-sm">No records found.</td>
                </tr>
              ) : pageRows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)}
                      className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30" />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-brand-blue text-sm">{r.refId}</span>
                    <div className="mt-1">
                      {r.refType === 'Installation' ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Installation</span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Ticket</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.engineerName.split(',').map(n => n.trim()).map((name, i) => (
                      <p key={i} className="text-sm text-gray-900 leading-snug">{name}</p>
                    ))}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{fmt(r.amount)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={r.paid > 0 ? 'font-medium text-emerald-600' : 'text-gray-400'}>{fmt(r.paid)}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.due > 0
                      ? <span className="font-medium text-red-500">{fmt(r.due)}</span>
                      : <span className="text-gray-400">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3">
                    {r.status === 'Paid' ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-sm font-semibold">
                        <CheckCircle size={14} /> Paid ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => openModal(r)}
                        className="px-3 py-1.5 text-xs font-semibold border border-brand-blue text-brand-blue rounded-lg hover:bg-brand-blue hover:text-white transition-colors whitespace-nowrap"
                      >
                        Record Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-surface-border bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Records per page:</span>
            <div className="relative">
              <select
                value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
                className="appearance-none pl-3 pr-7 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>Page {safePage} of {totalPages} | Total {filtered.length}</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                className="px-3 py-1.5 rounded-lg border border-surface-border text-xs font-medium disabled:opacity-40 hover:bg-white transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-surface-border text-xs font-medium disabled:opacity-40 hover:bg-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {modal && (
        <RecordPaymentModal
          record={modal}
          onClose={closeModal}
          onSave={(id, fields) => { handleSavePayment(id, fields); closeModal() }}
        />
      )}

      {/* Filters Drawer */}
      {showFilters && (
        <FiltersDrawer
          filters={filters}
          allCollections={collections}
          onApply={f => { setFilters(f); setPage(1) }}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  )
}

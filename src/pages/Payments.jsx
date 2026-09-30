import { useState, useMemo, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CreditCard, Search, Download, Eye, MoreVertical, CheckCircle,
  Clock, AlertTriangle, TrendingUp, X, ChevronDown,
} from 'lucide-react'
import {
  getPayments, subscribePayments, addPayment, nextReceiptNo,
} from '../data/paymentsStore'
import {
  getInvoices, subscribeInvoices, getPendingInvoices,
  getCollectedTotal, getPendingTotal, getOverdueTotal,
  markInvoicesPaid,
} from '../data/invoicesStore'

const PAYMENT_MODES = ['Cash', 'UPI', 'NEFT', 'IMPS', 'Cheque', 'Razorpay']
const MODE_COLORS = {
  Cash:     'bg-gray-100 text-gray-700',
  UPI:      'bg-blue-100 text-blue-700',
  NEFT:     'bg-purple-100 text-purple-700',
  IMPS:     'bg-orange-100 text-orange-700',
  Cheque:   'bg-yellow-100 text-yellow-700',
  Razorpay: 'bg-green-100 text-green-700',
  Online:       'bg-blue-100 text-blue-700',
  'Android App':'bg-indigo-100 text-indigo-700',
}

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const today = () => new Date().toISOString().split('T')[0]

function daysSince(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.floor((now - d) / 86400000)
  return diff > 0 ? diff : null
}

function exportCsv(filename, rows) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const lines = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

// ── Shared Record Payment Modal ───────────────────────────────────────────────
function RecordPaymentModal({ invoice, onClose, onSuccess }) {
  const todayStr = today()
  const [form, setForm] = useState({
    amount: invoice.totalAmount || invoice.amount || 0,
    mode: 'Cash',
    txnId: '',
    date: todayStr,
    notes: '',
  })
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.date) { setError('Payment date is required.'); return }
    if (!form.txnId && form.mode !== 'Cash') {
      setError('Transaction ID is required for ' + form.mode + ' payments.')
      return
    }
    setError('')
    const invoiceNo = invoice.no || invoice.invoiceNo
    const receipt = nextReceiptNo()
    addPayment({
      id: 'PAY-' + Date.now(),
      customerId: invoice.customerId || '',
      receiptNo: receipt,
      invoiceNo,
      invoiceNos: [invoiceNo],
      paymentDate: form.date,
      date: new Date().toLocaleString('en-IN'),
      mode: form.mode,
      total: Number(form.amount),
      paid: Number(form.amount),
      status: 'Complete',
      orderNo: form.txnId || '—',
      chequeBCh: 0,
      addBy: 'Admin User',
      comment: form.notes || 'Complete',
    })
    markInvoicesPaid([invoiceNo], { paymentDate: form.date, mode: form.mode, txnId: form.txnId })
    onSuccess(receipt)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Record Payment</h2>
          <button onClick={onClose}><X size={16} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          {/* Invoice summary */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Invoice No</span>
              <span className="font-mono font-semibold text-[#0A8DCD]">{invoice.no || invoice.invoiceNo}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Customer</span>
              <span className="font-medium text-gray-800">{invoice.customerName || '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Package</span>
              <span className="text-gray-700">{invoice.pkg || invoice.packageName || '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Due Date</span>
              <span className="text-gray-700">{invoice.dueDate || '—'}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 pt-1.5 mt-1">
              <span className="text-gray-500 font-medium">Amount Due</span>
              <span className="font-bold text-gray-900 text-base">{fmt(invoice.totalAmount || invoice.amount || 0)}</span>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Amount (read-only) */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Amount <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input type="number" value={form.amount} readOnly
                className="w-full pl-7 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed" />
            </div>
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle size={11} /> Partial payment is not accepted. Full amount required.
            </p>
          </div>

          {/* Mode */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Payment Mode <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_MODES.map(m => (
                <button key={m} type="button" onClick={() => { set('mode', m); setError('') }}
                  className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                    form.mode === m
                      ? 'bg-[#0A8DCD] text-white border-[#0A8DCD]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#0A8DCD]/40 hover:bg-[#0A8DCD]/5'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction ID */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Transaction ID {form.mode !== 'Cash' && <span className="text-red-500">*</span>}
              {form.mode === 'Cash' && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
            </label>
            <input type="text" value={form.txnId}
              onChange={e => { set('txnId', e.target.value); setError('') }}
              placeholder={form.mode === 'Cash' ? 'N/A' : 'Enter transaction / reference ID'}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30" />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Payment Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.date} max={todayStr}
              onChange={e => set('date', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30" />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Optional notes..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30" />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSubmit}
              className="flex-1 py-2 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium hover:bg-[#0878b0] flex items-center justify-center gap-2">
              <CheckCircle size={14} /> Record Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── TAB 1: Overview ────────────────────────────────────────────────────────────
function OverviewTab({ onRecordPayment, onGoToAll }) {
  const [collectedTotal, setCollectedTotal] = useState(getCollectedTotal)
  const [pendingTotal, setPendingTotal] = useState(getPendingTotal)
  const [overdueTotal, setOverdueTotal] = useState(getOverdueTotal)
  const [payments, setPayments] = useState(getPayments)
  const [pendingInvoices, setPendingInvoices] = useState(getPendingInvoices)

  useEffect(() => subscribePayments(p => {
    setPayments(p)
  }), [])
  useEffect(() => subscribeInvoices(() => {
    setCollectedTotal(getCollectedTotal())
    setPendingTotal(getPendingTotal())
    setOverdueTotal(getOverdueTotal())
    setPendingInvoices(getPendingInvoices())
  }), [])

  const recentPayments = [...payments].slice(0, 10)
  const recentPending  = [...pendingInvoices]
    .sort((a, b) => (a.dueDate || '') < (b.dueDate || '') ? -1 : 1)
    .slice(0, 5)

  const cards = [
    { label: 'Total Collected',    value: fmt(collectedTotal),   color: 'text-emerald-600', bg: 'bg-emerald-50',  icon: <CheckCircle size={18} /> },
    { label: 'Pending',            value: fmt(pendingTotal),      color: 'text-amber-600',   bg: 'bg-amber-50',    icon: <Clock size={18} /> },
    { label: 'Overdue',            value: fmt(overdueTotal),      color: 'text-red-500',     bg: 'bg-red-50',      icon: <AlertTriangle size={18} /> },
    { label: 'Total Transactions', value: payments.length,        color: 'text-[#0A8DCD]',   bg: 'bg-blue-50',     icon: <CreditCard size={18} /> },
  ]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
              <span className={c.color}>{c.icon}</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Recent Payments</h3>
          <button onClick={onGoToAll} className="text-xs text-[#0A8DCD] hover:underline font-medium">View all →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Receipt No', 'Customer', 'Invoice No', 'Date', 'Mode', 'Amount', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentPayments.map(pay => (
                <tr key={pay.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-[#0A8DCD] font-semibold whitespace-nowrap">{pay.receiptNo}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{pay.customerId}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{pay.invoiceNo}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{pay.paymentDate}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MODE_COLORS[pay.mode] || 'bg-gray-100 text-gray-700'}`}>{pay.mode}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">₹{pay.paid.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pay.status === 'Complete' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {pay.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {recentPayments.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">No payments recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Pending Invoices */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Pending Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Invoice No', 'Customer', 'Package', 'Due Date', 'Amount', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentPending.map(inv => {
                const overdue = inv.dueDate && inv.dueDate < today()
                return (
                  <tr key={inv.no} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-[#0A8DCD] font-semibold whitespace-nowrap">{inv.no}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{inv.customerName || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{inv.pkg || inv.packageName || '—'}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className={overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}>{inv.dueDate || '—'}</span>
                      {overdue && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600">Overdue</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">₹{(inv.totalAmount || inv.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => onRecordPayment(inv)}
                        className="px-2.5 py-1 text-xs font-medium bg-[#0A8DCD] text-white rounded-lg hover:bg-[#0878b0] transition-colors whitespace-nowrap">
                        Record Payment
                      </button>
                    </td>
                  </tr>
                )
              })}
              {recentPending.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No pending invoices.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── TAB 2: All Payments ────────────────────────────────────────────────────────
function AllPaymentsTab() {
  const [payments, setPayments] = useState(getPayments)
  useEffect(() => subscribePayments(setPayments), [])

  const [search, setSearch]     = useState('')
  const [filterMode, setFilterMode] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo]   = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const filtered = useMemo(() => {
    let rows = [...payments]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(p =>
        p.receiptNo?.toLowerCase().includes(q) ||
        p.customerId?.toLowerCase().includes(q) ||
        p.invoiceNo?.toLowerCase().includes(q) ||
        p.mode?.toLowerCase().includes(q)
      )
    }
    if (filterMode !== 'All') rows = rows.filter(p => p.mode === filterMode)
    if (filterStatus !== 'All') rows = rows.filter(p => p.status === filterStatus)
    if (filterFrom) rows = rows.filter(p => {
      const d = p.paymentDate?.split('-').reverse().join('-')
      return d >= filterFrom
    })
    if (filterTo) rows = rows.filter(p => {
      const d = p.paymentDate?.split('-').reverse().join('-')
      return d <= filterTo
    })
    return rows
  }, [payments, search, filterMode, filterStatus, filterFrom, filterTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const from       = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const to         = Math.min(safePage * PAGE_SIZE, filtered.length)

  const handleExport = () => {
    const rows = filtered.map(p => ({
      'Receipt No': p.receiptNo, 'Customer': p.customerId, 'Invoice No': p.invoiceNo,
      'Payment Date': p.paymentDate, 'Mode': p.mode, 'Total': p.total,
      'Paid': p.paid, 'Status': p.status, 'TXN Ref': p.orderNo, 'Added By': p.addBy,
    }))
    exportCsv('payments_export.csv', rows)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search receipt, customer, invoice, mode..."
            className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30" />
        </div>
        <select value={filterMode} onChange={e => { setFilterMode(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30 text-gray-600">
          <option value="All">All Modes</option>
          {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30 text-gray-600">
          <option value="All">All Statuses</option>
          <option>Complete</option>
          <option>Failed</option>
        </select>
        <input type="date" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30 text-gray-500" />
        <input type="date" value={filterTo} onChange={e => { setFilterTo(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30 text-gray-500" />
        <button onClick={handleExport}
          className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 bg-white">
          <Download size={13} /> Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Receipt No', 'Customer ID', 'Invoice No', 'Payment Date', 'Mode', 'Total', 'Paid', 'Status', 'TXN Ref', 'Added By', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map(pay => (
                <tr key={pay.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-[#0A8DCD] font-semibold whitespace-nowrap">{pay.receiptNo}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{pay.customerId}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{pay.invoiceNo}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{pay.paymentDate}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MODE_COLORS[pay.mode] || 'bg-gray-100 text-gray-700'}`}>{pay.mode}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">₹{pay.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">₹{pay.paid.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pay.status === 'Complete' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {pay.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{pay.orderNo}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{pay.addBy}</td>
                  <td className="px-4 py-3">
                    <ThreeDotMenu items={[
                      { label: 'View Details', onClick: () => {} },
                      { label: 'Download Receipt', onClick: () => {} },
                    ]} />
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-gray-400 text-sm">No payments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/40">
          <p className="text-xs text-gray-500">Showing {from}–{to} of {filtered.length} payments</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
              className="px-2.5 py-1 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white bg-gray-50">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${p === safePage ? 'bg-[#0A8DCD] text-white' : 'border border-gray-200 hover:bg-white text-gray-600'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
              className="px-2.5 py-1 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white bg-gray-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── TAB 3: Pending ─────────────────────────────────────────────────────────────
function PendingTab({ onRecordPayment }) {
  const [invoices, setInvoices] = useState(getInvoices)
  useEffect(() => subscribeInvoices(setInvoices), [])

  const [search, setSearch]       = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)

  const pending = useMemo(() => {
    let rows = invoices.filter(i => i.status === 'pending')
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(i => (i.no || '').toLowerCase().includes(q) || (i.customerName || '').toLowerCase().includes(q))
    }
    if (overdueOnly) rows = rows.filter(i => i.dueDate && i.dueDate < today())
    return rows
  }, [invoices, search, overdueOnly])

  const pendingTotal = pending.reduce((s, i) => s + (i.totalAmount || i.amount || 0), 0)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search invoice no or customer..."
            className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)}
            className="w-4 h-4 accent-[#0A8DCD]" />
          Overdue Only
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Invoice No', 'Customer', 'Package', 'Issue Date', 'Due Date', 'Amount', 'Days Overdue', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pending.map(inv => {
                const days = daysSince(inv.dueDate)
                return (
                  <tr key={inv.no} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-[#0A8DCD] font-semibold whitespace-nowrap">{inv.no}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{inv.customerName || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{inv.pkg || inv.packageName || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{inv.date || inv.issueDate || '—'}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className={days ? 'text-red-600 font-semibold' : 'text-gray-600'}>{inv.dueDate || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">₹{(inv.totalAmount || inv.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {days ? <span className="text-red-600 font-semibold">{days} days</span> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => onRecordPayment(inv)}
                        className="px-2.5 py-1 text-xs font-medium bg-[#0A8DCD] text-white rounded-lg hover:bg-[#0878b0] transition-colors whitespace-nowrap">
                        Record Payment
                      </button>
                    </td>
                  </tr>
                )
              })}
              {pending.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">No pending invoices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {pending.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/40 text-xs text-gray-600 font-medium">
            Total Pending: <span className="text-gray-900 font-bold">{fmt(pendingTotal)}</span> across {pending.length} invoice{pending.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}

// ── TAB 4: Record Payment (inline form) ────────────────────────────────────────
function RecordPaymentTab({ onSuccess }) {
  const todayStr = today()
  const [invoices, setInvoices] = useState(getInvoices)
  useEffect(() => subscribeInvoices(setInvoices), [])

  const pendingInvoices = useMemo(() => invoices.filter(i => i.status === 'pending'), [invoices])

  const [query, setQuery]           = useState('')
  const [showDrop, setShowDrop]     = useState(false)
  const [selected, setSelected]     = useState(null)
  const [form, setForm]             = useState({ mode: 'Cash', txnId: '', date: todayStr, notes: '' })
  const [errors, setErrors]         = useState({})
  const [successMsg, setSuccessMsg] = useState('')
  const dropRef = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const suggestions = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim().toLowerCase()
    return pendingInvoices.filter(i =>
      (i.no || '').toLowerCase().includes(q) ||
      (i.customerName || '').toLowerCase().includes(q)
    ).slice(0, 8)
  }, [query, pendingInvoices])

  useEffect(() => {
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (inv) => {
    setSelected(inv)
    setQuery(inv.no)
    setShowDrop(false)
    setErrors({})
    setSuccessMsg('')
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    setForm({ mode: 'Cash', txnId: '', date: todayStr, notes: '' })
    setErrors({})
    setSuccessMsg('')
  }

  const validate = () => {
    const errs = {}
    if (!selected) errs.invoice = 'Select an invoice first.'
    if (!form.date) errs.date = 'Payment date is required.'
    if (!form.txnId && form.mode !== 'Cash') errs.txnId = 'Transaction ID is required for ' + form.mode + ' payments.'
    return errs
  }

  const handleSubmit = () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    const invoiceNo = selected.no
    const receipt = nextReceiptNo()
    addPayment({
      id: 'PAY-' + Date.now(),
      customerId: selected.customerId || '',
      receiptNo: receipt,
      invoiceNo,
      invoiceNos: [invoiceNo],
      paymentDate: form.date,
      date: new Date().toLocaleString('en-IN'),
      mode: form.mode,
      total: Number(selected.totalAmount || selected.amount || 0),
      paid:  Number(selected.totalAmount || selected.amount || 0),
      status: 'Complete',
      orderNo: form.txnId || '—',
      chequeBCh: 0,
      addBy: 'Admin User',
      comment: form.notes || 'Complete',
    })
    markInvoicesPaid([invoiceNo], { paymentDate: form.date, mode: form.mode, txnId: form.txnId })
    setSuccessMsg(`Payment recorded. Receipt No: ${receipt}`)
    handleClear()
    onSuccess()
  }

  return (
    <div className="max-w-lg space-y-6">
      {successMsg && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">{successMsg}</p>
        </div>
      )}

      {/* Section 1 — Find Invoice */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">1. Find Invoice</h3>
        <div ref={dropRef} className="relative">
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Search Invoice <span className="text-red-500">*</span></label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query}
              onChange={e => { setQuery(e.target.value); setShowDrop(true); if (!e.target.value) setSelected(null) }}
              onFocus={() => { if (query) setShowDrop(true) }}
              placeholder="Search by invoice no or customer name..."
              className={`pl-8 pr-3 py-2 border rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30 ${errors.invoice ? 'border-red-300' : 'border-gray-200'}`} />
          </div>
          {errors.invoice && <p className="text-xs text-red-500 mt-1">{errors.invoice}</p>}
          {showDrop && suggestions.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1">
              {suggestions.map(inv => (
                <button key={inv.no} type="button" onClick={() => handleSelect(inv)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm">
                  <span className="font-mono font-semibold text-[#0A8DCD]">{inv.no}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-700">{inv.customerName || '—'}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500">₹{(inv.totalAmount || inv.amount || 0).toLocaleString('en-IN')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 2 — Invoice Summary */}
      {selected && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">2. Invoice Summary</h3>
            <button onClick={handleClear} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-100">
            {[
              ['Invoice No',  selected.no],
              ['Customer',    selected.customerName || '—'],
              ['Package',     selected.pkg || selected.packageName || '—'],
              ['Due Date',    selected.dueDate || '—'],
              ['Amount Due',  fmt(selected.totalAmount || selected.amount || 0)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-500">{label}</span>
                <span className={`font-medium ${label === 'Amount Due' ? 'text-gray-900 font-bold' : 'text-gray-800'}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3 — Payment Details */}
      {selected && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800">3. Payment Details</h3>

          {/* Amount (read-only) */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Amount <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input type="number" value={selected.totalAmount || selected.amount || 0} readOnly
                className="w-full pl-7 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed" />
            </div>
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle size={11} /> Partial payment is not accepted.
            </p>
          </div>

          {/* Mode */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Payment Mode <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_MODES.map(m => (
                <button key={m} type="button" onClick={() => { set('mode', m); setErrors(e => ({ ...e, txnId: '' })) }}
                  className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                    form.mode === m
                      ? 'bg-[#0A8DCD] text-white border-[#0A8DCD]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#0A8DCD]/40 hover:bg-[#0A8DCD]/5'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction ID */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Transaction ID {form.mode !== 'Cash' && <span className="text-red-500">*</span>}
              {form.mode === 'Cash' && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
            </label>
            <input type="text" value={form.txnId}
              onChange={e => { set('txnId', e.target.value); setErrors(er => ({ ...er, txnId: '' })) }}
              placeholder={form.mode === 'Cash' ? 'N/A' : 'Enter transaction / reference ID'}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30 ${errors.txnId ? 'border-red-300' : 'border-gray-200'}`} />
            {errors.txnId && <p className="text-xs text-red-500 mt-1">{errors.txnId}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Payment Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.date} max={todayStr}
              onChange={e => { set('date', e.target.value); setErrors(er => ({ ...er, date: '' })) }}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30 ${errors.date ? 'border-red-300' : 'border-gray-200'}`} />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Optional notes..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#0A8DCD]/30" />
          </div>
        </div>
      )}

      {/* Section 4 — Actions */}
      <div className="flex gap-3">
        <button onClick={handleClear}
          className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 bg-white">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={!selected}
          className="flex-1 py-2.5 bg-[#0A8DCD] text-white rounded-lg text-sm font-medium hover:bg-[#0878b0] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          <CheckCircle size={14} /> Record Payment
        </button>
      </div>
    </div>
  )
}

// ── Shared helpers ─────────────────────────────────────────────────────────────
function ThreeDotMenu({ items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
          {items.map(item => (
            <button key={item.label} onClick={() => { item.onClick(); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">{item.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page root ──────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview',       label: 'Overview'        },
  { key: 'all-payments',   label: 'All Payments'    },
  { key: 'pending',        label: 'Pending'         },
  { key: 'record-payment', label: 'Record Payment'  },
]

export default function Payments() {
  const location = useLocation()
  const navigate  = useNavigate()

  const params = new URLSearchParams(location.search)
  const activeTab = TABS.find(t => t.key === params.get('tab'))?.key ?? 'overview'

  const goTab = (key) => navigate(`/payments?tab=${key}`, { replace: true })

  const [recordModal, setRecordModal]   = useState(null) // invoice obj or null
  const [successToast, setSuccessToast] = useState('')

  const showToast = (msg) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(''), 4000)
  }

  const handleRecordSuccess = (receipt) => {
    setRecordModal(null)
    showToast(`Payment recorded. Receipt No: ${receipt}`)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F2744]">Payments</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track collections, outstanding dues and payment history</p>
      </div>

      {/* Success toast */}
      {successToast && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle size={15} className="text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">{successToast}</p>
          <button onClick={() => setSuccessToast('')} className="ml-auto text-emerald-500 hover:text-emerald-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 gap-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => goTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.key
                ? 'border-[#0A8DCD] text-[#0A8DCD]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab
          onRecordPayment={inv => setRecordModal(inv)}
          onGoToAll={() => goTab('all-payments')}
        />
      )}
      {activeTab === 'all-payments' && <AllPaymentsTab />}
      {activeTab === 'pending' && (
        <PendingTab onRecordPayment={inv => setRecordModal(inv)} />
      )}
      {activeTab === 'record-payment' && (
        <RecordPaymentTab onSuccess={() => goTab('all-payments')} />
      )}

      {/* Record Payment modal (from Overview / Pending tabs) */}
      {recordModal && (
        <RecordPaymentModal
          invoice={recordModal}
          onClose={() => setRecordModal(null)}
          onSuccess={receipt => handleRecordSuccess(receipt)}
        />
      )}
    </div>
  )
}

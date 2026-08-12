import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Plus, Download, Search, ChevronDown, FileText, MessageCircle,
  CreditCard, CheckCircle, Clock, AlertTriangle, X, Receipt,
  TrendingUp, Filter, History, IndianRupee, AlertCircle,
  MoreVertical, CheckCircle2, RotateCcw,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { MOCK_INVOICES, PAYMENT_HISTORY } from '../data/billingData'

const BILLING_MOCK_ROWS = [
  {
    id: 1,
    userId: 'E1901_GV',
    userLink: 'CNPL_B2C',
    customerName: 'Accenture',
    invoiceNo: 'B2C/26-27/5650',
    package: 'SuperSonic_300M_1M_Cityline Platinum',
    amount: 1032,
    adminAmount: 1032,
    resellerAmount: 0,
    invoiceDate: '25-06-2026 14:00:06',
    durationFrom: '27-06-2026',
    durationTo: '26-07-2026',
    addedBy: 'E1901_GV',
    comment: '',
    rechargeInternet: 'success',
    rechargeOtt: 'retry',
  },
  {
    id: 2,
    userId: '5000022361',
    userLink: 'CNPL_B2C',
    customerName: 'Dinesh',
    invoiceNo: 'B2C/26-27/5649',
    package: 'Sonic_150M_12M_Gold',
    amount: 6372,
    adminAmount: 6372,
    resellerAmount: 0,
    invoiceDate: '25-06-2026 13:49:52',
    durationFrom: '25-06-2026',
    durationTo: '25-06-2027',
    addedBy: '5000022361',
    comment: '',
    rechargeInternet: 'success',
    rechargeOtt: 'retry',
  },
]

const STATUS_VARIANT = { paid: 'green', pending: 'yellow', overdue: 'red' }
const STATUS_LABELS = { paid: 'Paid', pending: 'Pending', overdue: 'Overdue' }
const MODE_VARIANT = { Cash: 'green', UPI: 'blue', NEFT: 'navy', IMPS: 'purple', Cheque: 'orange', Razorpay: 'cyan' }
const PAYMENT_MODES = ['Cash', 'UPI', 'NEFT', 'IMPS', 'Cheque', 'Razorpay']
const SERVICE_TYPES = ['All', 'FTTH', 'FTTB', 'Wireless', 'P2P', 'ILL']
const NETWORKS = ['All', 'OLT-ANW-01', 'OLT-ANW-02', 'OLT-BNW-01', 'OLT-MNW-01']

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ─── Recharge Status mini-table (RECHARGE STATUS column) ────────────────────
// Compact bordered 2-col widget: "Internet" | "OTT" header band, one status
// row below — green check for 'success', amber warning + a clickable Retry
// link stacked underneath for anything else (e.g. 'retry').
function RechargeStatusIcon({ status }) {
  if (status === 'success') {
    return <CheckCircle2 size={14} className="text-emerald-500" />
  }
  return (
    <div className="flex flex-col items-center gap-0.5">
      <AlertTriangle size={12} className="text-amber-500" />
      <button className="flex items-center gap-0.5 text-[10px] text-brand-blue font-semibold hover:underline whitespace-nowrap">
        <RotateCcw size={9} /> Retry
      </button>
    </div>
  )
}

function RechargeStatusMiniTable({ internet, ott }) {
  return (
    <div className="inline-block border border-surface-border rounded-lg overflow-hidden bg-white">
      <div className="grid grid-cols-2 bg-gray-50 border-b border-surface-border">
        <span className="px-2.5 py-1 text-[9px] font-semibold text-gray-500 uppercase tracking-wide text-center border-r border-surface-border">Internet</span>
        <span className="px-2.5 py-1 text-[9px] font-semibold text-gray-500 uppercase tracking-wide text-center">OTT</span>
      </div>
      <div className="grid grid-cols-2">
        <div className="flex items-center justify-center px-2.5 py-1.5 border-r border-surface-border">
          <RechargeStatusIcon status={internet} />
        </div>
        <div className="flex items-center justify-center px-2.5 py-1.5">
          <RechargeStatusIcon status={ott} />
        </div>
      </div>
    </div>
  )
}

// ─── Record Payment Modal ───────────────────────────────────────────────────
function RecordPaymentModal({ invoice, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    amount: invoice.totalAmount,
    mode: 'UPI',
    txnId: '',
    date: today,
    notes: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (Number(form.amount) < invoice.totalAmount) {
      setError(`Partial payment not allowed. Full amount ₹${invoice.totalAmount.toLocaleString('en-IN')} must be paid at once.`)
      return
    }
    if (!form.txnId && form.mode !== 'Cash') {
      setError('Transaction ID is required for ' + form.mode + ' payments.')
      return
    }
    setError('')
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={28} className="text-emerald-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Payment Recorded</h3>
        <p className="text-sm text-gray-500 mb-1">
          {fmt(form.amount)} received via <span className="font-medium">{form.mode}</span>
        </p>
        <p className="text-xs text-gray-400 mb-6">Invoice {invoice.invoiceNo} marked as Paid</p>
        <Button onClick={onClose} size="sm">Close</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Invoice summary */}
      <div className="bg-surface rounded-xl p-4 border border-surface-border">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-gray-500 font-medium">Invoice</p>
            <p className="text-sm font-mono font-semibold text-brand-blue mt-0.5">{invoice.invoiceNo}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium">Customer</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">{invoice.customerName}</p>
          </div>
        </div>
        <div className="flex justify-between mt-3 pt-3 border-t border-surface-border">
          <div>
            <p className="text-xs text-gray-500">Due Date</p>
            <p className="text-sm text-gray-700 mt-0.5">{invoice.dueDate}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Amount Due</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{fmt(invoice.totalAmount)}</p>
          </div>
        </div>
      </div>

      {/* Partial payment error */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Amount <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
          <input
            type="number"
            value={form.amount}
            onChange={e => { set('amount', e.target.value); setError('') }}
            className="w-full pl-7 pr-4 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
          <AlertTriangle size={11} /> Partial payment is not accepted. Full amount required.
        </p>
      </div>

      {/* Mode */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Payment Mode <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_MODES.map(m => (
            <button
              key={m}
              onClick={() => set('mode', m)}
              className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                form.mode === m
                  ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                  : 'bg-white text-gray-600 border-surface-border hover:border-brand-blue/40 hover:bg-brand-blue/5'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction ID */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Transaction ID {form.mode !== 'Cash' && <span className="text-red-500">*</span>}
          {form.mode === 'Cash' && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
        </label>
        <input
          type="text"
          placeholder={form.mode === 'Cash' ? 'N/A' : 'Enter transaction / reference ID'}
          value={form.txnId}
          onChange={e => set('txnId', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
      </div>

      {/* Date */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Payment Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={form.date}
          max={today}
          onChange={e => set('date', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
        <textarea
          rows={2}
          placeholder="Optional notes..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
        <Button size="sm" onClick={handleSubmit} icon={<CheckCircle size={14} />} className="flex-1">
          Record Payment
        </Button>
      </div>
    </div>
  )
}

// ─── Payment History Tab ────────────────────────────────────────────────────
function PaymentHistory({ payments, allPayments, page, totalPages, pageSize, setPage, setPageSize }) {
  const totals = useMemo(() => {
    const src = allPayments ?? payments
    const byMode = {}
    let total = 0
    src.forEach(p => {
      byMode[p.mode] = (byMode[p.mode] || 0) + p.amount
      total += p.amount
    })
    return { byMode, total }
  }, [allPayments, payments])

  return (
    <div className="space-y-4">
      {/* Mode-wise summary */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {Object.entries(totals.byMode).map(([mode, amt]) => (
          <div key={mode} className="bg-white rounded-xl p-3 border border-surface-border text-center shadow-card">
            <Badge variant={MODE_VARIANT[mode] || 'gray'} size="sm">{mode}</Badge>
            <p className="text-sm font-bold text-gray-900 mt-2">{fmt(amt)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Payment Ledger</h3>
          <span className="text-xs text-gray-500 font-medium">
            Total Collected: <span className="text-emerald-600 font-bold">{fmt(totals.total)}</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                {['Pay ID', 'Invoice No', 'Customer', 'Amount', 'Mode', 'Transaction ID', 'Date', 'Recorded By'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-brand-blue font-semibold">{p.invoiceNo}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{p.customerName}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">{fmt(p.amount)}</td>
                  <td className="px-4 py-3"><Badge variant={MODE_VARIANT[p.mode] || 'gray'} size="sm">{p.mode}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.txnId}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{p.date}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{p.recordedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination footer */}
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
            Page {page} of {totalPages} &nbsp;|&nbsp; Total {allPayments.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                  p === page ? 'bg-brand-blue text-white' : 'border border-surface-border hover:bg-white text-gray-600'
                }`}>
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
    </div>
  )
}

// ─── Actions Dropdown ───────────────────────────────────────────────────────
function ActionsDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-lg text-brand-blue hover:bg-brand-blue/10 transition-colors"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-40 bg-white border border-surface-border rounded-xl shadow-lg py-1 text-sm">
          {['View Invoice', 'Remove', 'Email Invoice'].map(action => (
            <button
              key={action}
              onClick={() => setOpen(false)}
              className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors text-xs"
            >
              {action}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Billing Page ──────────────────────────────────────────────────────
export default function Billing() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeTab = location.pathname.includes('tax-invoice') ? 'tax-invoice'
    : location.pathname.includes('payment-history') ? 'payment-history'
    : 'package-recharge'
  const [paymentModal, setPaymentModal] = useState(null)
  const [selectedRows, setSelectedRows] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [quickStatus, setQuickStatus] = useState('All')
  const [search, setSearch] = useState('')

  // Per-tab pagination
  const [prPage, setPrPage] = useState(1)
  const [prPageSize, setPrPageSize] = useState(10)
  const [tiPage, setTiPage] = useState(1)
  const [tiPageSize, setTiPageSize] = useState(10)
  const [phPage, setPhPage] = useState(1)
  const [phPageSize, setPhPageSize] = useState(10)

  // Drawer filter state
  const [fDateFrom, setFDateFrom] = useState('')
  const [fDateTo, setFDateTo] = useState('')
  const [fCreatedBy, setFCreatedBy] = useState('')
  const [fZone, setFZone] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fPackage, setFPackage] = useState('')
  const [fRechargeStatus, setFRechargeStatus] = useState('')
  const [fArea, setFArea] = useState('')
  const [fReseller, setFReseller] = useState('Cityline Networks P...')
  const [fDiscount, setFDiscount] = useState('')
  const [fBox, setFBox] = useState('')

  const clearAllFilters = () => {
    setFDateFrom(''); setFDateTo(''); setFCreatedBy('')
    setFZone(''); setFStatus(''); setFPackage(''); setFRechargeStatus('')
    setFArea(''); setFReseller('Cityline Networks P...'); setFDiscount(''); setFBox('')
  }

  const filterCount = [fDateFrom, fDateTo, fCreatedBy, fZone, fStatus, fPackage, fRechargeStatus, fArea, fDiscount, fBox]
    .filter(Boolean).length + (fReseller !== 'Cityline Networks P...' ? 1 : 0)

  const stats = useMemo(() => {
    const all = MOCK_INVOICES
    return {
      total: all.reduce((s, i) => s + i.totalAmount, 0),
      collected: all.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalAmount, 0),
      pending: all.filter(i => i.status === 'pending').reduce((s, i) => s + i.totalAmount, 0),
      overdue: all.filter(i => i.status === 'overdue').reduce((s, i) => s + i.totalAmount, 0),
      gst: all.filter(i => i.status === 'paid').reduce((s, i) => s + i.cgst + i.sgst, 0),
    }
  }, [])

  const filteredRows = useMemo(() => {
    if (!search.trim()) return BILLING_MOCK_ROWS
    const q = search.trim().toLowerCase()
    return BILLING_MOCK_ROWS.filter(r =>
      r.customerName.toLowerCase().includes(q) ||
      r.userId.toLowerCase().includes(q) ||
      r.userLink.toLowerCase().includes(q)
    )
  }, [search])

  // Pagination derived values for invoice tabs
  const page     = activeTab === 'tax-invoice' ? tiPage     : prPage
  const pageSize = activeTab === 'tax-invoice' ? tiPageSize : prPageSize
  const setPage     = activeTab === 'tax-invoice' ? setTiPage     : setPrPage
  const setPageSize = activeTab === 'tax-invoice' ? setTiPageSize : setPrPageSize
  const totalPages  = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage    = Math.min(page, totalPages)
  const pagedRows   = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  // Payment History pagination
  const phTotalPages = Math.max(1, Math.ceil(PAYMENT_HISTORY.length / phPageSize))
  const phSafePage   = Math.min(phPage, phTotalPages)
  const pagedPayments = PAYMENT_HISTORY.slice((phSafePage - 1) * phPageSize, phSafePage * phPageSize)

  const allSelected = selectedRows.length === pagedRows.length && pagedRows.length > 0
  const toggleAll = () => setSelectedRows(allSelected ? [] : pagedRows.map(r => r.id))
  const toggleRow = (id) => setSelectedRows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const drawerSelectCls = 'w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700 cursor-pointer'
  const drawerInputCls  = 'w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700'

  const statusTabs = ['All', 'Paid', 'Pending', 'Overdue']

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage invoices, collections and payment records</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" size="sm" icon={<Download size={14} />}>Export</Button>
          <button
            onClick={() => setDrawerOpen(true)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
              filterCount > 0
                ? 'border-brand-blue bg-brand-blue/5 text-brand-blue'
                : 'border-surface-border bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter size={14} />
            Filters
            {filterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center bg-brand-blue text-white text-[10px] font-bold rounded-full">
                {filterCount}
              </span>
            )}
          </button>
          <Button size="sm" icon={<Plus size={14} />}>New Invoice</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {[
          { label: 'Total Billed (May)', value: fmt(stats.total), icon: <Receipt size={16} />, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Collected', value: fmt(stats.collected), icon: <CheckCircle size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending', value: fmt(stats.pending), icon: <Clock size={16} />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Overdue', value: fmt(stats.overdue), icon: <AlertTriangle size={16} />, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'GST Collected', value: fmt(stats.gst), icon: <TrendingUp size={16} />, color: 'text-brand-blue', bg: 'bg-brand-blue/5' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-card border border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <span className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center ${s.color}`}>{s.icon}</span>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-surface-border">
        {[
          { key: 'package-recharge',  label: 'Package Recharge', path: '/billing/package-recharge',  icon: <Receipt size={13} /> },
          { key: 'tax-invoice',       label: 'Tax Invoice',       path: '/billing/tax-invoice',       icon: <FileText size={13} /> },
          { key: 'payment-history',   label: 'Payment History',   path: '/billing/payment-history',   icon: <History size={13} /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => navigate(t.path)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.key
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'payment-history' ? (
        <PaymentHistory
          payments={pagedPayments}
          allPayments={PAYMENT_HISTORY}
          page={phSafePage} totalPages={phTotalPages} pageSize={phPageSize}
          setPage={setPhPage} setPageSize={setPhPageSize}
        />
      ) : (
        <>
          {/* ── Totals ── */}
          <div className="text-xs text-gray-700 font-medium">
            Admin Total: <span className="text-gray-900 font-bold">₹88,646.00</span>
            <span className="mx-3 text-gray-300">|</span>
            Reseller Total: <span className="text-gray-900 font-bold">₹0.00</span>
          </div>

          {/* ── Search + Quick filters (same row) ── */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by customer name or ID..."
                className="pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white w-full focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
              />
            </div>
            <div className="flex gap-1 shrink-0">
              {statusTabs.map(s => (
                <button
                  key={s}
                  onClick={() => setQuickStatus(s)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    quickStatus === s
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'bg-white border border-surface-border text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* ── Table ── */}
          <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-gray-50/60">
                    <th className="px-3 py-3 w-8">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300 cursor-pointer" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">RECHARGE STATUS</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">USER/LINK ID</th>
                    {activeTab === 'tax-invoice' && (
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">INVOICE</th>
                    )}
                    {['PACKAGE', 'AMOUNT', 'INVOICE DATE', 'DURATION', 'ADDED', 'COMMENT', 'ACTIONS'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {pagedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selectedRows.includes(row.id)} onChange={() => toggleRow(row.id)} className="rounded border-gray-300 cursor-pointer" />
                      </td>
                      <td className="px-3 py-3">
                        <RechargeStatusMiniTable internet={row.rechargeInternet} ott={row.rechargeOtt} />
                      </td>
                      <td className="px-3 py-3">
                        <a href="#" className="text-xs text-brand-blue font-semibold hover:underline">{row.userId}({row.userLink})</a>
                        <p className="text-xs text-gray-500 mt-0.5">{row.customerName}</p>
                      </td>
                      {activeTab === 'tax-invoice' && (
                        <td className="px-3 py-3">
                          <button
                            onClick={() => navigate(`/billing/invoice/${encodeURIComponent(row.invoiceNo)}`)}
                            className="text-xs text-brand-blue font-semibold hover:underline whitespace-nowrap text-left"
                          >
                            {row.invoiceNo}
                          </button>
                        </td>
                      )}
                      <td className="px-3 py-3 text-xs text-gray-700 max-w-[160px]">
                        <span className="line-clamp-2">{row.package}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded">{row.amount}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{row.invoiceDate}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {row.durationFrom}<br />{row.durationTo}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{row.addedBy}</td>
                      <td className="px-3 py-3 text-xs text-gray-400">{row.comment || '—'}</td>
                      <td className="px-3 py-3">
                        <ActionsDropdown />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination footer */}
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
                Page {safePage} of {totalPages} &nbsp;|&nbsp; Total {filteredRows.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                      p === safePage ? 'bg-brand-blue text-white' : 'border border-surface-border hover:bg-white text-gray-600'
                    }`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Filter Drawer ── */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
        <div
          className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-brand-blue" />
              <h2 className="text-sm font-bold text-gray-900">Filters</h2>
              {filterCount > 0 && (
                <span className="px-1.5 py-0.5 bg-brand-blue/10 text-brand-blue text-[10px] font-bold rounded-full">
                  {filterCount} active
                </span>
              )}
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* Date From */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Date From</label>
              <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} className={drawerInputCls} />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Date To</label>
              <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} className={drawerInputCls} />
            </div>

            {/* Created By */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Created By</label>
              <div className="relative">
                <select value={fCreatedBy} onChange={e => setFCreatedBy(e.target.value)} className={drawerSelectCls}>
                  <option value="">Please Select</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Select Server/Zone */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Server/Zone</label>
              <div className="relative">
                <select value={fZone} onChange={e => setFZone(e.target.value)} className={drawerSelectCls}>
                  <option value="">Please Select</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
              <div className="relative">
                <select value={fStatus} onChange={e => setFStatus(e.target.value)} className={drawerSelectCls}>
                  <option value="">All</option>
                  <option>Paid</option>
                  <option>Pending</option>
                  <option>Overdue</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Select Package */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Package</label>
              <div className="relative">
                <select value={fPackage} onChange={e => setFPackage(e.target.value)} className={drawerSelectCls}>
                  <option value="">Please Select</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Recharge Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recharge Status</label>
              <div className="relative">
                <select value={fRechargeStatus} onChange={e => setFRechargeStatus(e.target.value)} className={drawerSelectCls}>
                  <option value="">Please Select</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Select Area */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Area</label>
              <div className="relative">
                <select value={fArea} onChange={e => setFArea(e.target.value)} className={drawerSelectCls}>
                  <option value="">Please Select</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Select Reseller */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Reseller</label>
              <div className="relative">
                <select value={fReseller} onChange={e => setFReseller(e.target.value)} className={drawerSelectCls}>
                  <option value="Cityline Networks P...">Cityline Networks P...</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Discount */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Discount</label>
              <div className="relative">
                <select value={fDiscount} onChange={e => setFDiscount(e.target.value)} className={drawerSelectCls}>
                  <option value="">Please Select</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Select Box */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Box</label>
              <div className="relative">
                <select value={fBox} onChange={e => setFBox(e.target.value)} className={drawerSelectCls}>
                  <option value="">Please Select</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* Sticky footer */}
          <div className="shrink-0 px-5 py-4 border-t border-surface-border bg-gray-50 flex items-center gap-3">
            <button
              onClick={clearAllFilters}
              className="flex-1 py-2.5 text-sm font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl transition-colors bg-white"
            >
              Clear All Filters
            </button>
            <button
              onClick={() => setDrawerOpen(false)}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue/90 rounded-xl transition-colors shadow-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        title="Record Payment"
        size="md"
      >
        {paymentModal && <RecordPaymentModal invoice={paymentModal} onClose={() => setPaymentModal(null)} />}
      </Modal>
    </div>
  )
}

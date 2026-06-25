import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Download, Search, ChevronDown, FileText, MessageCircle,
  CreditCard, CheckCircle, Clock, AlertTriangle, X, Receipt,
  TrendingUp, Filter, Calendar, History, IndianRupee, AlertCircle,
  RotateCcw, MoreVertical, CheckCircle2, AlertOctagon,
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
function PaymentHistory({ payments }) {
  const totals = useMemo(() => {
    const byMode = {}
    let total = 0
    payments.forEach(p => {
      byMode[p.mode] = (byMode[p.mode] || 0) + p.amount
      total += p.amount
    })
    return { byMode, total }
  }, [payments])

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
  const [activeTab, setActiveTab] = useState('invoices')
  const [paymentModal, setPaymentModal] = useState(null)
  const [selectedRows, setSelectedRows] = useState([])

  // Billing Invoice filters
  const [fUserId, setFUserId] = useState('')
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

  const resetFilters = () => {
    setFUserId(''); setFDateFrom(''); setFDateTo(''); setFCreatedBy('')
    setFZone(''); setFStatus(''); setFPackage(''); setFRechargeStatus('')
    setFArea(''); setFReseller('Cityline Networks P...'); setFDiscount(''); setFBox('')
  }

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

  const allSelected = selectedRows.length === BILLING_MOCK_ROWS.length
  const toggleAll = () => setSelectedRows(allSelected ? [] : BILLING_MOCK_ROWS.map(r => r.id))
  const toggleRow = (id) => setSelectedRows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const inputCls = 'w-full px-3 py-1.5 text-xs border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white'
  const selectCls = 'w-full px-3 py-1.5 text-xs border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white appearance-none cursor-pointer'

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
          { key: 'invoices', label: 'Invoice Register', icon: <FileText size={13} /> },
          { key: 'payments', label: 'Payment History', icon: <History size={13} /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
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

      {activeTab === 'payments' ? (
        <PaymentHistory payments={PAYMENT_HISTORY} />
      ) : (
        <>
          {/* ── Filters (3 rows × 4 cols) ── */}
          <div className="bg-white rounded-xl border border-surface-border shadow-card p-4 space-y-3">
            {/* Row 1 */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">User Id</label>
                <input type="text" placeholder="User Id" value={fUserId} onChange={e => setFUserId(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
                <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
                <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Created By</label>
                <div className="relative">
                  <select value={fCreatedBy} onChange={e => setFCreatedBy(e.target.value)} className={selectCls}>
                    <option value="">Please Select</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Select Server/Zone</label>
                <div className="relative">
                  <select value={fZone} onChange={e => setFZone(e.target.value)} className={selectCls}>
                    <option value="">Please Select</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <div className="relative">
                  <select value={fStatus} onChange={e => setFStatus(e.target.value)} className={selectCls}>
                    <option value="">Please Select</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Select Package</label>
                <div className="relative">
                  <select value={fPackage} onChange={e => setFPackage(e.target.value)} className={selectCls}>
                    <option value="">Please Select</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Recharge Status</label>
                <div className="relative">
                  <select value={fRechargeStatus} onChange={e => setFRechargeStatus(e.target.value)} className={selectCls}>
                    <option value="">Please Select</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Select Area</label>
                <div className="relative">
                  <select value={fArea} onChange={e => setFArea(e.target.value)} className={selectCls}>
                    <option value="">Please Select</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Select Reseller</label>
                <div className="relative">
                  <select value={fReseller} onChange={e => setFReseller(e.target.value)} className={selectCls}>
                    <option value="Cityline Networks P...">Cityline Networks P...</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Discount</label>
                <div className="relative">
                  <select value={fDiscount} onChange={e => setFDiscount(e.target.value)} className={selectCls}>
                    <option value="">Please Select</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Select Box</label>
                <div className="relative">
                  <select value={fBox} onChange={e => setFBox(e.target.value)} className={selectCls}>
                    <option value="">Please Select</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Search + Reset */}
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" icon={<Search size={13} />}>Search</Button>
              <button
                onClick={resetFilters}
                className="p-1.5 rounded-lg border border-surface-border text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                title="Reset filters"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* Totals */}
            <div className="pt-1 text-xs text-gray-700 font-medium">
              Admin Total: <span className="text-gray-900 font-bold">₹88,646.00</span>
              <span className="mx-3 text-gray-300">|</span>
              Reseller Total: <span className="text-gray-900 font-bold">₹0.00</span>
            </div>
          </div>

          {/* ── Invoice Table ── */}
          <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-gray-50/60">
                    <th className="px-3 py-3 w-8">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300 cursor-pointer" />
                    </th>
                    {['S.NO', 'RECHARGE STATUS', 'USER/LINK ID', 'INVOICE NO', 'PACKAGE', 'AMOUNT', 'ADMIN AMOUNT', 'RESELLER AMOUNT', 'INVOICE DATE', 'DURATION', 'ADDED', 'COMMENT', 'ACTIONS'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {BILLING_MOCK_ROWS.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selectedRows.includes(row.id)} onChange={() => toggleRow(row.id)} className="rounded border-gray-300 cursor-pointer" />
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                            <CheckCircle2 size={11} className="text-emerald-500" /> Internet
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
                            <AlertOctagon size={11} className="text-orange-500" /> OTT
                            <button className="text-brand-blue underline text-xs ml-0.5">Retry</button>
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <a href="#" className="text-xs text-brand-blue font-semibold hover:underline">{row.userId}({row.userLink})</a>
                        <p className="text-xs text-gray-500 mt-0.5">{row.customerName}</p>
                      </td>
                      <td className="px-3 py-3">
                        <a href="#" className="text-xs text-brand-blue font-semibold hover:underline whitespace-nowrap">{row.invoiceNo}</a>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 max-w-[160px]">
                        <span className="line-clamp-2">{row.package}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded">{row.amount}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{row.adminAmount}</td>
                      <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{row.resellerAmount}</td>
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
          </div>
        </>
      )}

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
